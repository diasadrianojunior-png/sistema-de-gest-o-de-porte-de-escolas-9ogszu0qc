import { supabase } from '@/lib/supabase/client'
import { Profissional, ProfissionalVaga, VagaReal } from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'

const db = supabase as any

export interface VinculoVagaInput {
  vaga_id: string
  titular: boolean
  cargo_id?: string | null
}

export interface SalvarProfissionalInput {
  id?: string
  nome: string
  unidade_escolar_id: string
  ativo?: boolean
  vagas?: VinculoVagaInput[]
}

/**
 * Busca listagem completa de profissionais com suas unidades e vagas vinculadas
 */
export async function getProfissionais(): Promise<Profissional[]> {
  const { data: profs, error } = await db
    .from('profissionais')
    .select(
      `
      *,
      unidade_escolar:unidades_escolares(*),
      vagas_vinculadas:profissional_vagas(
        *,
        cargo:cargos(*),
        vaga:vaga(
          *,
          unidade_escolar:unidades_escolares(*),
          cargo:cargos(*),
          turma:turmas(*),
          configuracao_rh_linha:configuracao_rh_linha(
            *,
            cargos:configuracao_rh_linha_cargo(*, cargo:cargos(*))
          )
        )
      )
    `,
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar profissionais:', error)
    throw error
  }

  return (profs as Profissional[]) || []
}

/**
 * Busca um profissional por ID
 */
export async function getProfissionalPorId(id: string): Promise<Profissional | null> {
  const { data, error } = await db
    .from('profissionais')
    .select(
      `
      *,
      unidade_escolar:unidades_escolares(*),
      vagas_vinculadas:profissional_vagas(
        *,
        cargo:cargos(*),
        vaga:vaga(
          *,
          unidade_escolar:unidades_escolares(*),
          cargo:cargos(*),
          turma:turmas(*),
          configuracao_rh_linha:configuracao_rh_linha(
            *,
            cargos:configuracao_rh_linha_cargo(*, cargo:cargos(*))
          )
        )
      )
    `,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error(`Erro ao buscar profissional ${id}:`, error)
    throw error
  }

  return (data as Profissional) || null
}

/**
 * Salva (cria ou atualiza) um profissional e seus vínculos com vagas.
 * Atualiza de forma consistente as vagas correspondentes:
 * - Vagas atribuídas com ocupante -> status OCUPADA, servidor_id, nome_ocupante, cargo_id
 * - Vagas removidas/desvinculadas deste profissional -> status ABERTA, limpando ocupante e cargo
 */
export async function salvarProfissional(input: SalvarProfissionalInput): Promise<Profissional> {
  const isEdicao = Boolean(input.id)

  let profissionalAnterior: Profissional | null = null
  if (isEdicao && input.id) {
    profissionalAnterior = await getProfissionalPorId(input.id)
  }

  // 1. Inserir ou atualizar na tabela 'profissionais'
  let profissionalSalvo: Profissional

  if (isEdicao && input.id) {
    const { data, error } = await db
      .from('profissionais')
      .update({
        nome: input.nome.trim(),
        unidade_escolar_id: input.unidade_escolar_id,
        ativo: input.ativo !== undefined ? input.ativo : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .select('*, unidade_escolar:unidades_escolares(*)')
      .single()

    if (error) {
      console.error('Erro ao atualizar profissional:', error)
      throw error
    }
    profissionalSalvo = data as Profissional
  } else {
    const { data, error } = await db
      .from('profissionais')
      .insert({
        nome: input.nome.trim(),
        unidade_escolar_id: input.unidade_escolar_id,
        ativo: input.ativo !== undefined ? input.ativo : true,
      })
      .select('*, unidade_escolar:unidades_escolares(*)')
      .single()

    if (error) {
      console.error('Erro ao criar profissional:', error)
      throw error
    }
    profissionalSalvo = data as Profissional
  }

  const profissionalId = profissionalSalvo.id
  const nomeProfissional = profissionalSalvo.nome

  // 2. Tratar vínculos de vagas
  // IDs de vagas anteriormente vinculadas
  const vagasAnterioresIds = new Set(
    (profissionalAnterior?.vagas_vinculadas || []).map((v) => v.vaga_id),
  )

  const novosVinculos = input.vagas || []
  const novasVagasIds = new Set(novosVinculos.map((v) => v.vaga_id))

  // Vagas que deixaram de ser vinculadas ao profissional -> devem ser liberadas
  const vagasParaLiberar: string[] = []
  for (const vId of vagasAnterioresIds) {
    if (!novasVagasIds.has(vId)) {
      vagasParaLiberar.push(vId)
    }
  }

  // Limpar vínculos antigos da tabela profissional_vagas para esse profissional
  if (isEdicao) {
    const { error: errDel } = await db
      .from('profissional_vagas')
      .delete()
      .eq('profissional_id', profissionalId)

    if (errDel) {
      console.error('Erro ao limpar vínculos antigos de vagas:', errDel)
      throw errDel
    }
  }

  // Inserir os novos vínculos em profissional_vagas
  if (novosVinculos.length > 0) {
    const rows = novosVinculos.map((nv) => ({
      profissional_id: profissionalId,
      vaga_id: nv.vaga_id,
      titular: Boolean(nv.titular),
      cargo_id: nv.cargo_id || null,
      updated_at: new Date().toISOString(),
    }))

    const { error: errIns } = await db.from('profissional_vagas').insert(rows)

    if (errIns) {
      console.error('Erro ao inserir vínculos de vagas do profissional:', errIns)
      throw errIns
    }

    // Atualizar cada vaga vinculada com o profissional como ocupante -> status OCUPADA
    for (const nv of novosVinculos) {
      const { error: errVaga } = await db
        .from('vaga')
        .update({
          servidor_id: profissionalId,
          nome_ocupante: nomeProfissional,
          cargo_id: nv.cargo_id || null,
          status: 'OCUPADA',
          updated_at: new Date().toISOString(),
        })
        .eq('id', nv.vaga_id)

      if (errVaga) {
        console.error(`Erro ao atualizar status da vaga ${nv.vaga_id} para OCUPADA:`, errVaga)
      }
    }
  }

  // Liberar vagas que foram desvinculadas -> status ABERTA
  for (const vId of vagasParaLiberar) {
    const { error: errLib } = await db
      .from('vaga')
      .update({
        servidor_id: null,
        nome_ocupante: null,
        cargo_id: null,
        status: 'ABERTA',
        updated_at: new Date().toISOString(),
      })
      .eq('id', vId)

    if (errLib) {
      console.error(`Erro ao liberar vaga ${vId} desvinculada:`, errLib)
    }
  }

  // 3. Registrar auditoria
  await registrarAuditoria({
    entidade: 'Profissionais',
    acao: isEdicao ? 'Edição' : 'Criação',
    registro_codigo: profissionalSalvo.codigo || null,
    descricao: isEdicao
      ? `Profissional "${profissionalSalvo.nome}" (${profissionalSalvo.codigo}) atualizado. Vagas vinculadas: ${novosVinculos.length}.`
      : `Profissional "${profissionalSalvo.nome}" (${profissionalSalvo.codigo}) cadastrado com sucesso. Vagas vinculadas: ${novosVinculos.length}.`,
    detalhes: {
      profissional_id: profissionalId,
      nome: profissionalSalvo.nome,
      codigo: profissionalSalvo.codigo,
      unidade_escolar_id: profissionalSalvo.unidade_escolar_id,
      vagas_vinculadas: novosVinculos,
      vagas_liberadas: vagasParaLiberar,
    },
  })

  // Retornar profissional completo atualizado
  const completo = await getProfissionalPorId(profissionalId)
  return completo || profissionalSalvo
}

/**
 * Exclui um profissional.
 * Desvincula e libera todas as suas vagas para status ABERTA antes da exclusão.
 */
export async function deleteProfissional(id: string): Promise<void> {
  const prof = await getProfissionalPorId(id)
  if (!prof) {
    throw new Error('Profissional não encontrado.')
  }

  const vagasVinculadasIds = (prof.vagas_vinculadas || []).map((v) => v.vaga_id)

  // 1. Liberar todas as vagas ocupadas por este profissional
  for (const vId of vagasVinculadasIds) {
    const { error: errLib } = await db
      .from('vaga')
      .update({
        servidor_id: null,
        nome_ocupante: null,
        cargo_id: null,
        status: 'ABERTA',
        updated_at: new Date().toISOString(),
      })
      .eq('id', vId)

    if (errLib) {
      console.error(`Erro ao liberar vaga ${vId} na exclusão do profissional:`, errLib)
    }
  }

  // 2. Excluir o registro do profissional (profissional_vagas é deletada por CASCADE)
  const { error } = await db.from('profissionais').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir profissional:', error)
    throw error
  }

  // 3. Registrar auditoria
  await registrarAuditoria({
    entidade: 'Profissionais',
    acao: 'Exclusão',
    registro_codigo: prof.codigo || null,
    descricao: `Profissional "${prof.nome}" (${prof.codigo}) excluído do sistema. ${vagasVinculadasIds.length} vaga(s) foram liberadas para ABERTA.`,
    detalhes: {
      profissional_id: id,
      nome: prof.nome,
      codigo: prof.codigo,
      vagas_liberadas: vagasVinculadasIds,
    },
  })
}

/**
 * Busca vagas de uma unidade escolar específica com detalhes de configuração RH e cargos permitidos
 */
export async function getVagasPorUnidade(
  unidadeId: string,
  anoLetivo?: number,
): Promise<VagaReal[]> {
  if (!unidadeId) return []

  const ano = anoLetivo || new Date().getFullYear()

  const { data, error } = await db
    .from('vaga')
    .select(
      `
      *,
      unidade_escolar:unidades_escolares(*),
      cargo:cargos(*),
      turma:turmas(*),
      configuracao_rh_linha:configuracao_rh_linha(
        *,
        cargos:configuracao_rh_linha_cargo(*, cargo:cargos(*))
      )
    `,
    )
    .eq('unidade_escolar_id', unidadeId)
    .eq('ano_letivo', ano)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`Erro ao buscar vagas da unidade ${unidadeId}:`, error)
    throw error
  }

  return (data as VagaReal[]) || []
}
