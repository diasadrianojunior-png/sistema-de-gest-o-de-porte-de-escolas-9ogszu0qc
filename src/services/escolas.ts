import { supabase } from '@/lib/supabase/client'
import { Escola } from '@/types/gestao-escolar'

const db = supabase as any

export const getEscolas = async (): Promise<Escola[]> => {
  const { data, error } = await db
    .from('escolas')
    .select(`
      *,
      municipio:municipios_rede(*),
      tipo_escola:tipos_escola(*)
    `)
    .order('nome', { ascending: true })

  if (error) {
    console.error('Erro ao buscar escolas:', error)
    throw error
  }
  return (data as Escola[]) || []
}

export const createEscola = async (
  escola: Omit<Escola, 'id' | 'created_at' | 'updated_at' | 'municipio' | 'tipo_escola'>,
): Promise<Escola> => {
  const { data, error } = await db
    .from('escolas')
    .insert([escola])
    .select(`
      *,
      municipio:municipios_rede(*),
      tipo_escola:tipos_escola(*)
    `)
    .single()

  if (error) {
    console.error('Erro ao cadastrar escola:', error)
    throw error
  }
  return data as Escola
}

export const updateEscola = async (
  id: string,
  escola: Partial<Omit<Escola, 'id' | 'created_at' | 'updated_at' | 'municipio' | 'tipo_escola'>>,
): Promise<Escola> => {
  const { data, error } = await db
    .from('escolas')
    .update({ ...escola, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      municipio:municipios_rede(*),
      tipo_escola:tipos_escola(*)
    `)
    .single()

  if (error) {
    console.error('Erro ao atualizar escola:', error)
    throw error
  }
  return data as Escola
}

export const deleteEscola = async (id: string): Promise<void> => {
  const { error } = await db.from('escolas').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir escola:', error)
    throw error
  }
}
