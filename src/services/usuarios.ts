import { supabase } from '@/lib/supabase/client'
import { UsuarioSistema, PerfilUsuario, EstadoUsuario } from '@/types/gestao-escolar'

const db = supabase as any

export interface CreateUsuarioInput {
  nome_completo: string
  email: string
  perfil: PerfilUsuario
  estado: EstadoUsuario
}

export interface UpdateUsuarioInput {
  nome_completo: string
  perfil: PerfilUsuario
  estado: EstadoUsuario
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
        return {
          usuario: fnData.usuario as UsuarioSistema,
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

  return {
    usuario: data as UsuarioSistema,
    inviteSent,
    message: inviteMessage,
  }
}

export const updateUsuario = async (
  id: string,
  input: UpdateUsuarioInput,
): Promise<UsuarioSistema> => {
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
  return data as UsuarioSistema
}

export const deleteUsuario = async (usuario: UsuarioSistema): Promise<void> => {
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
}
