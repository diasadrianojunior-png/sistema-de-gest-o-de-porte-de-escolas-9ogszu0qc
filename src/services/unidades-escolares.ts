import { supabase } from '@/lib/supabase/client'
import { UnidadeEscolar } from '@/types/gestao-escolar'

const db = supabase as any

export const getUnidadesEscolares = async (): Promise<UnidadeEscolar[]> => {
  const { data, error } = await db
    .from('unidades_escolares')
    .select('*')
    .order('codigo', { ascending: true })

  if (error) {
    console.error('Erro ao buscar unidades escolares:', error)
    throw error
  }
  return (data as UnidadeEscolar[]) || []
}

export const createUnidadeEscolar = async (
  unidade: Omit<UnidadeEscolar, 'id' | 'created_at' | 'updated_at'>,
): Promise<UnidadeEscolar> => {
  const { data, error } = await db.from('unidades_escolares').insert([unidade]).select('*').single()

  if (error) {
    console.error('Erro ao cadastrar unidade escolar:', error)
    throw error
  }
  return data as UnidadeEscolar
}

export const updateUnidadeEscolar = async (
  id: string,
  unidade: Partial<Omit<UnidadeEscolar, 'id' | 'created_at' | 'updated_at'>>,
): Promise<UnidadeEscolar> => {
  const { data, error } = await db
    .from('unidades_escolares')
    .update({ ...unidade, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao atualizar unidade escolar:', error)
    throw error
  }
  return data as UnidadeEscolar
}

export const deleteUnidadeEscolar = async (id: string): Promise<void> => {
  const { error } = await db.from('unidades_escolares').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir unidade escolar:', error)
    throw error
  }
}
