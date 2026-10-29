import { supabase } from '@/lib/supabase/client'
import {
  ConfiguracaoRhCompleta,
  ConfiguracaoRhLinha,
  PeriodoEscola,
  StatusVagaReal,
  UnidadeEscolar,
  UnidadeEscolarAno,
  VagaReal,
} from '@/types/gestao-escolar'
import {
  calcularVagasPorNivel,
  ResultadoCalculoVagas,
  normalizarChaveEtapa,
} from './configuracao-rh-calculo'
import { getConfiguracaoRhCompleta } from './configuracao-rh'
import { registrarAuditoria } from './auditoria'

const db = supabase as any

// ==========================================
// SELEÇÃO DA CONFIGURAÇÃO ADEQUADA (Regra 1)
// "Ao gerar vagas para uma escola, use a configuração do tipo de atendimento da escola nesta ordem de prioridade:
// 1) a VIGENTE do ano letivo escolhido;
// 2) se não houver, a ÚLTIMA criada (mais recente) daquele tipo de atendimento.
// Mostre na tela qual configuração foi usada (tipo, ano, status, data) e grave o configuracao_rh_id em cada vaga gerada."
// ==========================================

export interface ResolucaoConfiguracaoRh {
  configuracao: ConfiguracaoRhCompleta
  criterio: 'VIGENTE_ANO' | 'MAIS_RECENTE'
  motivoTexto: string
}

export async function resolverConfiguracaoParaEscola(
  tipoAtendimento: string,
  anoLetivo: number,
): Promise<ResolucaoConfiguracaoRh> {
  // 1) Buscar VIGENTE do ano letivo
  const { data: vigentes, error: errVigente } = await db
    .from('configuracao_rh')
    .select('id, codigo, tipo_atendimento, ano_letivo, status, created_at')
    .eq('tipo_atendimento', tipoAtendimento)
    .eq('ano_letivo', anoLetivo)
    .eq('status', 'VIGENTE')
    .limit(1)

  if (!errVigente && vigentes && vigentes.length > 0) {
    const completa = await getConfiguracaoRhCompleta(vigentes[0].id)
    return {
      configuracao: completa,
      criterio: 'VIGENTE_ANO',
      motivoTexto: `Configuração VIGENTE do ano ${anoLetivo} (${completa.codigo || completa.id}).`,
    }
  }

  // 2) Se não houver, a ÚLTIMA criada (mais recente) daquele tipo de atendimento
  const { data: maisRecentes, error: errRecente } = await db
    .from('configuracao_rh')
    .select('id, codigo, tipo_atendimento, ano_letivo, status, created_at')
    .eq('tipo_atendimento', tipoAtendimento)
    .order('created_at', { ascending: false })
    .limit(1)

  if (errRecente || !maisRecentes || maisRecentes.length === 0) {
    throw new Error(
      `Nenhuma configuração de RH cadastrada para o tipo de atendimento "${tipoAtendimento}". Cadastre uma em Cadastros de Apoio > Configuração de Vagas por Nível antes de gerar vagas.`,
    )
  }

  const escolhida = maisRecentes[0]
  const completa = await getConfiguracaoRhCompleta(escolhida.id)
  return {
    configuracao: completa,
    criterio: 'MAIS_RECENTE',
    motivoTexto: `Sem configuração VIGENTE em ${anoLetivo}. Utilizada a configuração mais recente cadastrada (Ano ${completa.ano_letivo}, Status: ${completa.status}, criada em ${new Date(completa.created_at || '').toLocaleDateString('pt-BR')}).`,
  }
}

// ==========================================
// UNIDADE ESCOLAR ANO (Dados base do cálculo)
// ==========================================

export async function getUnidadeEscolarAno(
  unidadeEscolarId: string,
  anoLetivo: number,
): Promise<UnidadeEscolarAno | null> {
  const { data, error } = await db
    .from('unidade_escolar_ano')
    .select('*, unidade_escolar:unidades_escolares(*), configuracao_rh(*)')
    .eq('unidade_escolar_id', unidadeEscolarId)
    .eq('ano_letivo', anoLetivo)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar unidade_escolar_ano:', error)
    throw error
  }
  return (data as UnidadeEscolarAno) || null
}

export async function getUnidadesEscolaresAnoPorAno(
  anoLetivo: number,
): Promise<UnidadeEscolarAno[]> {
  const { data, error } = await db
    .from('unidade_escolar_ano')
    .select('*, unidade_escolar:unidades_escolares(*), configuracao_rh(*)')
    .eq('ano_letivo', anoLetivo)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Erro ao listar unidade_escolar_ano:', error)
    throw error
  }
  return (data as UnidadeEscolarAno[]) || []
}

export async function salvarUnidadeEscolarAno(
  registro: Partial<UnidadeEscolarAno> & {
    unidade_escolar_id: string
    ano_letivo: number
  },
): Promise<UnidadeEscolarAno> {
  const payload = {
    ...registro,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('unidade_escolar_ano')
    .upsert(payload, { onConflict: 'unidade_escolar_id,ano_letivo' })
    .select('*, unidade_escolar:unidades_escolares(*)')
    .single()

  if (error) {
    console.error('Erro ao salvar unidade_escolar_ano:', error)
    throw error
  }

  return data as UnidadeEscolarAno
}

// ==========================================
// CÁLCULO E PRÉVIA DA GERAÇÃO (Regra 3 & 5)
// ==========================================

export interface PreviaVagaLinha {
  linhaId: string
  funcao: string
  baseCalculo: string
  modalidade: 'FIXO' | 'ITINERANTE'
  diasSemana?: number | null
  quantidadeMatriz: number
  multiplicador: number
  quantidadeFinal: number
  periodoAtribuido?: PeriodoEscola | null
  cargosElegiveis: Array<{ cargoId: string; cargoNome: string; condicao: string }>
}

export interface PreviaItemIndividual {
  funcao: string
  linhaId: string
  numeroSequencial: number
  periodo?: PeriodoEscola | null
  modalidade: 'FIXO' | 'ITINERANTE'
  diasSemana?: number | null
  cargosElegiveis: Array<{ cargoId: string; cargoNome: string; condicao: string }>
}

export interface PreviaGeracaoResultado {
  escola: UnidadeEscolar
  anoLetivo: number
  unidadeAno: UnidadeEscolarAno
  configuracaoUsada: ConfiguracaoRhCompleta
  criterioConfiguracao: 'VIGENTE_ANO' | 'MAIS_RECENTE'
  motivoConfiguracao: string
  resultadoCalculo: ResultadoCalculoVagas
  nivelEncontradoCodigo: string
  nivelFaixaDescricao: string
  vagasLinhas: PreviaVagaLinha[]
  totalVagasCalculadas: number
  // Comparação com o banco existente (idempotência)
  vagasExistentes: VagaReal[]
  novasVagasCriar: PreviaItemIndividual[]
  abertasRemover: VagaReal[]
  ocupadasExcedentes: VagaReal[]
  ocupadasMantidas: VagaReal[]
  resumoTexto: string // Ex: "+30 novas" ou "+2 novas, -1 aberta removida, 1 excedente"
  bloqueadoPorFaltaDados?: {
    campo: string
    mensagem: string
  } | null
}

/**
 * Converte turmas_por_etapa para Record<string, number> normalizado
 */
export function normalizarTurmasPorEtapaDicionario(raw: any): Record<string, number> {
  if (!raw) return {}
  if (Array.isArray(raw)) {
    const res: Record<string, number> = {}
    for (const item of raw) {
      if (item && item.etapa) {
        res[item.etapa] = Number(item.quantidade) || 0
      }
    }
    return res
  }
  if (typeof raw === 'object') {
    const res: Record<string, number> = {}
    for (const [k, v] of Object.entries(raw)) {
      res[k] = Number(v) || 0
    }
    return res
  }
  return {}
}

/**
 * Gera os slots individuais que deveriam existir para uma dada linha calculada
 * respeitando as regras:
 * - POR_ESCOLA com quantidade 8 -> 8 registros
 * - POR_PERIODO com quantidade 1 e 2 períodos -> 2 registros (um MANHA, um TARDE)
 * - POR_TURMA com 14 turmas -> 14 registros
 * - quantidade 0 -> nenhum registro
 */
export function expandirSlotsIndividuais(
  linha: ConfiguracaoRhLinha,
  qtdMatriz: number,
  periodosEscola: PeriodoEscola[],
  totalTurmas: number,
  turmasEtapaCount: number,
  modalidade: 'FIXO' | 'ITINERANTE',
  diasSemana?: number | null,
): Array<{
  funcao: string
  linhaId: string
  numeroSequencial: number
  periodo?: PeriodoEscola | null
  modalidade: 'FIXO' | 'ITINERANTE'
  diasSemana?: number | null
  cargosElegiveis: Array<{ cargoId: string; cargoNome: string; condicao: string }>
}> {
  const slots: Array<{
    funcao: string
    linhaId: string
    numeroSequencial: number
    periodo?: PeriodoEscola | null
    modalidade: 'FIXO' | 'ITINERANTE'
    diasSemana?: number | null
    cargosElegiveis: Array<{ cargoId: string; cargoNome: string; condicao: string }>
    cargoIdPredefinido?: string | null
  }> = []

  const isCargo = linha.tipo_linha === 'CARGO' || (!linha.funcao_id && !!linha.cargo_id)
  const funcaoNome = isCargo ? linha.cargo?.nome || 'Cargo' : linha.funcao?.nome || 'Função'
  const cargoIdPredefinido = isCargo ? linha.cargo_id || null : null

  let cargosElegiveis: Array<{ cargoId: string; cargoNome: string; condicao: string }> = []
  if (isCargo && linha.cargo_id) {
    if (linha.cargos && linha.cargos.length > 0) {
      cargosElegiveis = linha.cargos.map((c) => ({
        cargoId: c.cargo_id,
        cargoNome: c.cargo?.nome || linha.cargo?.nome || 'Cargo',
        condicao: c.condicao || 'NENHUMA',
      }))
    } else {
      cargosElegiveis = [
        {
          cargoId: linha.cargo_id,
          cargoNome: linha.cargo?.nome || 'Cargo',
          condicao: 'NENHUMA',
        },
      ]
    }
  } else {
    cargosElegiveis = (linha.cargos || []).map((c) => ({
      cargoId: c.cargo_id,
      cargoNome: c.cargo?.nome || 'Cargo',
      condicao: c.condicao,
    }))
  }

  if (qtdMatriz <= 0) return slots

  let seq = 1

  switch (linha.base_calculo) {
    case 'POR_ESCOLA': {
      for (let i = 0; i < qtdMatriz; i++) {
        slots.push({
          funcao: funcaoNome,
          linhaId: linha.id,
          numeroSequencial: seq++,
          periodo: null,
          modalidade,
          diasSemana,
          cargosElegiveis,
          cargoIdPredefinido,
        })
      }
      break
    }

    case 'POR_PERIODO': {
      // Para cada período da escola, cria qtdMatriz vagas associadas a esse período
      const periodos = periodosEscola.length > 0 ? periodosEscola : ['MANHA' as PeriodoEscola]
      for (const p of periodos) {
        for (let i = 0; i < qtdMatriz; i++) {
          slots.push({
            funcao: funcaoNome,
            linhaId: linha.id,
            numeroSequencial: seq++,
            periodo: p,
            modalidade,
            diasSemana,
            cargosElegiveis,
            cargoIdPredefinido,
          })
        }
      }
      break
    }

    case 'POR_TURMA': {
      const total = qtdMatriz * totalTurmas
      for (let i = 0; i < total; i++) {
        slots.push({
          funcao: funcaoNome,
          linhaId: linha.id,
          numeroSequencial: seq++,
          periodo: null,
          modalidade,
          diasSemana,
          cargosElegiveis,
          cargoIdPredefinido,
        })
      }
      break
    }

    case 'POR_TURMA_ETAPA': {
      const total = qtdMatriz * turmasEtapaCount
      for (let i = 0; i < total; i++) {
        slots.push({
          funcao: funcaoNome,
          linhaId: linha.id,
          numeroSequencial: seq++,
          periodo: null,
          modalidade,
          diasSemana,
          cargosElegiveis,
          cargoIdPredefinido,
        })
      }
      break
    }

    default: {
      for (let i = 0; i < qtdMatriz; i++) {
        slots.push({
          funcao: funcaoNome,
          linhaId: linha.id,
          numeroSequencial: seq++,
          periodo: null,
          modalidade,
          diasSemana,
          cargosElegiveis,
          cargoIdPredefinido,
        })
      }
    }
  }

  return slots
}

/**
 * Calcula a prévia completa de geração de vagas para uma unidade escolar em um ano letivo,
 * comparando o resultado com as vagas já existentes para garantir idempotência estrita.
 */
export async function calcularPreviaGeracao(
  unidadeEscolarId: string,
  anoLetivo: number,
  dadosEscolaAnoOverride?: Partial<UnidadeEscolarAno>,
): Promise<PreviaGeracaoResultado> {
  // 1. Carregar escola
  const { data: escolaData, error: errEscola } = await db
    .from('unidades_escolares')
    .select('*')
    .eq('id', unidadeEscolarId)
    .single()

  if (errEscola || !escolaData) {
    throw new Error('Unidade escolar não encontrada.')
  }
  const escola = escolaData as UnidadeEscolar

  // 2. Carregar turmas cadastradas para a unidade e ano letivo (com etapa)
  const { data: turmasCadastradas, error: errTurmas } = await db
    .from('turmas')
    .select('id, nome, etapa_id, etapa:etapas(id, codigo, nome)')
    .eq('unidade_escolar_id', unidadeEscolarId)
    .eq('ano_letivo', anoLetivo)

  if (errTurmas) {
    console.error('Erro ao consultar turmas da unidade:', errTurmas)
  }

  const turmasList = (turmasCadastradas as any[]) || []
  const contagemTurmasCadastradas = turmasList.length

  // Montar turmas_por_etapa a partir das turmas vinculadas e suas etapas
  const contagemPorEtapaCalculada: Record<string, number> = {}
  for (const t of turmasList) {
    const nomeEtapa = t.etapa?.nome || 'OUTRAS'
    const chaveEtapa = normalizarChaveEtapa(nomeEtapa) || 'OUTRAS'
    contagemPorEtapaCalculada[chaveEtapa] = (contagemPorEtapaCalculada[chaveEtapa] || 0) + 1
  }

  // 3. Carregar unidade_escolar_ano existente
  let unidadeAno = await getUnidadeEscolarAno(unidadeEscolarId, anoLetivo)

  // Períodos padrão definidos pelo tipo de atendimento
  const defaultPeriodos: PeriodoEscola[] = escola.tipo_atendimento.includes('40h')
    ? ['INTEGRAL']
    : ['MANHA', 'TARDE']

  // Quantidade de alunos derivada:
  // Usa o valor já registrado em unidade_escolar_ano (se > 0) ou deriva da escola/nível
  const alunosDerivados =
    unidadeAno && unidadeAno.qtd_alunos > 0
      ? unidadeAno.qtd_alunos
      : escola.quantidade_alunos && escola.quantidade_alunos > 0
        ? escola.quantidade_alunos
        : 0

  // Quantidade de turmas derivada:
  // Usa a contagem real de turmas cadastradas para a unidade/ano letivo
  // Se não houver turmas na tabela 'turmas' mas houver no seed de unidade_escolar_ano, mantém fallback para compatibilidade
  const turmasDerivadas =
    contagemTurmasCadastradas > 0 ? contagemTurmasCadastradas : unidadeAno?.qtd_turmas || 0

  // Se a contagem real de turmas por etapa gerou valores, use-a; senão use a existente no banco
  const turmasPorEtapaDerivada =
    Object.keys(contagemPorEtapaCalculada).length > 0
      ? contagemPorEtapaCalculada
      : unidadeAno?.turmas_por_etapa || null

  const periodosDerivados =
    unidadeAno?.periodos && unidadeAno.periodos.length > 0
      ? (unidadeAno.periodos as PeriodoEscola[])
      : defaultPeriodos

  // Se o registro não existia ou se houve sincronização automática, salvar/atualizar
  if (
    !unidadeAno ||
    unidadeAno.qtd_turmas !== turmasDerivadas ||
    (!unidadeAno.qtd_alunos && alunosDerivados > 0)
  ) {
    try {
      unidadeAno = await salvarUnidadeEscolarAno({
        unidade_escolar_id: unidadeEscolarId,
        ano_letivo: anoLetivo,
        qtd_alunos: alunosDerivados,
        qtd_turmas: turmasDerivadas,
        periodos: periodosDerivados,
        turmas_por_etapa: turmasPorEtapaDerivada,
      })
    } catch (e) {
      console.warn('Não foi possível sincronizar unidade_escolar_ano automaticamente:', e)
      if (!unidadeAno) {
        unidadeAno = {
          id: '',
          unidade_escolar_id: unidadeEscolarId,
          ano_letivo: anoLetivo,
          qtd_alunos: alunosDerivados,
          qtd_turmas: turmasDerivadas,
          periodos: periodosDerivados,
          turmas_por_etapa: turmasPorEtapaDerivada,
        }
      }
    }
  }

  if (dadosEscolaAnoOverride) {
    unidadeAno = {
      ...unidadeAno,
      ...dadosEscolaAnoOverride,
      periodos: dadosEscolaAnoOverride.periodos || unidadeAno.periodos,
    }
  }

  // 3. Resolver configuração de RH
  const resolucao = await resolverConfiguracaoParaEscola(escola.tipo_atendimento, anoLetivo)
  const config = resolucao.configuracao

  // 4. Validação de dados essenciais (Etapa 2 ajustada conforme solicitação do usuário)
  // "Se ainda assim faltar dado essencial (ex.: unidade sem nenhum aluno cadastrado ou sem turmas vinculadas),
  // mostre mensagem clara explicando o que falta e onde cadastrar (link/dica para o cadastro correspondente) — não abra o formulário embutido de alunos/turmas."
  const periodos = (
    unidadeAno.periodos && unidadeAno.periodos.length > 0 ? unidadeAno.periodos : defaultPeriodos
  ) as PeriodoEscola[]

  if (unidadeAno.qtd_alunos <= 0) {
    return {
      escola,
      anoLetivo,
      unidadeAno,
      configuracaoUsada: config,
      criterioConfiguracao: resolucao.criterio,
      motivoConfiguracao: resolucao.motivoTexto,
      resultadoCalculo: {
        nivelEncontrado: null,
        totalAlunos: 0,
        totalPeriodos: 0,
        totalTurmas: 0,
        vagas: [],
        passosMemoria: [],
        avisos: [],
      },
      nivelEncontradoCodigo: '',
      nivelFaixaDescricao: '',
      vagasLinhas: [],
      totalVagasCalculadas: 0,
      vagasExistentes: [],
      novasVagasCriar: [],
      abertasRemover: [],
      ocupadasExcedentes: [],
      ocupadasMantidas: [],
      resumoTexto: 'Alunos não cadastrados',
      bloqueadoPorFaltaDados: {
        campo: 'qtd_alunos',
        mensagem:
          'A unidade escolar não possui quantidade de alunos cadastrada para o ano letivo. Acesse o menu "Cadastros Mestres > Unidades Escolares" para atualizar o nível/porte de alunos da unidade.',
      },
    }
  }

  if (unidadeAno.qtd_turmas <= 0) {
    return {
      escola,
      anoLetivo,
      unidadeAno,
      configuracaoUsada: config,
      criterioConfiguracao: resolucao.criterio,
      motivoConfiguracao: resolucao.motivoTexto,
      resultadoCalculo: {
        nivelEncontrado: null,
        totalAlunos: unidadeAno.qtd_alunos,
        totalPeriodos: periodos.length,
        totalTurmas: 0,
        vagas: [],
        passosMemoria: [],
        avisos: [],
      },
      nivelEncontradoCodigo: '',
      nivelFaixaDescricao: '',
      vagasLinhas: [],
      totalVagasCalculadas: 0,
      vagasExistentes: [],
      novasVagasCriar: [],
      abertasRemover: [],
      ocupadasExcedentes: [],
      ocupadasMantidas: [],
      resumoTexto: 'Turmas não vinculadas',
      bloqueadoPorFaltaDados: {
        campo: 'qtd_turmas',
        mensagem:
          'A unidade escolar não possui turmas vinculadas para o ano letivo. Acesse o menu "Cadastros de Apoio > Turmas" e cadastre as turmas desta unidade escolar.',
      },
    }
  }

  // Verificar turmas por etapa (se houver linha POR_TURMA_ETAPA)
  const turmasPorEtapaMap = normalizarTurmasPorEtapaDicionario(unidadeAno.turmas_por_etapa)
  const temLinhaPorTurmaEtapa = (config.linhas || []).some(
    (l) => l.base_calculo === 'POR_TURMA_ETAPA',
  )
  const totalTurmasEtapaInformadas = Object.values(turmasPorEtapaMap).reduce(
    (acc, c) => acc + (Number(c) || 0),
    0,
  )

  // Se tem linha por turma etapa e não há turmas com etapa correspondente
  if (temLinhaPorTurmaEtapa && totalTurmasEtapaInformadas <= 0) {
    return {
      escola,
      anoLetivo,
      unidadeAno,
      configuracaoUsada: config,
      criterioConfiguracao: resolucao.criterio,
      motivoConfiguracao: resolucao.motivoTexto,
      resultadoCalculo: {
        nivelEncontrado: null,
        totalAlunos: unidadeAno.qtd_alunos,
        totalPeriodos: periodos.length,
        totalTurmas: unidadeAno.qtd_turmas,
        vagas: [],
        passosMemoria: [],
        avisos: [],
      },
      nivelEncontradoCodigo: '',
      nivelFaixaDescricao: '',
      vagasLinhas: [],
      totalVagasCalculadas: 0,
      vagasExistentes: [],
      novasVagasCriar: [],
      abertasRemover: [],
      ocupadasExcedentes: [],
      ocupadasMantidas: [],
      resumoTexto: 'Turmas sem etapa vinculada',
      bloqueadoPorFaltaDados: {
        campo: 'turmas_por_etapa',
        mensagem:
          'A configuração de RH requer cálculo por etapa, mas as turmas vinculadas à unidade não possuem a etapa correspondente informada. Acesse "Cadastros de Apoio > Turmas" e vincule as etapas adequadas.',
      },
    }
  }

  // Se não tem linha POR_TURMA_ETAPA ou se turmasPorEtapaMap não cobre todas as turmas,
  // garantir que calcularVagasPorNivel tenha o totalTurmas respeitado
  const turmasPorEtapaInput: Record<string, number> = { ...turmasPorEtapaMap }
  if (Object.keys(turmasPorEtapaInput).length === 0) {
    turmasPorEtapaInput['PADRAO'] = unidadeAno.qtd_turmas
  }

  // 5. Chamar o serviço calcularVagasPorNivel
  const calculo = calcularVagasPorNivel(
    config,
    unidadeAno.qtd_alunos,
    periodos.length,
    turmasPorEtapaInput,
  )

  if (!calculo.nivelEncontrado) {
    throw new Error(
      `Não foi possível enquadrar a unidade com ${unidadeAno.qtd_alunos} alunos na configuração "${config.tipo_atendimento}". Verifique as faixas de alunos cadastradas.`,
    )
  }

  const nivelFaixa =
    calculo.nivelEncontrado.max_alunos !== null && calculo.nivelEncontrado.max_alunos !== undefined
      ? `${calculo.nivelEncontrado.min_alunos} a ${calculo.nivelEncontrado.max_alunos} alunos`
      : `${calculo.nivelEncontrado.min_alunos} alunos ou mais`

  // 6. Expandir todos os slots ideais calculados por linha
  const slotsCalculados: PreviaItemIndividual[] = []
  const vagasLinhas: PreviaVagaLinha[] = []

  for (const v of calculo.vagas) {
    const linhaOrig = (config.linhas || []).find((l) => l.id === v.linhaId)
    if (!linhaOrig) continue

    // Contar turmas da etapa filtrada se for POR_TURMA_ETAPA
    let turmasEtapaCount = 0
    if (linhaOrig.base_calculo === 'POR_TURMA_ETAPA') {
      const filtros = (linhaOrig.etapas_filtro || []).map((e) =>
        e.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
      )
      for (const [etapaKey, qtd] of Object.entries(turmasPorEtapaMap)) {
        const norm = etapaKey.toUpperCase().replace(/[^A-Z0-9]/g, '_')
        if (filtros.some((f) => norm.includes(f) || f.includes(norm))) {
          turmasEtapaCount += Number(qtd) || 0
        }
      }
    }

    const slotsDaLinha = expandirSlotsIndividuais(
      linhaOrig,
      v.quantidadeMatriz,
      periodos,
      unidadeAno.qtd_turmas,
      turmasEtapaCount,
      v.modalidade,
      v.diasSemana,
    )

    slotsCalculados.push(...slotsDaLinha)

    vagasLinhas.push({
      linhaId: v.linhaId,
      funcao: v.funcaoNome,
      baseCalculo: v.baseCalculo,
      modalidade: v.modalidade,
      diasSemana: v.diasSemana,
      quantidadeMatriz: v.quantidadeMatriz,
      multiplicador: v.multiplicador,
      quantidadeFinal: v.quantidadeFinal,
      periodoAtribuido: slotsDaLinha[0]?.periodo || null,
      cargosElegiveis: v.cargosElegiveis,
    })
  }

  // 7. Buscar vagas já existentes no banco para a escola/ano (idempotência)
  const { data: vagasExistentesData, error: errVagasExistentes } = await db
    .from('vaga')
    .select('*, cargo:cargos(*), configuracao_rh(*), configuracao_rh_linha(*)')
    .eq('unidade_escolar_id', unidadeEscolarId)
    .eq('ano_letivo', anoLetivo)
    .order('numero_sequencial', { ascending: true })

  if (errVagasExistentes) {
    console.error('Erro ao buscar vagas existentes:', errVagasExistentes)
    throw errVagasExistentes
  }

  const vagasExistentes = (vagasExistentesData as VagaReal[]) || []

  // Agrupar vagas existentes por configuracao_rh_linha_id
  const mapaExistentesPorLinha = new Map<string, VagaReal[]>()
  for (const v of vagasExistentes) {
    const list = mapaExistentesPorLinha.get(v.configuracao_rh_linha_id) || []
    list.push(v)
    mapaExistentesPorLinha.set(v.configuracao_rh_linha_id, list)
  }

  // Agrupar slots calculados por linhaId
  const mapaCalculadosPorLinha = new Map<string, PreviaItemIndividual[]>()
  for (const s of slotsCalculados) {
    const list = mapaCalculadosPorLinha.get(s.linhaId) || []
    list.push(s)
    mapaCalculadosPorLinha.set(s.linhaId, list)
  }

  const novasVagasCriar: PreviaItemIndividual[] = []
  const abertasRemover: VagaReal[] = []
  const ocupadasExcedentes: VagaReal[] = []
  const ocupadasMantidas: VagaReal[] = []

  // Iterar sobre todas as linhas conhecidas (calculadas ou existentes)
  const todasLinhasIds = new Set<string>([
    ...Array.from(mapaCalculadosPorLinha.keys()),
    ...Array.from(mapaExistentesPorLinha.keys()),
  ])

  for (const linhaId of todasLinhasIds) {
    const slotsIdeal = mapaCalculadosPorLinha.get(linhaId) || []
    const existentes = mapaExistentesPorLinha.get(linhaId) || []

    const qtdIdeal = slotsIdeal.length
    const qtdExistente = existentes.length

    if (qtdExistente === 0) {
      // Linha totalmente nova: cria todos os slots calculados
      novasVagasCriar.push(...slotsIdeal)
    } else if (qtdIdeal === qtdExistente) {
      // Mesma quantidade: nenhuma nova, mantém todas. Se havia alguma ocupada, é mantida
      for (const v of existentes) {
        if (v.status === 'OCUPADA') {
          ocupadasMantidas.push(v)
        }
      }
    } else if (qtdIdeal > qtdExistente) {
      // Precisa de mais vagas: cria apenas as que faltam
      const faltam = qtdIdeal - qtdExistente
      // Sequenciais novos começam após o maior sequencial existente
      const maiorSeq = existentes.reduce((max, v) => Math.max(max, v.numero_sequencial || 0), 0)
      const slotsNovos = slotsIdeal.slice(qtdExistente).map((s, idx) => ({
        ...s,
        numeroSequencial: maiorSeq + idx + 1,
      }))
      novasVagasCriar.push(...slotsNovos)
      for (const v of existentes) {
        if (v.status === 'OCUPADA') ocupadasMantidas.push(v)
      }
    } else {
      // qtdIdeal < qtdExistente: redução de vagas
      // Regra 5 do usuário:
      // "nunca apagar vaga OCUPADA; vaga ABERTA a mais pode ser removida;
      // vaga OCUPADA a mais vira EXCEDENTE (base para remanejamento)."
      const vagasAbertas = existentes.filter((v) => v.status === 'ABERTA')
      const vagasOcupadas = existentes.filter(
        (v) => v.status === 'OCUPADA' || v.status === 'EXCEDENTE',
      )

      const diferencaReducao = qtdExistente - qtdIdeal

      // Remove prioritariamente as abertas
      let abertasParaRemoverCount = Math.min(diferencaReducao, vagasAbertas.length)
      const abertasParaRemover = vagasAbertas.slice(vagasAbertas.length - abertasParaRemoverCount)
      abertasRemover.push(...abertasParaRemover)

      // Se ainda sobrou excesso e eram vagas ocupadas, viram EXCEDENTE
      const excessoOcupado = diferencaReducao - abertasParaRemoverCount
      if (excessoOcupado > 0) {
        const excedentes = vagasOcupadas.slice(vagasOcupadas.length - excessoOcupado)
        ocupadasExcedentes.push(...excedentes)
        const mantidas = vagasOcupadas.slice(0, vagasOcupadas.length - excessoOcupado)
        ocupadasMantidas.push(...mantidas)
      } else {
        ocupadasMantidas.push(...vagasOcupadas)
      }
    }
  }

  // Resumo textual: "+N novas, −N abertas removidas, N excedentes"
  const partesResumo: string[] = []
  if (novasVagasCriar.length > 0) {
    partesResumo.push(`+${novasVagasCriar.length} novas`)
  }
  if (abertasRemover.length > 0) {
    partesResumo.push(`-${abertasRemover.length} abertas removidas`)
  }
  if (ocupadasExcedentes.length > 0) {
    partesResumo.push(`${ocupadasExcedentes.length} excedentes`)
  }
  if (partesResumo.length === 0) {
    partesResumo.push('Nenhuma alteração necessária (idempotente)')
  }

  const resumoTexto = partesResumo.join(', ')

  return {
    escola,
    anoLetivo,
    unidadeAno,
    configuracaoUsada: config,
    criterioConfiguracao: resolucao.criterio,
    motivoConfiguracao: resolucao.motivoTexto,
    resultadoCalculo: calculo,
    nivelEncontradoCodigo: calculo.nivelEncontrado.codigo_nivel,
    nivelFaixaDescricao: nivelFaixa,
    vagasLinhas,
    totalVagasCalculadas: slotsCalculados.length,
    vagasExistentes,
    novasVagasCriar,
    abertasRemover,
    ocupadasExcedentes,
    ocupadasMantidas,
    resumoTexto,
    bloqueadoPorFaltaDados: null,
  }
}

// ==========================================
// CONFIRMAR GERAÇÃO REAL DE VAGAS (Regra 3, 5 e 6)
// ==========================================

export interface ConfirmarGeracaoParams {
  unidadeEscolarId: string
  anoLetivo: number
  turmasPorEtapaAtualizadas?: Record<string, number> | null
  usuarioNome?: string
  usuarioEmail?: string
}

export interface ConfirmarGeracaoResultado {
  sucesso: boolean
  escolaNome: string
  anoLetivo: number
  nivelCodigo: string
  novasCriadas: number
  abertasRemovidas: number
  excedentesMarcadas: number
  totalVagasFinais: number
  configuracaoUsadaId: string
}

export async function confirmarGeracaoVagas(
  params: ConfirmarGeracaoParams,
): Promise<ConfirmarGeracaoResultado> {
  const { unidadeEscolarId, anoLetivo, turmasPorEtapaAtualizadas, usuarioNome, usuarioEmail } =
    params

  // Se veio turmasPorEtapa atualizado, atualizar antes unidade_escolar_ano
  if (turmasPorEtapaAtualizadas) {
    await db
      .from('unidade_escolar_ano')
      .update({
        turmas_por_etapa: turmasPorEtapaAtualizadas,
        updated_at: new Date().toISOString(),
      })
      .eq('unidade_escolar_id', unidadeEscolarId)
      .eq('ano_letivo', anoLetivo)
  }

  // Recalcular prévia com os dados mais recentes
  const previa = await calcularPreviaGeracao(unidadeEscolarId, anoLetivo)

  if (previa.bloqueadoPorFaltaDados) {
    throw new Error(previa.bloqueadoPorFaltaDados.mensagem)
  }

  // 1. Remover abertas em excesso
  if (previa.abertasRemover.length > 0) {
    const idsRemover = previa.abertasRemover.map((v) => v.id)
    const { error: errDel } = await db.from('vaga').delete().in('id', idsRemover)
    if (errDel) {
      console.error('Erro ao remover vagas abertas excedentes:', errDel)
      throw errDel
    }
  }

  // 2. Marcar vagas ocupadas a mais como EXCEDENTE
  if (previa.ocupadasExcedentes.length > 0) {
    const idsExcedentes = previa.ocupadasExcedentes.map((v) => v.id)
    const { error: errUpd } = await db
      .from('vaga')
      .update({
        status: 'EXCEDENTE',
        updated_at: new Date().toISOString(),
      })
      .in('id', idsExcedentes)
    if (errUpd) {
      console.error('Erro ao marcar vagas excedentes:', errUpd)
      throw errUpd
    }
  }

  // 3. Inserir novas vagas
  if (previa.novasVagasCriar.length > 0) {
    const rowsInsert = previa.novasVagasCriar.map((s) => ({
      unidade_escolar_id: unidadeEscolarId,
      ano_letivo: anoLetivo,
      configuracao_rh_id: previa.configuracaoUsada.id,
      configuracao_rh_linha_id: s.linhaId,
      funcao: s.funcao,
      numero_sequencial: s.numeroSequencial,
      periodo: s.periodo || null,
      modalidade: s.modalidade,
      dias_semana: s.diasSemana ?? null,
      cargo_id: (s as any).cargoIdPredefinido || null,
      servidor_id: null,
      nome_ocupante: null,
      status: 'ABERTA' as StatusVagaReal,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { error: errIns } = await db.from('vaga').insert(rowsInsert)
    if (errIns) {
      console.error('Erro ao inserir novas vagas:', errIns)
      throw errIns
    }
  }

  // 4. Atualizar registro em unidade_escolar_ano com nível calculado, config usada e data da geração
  await db
    .from('unidade_escolar_ano')
    .update({
      nivel_calculado: previa.nivelEncontradoCodigo,
      configuracao_rh_id: previa.configuracaoUsada.id,
      data_ultima_geracao: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('unidade_escolar_id', unidadeEscolarId)
    .eq('ano_letivo', anoLetivo)

  // 5. Total de vagas finais no banco
  const { count: totalFinal } = await db
    .from('vaga')
    .select('id', { count: 'exact', head: true })
    .eq('unidade_escolar_id', unidadeEscolarId)
    .eq('ano_letivo', anoLetivo)

  // 6. Auditoria completa
  await registrarAuditoria({
    entidade: 'Cadastro de Vagas',
    acao: 'Geração de Vagas',
    registro_codigo: previa.escola.codigo || null,
    descricao: `Geração de vagas para a unidade "${previa.escola.nome}" (Ano Letivo ${anoLetivo}). Nível identificado: ${previa.nivelEncontradoCodigo}. Resultado: ${previa.resumoTexto}. Configuração usada: ${previa.configuracaoUsada.codigo || previa.configuracaoUsada.id} (${previa.configuracaoUsada.tipo_atendimento}, Ano ${previa.configuracaoUsada.ano_letivo}, Status ${previa.configuracaoUsada.status}).`,
    detalhes: {
      escola_id: unidadeEscolarId,
      escola_nome: previa.escola.nome,
      ano_letivo: anoLetivo,
      nivel_calculado: previa.nivelEncontradoCodigo,
      configuracao_rh_id: previa.configuracaoUsada.id,
      criterio_configuracao: previa.criterioConfiguracao,
      novas_criadas: previa.novasVagasCriar.length,
      abertas_removidas: previa.abertasRemover.length,
      excedentes_marcadas: previa.ocupadasExcedentes.length,
      total_final: totalFinal || 0,
      usuario_solicitante: usuarioNome || 'Sistema',
      email_solicitante: usuarioEmail || 'sistema@local',
    },
  })

  return {
    sucesso: true,
    escolaNome: previa.escola.nome,
    anoLetivo,
    nivelCodigo: previa.nivelEncontradoCodigo,
    novasCriadas: previa.novasVagasCriar.length,
    abertasRemovidas: previa.abertasRemover.length,
    excedentesMarcadas: previa.ocupadasExcedentes.length,
    totalVagasFinais: totalFinal || 0,
    configuracaoUsadaId: previa.configuracaoUsada.id,
  }
}

// ==========================================
// CONSULTA, FILTROS E EDIÇÃO DE VAGAS (Regra 4)
// ==========================================

export interface FiltrosVagas {
  anoLetivo: number
  unidadeEscolarId?: string
  tipoAtendimento?: string
  nivel?: string
  funcao?: string
  cargoId?: string
  periodo?: string
  modalidade?: string
  status?: StatusVagaReal | 'TODAS'
  comOcupante?: 'TODAS' | 'COM' | 'SEM'
  buscaTexto?: string
}

export async function listarVagasCompletas(filtros: FiltrosVagas): Promise<VagaReal[]> {
  let query = db
    .from('vaga')
    .select(
      `
      *,
      unidade_escolar:unidades_escolares(*),
      cargo:cargos(*),
      turma:turmas(*),
      configuracao_rh:configuracao_rh(*),
      configuracao_rh_linha:configuracao_rh_linha(
        *,
        cargos:configuracao_rh_linha_cargo(*, cargo:cargos(*))
      )
    `,
    )
    .eq('ano_letivo', filtros.anoLetivo)

  if (filtros.unidadeEscolarId && filtros.unidadeEscolarId !== 'TODAS') {
    query = query.eq('unidade_escolar_id', filtros.unidadeEscolarId)
  }

  if (filtros.funcao && filtros.funcao !== 'TODAS') {
    query = query.eq('funcao', filtros.funcao)
  }

  if (filtros.cargoId && filtros.cargoId !== 'TODOS') {
    query = query.eq('cargo_id', filtros.cargoId)
  }

  if (filtros.periodo && filtros.periodo !== 'TODOS') {
    query = query.eq('periodo', filtros.periodo)
  }

  if (filtros.modalidade && filtros.modalidade !== 'TODAS') {
    query = query.eq('modalidade', filtros.modalidade)
  }

  if (filtros.status && filtros.status !== 'TODAS') {
    query = query.eq('status', filtros.status)
  }

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) {
    console.error('Erro ao listar vagas:', error)
    throw error
  }

  let lista = (data as VagaReal[]) || []

  // Filtros adicionais em memória (joins secundários ou condições de ocupante)
  if (filtros.tipoAtendimento && filtros.tipoAtendimento !== 'TODOS') {
    lista = lista.filter((v) => v.unidade_escolar?.tipo_atendimento === filtros.tipoAtendimento)
  }

  if (filtros.comOcupante && filtros.comOcupante !== 'TODAS') {
    if (filtros.comOcupante === 'COM') {
      lista = lista.filter((v) => Boolean(v.nome_ocupante && v.nome_ocupante.trim()))
    } else if (filtros.comOcupante === 'SEM') {
      lista = lista.filter((v) => !v.nome_ocupante || !v.nome_ocupante.trim())
    }
  }

  if (filtros.buscaTexto && filtros.buscaTexto.trim()) {
    const term = filtros.buscaTexto.toLowerCase()
    lista = lista.filter(
      (v) =>
        (v.codigo && v.codigo.toLowerCase().includes(term)) ||
        (v.funcao && v.funcao.toLowerCase().includes(term)) ||
        (v.unidade_escolar?.nome && v.unidade_escolar.nome.toLowerCase().includes(term)) ||
        (v.nome_ocupante && v.nome_ocupante.toLowerCase().includes(term)) ||
        (v.cargo?.nome && v.cargo.nome.toLowerCase().includes(term)),
    )
  }

  return lista
}

/**
 * Atualizar ocupante e cargo de uma vaga (Regra 4)
 * "Regra: com ocupante -> OCUPADA; sem ocupante -> ABERTA.
 * O combo de cargo mostra apenas os cargos permitidos na configuração para aquela função.
 * Se a condição for READAPTADO_COMPATIVEL_LAUDO ou AUTORIZACAO_SEMED, exigir marcação e observação."
 */
export interface EditarVagaInput {
  vagaId: string
  nomeOcupante?: string | null
  cargoId?: string | null
  observacao?: string | null
  turmaId?: string | null
}

export async function editarVaga(input: EditarVagaInput): Promise<VagaReal> {
  const { vagaId, nomeOcupante, cargoId, observacao, turmaId } = input

  // Buscar vaga atual para auditoria
  const { data: anteriorData } = await db
    .from('vaga')
    .select('*, cargo:cargos(*), unidade_escolar:unidades_escolares(*)')
    .eq('id', vagaId)
    .single()

  const anterior = anteriorData as VagaReal

  const temOcupante = Boolean(nomeOcupante && nomeOcupante.trim().length > 0)
  // Se tem ocupante -> OCUPADA (a não ser que já fosse EXCEDENTE, que continua com ocupante)
  let novoStatus: StatusVagaReal = temOcupante ? 'OCUPADA' : 'ABERTA'
  if (anterior?.status === 'EXCEDENTE' && temOcupante) {
    novoStatus = 'EXCEDENTE'
  }

  const payload: any = {
    nome_ocupante: temOcupante ? nomeOcupante!.trim() : null,
    cargo_id: cargoId || null,
    observacao: observacao || null,
    turma_id: turmaId || null,
    status: novoStatus,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('vaga')
    .update(payload)
    .eq('id', vagaId)
    .select('*, cargo:cargos(*), unidade_escolar:unidades_escolares(*)')
    .single()

  if (error) {
    console.error('Erro ao atualizar vaga:', error)
    throw error
  }

  const atualizada = data as VagaReal

  // Registrar auditoria
  await registrarAuditoria({
    entidade: 'Cadastro de Vagas',
    acao: 'Edição',
    registro_codigo: atualizada.codigo || null,
    descricao: `Vaga ${atualizada.codigo || vagaId} (${atualizada.funcao} - ${atualizada.unidade_escolar?.nome || ''}) atualizada: ocupante "${atualizada.nome_ocupante || 'Nenhum'}" (${atualizada.status}).`,
    detalhes: {
      vaga_id: vagaId,
      anterior: {
        ocupante: anterior?.nome_ocupante,
        cargo_id: anterior?.cargo_id,
        status: anterior?.status,
      },
      novo: {
        ocupante: atualizada.nome_ocupante,
        cargo_id: atualizada.cargo_id,
        status: atualizada.status,
      },
    },
  })

  return atualizada
}

/**
 * Liberar vaga (remover ocupante -> status volta para ABERTA)
 */
export async function liberarVaga(vagaId: string): Promise<VagaReal> {
  const { data: anteriorData } = await db
    .from('vaga')
    .select('*, cargo:cargos(*), unidade_escolar:unidades_escolares(*)')
    .eq('id', vagaId)
    .single()

  const anterior = anteriorData as VagaReal

  const payload = {
    nome_ocupante: null,
    cargo_id: null,
    status: 'ABERTA' as StatusVagaReal,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('vaga')
    .update(payload)
    .eq('id', vagaId)
    .select('*, cargo:cargos(*), unidade_escolar:unidades_escolares(*)')
    .single()

  if (error) {
    console.error('Erro ao liberar vaga:', error)
    throw error
  }

  const liberada = data as VagaReal

  await registrarAuditoria({
    entidade: 'Cadastro de Vagas',
    acao: 'Liberação de Vaga',
    registro_codigo: liberada.codigo || null,
    descricao: `Vaga ${liberada.codigo || vagaId} (${liberada.funcao} - ${liberada.unidade_escolar?.nome || ''}) liberada. Ocupante anterior "${anterior?.nome_ocupante || 'Desconhecido'}" removido. Status alterado para ABERTA.`,
    detalhes: {
      vaga_id: vagaId,
      ocupante_removido: anterior?.nome_ocupante,
      status_anterior: anterior?.status,
      status_novo: 'ABERTA',
    },
  })

  return liberada
}
