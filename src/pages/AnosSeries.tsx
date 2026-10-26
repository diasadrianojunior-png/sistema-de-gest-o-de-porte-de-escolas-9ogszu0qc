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
  BookOpen,
  Eye,
  Calendar,
  GraduationCap,
  Info,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  getAnosSeries,
  createAnoSerie,
  updateAnoSerie,
  deleteAnoSerie,
  getEtapas,
  createEtapa,
} from '@/services/apoio'
import { AnoSerie, Etapa } from '@/types/gestao-escolar'
import { ANOS_LETIVOS } from './Etapas'

export { ANOS_LETIVOS }

export default function AnosSeries() {
  const { isAdmin, canEdit } = useAuth()
  const canEditAnosSeries = isAdmin || canEdit('anos_series')

  const [anosSeries, setAnosSeries] = useState<AnoSerie[]>([])
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [search, setSearch] = useState('')
  const [filtroAno, setFiltroAno] = useState<string>('todos')
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todas')
  const [paginaAtual, setPaginaAtual] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modais de Criação / Edição
  const [openDialog, setOpenDialog] = useState(false)
  const [editingAnoSerie, setEditingAnoSerie] = useState<AnoSerie | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formEtapaId, setFormEtapaId] = useState<string>('')
  const [formAnoLetivo, setFormAnoLetivo] = useState<string>('')

  // Modal inline de Criação Rápida de Etapa (+ Novo)
  const [openNovaEtapaModal, setOpenNovaEtapaModal] = useState(false)
  const [novaEtapaNome, setNovaEtapaNome] = useState('')
  const [salvandoNovaEtapa, setSalvandoNovaEtapa] = useState(false)

  // Modal de Visualização (Somente leitura)
  const [viewingAnoSerie, setViewingAnoSerie] = useState<AnoSerie | null>(null)
  const [openViewDialog, setOpenViewDialog] = useState(false)

  // Modal de Exclusão
  const [deletingAnoSerie, setDeletingAnoSerie] = useState<AnoSerie | null>(null)

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [dataAnosSeries, dataEtapas] = await Promise.all([getAnosSeries(), getEtapas()])
      setAnosSeries(dataAnosSeries)
      setEtapas(dataEtapas)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Falha ao buscar dados no banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Dependência dinâmica de etapas no formulário:
  // Se o ano letivo estiver selecionado, filtra apenas etapas compatíveis com aquele ano.
  // Se ainda não selecionou ano letivo, exibe todas as etapas cadastradas.
  const etapasDoAnoForm = useMemo(() => {
    if (!formAnoLetivo) return etapas
    const anoNum = Number(formAnoLetivo)
    return etapas.filter((e) => Number(e.ano_letivo) === anoNum)
  }, [etapas, formAnoLetivo])

  // Lista de etapas disponíveis para o filtro da listagem
  const etapasFiltroListagem = useMemo(() => {
    if (filtroAno === 'todos') return etapas
    const anoNum = Number(filtroAno)
    return etapas.filter((e) => Number(e.ano_letivo) === anoNum)
  }, [etapas, filtroAno])

  // Tratar mudança no combobox Ano Letivo (regra permanente de dependência dinâmica)
  const handleAnoLetivoChange = (novoAnoStr: string) => {
    setFormAnoLetivo(novoAnoStr)
    const novoAno = Number(novoAnoStr)

    // Se já houver etapa selecionada e ela não for do novo ano, limpa a etapa
    if (formEtapaId) {
      const etapaAtual = etapas.find((e) => e.id === formEtapaId)
      if (!etapaAtual || Number(etapaAtual.ano_letivo) !== novoAno) {
        setFormEtapaId('')
      }
    }
  }

  // Tratar mudança no combobox Etapa:
  // Se o Ano Letivo ainda não foi escolhido, preenche automaticamente a partir da Etapa
  const handleEtapaChange = (etapaId: string) => {
    setFormEtapaId(etapaId)
    const etapaSel = etapas.find((e) => e.id === etapaId)
    if (etapaSel) {
      setFormAnoLetivo(String(etapaSel.ano_letivo))
    }
  }

  const handleOpenCreate = () => {
    setEditingAnoSerie(null)
    setFormNome('')
    // Inicia sem pré-seleção ("Selecione uma opção") conforme regra do sistema
    setFormEtapaId('')
    setFormAnoLetivo('')
    setOpenDialog(true)
  }

  const handleOpenEdit = (item: AnoSerie) => {
    setEditingAnoSerie(item)
    setFormNome(item.nome)
    setFormEtapaId(item.etapa_id || '')
    setFormAnoLetivo(String(item.ano_letivo))
    setOpenDialog(true)
  }

  const handleOpenView = (item: AnoSerie) => {
    setViewingAnoSerie(item)
    setOpenViewDialog(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formEtapaId) {
      toast({
        title: 'Atenção',
        description: 'Selecione a Etapa vinculada ao Ano/Série.',
        variant: 'destructive',
      })
      return
    }

    if (!formNome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome do Ano/Série.',
        variant: 'destructive',
      })
      return
    }

    const anoNum = Number(formAnoLetivo)
    if (!anoNum || anoNum < 2020 || anoNum > 2040) {
      toast({
        title: 'Atenção',
        description: 'Selecione um ano letivo válido entre 2020 e 2040.',
        variant: 'destructive',
      })
      return
    }

    // Validação de consistência dinâmica: a etapa deve pertencer ao mesmo ano letivo
    const etapaSel = etapas.find((et) => et.id === formEtapaId)
    if (!etapaSel) {
      toast({
        title: 'Atenção',
        description: 'A etapa selecionada não foi encontrada no cadastro.',
        variant: 'destructive',
      })
      return
    }

    if (Number(etapaSel.ano_letivo) !== anoNum) {
      toast({
        title: 'Vínculo incompatível',
        description: `A etapa selecionada pertence ao ano letivo ${etapaSel.ano_letivo}, que difere do ano letivo ${anoNum} selecionado.`,
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      if (editingAnoSerie) {
        await updateAnoSerie(editingAnoSerie.id, {
          nome: formNome.trim(),
          ano_letivo: anoNum,
          etapa_id: formEtapaId,
        })
        toast({ title: 'Sucesso', description: 'Ano/Série atualizado com sucesso!' })
      } else {
        await createAnoSerie({
          nome: formNome.trim(),
          ano_letivo: anoNum,
          etapa_id: formEtapaId,
        })
        toast({ title: 'Sucesso', description: 'Ano/Série cadastrado com sucesso!' })
      }
      setOpenDialog(false)
      await carregarDados()
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
      await carregarDados()
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

  // Criação rápida de Etapa inline (+ Novo)
  const handleOpenNovaEtapaInline = () => {
    setNovaEtapaNome('')
    setOpenNovaEtapaModal(true)
  }

  const handleSaveNovaEtapaInline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaEtapaNome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome da etapa.',
        variant: 'destructive',
      })
      return
    }

    const anoEtapa = formAnoLetivo
      ? Number(formAnoLetivo)
      : new Date().getFullYear() >= 2020 && new Date().getFullYear() <= 2040
        ? new Date().getFullYear()
        : 2026

    try {
      setSalvandoNovaEtapa(true)
      const nova = await createEtapa({
        nome: novaEtapaNome.trim(),
        ano_letivo: anoEtapa,
      })
      toast({
        title: 'Etapa cadastrada',
        description: `Etapa "${nova.nome}" criada com sucesso e selecionada para o Ano/Série.`,
      })
      // Atualizar lista de etapas e selecionar automaticamente no form
      const listaAtualizada = await getEtapas()
      setEtapas(listaAtualizada)
      setFormEtapaId(nova.id)
      setFormAnoLetivo(String(nova.ano_letivo))
      setOpenNovaEtapaModal(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao criar etapa',
        description: err.message || 'Não foi possível cadastrar a etapa.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNovaEtapa(false)
    }
  }

  const filteredAnosSeries = useMemo(() => {
    return anosSeries.filter((item) => {
      // Filtro de ano letivo
      if (filtroAno !== 'todos' && String(item.ano_letivo) !== filtroAno) {
        return false
      }
      // Filtro de etapa
      if (filtroEtapa !== 'todas') {
        if (filtroEtapa === 'sem_etapa') {
          if (item.etapa_id) return false
        } else if (item.etapa_id !== filtroEtapa) {
          return false
        }
      }
      // Busca por texto (código, nome, etapa ou ano)
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchCodigo = item.codigo?.toLowerCase().includes(q)
        const matchNome = item.nome.toLowerCase().includes(q)
        const matchAno = String(item.ano_letivo).includes(q)
        const matchEtapaNome = item.etapa?.nome?.toLowerCase().includes(q)
        const matchEtapaCodigo = item.etapa?.codigo?.toLowerCase().includes(q)
        return matchCodigo || matchNome || matchAno || matchEtapaNome || matchEtapaCodigo
      }
      return true
    })
  }, [anosSeries, search, filtroAno, filtroEtapa])

  const anosSeriesPaginados = useMemo(() => {
    return filteredAnosSeries.slice(
      (paginaAtual - 1) * ITENS_POR_PAGINA_PADRAO,
      paginaAtual * ITENS_POR_PAGINA_PADRAO,
    )
  }, [filteredAnosSeries, paginaAtual])

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
          Gerenciamento e manutenção dos anos e séries escolares por etapa educacional e ano letivo
          atendidos pela rede
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
                placeholder="Pesquisar por identificador (ANO-XXXX), nome, etapa..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPaginaAtual(1)
                }}
                className="pl-9 text-sm"
              />
            </div>

            {/* Filtro por Ano Letivo */}
            <div className="w-full sm:w-44">
              <Select
                value={filtroAno}
                onValueChange={(val) => {
                  setFiltroAno(val)
                  setPaginaAtual(1)
                  // Se mudar ano e a etapa filtrada não pertencer ao novo ano, reseta etapa para todas
                  if (val !== 'todos' && filtroEtapa !== 'todas' && filtroEtapa !== 'sem_etapa') {
                    const etapaObj = etapas.find((e) => e.id === filtroEtapa)
                    if (etapaObj && String(etapaObj.ano_letivo) !== val) {
                      setFiltroEtapa('todas')
                    }
                  }
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

            {/* Filtro por Etapa */}
            <div className="w-full sm:w-56">
              <Select
                value={filtroEtapa}
                onValueChange={(val) => {
                  setFiltroEtapa(val)
                  setPaginaAtual(1)
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Todas as etapas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as etapas</SelectItem>
                  <SelectItem value="sem_etapa">Não vinculadas a etapa</SelectItem>
                  {etapasFiltroListagem.map((et) => (
                    <SelectItem key={et.id} value={et.id}>
                      {et.nome} ({et.codigo || 'ETA'}) — {et.ano_letivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(search || filtroAno !== 'todos' || filtroEtapa !== 'todas') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setFiltroAno('todos')
                  setFiltroEtapa('todas')
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
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando anos/séries...
            </div>
          ) : filteredAnosSeries.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhum ano/série encontrado.{' '}
              {search || filtroAno !== 'todos' || filtroEtapa !== 'todas'
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
                    <th className="py-3 px-4 font-medium">Etapa Vinculada</th>
                    <th className="py-3 px-4 font-medium w-36 text-center">Ano Letivo</th>
                    <th className="py-3 px-4 font-medium text-right w-36">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {anosSeriesPaginados.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Identificador sequencial automático ANO-XXXX */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.codigo || 'ANO-0000'}
                        </span>
                      </td>

                      {/* Nome do Ano/Série */}
                      <td className="py-3 px-4 font-medium text-slate-900">{item.nome}</td>

                      {/* Etapa Vinculada com nome e código */}
                      <td className="py-3 px-4 text-slate-700">
                        {item.etapa ? (
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-medium text-slate-900">{item.etapa.nome}</span>
                            <span className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {item.etapa.codigo || 'ETA'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                            Não vinculada
                          </span>
                        )}
                      </td>

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
              <PaginacaoTabela
                paginaAtual={paginaAtual}
                totalRegistros={filteredAnosSeries.length}
                itensPorPagina={ITENS_POR_PAGINA_PADRAO}
                onMudarPagina={setPaginaAtual}
                rotuloItens="anos/séries"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO: CRIAR / EDITAR ANO/SÉRIE */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              {editingAnoSerie ? 'Editar Ano/Série' : 'Novo Ano/Série'}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo vinculando a Etapa e o Ano Letivo compatíveis.
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

            {/* Campo 2: Etapa (Obrigatório) com botão "+ Novo" inline acima do campo */}
            <div className="space-y-1.5 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="ano-etapa"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                  Etapa <span className="text-rose-500">*</span>
                </Label>
                {canEditAnosSeries && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenNovaEtapaInline}
                    className="h-7 text-xs px-2.5 gap-1.5 bg-[#0B2545] hover:bg-[#133A68] text-white font-medium"
                    title="Criar nova etapa diretamente e vincular ao formulário"
                  >
                    <Plus className="w-3.5 h-3.5" />+ Novo
                  </Button>
                )}
              </div>

              <Select value={formEtapaId} onValueChange={handleEtapaChange}>
                <SelectTrigger id="ano-etapa" className="text-sm">
                  <SelectValue placeholder="Selecione uma opção" />
                </SelectTrigger>
                <SelectContent>
                  {etapasDoAnoForm.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({e.codigo || 'ETA'}) — Ano {e.ano_letivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {etapasDoAnoForm.length === 0 ? (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  {formAnoLetivo
                    ? `Nenhuma etapa cadastrada para o ano letivo ${formAnoLetivo}. Clique em "+ Novo" acima para cadastrar.`
                    : 'Nenhuma etapa encontrada. Clique em "+ Novo" acima para cadastrar.'}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">
                  {formAnoLetivo
                    ? `Exibindo ${etapasDoAnoForm.length} etapa(s) compatível(is) com o ano letivo ${formAnoLetivo}.`
                    : 'A lista de etapas filtra automaticamente ao selecionar o ano letivo.'}
                </p>
              )}
            </div>

            {/* Campo 3: Nome do Ano/Série (Obrigatório) */}
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

            {/* Campo 4: Ano Letivo (Combobox de 2020 a 2040) */}
            <div className="space-y-1.5 border-t pt-3">
              <Label
                htmlFor="ano-letivo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Ano Letivo <span className="text-rose-500">*</span>
              </Label>
              <Select value={formAnoLetivo} onValueChange={handleAnoLetivoChange}>
                <SelectTrigger id="ano-letivo" className="text-sm">
                  <SelectValue placeholder="Selecione uma opção" />
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
                O Ano/Série e a Etapa vinculada devem pertencer estritamente ao mesmo ano letivo.
              </p>
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
                  Etapa Vinculada
                </span>
                {viewingAnoSerie.etapa ? (
                  <div className="flex items-center gap-2 mt-1">
                    <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-sm font-semibold text-slate-900">
                      {viewingAnoSerie.etapa.nome}
                    </span>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {viewingAnoSerie.etapa.codigo || 'ETA'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-amber-700 italic">Não vinculada</span>
                )}
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

      {/* MODAL INLINE: NOVA ETAPA */}
      <Dialog open={openNovaEtapaModal} onOpenChange={setOpenNovaEtapaModal}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              Nova Etapa
            </DialogTitle>
            <DialogDescription>
              Cadastre a etapa no ano letivo{' '}
              <strong>{formAnoLetivo || new Date().getFullYear()}</strong>. Ao salvar, ela será
              selecionada no combobox de Etapa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNovaEtapaInline} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Ano Letivo
              </Label>
              <Input
                value={`Ano ${formAnoLetivo || new Date().getFullYear()}`}
                disabled
                className="bg-slate-100 font-mono text-xs cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="inline-etapa-nome"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Nome da Etapa <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="inline-etapa-nome"
                placeholder="Ex: Ensino Fundamental - Anos Iniciais"
                value={novaEtapaNome}
                onChange={(e) => setNovaEtapaNome(e.target.value)}
                autoFocus
                required
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button
                type="button"
                onClick={() => setOpenNovaEtapaModal(false)}
                disabled={salvandoNovaEtapa}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoNovaEtapa}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                {salvandoNovaEtapa && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cadastrar Etapa
              </Button>
            </DialogFooter>
          </form>
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
