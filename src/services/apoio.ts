import { supabase } from '@/lib/supabase/client'
import { MunicipioRede, TipoEscola } from '@/types/gestao-escolar'

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
  return data as MunicipioRede
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
  return data as MunicipioRede
}

export const deleteMunicipio = async (id: string): Promise<void> => {
  const { error } = await db.from('municipios_rede').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir município:', error)
    throw error
  }
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
  return data as TipoEscola
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
  return data as TipoEscola
}

export const deleteTipoEscola = async (id: string): Promise<void> => {
  const { error } = await db.from('tipos_escola').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir tipo de escola:', error)
    throw error
  }
}
