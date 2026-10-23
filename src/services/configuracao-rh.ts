import { supabase } from '@/lib/supabase/client'
import {
  ConfiguracaoRh,
  ConfiguracaoRhNivel,
  ConfiguracaoRhLinha,
  ConfiguracaoRhVaga,
  ConfiguracaoRhCompleta,
  StatusConfiguracaoRh,
} from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'
import { validarContiguidadeNiveis } from './configuracao-rh-calculo'

const db = supabase as any

/**
 * Busca todas as configurações de RH cadastradas
 */
export async function getConfiguracoesRh(): Promise<ConfiguracaoRh[]> {
  const { data, error } = await db
    .from('configuracao_rh')
    .select('*')
    .order('ano_letivo', { ascending: false })
    .order('tipo_atendimento', { ascending: true })

  if (error) {
    console.error('Erro ao buscar configurações de RH:', error)
    throw error
  }
  return data || []
}

/**
 * Carrega a configuração completa por ID:
 * cabeçalho, níveis ordenados, linhas com cargos vinculados e células de vagas (matriz)
 */
export async function getConfiguracaoRhCompleta(
  id: string,
): Promise<ConfiguracaoRhCompleta | null> {
  if (!id) return null

  // 1. Cabeçalho da configuração
  const { data: cfg, error: cfgError } = await db
    .from('configuracao_rh')
    .select('*')
    .eq('id', id)
    .single()

  if (cfgError || !cfg) {
    if (cfgError?.code === 'PGRST116') return null
    console.error('Erro ao buscar configuração RH:', cfgError)
    throw cfgError
  }

  // 2. Níveis ordenados
  const { data: niveis, error: nivError } = await db
    .from('configuracao_rh_nivel')
    .select('*')
    .eq('configuracao_rh_id', id)
    .order('ordem', { ascending: true })

  if (nivError) {
    console.error('Erro ao buscar níveis da configuração RH:', nivError)
    throw nivError
  }

  // 3. Linhas com funções e cargos
  const { data: linhas, error: linError } = await db
    .from('configuracao_rh_linha')
    .select(`
      *,
      funcao:funcoes (id, codigo, nome, descricao, exige_autorizacao_semed),
      cargos:configuracao_rh_linha_cargo (
        id,
        linha_id,
        cargo_id,
        condicao,
        cargo:cargos (id, codigo, nome, carga_horaria)
      )
    `)
    .eq('configuracao_rh_id', id)
    .order('ordem', { ascending: true })

  if (linError) {
    console.error('Erro ao buscar linhas da configuração RH:', linError)
    throw linError
  }

  // 4. Vagas (células da matriz)
  const linhaIds = (linhas || []).map((l: any) => l.id)
  let vagas: ConfiguracaoRhVaga[] = []

  if (linhaIds.length > 0) {
    const { data: vagasData, error: vagError } = await db
      .from('configuracao_rh_vaga')
      .select('*')
      .in('linha_id', linhaIds)

    if (vagError) {
      console.error('Erro ao buscar células de vagas:', vagError)
      throw vagError
    }
    vagas = vagasData || []
  }

  return {
    ...cfg,
    niveis: niveis || [],
    linhas: linhas || [],
    vagas,
  }
}

/**
 * Cria ou atualiza o cabeçalho de uma configuração
 */
export async function salvarConfiguracaoRhCabecalho(
  input: Partial<ConfiguracaoRh> & { tipo_atendimento: string; ano_letivo: number },
  usuarioNome = 'Sistema',
  usuarioEmail = 'sistema@local',
): Promise<ConfiguracaoRh> {
  const isEdicao = Boolean(input.id)

  const payload: any = {
    tipo_atendimento: input.tipo_atendimento.trim(),
    ano_letivo: input.ano_letivo,
    status: input.status || 'RASCUNHO',
    observacao: input.observacao?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  if (input.id) {
    payload.id = input.id
  }

  const { data, error } = await db.from('configuracao_rh').upsert(payload).select().single()

  if (error) {
    console.error('Erro ao salvar cabeçalho de configuração RH:', error)
    throw error
  }

  await registrarAuditoria({
    entidade: 'Configuração RH',
    acao: isEdicao ? 'Edição' : 'Criação',
    registro_codigo: data.codigo || null,
    descricao: `${isEdicao ? 'Atualizou' : 'Criou'} configuração de RH "${data.tipo_atendimento}" (${data.ano_letivo}) com status ${data.status}.`,
    detalhes: {
      id: data.id,
      tipo_atendimento: data.tipo_atendimento,
      ano_letivo: data.ano_letivo,
      status: data.status,
    },
  })

  return data
}

/**
 * Altera o status da configuração (ex: publicar para VIGENTE ou arquivar).
 * Se for marcar como VIGENTE, valida as faixas e garante a unicidade por ano + tipo de atendimento.
 */
export async function alterarStatusConfiguracaoRh(
  id: string,
  novoStatus: StatusConfiguracaoRh,
  usuarioNome = 'Sistema',
  usuarioEmail = 'sistema@local',
): Promise<ConfiguracaoRh> {
  const cfg = await getConfiguracaoRhCompleta(id)
  if (!cfg) throw new Error('Configuração não encontrada.')

  // Validação de faixas se for publicar como VIGENTE
  if (novoStatus === 'VIGENTE') {
    const validacao = validarContiguidadeNiveis(cfg.niveis)
    if (!validacao.valido) {
      throw new Error(
        `Não é possível publicar como VIGENTE pois as faixas de alunos contêm inconsistências:\n- ${validacao.erros.join('\n- ')}`,
      )
    }

    // Se já houver outra VIGENTE com mesmo tipo e ano, arquivar a anterior
    const { data: existente } = await db
      .from('configuracao_rh')
      .select('id, codigo')
      .eq('tipo_atendimento', cfg.tipo_atendimento)
      .eq('ano_letivo', cfg.ano_letivo)
      .eq('status', 'VIGENTE')
      .neq('id', id)
      .maybeSingle()

    if (existente) {
      await db
        .from('configuracao_rh')
        .update({ status: 'ARQUIVADA', updated_at: new Date().toISOString() })
        .eq('id', existente.id)
    }
  }

  const { data, error } = await db
    .from('configuracao_rh')
    .update({ status: novoStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar status da configuração RH:', error)
    throw error
  }

  await registrarAuditoria({
    entidade: 'Configuração RH',
    acao: 'Status',
    registro_codigo: data.codigo || null,
    descricao: `Alterou status da configuração RH "${data.tipo_atendimento}" (${data.ano_letivo}) de ${cfg.status} para ${novoStatus}.`,
    detalhes: { id: data.id, statusAnterior: cfg.status, novoStatus },
  })

  return data
}

/**
 * Ação "Duplicar": cria a configuração de outro ano copiando níveis, linhas, células e cargos.
 */
export async function duplicarConfiguracaoRh(
  origemId: string,
  novoAnoLetivo: number,
  novoTipoAtendimento?: string,
  usuarioNome = 'Sistema',
  usuarioEmail = 'sistema@local',
): Promise<ConfiguracaoRhCompleta> {
  const origem = await getConfiguracaoRhCompleta(origemId)
  if (!origem) throw new Error('Configuração de origem não encontrada.')

  const tipoFinal = (novoTipoAtendimento || origem.tipo_atendimento).trim()

  // 1. Criar novo cabeçalho em RASCUNHO
  const { data: novaCfg, error: errCfg } = await db
    .from('configuracao_rh')
    .insert({
      tipo_atendimento: tipoFinal,
      ano_letivo: novoAnoLetivo,
      status: 'RASCUNHO',
      observacao: `Duplicada a partir de ${origem.codigo || 'configuração'} (${origem.ano_letivo}) em ${new Date().toLocaleDateString('pt-BR')}.`,
    })
    .select()
    .single()

  if (errCfg || !novaCfg) {
    console.error('Erro ao duplicar cabeçalho da configuração RH:', errCfg)
    throw errCfg || new Error('Falha ao duplicar cabeçalho.')
  }

  // 2. Duplicar Níveis e mapear IDs antigos -> novos
  const mapaNiveis = new Map<string, string>()
  for (const n of origem.niveis) {
    const { data: novoNivel, error: errNiv } = await db
      .from('configuracao_rh_nivel')
      .insert({
        configuracao_rh_id: novaCfg.id,
        codigo_nivel: n.codigo_nivel,
        ordem: n.ordem,
        min_alunos: n.min_alunos,
        max_alunos: n.max_alunos,
        observacao: n.observacao,
      })
      .select()
      .single()

    if (errNiv || !novoNivel) {
      console.error('Erro ao duplicar nível:', errNiv)
      throw errNiv
    }
    mapaNiveis.set(n.id, novoNivel.id)
  }

  // 3. Duplicar Linhas e cargos, e células de vagas
  for (const l of origem.linhas) {
    const { data: novaLinha, error: errLin } = await db
      .from('configuracao_rh_linha')
      .insert({
        configuracao_rh_id: novaCfg.id,
        funcao_id: l.funcao_id,
        ordem: l.ordem,
        base_calculo: l.base_calculo,
        etapas_filtro: l.etapas_filtro,
        observacao: l.observacao,
      })
      .select()
      .single()

    if (errLin || !novaLinha) {
      console.error('Erro ao duplicar linha:', errLin)
      throw errLin
    }

    // Duplicar cargos da linha
    if (l.cargos && l.cargos.length > 0) {
      const cargosInsert = l.cargos.map((c) => ({
        linha_id: novaLinha.id,
        cargo_id: c.cargo_id,
        condicao: c.condicao,
      }))
      const { error: errCargos } = await db.from('configuracao_rh_linha_cargo').insert(cargosInsert)

      if (errCargos) console.error('Erro ao duplicar cargos da linha:', errCargos)
    }

    // Duplicar células de vagas dessa linha
    const vagasLinha = origem.vagas.filter((v) => v.linha_id === l.id)
    if (vagasLinha.length > 0) {
      const vagasInsert = vagasLinha
        .map((v) => {
          const novoNivelId = mapaNiveis.get(v.nivel_id)
          if (!novoNivelId) return null
          return {
            linha_id: novaLinha.id,
            nivel_id: novoNivelId,
            quantidade: v.quantidade,
            modalidade: v.modalidade,
            dias_semana: v.dias_semana,
          }
        })
        .filter(Boolean)

      if (vagasInsert.length > 0) {
        const { error: errVagas } = await db.from('configuracao_rh_vaga').insert(vagasInsert)

        if (errVagas) console.error('Erro ao duplicar células de vagas:', errVagas)
      }
    }
  }

  await registrarAuditoria({
    entidade: 'Configuração RH',
    acao: 'Duplicação',
    registro_codigo: novaCfg.codigo || null,
    descricao: `Duplicou a configuração ${origem.codigo || origem.tipo_atendimento} (${origem.ano_letivo}) para o ano ${novoAnoLetivo} gerando ${novaCfg.codigo}.`,
    detalhes: {
      origem_id: origemId,
      novo_id: novaCfg.id,
      ano_letivo: novoAnoLetivo,
      tipo_atendimento: tipoFinal,
    },
  })

  const completa = await getConfiguracaoRhCompleta(novaCfg.id)
  return completa!
}

/**
 * Salva toda a matriz de níveis, linhas, cargos e células de vagas de uma configuração.
 * Valida a contiguidade das faixas antes de salvar.
 */
export async function salvarEstruturaCompletaConfiguracaoRh(
  configuracaoId: string,
  dados: {
    niveis: Array<
      Omit<ConfiguracaoRhNivel, 'id' | 'codigo' | 'configuracao_rh_id'> & { id?: string }
    >
    linhas: Array<
      Omit<ConfiguracaoRhLinha, 'id' | 'codigo' | 'configuracao_rh_id' | 'funcao' | 'cargos'> & {
        id?: string
        cargos?: Array<{ cargo_id: string; condicao: any }>
      }
    >
    vagas: Array<{
      linhaIndex: number
      nivelIndex: number
      quantidade: number
      modalidade: any
      dias_semana?: number | null
    }>
  },
  usuarioNome = 'Sistema',
  usuarioEmail = 'sistema@local',
): Promise<ConfiguracaoRhCompleta> {
  if (!configuracaoId) throw new Error('ID da configuração é obrigatório.')

  // 1. Validar faixas de alunos
  const validacao = validarContiguidadeNiveis(dados.niveis as any)
  if (!validacao.valido) {
    throw new Error(`Faixas de alunos inválidas:\n- ${validacao.erros.join('\n- ')}`)
  }

  // 2. Limpar níveis, linhas e vagas antigas e regravar com ids limpos
  // (Ou remover tudo da configuração e recriar na mesma transação lógica)
  await db.from('configuracao_rh_vaga').delete().match({ '': '' }) // via cascade de linha
  await db.from('configuracao_rh_linha').delete().eq('configuracao_rh_id', configuracaoId)
  await db.from('configuracao_rh_nivel').delete().eq('configuracao_rh_id', configuracaoId)

  // 3. Inserir novos níveis
  const novosNiveisIds: string[] = []
  for (let i = 0; i < dados.niveis.length; i++) {
    const n = dados.niveis[i]
    const { data: nivData, error: nivErr } = await db
      .from('configuracao_rh_nivel')
      .insert({
        configuracao_rh_id: configuracaoId,
        codigo_nivel: n.codigo_nivel.trim(),
        ordem: i + 1,
        min_alunos: Number(n.min_alunos) || 0,
        max_alunos:
          n.max_alunos !== null && n.max_alunos !== undefined ? Number(n.max_alunos) : null,
        observacao: n.observacao?.trim() || null,
      })
      .select()
      .single()

    if (nivErr || !nivData) throw nivErr || new Error('Falha ao salvar nível.')
    novosNiveisIds.push(nivData.id)
  }

  // 4. Inserir novas linhas e seus cargos
  const novasLinhasIds: string[] = []
  for (let i = 0; i < dados.linhas.length; i++) {
    const l = dados.linhas[i]
    const { data: linData, error: linErr } = await db
      .from('configuracao_rh_linha')
      .insert({
        configuracao_rh_id: configuracaoId,
        funcao_id: l.funcao_id,
        ordem: i + 1,
        base_calculo: l.base_calculo,
        etapas_filtro: l.etapas_filtro && l.etapas_filtro.length > 0 ? l.etapas_filtro : null,
        observacao: l.observacao?.trim() || null,
      })
      .select()
      .single()

    if (linErr || !linData) throw linErr || new Error('Falha ao salvar linha.')
    novasLinhasIds.push(linData.id)

    // Cargos da linha
    if (l.cargos && l.cargos.length > 0) {
      const cargosInsert = l.cargos.map((c) => ({
        linha_id: linData.id,
        cargo_id: c.cargo_id,
        condicao: c.condicao || 'NENHUMA',
      }))
      await db.from('configuracao_rh_linha_cargo').insert(cargosInsert)
    }
  }

  // 5. Inserir células de vagas (linha × nível)
  const vagasInsert = dados.vagas
    .map((v) => {
      const linhaId = novasLinhasIds[v.linhaIndex]
      const nivelId = novosNiveisIds[v.nivelIndex]
      if (!linhaId || !nivelId) return null

      return {
        linha_id: linhaId,
        nivel_id: nivelId,
        quantidade: Math.max(0, Number(v.quantidade) || 0),
        modalidade: v.modalidade || 'FIXO',
        dias_semana: v.modalidade === 'ITINERANTE' && v.dias_semana ? Number(v.dias_semana) : null,
      }
    })
    .filter(Boolean)

  if (vagasInsert.length > 0) {
    const { error: vagErr } = await db.from('configuracao_rh_vaga').insert(vagasInsert)
    if (vagErr) throw vagErr
  }

  // Atualizar updated_at do cabeçalho
  await db
    .from('configuracao_rh')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', configuracaoId)

  await registrarAuditoria({
    entidade: 'Configuração RH',
    acao: 'Edição',
    registro_codigo: configuracaoId,
    descricao: `Atualizou estrutura da grade de RH: ${novosNiveisIds.length} níveis e ${novasLinhasIds.length} linhas.`,
    detalhes: {
      configuracao_id: configuracaoId,
      total_niveis: novosNiveisIds.length,
      total_linhas: novasLinhasIds.length,
      total_vagas: vagasInsert.length,
    },
  })

  const completa = await getConfiguracaoRhCompleta(configuracaoId)
  return completa!
}

/**
 * Exclui uma configuração de RH
 */
export async function deleteConfiguracaoRh(
  id: string,
  usuarioNome = 'Sistema',
  usuarioEmail = 'sistema@local',
): Promise<void> {
  const cfg = await getConfiguracaoRhCompleta(id)
  if (!cfg) return

  const { error } = await db.from('configuracao_rh').delete().eq('id', id)
  if (error) {
    console.error('Erro ao excluir configuração RH:', error)
    throw error
  }

  await registrarAuditoria({
    entidade: 'Configuração RH',
    acao: 'Exclusão',
    registro_codigo: cfg.codigo || null,
    descricao: `Excluiu a configuração RH "${cfg.tipo_atendimento}" (${cfg.ano_letivo}).`,
    detalhes: { id, tipo_atendimento: cfg.tipo_atendimento, ano_letivo: cfg.ano_letivo },
  })
}
