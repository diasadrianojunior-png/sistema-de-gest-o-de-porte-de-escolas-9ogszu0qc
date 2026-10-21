import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  School,
  Database,
  LayoutDashboard,
  LogOut,
  Loader2,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Layout() {
  const { user, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-600">Carregando sistema...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { name: 'Painel de Início', href: '/painel', icon: LayoutDashboard },
    { name: 'Cadastros Mestres', href: '/cadastros-mestres', icon: School },
    { name: 'Cadastros de Apoio', href: '/cadastros-apoio', icon: Database },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and primary navigation */}
            <div className="flex items-center gap-8">
              <NavLink to="/painel" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <School className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 leading-tight tracking-tight text-base sm:text-lg">
                    Gestão Escolar
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Porte e Redes de Ensino
                  </span>
                </div>
              </NavLink>

              <nav className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </NavLink>
                  )
                })}
              </nav>
            </div>

            {/* Right side: user info & sign out */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right text-xs">
                <div className="flex items-center gap-1 justify-end font-medium text-slate-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {user.email}
                </div>
                <span className="text-slate-400">Sessão Autenticada</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="gap-1.5 text-slate-700 hover:text-destructive hover:border-destructive/30"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Abrir menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              )
            })}
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-600 truncate max-w-[200px]">{user.email}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-1 text-xs text-destructive"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          Sistema de Gestão de Porte de Escolas &copy; {new Date().getFullYear()} — Plataforma
          Administrativa
        </div>
      </footer>
    </div>
  )
}
