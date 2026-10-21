import { supabase } from '@/lib/supabase/client'
import { MunicipioRede, TipoEscola } from '@/types/gestao-escolar'
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
