import { useEffect, useState, useMemo } from 'react'
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
import { Plus, Edit2, Trash2, Loader2, Search, BookOpen, Eye, Calendar } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getAnosSeries, createAnoSerie, updateAnoSerie, deleteAnoSerie } from '@/services/apoio'
import { AnoSerie } from '@/types/gestao-escolar'
import { ANOS_LETIVOS } from './Etapas'

export { ANOS_LETIVOS }

export default function AnosSeries() {
  const { isAdmin, canEdit } = useAuth()
  const canEditAnosSeries = isAdmin || canEdit('anos_series')

  const [anosSeries, setAnosSeries] = useState<AnoSerie[]>([])
  const [search, setSearch] = useState('')
  const [filtroAno, setFiltroAno] = useState<string>('todos')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modais de Criação / Edição
  const [openDialog, setOpenDialog] = useState(false)
  const [editingAnoSerie, setEditingAnoSerie] = useState<AnoSerie | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formAnoLetivo, setFormAnoLetivo] = useState<number>(new Date().getFullYear())

  // Modal de Visualização (Somente leitura)
  const [viewingAnoSerie, setViewingAnoSerie] = useState<AnoSerie | null>(null)
  const [openViewDialog, setOpenViewDialog] = useState(false)

  // Modal de Exclusão
  const [deletingAnoSerie, setDeletingAnoSerie] = useState<AnoSerie | null>(null)

  const fetchAnosSeries = async () => {
    try {
      setLoading(true)
      const data = await getAnosSeries()
      setAnosSeries(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar anos/séries',
        description: err.message || 'Falha ao buscar dados no banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnosSeries()
  }, [])

  const handleOpenCreate = () => {
    setEditingAnoSerie(null)
    setFormNome('')
    const anoAtual = new Date().getFullYear()
    setFormAnoLetivo(anoAtual >= 2020 && anoAtual <= 2040 ? anoAtual : 2026)
    setOpenDialog(true)
  }

  const handleOpenEdit = (item: AnoSerie) => {
    setEditingAnoSerie(item)
    setFormNome(item.nome)
    setFormAnoLetivo(item.ano_letivo)
    setOpenDialog(true)
  }

  const handleOpenView = (item: AnoSerie) => {
    setViewingAnoSerie(item)
    setOpenViewDialog(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome do Ano/Série.',
        variant: 'destructive',
      })
      return
    }

    if (!formAnoLetivo || formAnoLetivo < 2020 || formAnoLetivo > 2040) {
      toast({
        title: 'Atenção',
        description: 'Selecione um ano letivo válido entre 2020 e 2040.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      if (editingAnoSerie) {
        await updateAnoSerie(editingAnoSerie.id, {
          nome: formNome.trim(),
          ano_letivo: formAnoLetivo,
        })
        toast({ title: 'Sucesso', description: 'Ano/Série atualizado com sucesso!' })
      } else {
        await createAnoSerie({
          nome: formNome.trim(),
          ano_letivo: formAnoLetivo,
        })
        toast({ title: 'Sucesso', description: 'Ano/Série cadastrado com sucesso!' })
      }
      setOpenDialog(false)
      await fetchAnosSeries()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar o ano/série.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingAnoSerie) return
    try {
      setSaving(true)
      await deleteAnoSerie(deletingAnoSerie.id)
      toast({ title: 'Removido', description: 'Ano/Série excluído com sucesso.' })
      setDeletingAnoSerie(null)
      await fetchAnosSeries()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Não foi possível excluir o ano/série.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredAnosSeries = useMemo(() => {
    return anosSeries.filter((item) => {
      // Filtro de ano letivo
      if (filtroAno !== 'todos' && String(item.ano_letivo) !== filtroAno) {
        return false
      }
      // Busca por texto (código, nome ou ano)
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchCodigo = item.codigo?.toLowerCase().includes(q)
        const matchNome = item.nome.toLowerCase().includes(q)
        const matchAno = String(item.ano_letivo).includes(q)
        return matchCodigo || matchNome || matchAno
      }
      return true
    })
  }, [anosSeries, search, filtroAno])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
          <span>Cadastros de Apoio</span>
          <span>&rsaquo;</span>
          <span>Ano/Série</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <BookOpen className="w-7 h-7 text-blue-600" />
          Cadastro de Ano/Série
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gerenciamento e manutenção dos anos e séries escolares por ano letivo atendidos pela rede
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Anos/Séries Cadastrados</CardTitle>
            <CardDescription>
              Total de {anosSeries.length} ano(s)/série(s) cadastrado(s) na tabela de apoio
            </CardDescription>
          </div>
          {canEditAnosSeries && (
            <Button
              onClick={handleOpenCreate}
              className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              <Plus className="w-4 h-4" />
              Novo Ano/Série
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de Filtros / Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por identificador (ANO-XXXX), nome ou ano letivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="w-full sm:w-48">
              <Select value={filtroAno} onValueChange={setFiltroAno}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Ano Letivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os anos</SelectItem>
                  {ANOS_LETIVOS.map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>
                      Ano {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(search || filtroAno !== 'todos') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setFiltroAno('todos')
                }}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                Limpar filtros
              </Button>
            )}
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando anos/séries...
            </div>
          ) : filteredAnosSeries.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhum ano/série encontrado.{' '}
              {search || filtroAno !== 'todos'
                ? 'Tente outro termo ou limpe os filtros.'
                : 'Clique em "Novo Ano/Série" para cadastrar.'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium w-32">Identificador</th>
                    <th className="py-3 px-4 font-medium">Nome do Ano/Série</th>
                    <th className="py-3 px-4 font-medium w-36 text-center">Ano Letivo</th>
                    <th className="py-3 px-4 font-medium text-right w-36">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAnosSeries.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Identificador sequencial automático ANO-XXXX */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.codigo || 'ANO-0000'}
                        </span>
                      </td>

                      {/* Nome do Ano/Série */}
                      <td className="py-3 px-4 font-medium text-slate-900">{item.nome}</td>

                      {/* Ano Letivo */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {item.ano_letivo}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleOpenView(item)}
                          title="Visualizar detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {canEditAnosSeries ? (
                          <>
                            <Button
                              size="icon"
                              className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                              onClick={() => handleOpenEdit(item)}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                              onClick={() => setDeletingAnoSerie(item)}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO: CRIAR / EDITAR ANO/SÉRIE */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              {editingAnoSerie ? 'Editar Ano/Série' : 'Novo Ano/Série'}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para salvar o Ano/Série no cadastro de apoio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {/* Campo 1: Identificador (Automático / Informativo / Não editável) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ano-codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador (Automático)
              </Label>
              <Input
                id="ano-codigo"
                value={
                  editingAnoSerie
                    ? editingAnoSerie.codigo || 'ANO-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: ANO-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400">
                Código sequencial gerado e atribuído automaticamente pelo sistema.
              </p>
            </div>

            {/* Campo 2: Nome do Ano/Série (Obrigatório) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ano-nome"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Nome do Ano/Série <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="ano-nome"
                placeholder="Ex: 1º Ano do Ensino Fundamental"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            {/* Campo 3: Ano Letivo (Combobox de 2020 a 2040) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ano-letivo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Ano Letivo <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={String(formAnoLetivo)}
                onValueChange={(val) => setFormAnoLetivo(Number(val))}
              >
                <SelectTrigger id="ano-letivo" className="text-sm">
                  <SelectValue placeholder="Selecione o ano letivo" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {ANOS_LETIVOS.map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400">
                Selecione o ano letivo de vigência deste Ano/Série (faixa 2020 a 2040).
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                onClick={() => setOpenDialog(false)}
                disabled={saving}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingAnoSerie ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: VISUALIZAR ANO/SÉRIE (SOMENTE LEITURA) */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Detalhes do Ano/Série
            </DialogTitle>
            <DialogDescription>
              Ficha informativa do Ano/Série cadastrado no apoio educacional.
            </DialogDescription>
          </DialogHeader>

          {viewingAnoSerie && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Identificador
                </span>
                <span className="font-mono font-bold text-sm text-blue-700">
                  {viewingAnoSerie.codigo || 'ANO-0000'}
                </span>
              </div>

              <div className="border-b pb-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Nome do Ano/Série
                </span>
                <p className="text-sm font-semibold text-slate-900">{viewingAnoSerie.nome}</p>
              </div>

              <div className="border-b pb-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Ano Letivo
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Ano {viewingAnoSerie.ano_letivo}
                </span>
              </div>

              {viewingAnoSerie.created_at && (
                <div className="text-[11px] text-slate-400">
                  Cadastrado em: {new Date(viewingAnoSerie.created_at).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setOpenViewDialog(false)}
              className="bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: EXCLUSÃO DE ANO/SÉRIE */}
      <AlertDialog
        open={!!deletingAnoSerie}
        onOpenChange={(open) => !open && setDeletingAnoSerie(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ano/Série?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o Ano/Série{' '}
              <strong className="text-slate-900">"{deletingAnoSerie?.nome}"</strong> (Ano Letivo:{' '}
              {deletingAnoSerie?.ano_letivo}) da base de dados do sistema.
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
              {saving ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
