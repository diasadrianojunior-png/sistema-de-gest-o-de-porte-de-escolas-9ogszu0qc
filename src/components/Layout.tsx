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
  ChevronDown,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Layout() {
  const { user, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Controle da sidebar mobile (drawer) e desktop colapso opcional
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // O grupo "Cadastros" expande/colapsa ao clicar
  // Inicia expandido se estiver em uma das páginas de cadastros, ou padrão aberto
  const isCadastrosActive =
    location.pathname === '/cadastros-mestres' || location.pathname === '/cadastros-apoio'
  const [cadastrosOpen, setCadastrosOpen] = useState(true)

  // Ao navegar, se a rota for de cadastro, garante que o menu esteja aberto
  useEffect(() => {
    if (isCadastrosActive) {
      setCadastrosOpen(true)
    }
  }, [location.pathname, isCadastrosActive])

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

  const isPainelActive = location.pathname === '/painel'
  const isMestresActive = location.pathname === '/cadastros-mestres'
  const isApoioActive = location.pathname === '/cadastros-apoio'

  // Conteúdo unificado da barra lateral (Sidebar)
  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-white text-slate-900 border-r border-slate-200">
      {/* Topo da Sidebar: Logotipo e Identidade */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
        <NavLink
          to="/painel"
          onClick={() => isMobile && setMobileSidebarOpen(false)}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <School className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-900 leading-tight tracking-tight text-base truncate">
                Gestão Escolar
              </span>
              <span className="text-[11px] text-slate-500 font-medium truncate">Porte & Redes</span>
            </div>
          )}
        </NavLink>

        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Fechar navegação"
            className="text-slate-500 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            className="text-slate-400 hover:text-slate-700 hidden lg:flex h-8 w-8"
            title={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navegação principal */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          {!sidebarCollapsed && (
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Menu Principal
            </div>
          )}

          <nav className="space-y-1">
            {/* Item 1: Painel de Início */}
            <NavLink
              to="/painel"
              onClick={() => isMobile && setMobileSidebarOpen(false)}
              title="Painel de Início"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isPainelActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard
                className={`w-5 h-5 shrink-0 ${isPainelActive ? 'text-blue-700' : 'text-slate-500'}`}
              />
              {!sidebarCollapsed && <span>Painel de Início</span>}
            </NavLink>

            {/* Item 2: Grupo Cadastros (Expansível / Accordion) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setCadastrosOpen((prev) => !prev)}
                title="Cadastros"
                aria-expanded={cadastrosOpen}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isCadastrosActive
                    ? 'text-blue-800 bg-blue-50/70 font-semibold'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FolderKanban
                    className={`w-5 h-5 shrink-0 ${
                      isCadastrosActive ? 'text-blue-700' : 'text-slate-500'
                    }`}
                  />
                  {!sidebarCollapsed && <span>Cadastros</span>}
                </div>
                {!sidebarCollapsed && (
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      cadastrosOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                )}
              </button>

              {/* Subitens de Cadastros (revelados ao clicar no item Cadastros) */}
              {cadastrosOpen && (
                <div
                  className={`mt-1 space-y-1 ${
                    sidebarCollapsed ? 'pl-0' : 'pl-4 ml-4 border-l-2 border-slate-200'
                  }`}
                >
                  {/* Subitem: Cadastros Mestres */}
                  <NavLink
                    to="/cadastros-mestres"
                    onClick={() => isMobile && setMobileSidebarOpen(false)}
                    title="Cadastros Mestres (Escolas)"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isMestresActive
                        ? 'bg-blue-600 text-white font-medium shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <School
                      className={`w-4 h-4 shrink-0 ${
                        isMestresActive ? 'text-white' : 'text-slate-500'
                      }`}
                    />
                    {!sidebarCollapsed && <span className="truncate">Cadastros Mestres</span>}
                  </NavLink>

                  {/* Subitem: Cadastros de Apoio */}
                  <NavLink
                    to="/cadastros-apoio"
                    onClick={() => isMobile && setMobileSidebarOpen(false)}
                    title="Cadastros de Apoio (Municípios e Tipos)"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isApoioActive
                        ? 'bg-blue-600 text-white font-medium shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Database
                      className={`w-4 h-4 shrink-0 ${
                        isApoioActive ? 'text-white' : 'text-slate-500'
                      }`}
                    />
                    {!sidebarCollapsed && <span className="truncate">Cadastros de Apoio</span>}
                  </NavLink>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* Rodapé da Sidebar: Informações do Usuário e Logout */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 shrink-0">
        {!sidebarCollapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate" title={user.email}>
                  {user.email}
                </p>
                <p className="text-[11px] text-slate-500 truncate">Sessão Autenticada</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-center gap-2 text-slate-700 hover:text-destructive hover:border-destructive/30 hover:bg-red-50 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Encerrar Sessão
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"
              title={user.email}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Encerrar Sessão"
              className="h-8 w-8 text-slate-600 hover:text-destructive hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. SIDEBAR DESKTOP (Fixa à esquerda) */}
      <aside
        className={`hidden md:flex flex-col shrink-0 sticky top-0 h-screen transition-all duration-200 z-30 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* 2. SIDEBAR MOBILE (Drawer com overlay) */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-10 shadow-xl">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* 3. ÁREA DE CONTEÚDO PRINCIPAL (Main Layout) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Barra superior / Topbar com header contextual */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Botão de abrir menu no mobile */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden h-9 w-9 text-slate-700"
              aria-label="Abrir barra lateral"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Breadcrumb contextual simples da rota ativa */}
            <div className="flex items-center text-sm font-medium text-slate-600">
              <span className="hidden sm:inline text-slate-400">Sistema</span>
              <span className="hidden sm:inline mx-2 text-slate-300">/</span>
              {isPainelActive && (
                <span className="text-slate-900 font-semibold">Painel de Início</span>
              )}
              {isMestresActive && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Cadastros</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-blue-700 font-semibold">Cadastros Mestres (Escolas)</span>
                </div>
              )}
              {isApoioActive && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Cadastros</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-blue-700 font-semibold">Cadastros de Apoio</span>
                </div>
              )}
            </div>
          </div>

          {/* Lado direito da barra superior: Indicador de status & Perfil */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-slate-700">{user.email}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-xs text-slate-600 hover:text-destructive hover:bg-red-50 gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        {/* Conteúdo da página atual */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Rodapé sutil */}
        <footer className="bg-white border-t border-slate-200 py-3.5 px-4 sm:px-6 text-center text-xs text-slate-500 mt-auto">
          Sistema de Gestão de Porte de Escolas &copy; {new Date().getFullYear()} — Plataforma
          Administrativa
        </footer>
      </div>
    </div>
  )
}
