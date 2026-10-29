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
  Users,
  Eye,
  Calendar,
  GraduationCap,
  BookOpen,
  Info,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  School,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getTurmas, createTurma, updateTurma, deleteTurma } from '@/services/turmas'
import { getEtapas, createEtapa, getAnosSeries, createAnoSerie } from '@/services/apoio'
import { getUnidadesEscolares } from '@/services/unidades-escolares'
import { Turma, Etapa, AnoSerie, UnidadeEscolar } from '@/types/gestao-escolar'
import { ANOS_LETIVOS } from './Etapas'

export default function Turmas() {
  const { isAdmin, canEdit } = useAuth()
  const canEditTurmas = isAdmin || canEdit('turmas')

  const [turmas, setTurmas] = useState<Turma[]>([])
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [anosSeries, setAnosSeries] = useState<AnoSerie[]>([])
  const [unidades, setUnidades] = useState<UnidadeEscolar[]>([])

  const [search, setSearch] = useState('')
  const [filtroAno, setFiltroAno] = useState<string>('todos')
  const [filtroUnidade, setFiltroUnidade] = useState<string>('todas')
  const [paginaAtual, setPaginaAtual] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modais de Criação / Edição de Turma
  const [openDialog, setOpenDialog] = useState(false)
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formUnidadeId, setFormUnidadeId] = useState<string>('')
  const [formAnoLetivo, setFormAnoLetivo] = useState<number>(new Date().getFullYear())
  const [formEtapaId, setFormEtapaId] = useState<string>('nenhuma')
  const [formAnoSerieId, setFormAnoSerieId] = useState<string>('nenhum')

  // Modal de Visualização (Somente leitura)
  const [viewingTurma, setViewingTurma] = useState<Turma | null>(null)
  const [openViewDialog, setOpenViewDialog] = useState(false)

  // Modal de Exclusão de Turma
  const [deletingTurma, setDeletingTurma] = useState<Turma | null>(null)

  // Modal de Ajuda e Regras
  const [openHelpDialog, setOpenHelpDialog] = useState(false)

  // Modais de Criação Rápida Inline (+Novo)
  const [openNovaEtapaModal, setOpenNovaEtapaModal] = useState(false)
  const [novaEtapaNome, setNovaEtapaNome] = useState('')
  const [salvandoNovaEtapa, setSalvandoNovaEtapa] = useState(false)

  const [openNovoAnoSerieModal, setOpenNovoAnoSerieModal] = useState(false)
  const [novoAnoSerieNome, setNovoAnoSerieNome] = useState('')
  const [salvandoNovoAnoSerie, setSalvandoNovoAnoSerie] = useState(false)

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [turmasData, etapasData, anosSeriesData, unidadesData] = await Promise.all([
        getTurmas(),
        getEtapas(),
        getAnosSeries(),
        getUnidadesEscolares(),
      ])
      setTurmas(turmasData)
      setEtapas(etapasData)
      setAnosSeries(anosSeriesData)
      setUnidades(unidadesData)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Falha ao buscar turmas no banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Opções filtradas pela dependência dinâmica: apenas compatíveis com formAnoLetivo
  const etapasDoAno = useMemo(() => {
    return etapas.filter((e) => Number(e.ano_letivo) === Number(formAnoLetivo))
  }, [etapas, formAnoLetivo])

  // Dependência dinâmica de Anos/Séries:
  // Filtro duplo obrigatório: deve pertencer ao mesmo ano letivo E à etapa selecionada.
  // Se nenhuma etapa estiver selecionada, não exibe anos/séries (ou apenas os sem etapa vinculada no ano, se aplicável).
  const anosSeriesDoAno = useMemo(() => {
    const anoNum = Number(formAnoLetivo)
    return anosSeries.filter((a) => {
      // Filtro de ano letivo
      if (Number(a.ano_letivo) !== anoNum) return false

      // Filtro de etapa:
      // Se há etapa selecionada no form, exige que o ano/série seja exatamente daquela etapa
      if (formEtapaId && formEtapaId !== 'nenhuma') {
        return a.etapa_id === formEtapaId
      }

      // Se não há etapa selecionada, só permite anos/séries sem etapa vinculada (legados)
      return !a.etapa_id
    })
  }, [anosSeries, formAnoLetivo, formEtapaId])

  // Tratar mudança no combobox Ano Letivo (regra permanente de dependência dinâmica)
  const handleAnoLetivoChange = (novoAnoStr: string) => {
    const novoAno = Number(novoAnoStr)
    setFormAnoLetivo(novoAno)

    let etapaPermanece = formEtapaId
    // Se a etapa atual não pertencer ao novo ano, limpa a seleção
    if (formEtapaId && formEtapaId !== 'nenhuma') {
      const etapaAtual = etapas.find((e) => e.id === formEtapaId)
      if (!etapaAtual || Number(etapaAtual.ano_letivo) !== novoAno) {
        setFormEtapaId('nenhuma')
        etapaPermanece = 'nenhuma'
      }
    }

    // Se o ano/série atual não pertencer ao novo ano ou à etapa restante, limpa a seleção
    if (formAnoSerieId && formAnoSerieId !== 'nenhum') {
      const anoSerieAtual = anosSeries.find((a) => a.id === formAnoSerieId)
      if (
        !anoSerieAtual ||
        Number(anoSerieAtual.ano_letivo) !== novoAno ||
        (etapaPermanece &&
          etapaPermanece !== 'nenhuma' &&
          anoSerieAtual.etapa_id !== etapaPermanece)
      ) {
        setFormAnoSerieId('nenhum')
      }
    }
  }

  // Tratar mudança na Etapa:
  // Ao trocar a etapa, limpar um Ano/Série incompatível já selecionado
  const handleEtapaChange = (novaEtapaId: string) => {
    setFormEtapaId(novaEtapaId)

    if (formAnoSerieId && formAnoSerieId !== 'nenhum') {
      const anoSerieAtual = anosSeries.find((a) => a.id === formAnoSerieId)
      if (!anoSerieAtual) {
        setFormAnoSerieId('nenhum')
      } else if (novaEtapaId === 'nenhuma') {
        // Se limpou a etapa, mas o ano/série tinha etapa vinculada, limpa
        if (anoSerieAtual.etapa_id) {
          setFormAnoSerieId('nenhum')
        }
      } else {
        // Se escolheu uma etapa específica, verifica se o ano/série pertence a ela
        if (anoSerieAtual.etapa_id !== novaEtapaId) {
          setFormAnoSerieId('nenhum')
        }
      }
    }
  }

  const handleOpenCreate = () => {
    setEditingTurma(null)
    setFormNome('')
    setFormUnidadeId('')
    const anoAtual = new Date().getFullYear()
    const anoValido = anoAtual >= 2020 && anoAtual <= 2040 ? anoAtual : 2026
    setFormAnoLetivo(anoValido)
    setFormEtapaId('nenhuma')
    setFormAnoSerieId('nenhum')
    setOpenDialog(true)
  }

  const handleOpenEdit = (t: Turma) => {
    setEditingTurma(t)
    setFormNome(t.nome)
    setFormUnidadeId(t.unidade_escolar_id || '')
    setFormAnoLetivo(t.ano_letivo)
    setFormEtapaId(t.etapa_id || 'nenhuma')
    setFormAnoSerieId(t.ano_serie_id || 'nenhum')
    setOpenDialog(true)
  }

  const handleOpenView = (t: Turma) => {
    setViewingTurma(t)
    setOpenViewDialog(true)
  }

  const handleSaveTurma = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formNome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome da turma.',
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

    if (!formUnidadeId) {
      toast({
        title: 'Atenção',
        description: 'Selecione a Unidade Escolar vinculada à turma.',
        variant: 'destructive',
      })
      return
    }

    const etapaIdFinal = formEtapaId && formEtapaId !== 'nenhuma' ? formEtapaId : null
    const anoSerieIdFinal = formAnoSerieId && formAnoSerieId !== 'nenhum' ? formAnoSerieId : null

    // Validação preventiva de vínculo no front-end
    if (etapaIdFinal) {
      const etapaSel = etapas.find((e) => e.id === etapaIdFinal)
      if (etapaSel && Number(etapaSel.ano_letivo) !== Number(formAnoLetivo)) {
        toast({
          title: 'Vínculo incompatível',
          description: `A etapa selecionada pertence ao ano letivo ${etapaSel.ano_letivo}, diferente do ano ${formAnoLetivo} da turma.`,
          variant: 'destructive',
        })
        return
      }
    }

    if (anoSerieIdFinal) {
      const anoSerieSel = anosSeries.find((a) => a.id === anoSerieIdFinal)
      if (anoSerieSel && Number(anoSerieSel.ano_letivo) !== Number(formAnoLetivo)) {
        toast({
          title: 'Vínculo incompatível',
          description: `O ano/série selecionado pertence ao ano letivo ${anoSerieSel.ano_letivo}, diferente do ano ${formAnoLetivo} da turma.`,
          variant: 'destructive',
        })
        return
      }
      if (
        anoSerieSel &&
        etapaIdFinal &&
        anoSerieSel.etapa_id &&
        anoSerieSel.etapa_id !== etapaIdFinal
      ) {
        toast({
          title: 'Vínculo incompatível',
          description: 'O ano/série selecionado pertence a uma etapa diferente da etapa da turma.',
          variant: 'destructive',
        })
        return
      }
    }

    try {
      setSaving(true)
      if (editingTurma) {
        await updateTurma(editingTurma.id, {
          nome: formNome.trim(),
          unidade_escolar_id: formUnidadeId,
          ano_letivo: formAnoLetivo,
          etapa_id: etapaIdFinal,
          ano_serie_id: anoSerieIdFinal,
        })
        toast({ title: 'Sucesso', description: 'Turma atualizada com sucesso!' })
      } else {
        await createTurma({
          nome: formNome.trim(),
          unidade_escolar_id: formUnidadeId,
          ano_letivo: formAnoLetivo,
          etapa_id: etapaIdFinal,
          ano_serie_id: anoSerieIdFinal,
        })
        toast({ title: 'Sucesso', description: 'Turma cadastrada com sucesso!' })
      }
      setOpenDialog(false)
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar a turma.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingTurma) return
    try {
      setSaving(true)
      await deleteTurma(deletingTurma.id)
      toast({ title: 'Removido', description: 'Turma excluída com sucesso.' })
      setDeletingTurma(null)
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Não foi possível excluir a turma.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Criação rápida de Etapa inline (+Novo)
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

    try {
      setSalvandoNovaEtapa(true)
      const nova = await createEtapa({
        nome: novaEtapaNome.trim(),
        ano_letivo: formAnoLetivo,
      })
      toast({
        title: 'Etapa cadastrada',
        description: `Etapa "${nova.nome}" criada com sucesso e selecionada para a turma.`,
      })
      // Atualizar lista e selecionar automaticamente
      const listaAtualizada = await getEtapas()
      setEtapas(listaAtualizada)
      setFormEtapaId(nova.id)
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

  // Criação rápida de Ano/Série inline (+Novo)
  const handleOpenNovoAnoSerieInline = () => {
    setNovoAnoSerieNome('')
    setOpenNovoAnoSerieModal(true)
  }

  const handleSaveNovoAnoSerieInline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoAnoSerieNome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome do ano/série.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSalvandoNovoAnoSerie(true)
      const etapaParaVincular = formEtapaId && formEtapaId !== 'nenhuma' ? formEtapaId : null
      const novo = await createAnoSerie({
        nome: novoAnoSerieNome.trim(),
        ano_letivo: formAnoLetivo,
        etapa_id: etapaParaVincular,
      })
      toast({
        title: 'Ano/Série cadastrado',
        description: `Ano/Série "${novo.nome}" criado com sucesso e selecionado para a turma.`,
      })
      const listaAtualizada = await getAnosSeries()
      setAnosSeries(listaAtualizada)
      setFormAnoSerieId(novo.id)
      setOpenNovoAnoSerieModal(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao criar ano/série',
        description: err.message || 'Não foi possível cadastrar o ano/série.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNovoAnoSerie(false)
    }
  }

  const filteredTurmas = useMemo(() => {
    return turmas.filter((item) => {
      if (filtroAno !== 'todos' && String(item.ano_letivo) !== filtroAno) {
        return false
      }
      if (filtroUnidade !== 'todas' && item.unidade_escolar_id !== filtroUnidade) {
        return false
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchCodigo = item.codigo?.toLowerCase().includes(q)
        const matchNome = item.nome.toLowerCase().includes(q)
        const matchUnidade = item.unidade_escolar?.nome?.toLowerCase().includes(q)
        const matchAno = String(item.ano_letivo).includes(q)
        const matchEtapa = item.etapa?.nome?.toLowerCase().includes(q)
        const matchAnoSerie = item.ano_serie?.nome?.toLowerCase().includes(q)
        return matchCodigo || matchNome || matchUnidade || matchAno || matchEtapa || matchAnoSerie
      }
      return true
    })
  }, [turmas, search, filtroAno, filtroUnidade])

  const turmasPaginadas = useMemo(() => {
    return filteredTurmas.slice(
      (paginaAtual - 1) * ITENS_POR_PAGINA_PADRAO,
      paginaAtual * ITENS_POR_PAGINA_PADRAO,
    )
  }, [filteredTurmas, paginaAtual])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
          <span>Cadastros Mestres</span>
          <span>&rsaquo;</span>
          <span>Turmas</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Users className="w-7 h-7 text-blue-600" />
          Cadastro de Turmas
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gerenciamento e organização das turmas vinculadas às etapas educacionais e anos/séries da
          rede
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Turmas Cadastradas</CardTitle>
            <CardDescription>
              Total de {turmas.length} turma(s) cadastrada(s) no sistema
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
            {canEditTurmas && (
              <Button
                onClick={handleOpenCreate}
                className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                <Plus className="w-4 h-4" />
                Nova Turma
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
                placeholder="Pesquisar por identificador (TUR-XXXX), nome, escola..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPaginaAtual(1)
                }}
                className="pl-9 text-sm"
              />
            </div>

            <div className="w-full sm:w-56">
              <Select
                value={filtroUnidade}
                onValueChange={(val) => {
                  setFiltroUnidade(val)
                  setPaginaAtual(1)
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as unidades</SelectItem>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome} ({u.codigo || 'UN'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-44">
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

            {(search || filtroAno !== 'todos' || filtroUnidade !== 'todas') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setFiltroAno('todos')
                  setFiltroUnidade('todas')
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
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando turmas...
            </div>
          ) : filteredTurmas.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhuma turma encontrada.{' '}
              {search || filtroAno !== 'todos'
                ? 'Tente outro termo ou limpe os filtros.'
                : 'Clique em "Nova Turma" para cadastrar.'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium w-32">Identificador</th>
                    <th className="py-3 px-4 font-medium">Nome da Turma</th>
                    <th className="py-3 px-4 font-medium">Unidade Escolar</th>
                    <th className="py-3 px-4 font-medium">Etapa</th>
                    <th className="py-3 px-4 font-medium">Ano/Série</th>
                    <th className="py-3 px-4 font-medium w-32 text-center">Ano Letivo</th>
                    <th className="py-3 px-4 font-medium text-right w-36">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {turmasPaginadas.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Identificador sequencial automático TUR-XXXX */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.codigo || 'TUR-0000'}
                        </span>
                      </td>

                      {/* Nome da Turma */}
                      <td className="py-3 px-4 font-medium text-slate-900">{item.nome}</td>

                      {/* Unidade Escolar Vinculada */}
                      <td className="py-3 px-4 text-slate-700">
                        {item.unidade_escolar ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 text-xs">
                              {item.unidade_escolar.nome}
                            </span>
                            <span className="font-mono text-[10px] text-blue-700">
                              {item.unidade_escolar.codigo || 'UN'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Não vinculada</span>
                        )}
                      </td>

                      {/* Etapa Vinculada */}
                      <td className="py-3 px-4 text-slate-700">
                        {item.etapa ? (
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{item.etapa.nome}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Não vinculada</span>
                        )}
                      </td>

                      {/* Ano/Série Vinculado */}
                      <td className="py-3 px-4 text-slate-700">
                        {item.ano_serie ? (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{item.ano_serie.nome}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Não vinculado</span>
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

                        {canEditTurmas ? (
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
                              onClick={() => setDeletingTurma(item)}
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
                totalRegistros={filteredTurmas.length}
                itensPorPagina={ITENS_POR_PAGINA_PADRAO}
                onMudarPagina={setPaginaAtual}
                rotuloItens="turmas"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO: CRIAR / EDITAR TURMA */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              {editingTurma ? 'Editar Turma' : 'Nova Turma'}
            </DialogTitle>
            <DialogDescription>
              Preencha os atributos abaixo para cadastrar a turma com vínculos consistentes por ano
              letivo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTurma} className="space-y-4 py-2">
            {/* Identificador no topo: Automático / Informativo / Não editável */}
            <div className="space-y-1.5">
              <Label
                htmlFor="t-codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador (Automático)
              </Label>
              <Input
                id="t-codigo"
                value={
                  editingTurma
                    ? editingTurma.codigo || 'TUR-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: TUR-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400">
                Código sequencial gerado e atribuído automaticamente pelo sistema.
              </p>
            </div>

            {/* 1) Unidade Escolar */}
            <div className="space-y-1.5 border-t pt-3">
              <Label
                htmlFor="t-unidade"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <School className="w-3.5 h-3.5 text-blue-600" />
                Unidade Escolar <span className="text-rose-500">*</span>
              </Label>
              <Select value={formUnidadeId} onValueChange={setFormUnidadeId}>
                <SelectTrigger id="t-unidade" className="text-sm">
                  <SelectValue placeholder="Selecione uma opção" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome} ({u.codigo || 'UN'}) — {u.tipo_atendimento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                A vinculação com a unidade escolar é utilizada pelo CRH e pelo CARE para o
                dimensionamento por turma.
              </p>
            </div>

            {/* 2) Ano Letivo */}
            <div className="space-y-1.5 border-t pt-3">
              <Label
                htmlFor="t-ano"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Ano Letivo <span className="text-rose-500">*</span>
              </Label>
              <Select value={String(formAnoLetivo)} onValueChange={handleAnoLetivoChange}>
                <SelectTrigger id="t-ano" className="text-sm">
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
                Apenas etapas e anos/séries deste mesmo ano letivo estarão disponíveis para seleção.
              </p>
            </div>

            {/* 3) Etapa */}
            <div className="space-y-1.5 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="t-etapa"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                  Etapa
                </Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenNovaEtapaInline}
                  className="h-7 text-xs px-2.5 gap-1.5 bg-[#0B2545] hover:bg-[#133A68] text-white font-medium"
                  title="Criar nova etapa diretamente no ano letivo atual"
                >
                  <Plus className="w-3.5 h-3.5" />+ Novo
                </Button>
              </div>

              <Select value={formEtapaId} onValueChange={handleEtapaChange}>
                <SelectTrigger id="t-etapa" className="text-sm">
                  <SelectValue placeholder="Selecione uma etapa..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma etapa vinculada</SelectItem>
                  {etapasDoAno.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({e.codigo || 'ETA'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {etapasDoAno.length === 0 ? (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  Nenhuma etapa cadastrada para o ano letivo {formAnoLetivo}. Clique em{' '}
                  <strong>+ Novo</strong> acima para cadastrar diretamente.
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Exibindo {etapasDoAno.length} etapa(s) compatível(is) com o ano letivo{' '}
                  {formAnoLetivo}.
                </p>
              )}
            </div>

            {/* 4) Série (Ano/Série) */}
            <div className="space-y-1.5 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="t-ano-serie"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Série (Ano/Série)
                </Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenNovoAnoSerieInline}
                  className="h-7 text-xs px-2.5 gap-1.5 bg-[#0B2545] hover:bg-[#133A68] text-white font-medium"
                  title="Criar novo ano/série diretamente no ano letivo atual"
                >
                  <Plus className="w-3.5 h-3.5" />+ Novo
                </Button>
              </div>

              <Select value={formAnoSerieId} onValueChange={setFormAnoSerieId}>
                <SelectTrigger id="t-ano-serie" className="text-sm">
                  <SelectValue placeholder="Selecione um ano/série..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum ano/série vinculado</SelectItem>
                  {anosSeriesDoAno.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome} ({a.codigo || 'ANO'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {anosSeriesDoAno.length === 0 ? (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  {formEtapaId && formEtapaId !== 'nenhuma'
                    ? `Nenhum ano/série cadastrado para a etapa selecionada no ano letivo ${formAnoLetivo}. Clique em "+ Novo" acima para cadastrar diretamente nesta etapa.`
                    : `Selecione primeiro uma Etapa acima para visualizar os anos/séries vinculados, ou clique em "+ Novo" para cadastrar.`}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Exibindo {anosSeriesDoAno.length} ano(s)/série(s) compatível(is) com a etapa e o
                  ano letivo {formAnoLetivo}.
                </p>
              )}
            </div>

            {/* 5) Nome da Turma */}
            <div className="space-y-1.5 border-t pt-3">
              <Label
                htmlFor="t-nome"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Nome da Turma <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="t-nome"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                required
                placeholder="Ex: 1º Ano A - Matutino"
                className="text-sm"
              />
            </div>

            <DialogFooter className="pt-3 border-t">
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
                {editingTurma ? 'Atualizar Turma' : 'Salvar Turma'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: VISUALIZAR TURMA */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Detalhes da Turma
            </DialogTitle>
            <DialogDescription>
              Ficha informativa com os dados completos da turma e vínculos associados.
            </DialogDescription>
          </DialogHeader>

          {viewingTurma && (
            <div className="space-y-4 py-2 text-xs">
              {/* Identificador no topo */}
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Identificador (Automático)
                </span>
                <span className="font-mono font-bold text-sm text-blue-700">
                  {viewingTurma.codigo || 'TUR-0000'}
                </span>
              </div>

              {/* 1) Unidade Escolar */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
                  <School className="w-3.5 h-3.5 text-blue-600" />
                  Unidade Escolar
                </span>
                {viewingTurma.unidade_escolar ? (
                  <div className="p-2.5 rounded-md border border-slate-200 bg-white">
                    <p className="font-semibold text-slate-900 text-xs">
                      {viewingTurma.unidade_escolar.nome}
                    </p>
                    <span className="font-mono text-[10px] text-blue-700 font-semibold">
                      {viewingTurma.unidade_escolar.codigo || 'UN'}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic text-xs">Não vinculada</span>
                )}
              </div>

              {/* 2) Ano Letivo */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Ano Letivo
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Ano {viewingTurma.ano_letivo}
                </span>
              </div>

              {/* 3) Etapa */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                  Etapa
                </span>
                {viewingTurma.etapa ? (
                  <div className="p-2.5 rounded-md border border-slate-200 bg-white">
                    <p className="font-medium text-slate-900 text-xs">{viewingTurma.etapa.nome}</p>
                    <span className="font-mono text-[10px] text-blue-700 font-semibold">
                      {viewingTurma.etapa.codigo || 'ETA'}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic text-xs">Não vinculada</span>
                )}
              </div>

              {/* 4) Série (Ano/Série) */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Série (Ano/Série)
                </span>
                {viewingTurma.ano_serie ? (
                  <div className="p-2.5 rounded-md border border-slate-200 bg-white">
                    <p className="font-medium text-slate-900 text-xs">
                      {viewingTurma.ano_serie.nome}
                    </p>
                    <span className="font-mono text-[10px] text-emerald-700 font-semibold">
                      {viewingTurma.ano_serie.codigo || 'ANO'}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic text-xs">Não vinculado</span>
                )}
              </div>

              {/* 5) Nome da Turma */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                  Nome da Turma
                </span>
                <p className="text-sm font-semibold text-slate-900 bg-white p-2.5 rounded-md border border-slate-200">
                  {viewingTurma.nome}
                </p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-md border text-[11px] text-slate-500">
                Data de cadastro:{' '}
                {viewingTurma.created_at
                  ? new Date(viewingTurma.created_at).toLocaleString('pt-BR')
                  : '—'}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            {viewingTurma && canEditTurmas && (
              <Button
                type="button"
                className="bg-[#0B2545] hover:bg-[#133A68] text-white text-xs gap-1.5 mr-auto"
                onClick={() => {
                  setOpenViewDialog(false)
                  handleOpenEdit(viewingTurma)
                }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar Turma
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setOpenViewDialog(false)}
              className="bg-[#0B2545] hover:bg-[#133A68] text-white text-xs"
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
              Cadastre a etapa no ano letivo <strong>{formAnoLetivo}</strong>. Ao salvar, ela será
              vinculada imediatamente à turma.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNovaEtapaInline} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Ano Letivo
              </Label>
              <Input
                value={`Ano ${formAnoLetivo}`}
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

      {/* MODAL INLINE: NOVO ANO/SÉRIE */}
      <Dialog open={openNovoAnoSerieModal} onOpenChange={setOpenNovoAnoSerieModal}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Novo Ano/Série
            </DialogTitle>
            <DialogDescription>
              Cadastre o ano/série no ano letivo <strong>{formAnoLetivo}</strong>. Ao salvar, ele
              será vinculado imediatamente à turma.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNovoAnoSerieInline} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Ano Letivo
              </Label>
              <Input
                value={`Ano ${formAnoLetivo}`}
                disabled
                className="bg-slate-100 font-mono text-xs cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="inline-anoserie-nome"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Nome do Ano/Série <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="inline-anoserie-nome"
                value={novoAnoSerieNome}
                onChange={(e) => setNovoAnoSerieNome(e.target.value)}
                autoFocus
                required
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button
                type="button"
                onClick={() => setOpenNovoAnoSerieModal(false)}
                disabled={salvandoNovoAnoSerie}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoNovoAnoSerie}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                {salvandoNovoAnoSerie && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cadastrar Ano/Série
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: EXCLUSÃO DE TURMA */}
      <AlertDialog open={!!deletingTurma} onOpenChange={(open) => !open && setDeletingTurma(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Excluir Turma?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente a turma{' '}
              <strong className="text-slate-900">"{deletingTurma?.nome}"</strong> (
              {deletingTurma?.codigo || 'TUR-0000'}, Ano {deletingTurma?.ano_letivo}). O evento será
              gravado na Auditoria.
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

      {/* DIÁLOGO: AJUDA E REGRAS DE TURMAS */}
      <Dialog open={openHelpDialog} onOpenChange={setOpenHelpDialog}>
        <DialogContent className="p-6 rounded-2xl sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2 text-[#0B2545]">
              <div className="p-2 rounded-lg bg-blue-50">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Ajuda e Regras — Cadastro de Turmas
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600">
              Orientações sobre a ordem de preenchimento, dependências dinâmicas entre os atributos
              e regras de consistência da turma.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-sm text-slate-700 leading-relaxed">
            {/* Bloco 1: Ordem obrigatória de preenchimento */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 space-y-2">
              <h4 className="font-semibold text-blue-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700" /> Ordem Correta de Preenchimento
              </h4>
              <p className="text-xs text-blue-900 font-medium">
                Para garantir a integridade das dependências dinâmicas entre cadastros, o formulário
                segue exatamente a seguinte ordem, de cima para baixo:
              </p>
              <ol className="text-xs list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
                <li>
                  <strong>Identificador (Automático):</strong> Código sequencial gerado
                  automaticamente pelo sistema (ex: <code>TUR-0001</code>), posicionado no topo e
                  não editável.
                </li>
                <li>
                  <strong>1) Unidade Escolar:</strong> Primeiro atributo de preenchimento. Seleção
                  da escola da rede municipal onde a turma está sediada (alimentada a partir do
                  Cadastro de Unidades Escolares).
                </li>
                <li>
                  <strong>2) Ano Letivo:</strong> Segundo atributo de preenchimento (2020 a 2040).
                  Determina a vigência pedagógica e serve de base para filtrar as etapas e séries
                  compatíveis.
                </li>
                <li>
                  <strong>3) Etapa:</strong> Terceiro atributo de preenchimento. Filtra
                  dinamicamente apenas as etapas cadastradas para o Ano Letivo escolhido, com botão{' '}
                  <strong>"+ Novo"</strong> para cadastro ágil inline.
                </li>
                <li>
                  <strong>4) Série (Ano/Série):</strong> Quarto atributo de preenchimento. Filtra
                  dinamicamente apenas os anos/séries vinculados à Etapa e ao Ano Letivo
                  selecionados, com botão <strong>"+ Novo"</strong> inline.
                </li>
                <li>
                  <strong>5) Nome da Turma:</strong> Quinto atributo de preenchimento. Identificação
                  da turma (ex: <em>"1º Ano A - Matutino"</em>, <em>"Pré-Escola II B"</em>).
                </li>
              </ol>
            </div>

            {/* Bloco 2: Regra de Consistência e Dependência Dinâmica */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
              <h4 className="font-semibold text-amber-950 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" /> Dependências Dinâmicas e
                Consistência
              </h4>
              <p className="text-xs text-amber-900 font-medium">
                O fluxo Unidade Escolar → Ano Letivo → Etapa → Série → Nome da Turma assegura a
                validação prévia de cada vínculo pedagógico:
              </p>
              <ul className="text-xs list-disc list-inside space-y-1 text-slate-700 pl-1">
                <li>
                  <strong>Ano Letivo filtra as Etapas:</strong> Ao trocar o ano letivo, a lista de
                  etapas exibe somente as compatíveis. Se a etapa previamente selecionada pertencer
                  a outro ano, a seleção é limpa automaticamente.
                </li>
                <li>
                  <strong>Etapa filtra os Anos/Séries:</strong> Ao selecionar ou trocar a etapa, a
                  lista de séries/anos passa a mostrar unicamente as opções daquela etapa no mesmo
                  ano letivo.
                </li>
                <li>
                  <strong>Unidade Escolar:</strong> As opções são carregadas diretamente do Cadastro
                  de Unidades Escolares e integram os cálculos de porte e dimensionamento pelo CRH e
                  CARE.
                </li>
              </ul>
            </div>

            {/* Bloco 3: Rastreabilidade e Auditoria */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-2">
              <h4 className="font-semibold text-emerald-950 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600" /> Auditoria e Rastreabilidade
              </h4>
              <p className="text-xs text-slate-700">
                Todas as inclusões, edições e exclusões de turmas são auditadas em histórico,
                registrando o usuário autenticado, valores anteriores e novos campos para total
                transparência na gestão escolar.
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
