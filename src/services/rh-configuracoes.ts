import { supabase } from '@/lib/supabase/client'
import {
  RhVersaoConfiguracao,
  RhTipoAtendimento,
  RhNivel,
  RhCargoFuncao,
  RhRegraNivel,
  RhRegraPorTurmas,
  RhEscolaAnoLetivo,
  RhExcecaoVaga,
  RhVaga,
  RhServidor,
  RhLotacao,
  Cargo,
  Funcao,
  CondicaoCargoFuncao,
} from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'
import { calcularVagasPorte, validarContiguidadeNiveis } from './rh-calculo'

const db = supabase as any

// ----------------------------------------------------
// 1. VERSÕES DE CONFIGURAÇÃO
// ----------------------------------------------------

export async function getRhVersoes(): Promise<RhVersaoConfiguracao[]> {
  const { data, error } = await db
    .from('rh_versoes_configuracao')
    .select('*')
    .order('ano_letivo', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getRhVersaoVigente(anoLetivo: number): Promise<RhVersaoConfiguracao | null> {
  const { data, error } = await db
    .from('rh_versoes_configuracao')
    .select('*')
    .eq('ano_letivo', anoLetivo)
    .eq('status', 'VIGENTE')
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function createRhVersao(input: {
  ano_letivo: number
  descricao: string
  status?: 'RASCUNHO' | 'VIGENTE' | 'ARQUIVADA'
  criado_por?: string
}): Promise<RhVersaoConfiguracao> {
  const payload = {
    ano_letivo: input.ano_letivo,
    descricao: input.descricao,
    status: input.status || 'RASCUNHO',
    criado_por: input.criado_por || 'Sistema',
  }

  const { data, error } = await db
    .from('rh_versoes_configuracao')
    .insert([payload])
    .select('*')
    .single()

  if (error) throw error

  await registrarAuditoria({
    entidade: 'Versão de Configuração RH',
    acao: 'Criação',
    registro_codigo: data.codigo,
    descricao: `Criada nova versão de configuração RH ${data.codigo} (${data.descricao}) para o ano ${data.ano_letivo} com status ${data.status}.`,
    detalhes: data,
  })

  return data
}

export async function updateRhVersao(
  id: string,
  input: Partial<RhVersaoConfiguracao>,
): Promise<RhVersaoConfiguracao> {
  const { data, error } = await db
    .from('rh_versoes_configuracao')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  await registrarAuditoria({
    entidade: 'Versão de Configuração RH',
    acao: 'Edição',
    registro_codigo: data.codigo,
    descricao: `Atualizada versão de configuração RH ${data.codigo} (${data.descricao}). Status: ${data.status}.`,
    detalhes: data,
  })

  return data
}

export async function publicarRhVersao(id: string): Promise<RhVersaoConfiguracao> {
  // 1. Obter a versão
  const { data: versao, error: errV } = await db
    .from('rh_versoes_configuracao')
    .select('*')
    .eq('id', id)
    .single()
  if (errV) throw errV

  // 2. Validar contiguidade de todos os tipos de atendimento e seus níveis
  const tipos = await getRhTiposAtendimento(id)
  for (const t of tipos) {
    const niveis = await getRhNiveis(id, t.id)
    const validacao = validarContiguidadeNiveis(niveis)
    if (!validacao.valido) {
      throw new Error(
        `Não é possível publicar a versão: o tipo de atendimento "${t.nome}" possui inconsistências nas faixas de níveis:\n` +
          validacao.erros.join('\n'),
      )
    }
  }

  // 3. Arquivar versão vigente anterior do mesmo ano (se houver)
  await db
    .from('rh_versoes_configuracao')
    .update({ status: 'ARQUIVADA', updated_at: new Date().toISOString() })
    .eq('ano_letivo', versao.ano_letivo)
    .eq('status', 'VIGENTE')

  // 4. Marcar esta versão como VIGENTE
  const { data, error } = await db
    .from('rh_versoes_configuracao')
    .update({ status: 'VIGENTE', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  await registrarAuditoria({
    entidade: 'Versão de Configuração RH',
    acao: 'Edição',
    registro_codigo: data.codigo,
    descricao: `Publicada como VIGENTE a versão de configuração RH ${data.codigo} (${data.descricao}) para o ano ${data.ano_letivo}.`,
    detalhes: data,
  })

  return data
}

export async function duplicarRhVersao(
  origemId: string,
  novoAnoLetivo: number,
  novaDescricao: string,
): Promise<RhVersaoConfiguracao> {
  // 1. Carregar versão de origem
  const { data: origem, error: errOrig } = await db
    .from('rh_versoes_configuracao')
    .select('*')
    .eq('id', origemId)
    .single()
  if (errOrig) throw errOrig

  // 2. Criar nova versão como RASCUNHO
  const novaVersao = await createRhVersao({
    ano_letivo: novoAnoLetivo,
    descricao: novaDescricao,
    status: 'RASCUNHO',
  })

  // 3. Duplicar Matriz Cargo x Função
  const { data: matrizes } = await db.from('rh_cargo_funcao').select('*').eq('versao_id', origemId)
  if (matrizes && matrizes.length > 0) {
    const novasMatrizes = matrizes.map((m: any) => ({
      versao_id: novaVersao.id,
      cargo_id: m.cargo_id,
      funcao_id: m.funcao_id,
      condicao: m.condicao,
    }))
    await db.from('rh_cargo_funcao').insert(novasMatrizes)
  }

  // 4. Duplicar Tipos de Atendimento, Modalidades Excluídas, Níveis e Regras de Nível
  const { data: tipos } = await db
    .from('rh_tipos_atendimento')
    .select('*')
    .eq('versao_id', origemId)
  const mapaTiposAntigoParaNovo = new Map<string, string>()
  const mapaNiveisAntigoParaNovo = new Map<string, string>()

  if (tipos && tipos.length > 0) {
    for (const t of tipos) {
      const { data: novoT } = await db
        .from('rh_tipos_atendimento')
        .insert([
          {
            versao_id: novaVersao.id,
            nome: t.nome,
            criterio_porte: t.criterio_porte,
          },
        ])
        .select('*')
        .single()

      if (novoT) {
        mapaTiposAntigoParaNovo.set(t.id, novoT.id)

        // Modalidades excluídas
        const { data: mods } = await db
          .from('rh_modalidades_excluidas')
          .select('*')
          .eq('tipo_atendimento_id', t.id)
        if (mods && mods.length > 0) {
          const novasMods = mods.map((m: any) => ({
            tipo_atendimento_id: novoT.id,
            modalidade: m.modalidade,
          }))
          await db.from('rh_modalidades_excluidas').insert(novasMods)
        }

        // Níveis deste tipo
        const { data: niveis } = await db
          .from('rh_niveis')
          .select('*')
          .eq('versao_id', origemId)
          .eq('tipo_atendimento_id', t.id)
        if (niveis && niveis.length > 0) {
          for (const n of niveis) {
            const { data: novoN } = await db
              .from('rh_niveis')
              .insert([
                {
                  versao_id: novaVersao.id,
                  tipo_atendimento_id: novoT.id,
                  codigo_nivel: n.codigo_nivel,
                  ordem: n.ordem,
                  min_alunos: n.min_alunos,
                  max_alunos: n.max_alunos,
                },
              ])
              .select('*')
              .single()

            if (novoN) {
              mapaNiveisAntigoParaNovo.set(n.id, novoN.id)

              // Regras do Nível
              const { data: regrasNivel } = await db
                .from('rh_regras_nivel')
                .select('*')
                .eq('nivel_id', n.id)
              if (regrasNivel && regrasNivel.length > 0) {
                const novasRegras = regrasNivel.map((r: any) => ({
                  nivel_id: novoN.id,
                  funcao_id: r.funcao_id,
                  quantidade: r.quantidade,
                  base_calculo: r.base_calculo,
                  modalidade: r.modalidade,
                  dias_semana: r.dias_semana,
                  etapas_filtro: r.etapas_filtro,
                  observacao: r.observacao,
                }))
                await db.from('rh_regras_nivel').insert(novasRegras)
              }
            }
          }
        }
      }
    }
  }

  // 5. Duplicar Regras por Turmas
  const { data: regrasTurmas } = await db
    .from('rh_regras_turmas')
    .select('*')
    .eq('versao_id', origemId)
  if (regrasTurmas && regrasTurmas.length > 0) {
    const novasRegrasTurma = regrasTurmas.map((rt: any) => ({
      versao_id: novaVersao.id,
      funcao_id: rt.funcao_id,
      tipo_atendimento_id: rt.tipo_atendimento_id
        ? mapaTiposAntigoParaNovo.get(rt.tipo_atendimento_id) || null
        : null,
      min_turmas: rt.min_turmas,
      max_turmas: rt.max_turmas,
      qtd_fixo: rt.qtd_fixo,
      qtd_itinerante: rt.qtd_itinerante,
    }))
    await db.from('rh_regras_turmas').insert(novasRegrasTurma)
  }

  await registrarAuditoria({
    entidade: 'Versão de Configuração RH',
    acao: 'Criação',
    registro_codigo: novaVersao.codigo,
    descricao: `Duplicada versão ${origem.codigo} para nova versão ${novaVersao.codigo} (${novaVersao.descricao}) no ano ${novoAnoLetivo}.`,
    detalhes: { origemId, novoAnoLetivo, novaVersao },
  })

  return novaVersao
}

// ----------------------------------------------------
// 2. TIPOS DE ATENDIMENTO, MODALIDADES E NÍVEIS
// ----------------------------------------------------

export async function getRhTiposAtendimento(versaoId: string): Promise<RhTipoAtendimento[]> {
  const { data, error } = await db
    .from('rh_tipos_atendimento')
    .select('*, rh_modalidades_excluidas(modalidade)')
    .eq('versao_id', versaoId)
    .order('nome', { ascending: true })

  if (error) throw error
  return (data || []).map((t: any) => ({
    ...t,
    modalidades_excluidas: (t.rh_modalidades_excluidas || []).map((m: any) => m.modalidade),
  }))
}

export async function salvarTipoAtendimento(
  versaoId: string,
  tipo: Partial<RhTipoAtendimento>,
  modalidadesExcluidas: string[],
): Promise<RhTipoAtendimento> {
  let tipoId = tipo.id

  if (!tipoId) {
    const { data, error } = await db
      .from('rh_tipos_atendimento')
      .insert([
        {
          versao_id: versaoId,
          nome: tipo.nome,
          criterio_porte: tipo.criterio_porte || 'ALUNOS',
        },
      ])
      .select('*')
      .single()
    if (error) throw error
    tipoId = data.id
  } else {
    const { error } = await db
      .from('rh_tipos_atendimento')
      .update({
        nome: tipo.nome,
        criterio_porte: tipo.criterio_porte || 'ALUNOS',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tipoId)
    if (error) throw error
  }

  // Atualizar modalidades excluídas
  await db.from('rh_modalidades_excluidas').delete().eq('tipo_atendimento_id', tipoId)
  if (modalidadesExcluidas && modalidadesExcluidas.length > 0) {
    const rows = modalidadesExcluidas.map((m) => ({
      tipo_atendimento_id: tipoId,
      modalidade: m,
    }))
    await db.from('rh_modalidades_excluidas').insert(rows)
  }

  const { data: finalTipo } = await db
    .from('rh_tipos_atendimento')
    .select('*')
    .eq('id', tipoId)
    .single()

  await registrarAuditoria({
    entidade: 'Tipos de Atendimento RH',
    acao: tipo.id ? 'Edição' : 'Criação',
    registro_codigo: finalTipo.codigo,
    descricao: `Salvo Tipo de Atendimento ${finalTipo.codigo} (${finalTipo.nome}) com modalidades excluídas: ${modalidadesExcluidas.join(', ')}.`,
    detalhes: { finalTipo, modalidadesExcluidas },
  })

  return { ...finalTipo, modalidades_excluidas: modalidadesExcluidas as any }
}

export async function getRhNiveis(
  versaoId: string,
  tipoAtendimentoId?: string,
): Promise<RhNivel[]> {
  let query = db.from('rh_niveis').select('*').eq('versao_id', versaoId)
  if (tipoAtendimentoId) query = query.eq('tipo_atendimento_id', tipoAtendimentoId)
  query = query.order('ordem', { ascending: true }).order('min_alunos', { ascending: true })

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function salvarRhNivel(versaoId: string, nivel: Partial<RhNivel>): Promise<RhNivel> {
  let saved: any
  if (!nivel.id) {
    const { data, error } = await db
      .from('rh_niveis')
      .insert([
        {
          versao_id: versaoId,
          tipo_atendimento_id: nivel.tipo_atendimento_id,
          codigo_nivel: nivel.codigo_nivel,
          ordem: nivel.ordem || 1,
          min_alunos: nivel.min_alunos || 0,
          max_alunos: nivel.max_alunos ?? null,
        },
      ])
      .select('*')
      .single()
    if (error) throw error
    saved = data
  } else {
    const { data, error } = await db
      .from('rh_niveis')
      .update({
        codigo_nivel: nivel.codigo_nivel,
        ordem: nivel.ordem,
        min_alunos: nivel.min_alunos,
        max_alunos: nivel.max_alunos ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', nivel.id)
      .select('*')
      .single()
    if (error) throw error
    saved = data
  }

  await registrarAuditoria({
    entidade: 'Níveis de Porte RH',
    acao: nivel.id ? 'Edição' : 'Criação',
    registro_codigo: saved.codigo,
    descricao: `Salvo Nível de Porte ${saved.codigo_nivel} (${saved.min_alunos} a ${saved.max_alunos ?? 'sem teto'} alunos).`,
    detalhes: saved,
  })

  return saved
}

export async function deleteRhNivel(id: string): Promise<void> {
  const { data: nivel } = await db.from('rh_niveis').select('*').eq('id', id).single()
  const { error } = await db.from('rh_niveis').delete().eq('id', id)
  if (error) throw error

  if (nivel) {
    await registrarAuditoria({
      entidade: 'Níveis de Porte RH',
      acao: 'Exclusão',
      registro_codigo: nivel.codigo,
      descricao: `Excluído Nível de Porte ${nivel.codigo_nivel}.`,
      detalhes: nivel,
    })
  }
}

// ----------------------------------------------------
// 3. MATRIZ CARGO × FUNÇÃO COM CONDIÇÃO
// ----------------------------------------------------

export async function getRhMatrizCargoFuncao(versaoId: string): Promise<RhCargoFuncao[]> {
  const { data, error } = await db
    .from('rh_cargo_funcao')
    .select('*, cargo:cargos(*), funcao:funcoes(*)')
    .eq('versao_id', versaoId)

  if (error) throw error
  return data || []
}

export async function salvarRhVinculoCargoFuncao(
  versaoId: string,
  cargoId: string,
  funcaoId: string,
  habilitado: boolean,
  condicao: CondicaoCargoFuncao = 'NENHUMA',
): Promise<void> {
  if (habilitado) {
    const { error } = await db.from('rh_cargo_funcao').upsert(
      {
        versao_id: versaoId,
        cargo_id: cargoId,
        funcao_id: funcaoId,
        condicao,
      },
      { onConflict: 'versao_id,cargo_id,funcao_id' },
    )
    if (error) throw error
  } else {
    const { error } = await db
      .from('rh_cargo_funcao')
      .delete()
      .eq('versao_id', versaoId)
      .eq('cargo_id', cargoId)
      .eq('funcao_id', funcaoId)
    if (error) throw error
  }

  await registrarAuditoria({
    entidade: 'Matriz Cargo x Função RH',
    acao: habilitado ? 'Edição' : 'Exclusão',
    descricao: `${habilitado ? 'Habilitado' : 'Desabilitado'} vínculo Cargo ${cargoId} x Função ${funcaoId} (Condição: ${condicao}).`,
    detalhes: { versaoId, cargoId, funcaoId, habilitado, condicao },
  })
}

// ----------------------------------------------------
// 4. REGRAS DE NÍVEL E REGRAS POR TURMAS
// ----------------------------------------------------

export async function getRhRegrasNivel(versaoId: string): Promise<RhRegraNivel[]> {
  // Busca níveis da versão
  const niveis = await getRhNiveis(versaoId)
  if (niveis.length === 0) return []
  const nivelIds = niveis.map((n) => n.id)

  const { data, error } = await db
    .from('rh_regras_nivel')
    .select('*, funcao:funcoes(*)')
    .in('nivel_id', nivelIds)

  if (error) throw error
  return data || []
}

export async function salvarRhRegraNivel(regra: Partial<RhRegraNivel>): Promise<RhRegraNivel> {
  let saved: any
  if (!regra.id) {
    const { data, error } = await db
      .from('rh_regras_nivel')
      .insert([
        {
          nivel_id: regra.nivel_id,
          funcao_id: regra.funcao_id,
          quantidade: regra.quantidade ?? 1,
          base_calculo: regra.base_calculo || 'FIXO_ESCOLA',
          modalidade: regra.modalidade || 'FIXO',
          dias_semana: regra.dias_semana ?? null,
          etapas_filtro: regra.etapas_filtro || [],
          observacao: regra.observacao || null,
        },
      ])
      .select('*')
      .single()
    if (error) throw error
    saved = data
  } else {
    const { data, error } = await db
      .from('rh_regras_nivel')
      .update({
        quantidade: regra.quantidade,
        base_calculo: regra.base_calculo,
        modalidade: regra.modalidade,
        dias_semana: regra.dias_semana ?? null,
        etapas_filtro: regra.etapas_filtro || [],
        observacao: regra.observacao || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', regra.id)
      .select('*')
      .single()
    if (error) throw error
    saved = data
  }

  await registrarAuditoria({
    entidade: 'Regras de Nível RH',
    acao: regra.id ? 'Edição' : 'Criação',
    registro_codigo: saved.codigo,
    descricao: `Salva regra de nível para função ${saved.funcao_id}: qtd ${saved.quantidade} (${saved.base_calculo}, ${saved.modalidade}).`,
    detalhes: saved,
  })

  return saved
}

export async function getRhRegrasTurmas(versaoId: string): Promise<RhRegraPorTurmas[]> {
  const { data, error } = await db
    .from('rh_regras_turmas')
    .select('*, funcao:funcoes(*), tipo_atendimento:rh_tipos_atendimento(*)')
    .eq('versao_id', versaoId)
    .order('min_turmas', { ascending: true })

  if (error) throw error
  return data || []
}

export async function salvarRhRegraTurma(
  versaoId: string,
  regra: Partial<RhRegraPorTurmas>,
): Promise<RhRegraPorTurmas> {
  let saved: any
  if (!regra.id) {
    const { data, error } = await db
      .from('rh_regras_turmas')
      .insert([
        {
          versao_id: versaoId,
          funcao_id: regra.funcao_id,
          tipo_atendimento_id: regra.tipo_atendimento_id || null,
          min_turmas: regra.min_turmas || 1,
          max_turmas: regra.max_turmas ?? null,
          qtd_fixo: regra.qtd_fixo || 0,
          qtd_itinerante: regra.qtd_itinerante || 0,
        },
      ])
      .select('*')
      .single()
    if (error) throw error
    saved = data
  } else {
    const { data, error } = await db
      .from('rh_regras_turmas')
      .update({
        tipo_atendimento_id: regra.tipo_atendimento_id || null,
        min_turmas: regra.min_turmas,
        max_turmas: regra.max_turmas ?? null,
        qtd_fixo: regra.qtd_fixo,
        qtd_itinerante: regra.qtd_itinerante,
        updated_at: new Date().toISOString(),
      })
      .eq('id', regra.id)
      .select('*')
      .single()
    if (error) throw error
    saved = data
  }

  await registrarAuditoria({
    entidade: 'Regras por Turmas RH',
    acao: regra.id ? 'Edição' : 'Criação',
    registro_codigo: saved.codigo,
    descricao: `Salva regra por turmas: faixa ${saved.min_turmas} a ${saved.max_turmas ?? '∞'} turmas -> ${saved.qtd_fixo} fixo + ${saved.qtd_itinerante} itinerante.`,
    detalhes: saved,
  })

  return saved
}

export async function deleteRhRegraTurma(id: string): Promise<void> {
  const { data: r } = await db.from('rh_regras_turmas').select('*').eq('id', id).single()
  const { error } = await db.from('rh_regras_turmas').delete().eq('id', id)
  if (error) throw error
  if (r) {
    await registrarAuditoria({
      entidade: 'Regras por Turmas RH',
      acao: 'Exclusão',
      registro_codigo: r.codigo,
      descricao: `Excluída regra por turma ${r.codigo}.`,
      detalhes: r,
    })
  }
}

// ----------------------------------------------------
// 5. ESCOLA / ANO LETIVO (CENÁRIO), EXCEÇÕES E VAGAS
// ----------------------------------------------------

export async function getRhEscolaAno(
  escolaId: string,
  anoLetivo: number,
): Promise<RhEscolaAnoLetivo | null> {
  const { data, error } = await db
    .from('rh_escolas_ano')
    .select(
      '*, escola:unidades_escolares(*), nivel_calculado:rh_niveis!rh_escolas_ano_nivel_calculado_id_fkey(*), nivel_override:rh_niveis!rh_escolas_ano_nivel_override_id_fkey(*), tipo_atendimento:rh_tipos_atendimento(*)',
    )
    .eq('escola_id', escolaId)
    .eq('ano_letivo', anoLetivo)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function salvarRhEscolaAno(
  cenario: Partial<RhEscolaAnoLetivo>,
): Promise<RhEscolaAnoLetivo> {
  let saved: any
  if (!cenario.id) {
    const { data, error } = await db
      .from('rh_escolas_ano')
      .insert([
        {
          escola_id: cenario.escola_id,
          ano_letivo: cenario.ano_letivo,
          tipo_atendimento_id: cenario.tipo_atendimento_id || null,
          alunos_total: cenario.alunos_total || 0,
          alunos_por_modalidade: cenario.alunos_por_modalidade || {
            jornada_ampliada: 0,
            eja: 0,
            srm: 0,
          },
          turnos: cenario.turnos || ['MATUTINO', 'VESPERTINO'],
          metragem_m2: cenario.metragem_m2 || 0,
          nivel_calculado_id: cenario.nivel_calculado_id || null,
          nivel_override_id: cenario.nivel_override_id || null,
          justificativa_override: cenario.justificativa_override || null,
          versao_id: cenario.versao_id || null,
        },
      ])
      .select('*')
      .single()
    if (error) throw error
    saved = data
  } else {
    const { data, error } = await db
      .from('rh_escolas_ano')
      .update({
        tipo_atendimento_id: cenario.tipo_atendimento_id || null,
        alunos_total: cenario.alunos_total,
        alunos_por_modalidade: cenario.alunos_por_modalidade,
        turnos: cenario.turnos,
        metragem_m2: cenario.metragem_m2,
        nivel_calculado_id: cenario.nivel_calculado_id || null,
        nivel_override_id: cenario.nivel_override_id || null,
        justificativa_override: cenario.justificativa_override || null,
        versao_id: cenario.versao_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cenario.id)
      .select('*')
      .single()
    if (error) throw error
    saved = data
  }

  await registrarAuditoria({
    entidade: 'Cenário Escola RH',
    acao: cenario.id ? 'Edição' : 'Criação',
    registro_codigo: saved.codigo,
    descricao: `Salvo cenário de porte da escola ${saved.escola_id} (${saved.ano_letivo}): ${saved.alunos_total} alunos, Override: ${saved.nivel_override_id ? 'Sim' : 'Não'}.`,
    detalhes: saved,
  })

  return saved
}

export async function getRhExcecoesVaga(escolaAnoId: string): Promise<RhExcecaoVaga[]> {
  const { data, error } = await db
    .from('rh_excecoes_vaga')
    .select('*, funcao:funcoes(*)')
    .eq('escola_ano_id', escolaAnoId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function salvarRhExcecaoVaga(excecao: Partial<RhExcecaoVaga>): Promise<RhExcecaoVaga> {
  const payload = {
    escola_ano_id: excecao.escola_ano_id,
    funcao_id: excecao.funcao_id,
    delta: excecao.delta,
    justificativa: excecao.justificativa,
    autorizado_por: excecao.autorizado_por || 'SEMED',
    data: excecao.data || new Date().toISOString().split('T')[0],
  }

  let saved: any
  if (!excecao.id) {
    const { data, error } = await db.from('rh_excecoes_vaga').insert([payload]).select('*').single()
    if (error) throw error
    saved = data
  } else {
    const { data, error } = await db
      .from('rh_excecoes_vaga')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', excecao.id)
      .select('*')
      .single()
    if (error) throw error
    saved = data
  }

  await registrarAuditoria({
    entidade: 'Exceção de Vaga SEMED',
    acao: excecao.id ? 'Edição' : 'Criação',
    registro_codigo: saved.codigo,
    descricao: `Ajuste de exceção SEMED (${saved.delta > 0 ? `+${saved.delta}` : saved.delta} vagas) para função ${saved.funcao_id}. Justificativa: "${saved.justificativa}".`,
    detalhes: saved,
  })

  return saved
}

export async function deleteRhExcecaoVaga(id: string): Promise<void> {
  const { data: exc } = await db.from('rh_excecoes_vaga').select('*').eq('id', id).single()
  const { error } = await db.from('rh_excecoes_vaga').delete().eq('id', id)
  if (error) throw error
  if (exc) {
    await registrarAuditoria({
      entidade: 'Exceção de Vaga SEMED',
      acao: 'Exclusão',
      registro_codigo: exc.codigo,
      descricao: `Removida exceção de vaga SEMED ${exc.codigo}.`,
      detalhes: exc,
    })
  }
}

export async function getRhVagasEscolaAno(escolaAnoId: string): Promise<RhVaga[]> {
  const { data, error } = await db
    .from('rh_vagas')
    .select('*, funcao:funcoes(*), servidor:rh_servidores(*)')
    .eq('escola_ano_id', escolaAnoId)
    .order('funcao_id')
    .order('sequencial')

  if (error) throw error
  return data || []
}

export async function getRhVagasItinerantes(anoLetivo?: number): Promise<RhVaga[]> {
  let query = db
    .from('rh_vagas')
    .select(
      '*, funcao:funcoes(*), servidor:rh_servidores(*), escola_ano:rh_escolas_ano(*, escola:unidades_escolares(*))',
    )
    .eq('modalidade', 'ITINERANTE')

  const { data, error } = await query
  if (error) throw error
  let vagas = data || []
  if (anoLetivo) {
    vagas = vagas.filter((v: any) => v.escola_ano?.ano_letivo === anoLetivo)
  }
  return vagas
}

/**
 * Persiste o resultado calculado das vagas com idempotência estrita
 */
export async function persistirVagasCalculadas(
  escolaAnoId: string,
  versaoId: string | null,
  vagasCalculadas: any[],
): Promise<void> {
  // 1. Ler vagas atuais
  const { data: existentes } = await db
    .from('rh_vagas')
    .select('*')
    .eq('escola_ano_id', escolaAnoId)

  const existentesMap = new Map<string, any>((existentes || []).map((e: any) => [e.id, e]))
  const idsPreservados = new Set<string>()

  for (const v of vagasCalculadas) {
    if (v.id && existentesMap.has(v.id)) {
      // Atualização de vaga existente (preservando ID e vínculo de servidor/status)
      idsPreservados.add(v.id)
      await db
        .from('rh_vagas')
        .update({
          status: v.status,
          turno: v.turno || null,
          modalidade: v.modalidade,
          dias_semana: v.diasSemana || null,
          observacao: v.observacao || null,
          sequencial: v.sequencial,
          updated_at: new Date().toISOString(),
        })
        .eq('id', v.id)
    } else {
      // Criação de nova vaga
      const { data: newV } = await db
        .from('rh_vagas')
        .insert([
          {
            escola_ano_id: escolaAnoId,
            versao_id: versaoId,
            funcao_id: v.funcaoId,
            turno: v.turno || null,
            modalidade: v.modalidade,
            dias_semana: v.diasSemana || null,
            origem: v.origem,
            regra_origem_id: v.regraOrigemId || null,
            status: v.status || 'ABERTA',
            servidor_id: v.servidorId || null,
            sequencial: v.sequencial,
            observacao: v.observacao || null,
          },
        ])
        .select('id')
        .single()

      if (newV) idsPreservados.add(newV.id)
    }
  }

  // Deletar apenas vagas que NÃO estavam ocupadas e que deixaram de existir
  for (const [id, e] of existentesMap.entries()) {
    if (!idsPreservados.has(id)) {
      if (e.status !== 'OCUPADA') {
        await db.from('rh_vagas').delete().eq('id', id)
      } else {
        // Se era ocupada, não apaga: vira excedente
        await db.from('rh_vagas').update({ status: 'EXCEDENTE' }).eq('id', id)
      }
    }
  }

  await registrarAuditoria({
    entidade: 'Vagas Geradas RH',
    acao: 'Edição',
    descricao: `Regeradas e persistidas ${vagasCalculadas.length} vagas para o cenário ${escolaAnoId}.`,
    detalhes: { escolaAnoId, totalVagas: vagasCalculadas.length },
  })
}

// ----------------------------------------------------
// 6. LOTAÇÕES E SERVIDORES
// ----------------------------------------------------

export async function getRhServidores(): Promise<RhServidor[]> {
  const { data, error } = await db.from('rh_servidores').select('*, cargo:cargos(*)').order('nome')

  if (error) throw error
  return data || []
}

export async function getRhLotacoes(escolaId?: string): Promise<RhLotacao[]> {
  let query = db
    .from('rh_lotacoes')
    .select('*, servidor:rh_servidores(*), cargo:cargos(*), funcao:funcoes(*)')
  if (escolaId) query = query.eq('escola_id', escolaId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}
