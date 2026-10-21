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
  UserCog,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Building,
  ShieldAlert,
  Briefcase,
  Layers,
  PanelLeftOpen,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function Layout() {
  const { user, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Controle da sidebar (desktop recolhida vs expandida, mobile drawer)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [cadastrosMestresExpanded, setCadastrosMestresExpanded] = useState(true)
  const [cadastrosApoioExpanded, setCadastrosApoioExpanded] = useState(true)

  // Estados dos popovers quando a barra está recolhida
  const [mestresPopoverOpen, setMestresPopoverOpen] = useState(false)
  const [apoioPopoverOpen, setApoioPopoverOpen] = useState(false)

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
  const isCargosActive = location.pathname === '/cadastros-apoio/cargos'
  const isFuncoesActive = location.pathname === '/cadastros-apoio/funcoes'
  const isApoioActive = location.pathname.startsWith('/cadastros-apoio')
  const isAdministracaoActive = location.pathname === '/administracao'
  const isAuditoriaActive = location.pathname === '/auditoria'

  // Conteúdo unificado da barra lateral (Sidebar)
  const renderSidebarContent = (isMobile = false) => {
    const collapsed = !isMobile && isSidebarCollapsed

    return (
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-col h-full bg-white text-slate-900 border-r border-slate-200">
          {/* Topo da Sidebar: Logotipo e Identidade */}
          <div
            className={`h-16 flex items-center border-b border-slate-200 shrink-0 ${
              collapsed ? 'justify-center px-2' : 'justify-between px-4'
            }`}
          >
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    to="/painel"
                    className="flex items-center justify-center"
                    aria-label="Painel de Início - Gestão Escolar"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm hover:bg-blue-700 transition-colors">
                      <School className="w-5 h-5 text-white" />
                    </div>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-semibold text-xs">
                  Gestão Escolar · Porte & Redes
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <NavLink
                  to="/painel"
                  onClick={() => isMobile && setMobileSidebarOpen(false)}
                  className="flex items-center gap-3 overflow-hidden min-w-0"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                    <School className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-900 leading-tight tracking-tight text-base truncate">
                      Gestão Escolar
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium truncate">
                      Porte & Redes
                    </span>
                  </div>
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
                    onClick={() => setIsSidebarCollapsed(true)}
                    title="Recolher menu lateral"
                    aria-label="Recolher menu lateral"
                    className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-8 w-8 shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Navegação principal */}
          <div
            className={`flex-1 overflow-y-auto ${collapsed ? 'px-2 py-4' : 'px-3 py-4 space-y-6'}`}
          >
            <div>
              {!collapsed && (
                <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Menu Principal
                </div>
              )}

              <nav className="space-y-1.5">
                {/* Item 1: Painel de Início */}
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/painel"
                        title="Painel de Início"
                        aria-label="Painel de Início"
                        className={`flex items-center justify-center w-11 h-11 mx-auto rounded-lg transition-colors ${
                          isPainelActive
                            ? 'bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <LayoutDashboard
                          className={`w-5 h-5 ${isPainelActive ? 'text-blue-700' : 'text-slate-600'}`}
                        />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-medium">
                      Painel de Início
                    </TooltipContent>
                  </Tooltip>
                ) : (
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
                    <span>Painel de Início</span>
                  </NavLink>
                )}

                {/* Item 2: Cadastros Mestres */}
                {collapsed ? (
                  <Popover open={mestresPopoverOpen} onOpenChange={setMestresPopoverOpen}>
                    <Tooltip open={mestresPopoverOpen ? false : undefined}>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="Cadastros Mestres"
                            className={`flex items-center justify-center w-11 h-11 mx-auto rounded-lg transition-colors cursor-pointer outline-none ${
                              isMestresActive
                                ? 'bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-200'
                                : mestresPopoverOpen
                                  ? 'bg-slate-100 text-slate-900'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <School
                              className={`w-5 h-5 ${isMestresActive ? 'text-blue-700' : 'text-slate-600'}`}
                            />
                          </button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs font-medium">
                        Cadastros Mestres
                      </TooltipContent>
                    </Tooltip>
                    <PopoverContent
                      side="right"
                      align="start"
                      sideOffset={12}
                      className="w-56 p-2 rounded-xl shadow-lg border border-slate-200 bg-white"
                    >
                      <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-blue-600" />
                          Cadastros Mestres
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          Menu
                        </span>
                      </div>
                      <div className="space-y-1">
                        <NavLink
                          to="/cadastros-mestres"
                          onClick={() => setMestresPopoverOpen(false)}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                            isMestresActive
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <Building
                            className={`w-4 h-4 shrink-0 ${isMestresActive ? 'text-white' : 'text-slate-500'}`}
                          />
                          <span>Unidades escolares</span>
                        </NavLink>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        // Ao clicar no menu principal, garante que seus submenus apareçam automaticamente
                        if (!cadastrosMestresExpanded) {
                          setCadastrosMestresExpanded(true)
                        } else {
                          setCadastrosMestresExpanded(false)
                        }
                      }}
                      title="Cadastros Mestres"
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isMestresActive
                          ? 'text-blue-700 font-semibold bg-blue-50/70'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <School
                          className={`w-5 h-5 shrink-0 ${isMestresActive ? 'text-blue-700' : 'text-slate-500'}`}
                        />
                        <span className="truncate">Cadastros Mestres</span>
                      </div>
                      {cadastrosMestresExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {/* Submenu de Cadastros Mestres */}
                    {cadastrosMestresExpanded && (
                      <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-200 space-y-1 py-1">
                        <NavLink
                          to="/cadastros-mestres"
                          onClick={() => isMobile && setMobileSidebarOpen(false)}
                          title="Unidades escolares"
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            isMestresActive
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <Building
                            className={`w-3.5 h-3.5 shrink-0 ${isMestresActive ? 'text-white' : 'text-slate-400'}`}
                          />
                          <span className="truncate">Unidades escolares</span>
                        </NavLink>
                      </div>
                    )}
                  </div>
                )}

                {/* Item 3: Cadastros de Apoio */}
                {collapsed ? (
                  <Popover open={apoioPopoverOpen} onOpenChange={setApoioPopoverOpen}>
                    <Tooltip open={apoioPopoverOpen ? false : undefined}>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="Cadastros de Apoio"
                            className={`flex items-center justify-center w-11 h-11 mx-auto rounded-lg transition-colors cursor-pointer outline-none ${
                              isApoioActive
                                ? 'bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-200'
                                : apoioPopoverOpen
                                  ? 'bg-slate-100 text-slate-900'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <Database
                              className={`w-5 h-5 ${isApoioActive ? 'text-blue-700' : 'text-slate-600'}`}
                            />
                          </button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs font-medium">
                        Cadastros de Apoio
                      </TooltipContent>
                    </Tooltip>
                    <PopoverContent
                      side="right"
                      align="start"
                      sideOffset={12}
                      className="w-56 p-2 rounded-xl shadow-lg border border-slate-200 bg-white"
                    >
                      <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-blue-600" />
                          Cadastros de Apoio
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          Menu
                        </span>
                      </div>
                      <div className="space-y-1">
                        <NavLink
                          to="/cadastros-apoio/cargos"
                          onClick={() => setApoioPopoverOpen(false)}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                            isCargosActive
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <Briefcase
                            className={`w-4 h-4 shrink-0 ${isCargosActive ? 'text-white' : 'text-slate-500'}`}
                          />
                          <span>Cargos</span>
                        </NavLink>

                        <NavLink
                          to="/cadastros-apoio/funcoes"
                          onClick={() => setApoioPopoverOpen(false)}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                            isFuncoesActive
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <Layers
                            className={`w-4 h-4 shrink-0 ${isFuncoesActive ? 'text-white' : 'text-slate-500'}`}
                          />
                          <span>Funções</span>
                        </NavLink>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        // Ao clicar no menu principal, garante que seus submenus apareçam automaticamente
                        if (!cadastrosApoioExpanded) {
                          setCadastrosApoioExpanded(true)
                        } else {
                          setCadastrosApoioExpanded(false)
                        }
                      }}
                      title="Cadastros de Apoio"
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isApoioActive
                          ? 'text-blue-700 font-semibold bg-blue-50/70'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Database
                          className={`w-5 h-5 shrink-0 ${isApoioActive ? 'text-blue-700' : 'text-slate-500'}`}
                        />
                        <span className="truncate">Cadastros de Apoio</span>
                      </div>
                      {cadastrosApoioExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {/* Submenu de Cadastros de Apoio */}
                    {cadastrosApoioExpanded && (
                      <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-200 space-y-1 py-1">
                        {/* Submenu 1: Cargos */}
                        <NavLink
                          to="/cadastros-apoio/cargos"
                          onClick={() => isMobile && setMobileSidebarOpen(false)}
                          title="Cargos"
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            isCargosActive
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <Briefcase
                            className={`w-3.5 h-3.5 shrink-0 ${isCargosActive ? 'text-white' : 'text-slate-400'}`}
                          />
                          <span className="truncate">Cargos</span>
                        </NavLink>

                        {/* Submenu 2: Funções */}
                        <NavLink
                          to="/cadastros-apoio/funcoes"
                          onClick={() => isMobile && setMobileSidebarOpen(false)}
                          title="Funções"
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            isFuncoesActive
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <Layers
                            className={`w-3.5 h-3.5 shrink-0 ${isFuncoesActive ? 'text-white' : 'text-slate-400'}`}
                          />
                          <span className="truncate">Funções</span>
                        </NavLink>
                      </div>
                    )}
                  </div>
                )}

                {/* Item 4: Administração do sistema */}
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/administracao"
                        title="Administração do sistema"
                        aria-label="Administração do sistema"
                        className={`flex items-center justify-center w-11 h-11 mx-auto rounded-lg transition-colors ${
                          isAdministracaoActive
                            ? 'bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <UserCog
                          className={`w-5 h-5 ${isAdministracaoActive ? 'text-blue-700' : 'text-slate-600'}`}
                        />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-medium">
                      Administração do sistema
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <NavLink
                    to="/administracao"
                    onClick={() => isMobile && setMobileSidebarOpen(false)}
                    title="Administração do sistema"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isAdministracaoActive
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <UserCog
                      className={`w-5 h-5 shrink-0 ${isAdministracaoActive ? 'text-blue-700' : 'text-slate-500'}`}
                    />
                    <span>Administração do sistema</span>
                  </NavLink>
                )}

                {/* Item 5: Auditoria (última posição) */}
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/auditoria"
                        title="Auditoria"
                        aria-label="Auditoria"
                        className={`flex items-center justify-center w-11 h-11 mx-auto rounded-lg transition-colors ${
                          isAuditoriaActive
                            ? 'bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <ShieldAlert
                          className={`w-5 h-5 ${isAuditoriaActive ? 'text-blue-700' : 'text-slate-600'}`}
                        />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-medium">
                      Auditoria
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <NavLink
                    to="/auditoria"
                    onClick={() => isMobile && setMobileSidebarOpen(false)}
                    title="Auditoria"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isAuditoriaActive
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldAlert
                      className={`w-5 h-5 shrink-0 ${isAuditoriaActive ? 'text-blue-700' : 'text-slate-500'}`}
                    />
                    <span>Auditoria</span>
                  </NavLink>
                )}
              </nav>
            </div>
          </div>

          {/* Rodapé da Sidebar: Informações do Usuário e Logout */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/70 shrink-0">
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 cursor-default">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <p className="font-semibold text-slate-800">{user.email}</p>
                    <p className="text-[11px] text-slate-500">Sessão Autenticada</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSignOut}
                      aria-label="Encerrar Sessão"
                      className="w-9 h-9 text-slate-500 hover:text-destructive hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    Encerrar Sessão
                  </TooltipContent>
                </Tooltip>

                <div className="pt-1 w-full border-t border-slate-200/60 flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarCollapsed(false)}
                        aria-label="Expandir menu lateral"
                        className="w-9 h-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      Expandir menu lateral
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ) : (
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="flex-1 justify-center gap-2 text-slate-700 hover:text-destructive hover:border-destructive/30 hover:bg-red-50 text-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Encerrar Sessão
                  </Button>
                  {!isMobile && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsSidebarCollapsed(true)}
                      title="Recolher menu lateral"
                      aria-label="Recolher menu lateral"
                      className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-800"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. SIDEBAR DESKTOP */}
      <aside
        className={`hidden md:flex flex-col shrink-0 sticky top-0 h-screen z-30 transition-all duration-200 ${
          isSidebarCollapsed ? 'w-16 min-w-16 max-w-16' : 'w-64 min-w-64 max-w-64'
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
            {/* Botão de recolher/expandir sidebar no desktop quando recolhida (ou para fácil acesso) */}
            {isSidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarCollapsed(false)}
                className="hidden md:flex h-9 w-9 text-slate-600 hover:text-slate-900"
                title="Expandir menu lateral"
                aria-label="Expandir menu lateral"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </Button>
            )}

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
                <>
                  <span className="text-slate-600">Cadastros Mestres</span>
                  <span className="mx-2 text-slate-300">/</span>
                  <span className="text-blue-700 font-semibold">Unidades escolares</span>
                </>
              )}
              {isApoioActive && (
                <>
                  <span className="text-slate-600">Cadastros de Apoio</span>
                  <span className="mx-2 text-slate-300">/</span>
                  <span className="text-blue-700 font-semibold">
                    {isFuncoesActive ? 'Funções' : 'Cargos'}
                  </span>
                </>
              )}
              {isAuditoriaActive && <span className="text-blue-700 font-semibold">Auditoria</span>}
              {isAdministracaoActive && (
                <span className="text-blue-700 font-semibold">Administração do sistema</span>
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
