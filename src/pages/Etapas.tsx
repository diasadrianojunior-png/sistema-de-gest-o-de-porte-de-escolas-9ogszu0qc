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
import { PaginacaoTabela, ITENS_POR_PAGINA_PADRAO } from '@/components/PaginacaoTabela'
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
  Loader2,
  Search,
  GraduationCap,
  Eye,
  Calendar,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'
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
  const [paginaAtual, setPaginaAtual] = useState<number>(1)
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

  // Modal de Ajuda e Regras
  const [openHelpDialog, setOpenHelpDialog] = useState(false)

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

  const etapasPaginadas = useMemo(() => {
    return filteredEtapas.slice(
      (paginaAtual - 1) * ITENS_POR_PAGINA_PADRAO,
      paginaAtual * ITENS_POR_PAGINA_PADRAO,
    )
  }, [filteredEtapas, paginaAtual])

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
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenHelpDialog(true)}
              className="gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Ajuda e Regras
            </Button>
            {canEditEtapas && (
              <Button
                onClick={handleOpenCreate}
                className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                <Plus className="w-4 h-4" />
                Nova Etapa
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de Filtros / Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por identificador (ETA-XXXX), nome ou ano letivo..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPaginaAtual(1)
                }}
                className="pl-9 text-sm"
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={filtroAno}
                onValueChange={(val) => {
                  setFiltroAno(val)
                  setPaginaAtual(1)
                }}
              >
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
                  setPaginaAtual(1)
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
                  {etapasPaginadas.map((item) => (
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
              <PaginacaoTabela
                paginaAtual={paginaAtual}
                totalRegistros={filteredEtapas.length}
                itensPorPagina={ITENS_POR_PAGINA_PADRAO}
                onMudarPagina={setPaginaAtual}
                rotuloItens="etapas"
              />
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
            {/* Campo 1: Identificador (Automático / Informativo / Não editável) — permanece no topo */}
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

            {/* Campo 2: Ano Letivo (Combobox de 2020 a 2040) — primeiro campo de preenchimento */}
            <div className="space-y-1.5 border-t pt-3">
              <Label
                htmlFor="e-ano"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Ano Letivo <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={String(formAnoLetivo)}
                onValueChange={(val) => setFormAnoLetivo(Number(val))}
              >
                <SelectTrigger id="e-ano" className="text-sm">
                  <SelectValue placeholder="Selecione o ano letivo" />
                </SelectTrigger>
                <SelectContent>
                  {ANOS_LETIVOS.map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>
                      Ano {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                Selecione o ano letivo de vigência desta etapa escolar (faixa 2020 a 2040).
              </p>
            </div>

            {/* Campo 3: Nome da Etapa (Obrigatório) — vem após o Ano Letivo */}
            <div className="space-y-1.5 border-t pt-3">
              <Label
                htmlFor="e-nome"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
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

            <DialogFooter className="pt-4 border-t">
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

      {/* DIÁLOGO: AJUDA E REGRAS DE ETAPAS */}
      <Dialog open={openHelpDialog} onOpenChange={setOpenHelpDialog}>
        <DialogContent className="p-6 rounded-2xl sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2 text-[#0B2545]">
              <div className="p-2 rounded-lg bg-blue-50">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Ajuda e Regras — Cadastro de Etapas
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600">
              Orientações sobre a ordem de preenchimento, dependências dinâmicas com outros
              cadastros e auditoria do sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-sm text-slate-700 leading-relaxed">
            {/* Bloco 1: Ordem obrigatória de preenchimento */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 space-y-2">
              <h4 className="font-semibold text-blue-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700" /> Ordem Correta de Preenchimento
              </h4>
              <p className="text-xs text-blue-900 font-medium">
                Para garantir a integridade do cadastro e das dependências dinâmicas no sistema, o
                formulário segue a ordem:
              </p>
              <ol className="text-xs list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
                <li>
                  <strong>Identificador (Automático):</strong> Código sequencial gerado
                  automaticamente pelo sistema (ex: <code>ETA-0001</code>), somente leitura,
                  permanecendo no topo do modal.
                </li>
                <li>
                  <strong>Ano Letivo:</strong> Primeiro campo de preenchimento. Define o exercício
                  escolar (de 2020 a 2040) ao qual a etapa educacional pertence.
                </li>
                <li>
                  <strong>Nome da Etapa:</strong> Segundo campo de preenchimento (após o Ano
                  Letivo). Denominação oficial da etapa educacional atendida pela rede (ex:{' '}
                  <em>"Ensino Fundamental I (1º ao 5º ano)"</em>, <em>"Educação Infantil"</em>).
                </li>
              </ol>
            </div>

            {/* Bloco 2: Regra de Consistência e Dependência Dinâmica */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
              <h4 className="font-semibold text-amber-950 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" /> Dependência Dinâmica entre
                Cadastros
              </h4>
              <p className="text-xs text-amber-900 font-medium">
                A etapa pertence estritamente a um ano letivo específico e serve de base dinâmica
                para outros módulos:
              </p>
              <ul className="text-xs list-disc list-inside space-y-1 text-slate-700 pl-1">
                <li>
                  Cadastros dependentes, como o <strong>Ano/Série</strong> e as{' '}
                  <strong>Turmas</strong>, filtram dinamicamente as etapas disponíveis com base no
                  ano letivo selecionado no formulário.
                </li>
                <li>
                  Cada etapa cadastrada só fica disponível para seleção em turmas e anos/séries que
                  pertençam exatamente ao mesmo ano de vigência.
                </li>
                <li>
                  Ao alterar ou excluir uma etapa, os vínculos dependentes são validados para evitar
                  dados órfãos ou inconsistências na rede municipal.
                </li>
              </ul>
            </div>

            {/* Bloco 3: Rastreabilidade e Auditoria */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-2">
              <h4 className="font-semibold text-emerald-950 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600" /> Auditoria e Rastreabilidade
              </h4>
              <p className="text-xs text-slate-700">
                Todas as operações de criação, atualização e exclusão de etapas são registradas de
                forma permanente na <strong>Auditoria</strong> do sistema, contendo o usuário
                responsável, data, hora, código identificador, valores antigos e novos dados
                gravados.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 mt-2">
            <Button
              type="button"
              onClick={() => setOpenHelpDialog(false)}
              className="bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
