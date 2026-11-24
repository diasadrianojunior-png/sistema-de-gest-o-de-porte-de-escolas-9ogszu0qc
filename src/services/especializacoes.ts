import { supabase } from '@/lib/supabase/client'
import type { Especializacao } from '@/types/gestao-escolar'
import { getUsuarioAtualParaAuditoria, registrarAuditoria } from './auditoria'

/**
 * Opções fixas de "Classificação da Especialidade" exigidas pelo usuário.
 * A obrigatoriedade (pelo menos 1) e a lista canônica também são garantidas
 * no banco (CHECK + constraint de valores), mas a lista vive aqui para
 * alimentar o formulário (seleção múltipla), o filtro e a listagem.
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
  /** Uma especialidade pode ter VÁRIAS classificações ao mesmo tempo (mínimo 1). */
  classificacoes: string[]
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

function normalizarClassificacoes(classificacoes: string[] | undefined | null): string[] {
  if (!Array.isArray(classificacoes)) return []
  // remove vazios/duplicatas preservando a ordem
  return classificacoes
    .map((c) => (typeof c === 'string' ? c.trim() : ''))
    .filter((c) => c !== '')
    .filter((c, i, arr) => arr.indexOf(c) === i)
}

function validar(input: SalvarEspecializacaoInput): string | null {
  if (!input.nome || input.nome.trim() === '') {
    return 'Informe o Nome da Especialidade.'
  }
  const classificacoes = normalizarClassificacoes(input.classificacoes)
  if (classificacoes.length === 0) {
    return 'Selecione pelo menos uma Classificação da Especialidade.'
  }
  const invalidas = classificacoes.filter(
    (c) => !(CLASSIFICACOES_ESPECIALIDADE as readonly string[]).includes(c),
  )
  if (invalidas.length > 0) {
    return `Classificação da Especialidade inválida: ${invalidas.join(', ')}.`
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

/**
 * Valida a unicidade do Nome da Especialidade (case/acento-insensível, igual ao
 * índice único do banco) antes de gravar, para devolver mensagem amigável em
 * vez do erro cru de índice.
 */
async function validarNomeUnico(nome: string, idEdicao?: string): Promise<string | null> {
  let query = (supabase as any)
    .from('especializacoes')
    .select('id, nome')
    .ilike('nome', nome.trim())
  if (idEdicao) query = query.neq('id', idEdicao)

  const { data, error } = await query.limit(1)
  if (error) throw error
  if (data && data.length > 0) {
    return `Já existe uma especialidade cadastrada com o nome "${(data[0] as any).nome}". Informe outro nome.`
  }
  return null
}

export async function salvarEspecializacao(
  input: SalvarEspecializacaoInput,
): Promise<Especializacao> {
  const erro = validar(input)
  if (erro) throw new Error(erro)

  const usuario = await getUsuarioAtualParaAuditoria()
  const nome = input.nome.trim()
  const classificacoes = normalizarClassificacoes(input.classificacoes)

  const erroNomeUnico = await validarNomeUnico(nome, input.id)
  if (erroNomeUnico) throw new Error(erroNomeUnico)

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
      .update({ nome, classificacoes })
      .eq('id', input.id)
      .select('*')
      .single()
    if (error) throw error

    const registro = data as Especializacao
    await registrarAuditoria({
      registro_codigo: registro.codigo ?? null,
      entidade: 'Especializações',
      acao: 'Edição',
      descricao: `Especialização ${registro.codigo ?? ''} editada`,
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      usuario_email: usuario.email,
      detalhes: {
        valoresAntigos: {
          nome: (anterior as Especializacao)?.nome ?? null,
          classificacoes: (anterior as Especializacao)?.classificacoes ?? null,
        },
        valoresNovos: { nome, classificacoes },
      },
    })
    return registro
  }

  // Criação: o identificador (ESP-XXXX) é gerado por trigger no banco
  const { data, error } = await (supabase as any)
    .from('especializacoes')
    .insert({ nome, classificacoes })
    .select('*')
    .single()
  if (error) throw error

  const registro = data as Especializacao
  await registrarAuditoria({
    registro_codigo: registro.codigo ?? null,
    entidade: 'Especializações',
    acao: 'Criação',
    descricao: `Especialização ${registro.codigo ?? ''} criada`,
    usuario_id: usuario.id,
    usuario_nome: usuario.nome,
    usuario_email: usuario.email,
    detalhes: {
      valoresAntigos: null,
      valoresNovos: { nome, classificacoes },
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
    acao: 'Exclusão',
    descricao: `Especialização ${registro?.codigo ?? ''} excluída`,
    usuario_id: usuario.id,
    usuario_nome: usuario.nome,
    usuario_email: usuario.email,
    detalhes: {
      valoresAntigos: {
        nome: registro?.nome ?? null,
        classificacoes: registro?.classificacoes ?? null,
      },
      valoresNovos: null,
    },
  })
}
