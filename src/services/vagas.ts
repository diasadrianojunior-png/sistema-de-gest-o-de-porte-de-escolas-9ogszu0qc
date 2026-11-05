/**
 * Serviço do Cadastro de Vagas — modelo novo:
 *  - Tipo de vínculo: CARGO ou FUNCAO (pergunta no formulário).
 *  - Cargo da Vaga / Função da Vaga: FKs para cadastros de Cargos / Funções.
 *  - Período (SEM/MANHA/TARDE/INTEGRAL/NOITE) e Modalidade (FIXO/ITINERANTE) — obrigatórios.
 *  - Status da Vaga do Ocupante (ABERTA/PREENCHIDA) — opcional na tela; coerência:
 *      com Profissional Ocupante => PREENCHIDA; sem ocupante => ABERTA.
 *  - Profissional Titular e Profissional Ocupante: FKs para Profissionais
 *      (o MESMO profissional pode ser titular e ocupante da mesma vaga).
 *  - Vaga Excedente: Não = gerada automaticamente; Sim = inserida manualmente.
 *  - Identificação automática: VAG-XXXX; código e número sequencial preservados.
 * Fluxos preservados: geração automática (prévia/resumo/confirmação, preserva
 * vagas ocupadas, excedentes => EXCEDENTE), migração entre anos letivos,
 * inserção/edição/exclusão manual, exportação e auditoria.
 */
import { supabase } from '@/lib/supabase/client'
import {
  registrarAuditoria,
  sanitizarVinculosAuditados,
  getUsuarioAtualParaAuditoria,
} from '@/services/auditoria'
import { getConfiguracoesRh } from '@/services/configuracao-rh'
import { calcularVagasPorNivel } from '@/services/configuracao-rh-calculo'
import {
  VagaReal,
  StatusVagaReal,
  PeriodoEscola,
  StatusOcupacaoVaga,
  TipoAtendimentoUnidade,
} from '@/types/gestao-escolar'
import {
  VagaCalculadaMemoria,
  ConfiguracaoVagasRh,
  LinhaConfigVagas,
  ResolucaoConfiguracaoRh,
} from '@/types/gestao-escolar'

const TABELA = 'vaga' as const

export const STATUS_VAGA_REAL: StatusVagaReal[] = ['ABERTA', 'PREENCHIDA']
export type PeriodoOpcaoForm = 'SEM' | 'MANHA' | 'TARDE' | 'INTEGRAL' | 'NOITE'

export const PERIODOS_VAGA: Array<{ valor: PeriodoOpcaoForm; rotulo: string }> = [
  { valor: 'SEM', rotulo: 'Geral / Sem Período' },
  { valor: 'MANHA', rotulo: 'Manhã' },
  { valor: 'TARDE', rotulo: 'Tarde' },
  { valor: 'INTEGRAL', rotulo: 'Integral' },
  { valor: 'NOITE', rotulo: 'Noite' },
]
export const MODALIDADES_VAGA: Array<{ valor: 'FIXO' | 'ITINERANTE'; rotulo: string }> = [
  { valor: 'FIXO', rotulo: 'Fixo' },
  { valor: 'ITINERANTE', rotulo: 'Itinerante' },
]

export const rotuloPeriodoVaga = (valor: string | null | undefined): string => {
  if (!valor) return 'Geral / Sem Período'
  const achou = PERIODOS_VAGA.find((p) => p.valor === valor)
  return achou ? achou.rotulo : valor
}
export const rotuloModalidadeVaga = (valor: string | null | undefined): string => {
  if (valor === 'ITINERANTE') return 'Itinerante'
  return 'Fixo'
}
export const rotuloStatusVagaReal = (valor: string | null | undefined): string => {
  if (valor === 'PREENCHIDA') return 'Preenchida'
  if (valor === 'EXCEDENTE') return 'Excedente'
  return 'Aberta'
}
export const rotuloTipoVinculoVaga = (tipo: string | null | undefined): string => {
  if (tipo === 'FUNCAO') return 'Função'
  return 'Cargo'
}

/** Status coerente com a ocupação: com ocupante => PREENCHIDA; sem => ABERTA. */
export const calcularStatusPorOcupacao = (
  ocupanteId: string | null | undefined,
  statusInformado?: string | null,
): StatusVagaReal | 'EXCEDENTE' => {
  if (statusInformado === 'EXCEDENTE') return 'EXCEDENTE'
  return ocupanteId ? 'PREENCHIDA' : 'ABERTA'
}

export interface VagaCompleta extends VagaReal {
  unidade_escolar?: { id: string; nome: string; tipo_atendimento?: string } | null
  cargo?: { id: string; nome: string; codigo?: string } | null
  funcao_objeto?: { id: string; nome: string; codigo?: string } | null
  profissional_titular?: { id: string; nome: string; codigo?: string } | null
  profissional_ocupante?: { id: string; nome: string; codigo?: string } | null
  configuracao_rh?: {
    id: string
    tipo_atendimento: string
    ano_letivo?: number
    status?: string
  } | null
}

export interface FiltrosVagasListagem {
  anoLetivo?: number | null
  unidadeId?: string | null
  somenteExcedentes?: boolean
  busca?: string | null
}

export interface InserirVagaManualInput {
  unidadeEscolarId: string
  anoLetivo: number
  tipoVinculo: 'CARGO' | 'FUNCAO'
  cargoId?: string | null
  funcaoId?: string | null
  periodo: PeriodoOpcaoForm | PeriodoEscola
  modalidade: 'FIXO' | 'ITINERANTE'
  diasSemana?: number | null
  status?: 'ABERTA' | 'PREENCHIDA' | string | null
  profissionalOcupanteId?: string | null
  profissionalTitularId?: string | null
  observacao?: string | null
}

export interface EditarVagaManualInput {
  id: string
  tipoVinculo?: 'CARGO' | 'FUNCAO'
  cargoId?: string | null
  funcaoId?: string | null
  periodo: PeriodoOpcaoForm | PeriodoEscola
  modalidade: 'FIXO' | 'ITINERANTE'
  diasSemana?: number | null
  status?: 'ABERTA' | 'PREENCHIDA' | string | null
  profissionalOcupanteId?: string | null
  profissionalTitularId?: string | null
  observacao?: string | null
}

export class ValidacaoVagaError extends Error {}

function exigir(valor: unknown, mensagem: string): void {
  if (valor === null || valor === undefined || valor === '' || valor === 0) {
    throw new ValidacaoVagaError(mensagem)
  }
}

/** Valida os atributos obrigatórios (mensagem amigável lançada como erro). */
export function validarVagaManual(input: Partial<InserirVagaManualInput>): void {
  if (!input.unidadeEscolarId) throw new ValidacaoVagaError('Selecione a Unidade Escolar da vaga.')
  if (!input.anoLetivo) throw new ValidacaoVagaError('Selecione o Ano Letivo da vaga.')
  if (input.tipoVinculo !== 'CARGO' && input.tipoVinculo !== 'FUNCAO') {
    throw new ValidacaoVagaError('Informe se a vaga é de Cargo ou de Função.')
  }
  if (input.tipoVinculo === 'CARGO' && !input.cargoId) {
    throw new ValidacaoVagaError('Vaga de Cargo: selecione o Cargo da Vaga.')
  }
  if (input.tipoVinculo === 'FUNCAO' && !input.funcaoId) {
    throw new ValidacaoVagaError('Vaga de Função: selecione a Função da Vaga.')
  }
  if (!input.periodo) throw new ValidacaoVagaError('Selecione o Período da vaga.')
  if (!input.modalidade) throw new ValidacaoVagaError('Selecione a Modalidade da vaga.')
  if (input.modalidade === 'ITINERANTE') {
    const dias = Number(input.diasSemana ?? 2)
    if (!Number.isFinite(dias) || dias < 1 || dias > 5) {
      throw new ValidacaoVagaError('Dias na Semana deve ficar entre 1 e 5 para vaga Itinerante.')
    }
  }
}

/** Monta o payload no formato da tabela, com status coerente à ocupação. */
function montarPayloadVaga(
  input: InserirVagaManualInput | EditarVagaManualInput,
): Record<string, unknown> {
  const ocupante = (input as InserirVagaManualInput).profissionalOcupanteId || null
  const titular = (input as InserirVagaManualInput).profissionalTitularId || null
  // No banco, período CHECK aceita MANHA, TARDE, INTEGRAL, NOITE ou NULL (Geral / Sem Período)
  const periodoDb = !input.periodo || (input.periodo as string) === 'SEM' ? null : input.periodo

  const payload: Record<string, unknown> = {
    tipo_vinculo: input.tipoVinculo ?? 'FUNCAO',
    cargo_id: input.tipoVinculo === 'CARGO' ? input.cargoId || null : null,
    funcao_id: input.tipoVinculo === 'FUNCAO' ? input.funcaoId || null : null,
    periodo: periodoDb,
    modalidade: input.modalidade,
    dias_semana: input.modalidade === 'ITINERANTE' ? Number(input.diasSemana ?? 2) : null,
    profissional_ocupante_id: ocupante,
    profissional_titular_id: titular,
    observacao: input.observacao || null,
  }
  if ((input as InserirVagaManualInput).unidadeEscolarId) {
    payload.unidade_escolar_id = (input as InserirVagaManualInput).unidadeEscolarId
  }
  if ((input as InserirVagaManualInput).anoLetivo) {
    payload.ano_letivo = (input as InserirVagaManualInput).anoLetivo
  }
  return payload
}

async function gerarProximoCodigo(): Promise<string> {
  const { data, error } = await supabase
    .from(TABELA)
    .select('codigo')
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  let proximo = 1
  const ultimo = data?.[0]?.codigo as string | undefined
  const m = ultimo?.match(/^VAG-(\d+)$/)
  if (m) proximo = Number(m[1]) + 1
  // Garante unicidade real mesmo com lacunas:
  let tentativa = proximo
  for (let i = 0; i < 1000; i += 1) {
    const codigo = `VAG-${String(tentativa).padStart(4, '0')}`
    const { data: existe } = await supabase.from(TABELA).select('id').eq('codigo', codigo).limit(1)
    if (!existe || existe.length === 0) return codigo
    tentativa += 1
  }
  return `VAG-${String(tentativa).padStart(4, '0')}`
}

async function gerarProximoSequencial(
  unidadeEscolarId: string,
  anoLetivo: number,
): Promise<number> {
  const { data, error } = await supabase
    .from(TABELA)
    .select('numero_sequencial')
    .eq('unidade_escolar_id', unidadeEscolarId)
    .eq('ano_letivo', anoLetivo)
    .order('numero_sequencial', { ascending: false })
    .limit(1)
  if (error) throw error
  const ultimo = (data?.[0]?.numero_sequencial as number | undefined) ?? 0
  return ultimo + 1
}

const SELECT_COMPLETO = `
  *,
  unidade_escolar:unidade_escolar_id(id, nome, tipo_atendimento),
  cargo:cargo_id(id, nome, codigo),
  funcao_objeto:funcao_id(id, nome, codigo),
  profissional_titular:profissional_titular_id(id, nome, codigo),
  profissional_ocupante:profissional_ocupante_id(id, nome, codigo),
  configuracao_rh:configuracao_rh_id(id, tipo_atendimento, ano_letivo, status)
`

export async function listarVagasCompletas(): Promise<VagaCompleta[]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select(SELECT_COMPLETO)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as unknown as VagaCompleta[]
}

export async function listarVagasAnoLetivo(anoLetivo: number): Promise<VagaCompleta[]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select(SELECT_COMPLETO)
    .eq('ano_letivo', anoLetivo)
    .order('unidade_escolar_id', { ascending: true })
    .order('numero_sequencial', { ascending: true })
  if (error) throw error
  return (data || []) as unknown as VagaCompleta[]
}

export async function getVagasAnoUnidade(
  anoLetivo: number,
  unidadeEscolarId: string,
): Promise<VagaCompleta[]> {
  const { data, error } = await supabase
    .from(TABELA)
    .select(SELECT_COMPLETO)
    .eq('ano_letivo', anoLetivo)
    .eq('unidade_escolar_id', unidadeEscolarId)
    .order('numero_sequencial', { ascending: true })
  if (error) throw error
  return (data || []) as unknown as VagaCompleta[]
}

export async function contarVagasAnoUnidade(
  anoLetivo: number,
  unidadeEscolarId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(TABELA)
    .select('id', { count: 'exact', head: true })
    .eq('ano_letivo', anoLetivo)
    .eq('unidade_escolar_id', unidadeEscolarId)
  if (error) throw error
  return count ?? 0
}

export async function listarVagasFiltradas(filtros: FiltrosVagasListagem): Promise<VagaCompleta[]> {
  let query = supabase.from(TABELA).select(SELECT_COMPLETO)
  if (filtros.anoLetivo) query = query.eq('ano_letivo', filtros.anoLetivo)
  if (filtros.unidadeId) query = query.eq('unidade_escolar_id', filtros.unidadeId)
  if (filtros.somenteExcedentes) query = query.eq('vaga_excedente', true)
  query = query.order('created_at', { ascending: false })
  const { data, error } = await query
  if (error) throw error
  const lista = (data || []) as unknown as VagaCompleta[]
  if (filtros.busca) {
    const termo = filtros.busca.trim().toLowerCase()
    if (termo) {
      return lista.filter((v) => {
        const alvo = [
          v.codigo,
          v.nome_ocupante,
          v.funcao,
          v.cargo?.nome,
          v.funcao_objeto?.nome,
          v.profissional_ocupante?.nome,
          v.profissional_titular?.nome,
          v.unidade_escolar?.nome,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return alvo.includes(termo)
      })
    }
  }
  return lista
}

export async function contarVagasFiltradas(filtros: FiltrosVagasListagem): Promise<number> {
  const lista = await listarVagasFiltradas(filtros)
  return lista.length
}

export async function getVagaCompleta(id: string): Promise<VagaCompleta | null> {
  const { data, error } = await supabase.from(TABELA).select(SELECT_COMPLETO).eq('id', id).limit(1)
  if (error) throw error
  return ((data || [])[0] as unknown as VagaCompleta) ?? null
}

export async function ultimoAnoComVagas(): Promise<number | null> {
  const { data, error } = await supabase
    .from(TABELA)
    .select('ano_letivo')
    .order('ano_letivo', { ascending: false })
    .limit(1)
  if (error) throw error
  return (data?.[0]?.ano_letivo as number | undefined) ?? null
}

export interface LimparVagasResultado {
  removidas: number
}

export async function limparVagasAnoUnidade(
  anoLetivo: number,
  unidadeEscolarId: string,
): Promise<LimparVagasResultado> {
  const { error, count } = await supabase
    .from(TABELA)
    .delete({ count: 'exact' })
    .eq('ano_letivo', anoLetivo)
    .eq('unidade_escolar_id', unidadeEscolarId)
  if (error) throw error
  return { removidas: count ?? 0 }
}

/* ------------------------------------------------------------------ */
/* AUDITORIA — descrições com os novos atributos                      */
/* ------------------------------------------------------------------ */

function descricaoVaga(
  v: Partial<VagaCompleta> & Record<string, any>,
  acao: 'criacao' | 'edicao' | 'exclusao' | 'geracao' | 'migracao',
): string {
  const partes: string[] = []
  partes.push(`Vaga ${v.codigo ?? '(sem código)'}`)
  if (v.unidade_escolar?.nome) partes.push(`Unidade: ${v.unidade_escolar.nome}`)
  else if (v.unidade_escolar_id) partes.push(`Unidade: ${v.unidade_escolar_id}`)
  if (v.ano_letivo) partes.push(`Ano Letivo: ${v.ano_letivo}`)
  partes.push(`Vínculo: ${rotuloTipoVinculoVaga(v.tipo_vinculo)}`)
  if (v.tipo_vinculo === 'FUNCAO') {
    if (v.funcao_objeto?.nome) partes.push(`Função da Vaga: ${v.funcao_objeto.nome}`)
    else if (v.funcao) partes.push(`Função da Vaga: ${v.funcao}`)
    else if (v.funcao_id) partes.push(`Função da Vaga: ${v.funcao_id}`)
  } else {
    if (v.cargo?.nome) partes.push(`Cargo da Vaga: ${v.cargo.nome}`)
    else if (v.funcao) partes.push(`Cargo da Vaga: ${v.funcao}`)
    else if (v.cargo_id) partes.push(`Cargo da Vaga: ${v.cargo_id}`)
  }
  partes.push(`Período: ${rotuloPeriodoVaga(v.periodo)}`)
  partes.push(`Modalidade: ${rotuloModalidadeVaga(v.modalidade)}`)
  partes.push(`Status: ${rotuloStatusVagaReal(v.status)}`)
  if (v.profissional_titular?.nome) partes.push(`Titular: ${v.profissional_titular.nome}`)
  else if (v.profissional_titular_id) partes.push(`Titular: ${v.profissional_titular_id}`)
  if (v.profissional_ocupante?.nome) partes.push(`Ocupante: ${v.profissional_ocupante.nome}`)
  else if (v.profissional_ocupante_id) partes.push(`Ocupante: ${v.profissional_ocupante_id}`)
  partes.push(`Vaga Excedente: ${v.vaga_excedente ? 'Sim' : 'Não'}`)
  const prefixo =
    acao === 'criacao'
      ? 'Criação de '
      : acao === 'edicao'
        ? 'Edição de '
        : acao === 'exclusao'
          ? 'Exclusão de '
          : acao === 'geracao'
            ? 'Geração de '
            : 'Migração de '
  return prefixo + partes.join(' · ')
}

function detalheVaga(v: Partial<VagaCompleta> & Record<string, any>): Record<string, unknown> {
  return {
    codigo: v.codigo ?? null,
    unidade_escolar_id: v.unidade_escolar_id ?? null,
    ano_letivo: v.ano_letivo ?? null,
    tipo_vinculo: v.tipo_vinculo ?? null,
    cargo_id: v.cargo_id ?? null,
    funcao_id: v.funcao_id ?? null,
    periodo: v.periodo ?? null,
    modalidade: v.modalidade ?? null,
    status: v.status ?? null,
    profissional_titular_id: v.profissional_titular_id ?? null,
    profissional_ocupante_id: v.profissional_ocupante_id ?? null,
    vaga_excedente: v.vaga_excedente ?? false,
    numero_sequencial: v.numero_sequencial ?? null,
  }
}

/* ------------------------------------------------------------------ */
/* CRUD MANUAL                                                        */
/* ------------------------------------------------------------------ */

export async function inserirVagaManual(input: InserirVagaManualInput): Promise<VagaCompleta> {
  validarVagaManual(input)
  const codigo = await gerarProximoCodigo()
  const sequencial = await gerarProximoSequencial(input.unidadeEscolarId, input.anoLetivo)
  const payload = montarPayloadVaga(input)
  payload.codigo = codigo
  payload.numero_sequencial = sequencial
  payload.vaga_excedente = true // inserção manual = vaga excedente

  // Status no banco: CHECK aceita ABERTA, OCUPADA, EXCEDENTE.
  // Regra de negócio: se tem profissional ocupante ou o usuário selecionou Preenchida => OCUPADA.
  // Caso contrário, se o status escolhido for Aberta => ABERTA.
  let statusFinal = 'ABERTA'
  if (input.profissionalOcupanteId) {
    statusFinal = 'OCUPADA'
  } else if (input.status === 'PREENCHIDA' || input.status === 'OCUPADA') {
    statusFinal = 'OCUPADA'
  } else {
    statusFinal = 'ABERTA'
  }
  payload.status = statusFinal

  // Se tem ocupante FK, carrega o nome dele para nome_ocupante
  if (input.profissionalOcupanteId) {
    const { data: prof } = await supabase
      .from('profissionais')
      .select('nome')
      .eq('id', input.profissionalOcupanteId)
      .maybeSingle()
    if (prof?.nome) {
      payload.nome_ocupante = prof.nome
    }
  } else {
    payload.nome_ocupante = null
  }

  // Se tem funcaoId ou cargoId, preenche funcao (TEXT not-null legado)
  if (input.tipoVinculo === 'FUNCAO' && input.funcaoId) {
    const { data: func } = await supabase
      .from('funcoes')
      .select('nome')
      .eq('id', input.funcaoId)
      .maybeSingle()
    payload.funcao = func?.nome || 'Função'
  } else if (input.tipoVinculo === 'CARGO' && input.cargoId) {
    const { data: cg } = await supabase
      .from('cargos')
      .select('nome')
      .eq('id', input.cargoId)
      .maybeSingle()
    payload.funcao = cg?.nome || 'Cargo'
  } else {
    payload.funcao = 'Vaga'
  }

  const { data, error } = await supabase
    .from(TABELA)
    .insert(payload)
    .select(SELECT_COMPLETO)
    .limit(1)
  if (error) throw error
  const vaga = (data || [])[0] as unknown as VagaCompleta
  const usuario = await getUsuarioAtualParaAuditoria()
  await registrarAuditoria({
    usuarioNome: usuario?.nome ?? 'Sistema',
    usuarioEmail: usuario?.email ?? '',
    entidade: 'Vaga',
    acao: 'Criação',
    descricao: descricaoVaga({ ...vaga, vaga_excedente: true }, 'criacao'),
    detalhes: { novo: detalheVaga({ ...vaga, vaga_excedente: true }) },
    vinculos: sanitizarVinculosAuditados([]),
  })
  return vaga
}

export async function editarVaga(input: EditarVagaManualInput): Promise<VagaCompleta> {
  exigir(input.id, 'Vaga não informada para edição.')
  const atual = await getVagaCompleta(input.id)
  if (!atual) throw new ValidacaoVagaError('Vaga não encontrada.')
  const payload = montarPayloadVaga({ ...input } as EditarVagaManualInput & {
    unidadeEscolarId: string
    anoLetivo: number
  })
  delete payload.unidade_escolar_id
  delete payload.ano_letivo

  // Status no banco
  let statusFinal = 'ABERTA'
  if (input.profissionalOcupanteId) {
    statusFinal = 'OCUPADA'
  } else if (input.status === 'PREENCHIDA' || input.status === 'OCUPADA') {
    statusFinal = 'OCUPADA'
  } else {
    statusFinal = 'ABERTA'
  }
  payload.status = statusFinal

  // Atualiza nome_ocupante
  if (input.profissionalOcupanteId) {
    const { data: prof } = await supabase
      .from('profissionais')
      .select('nome')
      .eq('id', input.profissionalOcupanteId)
      .maybeSingle()
    if (prof?.nome) {
      payload.nome_ocupante = prof.nome
    }
  } else {
    payload.nome_ocupante = null
  }

  // Atualiza texto funcao caso tenha mudado
  if (input.tipoVinculo === 'FUNCAO' && input.funcaoId) {
    const { data: func } = await supabase
      .from('funcoes')
      .select('nome')
      .eq('id', input.funcaoId)
      .maybeSingle()
    if (func?.nome) payload.funcao = func.nome
  } else if (input.tipoVinculo === 'CARGO' && input.cargoId) {
    const { data: cg } = await supabase
      .from('cargos')
      .select('nome')
      .eq('id', input.cargoId)
      .maybeSingle()
    if (cg?.nome) payload.funcao = cg.nome
  }

  const { data, error } = await supabase
    .from(TABELA)
    .update(payload)
    .eq('id', input.id)
    .select(SELECT_COMPLETO)
    .limit(1)
  if (error) throw error
  const vaga = (data || [])[0] as unknown as VagaCompleta
  const usuario = await getUsuarioAtualParaAuditoria()
  await registrarAuditoria({
    usuarioNome: usuario?.nome ?? 'Sistema',
    usuarioEmail: usuario?.email ?? '',
    entidade: 'Vaga',
    acao: 'Edição',
    descricao: descricaoVaga(atual, 'edicao'),
    detalhes: { antigo: detalheVaga(atual), novo: detalheVaga(vaga) },
    vinculos: sanitizarVinculosAuditados([]),
  })
  return vaga
}

/** Libera a vaga: remove o ocupante; status volta a ABERTA (ou EXCEDENTE, se marcada). */
export async function liberarVaga(id: string): Promise<VagaCompleta> {
  const atual = await getVagaCompleta(id)
  if (!atual) throw new ValidacaoVagaError('Vaga não encontrada.')
  const { data, error } = await supabase
    .from(TABELA)
    .update({
      profissional_ocupante_id: null,
      nome_ocupante: null,
      status: atual.vaga_excedente ? 'ABERTA' : 'ABERTA',
    })
    .eq('id', id)
    .select(SELECT_COMPLETO)
    .limit(1)
  if (error) throw error
  const vaga = (data || [])[0] as unknown as VagaCompleta
  const usuario = await getUsuarioAtualParaAuditoria()
  await registrarAuditoria({
    usuarioNome: usuario?.nome ?? 'Sistema',
    usuarioEmail: usuario?.email ?? '',
    entidade: 'Vaga',
    acao: 'Edição',
    descricao: `Liberação da ${descricaoVaga(atual, 'edicao')}`,
    detalhes: { antigo: detalheVaga(atual), novo: detalheVaga(vaga) },
    vinculos: sanitizarVinculosAuditados([]),
  })
  return vaga
}

export async function excluirVagaManual(id: string): Promise<void> {
  const atual = await getVagaCompleta(id)
  if (!atual) throw new ValidacaoVagaError('Vaga não encontrada.')
  const { error } = await supabase.from(TABELA).delete().eq('id', id)
  if (error) throw error
  const usuario = await getUsuarioAtualParaAuditoria()
  await registrarAuditoria({
    usuarioNome: usuario?.nome ?? 'Sistema',
    usuarioEmail: usuario?.email ?? '',
    entidade: 'Vaga',
    acao: 'Exclusão',
    descricao: descricaoVaga(atual, 'exclusao'),
    detalhes: { antigo: detalheVaga(atual) },
    vinculos: sanitizarVinculosAuditados([]),
  })
}

/* ------------------------------------------------------------------ */
/* GERAÇÃO AUTOMÁTICA                                                 */
/* ------------------------------------------------------------------ */

export interface PreviaItemIndividual {
  nivel: string
  nivelOrdem?: number
  funcaoNome: string
  cargoPadraoId?: string | null
  cargoNome?: string | null
  cargosElegiveis?: Array<{ id: string; nome: string; condicao?: string | null }>
  baseCalculo: string
  periodo: PeriodoEscola
  modalidade: 'FIXO' | 'ITINERANTE'
  tipoVinculo: 'CARGO' | 'FUNCAO'
  numeroSlot: number
  slotsIndividuais?: Array<{
    numeroSlot: number
    periodo: PeriodoEscola
    modalidade: 'FIXO' | 'ITINERANTE'
  }>
}

export interface PreviaVagaLinha {
  id: string
  unidadeEscolarId: string
  unidadeNome: string
  nivel: string
  itens: PreviaItemIndividual[]
}

export interface PreviaGeracaoResultado {
  ok: boolean
  mensagem?: string
  vagasPorUnidade: PreviaVagaLinha[]
  totalVagas: number
  resumo: Array<{ unidade: string; total: number }>
}

export interface PreviaGeracaoPayload {
  anoLetivo: number
  unidadesEscolaresIds: string[]
  turmasPorUnidade?: Record<string, Array<Record<string, unknown>>>
}

export interface ConfirmarGeracaoParams {
  anoLetivo: number
  unidadesEscolaresIds: string[]
  previa: PreviaGeracaoResultado
}

export async function resolverConfiguracaoParaEscola(
  tipoAtendimento: TipoAtendimentoUnidade,
  anoLetivo: number,
): Promise<ResolucaoConfiguracaoRh | null> {
  const configs = await getConfiguracoesRh()
  const doTipo = (configs || []).filter(
    (c: any) => c.tipo_atendimento === tipoAtendimento && c.ano_letivo === anoLetivo,
  )
  const vigente = doTipo.find((c: any) => c.status === 'VIGENTE')
  if (vigente) return { configuracao: vigente as ConfiguracaoVagasRh, criterio: 'VIGENTE' }
  if (doTipo.length > 0) {
    const ordenadas = [...doTipo].sort((a: any, b: any) =>
      (b.created_at || '').localeCompare(a.created_at || ''),
    )
    return { configuracao: ordenadas[0] as ConfiguracaoVagasRh, criterio: 'MAIS_RECENTE' }
  }
  return null
}

export async function getUnidadeEscolarAno(
  unidadeEscolarId: string,
  anoLetivo: number,
): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from('unidade_escolar_ano')
    .select('*')
    .eq('unidade_escolar_id', unidadeEscolarId)
    .eq('ano_letivo', anoLetivo)
    .limit(1)
  if (error) throw error
  return (data || [])[0] ?? null
}

export async function getUnidadesEscolaresAnoPorAno(
  anoLetivo: number,
): Promise<Array<Record<string, any>>> {
  const { data, error } = await supabase
    .from('unidade_escolar_ano')
    .select('*')
    .eq('ano_letivo', anoLetivo)
  if (error) throw error
  return data || []
}

export async function salvarUnidadeEscolarAno(registro: Record<string, any>): Promise<void> {
  const { error } = await supabase.from('unidade_escolar_ano').upsert(registro)
  if (error) throw error
}

export function normalizarTurmasPorEtapaDicionario(
  turmas: Array<Record<string, unknown>>,
): Record<string, number> {
  const mapa: Record<string, number> = {}
  for (const t of turmas) {
    const etapaNome = String(t.etapa_nome ?? t.etapa?.nome ?? 'Sem Etapa')
    mapa[etapaNome] = (mapa[etapaNome] || 0) + 1
  }
  return mapa
}

/** Expande linhas "por período" em slots individuais (uma vaga por período). */
export function expandirSlotsIndividuais(linha: LinhaConfigVagas): PreviaItemIndividual[] {
  const periodos: PeriodoEscola[] = ['MANHA', 'TARDE', 'INTEGRAL', 'NOITE']
  const base = {
    nivel: '',
    funcaoNome: linha.funcao_nome || '',
    cargoPadraoId: linha.cargo_padrao_id ?? null,
    cargosElegiveis: linha.cargos_elegiveis || [],
    baseCalculo: linha.base_calculo,
    tipoVinculo: linha.tipo === 'CARGO' ? 'CARGO' : 'FUNCAO',
  }
  if (linha.base_calculo !== 'POR_PERIODO') {
    return [
      {
        ...base,
        periodo: (linha.periodo as PeriodoEscola) || 'SEM',
        modalidade: linha.modalidade || 'FIXO',
        numeroSlot: 1,
      },
    ]
  }
  const quantidade = Number(linha.quantidade ?? 1)
  const slots: PreviaItemIndividual[] = []
  for (const periodo of periodos) {
    for (let i = 1; i <= quantidade; i += 1) {
      slots.push({ ...base, periodo, modalidade: linha.modalidade || 'FIXO', numeroSlot: i })
    }
  }
  return slots
}

export async function calcularPreviaGeracao(
  payload: PreviaGeracaoPayload,
): Promise<PreviaGeracaoResultado> {
  const { anoLetivo, unidadesEscolaresIds } = payload
  if (!unidadesEscolaresIds || unidadesEscolaresIds.length === 0) {
    return {
      ok: false,
      mensagem: 'Selecione ao menos uma unidade escolar.',
      vagasPorUnidade: [],
      totalVagas: 0,
      resumo: [],
    }
  }
  const { data: unidades, error } = await supabase
    .from('unidade_escolar')
    .select('id, nome, tipo_atendimento')
    .in('id', unidadesEscolaresIds)
  if (error) throw error
  const vagasPorUnidade: PreviaVagaLinha[] = []
  const resumo: Array<{ unidade: string; total: number }> = []
  let totalVagas = 0

  for (const unidade of (unidades || []) as Array<any>) {
    const porte = await getUnidadeEscolarAno(unidade.id, anoLetivo)
    if (!porte) {
      return {
        ok: false,
        mensagem: `A unidade "${unidade.nome}" não tem Porte da Escola cadastrado para o ano ${anoLetivo}. Cadastre o porte antes de gerar as vagas.`,
        vagasPorUnidade: [],
        totalVagas: 0,
        resumo: [],
      }
    }
    let turmas: Array<Record<string, unknown>> = payload.turmasPorUnidade?.[unidade.id] || []
    if (turmas.length === 0) {
      const { data: turmasDb } = await supabase
        .from('turma')
        .select('*, etapa:etapa_id(nome)')
        .eq('unidade_escolar_id', unidade.id)
        .eq('ano_letivo', anoLetivo)
      turmas = (turmasDb || []) as Array<Record<string, unknown>>
    }
    const resolucao = await resolverConfiguracaoParaEscola(unidade.tipo_atendimento, anoLetivo)
    if (!resolucao) {
      return {
        ok: false,
        mensagem: `Não há Configuração de Vagas por Nível para o tipo de atendimento ${unidade.tipo_atendimento} no ano ${anoLetivo}.`,
        vagasPorUnidade: [],
        totalVagas: 0,
        resumo: [],
      }
    }
    const calculo = calcularVagasPorNivel(
      resolucao.configuracao,
      { tipoAtendimento: unidade.tipo_atendimento, porte: porte as any },
      normalizarTurmasPorEtapaDicionario(turmas),
    )
    const itens: PreviaItemIndividual[] = []
    for (const porNivel of calculo.niveis) {
      for (const vaga of porNivel.vagas as VagaCalculadaMemoria[]) {
        const slots = expandirSlotsIndividuais({
          tipo: (vaga as any).tipoVinculo === 'FUNCAO' ? 'FUNCAO' : 'CARGO',
          funcao_nome: (vaga as any).funcaoNome,
          cargo_padrao_id: (vaga as any).cargoPadraoId ?? null,
          cargos_elegiveis: (vaga as any).cargosElegiveis || [],
          base_calculo: (vaga as any).baseCalculo || 'POR_ESCOLA',
          periodo: (vaga as any).periodo,
          modalidade: (vaga as any).modalidade,
          quantidade: 1,
        } as unknown as LinhaConfigVagas)
        for (const slot of slots) {
          itens.push({ ...slot, nivel: porNivel.nivel, nivelOrdem: porNivel.ordem })
        }
      }
    }
    vagasPorUnidade.push({
      id: unidade.id,
      unidadeEscolarId: unidade.id,
      unidadeNome: unidade.nome,
      nivel: (porte as any).nivel || '',
      itens,
    })
    resumo.push({ unidade: unidade.nome, total: itens.length })
    totalVagas += itens.length
  }
  return { ok: true, vagasPorUnidade, totalVagas, resumo }
}

export async function confirmarGeracaoVagas(
  params: ConfirmarGeracaoParams,
): Promise<{ geradas: number }> {
  const usuario = await getUsuarioAtualParaAuditoria()
  let geradas = 0
  for (const linha of params.previa.vagasPorUnidade) {
    const existentes = await getVagasAnoUnidade(params.anoLetivo, linha.unidadeEscolarId)
    // Preserva vagas ocupadas do mesmo ano/unidade:
    const ocupadasPreservadas = existentes.filter(
      (v) => v.profissional_ocupante_id || v.status === 'PREENCHIDA',
    )
    const aExcluir = existentes.filter(
      (v) => !(v.profissional_ocupante_id || v.status === 'PREENCHIDA'),
    )
    if (aExcluir.length > 0) {
      const { error } = await supabase
        .from(TABELA)
        .delete()
        .in(
          'id',
          aExcluir.map((v) => v.id),
        )
      if (error) throw error
    }
    let sequencial = ocupadasPreservadas.reduce(
      (max, v) => Math.max(max, Number(v.numero_sequencial ?? 0)),
      0,
    )
    const configuracao = (
      await resolverConfiguracaoParaEscola(
        (
          await supabase
            .from('unidade_escolar')
            .select('tipo_atendimento')
            .eq('id', linha.unidadeEscolarId)
            .limit(1)
        ).data?.[0]?.tipo_atendimento,
        params.anoLetivo,
      )
    )?.configuracao
    for (const item of linha.itens) {
      const slots = item.slotsIndividuais?.length
        ? item.slotsIndividuais
        : [{ numeroSlot: item.numeroSlot, periodo: item.periodo, modalidade: item.modalidade }]
      for (const slot of slots) {
        sequencial += 1
        const codigo = await gerarProximoCodigo()
        const payload: Record<string, unknown> = {
          codigo,
          unidade_escolar_id: linha.unidadeEscolarId,
          ano_letivo: params.anoLetivo,
          tipo_vinculo: item.tipoVinculo,
          cargo_id: item.tipoVinculo === 'CARGO' ? (item.cargoPadraoId ?? null) : null,
          funcao_id: item.tipoVinculo === 'FUNCAO' ? ((item as any).funcaoId ?? null) : null,
          funcao: item.funcaoNome || null,
          periodo: slot.periodo,
          modalidade: slot.modalidade,
          status: 'ABERTA',
          vaga_excedente: false,
          numero_sequencial: sequencial,
          configuracao_rh_id: configuracao?.id ?? null,
        }
        const { error } = await supabase.from(TABELA).insert(payload)
        if (error) throw error
        geradas += 1
      }
    }
    await salvarUnidadeEscolarAno({
      unidade_escolar_id: linha.unidadeEscolarId,
      ano_letivo: params.anoLetivo,
      nivel: linha.nivel,
      ultima_geracao_vagas: new Date().toISOString(),
    })
    await registrarAuditoria({
      usuarioNome: usuario?.nome ?? 'Sistema',
      usuarioEmail: usuario?.email ?? '',
      entidade: 'Vaga',
      acao: 'Criação',
      descricao: `Geração automática de ${linha.itens.length} vaga(s) na unidade ${linha.unidadeNome} para o ano letivo ${params.anoLetivo} (vagas ocupadas preservadas: ${ocupadasPreservadas.length}).`,
      detalhes: {
        ano_letivo: params.anoLetivo,
        unidade: linha.unidadeNome,
        itens: linha.itens.length,
      },
      vinculos: sanitizarVinculosAuditados([]),
    })
  }
  return { geradas }
}

/* ------------------------------------------------------------------ */
/* MIGRAÇÃO DE ANO LETIVO                                             */
/* ------------------------------------------------------------------ */

export interface MigracaoAnoLetivoParams {
  anoOrigem: number
  anoDestino: number
}

export interface MigracaoAnoLetivoResultado {
  copiadas: number
  ignoradasOcupadas: number
}

/** Copia as vagas do ano origem para o ano destino SEM ocupação (titular/ocupante nulos, status ABERTA). */
export async function migrarVagasEntreAnos(
  params: MigracaoAnoLetivoParams,
): Promise<MigracaoAnoLetivoResultado> {
  const usuario = await getUsuarioAtualParaAuditoria()
  const origem = await listarVagasAnoLetivo(params.anoOrigem)
  let copiadas = 0
  let ignoradasOcupadas = 0
  for (const vaga of origem) {
    if (vaga.profissional_ocupante_id || vaga.status === 'PREENCHIDA') {
      ignoradasOcupadas += 1
      continue
    }
    const sequencial = await gerarProximoSequencial(vaga.unidade_escolar_id, params.anoDestino)
    const codigo = await gerarProximoCodigo()
    const payload: Record<string, unknown> = {
      codigo,
      unidade_escolar_id: vaga.unidade_escolar_id,
      ano_letivo: params.anoDestino,
      tipo_vinculo: vaga.tipo_vinculo || 'CARGO',
      cargo_id: vaga.cargo_id ?? null,
      funcao_id: vaga.funcao_id ?? null,
      funcao: vaga.funcao ?? null,
      periodo: vaga.periodo,
      modalidade: vaga.modalidade,
      dias_semana: vaga.dias_semana ?? null,
      status: 'ABERTA',
      vaga_excedente: vaga.vaga_excedente,
      numero_sequencial: sequencial,
      configuracao_rh_id: vaga.configuracao_rh_id ?? null,
      observacao: vaga.observacao ?? null,
    }
    const { error } = await supabase.from(TABELA).insert(payload)
    if (error) throw error
    copiadas += 1
  }
  await registrarAuditoria({
    usuarioNome: usuario?.nome ?? 'Sistema',
    usuarioEmail: usuario?.email ?? '',
    entidade: 'Vaga',
    acao: 'Criação',
    descricao: `Migração de vagas do ano letivo ${params.anoOrigem} para ${params.anoDestino}: ${copiadas} vaga(s) copiada(s) sem ocupação; ${ignoradasOcupadas} vaga(s) ocupada(s) ignorada(s).`,
    detalhes: {
      ano_origem: params.anoOrigem,
      ano_destino: params.anoDestino,
      copiadas,
      ignoradasOcupadas,
    },
    vinculos: sanitizarVinculosAuditados([]),
  })
  return { copiadas, ignoradasOcupadas }
}

export type { VagaReal, StatusVagaReal, PeriodoEscola, StatusOcupacaoVaga }

/* ------------------------------------------------------------------ */
/* TIPOS E ALIASES COMPATÍVEIS PARA TELAS (Vagas.tsx e UnidadeDrilldown) */
/* ------------------------------------------------------------------ */
export type PeriodoVagaOpcao = 'GERAL' | 'MANHA' | 'TARDE' | 'INTEGRAL' | 'NOITE'
export type ModalidadeVagaOpcao = 'FIXO' | 'ITINERANTE'
export type StatusOcupanteForm = 'ABERTA' | 'PREENCHIDA'

export interface ResumoVagasAnoOrigem {
  anoOrigem: number
  unidadeId?: string
  totalVagas: number
  abertas: number
  ocupadas: number
  excedentes: number
  funcoesDistintas: string[]
  amostraVagas: VagaCompleta[]
}

/** Retorna resumo de vagas existentes no ano de origem (opcionalmente filtrado por unidade). */
export async function obterResumoVagasAnoOrigem(
  anoOrigem: number,
  unidadeId?: string,
): Promise<ResumoVagasAnoOrigem> {
  const query = supabase
    .from(TABELA)
    .select(`
      id,
      codigo,
      unidade_escolar_id,
      ano_letivo,
      tipo_vinculo,
      cargo_id,
      funcao_id,
      funcao,
      periodo,
      modalidade,
      dias_semana,
      status,
      vaga_excedente,
      numero_sequencial,
      configuracao_rh_id,
      turma_id,
      observacao,
      created_at,
      profissional_titular_id,
      profissional_ocupante_id,
      nome_ocupante
    `)
    .eq('ano_letivo', anoOrigem)

  if (unidadeId) {
    query.eq('unidade_escolar_id', unidadeId)
  }

  const { data, error } = await query
  if (error) throw error

  const vagas = (data || []) as unknown as VagaCompleta[]
  const totalVagas = vagas.length
  const ocupadas = vagas.filter(
    (v) => v.profissional_ocupante_id || v.status === 'PREENCHIDA' || v.status === 'OCUPADA',
  ).length
  const abertas = vagas.filter((v) => v.status === 'ABERTA').length
  const excedentes = vagas.filter((v) => v.vaga_excedente).length
  const funcoesSet = new Set<string>()
  for (const v of vagas) {
    if (v.funcao) funcoesSet.add(v.funcao)
  }

  return {
    anoOrigem,
    unidadeId,
    totalVagas,
    abertas,
    ocupadas,
    excedentes,
    funcoesDistintas: Array.from(funcoesSet),
    amostraVagas: vagas.slice(0, 10),
  }
}

/** Migra vagas de um ano para outro, com suporte a filtro de unidade individual ou lote. */
export async function migrarVagasAnoLetivo(params: {
  anoOrigem: number
  anoDestino: number
  unidadeEscolarId?: string
}): Promise<MigracaoAnoLetivoResultado & { totalOrigem?: number }> {
  const usuario = await getUsuarioAtualParaAuditoria()

  let query = supabase.from(TABELA).select('*').eq('ano_letivo', params.anoOrigem)
  if (params.unidadeEscolarId) {
    query = query.eq('unidade_escolar_id', params.unidadeEscolarId)
  }
  const { data: origem, error } = await query
  if (error) throw error

  const listaOrigem = (origem || []) as any[]
  let copiadas = 0
  let ignoradasOcupadas = 0

  for (const vaga of listaOrigem) {
    // Na migração, toda vaga nasce ABERTA e sem ocupante
    const sequencial = await gerarProximoSequencial(vaga.unidade_escolar_id, params.anoDestino)
    const codigo = await gerarProximoCodigo()

    const payload: Record<string, unknown> = {
      codigo,
      unidade_escolar_id: vaga.unidade_escolar_id,
      ano_letivo: params.anoDestino,
      tipo_vinculo: vaga.tipo_vinculo || 'CARGO',
      cargo_id: vaga.cargo_id ?? null,
      funcao_id: vaga.funcao_id ?? null,
      funcao: vaga.funcao ?? null,
      periodo: vaga.periodo,
      modalidade: vaga.modalidade,
      dias_semana: vaga.dias_semana ?? null,
      status: 'ABERTA',
      vaga_excedente: Boolean(vaga.vaga_excedente),
      numero_sequencial: sequencial,
      configuracao_rh_id: vaga.configuracao_rh_id ?? null,
      observacao: vaga.observacao ?? null,
      profissional_titular_id: null,
      profissional_ocupante_id: null,
      nome_ocupante: null,
    }

    const { error: insErr } = await supabase.from(TABELA).insert(payload)
    if (insErr) throw insErr
    copiadas += 1
  }

  await registrarAuditoria({
    usuarioNome: usuario?.nome ?? 'Sistema',
    usuarioEmail: usuario?.email ?? '',
    entidade: 'Vaga',
    acao: 'Criação',
    descricao: `Migração de vagas de ${params.anoOrigem} para ${params.anoDestino} (unidade: ${params.unidadeEscolarId || 'todas'}): ${copiadas} vaga(s) copiada(s) como ABERTA.`,
    detalhes: {
      ano_origem: params.anoOrigem,
      ano_destino: params.anoDestino,
      unidade_id: params.unidadeEscolarId ?? 'todas',
      copiadas,
    },
    vinculos: sanitizarVinculosAuditados([]),
  })

  return { copiadas, ignoradasOcupadas, totalOrigem: listaOrigem.length }
}
