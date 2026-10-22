import { supabase } from '@/lib/supabase/client'
import { Turma } from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'

const db = supabase as any

export interface CreateTurmaInput {
  nome: string
  unidade_escolar_id?: string | null
  etapa_id: string | null
  ano_letivo: number
  ano_serie_id: string | null
}

export interface UpdateTurmaInput {
  nome: string
  unidade_escolar_id?: string | null
  etapa_id: string | null
  ano_letivo: number
  ano_serie_id: string | null
}

export const getTurmas = async (): Promise<Turma[]> => {
  const { data, error } = await db
    .from('turmas')
    .select(`
      *,
      unidade_escolar:unidades_escolares(id, codigo, nome, tipo_atendimento),
      etapa:etapas(id, codigo, nome, ano_letivo),
      ano_serie:anos_series(id, codigo, nome, ano_letivo)
    `)
    .order('ano_letivo', { ascending: false })
    .order('codigo', { ascending: true })

  if (error) {
    console.error('Erro ao buscar turmas:', error)
    throw error
  }
  return (data as Turma[]) || []
}

export const createTurma = async (input: CreateTurmaInput): Promise<Turma> => {
  const ano = Number(input.ano_letivo)
  if (!ano || ano < 2020 || ano > 2040) {
    throw new Error('Ano letivo inválido. O ano deve estar entre 2020 e 2040.')
  }
  if (!input.nome || !input.nome.trim()) {
    throw new Error('Nome da turma é obrigatório.')
  }

  const { data, error } = await db
    .from('turmas')
    .insert([
      {
        nome: input.nome.trim(),
        unidade_escolar_id: input.unidade_escolar_id || null,
        etapa_id: input.etapa_id || null,
        ano_letivo: ano,
        ano_serie_id: input.ano_serie_id || null,
      },
    ])
    .select(`
      *,
      unidade_escolar:unidades_escolares(id, codigo, nome, tipo_atendimento),
      etapa:etapas(id, codigo, nome, ano_letivo),
      ano_serie:anos_series(id, codigo, nome, ano_letivo)
    `)
    .single()

  if (error) {
    console.error('Erro ao criar turma:', error)
    throw error
  }

  const created = data as Turma

  await registrarAuditoria({
    entidade: 'Turmas',
    acao: 'Criação',
    registro_codigo: created.codigo || null,
    descricao: `Cadastro da Turma "${created.nome}" (Ano Letivo: ${created.ano_letivo}${
      created.etapa?.nome ? `, Etapa: ${created.etapa.nome}` : ''
    }${created.ano_serie?.nome ? `, Ano/Série: ${created.ano_serie.nome}` : ''}).`,
    detalhes: { turma: created },
  })

  return created
}

export const updateTurma = async (id: string, input: UpdateTurmaInput): Promise<Turma> => {
  const ano = Number(input.ano_letivo)
  if (!ano || ano < 2020 || ano > 2040) {
    throw new Error('Ano letivo inválido. O ano deve estar entre 2020 e 2040.')
  }
  if (!input.nome || !input.nome.trim()) {
    throw new Error('Nome da turma é obrigatório.')
  }

  const { data, error } = await db
    .from('turmas')
    .update({
      nome: input.nome.trim(),
      unidade_escolar_id: input.unidade_escolar_id || null,
      etapa_id: input.etapa_id || null,
      ano_letivo: ano,
      ano_serie_id: input.ano_serie_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      unidade_escolar:unidades_escolares(id, codigo, nome, tipo_atendimento),
      etapa:etapas(id, codigo, nome, ano_letivo),
      ano_serie:anos_series(id, codigo, nome, ano_letivo)
    `)
    .single()

  if (error) {
    console.error('Erro ao atualizar turma:', error)
    throw error
  }

  const updated = data as Turma

  await registrarAuditoria({
    entidade: 'Turmas',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Edição da Turma "${updated.nome}" (Ano Letivo: ${updated.ano_letivo}${
      updated.etapa?.nome ? `, Etapa: ${updated.etapa.nome}` : ''
    }${updated.ano_serie?.nome ? `, Ano/Série: ${updated.ano_serie.nome}` : ''}).`,
    detalhes: { id, alteracoes: input, turma: updated },
  })

  return updated
}

export const deleteTurma = async (id: string): Promise<void> => {
  const { data: anterior } = await db
    .from('turmas')
    .select(`
      *,
      unidade_escolar:unidades_escolares(id, codigo, nome, tipo_atendimento),
      etapa:etapas(id, codigo, nome, ano_letivo),
      ano_serie:anos_series(id, codigo, nome, ano_letivo)
    `)
    .eq('id', id)
    .maybeSingle()

  const { error } = await db.from('turmas').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir turma:', error)
    throw error
  }

  await registrarAuditoria({
    entidade: 'Turmas',
    acao: 'Exclusão',
    registro_codigo: anterior?.codigo || null,
    descricao: `Exclusão da Turma "${anterior?.nome || id}" (Ano Letivo: ${anterior?.ano_letivo || '-'}).`,
    detalhes: { id, registro_anterior: anterior },
  })
}
