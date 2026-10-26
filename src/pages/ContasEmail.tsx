import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Search,
  Loader2,
  Send,
  Pencil,
  Trash2,
  ShieldCheck,
  Server,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Check,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  getContasEmail,
  salvarContaEmail,
  deleteContaEmail,
  testarContaEmail,
} from '@/services/contas-email'
import { ContaEmail, CriptografiaSmtp } from '@/types/gestao-escolar'
import { PaginacaoTabela, ITENS_POR_PAGINA_PADRAO } from '@/components/PaginacaoTabela'

export default function ContasEmail() {
  const { isAdmin, canEdit } = useAuth()
  const canEditContasEmail = isAdmin || canEdit('contas_email')
  const [contas, setContas] = useState<ContaEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)

  // Modais
  const [openModal, setOpenModal] = useState(false)
  const [editingConta, setEditingConta] = useState<ContaEmail | null>(null)
  const [deletingConta, setDeletingConta] = useState<ContaEmail | null>(null)

  // Formulário Modal
  const [formDescricao, setFormDescricao] = useState('')
  const [formAtiva, setFormAtiva] = useState(true)
  const [formHost, setFormHost] = useState('')
  const [formPorta, setFormPorta] = useState('587')
  const [formCriptografia, setFormCriptografia] = useState<CriptografiaSmtp>('TLS')
  const [formUsuarioSmtp, setFormUsuarioSmtp] = useState('')
  const [formSenhaSmtp, setFormSenhaSmtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formEmailFrom, setFormEmailFrom] = useState('')
  const [formNomeFrom, setFormNomeFrom] = useState('')
  const [formReplyTo, setFormReplyTo] = useState('')
  const [formLimiteDiario, setFormLimiteDiario] = useState('')

  // Ordenação
  const [sortField, setSortField] = useState<
    'codigo' | 'descricao' | 'host' | 'email_from' | 'ativa'
  >('codigo')
  const [sortAsc, setSortAsc] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getContasEmail()
      setContas(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar contas de e-mail',
        description: err.message || 'Falha ao buscar dados no servidor.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreate = () => {
    setEditingConta(null)
    setFormDescricao('')
    setFormAtiva(true)
    setFormHost('')
    setFormPorta('587')
    setFormCriptografia('TLS')
    setFormUsuarioSmtp('')
    setFormSenhaSmtp('')
    setShowPassword(false)
    setFormEmailFrom('')
    setFormNomeFrom('')
    setFormReplyTo('')
    setFormLimiteDiario('')
    setOpenModal(true)
  }

  const handleOpenEdit = (conta: ContaEmail) => {
    setEditingConta(conta)
    setFormDescricao(conta.descricao)
    setFormAtiva(conta.ativa)
    setFormHost(conta.host)
    setFormPorta(String(conta.porta || 587))
    setFormCriptografia(conta.criptografia || 'TLS')
    setFormUsuarioSmtp(conta.usuario_smtp)
    setFormSenhaSmtp('') // Deixar em branco para manter a atual
    setShowPassword(false)
    setFormEmailFrom(conta.email_from)
    setFormNomeFrom(conta.nome_from)
    setFormReplyTo(conta.reply_to || '')
    setFormLimiteDiario(conta.limite_diario ? String(conta.limite_diario) : '')
    setOpenModal(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formDescricao.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o Nome / Descrição da Conta.',
        variant: 'destructive',
      })
      return
    }

    if (!formHost.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o Servidor SMTP (Host).',
        variant: 'destructive',
      })
      return
    }

    const portaNum = parseInt(formPorta, 10)
    if (isNaN(portaNum) || portaNum <= 0) {
      toast({
        title: 'Porta inválida',
        description: 'Informe um número de porta válido (ex: 587, 465).',
        variant: 'destructive',
      })
      return
    }

    if (!formUsuarioSmtp.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o Usuário (username) SMTP.',
        variant: 'destructive',
      })
      return
    }

    if (!editingConta && !formSenhaSmtp.trim()) {
      toast({
        title: 'Senha obrigatória',
        description: 'Para uma nova conta, a Senha SMTP é obrigatória.',
        variant: 'destructive',
      })
      return
    }

    if (!formEmailFrom.trim() || !formEmailFrom.includes('@')) {
      toast({
        title: 'E-mail do remetente inválido',
        description: 'Informe um e-mail válido para o Remetente (From).',
        variant: 'destructive',
      })
      return
    }

    if (!formNomeFrom.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o Nome de Exibição do Remetente.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      const res = await salvarContaEmail({
        id: editingConta?.id,
        descricao: formDescricao.trim(),
        ativa: formAtiva,
        host: formHost.trim(),
        porta: portaNum,
        criptografia: formCriptografia,
        usuario_smtp: formUsuarioSmtp.trim(),
        senha_smtp: formSenhaSmtp.trim() || undefined,
        email_from: formEmailFrom.trim(),
        nome_from: formNomeFrom.trim(),
        reply_to: formReplyTo.trim() || null,
        limite_diario: formLimiteDiario ? parseInt(formLimiteDiario, 10) : null,
      })

      toast({
        title: editingConta ? 'Conta atualizada com sucesso!' : 'Conta de E-mail criada!',
        description: `Identificador ${res.codigo || 'MAIL-0001'} configurado para disparos institucionais.`,
      })

      setOpenModal(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar conta de e-mail',
        description: err.message || 'Falha ao gravar os parâmetros no banco.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingConta) return
    try {
      setSaving(true)
      await deleteContaEmail(deletingConta)
      toast({
        title: 'Conta de e-mail excluída',
        description: `A conta ${deletingConta.codigo || ''} foi removida com sucesso.`,
      })
      setDeletingConta(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir conta',
        description: err.message || 'Não foi possível remover a conta.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTestar = async (conta: ContaEmail) => {
    try {
      setTestingId(conta.id)
      const resultado = await testarContaEmail(conta)

      if (resultado.sucesso) {
        toast({
          title: 'Teste de Parâmetros Concluído',
          description: resultado.mensagem,
        })
      } else {
        toast({
          title: 'Atenção ao Testar Conta',
          description: resultado.mensagem,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Falha no teste',
        description: err.message || 'Ocorreu um erro ao validar os parâmetros.',
        variant: 'destructive',
      })
    } finally {
      setTestingId(null)
    }
  }

  const handleSort = (field: 'codigo' | 'descricao' | 'host' | 'email_from' | 'ativa') => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const filteredContas = useMemo(() => {
    let list = contas.filter((c) => {
      const q = search.toLowerCase()
      return (
        (c.codigo && c.codigo.toLowerCase().includes(q)) ||
        c.descricao.toLowerCase().includes(q) ||
        c.host.toLowerCase().includes(q) ||
        c.usuario_smtp.toLowerCase().includes(q) ||
        c.email_from.toLowerCase().includes(q) ||
        c.nome_from.toLowerCase().includes(q) ||
        (c.reply_to && c.reply_to.toLowerCase().includes(q))
      )
    })

    list.sort((a, b) => {
      let aVal: any = a[sortField] || ''
      let bVal: any = b[sortField] || ''
      if (sortField === 'ativa') {
        aVal = a.ativa ? 1 : 0
        bVal = b.ativa ? 1 : 0
      }
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }
      if (aVal < bVal) return sortAsc ? -1 : 1
      if (aVal > bVal) return sortAsc ? 1 : -1
      return 0
    })

    return list
  }, [contas, search, sortField, sortAsc])

  const contasPaginadas = useMemo(() => {
    return filteredContas.slice(
      (paginaAtual - 1) * ITENS_POR_PAGINA_PADRAO,
      paginaAtual * ITENS_POR_PAGINA_PADRAO,
    )
  }, [filteredContas, paginaAtual])

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* CABEÇALHO CONFORME IMAGEM 1                                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Contas de E-mail (SMTP)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Gerencie os servidores SMTP institucionais para disparos do sistema
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canEditContasEmail && (
            <Button
              type="button"
              onClick={handleOpenCreate}
              className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white shadow-2xs font-medium text-xs sm:text-sm h-10 px-4"
            >
              <Plus className="w-4 h-4" />
              Nova Conta de E-mail
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CAMPO DE BUSCA CONFORME IMAGEM 1                                          */}
      {/* ========================================================================= */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por descrição, host, e-mail remetente ou código..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPaginaAtual(1)
          }}
          className="pl-10 h-11 bg-white border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus-visible:ring-blue-600 shadow-2xs"
        />
      </div>

      {/* ========================================================================= */}
      {/* TABELA DE CONTAS DE E-MAIL CONFORME IMAGEM 1                              */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-sm text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" /> Carregando contas de e-mail...
          </div>
        ) : filteredContas.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500 bg-slate-50/50 flex flex-col items-center justify-center gap-2">
            <Mail className="w-8 h-8 text-slate-400" />
            <p className="font-medium text-slate-700">Nenhuma conta de e-mail encontrada.</p>
            <p className="text-xs text-slate-500">
              {search
                ? 'Nenhum registro coincide com os termos da busca.'
                : 'Clique no botão "+ Nova Conta de E-mail" para criar a primeira configuração.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#f8fafc] text-slate-700 border-b border-slate-200">
                <tr>
                  {/* ID */}
                  <th
                    className="py-3.5 px-4 font-semibold text-xs tracking-tight text-slate-700 cursor-pointer select-none hover:bg-slate-100/80 w-28"
                    onClick={() => handleSort('codigo')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ID</span>
                      {sortField === 'codigo' ? (
                        sortAsc ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* Descrição da Conta */}
                  <th
                    className="py-3.5 px-4 font-semibold text-xs tracking-tight text-slate-700 cursor-pointer select-none hover:bg-slate-100/80"
                    onClick={() => handleSort('descricao')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Descrição da Conta</span>
                      {sortField === 'descricao' ? (
                        sortAsc ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* Servidor SMTP */}
                  <th
                    className="py-3.5 px-4 font-semibold text-xs tracking-tight text-slate-700 cursor-pointer select-none hover:bg-slate-100/80"
                    onClick={() => handleSort('host')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Servidor SMTP</span>
                      {sortField === 'host' ? (
                        sortAsc ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* Remetente */}
                  <th
                    className="py-3.5 px-4 font-semibold text-xs tracking-tight text-slate-700 cursor-pointer select-none hover:bg-slate-100/80"
                    onClick={() => handleSort('email_from')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Remetente</span>
                      {sortField === 'email_from' ? (
                        sortAsc ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* Status */}
                  <th
                    className="py-3.5 px-4 font-semibold text-xs tracking-tight text-slate-700 cursor-pointer select-none hover:bg-slate-100/80 w-28"
                    onClick={() => handleSort('ativa')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {sortField === 'ativa' ? (
                        sortAsc ? (
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* Ações */}
                  <th className="py-3.5 px-4 font-semibold text-xs tracking-tight text-slate-700 text-right w-36">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {contasPaginadas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* ID */}
                    <td className="py-4 px-4 align-top">
                      <div className="font-mono text-xs text-slate-600 leading-tight">
                        {item.codigo || 'MAIL-0000'}
                      </div>
                    </td>

                    {/* Descrição da Conta */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900 text-sm leading-tight">
                          {item.descricao}
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Usuário: {item.usuario_smtp}</span>
                        </div>
                      </div>
                    </td>

                    {/* Servidor SMTP */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-0.5">
                        <div className="font-mono text-xs text-slate-800">
                          {item.host}:{item.porta}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Criptografia: {item.criptografia}
                        </div>
                      </div>
                    </td>

                    {/* Remetente */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-0.5">
                        <div className="font-medium text-xs text-slate-900 leading-tight">
                          {item.nome_from}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.email_from}
                        </div>
                        {item.reply_to && (
                          <div className="text-[11px] text-slate-400">
                            Reply-To: <span className="font-mono">{item.reply_to}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 align-top">
                      {item.ativa ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Inativa
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEditContasEmail ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleTestar(item)}
                              disabled={testingId === item.id}
                              className="h-8 px-2.5 text-xs font-medium bg-[#0B2545] hover:bg-[#133A68] text-white gap-1.5 shadow-2xs"
                              title="Testar parâmetros da conta"
                            >
                              {testingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>Testar</span>
                            </Button>
                            <Button
                              size="icon"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                              title="Editar conta"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              size="icon"
                              onClick={() => setDeletingConta(item)}
                              className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                              title="Excluir conta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Somente leitura</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé da tabela com paginação padrão do sistema */}
        <PaginacaoTabela
          paginaAtual={paginaAtual}
          totalRegistros={filteredContas.length}
          itensPorPagina={ITENS_POR_PAGINA_PADRAO}
          onMudarPagina={setPaginaAtual}
          rotuloItens="contas de e-mail"
        />
      </div>

      {/* ========================================================================= */}
      {/* MODAL: NOVA CONTA / EDITAR CONTA (FIDELIDADE TOTAL À IMAGEM 2)             */}
      {/* ========================================================================= */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-[560px] p-6 rounded-2xl max-h-[92vh] overflow-y-auto">
          {/* Topo do Modal com Título, Subtítulo e Ícone de Envelope no Canto Direito */}
          <div className="flex items-start justify-between pb-2 border-b border-slate-100">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                {editingConta ? 'Editar Conta de E-mail (SMTP)' : 'Nova Conta de E-mail (SMTP)'}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure as credenciais e parâmetros do servidor de envio
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Linha 1: Identificador (AUTO) + Nome / Descrição da Conta * */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Campo Identificador */}
              <div className="sm:col-span-4 space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">Identificador</Label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    <Lock className="w-2.5 h-2.5" /> AUTO
                  </span>
                </div>
                <Input
                  value={editingConta?.codigo || 'Gerado automaticamente'}
                  disabled
                  readOnly
                  className="h-10 rounded-lg bg-slate-50 border-slate-200 font-mono text-xs text-slate-500 italic"
                />
                <span className="text-[10px] text-slate-400 block">Padrão MAIL-0001</span>
              </div>

              {/* Campo Nome / Descrição da Conta * */}
              <div className="sm:col-span-8 space-y-1">
                <Label htmlFor="smtp-descricao" className="text-xs font-semibold text-slate-700">
                  Nome / Descrição da Conta <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="smtp-descricao"
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  required
                  className="h-10 rounded-lg border-blue-400 focus-visible:ring-blue-600 text-sm text-slate-900"
                />
              </div>
            </div>

            {/* Cartão com switch: Conta Ativa para Envios */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label
                  htmlFor="switch-ativa"
                  className="text-xs font-bold text-slate-900 cursor-pointer"
                >
                  Conta Ativa para Envios
                </Label>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Desative a qualquer momento para suspender disparos sem remover a configuração
                </p>
              </div>
              <Switch
                id="switch-ativa"
                checked={formAtiva}
                onCheckedChange={setFormAtiva}
                className="data-[state=checked]:bg-[#0B2545]"
              />
            </div>

            {/* ===================================================================== */}
            {/* SEÇÃO 1: Conexão do Servidor SMTP                                     */}
            {/* ===================================================================== */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
                <Server className="w-4 h-4 text-blue-600" />
                <span>Conexão do Servidor SMTP</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Servidor SMTP (Host) * */}
                <div className="sm:col-span-6 space-y-1">
                  <Label htmlFor="smtp-host" className="text-xs font-medium text-slate-700">
                    Servidor SMTP (Host) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="smtp-host"
                    value={formHost}
                    onChange={(e) => setFormHost(e.target.value)}
                    required
                    className="h-10 rounded-lg border-slate-300 font-mono text-xs"
                  />
                </div>

                {/* Porta * */}
                <div className="sm:col-span-3 space-y-1">
                  <Label htmlFor="smtp-porta" className="text-xs font-medium text-slate-700">
                    Porta <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="smtp-porta"
                    type="number"
                    value={formPorta}
                    onChange={(e) => setFormPorta(e.target.value)}
                    required
                    className="h-10 rounded-lg border-slate-300 font-mono text-xs"
                  />
                </div>

                {/* Criptografia * */}
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Criptografia <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={formCriptografia}
                    onValueChange={(val: CriptografiaSmtp) => setFormCriptografia(val)}
                  >
                    <SelectTrigger className="h-10 rounded-lg border-slate-300 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TLS">TLS (STARTTLS)</SelectItem>
                      <SelectItem value="SSL">SSL / TLS Implícito</SelectItem>
                      <SelectItem value="NENHUMA">Nenhuma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* SEÇÃO 2: Autenticação SMTP (Criptografada)                             */}
            {/* ===================================================================== */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Autenticação SMTP (Criptografada)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Usuário (username) * */}
                <div className="space-y-1">
                  <Label htmlFor="smtp-usuario" className="text-xs font-medium text-slate-700">
                    Usuário (username) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="smtp-usuario"
                    value={formUsuarioSmtp}
                    onChange={(e) => setFormUsuarioSmtp(e.target.value)}
                    required
                    className="h-10 rounded-lg border-slate-300 text-xs font-mono"
                  />
                </div>

                {/* Senha SMTP * */}
                <div className="space-y-1">
                  <Label htmlFor="smtp-senha" className="text-xs font-medium text-slate-700">
                    Senha SMTP <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="smtp-senha"
                      type={showPassword ? 'text' : 'password'}
                      value={formSenhaSmtp}
                      onChange={(e) => setFormSenhaSmtp(e.target.value)}
                      required={!editingConta}
                      className="h-10 pr-10 rounded-lg border-slate-300 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                      tabIndex={-1}
                      title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-[11px] text-slate-500 leading-tight">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  A senha é protegida via criptografia simétrica AES-256 no banco de dados.
                </span>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* SEÇÃO 3: Dados do Remetente e Políticas                               */}
            {/* ===================================================================== */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Dados do Remetente e Políticas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* E-mail do Remetente (From) * */}
                <div className="space-y-1">
                  <Label htmlFor="smtp-email-from" className="text-xs font-medium text-slate-700">
                    E-mail do Remetente (From) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="smtp-email-from"
                    type="email"
                    value={formEmailFrom}
                    onChange={(e) => setFormEmailFrom(e.target.value)}
                    required
                    className="h-10 rounded-lg border-slate-300 text-xs font-mono"
                  />
                </div>

                {/* Nome de Exibição do Remetente * */}
                <div className="space-y-1">
                  <Label htmlFor="smtp-nome-from" className="text-xs font-medium text-slate-700">
                    Nome de Exibição do Remetente <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="smtp-nome-from"
                    value={formNomeFrom}
                    onChange={(e) => setFormNomeFrom(e.target.value)}
                    required
                    className="h-10 rounded-lg border-slate-300 text-xs"
                  />
                </div>

                {/* E-mail de Resposta (Reply-To) (Opcional) */}
                <div className="space-y-1">
                  <Label htmlFor="smtp-reply-to" className="text-xs font-medium text-slate-700">
                    E-mail de Resposta (Reply-To){' '}
                    <span className="text-slate-400 font-normal">(Opcional)</span>
                  </Label>
                  <Input
                    id="smtp-reply-to"
                    type="email"
                    value={formReplyTo}
                    onChange={(e) => setFormReplyTo(e.target.value)}
                    className="h-10 rounded-lg border-slate-300 text-xs font-mono"
                  />
                </div>

                {/* Limite de Envio por Dia (Opcional) */}
                <div className="space-y-1">
                  <Label
                    htmlFor="smtp-limite-diario"
                    className="text-xs font-medium text-slate-700"
                  >
                    Limite de Envio por Dia{' '}
                    <span className="text-slate-400 font-normal">(Opcional)</span>
                  </Label>
                  <Input
                    id="smtp-limite-diario"
                    type="number"
                    value={formLimiteDiario}
                    onChange={(e) => setFormLimiteDiario(e.target.value)}
                    className="h-10 rounded-lg border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Rodapé de Ações do Modal */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                onClick={() => setOpenModal(false)}
                disabled={saving}
                className="h-10 px-5 text-xs sm:text-sm font-medium bg-[#0B2545] hover:bg-[#133A68] text-white shadow-2xs"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={saving}
                className="h-10 px-6 text-xs sm:text-sm font-medium bg-[#0B2545] hover:bg-[#133A68] text-white shadow-2xs gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Salvar Conta de E-mail
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EXCLUSÃO DE CONTA DE E-MAIL                                        */}
      {/* ========================================================================= */}
      <AlertDialog
        open={Boolean(deletingConta)}
        onOpenChange={(open) => !open && setDeletingConta(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta de E-mail?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta{' '}
              <strong className="text-slate-900">
                "{deletingConta?.descricao}" ({deletingConta?.codigo})
              </strong>
              ? Disparos que dependam deste servidor ficarão suspensos até que uma nova conta seja
              configurada. Esta ação será registrada na trilha de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={saving}
              className="bg-[#0B2545] hover:bg-[#133A68] text-white hover:text-white border-transparent"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              disabled={saving}
            >
              {saving ? 'Excluindo...' : 'Excluir Conta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
