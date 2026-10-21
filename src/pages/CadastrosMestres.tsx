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
  Users,
  GraduationCap,
  MapPin,
  Eye,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getEscolas, createEscola, updateEscola, deleteEscola } from '@/services/escolas'
import { getMunicipios, getTiposEscola } from '@/services/apoio'
import { Escola, MunicipioRede, TipoEscola } from '@/types/gestao-escolar'

export default function CadastrosMestres() {
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [municipios, setMunicipios] = useState<MunicipioRede[]>([])
  const [tiposEscola, setTiposEscola] = useState<TipoEscola[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // Estados dos modais
  const [openFormDialog, setOpenFormDialog] = useState(false)
  const [openViewDialog, setOpenViewDialog] = useState(false)
  const [viewingEscola, setViewingEscola] = useState<Escola | null>(null)
  const [editingEscola, setEditingEscola] = useState<Escola | null>(null)
  const [deletingEscola, setDeletingEscola] = useState<Escola | null>(null)

  // Formulário
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    numero_alunos: 0,
    numero_servidores: 0,
    municipio_id: '',
    tipo_escola_id: '',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [escolasData, munData, tiposData] = await Promise.all([
        getEscolas(),
        getMunicipios(),
        getTiposEscola(),
      ])
      setEscolas(escolasData)
      setMunicipios(munData)
      setTiposEscola(tiposData)
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
    setEditingEscola(null)
    setFormData({
      nome: '',
      endereco: '',
      numero_alunos: 0,
      numero_servidores: 0,
      municipio_id: municipios[0]?.id || '',
      tipo_escola_id: tiposEscola[0]?.id || '',
    })
    setOpenFormDialog(true)
  }

  const handleOpenEdit = (escola: Escola) => {
    setEditingEscola(escola)
    setFormData({
      nome: escola.nome,
      endereco: escola.endereco || '',
      numero_alunos: escola.numero_alunos,
      numero_servidores: escola.numero_servidores,
      municipio_id: escola.municipio_id || '',
      tipo_escola_id: escola.tipo_escola_id || '',
    })
    setOpenFormDialog(true)
  }

  const handleOpenView = (escola: Escola) => {
    setViewingEscola(escola)
    setOpenViewDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome.trim()) {
      toast({
        title: 'Atenção',
        description: 'O nome da escola é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      const payload = {
        nome: formData.nome.trim(),
        endereco: formData.endereco.trim(),
        numero_alunos: Math.max(0, Number(formData.numero_alunos) || 0),
        numero_servidores: Math.max(0, Number(formData.numero_servidores) || 0),
        municipio_id: formData.municipio_id || null,
        tipo_escola_id: formData.tipo_escola_id || null,
      }

      if (editingEscola) {
        await updateEscola(editingEscola.id, payload)
        toast({ title: 'Escola atualizada', description: 'Os dados foram salvos com sucesso!' })
      } else {
        await createEscola(payload)
        toast({
          title: 'Escola cadastrada',
          description: 'Nova escola inserida no cadastro mestre.',
        })
      }
      setOpenFormDialog(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar escola',
        description: err.message || 'Falha ao persistir alterações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingEscola) return
    try {
      setSaving(true)
      await deleteEscola(deletingEscola.id)
      toast({ title: 'Escola excluída', description: 'Registro removido com sucesso.' })
      setDeletingEscola(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir escola',
        description: err.message || 'Não foi possível remover o registro.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredEscolas = escolas.filter(
    (e) =>
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.endereco.toLowerCase().includes(search.toLowerCase()) ||
      (e.codigo && e.codigo.toLowerCase().includes(search.toLowerCase())) ||
      (e.municipio?.nome && e.municipio.nome.toLowerCase().includes(search.toLowerCase())) ||
      (e.tipo_escola?.nome && e.tipo_escola.nome.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Cadastros Mestres
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gerenciamento central das escolas: cadastro, visualização, edição e contingente de alunos
          e servidores
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Relação de Escolas</CardTitle>
            <CardDescription>
              Total de {escolas.length} unidade(s) registrada(s) na base mestre
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Escola
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar código (UN-XXXX), escola, endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando escolas...
            </div>
          ) : filteredEscolas.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhuma escola encontrada. Clique em "Nova Escola" para adicionar o primeiro cadastro.
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium w-28">Código</th>
                    <th className="py-3 px-4 font-medium">Nome da Escola</th>
                    <th className="py-3 px-4 font-medium">Município / Rede</th>
                    <th className="py-3 px-4 font-medium">Tipo / Modalidade</th>
                    <th className="py-3 px-4 font-medium text-right">Alunos</th>
                    <th className="py-3 px-4 font-medium text-right">Servidores</th>
                    <th className="py-3 px-4 font-medium text-right w-36">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEscolas.map((escola) => (
                    <tr key={escola.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {escola.codigo || 'UN-0000'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{escola.nome}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{' '}
                          {escola.endereco || 'Endereço não informado'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {escola.municipio ? (
                          <span>
                            {escola.municipio.nome} ({escola.municipio.uf})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Não vinculado</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {escola.tipo_escola ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                            {escola.tipo_escola.nome}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Geral</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {escola.numero_alunos.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {escola.numero_servidores.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:text-slate-900"
                          onClick={() => handleOpenView(escola)}
                          title="Visualizar Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:text-slate-900"
                          onClick={() => handleOpenEdit(escola)}
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingEscola(escola)}
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

      {/* MODAL: CRIAR / EDITAR ESCOLA */}
      <Dialog open={openFormDialog} onOpenChange={setOpenFormDialog}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editingEscola ? 'Editar Cadastro de Escola' : 'Novo Cadastro de Escola'}
            </DialogTitle>
            <DialogDescription>
              Informe os dados da escola, localização e contingente de alunos e servidores.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Campo identificador automático somente leitura */}
            <div className="space-y-2">
              <Label
                htmlFor="codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador do Sistema (Automático)
              </Label>
              <Input
                id="codigo"
                value={
                  editingEscola
                    ? editingEscola.codigo || 'UN-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: UN-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Escola *</Label>
              <Input
                id="nome"
                placeholder="Ex: EMEF Professor José Silva"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço Completo</Label>
              <Input
                id="endereco"
                placeholder="Ex: Rua das Flores, 100 - Bairro Centro"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="municipio">Município / Rede de Apoio</Label>
                <Select
                  value={formData.municipio_id}
                  onValueChange={(val) => setFormData({ ...formData, municipio_id: val })}
                >
                  <SelectTrigger id="municipio">
                    <SelectValue placeholder="Selecione o Município/Rede" />
                  </SelectTrigger>
                  <SelectContent>
                    {municipios.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome} ({m.uf})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo / Modalidade</Label>
                <Select
                  value={formData.tipo_escola_id}
                  onValueChange={(val) => setFormData({ ...formData, tipo_escola_id: val })}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione a Modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposEscola.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-2">
                <Label htmlFor="numero_alunos">Número de Alunos *</Label>
                <Input
                  id="numero_alunos"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.numero_alunos}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_alunos: parseInt(e.target.value, 10) || 0 })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_servidores">Número de Servidores *</Label>
                <Input
                  id="numero_servidores"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.numero_servidores}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numero_servidores: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  required
                />
              </div>
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
                {editingEscola ? 'Atualizar Escola' : 'Cadastrar Escola'}
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
              Detalhes da Escola
            </DialogTitle>
            <DialogDescription>Ficha cadastral consolidada no cadastro mestre</DialogDescription>
          </DialogHeader>
          {viewingEscola && (
            <div className="space-y-4 py-2 text-sm">
              <div className="border-b pb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Identificador
                  </span>
                  <p className="font-mono text-sm font-bold text-blue-700 mt-0.5">
                    {viewingEscola.codigo || 'UN-0000'}
                  </p>
                </div>
              </div>

              <div className="border-b pb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Nome da Escola
                </span>
                <p className="text-base font-medium text-slate-900 mt-0.5">{viewingEscola.nome}</p>
              </div>

              <div className="border-b pb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Endereço
                </span>
                <p className="text-slate-800 mt-0.5">{viewingEscola.endereco || 'Não informado'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-3">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Município / Rede
                  </span>
                  <p className="text-slate-800 mt-0.5">
                    {viewingEscola.municipio
                      ? `${viewingEscola.municipio.nome} (${viewingEscola.municipio.uf})`
                      : 'Não vinculado'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Tipo de Escola
                  </span>
                  <p className="text-slate-800 mt-0.5">
                    {viewingEscola.tipo_escola?.nome || 'Geral'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Alunos</span>
                    <p className="text-lg font-bold text-slate-900 font-mono">
                      {viewingEscola.numero_alunos.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Servidores</span>
                    <p className="text-lg font-bold text-slate-900 font-mono">
                      {viewingEscola.numero_servidores.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
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
        open={!!deletingEscola}
        onOpenChange={(open) => !open && setDeletingEscola(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Escola?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o cadastro da escola{' '}
              <strong className="text-slate-900">"{deletingEscola?.nome}"</strong>? Esta ação não
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
