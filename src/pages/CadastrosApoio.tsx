import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Edit2, Trash2, Building2, Layers, Loader2, Search } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  getMunicipios,
  createMunicipio,
  updateMunicipio,
  deleteMunicipio,
  getTiposEscola,
  createTipoEscola,
  updateTipoEscola,
  deleteTipoEscola,
} from '@/services/apoio'
import { MunicipioRede, TipoEscola } from '@/types/gestao-escolar'

const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

export default function CadastrosApoio() {
  const [activeTab, setActiveTab] = useState<'municipios' | 'tipos'>('municipios')

  // Estados de Municípios
  const [municipios, setMunicipios] = useState<MunicipioRede[]>([])
  const [searchMunicipio, setSearchMunicipio] = useState('')
  const [loadingMunicipios, setLoadingMunicipios] = useState(true)
  const [openMunicipioDialog, setOpenMunicipioDialog] = useState(false)
  const [editingMunicipio, setEditingMunicipio] = useState<MunicipioRede | null>(null)
  const [municipioForm, setMunicipioForm] = useState({ nome: '', uf: 'SP', esfera: 'Municipal' })
  const [deletingMunicipio, setDeletingMunicipio] = useState<MunicipioRede | null>(null)

  // Estados de Tipos de Escola
  const [tiposEscola, setTiposEscola] = useState<TipoEscola[]>([])
  const [searchTipo, setSearchTipo] = useState('')
  const [loadingTipos, setLoadingTipos] = useState(true)
  const [openTipoDialog, setOpenTipoDialog] = useState(false)
  const [editingTipo, setEditingTipo] = useState<TipoEscola | null>(null)
  const [tipoForm, setTipoForm] = useState({ nome: '', descricao: '' })
  const [deletingTipo, setDeletingTipo] = useState<TipoEscola | null>(null)

  const [saving, setSaving] = useState(false)

  // Carregar dados
  const fetchMunicipios = async () => {
    try {
      setLoadingMunicipios(true)
      const data = await getMunicipios()
      setMunicipios(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar municípios',
        description: err.message || 'Falha ao buscar dados no banco.',
        variant: 'destructive',
      })
    } finally {
      setLoadingMunicipios(false)
    }
  }

  const fetchTipos = async () => {
    try {
      setLoadingTipos(true)
      const data = await getTiposEscola()
      setTiposEscola(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar tipos de escola',
        description: err.message || 'Falha ao buscar dados no banco.',
        variant: 'destructive',
      })
    } finally {
      setLoadingTipos(false)
    }
  }

  useEffect(() => {
    fetchMunicipios()
    fetchTipos()
  }, [])

  // Handlers para Municípios
  const handleOpenCreateMunicipio = () => {
    setEditingMunicipio(null)
    setMunicipioForm({ nome: '', uf: 'SP', esfera: 'Municipal' })
    setOpenMunicipioDialog(true)
  }

  const handleOpenEditMunicipio = (m: MunicipioRede) => {
    setEditingMunicipio(m)
    setMunicipioForm({ nome: m.nome, uf: m.uf, esfera: m.esfera })
    setOpenMunicipioDialog(true)
  }

  const handleSaveMunicipio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!municipioForm.nome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome do município/rede.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      if (editingMunicipio) {
        await updateMunicipio(editingMunicipio.id, municipioForm)
        toast({ title: 'Sucesso', description: 'Município/Rede atualizado com sucesso!' })
      } else {
        await createMunicipio(municipioForm)
        toast({ title: 'Sucesso', description: 'Município/Rede cadastrado com sucesso!' })
      }
      setOpenMunicipioDialog(false)
      await fetchMunicipios()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar o município.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMunicipioConfirm = async () => {
    if (!deletingMunicipio) return
    try {
      setSaving(true)
      await deleteMunicipio(deletingMunicipio.id)
      toast({ title: 'Removido', description: 'Município/Rede excluído com sucesso.' })
      setDeletingMunicipio(null)
      await fetchMunicipios()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description:
          err.message ||
          'Não foi possível excluir o município. Ele pode estar vinculado a escolas.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Handlers para Tipos de Escola
  const handleOpenCreateTipo = () => {
    setEditingTipo(null)
    setTipoForm({ nome: '', descricao: '' })
    setOpenTipoDialog(true)
  }

  const handleOpenEditTipo = (t: TipoEscola) => {
    setEditingTipo(t)
    setTipoForm({ nome: t.nome, descricao: t.descricao || '' })
    setOpenTipoDialog(true)
  }

  const handleSaveTipo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tipoForm.nome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome do tipo de escola.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      if (editingTipo) {
        await updateTipoEscola(editingTipo.id, tipoForm)
        toast({ title: 'Sucesso', description: 'Tipo de escola atualizado com sucesso!' })
      } else {
        await createTipoEscola(tipoForm)
        toast({ title: 'Sucesso', description: 'Tipo de escola cadastrado com sucesso!' })
      }
      setOpenTipoDialog(false)
      await fetchTipos()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar o tipo de escola.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTipoConfirm = async () => {
    if (!deletingTipo) return
    try {
      setSaving(true)
      await deleteTipoEscola(deletingTipo.id)
      toast({ title: 'Removido', description: 'Tipo de escola excluído com sucesso.' })
      setDeletingTipo(null)
      await fetchTipos()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description:
          err.message || 'Não foi possível excluir o tipo. Ele pode estar vinculado a escolas.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Filtros simples
  const filteredMunicipios = municipios.filter(
    (m) =>
      m.nome.toLowerCase().includes(searchMunicipio.toLowerCase()) ||
      m.uf.toLowerCase().includes(searchMunicipio.toLowerCase()) ||
      (m.codigo && m.codigo.toLowerCase().includes(searchMunicipio.toLowerCase())) ||
      m.esfera.toLowerCase().includes(searchMunicipio.toLowerCase()),
  )

  const filteredTipos = tiposEscola.filter(
    (t) =>
      t.nome.toLowerCase().includes(searchTipo.toLowerCase()) ||
      (t.codigo && t.codigo.toLowerCase().includes(searchTipo.toLowerCase())) ||
      (t.descricao && t.descricao.toLowerCase().includes(searchTipo.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Cadastros de Apoio
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gerencie as tabelas de apoio do sistema: municípios/redes de ensino e tipos de escola
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid w-full sm:w-[420px] grid-cols-2">
          <TabsTrigger value="municipios" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Municípios / Redes
          </TabsTrigger>
          <TabsTrigger value="tipos" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Tipos de Escola
          </TabsTrigger>
        </TabsList>

        {/* ABA: MUNICÍPIOS / REDES */}
        <TabsContent value="municipios" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg">Municípios / Redes de Ensino</CardTitle>
                <CardDescription>
                  Listagem e manutenção das redes e municípios integrados
                </CardDescription>
              </div>
              <Button onClick={handleOpenCreateMunicipio} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Município/Rede
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Pesquisar por código (MUN-XXXX), nome, UF..."
                  value={searchMunicipio}
                  onChange={(e) => setSearchMunicipio(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              {loadingMunicipios ? (
                <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando municípios...
                </div>
              ) : filteredMunicipios.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                  Nenhum município ou rede encontrado. Clique em "Novo Município/Rede" para
                  cadastrar.
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 border-b">
                      <tr>
                        <th className="py-3 px-4 font-medium w-28">Código</th>
                        <th className="py-3 px-4 font-medium">Nome do Município / Rede</th>
                        <th className="py-3 px-4 font-medium w-24">UF</th>
                        <th className="py-3 px-4 font-medium w-36">Esfera</th>
                        <th className="py-3 px-4 font-medium text-right w-28">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMunicipios.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {m.codigo || 'MUN-0000'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">{m.nome}</td>
                          <td className="py-3 px-4 text-slate-600">{m.uf}</td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                              {m.esfera}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-600 hover:text-slate-900"
                              onClick={() => handleOpenEditMunicipio(m)}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingMunicipio(m)}
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
        </TabsContent>

        {/* ABA: TIPOS DE ESCOLA */}
        <TabsContent value="tipos" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg">Tipos de Escola</CardTitle>
                <CardDescription>
                  Classificação das unidades escolares (Infantil, Fundamental, Médio, etc.)
                </CardDescription>
              </div>
              <Button onClick={handleOpenCreateTipo} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Tipo de Escola
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Pesquisar por código (TIP-XXXX), nome..."
                  value={searchTipo}
                  onChange={(e) => setSearchTipo(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              {loadingTipos ? (
                <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando tipos de
                  escola...
                </div>
              ) : filteredTipos.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                  Nenhum tipo de escola encontrado. Clique em "Novo Tipo de Escola" para cadastrar.
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 border-b">
                      <tr>
                        <th className="py-3 px-4 font-medium w-28">Código</th>
                        <th className="py-3 px-4 font-medium w-1/3">Tipo de Escola</th>
                        <th className="py-3 px-4 font-medium">Descrição</th>
                        <th className="py-3 px-4 font-medium text-right w-28">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTipos.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {t.codigo || 'TIP-0000'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">{t.nome}</td>
                          <td className="py-3 px-4 text-slate-600">{t.descricao || '-'}</td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-600 hover:text-slate-900"
                              onClick={() => handleOpenEditTipo(t)}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingTipo(t)}
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
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO: MUNICÍPIO (CRIAR/EDITAR) */}
      <Dialog open={openMunicipioDialog} onOpenChange={setOpenMunicipioDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingMunicipio ? 'Editar Município/Rede' : 'Novo Município/Rede'}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para salvar o cadastro de apoio.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveMunicipio} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label
                htmlFor="m-codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador do Sistema (Automático)
              </Label>
              <Input
                id="m-codigo"
                value={
                  editingMunicipio
                    ? editingMunicipio.codigo || 'MUN-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: MUN-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="m-nome">Nome do Município ou Rede de Ensino *</Label>
              <Input
                id="m-nome"
                placeholder="Ex: Ribeirão Preto - Rede Sul"
                value={municipioForm.nome}
                onChange={(e) => setMunicipioForm({ ...municipioForm, nome: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="m-uf">UF *</Label>
                <Select
                  value={municipioForm.uf}
                  onValueChange={(val) => setMunicipioForm({ ...municipioForm, uf: val })}
                >
                  <SelectTrigger id="m-uf">
                    <SelectValue placeholder="Selecione UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-esfera">Esfera Administrativa *</Label>
                <Select
                  value={municipioForm.esfera}
                  onValueChange={(val) => setMunicipioForm({ ...municipioForm, esfera: val })}
                >
                  <SelectTrigger id="m-esfera">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Municipal">Municipal</SelectItem>
                    <SelectItem value="Estadual">Estadual</SelectItem>
                    <SelectItem value="Federal">Federal</SelectItem>
                    <SelectItem value="Privada">Privada / Comunitária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenMunicipioDialog(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingMunicipio ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: EXCLUSÃO DE MUNICÍPIO */}
      <AlertDialog
        open={!!deletingMunicipio}
        onOpenChange={(open) => !open && setDeletingMunicipio(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Município / Rede?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o registro{' '}
              <strong className="text-slate-900">"{deletingMunicipio?.nome}"</strong> da base de
              dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMunicipioConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO: TIPO DE ESCOLA (CRIAR/EDITAR) */}
      <Dialog open={openTipoDialog} onOpenChange={setOpenTipoDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingTipo ? 'Editar Tipo de Escola' : 'Novo Tipo de Escola'}
            </DialogTitle>
            <DialogDescription>
              Defina a categoria ou etapa de ensino para as unidades escolares.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTipo} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label
                htmlFor="t-codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador do Sistema (Automático)
              </Label>
              <Input
                id="t-codigo"
                value={
                  editingTipo
                    ? editingTipo.codigo || 'TIP-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: TIP-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="t-nome">Nome da Modalidade / Tipo *</Label>
              <Input
                id="t-nome"
                placeholder="Ex: Ensino Médio Técnico Integrado"
                value={tipoForm.nome}
                onChange={(e) => setTipoForm({ ...tipoForm, nome: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-desc">Descrição (opcional)</Label>
              <Textarea
                id="t-desc"
                placeholder="Detalhes ou faixa etária atendida..."
                value={tipoForm.descricao}
                onChange={(e) => setTipoForm({ ...tipoForm, descricao: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenTipoDialog(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingTipo ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: EXCLUSÃO DE TIPO DE ESCOLA */}
      <AlertDialog open={!!deletingTipo} onOpenChange={(open) => !open && setDeletingTipo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tipo de Escola?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o tipo{' '}
              <strong className="text-slate-900">"{deletingTipo?.nome}"</strong> das tabelas de
              apoio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTipoConfirm}
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
