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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Search,
  Eye,
  Sliders,
  Briefcase,
  Layers,
  Building,
  Info,
  Calendar,
  Settings,
  Scale,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { CrhConfiguracao, NivelPorte, UnidadeEscolar, Cargo, Funcao } from '@/types/gestao-escolar'
import { ANOS_LETIVOS } from './Etapas'
import {
  getCrhConfiguracoes,
  createCrhConfiguracao,
  updateCrhConfiguracao,
  deleteCrhConfiguracao,
  getNiveisPorte,
  createNivelPorte,
  updateNivelPorte,
  deleteNivelPorte,
  calcularNivelUnidade,
} from '@/services/crh'
import { getUnidadesEscolares } from '@/services/unidades-escolares'
import { getCargos, createCargo, getFuncoes, createFuncao } from '@/services/apoio'

export default function Crh() {
  const { isAdmin, canEdit } = useAuth()
  const canEditCrh = isAdmin || canEdit('crh')

  // Dados principais
  const [crhList, setCrhList] = useState<CrhConfiguracao[]>([])
  const [unidades, setUnidades] = useState<UnidadeEscolar[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [funcoes, setFuncoes] = useState<Funcao[]>([])
  const [niveisPorte, setNiveisPorte] = useState<NivelPorte[]>([])

  // Estados de controle da listagem
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filtroAno, setFiltroAno] = useState<string>('todos')
  const [filtroUnidade, setFiltroUnidade] = useState<string>('todas')

  // Modais de CRH (Criação, Edição, Visualização e Exclusão)
  const [openCrhDialog, setOpenCrhDialog] = useState(false)
  const [editingCrh, setEditingCrh] = useState<CrhConfiguracao | null>(null)
  const [viewingCrh, setViewingCrh] = useState<CrhConfiguracao | null>(null)
  const [openViewDialog, setOpenViewDialog] = useState(false)
  const [deletingCrh, setDeletingCrh] = useState<CrhConfiguracao | null>(null)

  // 11 Campos do Formulário CRH
  const [formAnoLetivo, setFormAnoLetivo] = useState<number>(new Date().getFullYear())
  const [formUnidadeId, setFormUnidadeId] = useState<string>('')
  const [formTipoAtendimento, setFormTipoAtendimento] = useState<string>('')
  const [formNivelUnidade, setFormNivelUnidade] = useState<string>('')
  const [formCargoId, setFormCargoId] = useState<string>('')
  const [formQtdProfissionais, setFormQtdProfissionais] = useState<number>(1)
  const [formPorTurma, setFormPorTurma] = useState<'Sim' | 'Não'>('Não')
  const [formPorPeriodo, setFormPorPeriodo] = useState<'Sim' | 'Não'>('Não')
  const [formNaturezaCargo, setFormNaturezaCargo] = useState<'Fixo' | 'Itinerante'>('Fixo')
  const [formFuncaoId, setFormFuncaoId] = useState<string>('')
  const [formQtdPorFuncao, setFormQtdPorFuncao] = useState<number>(1)

  // Aviso informativo de nível (quando indeterminado)
  const [avisoNivel, setAvisoNivel] = useState<string | null>(null)

  // Modal de Criação Rápida Inline: Novo Cargo
  const [openNovoCargoModal, setOpenNovoCargoModal] = useState(false)
  const [novoCargoNome, setNovoCargoNome] = useState('')
  const [salvandoNovoCargo, setSalvandoNovoCargo] = useState(false)

  // Modal de Criação Rápida Inline: Nova Função (vinculada ao cargo selecionado)
  const [openNovaFuncaoModal, setOpenNovaFuncaoModal] = useState(false)
  const [novaFuncaoNome, setNovaFuncaoNome] = useState('')
  const [salvandoNovaFuncao, setSalvandoNovaFuncao] = useState(false)

  // Modais de Tabela de Referência de Níveis de Porte
  const [openNivelModal, setOpenNivelModal] = useState(false)
  const [editingNivel, setEditingNivel] = useState<NivelPorte | null>(null)
  const [deletingNivel, setDeletingNivel] = useState<NivelPorte | null>(null)
  const [formNivelTipo, setFormNivelTipo] = useState<string>(
    'Ensino Fundamental e Educação Infantil (20h)',
  )
  const [formNivelNome, setFormNivelNome] = useState<string>('')
  const [formNivelMin, setFormNivelMin] = useState<number>(0)
  const [formNivelMax, setFormNivelMax] = useState<string>('')
  const [formNivelOrdem, setFormNivelOrdem] = useState<number>(1)
  const [formNivelDesc, setFormNivelDesc] = useState<string>('')

  // Carregar todos os dados
  const carregarDados = async () => {
    try {
      setLoading(true)
      const [crhData, unidadesData, cargosData, funcoesData, niveisData] = await Promise.all([
        getCrhConfiguracoes(),
        getUnidadesEscolares(),
        getCargos(),
        getFuncoes(),
        getNiveisPorte(),
      ])
      setCrhList(crhData)
      setUnidades(unidadesData)
      setCargos(cargosData)
      setFuncoes(funcoesData)
      setNiveisPorte(niveisData)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Falha ao sincronizar dados do cadastro CRH.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Dependência dinâmica: Funções compatíveis com o Cargo selecionado
  const funcoesDoCargo = useMemo(() => {
    if (!formCargoId) return []
    return funcoes.filter((f) => {
      if (!f.cargos_vinculados || f.cargos_vinculados.length === 0) return false
      return f.cargos_vinculados.some((c) => c.id === formCargoId)
    })
  }, [funcoes, formCargoId])

  // Tratar seleção da Unidade Escolar (preenche automaticamente Tipo de Atendimento e Nível)
  const handleUnidadeChange = (unidadeId: string) => {
    setFormUnidadeId(unidadeId)
    const unidadeSel = unidades.find((u) => u.id === unidadeId)
    if (unidadeSel) {
      const tipo = unidadeSel.tipo_atendimento
      setFormTipoAtendimento(tipo)

      // Determinar o nível de dimensionamento conforme a tabela de referência
      const resultado = calcularNivelUnidade(
        tipo,
        (unidadeSel as any).numero_alunos,
        niveisPorte,
        unidadeSel.nivel_porte,
      )
      setFormNivelUnidade(resultado.nivel)
      setAvisoNivel(resultado.aviso || null)
    } else {
      setFormTipoAtendimento('')
      setFormNivelUnidade('')
      setAvisoNivel(null)
    }
  }

  // Tratar seleção de Cargo (reseta ou valida função selecionada)
  const handleCargoChange = (novoCargoId: string) => {
    setFormCargoId(novoCargoId)
    // Se a função selecionada não for compatível com o novo cargo, limpa a seleção
    if (formFuncaoId) {
      const funcaoAtual = funcoes.find((f) => f.id === formFuncaoId)
      const ehCompativel = funcaoAtual?.cargos_vinculados?.some((c) => c.id === novoCargoId)
      if (!ehCompativel) {
        setFormFuncaoId('')
      }
    }
  }

  // Tratar alternância do campo "Por Turma?": se marcar "Sim", "Por Período?" DEVE ir para "Não"
  const handlePorTurmaChange = (val: 'Sim' | 'Não') => {
    setFormPorTurma(val)
    if (val === 'Sim') {
      setFormPorPeriodo('Não')
    }
  }

  // Tratar alternância do campo "Por Período?": se marcar "Sim", "Por Turma?" DEVE ir para "Não"
  const handlePorPeriodoChange = (val: 'Sim' | 'Não') => {
    setFormPorPeriodo(val)
    if (val === 'Sim') {
      setFormPorTurma('Não')
    }
  }

  // Abrir modal de criação
  const handleOpenCreate = () => {
    setEditingCrh(null)
    const anoAtual = new Date().getFullYear()
    const anoValido = anoAtual >= 2020 && anoAtual <= 2040 ? anoAtual : 2026
    setFormAnoLetivo(anoValido)
    setFormUnidadeId('')
    setFormTipoAtendimento('')
    setFormNivelUnidade('')
    setFormCargoId('')
    setFormQtdProfissionais(1)
    setFormPorTurma('Não')
    setFormPorPeriodo('Não')
    setFormNaturezaCargo('Fixo')
    setFormFuncaoId('')
    setFormQtdPorFuncao(1)
    setAvisoNivel(null)
    setOpenCrhDialog(true)
  }

  // Abrir modal de edição
  const handleOpenEdit = (c: CrhConfiguracao) => {
    setEditingCrh(c)
    setFormAnoLetivo(c.ano_letivo)
    setFormUnidadeId(c.unidade_escolar_id)
    setFormTipoAtendimento(c.tipo_atendimento)
    setFormNivelUnidade(c.nivel_unidade)
    setFormCargoId(c.cargo_id)
    setFormQtdProfissionais(c.quantidade_profissionais)
    setFormPorTurma(c.por_turma)
    setFormPorPeriodo(c.por_periodo)
    setFormNaturezaCargo(c.natureza_cargo)
    setFormFuncaoId(c.funcao_id)
    setFormQtdPorFuncao(c.quantidade_por_funcao)
    setAvisoNivel(null)
    setOpenCrhDialog(true)
  }

  // Abrir modal de visualização detalhada
  const handleOpenView = (c: CrhConfiguracao) => {
    setViewingCrh(c)
    setOpenViewDialog(true)
  }

  // Salvar registro de CRH
  const handleSaveCrh = async (e: React.FormEvent) => {
    e.preventDefault()

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
        description: 'Selecione a Unidade Escolar.',
        variant: 'destructive',
      })
      return
    }

    if (!formCargoId) {
      toast({
        title: 'Atenção',
        description: 'Selecione o Cargo.',
        variant: 'destructive',
      })
      return
    }

    if (!formFuncaoId) {
      toast({
        title: 'Atenção',
        description: 'Selecione uma Função compatível com o cargo.',
        variant: 'destructive',
      })
      return
    }

    if (formQtdProfissionais < 0 || isNaN(formQtdProfissionais)) {
      toast({
        title: 'Atenção',
        description: 'A quantidade de profissionais deve ser um número maior ou igual a zero.',
        variant: 'destructive',
      })
      return
    }

    if (formQtdPorFuncao < 0 || isNaN(formQtdPorFuncao)) {
      toast({
        title: 'Atenção',
        description: 'A quantidade por função deve ser um número maior ou igual a zero.',
        variant: 'destructive',
      })
      return
    }

    if (formPorTurma === 'Sim' && formPorPeriodo === 'Sim') {
      toast({
        title: 'Critérios incompatíveis',
        description:
          'Não é permitido marcar "Por Turma?" e "Por Período?" simultaneamente como "Sim".',
        variant: 'destructive',
      })
      return
    }

    // Validação de vínculo função <-> cargo
    const funcaoSel = funcoes.find((f) => f.id === formFuncaoId)
    const ehCompativel = funcaoSel?.cargos_vinculados?.some((c) => c.id === formCargoId)
    if (!ehCompativel) {
      toast({
        title: 'Vínculo incompatível',
        description: 'A função selecionada não é compatível com o cargo escolhido.',
        variant: 'destructive',
      })
      return
    }

    const payload = {
      ano_letivo: formAnoLetivo,
      unidade_escolar_id: formUnidadeId,
      tipo_atendimento: formTipoAtendimento,
      nivel_unidade: formNivelUnidade || 'Nível I',
      cargo_id: formCargoId,
      quantidade_profissionais: Number(formQtdProfissionais),
      por_turma: formPorTurma,
      por_periodo: formPorPeriodo,
      natureza_cargo: formNaturezaCargo,
      funcao_id: formFuncaoId,
      quantidade_por_funcao: Number(formQtdPorFuncao),
    }

    try {
      setSaving(true)
      if (editingCrh) {
        await updateCrhConfiguracao(editingCrh.id, payload)
        toast({
          title: 'Configuração atualizada',
          description: 'A regra de dimensionamento CRH foi atualizada com sucesso.',
        })
      } else {
        await createCrhConfiguracao(payload)
        toast({
          title: 'Configuração cadastrada',
          description: 'Nova regra de dimensionamento CRH gerada com código automático.',
        })
      }
      setOpenCrhDialog(false)
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar CRH',
        description: err.message || 'Falha ao salvar configuração.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Excluir registro de CRH
  const handleDeleteConfirm = async () => {
    if (!deletingCrh) return
    try {
      setSaving(true)
      await deleteCrhConfiguracao(deletingCrh.id)
      toast({
        title: 'Configuração excluída',
        description: 'Regra CRH removida com sucesso.',
      })
      setDeletingCrh(null)
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir CRH',
        description: err.message || 'Falha ao remover configuração.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Ação Inline: Novo Cargo
  const handleSaveNovoCargoInline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCargoNome.trim()) {
      toast({ title: 'Atenção', description: 'Informe o nome do cargo.', variant: 'destructive' })
      return
    }
    try {
      setSalvandoNovoCargo(true)
      const novo = await createCargo({ nome: novoCargoNome.trim() })
      toast({
        title: 'Cargo criado com sucesso',
        description: `Cargo "${novo.nome}" cadastrado e selecionado.`,
      })
      const cargosAtualizados = await getCargos()
      setCargos(cargosAtualizados)
      setFormCargoId(novo.id)
      setOpenNovoCargoModal(false)
      setNovoCargoNome('')
    } catch (err: any) {
      toast({
        title: 'Erro ao criar cargo',
        description: err.message || 'Não foi possível cadastrar o cargo.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNovoCargo(false)
    }
  }

  // Ação Inline: Nova Função compatível com o cargo selecionado
  const handleSaveNovaFuncaoInline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaFuncaoNome.trim()) {
      toast({ title: 'Atenção', description: 'Informe o nome da função.', variant: 'destructive' })
      return
    }
    if (!formCargoId) {
      toast({
        title: 'Atenção',
        description: 'Selecione primeiro o Cargo antes de criar uma Função compatível.',
        variant: 'destructive',
      })
      return
    }
    try {
      setSalvandoNovaFuncao(true)
      const nova = await createFuncao({
        nome: novaFuncaoNome.trim(),
        cargo_ids: [formCargoId],
      })
      toast({
        title: 'Função criada com sucesso',
        description: `Função "${nova.nome}" cadastrada e vinculada ao cargo selecionado.`,
      })
      const funcoesAtualizadas = await getFuncoes()
      setFuncoes(funcoesAtualizadas)
      setFormFuncaoId(nova.id)
      setOpenNovaFuncaoModal(false)
      setNovaFuncaoNome('')
    } catch (err: any) {
      toast({
        title: 'Erro ao criar função',
        description: err.message || 'Não foi possível cadastrar a função.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNovaFuncao(false)
    }
  }

  // Ações de Níveis de Porte (Tabela de Referência Editável)
  const handleOpenCreateNivel = () => {
    setEditingNivel(null)
    setFormNivelTipo('Ensino Fundamental e Educação Infantil (20h)')
    setFormNivelNome('')
    setFormNivelMin(0)
    setFormNivelMax('')
    setFormNivelOrdem(niveisPorte.length + 1)
    setFormNivelDesc('')
    setOpenNivelModal(true)
  }

  const handleOpenEditNivel = (n: NivelPorte) => {
    setEditingNivel(n)
    setFormNivelTipo(n.tipo_atendimento)
    setFormNivelNome(n.nivel)
    setFormNivelMin(n.alunos_min)
    setFormNivelMax(n.alunos_max !== null && n.alunos_max !== undefined ? String(n.alunos_max) : '')
    setFormNivelOrdem(n.ordem)
    setFormNivelDesc(n.descricao || '')
    setOpenNivelModal(true)
  }

  const handleSaveNivel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNivelNome.trim()) {
      toast({ title: 'Atenção', description: 'Informe o nome do nível.', variant: 'destructive' })
      return
    }
    const maxVal = formNivelMax.trim() === '' ? null : Number(formNivelMax)
    if (maxVal !== null && maxVal < formNivelMin) {
      toast({
        title: 'Faixa inválida',
        description: 'O número máximo de alunos deve ser maior ou igual ao mínimo.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      const input = {
        tipo_atendimento: formNivelTipo,
        nivel: formNivelNome.trim(),
        alunos_min: Number(formNivelMin),
        alunos_max: maxVal,
        ordem: Number(formNivelOrdem),
        descricao: formNivelDesc.trim() || null,
      }

      if (editingNivel) {
        await updateNivelPorte(editingNivel.id, input)
        toast({ title: 'Nível atualizado', description: 'Tabela de referência atualizada.' })
      } else {
        await createNivelPorte(input)
        toast({
          title: 'Nível cadastrado',
          description: 'Novo nível de porte adicionado à referência.',
        })
      }
      setOpenNivelModal(false)
      const niveisAtualizados = await getNiveisPorte()
      setNiveisPorte(niveisAtualizados)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar nível',
        description: err.message || 'Não foi possível salvar o nível.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNivelConfirm = async () => {
    if (!deletingNivel) return
    try {
      setSaving(true)
      await deleteNivelPorte(deletingNivel.id)
      toast({ title: 'Nível excluído', description: 'Faixa de referência removida.' })
      setDeletingNivel(null)
      const niveisAtualizados = await getNiveisPorte()
      setNiveisPorte(niveisAtualizados)
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir nível',
        description: err.message || 'Falha ao remover nível da tabela.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Filtragem da listagem principal
  const filteredCrh = useMemo(() => {
    return crhList.filter((item) => {
      if (filtroAno !== 'todos' && String(item.ano_letivo) !== filtroAno) {
        return false
      }
      if (filtroUnidade !== 'todas' && item.unidade_escolar_id !== filtroUnidade) {
        return false
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchCodigo = item.codigo?.toLowerCase().includes(q)
        const matchUnidade = item.unidade_escolar?.nome.toLowerCase().includes(q)
        const matchCargo = item.cargo?.nome.toLowerCase().includes(q)
        const matchFuncao = item.funcao?.nome.toLowerCase().includes(q)
        const matchNivel = item.nivel_unidade?.toLowerCase().includes(q)
        const matchTipo = item.tipo_atendimento?.toLowerCase().includes(q)
        return matchCodigo || matchUnidade || matchCargo || matchFuncao || matchNivel || matchTipo
      }
      return true
    })
  }, [crhList, search, filtroAno, filtroUnidade])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
          <span>Cadastros de Apoio</span>
          <span>&rsaquo;</span>
          <span>Configurações de Recursos Humanos (CRH)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Scale className="w-7 h-7 text-blue-600" />
          Configurações de RH por Tipo de Atendimento (CRH)
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Regras de dimensionamento de profissionais por unidade escolar e tipo de atendimento,
          servindo como base para futura geração automática de vagas
        </p>
      </div>

      <Tabs defaultValue="crh" className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="crh" className="gap-2 text-xs font-medium">
            <Sliders className="w-4 h-4" />
            Dimensionamento de RH (CRH)
          </TabsTrigger>
          <TabsTrigger value="referencia" className="gap-2 text-xs font-medium">
            <Settings className="w-4 h-4" />
            Tabelas Oficiais de Referência (Níveis)
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA 1: CONFIGURAÇÕES DE CRH                                               */}
        {/* ========================================================================= */}
        <TabsContent value="crh" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg">Regras de Dimensionamento Cadastradas</CardTitle>
                <CardDescription>
                  Total de {crhList.length} configuração(ões) de RH registrada(s)
                </CardDescription>
              </div>
              {canEditCrh && (
                <Button
                  onClick={handleOpenCreate}
                  className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
                >
                  <Plus className="w-4 h-4" />
                  Nova Configuração (CRH)
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barra de Filtros e Busca */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                  <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Search className="w-3 h-3" /> Busca Geral
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Código, unidade, cargo, função, nível..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 text-xs bg-white h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Ano Letivo
                  </label>
                  <Select value={filtroAno} onValueChange={setFiltroAno}>
                    <SelectTrigger className="text-xs bg-white h-9">
                      <SelectValue placeholder="Todos os anos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os anos</SelectItem>
                      {ANOS_LETIVOS.map((ano) => (
                        <SelectItem key={ano} value={String(ano)}>
                          Ano Letivo {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Building className="w-3 h-3" /> Unidade Escolar
                  </label>
                  <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
                    <SelectTrigger className="text-xs bg-white h-9">
                      <SelectValue placeholder="Todas as unidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as unidades</SelectItem>
                      {unidades.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabela de Listagem */}
              {loading ? (
                <div className="py-16 flex items-center justify-center text-sm text-slate-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" /> Carregando configurações
                  de RH...
                </div>
              ) : filteredCrh.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2">
                  <Sliders className="w-8 h-8 text-slate-400" />
                  <p className="font-medium text-slate-700">
                    Nenhuma configuração de RH encontrada.
                  </p>
                  <p className="text-xs text-slate-500 max-w-md">
                    {search || filtroAno !== 'todos' || filtroUnidade !== 'todas'
                      ? 'Nenhum registro corresponde aos filtros selecionados. Tente ajustar os parâmetros de busca.'
                      : 'Clique em "Nova Configuração (CRH)" para cadastrar a primeira regra de dimensionamento.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-xl shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 border-b">
                      <tr>
                        <th className="py-3 px-3 font-semibold uppercase tracking-wider w-24">
                          Código
                        </th>
                        <th className="py-3 px-3 font-semibold uppercase tracking-wider w-20">
                          Ano
                        </th>
                        <th className="py-3 px-3 font-semibold uppercase tracking-wider min-w-[180px]">
                          Unidade Escolar
                        </th>
                        <th className="py-3 px-3 font-semibold uppercase tracking-wider min-w-[150px]">
                          Atendimento / Nível
                        </th>
                        <th className="py-3 px-3 font-semibold uppercase tracking-wider min-w-[160px]">
                          Cargo
                        </th>
                        <th
                          className="py-3 px-2 font-semibold uppercase tracking-wider text-center w-16"
                          title="Quantidade de Profissionais"
                        >
                          Qtd Prof
                        </th>
                        <th className="py-3 px-2 font-semibold uppercase tracking-wider text-center w-20">
                          Por Turma
                        </th>
                        <th className="py-3 px-2 font-semibold uppercase tracking-wider text-center w-20">
                          Por Período
                        </th>
                        <th className="py-3 px-2 font-semibold uppercase tracking-wider text-center w-20">
                          Natureza
                        </th>
                        <th className="py-3 px-3 font-semibold uppercase tracking-wider min-w-[140px]">
                          Função
                        </th>
                        <th
                          className="py-3 px-2 font-semibold uppercase tracking-wider text-center w-16"
                          title="Quantidade por Função"
                        >
                          Qtd Func
                        </th>
                        <th className="py-3 px-3 font-semibold uppercase tracking-wider text-right w-28">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCrh.map((c) => (
                        <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {c.codigo || 'CRH-0000'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{c.ano_letivo}</td>
                          <td className="py-3 px-3 font-medium text-slate-900">
                            {c.unidade_escolar?.nome || 'Unidade não encontrada'}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            <div className="flex flex-col">
                              <span className="truncate text-slate-800" title={c.tipo_atendimento}>
                                {c.tipo_atendimento}
                              </span>
                              <span className="text-[11px] font-semibold text-blue-700">
                                {c.nivel_unidade}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-800">
                            {c.cargo?.nome || 'Cargo não encontrado'}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-900">
                            {c.quantidade_profissionais}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                c.por_turma === 'Sim'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {c.por_turma}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                c.por_periodo === 'Sim'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {c.por_periodo}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                c.natureza_cargo === 'Fixo'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {c.natureza_cargo}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-800">
                            {c.funcao?.nome || 'Função não encontrada'}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-900">
                            {c.quantidade_por_funcao}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap space-x-1">
                            <Button
                              size="icon"
                              className="h-7 w-7 bg-[#0B2545] hover:bg-[#133A68] text-white"
                              onClick={() => handleOpenView(c)}
                              title="Visualizar detalhes"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {canEditCrh && (
                              <>
                                <Button
                                  size="icon"
                                  className="h-7 w-7 bg-[#0B2545] hover:bg-[#133A68] text-white"
                                  onClick={() => handleOpenEdit(c)}
                                  title="Editar configuração"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  className="h-7 w-7 bg-[#0B2545] hover:bg-[#133A68] text-white"
                                  onClick={() => setDeletingCrh(c)}
                                  title="Excluir configuração"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
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
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: TABELAS OFICIAIS DE REFERÊNCIA (NÍVEIS / PORTE)                     */}
        {/* ========================================================================= */}
        <TabsContent value="referencia" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg">
                  Tabelas Oficiais de Referência (Dimensionamento)
                </CardTitle>
                <CardDescription>
                  Classificações oficiais configuráveis de Nível I a VIII (20h) e Níveis A, B e C
                  (40h Educação Infantil)
                </CardDescription>
              </div>
              {canEditCrh && (
                <Button
                  onClick={handleOpenCreateNivel}
                  className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
                >
                  <Plus className="w-4 h-4" />
                  Novo Nível de Referência
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b">
                    <tr>
                      <th className="py-3 px-3 font-semibold uppercase tracking-wider w-24">
                        Código
                      </th>
                      <th className="py-3 px-3 font-semibold uppercase tracking-wider w-16 text-center">
                        Ordem
                      </th>
                      <th className="py-3 px-4 font-semibold uppercase tracking-wider">
                        Tipo de Atendimento
                      </th>
                      <th className="py-3 px-4 font-semibold uppercase tracking-wider">Nível</th>
                      <th className="py-3 px-4 font-semibold uppercase tracking-wider">
                        Faixa de Alunos
                      </th>
                      <th className="py-3 px-4 font-semibold uppercase tracking-wider">
                        Descrição Oficial
                      </th>
                      <th className="py-3 px-3 font-semibold uppercase tracking-wider text-right w-24">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {niveisPorte.map((n) => (
                      <tr key={n.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-semibold text-blue-700">
                          {n.codigo || 'NIV-0000'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          {n.ordem}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {n.tipo_atendimento}
                        </td>
                        <td className="py-3 px-4 font-bold text-blue-800">{n.nivel}</td>
                        <td className="py-3 px-4 text-slate-700 font-mono">
                          {n.alunos_min} até {n.alunos_max !== null ? n.alunos_max : 'acima'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{n.descricao || '—'}</td>
                        <td className="py-3 px-3 text-right whitespace-nowrap space-x-1">
                          {canEditCrh && (
                            <>
                              <Button
                                size="icon"
                                className="h-7 w-7 bg-[#0B2545] hover:bg-[#133A68] text-white"
                                onClick={() => handleOpenEditNivel(n)}
                                title="Editar nível"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                className="h-7 w-7 bg-[#0B2545] hover:bg-[#133A68] text-white"
                                onClick={() => setDeletingNivel(n)}
                                title="Excluir nível"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR CRH (COM TODOS OS 11 CAMPOS)                          */}
      {/* ========================================================================= */}
      <Dialog open={openCrhDialog} onOpenChange={setOpenCrhDialog}>
        <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Scale className="w-5 h-5 text-blue-600" />
              {editingCrh ? 'Editar Configuração de RH (CRH)' : 'Nova Configuração de RH (CRH)'}
            </DialogTitle>
            <DialogDescription>
              Preencha os 11 campos da regra de dimensionamento com dependências dinâmicas
              integradas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCrh} className="space-y-4 pt-1">
            {/* Linha 1: 1. Ano Letivo e 2. Unidade Escolar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Campo 1: Ano Letivo */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label
                  htmlFor="crh-ano"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  1. Ano Letivo <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={String(formAnoLetivo)}
                  onValueChange={(val) => setFormAnoLetivo(Number(val))}
                >
                  <SelectTrigger id="crh-ano" className="h-10 text-sm bg-white">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOS_LETIVOS.map((ano) => (
                      <SelectItem key={ano} value={String(ano)}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campo 2: Unidade Escolar */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="crh-unidade"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  2. Unidade Escolar <span className="text-rose-500">*</span>
                </Label>
                <Select value={formUnidadeId} onValueChange={handleUnidadeChange}>
                  <SelectTrigger id="crh-unidade" className="h-10 text-sm bg-white">
                    <SelectValue placeholder="Selecione a unidade escolar" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome} ({u.tipo_atendimento.includes('20h') ? '20h' : '40h'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 2: 3. Tipo de Atendimento e 4. Nível da Unidade (Automáticos) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {/* Campo 3: Tipo de Atendimento */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  3. Tipo de Atendimento{' '}
                  <span className="text-blue-600 text-[10px] font-normal">(Automático)</span>
                </Label>
                <Input
                  value={formTipoAtendimento || 'Selecione a Unidade'}
                  readOnly
                  disabled
                  className="h-9 text-xs bg-white text-slate-700 font-medium cursor-not-allowed border-slate-300"
                />
              </div>

              {/* Campo 4: Nível da Unidade Escolar */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  4. Nível da Unidade Escolar{' '}
                  <span className="text-blue-600 text-[10px] font-normal">(Automático)</span>
                </Label>
                <Input
                  value={formNivelUnidade || 'Não determinado'}
                  readOnly
                  disabled
                  className="h-9 text-xs bg-white font-bold text-blue-800 cursor-not-allowed border-slate-300"
                />
              </div>

              {avisoNivel && (
                <div className="sm:col-span-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{avisoNivel}</span>
                </div>
              )}
            </div>

            {/* Linha 3: 5. Cargo (com botão + Novo) e 6. Quantidade de Profissionais */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Campo 5: Cargo com botão "+ Novo" inline */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="crh-cargo"
                    className="text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    5. Cargo <span className="text-rose-500">*</span>
                  </Label>
                  {canEditCrh && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNovoCargoNome('')
                        setOpenNovoCargoModal(true)
                      }}
                      className="h-6 text-[11px] font-semibold text-blue-700 hover:text-blue-800 px-1.5 gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Novo Cargo
                    </Button>
                  )}
                </div>
                <Select value={formCargoId} onValueChange={handleCargoChange}>
                  <SelectTrigger id="crh-cargo" className="h-10 text-sm bg-white">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cargos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.codigo ? `${c.codigo}: ` : ''}
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campo 6: Quantidade de Profissionais */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label
                  htmlFor="crh-qtd-prof"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  6. Qtd Profissionais <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="crh-qtd-prof"
                  type="number"
                  min="0"
                  step="1"
                  value={formQtdProfissionais}
                  onChange={(e) =>
                    setFormQtdProfissionais(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  required
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>

            {/* Linha 4: 7. Por Turma?, 8. Por Período? e 9. Natureza do Cargo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50/70 border border-slate-200 rounded-xl">
              {/* Campo 7: Por Turma? */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="crh-por-turma"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  7. Por Turma? <span className="text-rose-500">*</span>
                </Label>
                <Select value={formPorTurma} onValueChange={handlePorTurmaChange}>
                  <SelectTrigger id="crh-por-turma" className="h-9 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Não">Não</SelectItem>
                    <SelectItem value="Sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500">Cálculo futuro por turmas</p>
              </div>

              {/* Campo 8: Por Período? */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="crh-por-periodo"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  8. Por Período? <span className="text-rose-500">*</span>
                </Label>
                <Select value={formPorPeriodo} onValueChange={handlePorPeriodoChange}>
                  <SelectTrigger id="crh-por-periodo" className="h-9 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Não">Não</SelectItem>
                    <SelectItem value="Sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500">Cálculo futuro por turnos</p>
              </div>

              {/* Campo 9: Natureza do Cargo */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="crh-natureza"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  9. Natureza do Cargo <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formNaturezaCargo}
                  onValueChange={(val: 'Fixo' | 'Itinerante') => setFormNaturezaCargo(val)}
                >
                  <SelectTrigger id="crh-natureza" className="h-9 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fixo">Fixo</SelectItem>
                    <SelectItem value="Itinerante">Itinerante</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500">Lotação permanente ou rotativa</p>
              </div>
            </div>

            {/* Linha 5: 10. Função (somente compatíveis + inline Novo) e 11. Quantidade por Função */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Campo 10: Função */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="crh-funcao"
                    className="text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    10. Função Compatível <span className="text-rose-500">*</span>
                  </Label>
                  {canEditCrh && formCargoId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNovaFuncaoNome('')
                        setOpenNovaFuncaoModal(true)
                      }}
                      className="h-6 text-[11px] font-semibold text-blue-700 hover:text-blue-800 px-1.5 gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Nova Função
                    </Button>
                  )}
                </div>
                <Select
                  value={formFuncaoId}
                  onValueChange={setFormFuncaoId}
                  disabled={!formCargoId}
                >
                  <SelectTrigger id="crh-funcao" className="h-10 text-sm bg-white">
                    <SelectValue
                      placeholder={
                        !formCargoId
                          ? 'Selecione primeiro o Cargo acima'
                          : funcoesDoCargo.length === 0
                            ? 'Nenhuma função vinculada a este cargo'
                            : 'Selecione a função compatível'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {funcoesDoCargo.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.codigo ? `${f.codigo}: ` : ''}
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">
                  {formCargoId
                    ? `${funcoesDoCargo.length} função(ões) compatível(is) vinculada(s) via matriz de cargos`
                    : 'Aguardando seleção do cargo'}
                </p>
              </div>

              {/* Campo 11: Quantidade por Função */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label
                  htmlFor="crh-qtd-func"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  11. Qtd por Função <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="crh-qtd-func"
                  type="number"
                  min="0"
                  step="1"
                  value={formQtdPorFuncao}
                  onChange={(e) => setFormQtdPorFuncao(Math.max(0, parseInt(e.target.value) || 0))}
                  required
                  className="h-10 text-sm bg-white"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                onClick={() => setOpenCrhDialog(false)}
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
                {editingCrh ? 'Atualizar Configuração' : 'Salvar Configuração (CRH)'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: VISUALIZAÇÃO DETALHADA CRH                                         */}
      {/* ========================================================================= */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              Detalhes da Configuração de RH
            </DialogTitle>
            <DialogDescription>
              Ficha consolidada de dimensionamento de profissionais da unidade
            </DialogDescription>
          </DialogHeader>

          {viewingCrh && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-lg">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Código CRH
                  </span>
                  <span className="font-mono font-bold text-sm text-blue-700 mt-0.5 block">
                    {viewingCrh.codigo || 'CRH-0000'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Ano Letivo
                  </span>
                  <span className="font-bold text-sm text-slate-800 mt-0.5 block">
                    {viewingCrh.ano_letivo}
                  </span>
                </div>
              </div>

              <div className="border-b pb-2 space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Unidade Escolar
                </span>
                <p className="text-sm font-semibold text-slate-900">
                  {viewingCrh.unidade_escolar?.nome}
                </p>
                <p className="text-slate-600">
                  Tipo de Atendimento:{' '}
                  <span className="font-medium text-slate-900">{viewingCrh.tipo_atendimento}</span>
                </p>
                <p className="text-slate-600">
                  Classificação / Nível:{' '}
                  <span className="font-bold text-blue-700">{viewingCrh.nivel_unidade}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b pb-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Cargo
                  </span>
                  <p className="font-medium text-slate-900 mt-0.5">{viewingCrh.cargo?.nome}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Quantidade de Profissionais
                  </span>
                  <p className="font-bold text-base text-slate-900 mt-0.5">
                    {viewingCrh.quantidade_profissionais}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b pb-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Função Vinculada
                  </span>
                  <p className="font-medium text-slate-900 mt-0.5">{viewingCrh.funcao?.nome}</p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Quantidade por Função
                  </span>
                  <p className="font-bold text-base text-slate-900 mt-0.5">
                    {viewingCrh.quantidade_por_funcao}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Por Turma?
                  </span>
                  <span className="font-bold text-slate-800">{viewingCrh.por_turma}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Por Período?
                  </span>
                  <span className="font-bold text-slate-800">{viewingCrh.por_periodo}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Natureza
                  </span>
                  <span className="font-bold text-slate-800">{viewingCrh.natureza_cargo}</span>
                </div>
              </div>
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

      {/* ========================================================================= */}
      {/* MODAL: EXCLUSÃO DE CRH                                                    */}
      {/* ========================================================================= */}
      <AlertDialog
        open={Boolean(deletingCrh)}
        onOpenChange={(open) => !open && setDeletingCrh(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Configuração de RH?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a regra de dimensionamento{' '}
              <strong className="text-slate-900">"{deletingCrh?.codigo}"</strong> (Unidade:{' '}
              {deletingCrh?.unidade_escolar?.nome || 'Unidade'}, Cargo: {deletingCrh?.cargo?.nome})?
              Esta ação não pode ser desfeita.
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
              {saving ? 'Excluindo...' : 'Excluir Configuração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================================= */}
      {/* MODAL INLINE: NOVO CARGO (+ Novo)                                         */}
      {/* ========================================================================= */}
      <Dialog open={openNovoCargoModal} onOpenChange={setOpenNovoCargoModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Novo Cargo
            </DialogTitle>
            <DialogDescription>
              Cadastre um novo cargo sem precisar sair da configuração de RH
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveNovoCargoInline} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="novo-cargo-nome"
                className="text-xs font-bold uppercase text-slate-700"
              >
                Nome do Cargo <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="novo-cargo-nome"
                placeholder="Ex: Professor de Apoio Pedagógico"
                value={novoCargoNome}
                onChange={(e) => setNovoCargoNome(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => setOpenNovoCargoModal(false)}
                disabled={salvandoNovoCargo}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoNovoCargo}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                {salvandoNovoCargo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cadastrar Cargo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL INLINE: NOVA FUNÇÃO (+ Novo)                                        */}
      {/* ========================================================================= */}
      <Dialog open={openNovaFuncaoModal} onOpenChange={setOpenNovaFuncaoModal}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Nova Função
            </DialogTitle>
            <DialogDescription>
              Cadastre uma nova função e vincule-a automaticamente ao cargo selecionado
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveNovaFuncaoInline} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="nova-funcao-nome"
                className="text-xs font-bold uppercase text-slate-700"
              >
                Nome da Função <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="nova-funcao-nome"
                placeholder="Ex: Coordenador de Turno"
                value={novaFuncaoNome}
                onChange={(e) => setNovaFuncaoNome(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
              <span className="font-semibold">Vínculo Automático:</span> Esta nova função será
              vinculada ao cargo selecionado no formulário atual.
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => setOpenNovaFuncaoModal(false)}
                disabled={salvandoNovaFuncao}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoNovaFuncao}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                {salvandoNovaFuncao && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cadastrar Função
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR NÍVEL DE PORTE (REFERÊNCIA)                          */}
      {/* ========================================================================= */}
      <Dialog open={openNivelModal} onOpenChange={setOpenNivelModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              {editingNivel ? 'Editar Nível de Referência' : 'Novo Nível de Referência'}
            </DialogTitle>
            <DialogDescription>
              Configuração da faixa oficial de dimensionamento de alunos
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveNivel} className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-slate-700">
                Tipo de Atendimento *
              </Label>
              <Select value={formNivelTipo} onValueChange={setFormNivelTipo}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ensino Fundamental e Educação Infantil (20h)">
                    Ensino Fundamental e Educação Infantil (20h)
                  </SelectItem>
                  <SelectItem value="Educação Infantil (40h)">Educação Infantil (40h)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase text-slate-700">
                  Nome do Nível *
                </Label>
                <Input
                  placeholder="Ex: Nível I ou Nível A"
                  value={formNivelNome}
                  onChange={(e) => setFormNivelNome(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase text-slate-700">
                  Ordem de Exibição *
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formNivelOrdem}
                  onChange={(e) => setFormNivelOrdem(parseInt(e.target.value) || 1)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase text-slate-700">
                  Mínimo de Alunos *
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formNivelMin}
                  onChange={(e) => setFormNivelMin(parseInt(e.target.value) || 0)}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase text-slate-700">
                  Máximo de Alunos
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Sem limite superior"
                  value={formNivelMax}
                  onChange={(e) => setFormNivelMax(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-slate-700">
                Descrição Oficial
              </Label>
              <Input
                placeholder="Ex: De 251 a 500 alunos"
                value={formNivelDesc}
                onChange={(e) => setFormNivelDesc(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button
                type="button"
                onClick={() => setOpenNivelModal(false)}
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
                Salvar Nível
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EXCLUSÃO DE NÍVEL DE PORTE                                         */}
      {/* ========================================================================= */}
      <AlertDialog
        open={Boolean(deletingNivel)}
        onOpenChange={(open) => !open && setDeletingNivel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Nível de Referência?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a faixa de dimensionamento{' '}
              <strong className="text-slate-900">"{deletingNivel?.nivel}"</strong> (
              {deletingNivel?.tipo_atendimento})?
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
              onClick={handleDeleteNivelConfirm}
              className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              disabled={saving}
            >
              {saving ? 'Excluindo...' : 'Excluir Nível'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
