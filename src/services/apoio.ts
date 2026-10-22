import { supabase } from '@/lib/supabase/client'
import { Cargo, Etapa, Funcao, MunicipioRede, TipoEscola } from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'

const db = supabase as any

// --- Municípios / Redes ---
export const getMunicipios = async (): Promise<MunicipioRede[]> => {
  const { data, error } = await db
    .from('municipios_rede')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar municípios:', error)
    throw error
  }
  return (data as MunicipioRede[]) || []
}

export const createMunicipio = async (
  municipio: Omit<MunicipioRede, 'id' | 'created_at' | 'updated_at'>,
): Promise<MunicipioRede> => {
  const { data, error } = await db.from('municipios_rede').insert([municipio]).select().single()

  if (error) {
    console.error('Erro ao criar município:', error)
    throw error
  }

  const created = data as MunicipioRede

  await registrarAuditoria({
    entidade: 'Municípios/Redes',
    acao: 'Criação',
    registro_codigo: created.codigo || null,
    descricao: `Cadastro do município/rede "${created.nome}" (${created.uf}, esfera ${created.esfera}).`,
    detalhes: { municipio: created },
  })

  return created
}

export const updateMunicipio = async (
  id: string,
  municipio: Partial<Omit<MunicipioRede, 'id' | 'created_at' | 'updated_at'>>,
): Promise<MunicipioRede> => {
  const { data, error } = await db
    .from('municipios_rede')
    .update({ ...municipio, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar município:', error)
    throw error
  }

  const updated = data as MunicipioRede

  await registrarAuditoria({
    entidade: 'Municípios/Redes',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Edição do município/rede "${updated.nome}" (${updated.uf}, esfera ${updated.esfera}).`,
    detalhes: { id, alteracoes: municipio },
  })

  return updated
}

export const deleteMunicipio = async (id: string): Promise<void> => {
  const { data: anterior } = await db.from('municipios_rede').select('*').eq('id', id).maybeSingle()

  const { error } = await db.from('municipios_rede').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir município:', error)
    throw error
  }

  await registrarAuditoria({
    entidade: 'Municípios/Redes',
    acao: 'Exclusão',
    registro_codigo: anterior?.codigo || null,
    descricao: `Exclusão do município/rede "${anterior?.nome || id}".`,
    detalhes: { id, registro_anterior: anterior },
  })
}

// --- Tipos de Escola ---
export const getTiposEscola = async (): Promise<TipoEscola[]> => {
  const { data, error } = await db
    .from('tipos_escola')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar tipos de escola:', error)
    throw error
  }
  return (data as TipoEscola[]) || []
}

export const createTipoEscola = async (
  tipo: Omit<TipoEscola, 'id' | 'created_at' | 'updated_at'>,
): Promise<TipoEscola> => {
  const { data, error } = await db.from('tipos_escola').insert([tipo]).select().single()

  if (error) {
    console.error('Erro ao criar tipo de escola:', error)
    throw error
  }

  const created = data as TipoEscola

  await registrarAuditoria({
    entidade: 'Tipos de escola',
    acao: 'Criação',
    registro_codigo: created.codigo || null,
    descricao: `Cadastro do tipo de escola "${created.nome}".`,
    detalhes: { tipo: created },
  })

  return created
}

export const updateTipoEscola = async (
  id: string,
  tipo: Partial<Omit<TipoEscola, 'id' | 'created_at' | 'updated_at'>>,
): Promise<TipoEscola> => {
  const { data, error } = await db
    .from('tipos_escola')
    .update({ ...tipo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar tipo de escola:', error)
    throw error
  }

  const updated = data as TipoEscola

  await registrarAuditoria({
    entidade: 'Tipos de escola',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Edição do tipo de escola "${updated.nome}".`,
    detalhes: { id, alteracoes: tipo },
  })

  return updated
}

export const deleteTipoEscola = async (id: string): Promise<void> => {
  const { data: anterior } = await db.from('tipos_escola').select('*').eq('id', id).maybeSingle()

  const { error } = await db.from('tipos_escola').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir tipo de escola:', error)
    throw error
  }

  await registrarAuditoria({
    entidade: 'Tipos de escola',
    acao: 'Exclusão',
    registro_codigo: anterior?.codigo || null,
    descricao: `Exclusão do tipo de escola "${anterior?.nome || id}".`,
    detalhes: { id, registro_anterior: anterior },
  })
}

// --- Cargos ---
export const getCargos = async (): Promise<Cargo[]> => {
  const { data, error } = await db.from('cargos').select('*').order('codigo', { ascending: true })

  if (error) {
    console.error('Erro ao buscar cargos:', error)
    throw error
  }
  return (data as Cargo[]) || []
}

export const createCargo = async (
  cargo: Omit<Cargo, 'id' | 'codigo' | 'created_at' | 'updated_at'>,
): Promise<Cargo> => {
  const { data, error } = await db.from('cargos').insert([cargo]).select().single()

  if (error) {
    console.error('Erro ao criar cargo:', error)
    throw error
  }

  const created = data as Cargo

  await registrarAuditoria({
    entidade: 'Cargos',
    acao: 'Criação',
    registro_codigo: created.codigo || null,
    descricao: `Cadastro do cargo "${created.nome}".`,
    detalhes: { cargo: created },
  })

  return created
}

export const updateCargo = async (
  id: string,
  cargo: Partial<Omit<Cargo, 'id' | 'codigo' | 'created_at' | 'updated_at'>>,
): Promise<Cargo> => {
  const { data, error } = await db
    .from('cargos')
    .update({ ...cargo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar cargo:', error)
    throw error
  }

  const updated = data as Cargo

  await registrarAuditoria({
    entidade: 'Cargos',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Edição do cargo "${updated.nome}".`,
    detalhes: { id, alteracoes: cargo },
  })

  return updated
}

export const deleteCargo = async (id: string): Promise<void> => {
  const { data: anterior } = await db.from('cargos').select('*').eq('id', id).maybeSingle()

  const { error } = await db.from('cargos').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir cargo:', error)
    throw error
  }

  await registrarAuditoria({
    entidade: 'Cargos',
    acao: 'Exclusão',
    registro_codigo: anterior?.codigo || null,
    descricao: `Exclusão do cargo "${anterior?.nome || id}".`,
    detalhes: { id, registro_anterior: anterior },
  })
}

// --- Funções e Vínculo com Cargos ---
export interface CreateFuncaoInput {
  nome: string
  cargo_ids: string[]
}

export interface UpdateFuncaoInput {
  nome: string
  cargo_ids: string[]
}

export const getFuncoes = async (): Promise<Funcao[]> => {
  // 1. Buscar todas as funções ordenadas por código sequencial
  const { data: funcoesData, error: funcoesError } = await db
    .from('funcoes')
    .select('*')
    .order('codigo', { ascending: true })

  if (funcoesError) {
    console.error('Erro ao buscar funções:', funcoesError)
    throw funcoesError
  }

  const funcoes = (funcoesData as Funcao[]) || []
  if (funcoes.length === 0) return []

  // 2. Buscar vínculos com cargos
  const { data: vinculosData, error: vinculosError } = await db
    .from('funcao_cargos')
    .select('id, funcao_id, cargo_id, cargos(id, codigo, nome)')

  if (vinculosError) {
    console.error('Erro ao buscar vínculos funcao_cargos:', vinculosError)
    // Se der erro nos vínculos, retornar funções com array vazio
    return funcoes.map((f) => ({ ...f, cargos_vinculados: [] }))
  }

  // Agrupar cargos por funcao_id
  const cargosPorFuncao = new Map<string, Cargo[]>()
  for (const v of vinculosData || []) {
    if (v.cargos) {
      const arr = cargosPorFuncao.get(v.funcao_id) || []
      arr.push(v.cargos as Cargo)
      cargosPorFuncao.set(v.funcao_id, arr)
    }
  }

  return funcoes.map((f) => ({
    ...f,
    cargos_vinculados: (cargosPorFuncao.get(f.id) || []).sort((a, b) =>
      (a.codigo || '').localeCompare(b.codigo || ''),
    ),
  }))
}

export const createFuncao = async (input: CreateFuncaoInput): Promise<Funcao> => {
  // 1. Inserir a função
  const { data, error } = await db
    .from('funcoes')
    .insert([{ nome: input.nome.trim() }])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar função:', error)
    throw error
  }

  const created = data as Funcao

  // 2. Inserir os vínculos com os cargos selecionados
  if (input.cargo_ids && input.cargo_ids.length > 0) {
    const vinculosParaInserir = input.cargo_ids.map((cargoId) => ({
      funcao_id: created.id,
      cargo_id: cargoId,
    }))

    const { error: vincError } = await db.from('funcao_cargos').insert(vinculosParaInserir)
    if (vincError) {
      console.error('Erro ao vincular cargos à função:', vincError)
      throw vincError
    }
  }

  // 3. Buscar os cargos vinculados para o retorno e auditoria
  let nomesCargos: string[] = []
  if (input.cargo_ids && input.cargo_ids.length > 0) {
    const { data: cargosVinculados } = await db
      .from('cargos')
      .select('id, codigo, nome')
      .in('id', input.cargo_ids)
    created.cargos_vinculados = (cargosVinculados as Cargo[]) || []
    nomesCargos = (cargosVinculados || []).map((c: any) => `${c.codigo}: ${c.nome}`)
  } else {
    created.cargos_vinculados = []
  }

  // 4. Registrar Auditoria com código FUN-XXXX
  await registrarAuditoria({
    entidade: 'Funções',
    acao: 'Criação',
    registro_codigo: created.codigo || null,
    descricao: `Cadastro da função "${created.nome}" com ${input.cargo_ids.length} cargo(s) vinculado(s): ${nomesCargos.join(', ') || 'Nenhum'}.`,
    detalhes: {
      funcao: created,
      cargos_vinculados: created.cargos_vinculados,
    },
  })

  return created
}

export const updateFuncao = async (id: string, input: UpdateFuncaoInput): Promise<Funcao> => {
  // 1. Atualizar nome da função
  const { data, error } = await db
    .from('funcoes')
    .update({ nome: input.nome.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar função:', error)
    throw error
  }

  const updated = data as Funcao

  // 2. Atualizar vínculos: remover existentes e inserir novos
  const { error: delError } = await db.from('funcao_cargos').delete().eq('funcao_id', id)
  if (delError) {
    console.error('Erro ao limpar vínculos anteriores da função:', delError)
    throw delError
  }

  if (input.cargo_ids && input.cargo_ids.length > 0) {
    const vinculosParaInserir = input.cargo_ids.map((cargoId) => ({
      funcao_id: id,
      cargo_id: cargoId,
    }))

    const { error: vincError } = await db.from('funcao_cargos').insert(vinculosParaInserir)
    if (vincError) {
      console.error('Erro ao reinserir vínculos da função:', vincError)
      throw vincError
    }
  }

  // 3. Buscar os cargos vinculados atualizados
  let nomesCargos: string[] = []
  if (input.cargo_ids && input.cargo_ids.length > 0) {
    const { data: cargosVinculados } = await db
      .from('cargos')
      .select('id, codigo, nome')
      .in('id', input.cargo_ids)
    updated.cargos_vinculados = (cargosVinculados as Cargo[]) || []
    nomesCargos = (cargosVinculados || []).map((c: any) => `${c.codigo}: ${c.nome}`)
  } else {
    updated.cargos_vinculados = []
  }

  // 4. Registrar Auditoria com código FUN-XXXX
  await registrarAuditoria({
    entidade: 'Funções',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Edição da função "${updated.nome}" com ${input.cargo_ids.length} cargo(s) vinculado(s): ${nomesCargos.join(', ') || 'Nenhum'}.`,
    detalhes: {
      id,
      funcao: updated,
      cargos_vinculados: updated.cargos_vinculados,
    },
  })

  return updated
}

export const deleteFuncao = async (id: string): Promise<void> => {
  // 1. Buscar registro anterior para histórico de auditoria
  const { data: anterior } = await db.from('funcoes').select('*').eq('id', id).maybeSingle()

  // 2. Excluir (ON DELETE CASCADE da migration remove os registros em funcao_cargos)
  const { error } = await db.from('funcoes').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir função:', error)
    throw error
  }

  // 3. Registrar Auditoria com código FUN-XXXX
  await registrarAuditoria({
    entidade: 'Funções',
    acao: 'Exclusão',
    registro_codigo: anterior?.codigo || null,
    descricao: `Exclusão da função "${anterior?.nome || id}".`,
    detalhes: { id, registro_anterior: anterior },
  })
}

// --- Etapas ---
export interface CreateEtapaInput {
  nome: string
  ano_letivo: number
}

export interface UpdateEtapaInput {
  nome: string
  ano_letivo: number
}

export const getEtapas = async (): Promise<Etapa[]> => {
  const { data, error } = await db
    .from('etapas')
    .select('*')
    .order('ano_letivo', { ascending: false })
    .order('codigo', { ascending: true })

  if (error) {
    console.error('Erro ao buscar etapas:', error)
    throw error
  }
  return (data as Etapa[]) || []
}

export const createEtapa = async (input: CreateEtapaInput): Promise<Etapa> => {
  const { data, error } = await db
    .from('etapas')
    .insert([
      {
        nome: input.nome.trim(),
        ano_letivo: Number(input.ano_letivo),
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar etapa:', error)
    throw error
  }

  const created = data as Etapa

  await registrarAuditoria({
    entidade: 'Etapas',
    acao: 'Criação',
    registro_codigo: created.codigo || null,
    descricao: `Cadastro da etapa "${created.nome}" (Ano Letivo: ${created.ano_letivo}).`,
    detalhes: { etapa: created },
  })

  return created
}

export const updateEtapa = async (id: string, input: UpdateEtapaInput): Promise<Etapa> => {
  const { data, error } = await db
    .from('etapas')
    .update({
      nome: input.nome.trim(),
      ano_letivo: Number(input.ano_letivo),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar etapa:', error)
    throw error
  }

  const updated = data as Etapa

  await registrarAuditoria({
    entidade: 'Etapas',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Edição da etapa "${updated.nome}" (Ano Letivo: ${updated.ano_letivo}).`,
    detalhes: { id, alteracoes: input },
  })

  return updated
}

export const deleteEtapa = async (id: string): Promise<void> => {
  const { data: anterior } = await db.from('etapas').select('*').eq('id', id).maybeSingle()

  const { error } = await db.from('etapas').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir etapa:', error)
    throw error
  }

  await registrarAuditoria({
    entidade: 'Etapas',
    acao: 'Exclusão',
    registro_codigo: anterior?.codigo || null,
    descricao: `Exclusão da etapa "${anterior?.nome || id}" (Ano Letivo: ${anterior?.ano_letivo || '-'}).`,
    detalhes: { id, registro_anterior: anterior },
  })
}
