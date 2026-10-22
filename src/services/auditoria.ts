import { supabase } from '@/lib/supabase/client'
import { RegistroAuditoria, AcaoAuditoria, EntidadeAuditoria } from '@/types/gestao-escolar'

const db = supabase as any

export interface RegistrarAuditoriaParams {
  registro_codigo?: string | null
  entidade: EntidadeAuditoria | string
  acao: AcaoAuditoria | string
  descricao: string
  usuario_id?: string | null
  usuario_nome?: string | null
  usuario_email?: string | null
  detalhes?: Record<string, any> | null
}

/**
 * Sanitiza e filtra vínculos salvos em objetos JSON / metadados para remover referências a IDs inexistentes
 */
export const sanitizarVinculosAuditados = <T extends { id: string }>(
  vinculos: T[] | null | undefined,
  idsValidos: Set<string>,
): T[] => {
  if (!Array.isArray(vinculos)) return []
  return vinculos.filter((item) => item && typeof item.id === 'string' && idsValidos.has(item.id))
}

export interface FiltrosAuditoria {
  busca?: string
  usuario?: string
  acao?: string
  entidade?: string
}

/**
 * Obtém informações do usuário autenticado no momento.
 * Tenta buscar o nome completo na tabela usuarios_sistema ou metadados de autenticação.
 */
export const getUsuarioAtualParaAuditoria = async (): Promise<{
  id: string | null
  nome: string
  email: string
}> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        id: null,
        nome: 'Sistema / Não autenticado',
        email: 'sistema@local',
      }
    }

    const email = user.email || 'sem-email'

    // Busca nome na tabela usuarios_sistema se existir
    const { data: usuarioSistema } = await db
      .from('usuarios_sistema')
      .select('nome_completo')
      .or(`user_id.eq.${user.id},email.eq.${email}`)
      .maybeSingle()

    const nome =
      usuarioSistema?.nome_completo ||
      (user.user_metadata?.name as string) ||
      (user.user_metadata?.full_name as string) ||
      email.split('@')[0]

    return {
      id: user.id,
      nome,
      email,
    }
  } catch (err) {
    console.warn('Erro ao obter usuário atual para auditoria:', err)
    return {
      id: null,
      nome: 'Usuário do Sistema',
      email: 'sistema@local',
    }
  }
}

/**
 * Grava um registro de auditoria no banco de dados Supabase.
 * Nunca interrompe nem lança erro fatal que quebre o fluxo da aplicação caso falhe.
 */
export const registrarAuditoria = async (
  params: RegistrarAuditoriaParams,
): Promise<RegistroAuditoria | null> => {
  try {
    let { usuario_id, usuario_nome, usuario_email } = params

    // Se usuário não foi fornecido explicitamente, resolve a partir da sessão atual
    if (!usuario_email || !usuario_nome) {
      const atual = await getUsuarioAtualParaAuditoria()
      if (!usuario_id) usuario_id = atual.id
      if (!usuario_nome) usuario_nome = atual.nome
      if (!usuario_email) usuario_email = atual.email
    }

    const payload = {
      registro_codigo: params.registro_codigo || null,
      entidade: params.entidade,
      acao: params.acao,
      descricao: params.descricao,
      usuario_id: usuario_id || null,
      usuario_nome: usuario_nome || 'Sistema',
      usuario_email: usuario_email || 'sistema@local',
      detalhes: params.detalhes || {},
    }

    const { data, error } = await db.from('auditoria').insert([payload]).select('*').single()

    if (error) {
      console.warn('Aviso: Falha ao gravar auditoria:', error)
      return null
    }

    return data as RegistroAuditoria
  } catch (err) {
    console.warn('Aviso: Exceção ao gravar auditoria:', err)
    return null
  }
}

/**
 * Consulta registros de auditoria com ordenação decrescente por data/hora (mais recente primeiro).
 */
export const getRegistrosAuditoria = async (
  filtros?: FiltrosAuditoria,
): Promise<RegistroAuditoria[]> => {
  let query = db.from('auditoria').select('*').order('created_at', { ascending: false })

  if (filtros?.entidade && filtros.entidade !== 'todas') {
    query = query.eq('entidade', filtros.entidade)
  }

  if (filtros?.acao && filtros.acao !== 'todas') {
    query = query.eq('acao', filtros.acao)
  }

  if (filtros?.usuario && filtros.usuario !== 'todos') {
    query = query.eq('usuario_email', filtros.usuario)
  }

  const { data, error } = await query

  if (error) {
    console.error('Erro ao consultar registros de auditoria:', error)
    throw error
  }

  let registros = (data as RegistroAuditoria[]) || []

  if (filtros?.busca) {
    const q = filtros.busca.trim().toLowerCase()
    registros = registros.filter(
      (r) =>
        (r.codigo && r.codigo.toLowerCase().includes(q)) ||
        (r.registro_codigo && r.registro_codigo.toLowerCase().includes(q)) ||
        r.descricao.toLowerCase().includes(q) ||
        r.usuario_nome.toLowerCase().includes(q) ||
        r.usuario_email.toLowerCase().includes(q) ||
        r.entidade.toLowerCase().includes(q) ||
        r.acao.toLowerCase().includes(q),
    )
  }

  return registros
}
