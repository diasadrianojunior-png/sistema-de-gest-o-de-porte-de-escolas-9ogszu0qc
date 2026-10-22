import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { PerfilUsuario, SistemaMenuKey, PermissaoPerfil } from '@/types/gestao-escolar'

export interface UserPermissions {
  isAdmin: boolean
  isOperador: boolean
  perfil: PerfilUsuario | null
  canView: (menu: SistemaMenuKey) => boolean
  canEdit: (menu: SistemaMenuKey) => boolean
  permissoes: PermissaoPerfil[]
  refreshPermissoes: () => Promise<void>
}

interface AuthContextType {
  user: User | null
  session: Session | null
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  loading: boolean
  // Controle de perfil e permissões
  perfil: PerfilUsuario | null
  isAdmin: boolean
  isOperador: boolean
  canView: (menu: SistemaMenuKey) => boolean
  canEdit: (menu: SistemaMenuKey) => boolean
  permissoes: PermissaoPerfil[]
  refreshPermissoes: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [permissoes, setPermissoes] = useState<PermissaoPerfil[]>([])

  const carregarPerfilEPermissoes = useCallback(async (targetUser: User | null) => {
    if (!targetUser) {
      setPerfil(null)
      setPermissoes([])
      return
    }

    try {
      const email = targetUser.email || ''
      const db = supabase as any

      // 1. Obter perfil do usuário logado na tabela usuarios_sistema
      const { data: usuarioData, error: usrErr } = await db
        .from('usuarios_sistema')
        .select('perfil, estado')
        .or(`user_id.eq.${targetUser.id},email.eq.${email}`)
        .maybeSingle()

      if (usrErr) {
        console.warn('Erro ao carregar perfil do usuário:', usrErr)
      }

      // Default se não cadastrado: Administrador caso seja o email seed, senão Operador
      let perfilResolvido: PerfilUsuario = 'Operador'
      if (usuarioData?.perfil) {
        perfilResolvido = usuarioData.perfil as PerfilUsuario
      } else if (email === 'renato.guenther@ajrd.com.br') {
        perfilResolvido = 'Administrador'
      }
      setPerfil(perfilResolvido)

      // 2. Se for Operador (ou mesmo para cache), carregar regras da tabela permissoes_perfil
      const { data: permsData, error: permErr } = await db
        .from('permissoes_perfil')
        .select('*')
        .eq('perfil', 'Operador')
        .order('ordem', { ascending: true })

      if (!permErr && permsData) {
        setPermissoes(permsData as PermissaoPerfil[])
      }
    } catch (err) {
      console.warn('Exceção ao resolver permissões do usuário:', err)
    }
  }, [])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // FORBIDDEN: no async/await inside this callback — sync only
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Atualiza perfil e permissões quando o usuário muda
  useEffect(() => {
    if (user) {
      carregarPerfilEPermissoes(user)
    } else {
      setPerfil(null)
      setPermissoes([])
    }
  }, [user, carregarPerfilEPermissoes])

  const refreshPermissoes = useCallback(async () => {
    if (user) {
      await carregarPerfilEPermissoes(user)
    }
  }, [user, carregarPerfilEPermissoes])

  const isAdmin = perfil === 'Administrador'
  const isOperador = perfil === 'Operador'

  // Administrador pode ver e fazer tudo no sistema
  const canView = useCallback(
    (menu: SistemaMenuKey): boolean => {
      if (isAdmin) return true
      const perm = permissoes.find((p) => p.menu_key === menu)
      // Se não encontrou permissão para o menu, default para menus básicos
      if (!perm) {
        return menu === 'painel'
      }
      return Boolean(perm.pode_ver)
    },
    [isAdmin, permissoes],
  )

  const canEdit = useCallback(
    (menu: SistemaMenuKey): boolean => {
      if (isAdmin) return true
      // Painel e Auditoria são sempre somente leitura em qualquer perfil
      if (menu === 'painel' || menu === 'auditoria') return false

      const perm = permissoes.find((p) => p.menu_key === menu)
      if (!perm) return false
      return Boolean(perm.pode_ver && perm.pode_editar && perm.suporta_edicao)
    },
    [isAdmin, permissoes],
  )

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signUp,
        signIn,
        signOut,
        loading,
        perfil,
        isAdmin,
        isOperador,
        canView,
        canEdit,
        permissoes,
        refreshPermissoes,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
