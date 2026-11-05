import { supabase } from '@/lib/supabase/client'
import type { Especializacao } from '@/types/gestao-escolar'
import { getUsuarioAtualParaAuditoria, registrarAuditoria } from './auditoria'

/**
 * Opções fixas de "Classificação da Especialidade" exigidas pelo usuário.
 * A obrigatoriedade também é garantida no banco (NOT NULL), mas a lista
 * canônica vive aqui para alimentar o formulário, o filtro e a listagem.
 */
export const CLASSIFICACOES_ESPECIALIDADE = [
  'Graduação',
  'Pós-Graduação',
  'Mestrado',
  'Doutorado',
  'Pós-Doutorado',
] as const

export type ClassificacaoEspecialidade = (typeof CLASSIFICACOES_ESPECIALIDADE)[number]

export interface SalvarEspecializacaoInput {
  id?: string
  nome: string
  classificacao: string
}

/**
 * Conta quantas referências existem para a especialização em outras tabelas.
 * Atualmente a única tabela que referencia é profissional_especializacoes
 * (Especialidade(s) do Profissional, no Cadastro de Profissionais).
 * Regra permanente do sistema: exclusão bloqueada quando há referência.
 */
export async function contarReferenciasEspecializacao(id: string): Promise<number> {
  const { count, error } = await (supabase as any)
    .from('profissional_especializacoes')
    .select('id', { count: 'exact', head: true })
    .eq('especializacao_id', id)

  if (error) {
    console.error('Erro ao contar referências da especialização:', error)
    throw error
  }
  return count ?? 0
}

function validar(input: SalvarEspecializacaoInput): string | null {
  if (!input.nome || input.nome.trim() === '') {
    return 'Informe o Nome da Especialidade.'
  }
  if (!input.classificacao || input.classificacao.trim() === '') {
    return 'Selecione a Classificação da Especialidade.'
  }
  if (!(CLASSIFICACOES_ESPECIALIDADE as readonly string[]).includes(input.classificacao.trim())) {
    return 'Classificação da Especialidade inválida.'
  }
  return null
}

export async function getEspecializacoes(): Promise<Especializacao[]> {
  const { data, error } = await (supabase as any)
    .from('especializacoes')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Especializacao[]
}

export async function salvarEspecializacao(
  input: SalvarEspecializacaoInput,
): Promise<Especializacao> {
  const erro = validar(input)
  if (erro) throw new Error(erro)

  const usuario = await getUsuarioAtualParaAuditoria()
  const nome = input.nome.trim()
  const classificacao = input.classificacao.trim()

  if (input.id) {
    // Edição: capturar valores antigos para a auditoria
    const { data: anterior, error: erroAnterior } = await (supabase as any)
      .from('especializacoes')
      .select('*')
      .eq('id', input.id)
      .single()
    if (erroAnterior) throw erroAnterior

    const { data, error } = await (supabase as any)
      .from('especializacoes')
      .update({ nome, classificacao })
      .eq('id', input.id)
      .select('*')
      .single()
    if (error) throw error

    const registro = data as Especializacao
    await registrarAuditoria({
      registro_codigo: registro.codigo ?? null,
      entidade: 'Especializações',
      acao: 'EDITAR',
      descricao: `Especialização ${registro.codigo ?? ''} editada`,
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      usuario_email: usuario.email,
      detalhes: {
        valoresAntigos: {
          nome: (anterior as Especializacao)?.nome ?? null,
          classificacao: (anterior as Especializacao)?.classificacao ?? null,
        },
        valoresNovos: { nome, classificacao },
      },
    })
    return registro
  }

  // Criação: o identificador (ESP-XXXX) é gerado por trigger no banco
  const { data, error } = await (supabase as any)
    .from('especializacoes')
    .insert({ nome, classificacao })
    .select('*')
    .single()
  if (error) throw error

  const registro = data as Especializacao
  await registrarAuditoria({
    registro_codigo: registro.codigo ?? null,
    entidade: 'Especializações',
    acao: 'CRIAR',
    descricao: `Especialização ${registro.codigo ?? ''} criada`,
    usuario_id: usuario.id,
    usuario_nome: usuario.nome,
    usuario_email: usuario.email,
    detalhes: {
      valoresAntigos: null,
      valoresNovos: { nome, classificacao },
    },
  })
  return registro
}

export async function deleteEspecializacao(id: string): Promise<void> {
  // Regra permanente: bloquear a exclusão quando a especialização está
  // vinculada a algum profissional (Especialidade(s) do Profissional).
  const referencias = await contarReferenciasEspecializacao(id)
  if (referencias > 0) {
    throw new Error(
      `Esta especialização não pode ser excluída porque está vinculada a ${referencias} profissional(is) no Cadastro de Profissionais. Remova o vínculo antes de excluir.`,
    )
  }

  // Capturar o registro antes da exclusão para a auditoria
  const { data: anterior, error: erroAnterior } = await (supabase as any)
    .from('especializacoes')
    .select('*')
    .eq('id', id)
    .single()
  if (erroAnterior) throw erroAnterior

  const { error } = await (supabase as any).from('especializacoes').delete().eq('id', id)
  if (error) throw error

  const usuario = await getUsuarioAtualParaAuditoria()
  const registro = anterior as Especializacao
  await registrarAuditoria({
    registro_codigo: registro?.codigo ?? null,
    entidade: 'Especializações',
    acao: 'EXCLUIR',
    descricao: `Especialização ${registro?.codigo ?? ''} excluída`,
    usuario_id: usuario.id,
    usuario_nome: usuario.nome,
    usuario_email: usuario.email,
    detalhes: {
      valoresAntigos: {
        nome: registro?.nome ?? null,
        classificacao: registro?.classificacao ?? null,
      },
      valoresNovos: null,
    },
  })
}
