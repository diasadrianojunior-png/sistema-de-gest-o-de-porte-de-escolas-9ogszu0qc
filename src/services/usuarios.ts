import { supabase } from '@/lib/supabase/client'
import { UsuarioSistema, PerfilUsuario, EstadoUsuario } from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'

const db = supabase as any

import { PermissaoItemForm, salvarPermissoesUsuario } from './permissoes'

export interface CreateUsuarioInput {
  nome_completo: string
  email: string
  perfil: PerfilUsuario
  estado: EstadoUsuario
  permissoes?: PermissaoItemForm[]
}

export interface UpdateUsuarioInput {
  nome_completo: string
  perfil: PerfilUsuario
  estado: EstadoUsuario
  permissoes?: PermissaoItemForm[]
}

export const getUsuarios = async (): Promise<UsuarioSistema[]> => {
  const { data, error } = await db
    .from('usuarios_sistema')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Erro ao buscar usuários do sistema:', error)
    throw error
  }
  return (data as UsuarioSistema[]) || []
}

/**
 * Cria usuário no sistema. Tenta disparar convite via Edge Function 'admin-users'
 * (que usa service role / inviteUserByEmail). Se a function falhar ou não estiver disponível,
 * faz o fallback de criação direta na tabela usuarios_sistema para não travar a operação.
 */
export const createUsuario = async (
  input: CreateUsuarioInput,
): Promise<{ usuario: UsuarioSistema; inviteSent: boolean; message?: string }> => {
  let inviteSent = false
  let userId: string | null = null
  let inviteMessage = ''

  // 1. Tentar Edge Function para inviteUserByEmail
  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'invite',
        email: input.email.trim().toLowerCase(),
        nome_completo: input.nome_completo.trim(),
        perfil: input.perfil,
        estado: input.estado,
      },
    })

    if (!fnError && fnData) {
      if (fnData.error) {
        throw new Error(fnData.error)
      }
      inviteSent = Boolean(fnData.inviteSent)
      userId = fnData.user_id || null
      inviteMessage = fnData.message || ''

      if (fnData.usuario) {
        const usrCriado = fnData.usuario as UsuarioSistema

        // Salvar permissões personalizadas se for perfil Operador
        if (input.perfil === 'Operador' && input.permissoes && input.permissoes.length > 0) {
          try {
            await salvarPermissoesUsuario(
              usrCriado.id,
              usrCriado.nome_completo,
              usrCriado.email,
              input.permissoes,
              undefined,
              usrCriado.codigo,
            )
          } catch (pErr) {
            console.error('Erro ao salvar permissões do novo usuário operador:', pErr)
          }
        }

        await registrarAuditoria({
          entidade: 'Usuários',
          acao: 'Criação',
          registro_codigo: usrCriado.codigo || null,
          descricao: `Cadastro do usuário "${usrCriado.nome_completo}" (${usrCriado.email}, perfil ${usrCriado.perfil}, estado ${usrCriado.estado}). Convite enviado.`,
          detalhes: { usuario: usrCriado, inviteSent },
        })

        return {
          usuario: usrCriado,
          inviteSent,
          message: inviteMessage,
        }
      }
    }
  } catch (err: any) {
    console.warn('Edge function inviteUserByEmail falhou ou indisponível:', err?.message || err)
    // Prossegue com fallback direto na tabela usuarios_sistema
  }

  // 2. Fallback: inserir diretamente na tabela usuarios_sistema
  const { data, error } = await db
    .from('usuarios_sistema')
    .insert([
      {
        user_id: userId,
        nome_completo: input.nome_completo.trim(),
        email: input.email.trim().toLowerCase(),
        perfil: input.perfil,
        estado: input.estado,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Erro ao inserir usuário do sistema:', error)
    throw error
  }

  const usuarioCriado = data as UsuarioSistema

  // Salvar permissões personalizadas se for perfil Operador
  if (input.perfil === 'Operador' && input.permissoes && input.permissoes.length > 0) {
    try {
      await salvarPermissoesUsuario(
        usuarioCriado.id,
        usuarioCriado.nome_completo,
        usuarioCriado.email,
        input.permissoes,
        undefined,
        usuarioCriado.codigo,
      )
    } catch (pErr) {
      console.error('Erro ao salvar permissões do novo usuário operador:', pErr)
    }
  }

  await registrarAuditoria({
    entidade: 'Usuários',
    acao: 'Criação',
    registro_codigo: usuarioCriado.codigo || null,
    descricao: `Cadastro do usuário "${usuarioCriado.nome_completo}" (${usuarioCriado.email}, perfil ${usuarioCriado.perfil}, estado ${usuarioCriado.estado}).`,
    detalhes: { usuario: usuarioCriado, inviteSent },
  })

  return {
    usuario: usuarioCriado,
    inviteSent,
    message: inviteMessage,
  }
}

export const updateUsuario = async (
  id: string,
  input: UpdateUsuarioInput,
  currentUserEmail?: string,
): Promise<UsuarioSistema> => {
  // Verificação de segurança: não deixar o sistema sem Administrador ativo
  const { data: todosUsuarios, error: fetchError } = await db
    .from('usuarios_sistema')
    .select('id, email, perfil, estado')

  if (!fetchError && todosUsuarios) {
    const usuarioAlvo = todosUsuarios.find((u: any) => u.id === id)
    if (usuarioAlvo && usuarioAlvo.perfil === 'Administrador') {
      const outrosAdminsAtivos = todosUsuarios.filter(
        (u: any) => u.id !== id && u.perfil === 'Administrador' && u.estado === 'Ativo',
      )

      // Se está tentando rebaixar para Operador ou inativar o admin
      const deixandoDeSerAdminAtivo = input.perfil !== 'Administrador' || input.estado !== 'Ativo'
      if (deixandoDeSerAdminAtivo && outrosAdminsAtivos.length === 0) {
        throw new Error(
          'Operação não permitida: O sistema deve possuir pelo menos um Administrador ativo.',
        )
      }

      // Se o próprio administrador logado está tentando rebaixar a si mesmo e não há outro
      if (
        currentUserEmail &&
        usuarioAlvo.email.toLowerCase() === currentUserEmail.toLowerCase() &&
        input.perfil !== 'Administrador'
      ) {
        if (outrosAdminsAtivos.length === 0) {
          throw new Error('Você não pode remover seu próprio perfil de Administrador.')
        }
      }
    }
  }

  const { data, error } = await db
    .from('usuarios_sistema')
    .update({
      nome_completo: input.nome_completo.trim(),
      perfil: input.perfil,
      estado: input.estado,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar usuário do sistema:', error)
    throw error
  }

  const updated = data as UsuarioSistema

  // Se o perfil for Operador e foram passadas permissões, atualizá-las
  if (input.perfil === 'Operador' && input.permissoes && input.permissoes.length > 0) {
    try {
      // Buscar permissões atuais para registrar delta preciso na auditoria
      const { data: permsAtuais } = await db
        .from('permissoes_usuario')
        .select('*')
        .eq('usuario_id', id)

      await salvarPermissoesUsuario(
        updated.id,
        updated.nome_completo,
        updated.email,
        input.permissoes,
        permsAtuais || [],
        updated.codigo,
      )
    } catch (pErr) {
      console.error('Erro ao salvar permissões atualizadas do operador:', pErr)
    }
  }

  await registrarAuditoria({
    entidade: 'Usuários',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Edição do usuário "${updated.nome_completo}" (${updated.email}, perfil ${updated.perfil}, estado ${updated.estado}).`,
    detalhes: { id, alteracoes: input },
  })

  return updated
}

export const deleteUsuario = async (
  usuario: UsuarioSistema,
  currentUserEmail?: string,
): Promise<void> => {
  // Verificação de segurança: não permitir excluir a si mesmo caso seja o único admin
  if (currentUserEmail && usuario.email.toLowerCase() === currentUserEmail.toLowerCase()) {
    throw new Error('Operação não permitida: Você não pode excluir a sua própria conta logada.')
  }

  if (usuario.perfil === 'Administrador') {
    const { data: todosUsuarios } = await db.from('usuarios_sistema').select('id, perfil, estado')
    const outrosAdminsAtivos = (todosUsuarios || []).filter(
      (u: any) => u.id !== usuario.id && u.perfil === 'Administrador' && u.estado === 'Ativo',
    )
    if (outrosAdminsAtivos.length === 0) {
      throw new Error(
        'Operação não permitida: O sistema deve possuir pelo menos um Administrador ativo.',
      )
    }
  }

  // 1. Tentar excluir do auth através da edge function se tiver user_id ou email
  try {
    await supabase.functions.invoke('admin-users', {
      body: {
        action: 'delete',
        user_id: usuario.user_id,
        email: usuario.email,
        usuario_id: usuario.id,
      },
    })
  } catch (err) {
    console.warn('Erro ao chamar edge function para excluir auth user:', err)
  }

  // 2. Excluir da tabela usuarios_sistema
  const { error } = await db.from('usuarios_sistema').delete().eq('id', usuario.id)

  if (error) {
    console.error('Erro ao excluir usuário do sistema:', error)
    throw error
  }

  await registrarAuditoria({
    entidade: 'Usuários',
    acao: 'Exclusão',
    registro_codigo: usuario.codigo || null,
    descricao: `Exclusão do usuário "${usuario.nome_completo}" (${usuario.email}).`,
    detalhes: { usuario },
  })
}
