import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ShieldAlert,
  Search,
  Loader2,
  RefreshCw,
  Eye,
  Filter,
  User,
  Activity,
  Layers,
  Calendar,
  Lock,
  PlusCircle,
  FileEdit,
  Trash2,
  LogIn,
} from 'lucide-react'
import { getRegistrosAuditoria } from '@/services/auditoria'
import { RegistroAuditoria } from '@/types/gestao-escolar'
import { toast } from '@/hooks/use-toast'

export default function Auditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [filtroEntidade, setFiltroEntidade] = useState<string>('todas')
  const [filtroAcao, setFiltroAcao] = useState<string>('todas')
  const [filtroUsuario, setFiltroUsuario] = useState<string>('todos')

  // Modal de Detalhes (somente leitura)
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false)
  const [detalhesItem, setDetalhesItem] = useState<RegistroAuditoria | null>(null)

  const carregarAuditoria = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true)
      else setLoading(true)

      const dados = await getRegistrosAuditoria()
      setRegistros(dados)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar auditoria',
        description: err.message || 'Falha ao buscar registros de auditoria.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    carregarAuditoria()
  }, [])

  // Lista única de usuários presentes nos registros para o filtro
  const listaUsuarios = useMemo(() => {
    const mapa = new Map<string, string>()
    registros.forEach((r) => {
      if (r.usuario_email) {
        mapa.set(r.usuario_email, `${r.usuario_nome} (${r.usuario_email})`)
      }
    })
    return Array.from(mapa.entries()).map(([email, label]) => ({ email, label }))
  }, [registros])

  // Filtragem combinada no cliente
  const registrosFiltrados = useMemo(() => {
    return registros.filter((reg) => {
      // Filtro de entidade
      if (filtroEntidade !== 'todas' && reg.entidade !== filtroEntidade) {
        return false
      }
      // Filtro de ação
      if (filtroAcao !== 'todas' && reg.acao !== filtroAcao) {
        return false
      }
      // Filtro de usuário
      if (filtroUsuario !== 'todos' && reg.usuario_email !== filtroUsuario) {
        return false
      }
      // Busca por texto
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchesCodigo = reg.codigo?.toLowerCase().includes(q)
        const matchesRegCodigo = reg.registro_codigo?.toLowerCase().includes(q)
        const matchesDescricao = reg.descricao?.toLowerCase().includes(q)
        const matchesUsuarioNome = reg.usuario_nome?.toLowerCase().includes(q)
        const matchesUsuarioEmail = reg.usuario_email?.toLowerCase().includes(q)
        const matchesEntidade = reg.entidade?.toLowerCase().includes(q)
        const matchesAcao = reg.acao?.toLowerCase().includes(q)

        return (
          matchesCodigo ||
          matchesRegCodigo ||
          matchesDescricao ||
          matchesUsuarioNome ||
          matchesUsuarioEmail ||
          matchesEntidade ||
          matchesAcao
        )
      }
      return true
    })
  }, [registros, filtroEntidade, filtroAcao, filtroUsuario, search])

  const handleVisualizar = (reg: RegistroAuditoria) => {
    setDetalhesItem(reg)
    setOpenDetailsDialog(true)
  }

  const limparFiltros = () => {
    setSearch('')
    setFiltroEntidade('todas')
    setFiltroAcao('todas')
    setFiltroUsuario('todos')
  }

  const getAcaoBadge = (acao: string) => {
    switch (acao) {
      case 'Criação':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PlusCircle className="w-3 h-3 text-emerald-600" />
            Criação
          </span>
        )
      case 'Edição':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <FileEdit className="w-3 h-3 text-blue-600" />
            Edição
          </span>
        )
      case 'Exclusão':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Trash2 className="w-3 h-3 text-rose-600" />
            Exclusão
          </span>
        )
      case 'Login':
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <LogIn className="w-3 h-3 text-purple-600" />
            Login
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            {acao}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
            <span>Sistema</span>
            <span>&rsaquo;</span>
            <span>Governança & Rastreabilidade</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-blue-600" />
            Auditoria do Sistema
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Registro imutável de todas as ações executadas por usuários no sistema (criações,
            edições, exclusões e logins).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => carregarAuditoria(true)}
            disabled={loading || refreshing}
            className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Caixa de Regra de Segurança */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-start gap-3 text-xs text-slate-600">
        <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">
            Trilha de Auditoria Auditável e Imutável:{' '}
          </span>
          Estes registros são gerados de forma contínua pelo sistema e gravados com chave de
          identificação automática (
          <span className="font-mono text-blue-700 font-semibold">AUD-XXXX</span>). A interface não
          permite alteração ou exclusão de eventos de auditoria.
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Eventos e Registros de Auditoria</CardTitle>
              <CardDescription>
                Exibindo {registrosFiltrados.length} de {registros.length} registro(s) — ordenados
                pela data/hora mais recente
              </CardDescription>
            </div>
            {(search ||
              filtroEntidade !== 'todas' ||
              filtroAcao !== 'todas' ||
              filtroUsuario !== 'todos') && (
              <Button
                size="sm"
                onClick={limparFiltros}
                className="text-xs bg-[#0B2545] hover:bg-[#133A68] text-white self-start sm:self-auto"
              >
                Limpar filtros aplicados
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            {/* Campo de Busca textual */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Search className="w-3 h-3" /> Busca Geral
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Código, descrição, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs bg-white h-9"
                />
              </div>
            </div>

            {/* Filtro por Cadastro / Entidade */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3" /> Cadastro / Entidade
              </label>
              <Select value={filtroEntidade} onValueChange={setFiltroEntidade}>
                <SelectTrigger className="text-xs bg-white h-9">
                  <SelectValue placeholder="Todas as entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as entidades</SelectItem>
                  <SelectItem value="Unidades escolares">Unidades escolares</SelectItem>
                  <SelectItem value="Municípios/Redes">Municípios/Redes</SelectItem>
                  <SelectItem value="Tipos de escola">Tipos de escola</SelectItem>
                  <SelectItem value="Cargos">Cargos</SelectItem>
                  <SelectItem value="Funções">Funções</SelectItem>
                  <SelectItem value="Etapas">Etapas</SelectItem>
                  <SelectItem value="Usuários">Usuários</SelectItem>
                  <SelectItem value="Contas de E-mail">Contas de E-mail</SelectItem>
                  <SelectItem value="Permissões">Permissões de Acesso</SelectItem>
                  <SelectItem value="Autenticação">Autenticação (Login)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Ação */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3" /> Ação Executada
              </label>
              <Select value={filtroAcao} onValueChange={setFiltroAcao}>
                <SelectTrigger className="text-xs bg-white h-9">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as ações</SelectItem>
                  <SelectItem value="Criação">Criação</SelectItem>
                  <SelectItem value="Edição">Edição</SelectItem>
                  <SelectItem value="Exclusão">Exclusão</SelectItem>
                  <SelectItem value="Login">Login</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Usuário */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" /> Usuário Responsável
              </label>
              <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
                <SelectTrigger className="text-xs bg-white h-9">
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os usuários</SelectItem>
                  {listaUsuarios.map((usr) => (
                    <SelectItem key={usr.email} value={usr.email}>
                      {usr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de Registros */}
          {loading ? (
            <div className="py-16 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" /> Carregando trilha de
              auditoria...
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2">
              <Filter className="w-8 h-8 text-slate-400" />
              <p className="font-medium text-slate-700">Nenhum registro de auditoria encontrado.</p>
              <p className="text-xs text-slate-500 max-w-md">
                {search ||
                filtroEntidade !== 'todas' ||
                filtroAcao !== 'todas' ||
                filtroUsuario !== 'todos'
                  ? 'Nenhum evento corresponde aos filtros selecionados. Tente limpar os filtros.'
                  : 'Assim que usuários realizarem logins ou alterações no sistema, os eventos aparecerão aqui automaticamente.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-xl shadow-2xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 border-b">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-28">
                      Identificador
                    </th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-44">
                      Data / Hora
                    </th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-56">
                      Usuário
                    </th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-28">
                      Ação
                    </th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider w-40">
                      Cadastro / Entidade
                    </th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                      Descrição da Ação
                    </th>
                    <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wider text-right w-20">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrosFiltrados.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => handleVisualizar(item)}
                    >
                      {/* Identificador (AUD-XXXX) */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.codigo || 'AUD-0000'}
                        </span>
                      </td>

                      {/* Data / Hora */}
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(item.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-slate-400 font-normal">
                            {new Date(item.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Usuário (Nome + Email) */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-900 text-xs truncate">
                            {item.usuario_nome || 'Sistema'}
                          </span>
                          {item.usuario_email ? (
                            <span className="text-[11px] text-slate-500 font-mono truncate">
                              {item.usuario_email}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Sem e-mail vinculado
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ação */}
                      <td className="py-3 px-4">{getAcaoBadge(item.acao)}</td>

                      {/* Cadastro / Entidade - exibe o código do registro vinculado apenas se existir */}
                      <td className="py-3 px-4 text-xs text-slate-700">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {item.entidade || 'Sistema'}
                          </span>
                          {item.registro_codigo ? (
                            <span className="font-mono text-[11px] text-blue-600 font-semibold">
                              Ref: {item.registro_codigo}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-4 text-xs text-slate-700 max-w-md">
                        <span className="line-clamp-2" title={item.descricao}>
                          {item.descricao}
                        </span>
                      </td>

                      {/* Botão de Ver Detalhes (somente leitura) */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="icon"
                          className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVisualizar(item)
                          }}
                          title="Visualizar Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO DE DETALHES (SOMENTE LEITURA) */}
      <Dialog open={openDetailsDialog} onOpenChange={setOpenDetailsDialog}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
              Registro de Auditoria
            </DialogTitle>
            <DialogDescription>
              Ficha detalhada e imutável do evento de auditoria registrado no sistema.
            </DialogDescription>
          </DialogHeader>

          {detalhesItem && (
            <div className="space-y-4 py-2 text-xs">
              {/* Cabeçalho do registro */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-lg">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Identificador do Evento
                  </span>
                  <span className="font-mono font-bold text-sm text-blue-700 mt-0.5 block">
                    {detalhesItem.codigo || 'AUD-0000'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Data e Hora
                  </span>
                  <span className="font-medium text-slate-900 mt-0.5 block">
                    {new Date(detalhesItem.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Informações do Usuário */}
              <div className="border-b pb-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Usuário Responsável
                </span>
                <p className="text-sm font-semibold text-slate-900">
                  {detalhesItem.usuario_nome || 'Sistema'}
                </p>
                {detalhesItem.usuario_email ? (
                  <p className="text-xs text-slate-600 font-mono">{detalhesItem.usuario_email}</p>
                ) : (
                  <p className="text-xs text-slate-400 italic">Sem e-mail vinculado</p>
                )}
                {detalhesItem.usuario_id && (
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID Auth: {detalhesItem.usuario_id}
                  </p>
                )}
              </div>

              {/* Ação e Entidade */}
              <div className="grid grid-cols-2 gap-3 border-b pb-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                    Ação Executada
                  </span>
                  {getAcaoBadge(detalhesItem.acao)}
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                    Cadastro / Entidade
                  </span>
                  <p className="font-semibold text-slate-900 text-sm">{detalhesItem.entidade}</p>
                  {detalhesItem.registro_codigo && (
                    <p className="font-mono text-xs text-blue-700 mt-0.5">
                      Código: {detalhesItem.registro_codigo}
                    </p>
                  )}
                </div>
              </div>

              {/* Resumo da Ação */}
              <div className="border-b pb-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Descrição / Resumo
                </span>
                <p className="text-xs leading-relaxed text-slate-800 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                  {detalhesItem.descricao}
                </p>
              </div>

              {/* Metadados / Detalhes técnicos gravados */}
              {detalhesItem.detalhes && Object.keys(detalhesItem.detalhes).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    Dados Adicionais da Carga (JSON)
                  </span>
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-[11px] overflow-x-auto max-h-48 font-mono">
                    {JSON.stringify(detalhesItem.detalhes, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button
              type="button"
              onClick={() => setOpenDetailsDialog(false)}
              className="text-xs bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
