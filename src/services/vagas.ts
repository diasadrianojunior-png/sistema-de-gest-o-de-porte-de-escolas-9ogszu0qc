/**
 * Serviço do Cadastro de Vagas — modelo novo:
 *  - Tipo de vínculo: CARGO ou FUNCAO (pergunta no formulário).
 *  - Cargo da Vaga / Função da Vaga: FKs para cadastros de Cargos / Funções.
 *  - Período (SEM/MANHA/TARDE/INTEGRAL/NOITE) e Modalidade (FIXO/ITINERANTE) — obrigatórios.
 *  - Status da Vaga do Ocupante (ABERTA/PREENCHIDA) — opcional na tela; coerência:
 *      com Profissional Ocupante => PREENCHIDA / OCUPADA; sem ocupante => ABERTA.
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
import { calcularVagasPorNivel, VagaCalculadaMemoria } from '@/services/configuracao-rh-calculo'
import {
  VagaReal,
  StatusVagaReal,
  PeriodoEscola,
  TipoAtendimentoUnidade,
  ConfiguracaoRh,
  ConfiguracaoRhLinha,
} from '@/types/gestao-escolar'

const TABELA = 'vaga' as const

export const STATUS_VAGA_REAL: string[] = ['ABERTA', 'PREENCHIDA']
export type PeriodoOpcaoForm = 'SEM' | 'MANHA' | 'TARDE' | 'INTEGRAL' | 'NOITE'
export type PeriodoVagaOpcao = 'GERAL' | 'MANHA' | 'TARDE' | 'INTEGRAL' | 'NOITE'
export type ModalidadeVagaOpcao = 'FIXO' | 'ITINERANTE'
export type StatusOcupanteForm = 'ABERTA' | 'PREENCHIDA'

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
  if (!valor || valor === 'GERAL') return 'Geral / Sem Período'
  const achou = PERIODOS_VAGA.find((p) => p.valor === valor)
  return achou ? achou.rotulo : valor
}
export const rotuloModalidadeVaga = (valor: string | null | undefined): string => {
  if (valor === 'ITINERANTE') return 'Itinerante'
  return 'Fixo'
}
export const rotuloStatusVagaReal = (valor: string | null | undefined): string => {
  if (valor === 'PREENCHIDA' || valor === 'OCUPADA') return 'Preenchida'
  if (valor === 'EXCEDENTE') return 'Excedente'
  return 'Aberta'
}
export const rotuloTipoVinculoVaga = (tipo: string | null | undefined): string => {
  if (tipo === 'FUNCAO') return 'Função'
  return 'Cargo'
}

/** Status coerente com a ocupação: com ocupante => PREENCHIDA / OCUPADA; sem => ABERTA. */
export const calcularStatusPorOcupacao = (
  ocupanteId: string | null | undefined,
  statusInformado?: string | null,
): string => {
  if (statusInformado === 'EXCEDENTE') return 'EXCEDENTE'
  return ocupanteId ? 'PREENCHIDA' : 'ABERTA'
}

export type LinhaConfigVagas = ConfiguracaoRhLinha

export interface ResolucaoConfiguracaoRh {
  configuracao: ConfiguracaoRh
  criterio: 'VIGENTE' | 'MAIS_RECENTE'
}

export interface VagaCompleta extends VagaReal {
  unidade_escolar?: any
  cargo?: any
  funcao_objeto?: any
  profissional_titular?: any
  profissional_ocupante?: any
  configuracao_rh?: any
}

export interface FiltrosVagasListagem {
  anoLetivo?: number | null
  unidadeId?: string | null
  unidadeEscolarId?: string | null
  somenteExcedentes?: boolean
  vagaExcedente?: boolean | string | null
  busca?: string | null
  buscaTexto?: string | null
  funcao?: string | null
  cargoId?: string | null
  periodo?: string | null
  modalidade?: string | null
  status?: string | null
  comOcupante?: boolean | string | null
}

export interface InserirVagaManualInput {
  unidadeEscolarId: string
  anoLetivo: number
  tipoVinculo: 'CARGO' | 'FUNCAO' | string
  cargoId?: string | null
  funcaoId?: string | null
  periodo: PeriodoOpcaoForm | PeriodoVagaOpcao | PeriodoEscola | string | null
  modalidade: 'FIXO' | 'ITINERANTE' | string
  diasSemana?: number | null
  status?: 'ABERTA' | 'PREENCHIDA' | string | null
  statusOcupante?: 'ABERTA' | 'PREENCHIDA' | string | null
  profissionalOcupanteId?: string | null
  profissionalTitularId?: string | null
  observacao?: string | null
  numeroSequencial?: number | null
  funcao?: string | null
  configuracaoRhId?: string | null
  configuracaoRhLinhaId?: string | null
}

export interface EditarVagaManualInput {
  id?: string
  vagaId?: string
  tipoVinculo?: 'CARGO' | 'FUNCAO' | string
  cargoId?: string | null
  funcaoId?: string | null
  periodo?: PeriodoOpcaoForm | PeriodoVagaOpcao | PeriodoEscola | string | null
  modalidade?: 'FIXO' | 'ITINERANTE' | string
  diasSemana?: number | null
  status?: 'ABERTA' | 'PREENCHIDA' | string | null
  statusOcupante?: 'ABERTA' | 'PREENCHIDA' | string | null
  profissionalOcupanteId?: string | null
  profissionalTitularId?: string | null
  nomeOcupante?: string | null
  observacao?: string | null
  numeroSequencial?: number | null
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
  const periodoInformado = input.periodo
  const periodoDb =
    !periodoInformado ||
    (periodoInformado as string) === 'SEM' ||
    (periodoInformado as string) === 'GERAL'
      ? null
      : periodoInformado

  const payload: Record<string, unknown> = {
    tipo_vinculo: input.tipoVinculo ?? 'FUNCAO',
    cargo_id: input.tipoVinculo === 'CARGO' ? input.cargoId || null : null,
    funcao_id: input.tipoVinculo === 'FUNCAO' ? input.funcaoId || null : null,
    periodo: periodoDb,
    modalidade: input.modalidade || 'FIXO',
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
  if (input.numeroSequencial !== undefined && input.numeroSequencial !== null) {
    payload.numero_sequencial = input.numeroSequencial
  }
  if ((input as InserirVagaManualInput).configuracaoRhId) {
    payload.configuracao_rh_id = (input as InserirVagaManualInput).configuracaoRhId
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

export async function listarVagasCompletas(
  filtros?: FiltrosVagasListagem,
): Promise<VagaCompleta[]> {
  if (filtros && Object.keys(filtros).length > 0) {
    return listarVagasFiltradas(filtros)
  }
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
  if (!isUuidValido(unidadeEscolarId)) return []
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
  if (!isUuidValido(unidadeEscolarId)) return 0
  const { count, error } = await supabase
    .from(TABELA)
    .select('id', { count: 'exact', head: true })
    .eq('ano_letivo', anoLetivo)
    .eq('unidade_escolar_id', unidadeEscolarId)
  if (error) throw error
  return count ?? 0
}

/** Verifica se uma string possui formato válido de UUID para evitar erros de sintaxe no Postgres */
export function isUuidValido(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false
  const str = valor.trim().toLowerCase()
  if (!str || str === 'todos' || str === 'todas' || str === 'all' || str === 'sem') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

/** Limpa valores sentinela de filtros ('TODOS', 'TODAS', vazio) retornando null se for sentinela */
export function sanitizarFiltroTexto(valor?: string | null): string | null {
  if (!valor) return null
  const limpo = valor.trim()
  if (!limpo || limpo.toUpperCase() === 'TODOS' || limpo.toUpperCase() === 'TODAS') return null
  return limpo
}

export async function listarVagasFiltradas(filtros: FiltrosVagasListagem): Promise<VagaCompleta[]> {
  let query = supabase.from(TABELA).select(SELECT_COMPLETO)
  if (filtros.anoLetivo) query = query.eq('ano_letivo', filtros.anoLetivo)
  const uid = filtros.unidadeEscolarId || filtros.unidadeId
  if (uid && isUuidValido(uid)) query = query.eq('unidade_escolar_id', uid)
  if (
    filtros.somenteExcedentes ||
    filtros.vagaExcedente === true ||
    filtros.vagaExcedente === 'true'
  ) {
    query = query.eq('vaga_excedente', true)
  } else if (filtros.vagaExcedente === false || filtros.vagaExcedente === 'false') {
    query = query.eq('vaga_excedente', false)
  }
  if (filtros.cargoId && isUuidValido(filtros.cargoId)) {
    query = query.eq('cargo_id', filtros.cargoId)
  }
  const funcaoFiltro = sanitizarFiltroTexto(filtros.funcao)
  if (funcaoFiltro) query = query.eq('funcao', funcaoFiltro)

  const modalidadeFiltro = sanitizarFiltroTexto(filtros.modalidade)
  if (modalidadeFiltro) query = query.eq('modalidade', modalidadeFiltro)

  const statusFiltro = sanitizarFiltroTexto(filtros.status)
  if (statusFiltro) query = query.eq('status', statusFiltro)

  if (filtros.periodo) {
    const periodoUpper = filtros.periodo.toUpperCase()
    if (periodoUpper === 'GERAL' || periodoUpper === 'SEM') {
      query = query.is('periodo', null)
    } else if (periodoUpper !== 'TODOS' && periodoUpper !== 'TODAS') {
      query = query.eq('periodo', filtros.periodo)
    }
  }
  query = query.order('numero_sequencial', { ascending: true })
  const { data, error } = await query
  if (error) throw error
  let lista = (data || []) as unknown as VagaCompleta[]

  if (filtros.comOcupante === true || filtros.comOcupante === 'true') {
    lista = lista.filter(
      (v) => !!v.profissional_ocupante_id || v.status === 'OCUPADA' || v.status === 'PREENCHIDA',
    )
  } else if (filtros.comOcupante === false || filtros.comOcupante === 'false') {
    lista = lista.filter((v) => !v.profissional_ocupante_id && v.status === 'ABERTA')
  }

  const busca = (filtros.buscaTexto || filtros.busca || '').trim().toLowerCase()
  if (busca) {
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
      return alvo.includes(busca)
    })
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
  const sequencial =
    input.numeroSequencial ||
    (await gerarProximoSequencial(input.unidadeEscolarId, input.anoLetivo))
  const payload = montarPayloadVaga(input)
  payload.codigo = codigo
  payload.numero_sequencial = sequencial
  payload.vaga_excedente = true // inserção manual = vaga excedente

  const statusInformado = input.statusOcupante || input.status
  let statusFinal = 'ABERTA'
  if (input.profissionalOcupanteId) {
    statusFinal = 'OCUPADA'
  } else if (statusInformado === 'PREENCHIDA' || statusInformado === 'OCUPADA') {
    statusFinal = 'OCUPADA'
  } else {
    statusFinal = 'ABERTA'
  }
  payload.status = statusFinal

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

  if (input.funcao) {
    payload.funcao = input.funcao
  } else if (input.tipoVinculo === 'FUNCAO' && input.funcaoId) {
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
    .insert(payload as any)
    .select(SELECT_COMPLETO)
    .limit(1)
  if (error) throw error
  const vaga = (data || [])[0] as unknown as VagaCompleta
  const usuario = await getUsuarioAtualParaAuditoria()
  await registrarAuditoria({
    usuario_nome: usuario?.nome ?? 'Sistema',
    usuario_email: usuario?.email ?? '',
    entidade: 'Vaga',
    acao: 'Criação',
    descricao: descricaoVaga({ ...vaga, vaga_excedente: true }, 'criacao'),
    detalhes: { novo: detalheVaga({ ...vaga, vaga_excedente: true }) },
  })
  return vaga
}

export async function editarVaga(input: EditarVagaManualInput): Promise<VagaCompleta> {
  const vagaId = input.id || input.vagaId
  if (!vagaId) {
    throw new ValidacaoVagaError('Vaga não informada para edição.')
  }
  const atual = await getVagaCompleta(vagaId)
  if (!atual) throw new ValidacaoVagaError('Vaga não encontrada.')
  const payload = montarPayloadVaga({ ...input, id: vagaId } as EditarVagaManualInput)
  delete payload.unidade_escolar_id
  delete payload.ano_letivo

  const statusInformado = input.statusOcupante || input.status
  let statusFinal = 'ABERTA'
  if (input.profissionalOcupanteId || input.nomeOcupante) {
    statusFinal = 'OCUPADA'
  } else if (statusInformado === 'PREENCHIDA' || statusInformado === 'OCUPADA') {
    statusFinal = 'OCUPADA'
  } else {
    statusFinal = 'ABERTA'
  }
  payload.status = statusFinal

  if (input.profissionalOcupanteId) {
    const { data: prof } = await supabase
      .from('profissionais')
      .select('nome')
      .eq('id', input.profissionalOcupanteId)
      .maybeSingle()
    if (prof?.nome) {
      payload.nome_ocupante = prof.nome
    }
  } else if (input.nomeOcupante !== undefined) {
    payload.nome_ocupante = input.nomeOcupante || null
  }

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
    .update(payload as any)
    .eq('id', vagaId)
    .select(SELECT_COMPLETO)
    .limit(1)
  if (error) throw error
  const vaga = (data || [])[0] as unknown as VagaCompleta
  const usuario = await getUsuarioAtualParaAuditoria()
  await registrarAuditoria({
    usuario_nome: usuario?.nome ?? 'Sistema',
    usuario_email: usuario?.email ?? '',
    entidade: 'Vaga',
    acao: 'Edição',
    descricao: descricaoVaga(atual, 'edicao'),
    detalhes: { antigo: detalheVaga(atual), novo: detalheVaga(vaga) },
  })
  return vaga
}

/** Libera a vaga: remove o ocupante; status volta a ABERTA. */
export async function liberarVaga(id: string): Promise<VagaCompleta> {
  const atual = await getVagaCompleta(id)
  if (!atual) throw new ValidacaoVagaError('Vaga não encontrada.')
  const { data, error } = await supabase
    .from(TABELA)
    .update({
      profissional_ocupante_id: null,
      nome_ocupante: null,
      status: 'ABERTA',
    })
    .eq('id', id)
    .select(SELECT_COMPLETO)
    .limit(1)
  if (error) throw error
  const vaga = (data || [])[0] as unknown as VagaCompleta
  const usuario = await getUsuarioAtualParaAuditoria()
  await registrarAuditoria({
    usuario_nome: usuario?.nome ?? 'Sistema',
    usuario_email: usuario?.email ?? '',
    entidade: 'Vaga',
    acao: 'Edição',
    descricao: `Liberação da ${descricaoVaga(atual, 'edicao')}`,
    detalhes: { antigo: detalheVaga(atual), novo: detalheVaga(vaga) },
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
    usuario_nome: usuario?.nome ?? 'Sistema',
    usuario_email: usuario?.email ?? '',
    entidade: 'Vaga',
    acao: 'Exclusão',
    descricao: descricaoVaga(atual, 'exclusao'),
    detalhes: { antigo: detalheVaga(atual) },
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
  funcao?: string
  slotsIndividuais?: Array<{
    numeroSlot: number
    periodo: PeriodoEscola
    modalidade: 'FIXO' | 'ITINERANTE'
  }>
}

export interface PreviaVagaLinhaItem {
  linhaId: string
  funcao: string
  baseCalculo: string
  quantidadeMatriz: number
  multiplicador: number
  quantidadeFinal: number
  modalidade: string
  diasSemana?: number | null
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
  // Campos detalhados consumidos por Vagas.tsx e UnidadeVagasDrilldown.tsx
  bloqueadoPorFaltaDados: { mensagem: string } | null
  configuracaoUsada: any
  motivoConfiguracao?: string
  nivelEncontradoCodigo: string
  nivelFaixaDescricao: string
  unidadeAno: {
    qtd_alunos: number
    qtd_turmas: number
    periodos?: string[]
  }
  resumoTexto: string
  totalVagasCalculadas: number
  vagasLinhas: PreviaVagaLinhaItem[]
  escola: {
    id: string
    nome: string
    tipo_atendimento: string
    codigo?: string
  }
  porteEscola: {
    quantidade_alunos: number
    nivel_faixa: string
  } | null
  turmasCadastradas: any[]
  contagemTurmasPorEtapa: Record<string, number>
  vagasExistentes: VagaCompleta[]
}

export interface PreviaGeracaoPayload {
  anoLetivo: number
  unidadesEscolaresIds: string[]
  turmasPorUnidade?: Record<string, Array<Record<string, unknown>>>
}

export interface ConfirmarGeracaoParams {
  unidadeEscolarId?: string
  anoLetivo: number
  usuarioNome?: string
  usuarioEmail?: string
  unidadesEscolaresIds?: string[]
  previa?: PreviaGeracaoResultado
}

export interface ConfirmarGeracaoResultado {
  escolaNome: string
  nivelCodigo: string
  totalVagasFinais: number
  novasCriadas: number
  abertasRemovidas: number
  excedentesMarcadas: number
  geradas?: number
}

export async function resolverConfiguracaoParaEscola(
  tipoAtendimento: TipoAtendimentoUnidade | string,
  anoLetivo: number,
): Promise<ResolucaoConfiguracaoRh | null> {
  const configs = await getConfiguracoesRh()
  const doTipo = (configs || []).filter(
    (c: any) => c.tipo_atendimento === tipoAtendimento && c.ano_letivo === anoLetivo,
  )
  const vigente = doTipo.find((c: any) => c.status === 'VIGENTE')
  if (vigente) return { configuracao: vigente as ConfiguracaoRh, criterio: 'VIGENTE' }
  if (doTipo.length > 0) {
    const ordenadas = [...doTipo].sort((a: any, b: any) =>
      (b.created_at || '').localeCompare(a.created_at || ''),
    )
    return { configuracao: ordenadas[0] as ConfiguracaoRh, criterio: 'MAIS_RECENTE' }
  }
  // Se não tem do ano, busca a mais recente do mesmo tipo de atendimento
  const qualquerAno = (configs || []).filter((c: any) => c.tipo_atendimento === tipoAtendimento)
  if (qualquerAno.length > 0) {
    const vig = qualquerAno.find((c: any) => c.status === 'VIGENTE')
    if (vig) return { configuracao: vig as ConfiguracaoRh, criterio: 'VIGENTE' }
    const ord = [...qualquerAno].sort((a: any, b: any) =>
      (b.created_at || '').localeCompare(a.created_at || ''),
    )
    return { configuracao: ord[0] as ConfiguracaoRh, criterio: 'MAIS_RECENTE' }
  }
  return null
}

export async function getUnidadeEscolarAno(
  unidadeEscolarId: string,
  anoLetivo: number,
): Promise<Record<string, any> | null> {
  if (!isUuidValido(unidadeEscolarId)) return null
  const { data, error } = await supabase
    .from('porte_escola_ano')
    .select('*')
    .eq('unidade_escolar_id', unidadeEscolarId)
    .eq('ano_letivo', anoLetivo)
    .maybeSingle()
  if (error) {
    // fallback caso a tabela unidade_escolar_ano exista
    const { data: fallback } = await supabase
      .from('unidade_escolar_ano')
      .select('*')
      .eq('unidade_escolar_id', unidadeEscolarId)
      .eq('ano_letivo', anoLetivo)
      .maybeSingle()
    return fallback ?? null
  }
  return data ?? null
}

export async function getUnidadesEscolaresAnoPorAno(
  anoLetivo: number,
): Promise<Array<Record<string, any>>> {
  const { data } = await supabase.from('porte_escola_ano').select('*').eq('ano_letivo', anoLetivo)
  return data || []
}

export async function salvarUnidadeEscolarAno(registro: Record<string, any>): Promise<void> {
  await supabase.from('porte_escola_ano').upsert(registro)
}

export function normalizarTurmasPorEtapaDicionario(
  turmas: Array<Record<string, unknown>> | Record<string, unknown> | null | undefined,
): Record<string, number> {
  if (!turmas) return {}
  const mapa: Record<string, number> = {}
  if (Array.isArray(turmas)) {
    for (const t of turmas) {
      const tAny = t as any
      const etapaNome = String(tAny.etapa_nome ?? tAny.etapa?.nome ?? tAny.etapa ?? 'Sem Etapa')
      const qtd = Number(tAny.quantidade ?? 1) || 1
      mapa[etapaNome] = (mapa[etapaNome] || 0) + qtd
    }
  } else if (typeof turmas === 'object') {
    for (const [chave, val] of Object.entries(turmas)) {
      mapa[chave] = Number(val) || 0
    }
  }
  return mapa
}

/**
 * Expande linhas da matriz em slots individuais de vagas.
 * Suporta ambas as assinaturas (antiga com parâmetros soltos e nova com LinhaConfigVagas).
 */
export function expandirSlotsIndividuais(
  linha: LinhaConfigVagas | any,
  quantidadeMatriz?: number,
  periodos?: PeriodoEscola[],
  totalTurmas?: number,
  turmasEtapa?: number,
  modalidadeParam?: string,
  diasSemanaParam?: number | null,
): PreviaItemIndividual[] {
  const baseCalculo = linha.base_calculo || 'POR_ESCOLA'
  const funcaoNome = linha.funcao_nome || linha.funcao?.nome || linha.cargo?.nome || 'Função'
  const isCargo = linha.tipo === 'CARGO' || linha.tipo_linha === 'CARGO'
  const tipoVinculo: 'CARGO' | 'FUNCAO' = isCargo ? 'CARGO' : 'FUNCAO'
  const modalidadeFinal = (modalidadeParam || linha.modalidade || 'FIXO') as 'FIXO' | 'ITINERANTE'
  const periodosLista: PeriodoEscola[] =
    periodos && periodos.length > 0 ? periodos : ['MANHA', 'TARDE', 'INTEGRAL', 'NOITE']

  const slots: PreviaItemIndividual[] = []
  const qtdMatriz =
    quantidadeMatriz !== undefined ? quantidadeMatriz : Number(linha.quantidade ?? 1)

  if (baseCalculo === 'POR_PERIODO') {
    for (const p of periodosLista) {
      for (let i = 1; i <= Math.max(1, qtdMatriz); i += 1) {
        slots.push({
          nivel: '',
          funcaoNome,
          funcao: funcaoNome,
          cargoPadraoId: linha.cargo_padrao_id ?? linha.cargo_id ?? null,
          cargosElegiveis: linha.cargos_elegiveis || [],
          baseCalculo,
          tipoVinculo,
          numeroSlot: i,
          periodo: p,
          modalidade: modalidadeFinal,
        })
      }
    }
    return slots
  }

  // POR_TURMA ou POR_TURMA_ETAPA ou POR_ESCOLA
  let multiplicador = 1
  if (baseCalculo === 'POR_TURMA' && totalTurmas !== undefined) {
    multiplicador = Math.max(0, totalTurmas)
  } else if (baseCalculo === 'POR_TURMA_ETAPA' && turmasEtapa !== undefined) {
    multiplicador = Math.max(0, turmasEtapa)
  }

  const total = Math.max(1, qtdMatriz * multiplicador)
  for (let i = 1; i <= total; i += 1) {
    slots.push({
      nivel: '',
      funcaoNome,
      funcao: funcaoNome,
      cargoPadraoId: linha.cargo_padrao_id ?? linha.cargo_id ?? null,
      cargosElegiveis: linha.cargos_elegiveis || [],
      baseCalculo,
      tipoVinculo,
      numeroSlot: i,
      periodo: (linha.periodo as PeriodoEscola) || 'INTEGRAL',
      modalidade: modalidadeFinal,
    })
  }

  return slots
}

/**
 * Calcula prévia de geração com suporte a:
 *  - calcularPreviaGeracao(unidadeId, anoLetivo)
 *  - calcularPreviaGeracao(payload: PreviaGeracaoPayload)
 */
export async function calcularPreviaGeracao(
  unidadeIdOuPayload: string | PreviaGeracaoPayload,
  anoLetivoParam?: number,
): Promise<PreviaGeracaoResultado> {
  let unidadeId: string
  let anoLetivo: number

  if (typeof unidadeIdOuPayload === 'string') {
    unidadeId = unidadeIdOuPayload
    anoLetivo = anoLetivoParam || new Date().getFullYear()
  } else {
    unidadeId = unidadeIdOuPayload.unidadesEscolaresIds[0] || ''
    anoLetivo = unidadeIdOuPayload.anoLetivo
  }

  // Se a unidade fornecida não for um UUID válido (ex: 'TODOS', 'TODAS', vazia)
  if (!isUuidValido(unidadeId)) {
    return {
      ok: false,
      mensagem: 'Selecione uma Unidade Escolar específica para visualizar o resumo e gerar vagas.',
      vagasPorUnidade: [],
      totalVagas: 0,
      resumo: [],
      bloqueadoPorFaltaDados: {
        mensagem:
          'Selecione uma Unidade Escolar específica para resgatar dados de porte e gerar vagas.',
      },
      configuracaoUsada: null,
      nivelEncontradoCodigo: '',
      nivelFaixaDescricao: '',
      unidadeAno: null,
      resumoTexto: 'Todas as Unidades Escolares selecionadas.',
      totalVagasCalculadas: 0,
      vagasLinhas: [],
      escola: {
        id: unidadeId,
        nome: 'Todas as Unidades Escolares',
        tipo_atendimento: 'Múltiplos Atendimentos',
        codigo: undefined,
      },
      porteEscola: null,
      turmasCadastradas: [],
      contagemTurmasPorEtapa: {},
      vagasExistentes: [],
    }
  }

  // 1. Carregar unidade escolar
  const { data: unidadeDb } = await (supabase as any)
    .from('unidades_escolares')
    .select('id, nome, tipo_atendimento, codigo')
    .eq('id', unidadeId)
    .maybeSingle()

  const escola = {
    id: unidadeDb?.id || unidadeId,
    nome: (unidadeDb?.nome as string) || 'Unidade Escolar',
    tipo_atendimento:
      (unidadeDb?.tipo_atendimento as string) || 'Ensino Fundamental e Educação Infantil (20h)',
    codigo: unidadeDb?.codigo as string | undefined,
  }

  // 2. Carregar porte da escola no ano
  const porte = await getUnidadeEscolarAno(unidadeId, anoLetivo)
  const porteEscola = porte
    ? {
        quantidade_alunos: Number(porte.quantidade_alunos ?? porte.qtd_alunos ?? 0),
        nivel_faixa: String(porte.nivel_faixa ?? porte.nivel ?? 'Nível I'),
      }
    : null

  // 3. Carregar turmas vinculadas no ano
  const { data: turmasDb } = await (supabase as any)
    .from('turmas')
    .select('id, nome, etapa_id, periodo, quantidade_alunos, etapa:etapa_id(nome)')
    .eq('unidade_escolar_id', unidadeId)
    .eq('ano_letivo', anoLetivo)

  const turmasCadastradas = (turmasDb || []) as any[]
  const contagemTurmasPorEtapa: Record<string, number> = {}
  const periodosSet = new Set<string>()
  for (const t of turmasCadastradas) {
    const nomeEtapa = t.etapa?.nome || 'Sem Etapa'
    contagemTurmasPorEtapa[nomeEtapa] = (contagemTurmasPorEtapa[nomeEtapa] || 0) + 1
    if (t.periodo) periodosSet.add(t.periodo)
  }
  const periodosArray = Array.from(periodosSet)

  // 4. Carregar vagas existentes no ano/unidade
  const vagasExistentes = (await getVagasAnoUnidade(anoLetivo, unidadeId)) as VagaCompleta[]

  // 5. Resolver configuração RH do tipo de atendimento
  const resolucao = await resolverConfiguracaoParaEscola(escola.tipo_atendimento as any, anoLetivo)

  // Verificar bloqueios
  let bloqueado: { mensagem: string } | null = null
  if (!porte) {
    bloqueado = {
      mensagem: `A unidade escolar "${escola.nome}" não possui Porte da Escola cadastrado para o ano ${anoLetivo}. Acesse "Cadastros Mestres > Porte da Escola por Ano Letivo" para cadastrar quantidade de alunos e nível antes de gerar vagas.`,
    }
  } else if (!resolucao) {
    bloqueado = {
      mensagem: `Não foi encontrada Configuração de Vagas por Nível para o tipo de atendimento "${escola.tipo_atendimento}" no ano ${anoLetivo}. Cadastre uma configuração com status VIGENTE no módulo correspondente.`,
    }
  }

  // Configuração usada
  const configuracaoUsada = resolucao?.configuracao || {
    id: 'cfg-padrao',
    codigo: 'CRHN-0001',
    tipo_atendimento: escola.tipo_atendimento,
    ano_letivo: anoLetivo,
    status: 'VIGENTE',
    linhas: [],
    niveis: [],
  }

  // Executar cálculo em memória
  const qtdAlunos = porteEscola ? porteEscola.quantidade_alunos : 0
  const qtdPeriodos = Math.max(1, periodosArray.length)
  const calculo = resolucao
    ? calcularVagasPorNivel(
        resolucao.configuracao as any,
        qtdAlunos,
        qtdPeriodos,
        contagemTurmasPorEtapa,
      )
    : { nivelEncontrado: null, vagas: [] }

  const nivelCodigo =
    calculo.nivelEncontrado?.codigo_nivel ||
    porte?.nivel ||
    (porte?.nivel_faixa ? String(porte.nivel_faixa).split(' ')[0] : 'I')

  const nivelFaixaDescricao =
    calculo.nivelEncontrado?.min_alunos !== undefined
      ? `Faixa: ${calculo.nivelEncontrado.min_alunos} a ${calculo.nivelEncontrado.max_alunos ?? 'sem limite'} alunos`
      : porteEscola?.nivel_faixa || 'Faixa não determinada'

  // Montar linhas calculadas para o modal
  const vagasLinhas: PreviaVagaLinhaItem[] = []
  const itensIndividuais: PreviaItemIndividual[] = []
  let totalVagasCalculadas = 0

  if (calculo.vagas && calculo.vagas.length > 0) {
    for (const v of calculo.vagas) {
      vagasLinhas.push({
        linhaId: v.linhaId,
        funcao: v.funcaoNome,
        baseCalculo: v.baseCalculo,
        quantidadeMatriz: v.quantidadeMatriz,
        multiplicador: v.multiplicador,
        quantidadeFinal: v.quantidadeFinal,
        modalidade: v.modalidade,
        diasSemana: v.diasSemana,
      })
      totalVagasCalculadas += v.quantidadeFinal

      // Itens detalhados
      const slots = expandirSlotsIndividuais(
        {
          tipo: 'FUNCAO',
          funcao_nome: v.funcaoNome,
          base_calculo: v.baseCalculo,
          periodo: 'SEM',
          modalidade: v.modalidade,
          quantidade: v.quantidadeMatriz,
        } as any,
        v.quantidadeMatriz,
        periodosArray as PeriodoEscola[],
        turmasCadastradas.length,
        0,
        v.modalidade,
        v.diasSemana,
      )
      itensIndividuais.push(...slots)
    }
  }

  const vagasPorUnidade: PreviaVagaLinha[] = [
    {
      id: unidadeId,
      unidadeEscolarId: unidadeId,
      unidadeNome: escola.nome,
      nivel: nivelCodigo,
      itens: itensIndividuais,
    },
  ]

  return {
    ok: !bloqueado,
    mensagem: bloqueado?.mensagem,
    vagasPorUnidade,
    totalVagas: totalVagasCalculadas,
    resumo: [{ unidade: escola.nome, total: totalVagasCalculadas }],
    bloqueadoPorFaltaDados: bloqueado,
    configuracaoUsada,
    motivoConfiguracao: resolucao?.criterio === 'VIGENTE' ? 'Configuração Vigente' : 'Mais Recente',
    nivelEncontradoCodigo: nivelCodigo,
    nivelFaixaDescricao,
    unidadeAno: {
      qtd_alunos: qtdAlunos,
      qtd_turmas: turmasCadastradas.length,
      periodos: periodosArray,
    },
    resumoTexto: `${totalVagasCalculadas} vagas calculadas para ${qtdAlunos} alunos em ${turmasCadastradas.length} turmas.`,
    totalVagasCalculadas,
    vagasLinhas,
    escola,
    porteEscola,
    turmasCadastradas,
    contagemTurmasPorEtapa,
    vagasExistentes,
  }
}

/**
 * Confirma a geração de vagas da unidade escolar para o ano letivo.
 * Mantém idempotência e preserva vagas ocupadas.
 */
export async function confirmarGeracaoVagas(
  params: ConfirmarGeracaoParams,
): Promise<ConfirmarGeracaoResultado> {
  const unidadeId = params.unidadeEscolarId || params.unidadesEscolaresIds?.[0]
  if (!unidadeId) {
    throw new ValidacaoVagaError('Unidade Escolar não informada para geração.')
  }
  const anoLetivo = params.anoLetivo
  const usuario = await getUsuarioAtualParaAuditoria()

  // 1. Calcular prévia caso não tenha vindo
  const previa = params.previa || (await calcularPreviaGeracao(unidadeId, anoLetivo))
  if (previa.bloqueadoPorFaltaDados) {
    throw new ValidacaoVagaError(previa.bloqueadoPorFaltaDados.mensagem)
  }

  // 2. Vagas existentes no banco
  const existentes = await getVagasAnoUnidade(anoLetivo, unidadeId)
  const ocupadas = existentes.filter(
    (v) =>
      v.profissional_ocupante_id ||
      v.nome_ocupante ||
      v.status === 'OCUPADA' ||
      v.status === 'PREENCHIDA',
  )
  const abertas = existentes.filter(
    (v) =>
      !(
        v.profissional_ocupante_id ||
        v.nome_ocupante ||
        v.status === 'OCUPADA' ||
        v.status === 'PREENCHIDA'
      ),
  )

  // 3. Limpar vagas abertas geradas anteriormente (preserva ocupadas e manuais excedentes ocupadas)
  let abertasRemovidas = 0
  if (abertas.length > 0) {
    const ids = abertas.map((v) => v.id)
    const { error: delErr } = await supabase.from(TABELA).delete().in('id', ids)
    if (delErr) throw delErr
    abertasRemovidas = ids.length
  }

  // 4. Sequencial inicial a partir do maior existente
  let sequencial = ocupadas.reduce((max, v) => Math.max(max, Number(v.numero_sequencial ?? 0)), 0)

  // 5. Inserir novas vagas calculadas
  let novasCriadas = 0
  const cfgId = previa.configuracaoUsada?.id || null

  for (const vl of previa.vagasLinhas) {
    const totalDestaLinha = vl.quantidadeFinal
    for (let i = 0; i < totalDestaLinha; i += 1) {
      sequencial += 1
      const codigo = await gerarProximoCodigo()
      const payload: Record<string, unknown> = {
        codigo,
        unidade_escolar_id: unidadeId,
        ano_letivo: anoLetivo,
        tipo_vinculo: 'FUNCAO',
        funcao: vl.funcao,
        periodo: null,
        modalidade: vl.modalidade || 'FIXO',
        dias_semana: vl.modalidade === 'ITINERANTE' ? Number(vl.diasSemana ?? 2) : null,
        status: 'ABERTA',
        vaga_excedente: false,
        numero_sequencial: sequencial,
        configuracao_rh_id: cfgId,
      }
      const { error: insErr } = await supabase.from(TABELA).insert(payload as any)
      if (insErr) throw insErr
      novasCriadas += 1
    }
  }

  const excedentesMarcadas = existentes.filter((v) => v.vaga_excedente).length
  const totalVagasFinais = ocupadas.length + novasCriadas

  await registrarAuditoria({
    usuario_nome: params.usuarioNome || usuario?.nome || 'Sistema',
    usuario_email: params.usuarioEmail || usuario?.email || '',
    entidade: 'Vaga',
    acao: 'Criação',
    descricao: `Geração automática de vagas da unidade ${previa.escola.nome} (${anoLetivo}): ${novasCriadas} novas vagas criadas, ${abertasRemovidas} abertas removidas, ${ocupadas.length} ocupadas preservadas.`,
    detalhes: {
      unidadeId,
      anoLetivo,
      novasCriadas,
      abertasRemovidas,
      ocupadasPreservadas: ocupadas.length,
      totalVagasFinais,
    },
  })

  return {
    escolaNome: previa.escola.nome,
    nivelCodigo: previa.nivelEncontradoCodigo,
    totalVagasFinais,
    novasCriadas,
    abertasRemovidas,
    excedentesMarcadas,
    geradas: novasCriadas,
  }
}

/* ------------------------------------------------------------------ */
/* MIGRAÇÃO DE ANO LETIVO                                             */
/* ------------------------------------------------------------------ */

export interface MigracaoAnoLetivoParams {
  anoOrigem: number
  anoDestino: number
  unidadeEscolarId?: string
  usuarioNome?: string
  usuarioEmail?: string
}

export interface MigracaoAnoLetivoResultado {
  escolaNome: string
  migradasCriadas: number
  anoOrigem: number
  anoDestino: number
  totalDestinoFinal: number
  copiadas: number
  ignoradasOcupadas: number
  totalOrigem: number
}

export interface ResumoVagasPorFuncao {
  funcao: string
  total: number
  ocupadas: number
  abertas: number
}

export interface ResumoVagasAnoOrigem {
  anoOrigem: number
  unidadeId?: string
  total: number
  totalVagas: number
  abertas: number
  ocupadas: number
  excedentes: number
  funcoesDistintas: string[]
  porFuncao: ResumoVagasPorFuncao[]
  amostraVagas: VagaCompleta[]
}

/**
 * Retorna o resumo das vagas do ano de origem para a migração.
 * Suporta ambas as assinaturas de chamada:
 *  - obterResumoVagasAnoOrigem(anoOrigem, unidadeId?)
 *  - obterResumoVagasAnoOrigem(unidadeId, anoOrigem)
 */
export async function obterResumoVagasAnoOrigem(
  primeiroParam: number | string,
  segundoParam?: number | string,
): Promise<ResumoVagasAnoOrigem> {
  let anoOrigem: number
  let unidadeId: string | undefined

  if (typeof primeiroParam === 'number') {
    anoOrigem = primeiroParam
    unidadeId = typeof segundoParam === 'string' ? segundoParam : undefined
  } else {
    unidadeId = primeiroParam
    anoOrigem = typeof segundoParam === 'number' ? segundoParam : Number(segundoParam)
  }

  let query = supabase.from(TABELA).select(SELECT_COMPLETO).eq('ano_letivo', anoOrigem)
  if (unidadeId && isUuidValido(unidadeId)) query = query.eq('unidade_escolar_id', unidadeId)
  const { data, error } = await query
  if (error) throw error

  const vagas = (data || []) as unknown as VagaCompleta[]
  const total = vagas.length
  const ocupadas = vagas.filter(
    (v) =>
      v.profissional_ocupante_id ||
      v.nome_ocupante ||
      v.status === 'PREENCHIDA' ||
      v.status === 'OCUPADA',
  ).length
  const abertas = vagas.filter((v) => v.status === 'ABERTA').length
  const excedentes = vagas.filter((v) => v.vaga_excedente).length

  const mapaPorFuncao: Record<string, { total: number; ocupadas: number; abertas: number }> = {}
  for (const v of vagas) {
    const fn = v.funcao || 'Outros'
    if (!mapaPorFuncao[fn]) {
      mapaPorFuncao[fn] = { total: 0, ocupadas: 0, abertas: 0 }
    }
    mapaPorFuncao[fn].total += 1
    if (
      v.profissional_ocupante_id ||
      v.nome_ocupante ||
      v.status === 'PREENCHIDA' ||
      v.status === 'OCUPADA'
    ) {
      mapaPorFuncao[fn].ocupadas += 1
    } else {
      mapaPorFuncao[fn].abertas += 1
    }
  }

  const porFuncao: ResumoVagasPorFuncao[] = Object.entries(mapaPorFuncao).map(([funcao, d]) => ({
    funcao,
    total: d.total,
    ocupadas: d.ocupadas,
    abertas: d.abertas,
  }))

  return {
    anoOrigem,
    unidadeId,
    total,
    totalVagas: total,
    abertas,
    ocupadas,
    excedentes,
    funcoesDistintas: Object.keys(mapaPorFuncao),
    porFuncao,
    amostraVagas: vagas.slice(0, 10),
  }
}

/** Migra vagas de um ano para outro, com retorno compatível com Vagas.tsx. */
export async function migrarVagasAnoLetivo(
  params: MigracaoAnoLetivoParams,
): Promise<MigracaoAnoLetivoResultado> {
  const usuario = await getUsuarioAtualParaAuditoria()

  let query = supabase.from(TABELA).select('*').eq('ano_letivo', params.anoOrigem)
  if (params.unidadeEscolarId && isUuidValido(params.unidadeEscolarId)) {
    query = query.eq('unidade_escolar_id', params.unidadeEscolarId)
  }
  const { data: origem, error } = await query
  if (error) throw error

  let escolaNome = 'Todas as Unidades'
  if (params.unidadeEscolarId) {
    const { data: esc } = await (supabase as any)
      .from('unidades_escolares')
      .select('nome')
      .eq('id', params.unidadeEscolarId)
      .maybeSingle()
    if (esc?.nome) escolaNome = esc.nome
  }

  const listaOrigem = (origem || []) as any[]
  let copiadas = 0

  for (const vaga of listaOrigem) {
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

    const { error: insErr } = await supabase.from(TABELA).insert(payload as any)
    if (insErr) throw insErr
    copiadas += 1
  }

  let totalDestinoFinal = copiadas
  if (params.unidadeEscolarId) {
    totalDestinoFinal = await contarVagasAnoUnidade(params.anoDestino, params.unidadeEscolarId)
  }

  await registrarAuditoria({
    usuario_nome: params.usuarioNome || usuario?.nome || 'Sistema',
    usuario_email: params.usuarioEmail || usuario?.email || '',
    entidade: 'Vaga',
    acao: 'Criação',
    descricao: `Migração de vagas de ${params.anoOrigem} para ${params.anoDestino} (${escolaNome}): ${copiadas} vaga(s) copiada(s) como ABERTA.`,
    detalhes: {
      ano_origem: params.anoOrigem,
      ano_destino: params.anoDestino,
      unidade_id: params.unidadeEscolarId ?? 'todas',
      copiadas,
      totalDestinoFinal,
    },
  })

  return {
    escolaNome,
    migradasCriadas: copiadas,
    anoOrigem: params.anoOrigem,
    anoDestino: params.anoDestino,
    totalDestinoFinal,
    copiadas,
    ignoradasOcupadas: 0,
    totalOrigem: listaOrigem.length,
  }
}

export async function migrarVagasEntreAnos(
  params: MigracaoAnoLetivoParams,
): Promise<MigracaoAnoLetivoResultado> {
  return migrarVagasAnoLetivo(params)
}

export type { VagaReal, StatusVagaReal, PeriodoEscola }
