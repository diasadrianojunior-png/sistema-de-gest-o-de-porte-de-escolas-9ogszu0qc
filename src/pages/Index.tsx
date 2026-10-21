import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import Painel from './Painel'
import Login from './Login'
import { Loader2 } from 'lucide-react'

export default function Index() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-600">Carregando sistema...</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/painel" replace />
  }

  return <Navigate to="/login" replace />
}
