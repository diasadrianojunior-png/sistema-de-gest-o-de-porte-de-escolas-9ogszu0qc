import { supabase } from '@/lib/supabase/client'
import { CareVaga, CareStatusVaga, CrhConfiguracao, Turma } from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'

const db = supabase as any

export interface PrevisaoVagasConfiguracao {
  crh: CrhConfiguracao
  criterio: 'Por Unidade' | 'Por Turma' | 'Por Período'
  quantidadeBase: number
  multiplicador: number
  totalPrevisto: number
  vagasExistentes: number
  vagasACriar: number
  diferencaNegativa: number
  detalheCalculo: string
}

export interface PrevisaoGeracaoResult {
  unidadeId: string
  anoLetivo: number
  totalTurmasUnidade: number
  configuracoesValidas: CrhConfiguracao[]
  itensPrevisao: PrevisaoVagasConfiguracao[]
  totalVagasPrevistas: number
  totalVagasExistentes: number
  totalVagasACriar: number
  totalVagasExcedentesOuReduzidas: number
}

export interface ResultadoGeracaoVagas {
  totalCriadas: number
  totalJaExistentes: number
  totalPrevistas: number
  vagasCriadas: CareVaga[]
  avisos: string[]
}

/**
 * Busca todas as vagas do CARE, opcionalmente filtradas por unidade e/ou ano letivo
 */
export const getCareVagas = async (filtros?: {
  unidade_escolar_id?: string
  ano_letivo?: number
}): Promise<CareVaga[]> => {
  let query = db
    .from('care_vagas')
    .select(`
      *,
      unidade_escolar:unidades_escolares(id, codigo, nome, tipo_atendimento, nivel_porte),
      cargo:cargos(id, codigo, nome),
      funcao:funcoes(id, codigo, nome),
      crh_configuracao:crh_configuracoes(id, codigo, ano_letivo, quantidade_profissionais, quantidade_por_funcao, por_turma, por_periodo, natureza_cargo)
    `)
    .order('ano_letivo', { ascending: false })
    .order('codigo', { ascending: true })

  if (filtros?.unidade_escolar_id) {
    query = query.eq('unidade_escolar_id', filtros.unidade_escolar_id)
  }

  if (filtros?.ano_letivo) {
    query = query.eq('ano_letivo', Number(filtros.ano_letivo))
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao buscar vagas do CARE:', error)
    throw error
  }

  return (data || []) as CareVaga[]
}

/**
 * Calcula a previsão de geração de vagas a partir do CRH para uma Unidade e Ano Letivo específicos
 */
export const calcularPrevisaoGeracao = async (
  unidadeId: string,
  anoLetivo: number,
): Promise<PrevisaoGeracaoResult> => {
  if (!unidadeId || !anoLetivo) {
    throw new Error('Unidade escolar e ano letivo são obrigatórios para calcular a previsão.')
  }

  // 1. Buscar configurações CRH da unidade e ano
  const { data: crhList, error: errCrh } = await db
    .from('crh_configuracoes')
    .select(`
      *,
      unidade_escolar:unidades_escolares(id, codigo, nome, tipo_atendimento, nivel_porte),
      cargo:cargos(id, codigo, nome),
      funcao:funcoes(id, codigo, nome)
    `)
    .eq('unidade_escolar_id', unidadeId)
    .eq('ano_letivo', Number(anoLetivo))
    .order('codigo', { ascending: true })

  if (errCrh) {
    console.error('Erro ao carregar configurações do CRH:', errCrh)
    throw errCrh
  }

  const crhs: CrhConfiguracao[] = (crhList || []).map((row: any) => ({
    ...row,
    unidade_escolar: row.unidade_escolar,
    cargo: row.cargo,
    funcao: row.funcao,
  }))

  // 2. Buscar turmas da unidade escolar no ano letivo correspondente
  // Nota: considera turmas vinculadas a esta unidade no mesmo ano letivo
  const { data: turmasList, error: errTurmas } = await db
    .from('turmas')
    .select('id, nome, ano_letivo, unidade_escolar_id')
    .eq('unidade_escolar_id', unidadeId)
    .eq('ano_letivo', Number(anoLetivo))

  if (errTurmas) {
    console.error('Erro ao buscar turmas da unidade:', errTurmas)
    throw errTurmas
  }

  const qtdTurmas = (turmasList || []).length

  // 3. Buscar vagas já geradas para essa unidade e ano
  const { data: vagasExistentesList, error: errVagas } = await db
    .from('care_vagas')
    .select('id, crh_configuracao_id, numero_sequencial_vaga, status')
    .eq('unidade_escolar_id', unidadeId)
    .eq('ano_letivo', Number(anoLetivo))

  if (errVagas) {
    console.error('Erro ao buscar vagas existentes:', errVagas)
    throw errVagas
  }

  const mapaVagasPorCrh = new Map<string, number>()
  ;(vagasExistentesList || []).forEach((v: any) => {
    const atual = mapaVagasPorCrh.get(v.crh_configuracao_id) || 0
    mapaVagasPorCrh.set(v.crh_configuracao_id, atual + 1)
  })

  // 4. Calcular previsão item a item
  const itensPrevisao: PrevisaoVagasConfiguracao[] = crhs.map((c) => {
    // Quantidade configurada no CRH (respeita quantidade_profissionais ou quantidade_por_funcao)
    const base = Number(c.quantidade_profissionais) || Number(c.quantidade_por_funcao) || 1

    let criterio: 'Por Unidade' | 'Por Turma' | 'Por Período' = 'Por Unidade'
    let multiplicador = 1
    let detalheCalculo = ''

    if (c.por_turma === 'Sim') {
      criterio = 'Por Turma'
      multiplicador = qtdTurmas
      detalheCalculo = `${base} profissional(is) × ${qtdTurmas} turma(s) vinculada(s) = ${base * qtdTurmas}`
    } else if (c.por_periodo === 'Sim') {
      criterio = 'Por Período'
      multiplicador = 1
      detalheCalculo = `${base} profissional(is) (dimensionamento por período: quantidade definida na regra CRH)`
    } else {
      criterio = 'Por Unidade'
      multiplicador = 1
      detalheCalculo = `${base} profissional(is) por unidade escolar`
    }

    const totalPrevisto = base * multiplicador
    const existentes = mapaVagasPorCrh.get(c.id) || 0
    const vagasACriar = Math.max(0, totalPrevisto - existentes)
    const diferencaNegativa = existentes > totalPrevisto ? existentes - totalPrevisto : 0

    return {
      crh: c,
      criterio,
      quantidadeBase: base,
      multiplicador,
      totalPrevisto,
      vagasExistentes: existentes,
      vagasACriar,
      diferencaNegativa,
      detalheCalculo,
    }
  })

  const totalVagasPrevistas = itensPrevisao.reduce((acc, it) => acc + it.totalPrevisto, 0)
  const totalVagasExistentes = (vagasExistentesList || []).length
  const totalVagasACriar = itensPrevisao.reduce((acc, it) => acc + it.vagasACriar, 0)
  const totalVagasExcedentesOuReduzidas = itensPrevisao.reduce(
    (acc, it) => acc + it.diferencaNegativa,
    0,
  )

  return {
    unidadeId,
    anoLetivo,
    totalTurmasUnidade: qtdTurmas,
    configuracoesValidas: crhs,
    itensPrevisao,
    totalVagasPrevistas,
    totalVagasExistentes,
    totalVagasACriar,
    totalVagasExcedentesOuReduzidas,
  }
}

/**
 * Executa a Geração Automática das vagas previstas no CARE a partir do CRH.
 * Regras:
 * - Idempotente: não duplica registros já existentes.
 * - Cria somente as vagas faltantes (sequenciais a partir das existentes).
 * - Todas as vagas geradas nascem com status "Preenchida".
 * - Vagas já existentes NUNCA são excluídas automaticamente se o CRH diminuir a quantidade.
 * - Grava auditoria detalhada com filtro próprio "Cargos e Funções (CARE)".
 */
export const gerarVagasCare = async (
  unidadeId: string,
  anoLetivo: number,
  nomeUnidade?: string,
): Promise<ResultadoGeracaoVagas> => {
  const previsao = await calcularPrevisaoGeracao(unidadeId, anoLetivo)

  if (previsao.configuracoesValidas.length === 0) {
    throw new Error(
      `Nenhuma configuração de RH (CRH) encontrada para a unidade escolar no ano letivo ${anoLetivo}. Cadastre as regras no CRH antes de gerar as vagas.`,
    )
  }

  const avisos: string[] = []

  // Alerta de turmas caso haja regras dimensionadas por turma com 0 turmas cadastradas
  const temRegraPorTurma = previsao.itensPrevisao.some((it) => it.criterio === 'Por Turma')
  if (temRegraPorTurma && previsao.totalTurmasUnidade === 0) {
    avisos.push(
      'A unidade não possui turmas cadastradas para este ano letivo. Cargos configurados "Por Turma" resultaram em 0 vagas.',
    )
  }

  // Alerta se houver redução de quantidade no CRH
  if (previsao.totalVagasExcedentesOuReduzidas > 0) {
    avisos.push(
      `Identificadas ${previsao.totalVagasExcedentesOuReduzidas} vaga(s) com quantidade prevista menor do que as já existentes no CARE. Conforme as regras de governança, nenhuma vaga existente foi excluída. Ajuste manual recomendado se necessário.`,
    )
  }

  // Se não há vagas novas a criar
  if (previsao.totalVagasACriar === 0) {
    return {
      totalCriadas: 0,
      totalJaExistentes: previsao.totalVagasExistentes,
      totalPrevistas: previsao.totalVagasPrevistas,
      vagasCriadas: [],
      avisos,
    }
  }

  // Para cada item de previsão, gerar as vagas faltantes individualmente
  const linhasParaInserir: any[] = []

  for (const item of previsao.itensPrevisao) {
    if (item.vagasACriar <= 0) continue

    const inicioSeq = item.vagasExistentes + 1
    const fimSeq = item.totalPrevisto

    for (let seq = inicioSeq; seq <= fimSeq; seq++) {
      linhasParaInserir.push({
        unidade_escolar_id: unidadeId,
        ano_letivo: anoLetivo,
        crh_configuracao_id: item.crh.id,
        crh_codigo: item.crh.codigo,
        cargo_id: item.crh.cargo_id,
        funcao_id: item.crh.funcao_id,
        numero_sequencial_vaga: seq,
        quantidade_referencia: item.quantidadeBase,
        criterio_dimensionamento: item.criterio,
        natureza_cargo: item.crh.natureza_cargo || 'Fixo',
        status: 'Preenchida' as CareStatusVaga, // TODAS nascem Preenchida conforme regra
      })
    }
  }

  if (linhasParaInserir.length === 0) {
    return {
      totalCriadas: 0,
      totalJaExistentes: previsao.totalVagasExistentes,
      totalPrevistas: previsao.totalVagasPrevistas,
      vagasCriadas: [],
      avisos,
    }
  }

  // Inserir em lotes seguros
  const { data: inseridas, error: errInsert } = await db
    .from('care_vagas')
    .insert(linhasParaInserir).select(`
      *,
      unidade_escolar:unidades_escolares(id, codigo, nome),
      cargo:cargos(id, codigo, nome),
      funcao:funcoes(id, codigo, nome)
    `)

  if (errInsert) {
    console.error('Erro ao inserir vagas geradas no CARE:', errInsert)
    throw new Error(
      `Falha na geração das vagas: ${errInsert.message || 'Erro ao gravar registros no banco de dados.'}`,
    )
  }

  const vagasGeradas = (inseridas || []) as CareVaga[]

  // Registrar na Auditoria
  const codigos = vagasGeradas.map((v) => v.codigo).filter(Boolean)
  const resumoCodigos =
    codigos.length > 5
      ? `${codigos.slice(0, 5).join(', ')} ... (+${codigos.length - 5} vagas)`
      : codigos.join(', ')

  await registrarAuditoria({
    entidade: 'Cargos e Funções (CARE)',
    acao: 'Criação',
    registro_codigo: vagasGeradas[0]?.codigo || null,
    descricao: `Geração automática de ${vagasGeradas.length} vaga(s) para a unidade "${nomeUnidade || unidadeId}" (Ano Letivo: ${anoLetivo}) a partir do CRH. Vagas geradas: ${resumoCodigos}. Todas inicializadas com status "Preenchida".`,
    detalhes: {
      unidade_escolar_id: unidadeId,
      unidade_nome: nomeUnidade,
      ano_letivo: anoLetivo,
      total_criadas: vagasGeradas.length,
      total_ja_existentes: previsao.totalVagasExistentes,
      total_previstas: previsao.totalVagasPrevistas,
      vagas_codigos: codigos,
      regras_crh: previsao.itensPrevisao.map((i) => ({
        crh_codigo: i.crh.codigo,
        cargo: i.crh.cargo?.nome,
        funcao: i.crh.funcao?.nome,
        criterio: i.criterio,
        total_previsto: i.totalPrevisto,
        criadas_nesta_execucao: i.vagasACriar,
      })),
      avisos,
    },
  })

  return {
    totalCriadas: vagasGeradas.length,
    totalJaExistentes: previsao.totalVagasExistentes,
    totalPrevistas: previsao.totalVagasPrevistas,
    vagasCriadas: vagasGeradas,
    avisos,
  }
}

/**
 * Atualiza individualmente o status de uma vaga no CARE ('Aberta' ou 'Preenchida')
 */
export const updateCareVagaStatus = async (
  vagaId: string,
  novoStatus: CareStatusVaga,
): Promise<CareVaga> => {
  if (novoStatus !== 'Aberta' && novoStatus !== 'Preenchida') {
    throw new Error('Status inválido. Escolha entre "Aberta" ou "Preenchida".')
  }

  // Buscar estado anterior para auditoria
  const { data: anterior } = await db
    .from('care_vagas')
    .select(`
      *,
      unidade_escolar:unidades_escolares(nome),
      cargo:cargos(nome),
      funcao:funcoes(nome)
    `)
    .eq('id', vagaId)
    .maybeSingle()

  const { data, error } = await db
    .from('care_vagas')
    .update({
      status: novoStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vagaId)
    .select(`
      *,
      unidade_escolar:unidades_escolares(id, codigo, nome, tipo_atendimento, nivel_porte),
      cargo:cargos(id, codigo, nome),
      funcao:funcoes(id, codigo, nome),
      crh_configuracao:crh_configuracoes(id, codigo, ano_letivo, quantidade_profissionais, quantidade_por_funcao)
    `)
    .single()

  if (error) {
    console.error('Erro ao atualizar status da vaga:', error)
    throw error
  }

  const updated = data as CareVaga

  await registrarAuditoria({
    entidade: 'Cargos e Funções (CARE)',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Alteração de status da vaga "${updated.codigo}" (${updated.cargo?.nome || 'Cargo'} - ${updated.funcao?.nome || 'Função'}): de "${anterior?.status || '-'}" para "${novoStatus}".`,
    detalhes: {
      vaga_id: vagaId,
      codigo: updated.codigo,
      status_anterior: anterior?.status,
      novo_status: novoStatus,
      cargo: updated.cargo?.nome,
      funcao: updated.funcao?.nome,
      unidade: updated.unidade_escolar?.nome,
      ano_letivo: updated.ano_letivo,
    },
  })

  return updated
}
