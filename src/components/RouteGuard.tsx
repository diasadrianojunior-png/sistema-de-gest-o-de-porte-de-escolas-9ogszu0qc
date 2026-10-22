import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { SistemaMenuKey } from '@/types/gestao-escolar'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RouteGuardProps {
  children: ReactNode
  menuKey?: SistemaMenuKey
  adminOnly?: boolean
}

export const RouteGuard = ({ children, menuKey, adminOnly = false }: RouteGuardProps) => {
  const { user, loading, isAdmin, canView } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Administrador pode sempre acessar tudo
  if (isAdmin) {
    return <>{children}</>
  }

  // Rota estritamente para Administrador (ex: tela de Permissões)
  if (adminOnly && !isAdmin) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-slate-200 shadow-xs max-w-xl mx-auto my-8">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Restrito ao Administrador</h2>
        <p className="text-sm text-slate-600 mb-6">
          Esta área é restrita a usuários com perfil de Administrador do sistema.
        </p>
        <Button
          onClick={() => window.history.back()}
          className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à página anterior
        </Button>
      </div>
    )
  }

  // Rota controlada por menu_key para Operador
  if (menuKey && !canView(menuKey)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-slate-200 shadow-xs max-w-xl mx-auto my-8">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Permissão de Acesso Necessária</h2>
        <p className="text-sm text-slate-600 mb-2">
          O seu perfil não possui permissão para visualizar este módulo do sistema.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          Solicite ao Administrador a liberação deste menu nas configurações de permissões do
          sistema.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => window.history.back()} className="text-xs">
            Voltar
          </Button>
          <Button
            onClick={() => (window.location.href = '/painel')}
            className="text-xs bg-[#0B2545] hover:bg-[#133A68] text-white"
          >
            Ir para o Painel
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
