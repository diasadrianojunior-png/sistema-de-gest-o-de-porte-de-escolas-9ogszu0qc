import { supabase } from '@/lib/supabase/client'
import { UnidadeEscolar } from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'

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

  const created = data as UnidadeEscolar

  // Registrar auditoria
  await registrarAuditoria({
    entidade: 'Unidades escolares',
    acao: 'Criação',
    registro_codigo: created.codigo || null,
    descricao: `Cadastro da unidade escolar "${created.nome}" (${created.tipo_atendimento}, ${created.nivel_porte}).`,
    detalhes: { unidade: created },
  })

  return created
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

  const updated = data as UnidadeEscolar

  // Registrar auditoria
  await registrarAuditoria({
    entidade: 'Unidades escolares',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Edição da unidade escolar "${updated.nome}" (${updated.tipo_atendimento}, ${updated.nivel_porte}).`,
    detalhes: { id, alteracoes: unidade },
  })

  return updated
}

export const deleteUnidadeEscolar = async (id: string): Promise<void> => {
  // Busca registro antes de excluir para salvar informações de auditoria
  const { data: anterior } = await db
    .from('unidades_escolares')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  const { error } = await db.from('unidades_escolares').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir unidade escolar:', error)
    throw error
  }

  // Registrar auditoria
  await registrarAuditoria({
    entidade: 'Unidades escolares',
    acao: 'Exclusão',
    registro_codigo: anterior?.codigo || null,
    descricao: `Exclusão da unidade escolar "${anterior?.nome || id}".`,
    detalhes: { id, registro_anterior: anterior },
  })
}
