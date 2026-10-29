import { supabase } from '@/lib/supabase/client'
import { PorteEscolaAno, UnidadeEscolar } from '@/types/gestao-escolar'
import {
  buscarFaixasNivelPorTipoAtendimento,
  calcularNivelPorQtdAlunos,
  NivelFaixaFormatada,
} from './faixas-nivel-unidade'
import { registrarAuditoria } from './auditoria'

const db = supabase as any

export interface SalvarPorteEscolaInput {
  unidade_escolar_id: string
  ano_letivo: number
  quantidade_alunos: number
  nivel_faixa: string
  nivel_sugerido?: string | null
  justificativa_mudanca?: string | null
}

export interface CalculoPorteSugestao {
  tipo_atendimento: string
  configuracao_codigo: string | null
  faixas: NivelFaixaFormatada[]
  nivelSugerido: NivelFaixaFormatada | null
  rotuloSugerido: string | null
}

/**
 * Calcula a sugestão automática de nível/faixa para uma unidade escolar,
 * considerando o ano letivo e a quantidade de alunos informada,
 * usando a regra do módulo "Configuração de Vagas por Porte":
 * VIGENTE do ano, senão a mais recente do ano, senão a mais recente global.
 */
export async function calcularNivelSugeridoParaUnidade(
  unidadeOuTipo: string | { tipo_atendimento?: string },
  anoLetivo: number,
  quantidadeAlunos: number,
): Promise<CalculoPorteSugestao> {
  let tipoAtendimento =
    typeof unidadeOuTipo === 'string' ? unidadeOuTipo : unidadeOuTipo.tipo_atendimento || ''

  // Se for UUID de unidade, busca o tipo de atendimento no banco
  if (
    typeof unidadeOuTipo === 'string' &&
    unidadeOuTipo.length === 36 &&
    unidadeOuTipo.includes('-')
  ) {
    const { data: unid } = await db
      .from('unidades_escolares')
      .select('tipo_atendimento')
      .eq('id', unidadeOuTipo)
      .maybeSingle()
    if (unid?.tipo_atendimento) {
      tipoAtendimento = unid.tipo_atendimento
    }
  }

  if (!tipoAtendimento) {
    return {
      tipo_atendimento: '',
      configuracao_codigo: null,
      faixas: [],
      nivelSugerido: null,
      rotuloSugerido: null,
    }
  }

  const configuracaoComFaixas = await buscarFaixasNivelPorTipoAtendimento(
    tipoAtendimento,
    anoLetivo,
  )
  if (!configuracaoComFaixas || configuracaoComFaixas.niveis.length === 0) {
    return {
      tipo_atendimento: tipoAtendimento,
      configuracao_codigo: null,
      faixas: [],
      nivelSugerido: null,
      rotuloSugerido: null,
    }
  }

  const nivelSugerido = calcularNivelPorQtdAlunos(
    configuracaoComFaixas.niveis,
    Number(quantidadeAlunos) || 0,
  )

  return {
    tipo_atendimento: tipoAtendimento,
    configuracao_codigo: configuracaoComFaixas.configuracao?.codigo || null,
    faixas: configuracaoComFaixas.niveis,
    nivelSugerido,
    rotuloSugerido: nivelSugerido ? nivelSugerido.rotulo : null,
  }
}

/**
 * Lista todos os registros de Porte da Escola por Ano Letivo,
 * ordenados por ano letivo desc e código asc.
 */
export async function getPortesEscolaAno(anoLetivoFiltro?: number): Promise<PorteEscolaAno[]> {
  let query = db
    .from('porte_escola_ano')
    .select(`
      *,
      unidade_escolar:unidades_escolares(
        id, codigo, nome, tipo_atendimento, localizacao, cep, logradouro, numero, bairro, cidade, estado_uf, ativo
      )
    `)
    .order('ano_letivo', { ascending: false })
    .order('codigo', { ascending: true })

  if (anoLetivoFiltro) {
    query = query.eq('ano_letivo', anoLetivoFiltro)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao listar portes da escola por ano letivo:', error)
    throw error
  }

  return (data as PorteEscolaAno[]) || []
}

/**
 * Busca um registro por ID com a unidade escolar associada.
 */
export async function getPorteEscolaAnoPorId(id: string): Promise<PorteEscolaAno | null> {
  const { data, error } = await db
    .from('porte_escola_ano')
    .select(`
      *,
      unidade_escolar:unidades_escolares(
        id, codigo, nome, tipo_atendimento, localizacao, cep, logradouro, numero, bairro, cidade, estado_uf, ativo
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error(`Erro ao buscar porte da escola ID ${id}:`, error)
    throw error
  }

  return (data as PorteEscolaAno) || null
}

/**
 * Salva (cria ou atualiza) um registro de Porte da Escola por Ano Letivo,
 * validando regras de negócio e registrando auditoria completa.
 */
export async function salvarPorteEscolaAno(
  id: string | null | undefined,
  input: SalvarPorteEscolaInput,
): Promise<PorteEscolaAno> {
  // 1. Validações básicas obrigatórias
  if (!input.unidade_escolar_id) {
    throw new Error('A "Unidade Escolar" é de preenchimento obrigatório.')
  }
  const ano = Number(input.ano_letivo)
  if (!ano || ano < 2020 || ano > 2040) {
    throw new Error('O "Ano Letivo" deve ser um ano válido entre 2020 e 2040.')
  }
  const qtdAlunos = Number(input.quantidade_alunos)
  if (isNaN(qtdAlunos) || qtdAlunos < 0) {
    throw new Error(
      'A "Quantidade de Alunos na Unidade Escolar no Ano Letivo" deve ser um número inteiro maior ou igual a zero.',
    )
  }
  if (!input.nivel_faixa || !input.nivel_faixa.trim()) {
    throw new Error('O "Nível / Faixa de Alunos" é de preenchimento obrigatório.')
  }

  // 2. Validação da regra de justificativa:
  // Se o nível escolhido diferir do nível padrão sugerido/calculado automaticamente,
  // a justificativa torna-se obrigatória.
  const nivelEscolhido = input.nivel_faixa.trim()
  const nivelSugerido = input.nivel_sugerido?.trim() || ''

  // Consideramos diferente se há um nível sugerido conhecido e ele não bate com o escolhido
  const ehDiferenteDoPadrao =
    nivelSugerido !== '' &&
    nivelEscolhido !== nivelSugerido &&
    !nivelEscolhido.toLowerCase().startsWith(nivelSugerido.toLowerCase()) &&
    !nivelSugerido.toLowerCase().startsWith(nivelEscolhido.toLowerCase())

  const justificativaLimpa = input.justificativa_mudanca?.trim() || null

  if (ehDiferenteDoPadrao && (!justificativaLimpa || justificativaLimpa.length < 3)) {
    throw new Error(
      'O porte selecionado é diferente do padrão calculado automaticamente. Preencha o campo "Justificativa para Mudança do Padrão de Porte" antes de salvar.',
    )
  }

  // 3. Validação de duplicidade (Unidade + Ano Letivo deve ser unique)
  let checkQuery = db
    .from('porte_escola_ano')
    .select('id, codigo')
    .eq('unidade_escolar_id', input.unidade_escolar_id)
    .eq('ano_letivo', ano)

  if (id) {
    checkQuery = checkQuery.neq('id', id)
  }

  const { data: duplicado } = await checkQuery.maybeSingle()
  if (duplicado) {
    throw new Error(
      `Já existe um registro de Porte da Escola cadastrado para esta Unidade Escolar no Ano Letivo ${ano} (Código: ${duplicado.codigo || 'PRT-XXXX'}). Não é permitida duplicidade de Unidade + Ano Letivo.`,
    )
  }

  // 4. Buscar registro anterior se for edição para auditoria
  let registroAnterior: any = null
  if (id) {
    const { data: anterior } = await db
      .from('porte_escola_ano')
      .select('*, unidade_escolar:unidades_escolares(id, codigo, nome)')
      .eq('id', id)
      .maybeSingle()
    registroAnterior = anterior
  }

  // Buscar dados da unidade escolar para o descritivo de auditoria
  const { data: unidadeData } = await db
    .from('unidades_escolares')
    .select('id, codigo, nome, tipo_atendimento')
    .eq('id', input.unidade_escolar_id)
    .maybeSingle()

  const nomeUnidade = unidadeData?.nome || 'Unidade'

  // Montar payload
  const payload = {
    unidade_escolar_id: input.unidade_escolar_id,
    ano_letivo: ano,
    quantidade_alunos: qtdAlunos,
    nivel_faixa: nivelEscolhido,
    nivel_sugerido: nivelSugerido || null,
    justificativa_mudanca: ehDiferenteDoPadrao ? justificativaLimpa : null,
    updated_at: new Date().toISOString(),
  }

  let salvo: PorteEscolaAno

  if (id) {
    const { data, error } = await db
      .from('porte_escola_ano')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        unidade_escolar:unidades_escolares(
          id, codigo, nome, tipo_atendimento, localizacao, cep, logradouro, numero, bairro, cidade, estado_uf, ativo
        )
      `)
      .single()

    if (error) {
      console.error('Erro ao atualizar porte da escola por ano letivo:', error)
      throw error
    }
    salvo = data as PorteEscolaAno

    // Registrar auditoria de edição
    await registrarAuditoria({
      entidade: 'Porte da Escola por Ano Letivo',
      acao: 'Edição',
      registro_codigo: salvo.codigo || null,
      descricao: `Edição do Porte da Escola "${nomeUnidade}" para o Ano Letivo ${ano} (Alunos: ${qtdAlunos}, Nível: ${nivelEscolhido}${
        ehDiferenteDoPadrao ? ' [Porte alterado manualmente]' : ''
      }).`,
      detalhes: {
        id: salvo.id,
        unidade_escolar_id: salvo.unidade_escolar_id,
        unidade_nome: nomeUnidade,
        ano_letivo: ano,
        quantidade_alunos: qtdAlunos,
        nivel_faixa: nivelEscolhido,
        nivel_sugerido: nivelSugerido,
        porte_manual: ehDiferenteDoPadrao,
        justificativa_mudanca: salvo.justificativa_mudanca,
        valores_antigos: registroAnterior,
        valores_novos: salvo,
      },
    })
  } else {
    const { data, error } = await db
      .from('porte_escola_ano')
      .insert([payload])
      .select(`
        *,
        unidade_escolar:unidades_escolares(
          id, codigo, nome, tipo_atendimento, localizacao, cep, logradouro, numero, bairro, cidade, estado_uf, ativo
        )
      `)
      .single()

    if (error) {
      console.error('Erro ao cadastrar porte da escola por ano letivo:', error)
      throw error
    }
    salvo = data as PorteEscolaAno

    // Registrar auditoria de criação
    await registrarAuditoria({
      entidade: 'Porte da Escola por Ano Letivo',
      acao: 'Criação',
      registro_codigo: salvo.codigo || null,
      descricao: `Cadastro do Porte da Escola "${nomeUnidade}" para o Ano Letivo ${ano} (Alunos: ${qtdAlunos}, Nível: ${nivelEscolhido}${
        ehDiferenteDoPadrao ? ' [Porte manual com justificativa]' : ''
      }).`,
      detalhes: {
        id: salvo.id,
        codigo: salvo.codigo,
        unidade_escolar_id: salvo.unidade_escolar_id,
        unidade_nome: nomeUnidade,
        ano_letivo: ano,
        quantidade_alunos: qtdAlunos,
        nivel_faixa: nivelEscolhido,
        nivel_sugerido: nivelSugerido,
        porte_manual: ehDiferenteDoPadrao,
        justificativa_mudanca: salvo.justificativa_mudanca,
        registro: salvo,
      },
    })
  }

  // Sincronizar quantidade de alunos com a tabela unidade_escolar_ano para manter harmonia nos módulos
  try {
    const { data: ueaExistente } = await db
      .from('unidade_escolar_ano')
      .select('*')
      .eq('unidade_escolar_id', input.unidade_escolar_id)
      .eq('ano_letivo', ano)
      .maybeSingle()

    const defaultPeriodos = unidadeData?.tipo_atendimento?.includes('40h')
      ? ['INTEGRAL']
      : ['MANHA', 'TARDE']

    await db.from('unidade_escolar_ano').upsert(
      {
        unidade_escolar_id: input.unidade_escolar_id,
        ano_letivo: ano,
        qtd_alunos: qtdAlunos,
        qtd_turmas: ueaExistente?.qtd_turmas ?? 0,
        periodos: ueaExistente?.periodos ?? defaultPeriodos,
        turmas_por_etapa: ueaExistente?.turmas_por_etapa ?? null,
        nivel_calculado: nivelEscolhido,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'unidade_escolar_id,ano_letivo' },
    )
  } catch (syncErr) {
    console.warn('Aviso: Falha ao sincronizar quantidade com unidade_escolar_ano:', syncErr)
  }

  return salvo
}

/**
 * Exclui um registro de Porte da Escola por Ano Letivo,
 * registrando auditoria completa.
 */
export async function deletePorteEscolaAno(id: string): Promise<void> {
  const { data: anterior } = await db
    .from('porte_escola_ano')
    .select('*, unidade_escolar:unidades_escolares(id, codigo, nome)')
    .eq('id', id)
    .maybeSingle()

  const { error } = await db.from('porte_escola_ano').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir porte da escola por ano letivo:', error)
    throw error
  }

  const nomeUnidade = anterior?.unidade_escolar?.nome || anterior?.unidade_escolar_id || 'Unidade'

  await registrarAuditoria({
    entidade: 'Porte da Escola por Ano Letivo',
    acao: 'Exclusão',
    registro_codigo: anterior?.codigo || null,
    descricao: `Exclusão do Porte da Escola "${nomeUnidade}" referente ao Ano Letivo ${anterior?.ano_letivo || '-'}.`,
    detalhes: {
      id,
      registro_anterior: anterior,
    },
  })
}
