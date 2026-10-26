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
import { SelectPaginado } from '@/components/SelectPaginado'
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
import { Plus, Edit2, Trash2, Loader2, Search, GraduationCap, Eye, Calendar } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getEtapas, createEtapa, updateEtapa, deleteEtapa } from '@/services/apoio'
import { Etapa } from '@/types/gestao-escolar'

// Combobox com os anos de 2020 a 2040 (inclusive)
export const ANOS_LETIVOS: number[] = Array.from({ length: 2040 - 2020 + 1 }, (_, i) => 2020 + i)

export default function Etapas() {
  const { isAdmin, canEdit } = useAuth()
  const canEditEtapas = isAdmin || canEdit('etapas')

  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [search, setSearch] = useState('')
  const [filtroAno, setFiltroAno] = useState<string>('todos')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modais de Criação / Edição
  const [openDialog, setOpenDialog] = useState(false)
  const [editingEtapa, setEditingEtapa] = useState<Etapa | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formAnoLetivo, setFormAnoLetivo] = useState<number>(new Date().getFullYear())

  // Modal de Visualização (Somente leitura)
  const [viewingEtapa, setViewingEtapa] = useState<Etapa | null>(null)
  const [openViewDialog, setOpenViewDialog] = useState(false)

  // Modal de Exclusão
  const [deletingEtapa, setDeletingEtapa] = useState<Etapa | null>(null)

  const fetchEtapas = async () => {
    try {
      setLoading(true)
      const data = await getEtapas()
      setEtapas(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar etapas',
        description: err.message || 'Falha ao buscar dados no banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEtapas()
  }, [])

  const handleOpenCreate = () => {
    setEditingEtapa(null)
    setFormNome('')
    // Default para o ano corrente se estiver entre 2020 e 2040, senão 2026
    const anoAtual = new Date().getFullYear()
    setFormAnoLetivo(anoAtual >= 2020 && anoAtual <= 2040 ? anoAtual : 2026)
    setOpenDialog(true)
  }

  const handleOpenEdit = (e: Etapa) => {
    setEditingEtapa(e)
    setFormNome(e.nome)
    setFormAnoLetivo(e.ano_letivo)
    setOpenDialog(true)
  }

  const handleOpenView = (e: Etapa) => {
    setViewingEtapa(e)
    setOpenViewDialog(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome da etapa.',
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
      if (editingEtapa) {
        await updateEtapa(editingEtapa.id, {
          nome: formNome.trim(),
          ano_letivo: formAnoLetivo,
        })
        toast({ title: 'Sucesso', description: 'Etapa atualizada com sucesso!' })
      } else {
        await createEtapa({
          nome: formNome.trim(),
          ano_letivo: formAnoLetivo,
        })
        toast({ title: 'Sucesso', description: 'Etapa cadastrada com sucesso!' })
      }
      setOpenDialog(false)
      await fetchEtapas()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar a etapa.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingEtapa) return
    try {
      setSaving(true)
      await deleteEtapa(deletingEtapa.id)
      toast({ title: 'Removido', description: 'Etapa excluída com sucesso.' })
      setDeletingEtapa(null)
      await fetchEtapas()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Não foi possível excluir a etapa.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredEtapas = useMemo(() => {
    return etapas.filter((item) => {
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
  }, [etapas, search, filtroAno])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
          <span>Cadastros de Apoio</span>
          <span>&rsaquo;</span>
          <span>Etapas</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <GraduationCap className="w-7 h-7 text-blue-600" />
          Cadastro de Etapas
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gerenciamento e manutenção das etapas educacionais e anos letivos atendidos pela rede
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Etapas Cadastradas</CardTitle>
            <CardDescription>
              Total de {etapas.length} etapa(s) cadastrada(s) na tabela de apoio
            </CardDescription>
          </div>
          {canEditEtapas && (
            <Button
              onClick={handleOpenCreate}
              className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              <Plus className="w-4 h-4" />
              Nova Etapa
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de Filtros / Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por identificador (ETA-XXXX), nome ou ano letivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="w-full sm:w-48">
              <SelectPaginado
                value={filtroAno}
                onValueChange={setFiltroAno}
                placeholder="Ano Letivo"
                triggerClassName="text-sm"
                searchPlaceholder="Buscar ano..."
                options={[
                  { value: 'todos', label: 'Todos os anos', isSpecialTop: true },
                  ...ANOS_LETIVOS.map((ano) => ({
                    value: String(ano),
                    label: `Ano ${ano}`,
                    searchText: `Ano ${ano}`,
                  })),
                ]}
              />
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
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando etapas...
            </div>
          ) : filteredEtapas.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhuma etapa encontrada.{' '}
              {search || filtroAno !== 'todos'
                ? 'Tente outro termo ou limpe os filtros.'
                : 'Clique em "Nova Etapa" para cadastrar.'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium w-32">Identificador</th>
                    <th className="py-3 px-4 font-medium">Nome da Etapa</th>
                    <th className="py-3 px-4 font-medium w-36 text-center">Ano Letivo</th>
                    <th className="py-3 px-4 font-medium text-right w-36">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEtapas.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Identificador sequencial automático ETA-XXXX */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.codigo || 'ETA-0000'}
                        </span>
                      </td>

                      {/* Nome da Etapa */}
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

                        {canEditEtapas ? (
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
                              onClick={() => setDeletingEtapa(item)}
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

      {/* DIÁLOGO: CRIAR / EDITAR ETAPA */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              {editingEtapa ? 'Editar Etapa' : 'Nova Etapa'}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para salvar a etapa educacional no cadastro de apoio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {/* Campo 1: Identificador (Automático / Informativo / Não editável) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="e-codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador (Automático)
              </Label>
              <Input
                id="e-codigo"
                value={
                  editingEtapa
                    ? editingEtapa.codigo || 'ETA-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: ETA-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400">
                Código sequencial gerado e atribuído automaticamente pelo sistema.
              </p>
            </div>

            {/* Campo 2: Nome da Etapa (Obrigatório) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="e-nome"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Nome da Etapa <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="e-nome"
                placeholder="Ex: Ensino Fundamental I (1º ao 5º ano)"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            {/* Campo 3: Ano Letivo (Combobox de 2020 a 2040) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="e-ano"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Ano Letivo <span className="text-rose-500">*</span>
              </Label>
              <SelectPaginado
                id="e-ano"
                value={String(formAnoLetivo)}
                onValueChange={(val) => setFormAnoLetivo(Number(val))}
                placeholder="Selecione o ano letivo"
                triggerClassName="text-sm"
                searchPlaceholder="Buscar ano letivo..."
                options={ANOS_LETIVOS.map((ano) => ({
                  value: String(ano),
                  label: `Ano ${ano}`,
                  searchText: `Ano ${ano}`,
                }))}
              />
              <p className="text-[11px] text-slate-400">
                Selecione o ano letivo de vigência desta etapa escolar (faixa 2020 a 2040).
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
                {editingEtapa ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: VISUALIZAR ETAPA (SOMENTE LEITURA) */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              Detalhes da Etapa
            </DialogTitle>
            <DialogDescription>
              Ficha informativa da etapa cadastrada no apoio educacional.
            </DialogDescription>
          </DialogHeader>

          {viewingEtapa && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Identificador
                </span>
                <span className="font-mono font-bold text-sm text-blue-700">
                  {viewingEtapa.codigo || 'ETA-0000'}
                </span>
              </div>

              <div className="border-b pb-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Nome da Etapa
                </span>
                <p className="text-sm font-semibold text-slate-900">{viewingEtapa.nome}</p>
              </div>

              <div className="border-b pb-3 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Ano Letivo
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Ano {viewingEtapa.ano_letivo}
                </span>
              </div>

              {viewingEtapa.created_at && (
                <div className="text-[11px] text-slate-400">
                  Cadastrado em: {new Date(viewingEtapa.created_at).toLocaleString('pt-BR')}
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

      {/* DIÁLOGO: EXCLUSÃO DE ETAPA */}
      <AlertDialog open={!!deletingEtapa} onOpenChange={(open) => !open && setDeletingEtapa(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a etapa{' '}
              <strong className="text-slate-900">"{deletingEtapa?.nome}"</strong> (Ano Letivo:{' '}
              {deletingEtapa?.ano_letivo}) da base de dados do sistema.
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
