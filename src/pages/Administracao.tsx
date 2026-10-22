import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Edit2,
  Trash2,
  Search,
  Loader2,
  Mail,
  ShieldCheck,
  UserCheck,
  Info,
  Calendar,
  KeyRound,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '@/services/usuarios'
import { UsuarioSistema, PerfilUsuario, EstadoUsuario } from '@/types/gestao-escolar'
import {
  PermissaoItemForm,
  getPermissoesPadraoOperador,
  getPermissoesUsuario,
} from '@/services/permissoes'
import { PermissoesFormTable } from '@/components/PermissoesFormTable'
import { useAuth } from '@/hooks/use-auth'

export default function Administracao() {
  const { user, isAdmin, canEdit, refreshPermissoes } = useAuth()
  const canEditUsuarios = isAdmin || canEdit('usuarios')
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // Modais
  const [openCreateDialog, setOpenCreateDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<UsuarioSistema | null>(null)
  const [deletingUsuario, setDeletingUsuario] = useState<UsuarioSistema | null>(null)

  // Formulário Novo Usuário (exatamente como na imagem + permissões se for Operador)
  const [formNome, setFormNome] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPerfil, setFormPerfil] = useState<PerfilUsuario>('Operador')
  const [formEstado, setFormEstado] = useState<EstadoUsuario>('Ativo')
  const [formPermissoes, setFormPermissoes] = useState<PermissaoItemForm[]>(
    getPermissoesPadraoOperador(),
  )
  const [loadingPermissoesEdit, setLoadingPermissoesEdit] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getUsuarios()
      setUsuarios(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: err.message || 'Falha ao buscar usuários do sistema.',
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
    setFormNome('')
    setFormEmail('')
    setFormPerfil('Operador')
    setFormEstado('Ativo')
    setFormPermissoes(getPermissoesPadraoOperador())
    setOpenCreateDialog(true)
  }

  const handleOpenEdit = async (targetUser: UsuarioSistema) => {
    setEditingUsuario(targetUser)
    setFormNome(targetUser.nome_completo)
    setFormEmail(targetUser.email)
    setFormPerfil(targetUser.perfil)
    setFormEstado(targetUser.estado)

    // Se for operador, carregar permissões específicas deste usuário
    if (targetUser.perfil === 'Operador') {
      try {
        setLoadingPermissoesEdit(true)
        const perms = await getPermissoesUsuario(targetUser.id)
        if (perms && perms.length > 0) {
          setFormPermissoes(
            perms.map((p) => ({
              id: p.id,
              codigo: p.codigo,
              menu_key: p.menu_key,
              menu_label: p.menu_label,
              pode_ver: p.pode_ver,
              pode_editar: p.pode_editar,
              suporta_edicao: p.suporta_edicao,
              ordem: p.ordem,
            })),
          )
        } else {
          setFormPermissoes(getPermissoesPadraoOperador())
        }
      } catch (err) {
        console.error('Erro ao carregar permissões do operador para edição:', err)
        setFormPermissoes(getPermissoesPadraoOperador())
      } finally {
        setLoadingPermissoesEdit(false)
      }
    } else {
      setFormPermissoes(getPermissoesPadraoOperador())
    }

    setOpenEditDialog(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome completo do usuário.',
        variant: 'destructive',
      })
      return
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      toast({
        title: 'Atenção',
        description: 'Informe um e-mail válido para login.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      const res = await createUsuario({
        nome_completo: formNome.trim(),
        email: formEmail.trim().toLowerCase(),
        perfil: formPerfil,
        estado: formEstado,
        permissoes: formPerfil === 'Operador' ? formPermissoes : undefined,
      })

      if (res.inviteSent) {
        toast({
          title: 'Usuário cadastrado!',
          description: `Identificador ${res.usuario.codigo || ''} gerado e convite enviado por e-mail com sucesso.`,
        })
      } else {
        toast({
          title: 'Usuário cadastrado com sucesso!',
          description: `Identificador ${res.usuario.codigo || ''} gerado automaticamente.`,
        })
      }

      setOpenCreateDialog(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar usuário',
        description: err.message || 'Não foi possível salvar o usuário.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUsuario) return
    if (!formNome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome completo do usuário.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      await updateUsuario(
        editingUsuario.id,
        {
          nome_completo: formNome.trim(),
          perfil: formPerfil,
          estado: formEstado,
          permissoes: formPerfil === 'Operador' ? formPermissoes : undefined,
        },
        user?.email || '',
      )
      toast({
        title: 'Usuário atualizado',
        description: 'Alterações salvas com sucesso!',
      })
      await refreshPermissoes()
      setOpenEditDialog(false)
      setEditingUsuario(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar usuário',
        description: err.message || 'Não foi possível atualizar o usuário.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingUsuario) return
    try {
      setSaving(true)
      await deleteUsuario(deletingUsuario, user?.email || '')
      toast({
        title: 'Usuário excluído',
        description: 'Registro e acesso removidos com sucesso.',
      })
      setDeletingUsuario(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir usuário',
        description: err.message || 'Não foi possível remover o usuário.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredUsuarios = usuarios.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.nome_completo.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.codigo && u.codigo.toLowerCase().includes(q)) ||
      u.perfil.toLowerCase().includes(q) ||
      u.estado.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Administração do Sistema
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gestão de usuários da plataforma: controle de perfis, estados de acesso e emissão de
          credenciais por e-mail
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Usuários do Sistema</CardTitle>
            <CardDescription>
              Total de {usuarios.length} usuário(s) registrado(s) na plataforma
            </CardDescription>
          </div>
          {canEditUsuarios && (
            <Button
              onClick={handleOpenCreate}
              className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              <Plus className="w-4 h-4" />
              Novo Usuário
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por identificador, nome, e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando usuários...
            </div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhum usuário encontrado. Clique em "Novo Usuário" para cadastrar.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium w-32">Identificador</th>
                    <th className="py-3 px-4 font-medium">Nome Completo</th>
                    <th className="py-3 px-4 font-medium">Login (E-mail)</th>
                    <th className="py-3 px-4 font-medium w-36">Perfil</th>
                    <th className="py-3 px-4 font-medium w-28">Estado</th>
                    <th className="py-3 px-4 font-medium w-36">Data de Criação</th>
                    <th className="py-3 px-4 font-medium text-right w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsuarios.map((u) => {
                    const isCurrentUser =
                      Boolean(user?.email) && u.email.toLowerCase() === user?.email?.toLowerCase()

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {u.codigo || 'USR-0000'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{u.nome_completo}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                                Você
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-xs">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.perfil === 'Administrador'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {u.perfil === 'Administrador' ? (
                              <ShieldCheck className="w-3 h-3 text-purple-600" />
                            ) : (
                              <UserCheck className="w-3 h-3 text-slate-600" />
                            )}
                            {u.perfil}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.estado === 'Ativo'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.estado === 'Ativo' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {u.estado}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          {canEditUsuarios ? (
                            <>
                              <Button
                                size="icon"
                                className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                                onClick={() => handleOpenEdit(u)}
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                                onClick={() => setDeletingUsuario(u)}
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Somente leitura</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL "NOVO USUÁRIO" — COM PERMISSÕES EMBUTIDAS PARA OPERADOR              */}
      {/* ========================================================================= */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent
          className={`p-6 rounded-2xl max-h-[92vh] overflow-y-auto transition-all ${
            formPerfil === 'Operador' ? 'sm:max-w-[760px]' : 'sm:max-w-[480px]'
          }`}
        >
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
              Novo Usuário
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 leading-normal">
              Cadastre um novo usuário. Um e-mail será enviado para que ele defina sua própria
              senha.
            </DialogDescription>
          </DialogHeader>

          {/* Caixa de informação azul claro */}
          <div className="rounded-xl border border-blue-200 bg-[#f0f6ff] p-3 text-xs text-blue-900 flex items-start gap-2.5 leading-relaxed mt-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              A identificação (ex: USR-0002) e a data de criação serão geradas automaticamente pelo
              sistema. Ao salvar, um e-mail com link para criação de senha será enviado ao login
              informado.
            </p>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            {/* Campo: NOME COMPLETO * */}
            <div className="space-y-1.5">
              <Label
                htmlFor="create-nome"
                className="text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                NOME COMPLETO <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="create-nome"
                placeholder="Ex: Carlos Alberto da Silva"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                required
                className="h-11 rounded-lg border-blue-400 focus-visible:ring-blue-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Campo: LOGIN DO USUÁRIO (E-MAIL VÁLIDO) * */}
            <div className="space-y-1.5">
              <Label
                htmlFor="create-email"
                className="text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                LOGIN DO USUÁRIO (E-MAIL VÁLIDO) <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="create-email"
                  type="email"
                  placeholder="usuario@empresa.com.br"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  className="pl-9 h-11 rounded-lg border-slate-300 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Linha dupla de seleção: PERFIL e ESTADO */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Coluna 1: PERFIL DO USUÁRIO * */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  PERFIL DO USUÁRIO <span className="text-rose-500">*</span>
                </Label>
                <div className="space-y-2">
                  {/* Card Administrador */}
                  <button
                    type="button"
                    onClick={() => setFormPerfil('Administrador')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      formPerfil === 'Administrador'
                        ? 'border-blue-600 bg-white ring-1 ring-blue-600 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formPerfil === 'Administrador' ? 'border-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {formPerfil === 'Administrador' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">Administrador</span>
                  </button>

                  {/* Card Operador */}
                  <button
                    type="button"
                    onClick={() => setFormPerfil('Operador')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      formPerfil === 'Operador'
                        ? 'border-blue-600 bg-white ring-1 ring-blue-600 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formPerfil === 'Operador' ? 'border-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {formPerfil === 'Operador' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </span>
                    <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">Operador</span>
                  </button>
                </div>
              </div>

              {/* Coluna 2: ESTADO ATUAL * */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  ESTADO ATUAL <span className="text-rose-500">*</span>
                </Label>
                <div className="space-y-2">
                  {/* Card Ativo */}
                  <button
                    type="button"
                    onClick={() => setFormEstado('Ativo')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      formEstado === 'Ativo'
                        ? 'border-emerald-600 bg-white ring-1 ring-emerald-600 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formEstado === 'Ativo' ? 'border-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {formEstado === 'Ativo' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">Ativo</span>
                  </button>

                  {/* Card Inativo */}
                  <button
                    type="button"
                    onClick={() => setFormEstado('Inativo')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      formEstado === 'Inativo'
                        ? 'border-rose-600 bg-white ring-1 ring-rose-600 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formEstado === 'Inativo' ? 'border-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {formEstado === 'Inativo' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate">Inativo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SEÇÃO CONDICIONAL DE PERMISSÕES: EXIBIDA SOMENTE QUANDO FOR OPERADOR */}
            {formPerfil === 'Operador' && (
              <PermissoesFormTable
                permissoes={formPermissoes}
                onChangePermissoes={setFormPermissoes}
                disabled={saving}
              />
            )}

            {/* Rodapé de botões */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                onClick={() => setOpenCreateDialog(false)}
                disabled={saving}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white font-medium px-4 h-10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white font-medium px-5 h-10 shadow-sm"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar e enviar e-mail
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EDITAR USUÁRIO — COM PERMISSÕES EMBUTIDAS PARA OPERADOR             */}
      {/* ========================================================================= */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent
          className={`p-6 rounded-2xl max-h-[92vh] overflow-y-auto transition-all ${
            formPerfil === 'Operador' ? 'sm:max-w-[760px]' : 'sm:max-w-[480px]'
          }`}
        >
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
              Editar Usuário
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 leading-normal">
              Atualize as informações cadastrais, perfil de acesso e estado da conta.
            </DialogDescription>
          </DialogHeader>

          {editingUsuario && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border rounded-lg text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-700 block">Identificador:</span>
                <span className="font-mono text-blue-700 font-bold">
                  {editingUsuario.codigo || 'USR-0000'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-700 block">Data de Criação:</span>
                <span className="flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {editingUsuario.created_at
                    ? new Date(editingUsuario.created_at).toLocaleDateString('pt-BR')
                    : '-'}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-nome"
                className="text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                NOME COMPLETO <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-nome"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                required
                className="h-11 rounded-lg border-slate-300 text-slate-800"
              />
            </div>

            {/* Login / E-mail é fixo (não editável) conforme especificação */}
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-email"
                className="text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                LOGIN DO USUÁRIO (E-MAIL)
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="edit-email"
                  type="email"
                  value={formEmail}
                  disabled
                  className="pl-9 h-11 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                O login é a credencial fixa de acesso e não pode ser alterado após a criação.
              </p>
            </div>

            {/* Linha dupla de seleção: PERFIL e ESTADO */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  PERFIL DO USUÁRIO <span className="text-rose-500">*</span>
                </Label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFormPerfil('Administrador')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      formPerfil === 'Administrador'
                        ? 'border-blue-600 bg-white ring-1 ring-blue-600 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formPerfil === 'Administrador' ? 'border-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {formPerfil === 'Administrador' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">Administrador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormPerfil('Operador')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      formPerfil === 'Operador'
                        ? 'border-blue-600 bg-white ring-1 ring-blue-600 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formPerfil === 'Operador' ? 'border-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {formPerfil === 'Operador' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </span>
                    <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">Operador</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  ESTADO ATUAL <span className="text-rose-500">*</span>
                </Label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFormEstado('Ativo')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      formEstado === 'Ativo'
                        ? 'border-emerald-600 bg-white ring-1 ring-emerald-600 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formEstado === 'Ativo' ? 'border-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {formEstado === 'Ativo' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">Ativo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormEstado('Inativo')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      formEstado === 'Inativo'
                        ? 'border-rose-600 bg-white ring-1 ring-rose-600 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        formEstado === 'Inativo' ? 'border-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {formEstado === 'Inativo' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate">Inativo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SEÇÃO CONDICIONAL DE PERMISSÕES: EXIBIDA SOMENTE QUANDO FOR OPERADOR */}
            {formPerfil === 'Operador' && (
              <>
                {loadingPermissoesEdit ? (
                  <div className="py-8 flex items-center justify-center text-xs text-slate-500 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Carregando permissões do operador...
                  </div>
                ) : (
                  <PermissoesFormTable
                    permissoes={formPermissoes}
                    onChangePermissoes={setFormPermissoes}
                    disabled={saving}
                  />
                )}
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                onClick={() => setOpenEditDialog(false)}
                disabled={saving}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white font-medium px-4 h-10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white font-medium px-5 h-10 shadow-sm"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EXCLUSÃO DE USUÁRIO                                                */}
      {/* ========================================================================= */}
      <AlertDialog
        open={!!deletingUsuario}
        onOpenChange={(open) => !open && setDeletingUsuario(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário do Sistema?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuário{' '}
              <strong className="text-slate-900">"{deletingUsuario?.nome_completo}"</strong> (
              {deletingUsuario?.email})? O perfil e o acesso de autenticação serão excluídos. Esta
              ação não pode ser desfeita.
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
              {saving ? 'Excluindo...' : 'Excluir Usuário'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
