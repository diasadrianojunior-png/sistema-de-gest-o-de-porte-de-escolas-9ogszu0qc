import { supabase } from '@/lib/supabase/client'
import { CrhConfiguracao, NivelPorte } from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'

const db = supabase as any

export interface CreateCrhInput {
  ano_letivo: number
  unidade_escolar_id: string
  tipo_atendimento: string
  nivel_unidade: string
  cargo_id: string
  quantidade_profissionais: number
  por_turma: 'Sim' | 'Não'
  por_periodo: 'Sim' | 'Não'
  natureza_cargo: 'Fixo' | 'Itinerante'
  funcao_id: string
  quantidade_por_funcao: number
}

export interface UpdateCrhInput {
  ano_letivo: number
  unidade_escolar_id: string
  tipo_atendimento: string
  nivel_unidade: string
  cargo_id: string
  quantidade_profissionais: number
  por_turma: 'Sim' | 'Não'
  por_periodo: 'Sim' | 'Não'
  natureza_cargo: 'Fixo' | 'Itinerante'
  funcao_id: string
  quantidade_por_funcao: number
}

export interface SaveNivelPorteInput {
  id?: string
  tipo_atendimento: string
  nivel: string
  alunos_min: number
  alunos_max: number | null
  ordem: number
  descricao?: string | null
}

// ==========================================
// 1. SERVIÇOS DE NÍVEIS DE PORTE (REFERÊNCIA)
// ==========================================

export const getNiveisPorte = async (): Promise<NivelPorte[]> => {
  const { data, error } = await db
    .from('niveis_porte')
    .select('*')
    .order('tipo_atendimento', { ascending: true })
    .order('ordem', { ascending: true })

  if (error) {
    console.error('Erro ao buscar níveis de porte:', error)
    throw error
  }
  return (data as NivelPorte[]) || []
}

export const createNivelPorte = async (input: SaveNivelPorteInput): Promise<NivelPorte> => {
  const { data, error } = await db
    .from('niveis_porte')
    .insert([
      {
        tipo_atendimento: input.tipo_atendimento,
        nivel: input.nivel.trim(),
        alunos_min: Number(input.alunos_min),
        alunos_max:
          input.alunos_max === null ||
          input.alunos_max === undefined ||
          input.alunos_max === ('' as any)
            ? null
            : Number(input.alunos_max),
        ordem: Number(input.ordem),
        descricao: input.descricao ? input.descricao.trim() : null,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar nível de porte:', error)
    throw error
  }

  const created = data as NivelPorte

  await registrarAuditoria({
    entidade: 'Níveis de Porte',
    acao: 'Criação',
    registro_codigo: created.codigo || null,
    descricao: `Cadastro da faixa de dimensionamento "${created.nivel}" (${created.tipo_atendimento}).`,
    detalhes: { nivel_porte: created },
  })

  return created
}

export const updateNivelPorte = async (
  id: string,
  input: SaveNivelPorteInput,
): Promise<NivelPorte> => {
  const { data, error } = await db
    .from('niveis_porte')
    .update({
      tipo_atendimento: input.tipo_atendimento,
      nivel: input.nivel.trim(),
      alunos_min: Number(input.alunos_min),
      alunos_max:
        input.alunos_max === null ||
        input.alunos_max === undefined ||
        input.alunos_max === ('' as any)
          ? null
          : Number(input.alunos_max),
      ordem: Number(input.ordem),
      descricao: input.descricao ? input.descricao.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar nível de porte:', error)
    throw error
  }

  const updated = data as NivelPorte

  await registrarAuditoria({
    entidade: 'Níveis de Porte',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Edição da faixa de dimensionamento "${updated.nivel}" (${updated.tipo_atendimento}).`,
    detalhes: { id, alteracoes: input },
  })

  return updated
}

export const deleteNivelPorte = async (id: string): Promise<void> => {
  const { data: anterior } = await db.from('niveis_porte').select('*').eq('id', id).maybeSingle()

  const { error } = await db.from('niveis_porte').delete().eq('id', id)
  if (error) {
    console.error('Erro ao excluir nível de porte:', error)
    throw error
  }

  await registrarAuditoria({
    entidade: 'Níveis de Porte',
    acao: 'Exclusão',
    registro_codigo: anterior?.codigo || null,
    descricao: `Exclusão do nível de dimensionamento "${anterior?.nivel || id}".`,
    detalhes: { id, registro_anterior: anterior },
  })
}

// ==========================================
// 2. SERVIÇOS DE CRH (CONFIGURAÇÃO DE RH)
// ==========================================

export const getCrhConfiguracoes = async (): Promise<CrhConfiguracao[]> => {
  const { data, error } = await db
    .from('crh_configuracoes')
    .select(`
      *,
      unidades_escolares:unidade_escolar_id (
        id, codigo, nome, tipo_atendimento, nivel_porte
      ),
      cargos:cargo_id (
        id, codigo, nome
      ),
      funcoes:funcao_id (
        id, codigo, nome
      )
    `)
    .order('ano_letivo', { ascending: false })
    .order('codigo', { ascending: true })

  if (error) {
    console.error('Erro ao buscar configurações de RH (CRH):', error)
    throw error
  }

  // Mapear propriedades populadas para os nomes nos tipos
  return (data || []).map((row: any) => ({
    ...row,
    unidade_escolar: row.unidades_escolares,
    cargo: row.cargos,
    funcao: row.funcoes,
  })) as CrhConfiguracao[]
}

export const createCrhConfiguracao = async (input: CreateCrhInput): Promise<CrhConfiguracao> => {
  // Validações no cliente antes do envio
  if (input.ano_letivo < 2020 || input.ano_letivo > 2040) {
    throw new Error('Ano letivo inválido. O ano deve estar entre 2020 e 2040.')
  }
  if (!input.unidade_escolar_id) {
    throw new Error('A unidade escolar é obrigatória.')
  }
  if (!input.cargo_id) {
    throw new Error('O cargo é obrigatório.')
  }
  if (!input.funcao_id) {
    throw new Error('A função é obrigatória.')
  }
  if (input.quantidade_profissionais < 0) {
    throw new Error('Quantidade de profissionais não pode ser negativa.')
  }
  if (input.quantidade_por_funcao < 0) {
    throw new Error('Quantidade por função não pode ser negativa.')
  }
  if (input.por_turma === 'Sim' && input.por_periodo === 'Sim') {
    throw new Error(
      'Não é permitido marcar "Por Turma?" e "Por Período?" simultaneamente como "Sim".',
    )
  }

  const { data, error } = await db
    .from('crh_configuracoes')
    .insert([
      {
        ano_letivo: Number(input.ano_letivo),
        unidade_escolar_id: input.unidade_escolar_id,
        tipo_atendimento: input.tipo_atendimento,
        nivel_unidade: input.nivel_unidade,
        cargo_id: input.cargo_id,
        quantidade_profissionais: Number(input.quantidade_profissionais),
        por_turma: input.por_turma,
        por_periodo: input.por_periodo,
        natureza_cargo: input.natureza_cargo,
        funcao_id: input.funcao_id,
        quantidade_por_funcao: Number(input.quantidade_por_funcao),
      },
    ])
    .select(`
      *,
      unidades_escolares:unidade_escolar_id (id, codigo, nome),
      cargos:cargo_id (id, codigo, nome),
      funcoes:funcao_id (id, codigo, nome)
    `)
    .single()

  if (error) {
    if (error.code === '23505' || error.message?.includes('uq_crh_combinacao')) {
      throw new Error(
        'Configuração duplicada: já existe uma regra cadastrada com a mesma combinação de ano letivo, unidade escolar, cargo, função e critérios.',
      )
    }
    console.error('Erro ao criar configuração de RH (CRH):', error)
    throw error
  }

  const created: CrhConfiguracao = {
    ...data,
    unidade_escolar: data.unidades_escolares,
    cargo: data.cargos,
    funcao: data.funcoes,
  }

  const descUnidade = created.unidade_escolar?.nome || 'Unidade'
  const descCargo = created.cargo?.nome || 'Cargo'
  const descFuncao = created.funcao?.nome || 'Função'

  await registrarAuditoria({
    entidade: 'Configurações de RH (CRH)',
    acao: 'Criação',
    registro_codigo: created.codigo || null,
    descricao: `Cadastro de CRH "${created.codigo}": Unidade "${descUnidade}" (${created.ano_letivo}), Cargo "${descCargo}", Função "${descFuncao}", Qtd Prof: ${created.quantidade_profissionais}, Qtd Função: ${created.quantidade_por_funcao}, Natureza: ${created.natureza_cargo}.`,
    detalhes: { crh: created },
  })

  return created
}

export const updateCrhConfiguracao = async (
  id: string,
  input: UpdateCrhInput,
): Promise<CrhConfiguracao> => {
  if (input.ano_letivo < 2020 || input.ano_letivo > 2040) {
    throw new Error('Ano letivo inválido. O ano deve estar entre 2020 e 2040.')
  }
  if (input.quantidade_profissionais < 0) {
    throw new Error('Quantidade de profissionais não pode ser negativa.')
  }
  if (input.quantidade_por_funcao < 0) {
    throw new Error('Quantidade por função não pode ser negativa.')
  }
  if (input.por_turma === 'Sim' && input.por_periodo === 'Sim') {
    throw new Error(
      'Não é permitido marcar "Por Turma?" e "Por Período?" simultaneamente como "Sim".',
    )
  }

  const { data, error } = await db
    .from('crh_configuracoes')
    .update({
      ano_letivo: Number(input.ano_letivo),
      unidade_escolar_id: input.unidade_escolar_id,
      tipo_atendimento: input.tipo_atendimento,
      nivel_unidade: input.nivel_unidade,
      cargo_id: input.cargo_id,
      quantidade_profissionais: Number(input.quantidade_profissionais),
      por_turma: input.por_turma,
      por_periodo: input.por_periodo,
      natureza_cargo: input.natureza_cargo,
      funcao_id: input.funcao_id,
      quantidade_por_funcao: Number(input.quantidade_por_funcao),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      unidades_escolares:unidade_escolar_id (id, codigo, nome),
      cargos:cargo_id (id, codigo, nome),
      funcoes:funcao_id (id, codigo, nome)
    `)
    .single()

  if (error) {
    if (error.code === '23505' || error.message?.includes('uq_crh_combinacao')) {
      throw new Error(
        'Configuração duplicada: já existe outra regra cadastrada com a mesma combinação de ano letivo, unidade escolar, cargo, função e critérios.',
      )
    }
    console.error('Erro ao atualizar configuração de RH (CRH):', error)
    throw error
  }

  const updated: CrhConfiguracao = {
    ...data,
    unidade_escolar: data.unidades_escolares,
    cargo: data.cargos,
    funcao: data.funcoes,
  }

  await registrarAuditoria({
    entidade: 'Configurações de RH (CRH)',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Edição de CRH "${updated.codigo}" (${updated.ano_letivo}): Qtd Prof: ${updated.quantidade_profissionais}, Qtd Função: ${updated.quantidade_por_funcao}, Por Turma: ${updated.por_turma}, Por Período: ${updated.por_periodo}.`,
    detalhes: { id, alteracoes: input, crh: updated },
  })

  return updated
}

export const deleteCrhConfiguracao = async (id: string): Promise<void> => {
  const { data: anterior } = await db
    .from('crh_configuracoes')
    .select(`
      *,
      unidades_escolares:unidade_escolar_id (nome),
      cargos:cargo_id (nome),
      funcoes:funcao_id (nome)
    `)
    .eq('id', id)
    .maybeSingle()

  const { error } = await db.from('crh_configuracoes').delete().eq('id', id)
  if (error) {
    console.error('Erro ao excluir configuração de RH (CRH):', error)
    throw error
  }

  await registrarAuditoria({
    entidade: 'Configurações de RH (CRH)',
    acao: 'Exclusão',
    registro_codigo: anterior?.codigo || null,
    descricao: `Exclusão de CRH "${anterior?.codigo || id}" da unidade "${anterior?.unidades_escolares?.nome || 'Unidade'}" (Ano Letivo: ${anterior?.ano_letivo || '-'}).`,
    detalhes: { id, registro_anterior: anterior },
  })
}

/**
 * Determina dinamicamente o nível de uma unidade escolar com base no tipo de atendimento,
 * na quantidade de alunos informada e na tabela de referência niveis_porte.
 */
export const calcularNivelUnidade = (
  tipoAtendimento: string,
  numeroAlunos: number | null | undefined,
  tabelaNiveis: NivelPorte[],
  nivelPorteAtual?: string | null,
): { nivel: string; indeterminado: boolean; aviso?: string } => {
  if (!tipoAtendimento) {
    return {
      nivel: 'Não determinado',
      indeterminado: true,
      aviso: 'Selecione primeiro a Unidade Escolar.',
    }
  }

  const niveisFiltrados = tabelaNiveis.filter((n) => n.tipo_atendimento === tipoAtendimento)

  // Se a unidade possui alunos cadastrados
  if (numeroAlunos !== null && numeroAlunos !== undefined && !isNaN(Number(numeroAlunos))) {
    const alunos = Number(numeroAlunos)
    const encontrado = niveisFiltrados.find((n) => {
      const minOk = alunos >= n.alunos_min
      const maxOk = n.alunos_max === null || alunos <= n.alunos_max
      return minOk && maxOk
    })

    if (encontrado) {
      return { nivel: encontrado.nivel, indeterminado: false }
    }
  }

  // Fallback: se a unidade possui no cadastro nivel_porte (ex: "Nível 1 (até 100 alunos)" ou "Até 100 alunos")
  // mapeia para o nível correspondente
  if (nivelPorteAtual) {
    const normalizado = nivelPorteAtual.toLowerCase()
    if (tipoAtendimento.includes('20h')) {
      if (
        normalizado.includes('nível 1') ||
        normalizado.includes('nivel 1') ||
        normalizado.includes('nível i') ||
        normalizado.includes('até 100')
      ) {
        return { nivel: 'Nível I', indeterminado: false }
      }
      if (
        normalizado.includes('nível 2') ||
        normalizado.includes('nivel 2') ||
        normalizado.includes('nível ii') ||
        normalizado.includes('101 a 250')
      ) {
        return { nivel: 'Nível II', indeterminado: false }
      }
      if (
        normalizado.includes('nível 3') ||
        normalizado.includes('nivel 3') ||
        normalizado.includes('nível iii') ||
        normalizado.includes('251 a 500')
      ) {
        return { nivel: 'Nível III', indeterminado: false }
      }
      if (
        normalizado.includes('nível 4') ||
        normalizado.includes('nivel 4') ||
        normalizado.includes('nível iv') ||
        normalizado.includes('501 a 750')
      ) {
        return { nivel: 'Nível IV', indeterminado: false }
      }
      if (
        normalizado.includes('nível 5') ||
        normalizado.includes('nivel 5') ||
        normalizado.includes('nível v') ||
        normalizado.includes('751 a 1.000')
      ) {
        return { nivel: 'Nível V', indeterminado: false }
      }
      if (
        normalizado.includes('nível 6') ||
        normalizado.includes('nivel 6') ||
        normalizado.includes('nível vi') ||
        normalizado.includes('1.001 a 1.250')
      ) {
        return { nivel: 'Nível VI', indeterminado: false }
      }
      if (
        normalizado.includes('nível 7') ||
        normalizado.includes('nivel 7') ||
        normalizado.includes('nível vii') ||
        normalizado.includes('1.251 a 1.500')
      ) {
        return { nivel: 'Nível VII', indeterminado: false }
      }
      if (
        normalizado.includes('nível 8') ||
        normalizado.includes('nivel 8') ||
        normalizado.includes('nível viii') ||
        normalizado.includes('mais de 1.500')
      ) {
        return { nivel: 'Nível VIII', indeterminado: false }
      }
    } else {
      // 40h Educação Infantil
      if (
        normalizado.includes('nível a') ||
        normalizado.includes('nivel a') ||
        normalizado.includes('até 100')
      ) {
        return { nivel: 'Nível A', indeterminado: false }
      }
      if (
        normalizado.includes('nível b') ||
        normalizado.includes('nivel b') ||
        normalizado.includes('101 a 200')
      ) {
        return { nivel: 'Nível B', indeterminado: false }
      }
      if (
        normalizado.includes('nível c') ||
        normalizado.includes('nivel c') ||
        normalizado.includes('mais de 200')
      ) {
        return { nivel: 'Nível C', indeterminado: false }
      }
    }
  }

  // Se houver níveis cadastrados na tabela mas não foi possível determinar a quantidade
  const primeiroNivel = niveisFiltrados[0]?.nivel
  if (primeiroNivel) {
    return {
      nivel: primeiroNivel,
      indeterminado: true,
      aviso:
        'Quantidade de alunos não encontrada na unidade. Exibindo nível inicial padrão da tabela de referência.',
    }
  }

  return {
    nivel: 'Não determinado',
    indeterminado: true,
    aviso:
      'Nenhum nível correspondente cadastrado nas tabelas de referência para este tipo de atendimento.',
  }
}
