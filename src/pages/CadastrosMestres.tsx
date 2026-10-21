import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  School,
  Search,
  Loader2,
  MapPin,
  Eye,
  Layers,
  Clock,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  getUnidadesEscolares,
  createUnidadeEscolar,
  updateUnidadeEscolar,
  deleteUnidadeEscolar,
} from '@/services/unidades-escolares'
import {
  UnidadeEscolar,
  TipoAtendimentoUnidade,
  OPCOES_NIVEL_20H,
  OPCOES_NIVEL_40H,
} from '@/types/gestao-escolar'

export default function CadastrosMestres() {
  const [unidades, setUnidades] = useState<UnidadeEscolar[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // Modais
  const [openFormDialog, setOpenFormDialog] = useState(false)
  const [openViewDialog, setOpenViewDialog] = useState(false)
  const [viewingUnidade, setViewingUnidade] = useState<UnidadeEscolar | null>(null)
  const [editingUnidade, setEditingUnidade] = useState<UnidadeEscolar | null>(null)
  const [deletingUnidade, setDeletingUnidade] = useState<UnidadeEscolar | null>(null)

  // Formulário de Unidade Escolar
  const [formData, setFormData] = useState<{
    nome: string
    tipo_atendimento: TipoAtendimentoUnidade | ''
    nivel_porte: string
    localizacao: string
  }>({
    nome: '',
    tipo_atendimento: '',
    nivel_porte: '',
    localizacao: '',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getUnidadesEscolares()
      setUnidades(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Falha ao sincronizar com o banco de dados.',
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
    setEditingUnidade(null)
    setFormData({
      nome: '',
      tipo_atendimento: '',
      nivel_porte: '',
      localizacao: '',
    })
    setOpenFormDialog(true)
  }

  const handleOpenEdit = (unidade: UnidadeEscolar) => {
    setEditingUnidade(unidade)
    setFormData({
      nome: unidade.nome,
      tipo_atendimento: unidade.tipo_atendimento,
      nivel_porte: unidade.nivel_porte,
      localizacao: unidade.localizacao,
    })
    setOpenFormDialog(true)
  }

  const handleOpenView = (unidade: UnidadeEscolar) => {
    setViewingUnidade(unidade)
    setOpenViewDialog(true)
  }

  // Manipulador da troca de Tipo de Atendimento: limpa/reseta a seleção anterior do segundo combo
  const handleTipoAtendimentoChange = (val: string) => {
    const novoTipo = val as TipoAtendimentoUnidade
    setFormData((prev) => ({
      ...prev,
      tipo_atendimento: novoTipo,
      nivel_porte: '', // Reset obrigatório ao alternar o combo primário
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast({
        title: 'Atenção',
        description: 'O Nome da Unidade escolar é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    if (!formData.tipo_atendimento) {
      toast({
        title: 'Atenção',
        description: 'Selecione o tipo de atendimento da unidade.',
        variant: 'destructive',
      })
      return
    }

    if (!formData.nivel_porte) {
      toast({
        title: 'Atenção',
        description: 'Selecione a opção de nível/porte da unidade escolar.',
        variant: 'destructive',
      })
      return
    }

    if (!formData.localizacao.trim()) {
      toast({
        title: 'Atenção',
        description: 'A localização da unidade escolar é obrigatória.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      const payload = {
        nome: formData.nome.trim(),
        tipo_atendimento: formData.tipo_atendimento as TipoAtendimentoUnidade,
        nivel_porte: formData.nivel_porte,
        localizacao: formData.localizacao.trim(),
      }

      if (editingUnidade) {
        await updateUnidadeEscolar(editingUnidade.id, payload)
        toast({
          title: 'Unidade escolar atualizada',
          description: 'Os dados foram salvos com sucesso!',
        })
      } else {
        await createUnidadeEscolar(payload)
        toast({
          title: 'Unidade escolar cadastrada',
          description: 'Nova unidade escolar inserida com identificador automático.',
        })
      }
      setOpenFormDialog(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar unidade escolar',
        description: err.message || 'Falha ao persistir alterações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingUnidade) return
    try {
      setSaving(true)
      await deleteUnidadeEscolar(deletingUnidade.id)
      toast({
        title: 'Unidade escolar excluída',
        description: 'Registro removido com sucesso.',
      })
      setDeletingUnidade(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir unidade escolar',
        description: err.message || 'Não foi possível remover o registro.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredUnidades = unidades.filter(
    (u) =>
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      (u.codigo && u.codigo.toLowerCase().includes(search.toLowerCase())) ||
      u.tipo_atendimento.toLowerCase().includes(search.toLowerCase()) ||
      u.nivel_porte.toLowerCase().includes(search.toLowerCase()) ||
      u.localizacao.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
          <span>Cadastros Mestres</span>
          <span>&rsaquo;</span>
          <span>Unidades escolares</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Unidades Escolares
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Cadastro central de unidades da rede com definição de atendimento, nível/porte e
          localização
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Relação de Unidades Escolares</CardTitle>
            <CardDescription>
              Total de {unidades.length} unidade(s) escolar(es) cadastrada(s)
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Unidade Escolar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar código (UN-XXXX), nome, nível, local..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando unidades
              escolares...
            </div>
          ) : filteredUnidades.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhuma unidade escolar encontrada.{' '}
              {search
                ? 'Tente outro termo na busca.'
                : 'Clique em "Nova Unidade Escolar" para adicionar o primeiro cadastro.'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium w-28">Código</th>
                    <th className="py-3 px-4 font-medium">Nome da Unidade Escolar</th>
                    <th className="py-3 px-4 font-medium">Tipo de Atendimento</th>
                    <th className="py-3 px-4 font-medium">Nível / Faixa</th>
                    <th className="py-3 px-4 font-medium">Localização</th>
                    <th className="py-3 px-4 font-medium text-right w-36">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnidades.map((unidade) => (
                    <tr key={unidade.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {unidade.codigo || 'UN-0000'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{unidade.nome}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {unidade.tipo_atendimento}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          <Layers className="w-3 h-3 text-blue-600" />
                          {unidade.nivel_porte}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[220px]" title={unidade.localizacao}>
                            {unidade.localizacao}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:text-slate-900"
                          onClick={() => handleOpenView(unidade)}
                          title="Visualizar Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:text-slate-900"
                          onClick={() => handleOpenEdit(unidade)}
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingUnidade(unidade)}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* MODAL: CRIAR / EDITAR UNIDADE ESCOLAR */}
      <Dialog open={openFormDialog} onOpenChange={setOpenFormDialog}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editingUnidade ? 'Editar Unidade Escolar' : 'Nova Unidade Escolar'}
            </DialogTitle>
            <DialogDescription>
              Preencha os atributos da unidade escolar. O identificador UN é gerado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* 1. Identificador da Unidade escolar (Campo gerado automaticamente) */}
            <div className="space-y-2">
              <Label
                htmlFor="codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador da Unidade escolar (Campo gerado automaticamente)
              </Label>
              <Input
                id="codigo"
                value={
                  editingUnidade
                    ? editingUnidade.codigo || 'UN-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: UN-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* 2. Nome da Unidade escolar * */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Unidade escolar *</Label>
              <Input
                id="nome"
                placeholder="Ex: EMEF Professora Maria Aparecida"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            {/* 3. Combo box com as seguintes Opções: 'Ensino Fundamental e Educação Infantil (20h)' ou 'Educação Infantil (40h)' */}
            <div className="space-y-2">
              <Label htmlFor="tipo_atendimento">Tipo de Atendimento da Unidade *</Label>
              <Select value={formData.tipo_atendimento} onValueChange={handleTipoAtendimentoChange}>
                <SelectTrigger id="tipo_atendimento">
                  <SelectValue placeholder="Selecione o tipo de atendimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ensino Fundamental e Educação Infantil (20h)">
                    Ensino Fundamental e Educação Infantil (20h)
                  </SelectItem>
                  <SelectItem value="Educação Infantil (40h)">Educação Infantil (40h)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. REGRA CONDICIONAL: Segundo combo box baseado na escolha do primeiro */}
            {formData.tipo_atendimento === 'Ensino Fundamental e Educação Infantil (20h)' && (
              <div className="space-y-2 bg-blue-50/60 p-3.5 rounded-lg border border-blue-200">
                <Label htmlFor="nivel_porte_20h" className="text-blue-950 font-semibold">
                  Nível / Faixa de Alunos (20h) *
                </Label>
                <Select
                  value={formData.nivel_porte}
                  onValueChange={(val) => setFormData({ ...formData, nivel_porte: val })}
                >
                  <SelectTrigger id="nivel_porte_20h" className="bg-white">
                    <SelectValue placeholder="Selecione o nível ou faixa de alunos" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_NIVEL_20H.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>
                        {opcao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-blue-700">
                  Opções disponíveis para Ensino Fundamental e Educação Infantil (20h)
                </p>
              </div>
            )}

            {formData.tipo_atendimento === 'Educação Infantil (40h)' && (
              <div className="space-y-2 bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200">
                <Label htmlFor="nivel_porte_40h" className="text-emerald-950 font-semibold">
                  Nível / Faixa de Alunos (40h) *
                </Label>
                <Select
                  value={formData.nivel_porte}
                  onValueChange={(val) => setFormData({ ...formData, nivel_porte: val })}
                >
                  <SelectTrigger id="nivel_porte_40h" className="bg-white">
                    <SelectValue placeholder="Selecione o nível ou faixa de alunos" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_NIVEL_40H.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>
                        {opcao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-emerald-700">
                  Opções disponíveis para Educação Infantil (40h)
                </p>
              </div>
            )}

            {/* 5. Localização da unidade (último campo) */}
            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização da unidade *</Label>
              <Input
                id="localizacao"
                placeholder="Ex: Rua das Palmeiras, 120 - Centro ou Zona Urbana"
                value={formData.localizacao}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenFormDialog(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingUnidade ? 'Atualizar Unidade' : 'Cadastrar Unidade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: VISUALIZAÇÃO DE DETALHES */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="w-5 h-5 text-primary" />
              Detalhes da Unidade Escolar
            </DialogTitle>
            <DialogDescription>Ficha cadastral consolidada no cadastro mestre</DialogDescription>
          </DialogHeader>
          {viewingUnidade && (
            <div className="space-y-4 py-2 text-sm">
              <div className="border-b pb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Identificador da Unidade
                  </span>
                  <p className="font-mono text-sm font-bold text-blue-700 mt-0.5">
                    {viewingUnidade.codigo || 'UN-0000'}
                  </p>
                </div>
              </div>

              <div className="border-b pb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Nome da Unidade Escolar
                </span>
                <p className="text-base font-medium text-slate-900 mt-0.5">{viewingUnidade.nome}</p>
              </div>

              <div className="border-b pb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Tipo de Atendimento
                </span>
                <p className="text-slate-800 font-medium mt-0.5">
                  {viewingUnidade.tipo_atendimento}
                </p>
              </div>

              <div className="border-b pb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Nível / Porte
                </span>
                <p className="text-slate-800 font-medium mt-0.5">{viewingUnidade.nivel_porte}</p>
              </div>

              <div className="pb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Localização da Unidade
                </span>
                <p className="text-slate-800 mt-0.5">{viewingUnidade.localizacao}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setOpenViewDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog
        open={!!deletingUnidade}
        onOpenChange={(open) => !open && setDeletingUnidade(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Unidade Escolar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o cadastro da unidade escolar{' '}
              <strong className="text-slate-900">"{deletingUnidade?.nome}"</strong>? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
