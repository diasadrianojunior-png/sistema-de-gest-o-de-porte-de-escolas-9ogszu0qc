import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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
  UserCheck,
  Building,
  Briefcase,
  Eye,
  CheckCircle2,
  HelpCircle,
  Calendar,
  Sparkles,
  Info,
  AlertTriangle,
  GraduationCap,
  Layers,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  getProfissionais,
  salvarProfissional,
  deleteProfissional,
  getVagasPorUnidade,
  calcularClasseProfissional,
  determinarTipoVinculoVaga,
  VinculoVagaInput,
} from '@/services/profissionais'
import { getUnidadesEscolares } from '@/services/unidades-escolares'
import { getCargos } from '@/services/apoio'
import {
  Profissional,
  UnidadeEscolar,
  Cargo,
  VagaReal,
  ClasseProfissional,
  TipoVinculoVaga,
} from '@/types/gestao-escolar'

interface LinhaVinculoForm {
  idTemp: string
  vaga_id: string
  titular: boolean
  cargo_id: string
  tipo_vinculo: TipoVinculoVaga // 'CARGO' | 'FUNCAO'
}

export default function Profissionais() {
  const { isAdmin, canEdit } = useAuth()
  const canEditProfissionais = isAdmin || canEdit('profissionais')

  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [unidades, setUnidades] = useState<UnidadeEscolar[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])

  const [search, setSearch] = useState('')
  const [filtroUnidade, setFiltroUnidade] = useState<string>('todas')
  const [filtroClasse, setFiltroClasse] = useState<string>('todas')
  const [filtroClassificacao, setFiltroClassificacao] = useState<string>('todas')
  const [paginaAtual, setPaginaAtual] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modais de Criação / Edição
  const [openDialog, setOpenDialog] = useState(false)
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formDataAdmissao, setFormDataAdmissao] = useState('')
  const [formDataNascimento, setFormDataNascimento] = useState('')
  const [formClasse, setFormClasse] = useState<ClasseProfissional>('Antigos na Rede')
  const [formClassificacaoConcurso, setFormClassificacaoConcurso] = useState('')
  const [formUnidadeId, setFormUnidadeId] = useState<string>('')
  const [formAtivo, setFormAtivo] = useState(true)
  const [formVinculos, setFormVinculos] = useState<LinhaVinculoForm[]>([])

  // Modal de Ajuda e Regras
  const [openAjuda, setOpenAjuda] = useState(false)

  // Vagas carregadas para a unidade escolar atualmente selecionada no formulário
  const [vagasDaUnidade, setVagasDaUnidade] = useState<VagaReal[]>([])
  const [carregandoVagasUnidade, setCarregandoVagasUnidade] = useState(false)

  // Modal de Visualização (Detalhe)
  const [viewingProfissional, setViewingProfissional] = useState<Profissional | null>(null)
  const [openViewDialog, setOpenViewDialog] = useState(false)

  // Modal de Exclusão
  const [deletingProfissional, setDeletingProfissional] = useState<Profissional | null>(null)

  // Modal de Confirmação de Substituição de Vaga Ocupada
  const [modalSubstituicaoOpen, setModalSubstituicaoOpen] = useState(false)
  const [conflitosSubstituicao, setConflitosSubstituicao] = useState<
    Array<{
      vagaId: string
      vagaCodigo: string
      vagaFuncao: string
      ocupanteAtualNome: string
    }>
  >([])

  const carregarDadosIniciais = async () => {
    try {
      setLoading(true)
      const [profsData, unidadesData, cargosData] = await Promise.all([
        getProfissionais(),
        getUnidadesEscolares(),
        getCargos(),
      ])
      setProfissionais(profsData)
      setUnidades(unidadesData)
      setCargos(cargosData)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Falha ao buscar profissionais.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  // Carregar vagas da unidade escolar quando mudar a unidade selecionada no formulário
  useEffect(() => {
    if (!formUnidadeId) {
      setVagasDaUnidade([])
      return
    }

    let ativo = true
    const carregarVagas = async () => {
      try {
        setCarregandoVagasUnidade(true)
        const anoAtual = new Date().getFullYear()
        const anoValido = anoAtual >= 2020 && anoAtual <= 2040 ? anoAtual : 2026
        const vagas = await getVagasPorUnidade(formUnidadeId, anoValido)
        if (ativo) {
          setVagasDaUnidade(vagas)
        }
      } catch (err: any) {
        console.error('Erro ao carregar vagas da unidade:', err)
        toast({
          title: 'Erro ao carregar vagas',
          description: 'Não foi possível listar as vagas da unidade escolar selecionada.',
          variant: 'destructive',
        })
      } finally {
        if (ativo) setCarregandoVagasUnidade(false)
      }
    }

    carregarVagas()

    return () => {
      ativo = false
    }
  }, [formUnidadeId])

  // Tratar mudança da unidade escolar no formulário
  // Regra permanente de relacionamentos dinâmicos: limpamos vínculos incompatíveis
  const handleUnidadeChange = (novaUnidadeId: string) => {
    setFormUnidadeId(novaUnidadeId)
    // Se mudou de unidade escolar, limpa as vagas vinculadas ou redefine
    setFormVinculos([])
  }

  // Atualizar a classe automaticamente sempre que a Data de Admissão mudar
  const handleDataAdmissaoChange = (novaData: string) => {
    setFormDataAdmissao(novaData)
    const classeDerivada = calcularClasseProfissional(novaData)
    setFormClasse(classeDerivada)
  }

  // Abrir modal de criação
  const handleOpenCreate = () => {
    setEditingProfissional(null)
    setFormNome('')
    setFormDataAdmissao('')
    setFormDataNascimento('')
    setFormClasse('Antigos na Rede')
    setFormClassificacaoConcurso('')
    setFormUnidadeId('')
    setFormAtivo(true)
    setFormVinculos([])
    setVagasDaUnidade([])
    setOpenDialog(true)
  }

  // Abrir modal de edição
  const handleOpenEdit = async (prof: Profissional) => {
    setEditingProfissional(prof)
    setFormNome(prof.nome)
    const dataAdm = prof.data_admissao || ''
    setFormDataAdmissao(dataAdm)
    setFormDataNascimento(prof.data_nascimento || '')
    const classeDerivada =
      (prof.classe as ClasseProfissional) || calcularClasseProfissional(dataAdm)
    setFormClasse(classeDerivada)
    setFormClassificacaoConcurso(prof.classificacao_concurso || '')
    setFormUnidadeId(prof.unidade_escolar_id)
    setFormAtivo(prof.ativo)

    const linhasIniciais: LinhaVinculoForm[] = (prof.vagas_vinculadas || []).map((v) => {
      const tipo = determinarTipoVinculoVaga(v.vaga)
      return {
        idTemp: v.id || Math.random().toString(),
        vaga_id: v.vaga_id,
        // Função não tem titular, só ocupante
        titular: tipo === 'FUNCAO' ? false : Boolean(v.titular),
        cargo_id: v.cargo_id || '',
        tipo_vinculo: tipo,
      }
    })

    setFormVinculos(linhasIniciais)
    setOpenDialog(true)
  }

  // Abrir visualização de detalhe
  const handleOpenView = (prof: Profissional) => {
    setViewingProfissional(prof)
    setOpenViewDialog(true)
  }

  // Adicionar outra linha de vaga vinculada
  const handleAdicionarVagaVinculo = () => {
    if (!formUnidadeId) {
      toast({
        title: 'Selecione uma Unidade Escolar',
        description: 'Primeiro selecione a unidade escolar para listar as vagas correspondentes.',
        variant: 'destructive',
      })
      return
    }

    setFormVinculos((prev) => [
      ...prev,
      {
        idTemp: Math.random().toString(),
        vaga_id: '',
        titular: true,
        cargo_id: '',
        tipo_vinculo: 'CARGO',
      },
    ])
  }

  // Remover linha de vínculo
  const handleRemoverVinculo = (index: number) => {
    setFormVinculos((prev) => prev.filter((_, idx) => idx !== index))
  }

  // Alterar o tipo da vaga (Cargo/Função) de uma linha.
  // Dependência dinâmica: ao trocar o tipo, a vaga selecionada e o cargo são limpos
  // para impedir vínculos inválidos (vaga de cargo misturada com escolha de função e vice-versa).
  const handleAlterarTipoVinculoLinha = (index: number, novoTipo: TipoVinculoVaga) => {
    setFormVinculos((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item
        if (item.tipo_vinculo === novoTipo) return item
        return {
          ...item,
          tipo_vinculo: novoTipo,
          vaga_id: '',
          cargo_id: '',
          titular: novoTipo === 'FUNCAO' ? false : item.titular,
        }
      }),
    )
  }

  // Alterar seleção de vaga de uma linha
  const handleAlterarVagaLinha = (index: number, novaVagaId: string) => {
    // Buscar a vaga selecionada
    const vagaSel = vagasDaUnidade.find((v) => v.id === novaVagaId)

    // Determinar cargo padrão sugerido (se houver apenas 1 cargo permitido, ou cargo da vaga)
    let cargoPadrao = ''
    if (vagaSel) {
      if (vagaSel.cargo_id) {
        cargoPadrao = vagaSel.cargo_id
      } else {
        const cargosLinha = vagaSel.configuracao_rh_linha?.cargos || []
        if (cargosLinha.length === 1 && cargosLinha[0].cargo_id) {
          cargoPadrao = cargosLinha[0].cargo_id
        }
      }

      // Verificação real de ocupação: se a vaga estiver OCUPADA por outro profissional
      const estaOcupadaPorOutro =
        vagaSel.status === 'OCUPADA' &&
        Boolean(vagaSel.servidor_id) &&
        vagaSel.servidor_id !== editingProfissional?.id

      if (estaOcupadaPorOutro) {
        const ocupante = vagaSel.nome_ocupante || 'Outro profissional'
        toast({
          title: 'Atenção: Vaga já Ocupada!',
          description: `A vaga "${vagaSel.codigo ? `${vagaSel.codigo} - ` : ''}${vagaSel.funcao}" já está ocupada por "${ocupante}". Ao salvar, será necessária a sua confirmação para substituir o ocupante.`,
          variant: 'destructive',
        })
      }
    }

    setFormVinculos((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item
        return {
          ...item,
          vaga_id: novaVagaId,
          cargo_id: cargoPadrao,
        }
      }),
    )
  }

  // Alterar titularidade de uma linha
  const handleAlterarTitularLinha = (index: number, novoTitular: boolean) => {
    setFormVinculos((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, titular: novoTitular } : item)),
    )
  }

  // Alterar cargo/ocupação de uma linha
  const handleAlterarCargoLinha = (index: number, novoCargoId: string) => {
    setFormVinculos((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, cargo_id: novoCargoId } : item)),
    )
  }

  // Executar a gravação final do profissional e seus vínculos
  const executarGravacaoProfissional = async (vinculosFinal: VinculoVagaInput[]) => {
    try {
      setSaving(true)
      await salvarProfissional({
        id: editingProfissional?.id,
        nome: formNome.trim(),
        unidade_escolar_id: formUnidadeId,
        ativo: formAtivo,
        data_admissao: formDataAdmissao,
        data_nascimento: formDataNascimento,
        classe: formClasse,
        classificacao_concurso: formClassificacaoConcurso,
        vagas: vinculosFinal,
      })

      toast({
        title: 'Sucesso',
        description: editingProfissional
          ? 'Profissional atualizado com sucesso!'
          : 'Profissional cadastrado com sucesso!',
      })

      setModalSubstituicaoOpen(false)
      setConflitosSubstituicao([])
      setOpenDialog(false)
      await carregarDadosIniciais()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar o cadastro do profissional.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Submeter formulário: valida e checa se há vagas ocupadas por outros profissionais
  const handleSaveProfissional = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formNome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do profissional.',
        variant: 'destructive',
      })
      return
    }

    if (!formDataAdmissao.trim()) {
      toast({
        title: 'Data de Admissão obrigatória',
        description: 'Informe a Data de Admissão do profissional.',
        variant: 'destructive',
      })
      return
    }

    if (!formDataNascimento.trim()) {
      toast({
        title: 'Data de Nascimento obrigatória',
        description: 'Informe a Data de Nascimento do profissional.',
        variant: 'destructive',
      })
      return
    }

    if (!formClasse) {
      toast({
        title: 'Classe do Profissional obrigatória',
        description: 'Selecione a Classe do Profissional.',
        variant: 'destructive',
      })
      return
    }

    // Classificação no Concurso: obrigatória quando a Classe for "Novos na Rede",
    // opcional quando for "Antigos na Rede"
    if (formClasse === 'Novos na Rede' && !formClassificacaoConcurso.trim()) {
      toast({
        title: 'Classificação no Concurso obrigatória',
        description:
          'Para profissionais classificados como "Novos na Rede", a Classificação no Concurso é de preenchimento obrigatório.',
        variant: 'destructive',
      })
      return
    }

    if (!formUnidadeId) {
      toast({
        title: 'Unidade Escolar obrigatória',
        description: 'Selecione a unidade escolar do profissional.',
        variant: 'destructive',
      })
      return
    }

    // Validar duplicidade de vaga nas linhas de vínculo
    const vagasSelecionadas = formVinculos
      .map((v) => v.vaga_id)
      .filter((vId) => Boolean(vId && vId.trim()))

    const conjuntoVagas = new Set(vagasSelecionadas)
    if (conjuntoVagas.size !== vagasSelecionadas.length) {
      toast({
        title: 'Vagas duplicadas',
        description: 'A mesma vaga não pode ser selecionada mais de uma vez no mesmo profissional.',
        variant: 'destructive',
      })
      return
    }

    // Montar vínculos validados (função nunca é titular: função não tem titular, só ocupante)
    const vinculosFinal: VinculoVagaInput[] = formVinculos
      .filter((v) => Boolean(v.vaga_id && v.vaga_id.trim()))
      .map((v) => ({
        vaga_id: v.vaga_id,
        tipo_vinculo: v.tipo_vinculo,
        titular: v.tipo_vinculo === 'FUNCAO' ? false : Boolean(v.titular),
        cargo_id: v.cargo_id && v.cargo_id.trim() ? v.cargo_id : null,
      }))

    // Checar se há conflito de vagas ocupadas por outro profissional
    const conflitos: Array<{
      vagaId: string
      vagaCodigo: string
      vagaFuncao: string
      ocupanteAtualNome: string
    }> = []

    for (const vinc of vinculosFinal) {
      const vagaObj = vagasDaUnidade.find((v) => v.id === vinc.vaga_id)
      if (
        vagaObj &&
        vagaObj.status === 'OCUPADA' &&
        vagaObj.servidor_id &&
        vagaObj.servidor_id !== editingProfissional?.id
      ) {
        conflitos.push({
          vagaId: vagaObj.id,
          vagaCodigo: vagaObj.codigo || '',
          vagaFuncao: vagaObj.funcao,
          ocupanteAtualNome: vagaObj.nome_ocupante || 'Outro Profissional',
        })
      }
    }

    if (conflitos.length > 0) {
      // Exigir confirmação explícita do usuário
      setConflitosSubstituicao(conflitos)
      setModalSubstituicaoOpen(true)
      return
    }

    // Sem conflito: grava diretamente
    await executarGravacaoProfissional(vinculosFinal)
  }

  // Usuário confirmou a substituição no modal de alerta/confirmação
  const handleConfirmarSubstituicao = async () => {
    const vinculosFinal: VinculoVagaInput[] = formVinculos
      .filter((v) => Boolean(v.vaga_id && v.vaga_id.trim()))
      .map((v) => ({
        vaga_id: v.vaga_id,
        tipo_vinculo: v.tipo_vinculo,
        titular: v.tipo_vinculo === 'FUNCAO' ? false : Boolean(v.titular),
        cargo_id: v.cargo_id && v.cargo_id.trim() ? v.cargo_id : null,
      }))

    await executarGravacaoProfissional(vinculosFinal)
  }

  // Confirmar exclusão
  const handleDeleteConfirm = async () => {
    if (!deletingProfissional) return

    try {
      setSaving(true)
      await deleteProfissional(deletingProfissional.id)
      toast({
        title: 'Removido',
        description: 'Profissional excluído e vagas vinculadas foram liberadas.',
      })
      setDeletingProfissional(null)
      await carregarDadosIniciais()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Falha ao remover profissional.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Filtros e busca para listagem
  const profissionaisFiltrados = useMemo(() => {
    let lista = profissionais

    if (filtroUnidade && filtroUnidade !== 'todas') {
      lista = lista.filter((p) => p.unidade_escolar_id === filtroUnidade)
    }

    if (filtroClasse && filtroClasse !== 'todas') {
      lista = lista.filter((p) => {
        const classeEfetiva = p.classe || 'Antigos na Rede'
        return classeEfetiva === filtroClasse
      })
    }

    if (filtroClassificacao && filtroClassificacao !== 'todas') {
      lista = lista.filter((p) => {
        const val = (p.classificacao_concurso || '').trim()
        return filtroClassificacao === 'sem_classificacao' ? !val : val === filtroClassificacao
      })
    }

    if (search.trim()) {
      const term = search.toLowerCase()
      lista = lista.filter((p) => {
        const codigo = (p.codigo || '').toLowerCase()
        const nome = (p.nome || '').toLowerCase()
        const unidadeNome = (p.unidade_escolar?.nome || '').toLowerCase()
        const classe = (p.classe || 'antigos na rede').toLowerCase()
        const classificacao = (p.classificacao_concurso || '').toLowerCase()
        return (
          codigo.includes(term) ||
          nome.includes(term) ||
          unidadeNome.includes(term) ||
          classe.includes(term) ||
          classificacao.includes(term)
        )
      })
    }

    return lista
  }, [profissionais, filtroUnidade, filtroClasse, filtroClassificacao, search])

  // Valores distintos de Classificação no Concurso para o filtro
  const classificacoesDisponiveis = useMemo(() => {
    const valores = new Set<string>()
    profissionais.forEach((p) => {
      const v = (p.classificacao_concurso || '').trim()
      if (v) valores.add(v)
    })
    return Array.from(valores).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [profissionais])

  // Paginação 10 registros por página (padrão PaginacaoTabela)
  const itensPorPagina = ITENS_POR_PAGINA_PADRAO
  const totalRegistros = profissionaisFiltrados.length
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina) || 1

  const profissionaisPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return profissionaisFiltrados.slice(inicio, inicio + itensPorPagina)
  }, [profissionaisFiltrados, paginaAtual, itensPorPagina])

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setPaginaAtual(1)
  }, [search, filtroUnidade, filtroClasse, filtroClassificacao])

  // Obter cargos permitidos para uma vaga específica (baseado na configuracao_rh_linha_cargo)
  const getCargosPermitidosParaVaga = (vagaId: string): Cargo[] => {
    if (!vagaId) return cargos
    const vaga = vagasDaUnidade.find((v) => v.id === vagaId)
    if (!vaga) return cargos

    const cargosVinculados = vaga.configuracao_rh_linha?.cargos || []
    if (cargosVinculados.length > 0) {
      const permitidosIds = new Set(cargosVinculados.map((c) => c.cargo_id))
      const filtrados = cargos.filter((c) => permitidosIds.has(c.id))
      return filtrados.length > 0 ? filtrados : cargos
    }

    return cargos
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Profissionais
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Cadastros Mestres
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cadastro de profissionais, suas unidades escolares e vínculos com vagas de RH.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setOpenAjuda(true)}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            Ajuda e Regras
          </Button>

          {canEditProfissionais && (
            <Button
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Profissional
            </Button>
          )}
        </div>
      </div>

      {/* Cartão de Filtros e Busca */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="relative md:col-span-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por identificador (PRO-0001), nome, escola, classe ou classificação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            <div className="md:col-span-3">
              <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Todas as unidades escolares" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Unidades Escolares</SelectItem>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select value={filtroClasse} onValueChange={setFiltroClasse}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Todas as classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Classes</SelectItem>
                  <SelectItem value="Antigos na Rede">Antigos na Rede</SelectItem>
                  <SelectItem value="Novos na Rede">Novos na Rede</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Select value={filtroClassificacao} onValueChange={setFiltroClassificacao}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Todas as classificações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Classificações</SelectItem>
                  {classificacoesDisponiveis.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value="sem_classificacao">Sem Classificação no Concurso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Listagem */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3.5 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">
              Listagem de Profissionais
            </CardTitle>
            <span className="text-xs text-slate-500 font-medium">
              Total: {totalRegistros} {totalRegistros === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs">Carregando profissionais...</p>
            </div>
          ) : totalRegistros === 0 ? (
            <div className="py-12 px-4 text-center text-slate-500">
              <p className="text-sm font-medium">Nenhum profissional encontrado.</p>
              <p className="text-xs text-slate-400 mt-1">
                {search || filtroUnidade !== 'todas'
                  ? 'Ajuste os filtros de busca para encontrar registros.'
                  : 'Clique em "+ Novo Profissional" para cadastrar o primeiro.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4 w-28">Identificador</th>
                    <th className="py-3 px-4">Nome do Profissional</th>
                    <th className="py-3 px-4 w-36">Classe</th>
                    <th className="py-3 px-4 w-44">Classificação no Concurso</th>
                    <th className="py-3 px-4">Unidade Escolar</th>
                    <th className="py-3 px-4">Vagas Vinculadas</th>
                    <th className="py-3 px-4 w-20 text-center">Status</th>
                    <th className="py-3 px-4 w-28 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profissionaisPaginados.map((p) => {
                    const qtdVagas = p.vagas_vinculadas?.length || 0
                    const classeEfetiva = p.classe || 'Antigos na Rede'
                    const ehNovoNaRede = classeEfetiva === 'Novos na Rede'

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {p.codigo || '—'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{p.nome}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              ehNovoNaRede
                                ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 font-semibold text-xs'
                                : 'bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-100 font-semibold text-xs'
                            }
                            variant="outline"
                          >
                            {classeEfetiva}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {p.classificacao_concurso ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-violet-50 text-violet-800 border border-violet-200 rounded-sm px-2 py-0.5">
                              {p.classificacao_concurso}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{p.unidade_escolar?.nome || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {qtdVagas === 0 ? (
                            <span className="text-slate-400 italic text-xs">Nenhuma vaga</span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-xs"
                              >
                                {qtdVagas} {qtdVagas === 1 ? 'vaga' : 'vagas'}
                              </Badge>
                              {p.vagas_vinculadas?.slice(0, 2).map((vin) => (
                                <span
                                  key={vin.id}
                                  className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200 truncate max-w-[180px]"
                                  title={`${vin.vaga && determinarTipoVinculoVaga(vin.vaga) === 'FUNCAO' ? 'Função' : 'Cargo'}: ${vin.vaga?.funcao || 'Vaga'}${vin.titular ? ' (Titular)' : ' (Ocupante)'}`}
                                >
                                  {vin.vaga && determinarTipoVinculoVaga(vin.vaga) === 'FUNCAO'
                                    ? '[F] '
                                    : '[C] '}
                                  {vin.vaga?.funcao || 'Vaga'} {vin.titular ? '(Titular)' : ''}
                                </span>
                              ))}
                              {qtdVagas > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{qtdVagas - 2} mais
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.ativo ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[11px]">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-slate-500 text-[11px]">
                              Inativo
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenView(p)}
                              title="Visualizar detalhes"
                              className="h-8 w-8 text-slate-600 hover:text-slate-900"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {canEditProfissionais && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEdit(p)}
                                  title="Editar profissional"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingProfissional(p)}
                                  title="Excluir profissional"
                                  className="h-8 w-8 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação Padrão */}
          {totalRegistros > 0 && (
            <div className="border-t border-slate-200 p-4">
              <PaginacaoTabela
                paginaAtual={paginaAtual}
                totalRegistros={totalRegistros}
                itensPorPagina={itensPorPagina}
                onMudarPagina={setPaginaAtual}
                rotuloItens="profissionais"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação / Edição do Profissional */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveProfissional}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                {editingProfissional ? 'Editar Profissional' : 'Novo Profissional'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Preencha os dados do profissional e seus vínculos com as vagas da unidade escolar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Identificador automático */}
              {editingProfissional && (
                <div>
                  <Label className="text-xs text-slate-500">Identificador do Sistema</Label>
                  <div className="mt-1 font-mono font-bold text-sm text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 inline-block">
                    {editingProfissional.codigo || 'PRO-0000'}
                  </div>
                </div>
              )}

              {/* Nome do Profissional */}
              <div>
                <Label htmlFor="nome" className="text-xs font-semibold text-slate-700">
                  Nome do Profissional <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Nome completo do profissional"
                  className="mt-1"
                  required
                />
              </div>

              {/* Novos campos exigidos posicionados LOGO ABAIXO do Nome do Profissional, nesta ordem exata: */}
              {/* 1. Data de Admissão */}
              <div>
                <Label
                  htmlFor="data_admissao"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Data de Admissão <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="data_admissao"
                  type="date"
                  value={formDataAdmissao}
                  onChange={(e) => handleDataAdmissaoChange(e.target.value)}
                  className="mt-1 bg-white"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  A data de admissão determina automaticamente a classe do profissional no sistema.
                </p>
              </div>

              {/* 2. Data de Nascimento */}
              <div>
                <Label
                  htmlFor="data_nascimento"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Data de Nascimento <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formDataNascimento}
                  onChange={(e) => setFormDataNascimento(e.target.value)}
                  className="mt-1 bg-white"
                  required
                />
              </div>

              {/* 3. Classe do Profissional (logo após Data de Nascimento) */}
              <div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="classe"
                    className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Classe do Profissional <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    Classificação Automática
                  </span>
                </div>
                <Select
                  value={formClasse}
                  onValueChange={(val: ClasseProfissional) => setFormClasse(val)}
                >
                  <SelectTrigger id="classe" className="mt-1 bg-white">
                    <SelectValue placeholder="Selecione a classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Antigos na Rede">Antigos na Rede</SelectItem>
                    <SelectItem value="Novos na Rede">Novos na Rede</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {formDataAdmissao
                    ? `Calculada automaticamente: ano de admissão (${formDataAdmissao.split('-')[0] || '-'}) comparado ao ano vigente (${new Date().getFullYear()}).`
                    : 'Preenchida automaticamente ao selecionar a Data de Admissão.'}
                </p>
              </div>

              {/* 4. Classificação no Concurso (logo após a Classe do Profissional).
                  Obrigatória quando a Classe for "Novos na Rede" e opcional quando for "Antigos na Rede". */}
              <div>
                <Label
                  htmlFor="classificacao_concurso"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-violet-600" />
                  Classificação no Concurso{' '}
                  {formClasse === 'Novos na Rede' ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="text-slate-400 font-normal">(opcional)</span>
                  )}
                </Label>
                <Input
                  id="classificacao_concurso"
                  value={formClassificacaoConcurso}
                  onChange={(e) => setFormClassificacaoConcurso(e.target.value)}
                  placeholder="Ex.: 1º lugar, 15ª classificação..."
                  className="mt-1 bg-white"
                  required={formClasse === 'Novos na Rede'}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {formClasse === 'Novos na Rede'
                    ? 'Obrigatória para profissionais "Novos na Rede": informe a classificação obtida no concurso.'
                    : 'Opcional para profissionais "Antigos na Rede": preencha somente se houver classificação em concurso.'}
                </p>
              </div>

              {/* Unidade Escolar do Profissional */}
              <div>
                <Label htmlFor="unidade" className="text-xs font-semibold text-slate-700">
                  Unidade Escolar do Profissional <span className="text-rose-500">*</span>
                </Label>
                <Select value={formUnidadeId} onValueChange={handleUnidadeChange}>
                  <SelectTrigger id="unidade" className="mt-1 bg-white">
                    <SelectValue placeholder="Selecione a Unidade Escolar" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome} ({u.tipo_atendimento})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ao selecionar a unidade escolar, as vagas disponíveis daquela unidade serão
                  carregadas dinamicamente.
                </p>
              </div>

              {/* Status Ativo */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-slate-800">Cadastro Ativo</Label>
                  <p className="text-[11px] text-slate-500">
                    Define se o profissional está ativo na rede municipal.
                  </p>
                </div>
                <Switch checked={formAtivo} onCheckedChange={setFormAtivo} />
              </div>

              {/* Seção Dinâmica de Vínculo com Vagas */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      Vagas da Unidade Escolar
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Vincule o profissional às vagas existentes da unidade escolar selecionada.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdicionarVagaVinculo}
                    disabled={!formUnidadeId || carregandoVagasUnidade}
                    className="text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar outra vaga
                  </Button>
                </div>

                {!formUnidadeId ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    Selecione uma Unidade Escolar acima para visualizar e vincular vagas.
                  </div>
                ) : carregandoVagasUnidade ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    Carregando vagas da unidade escolar...
                  </div>
                ) : vagasDaUnidade.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                    A unidade escolar selecionada ainda não possui vagas geradas no ano letivo
                    atual. Você pode gerar vagas no menu "Cadastro de Vagas".
                  </div>
                ) : formVinculos.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center space-y-2">
                    <p className="text-xs text-slate-600">
                      Nenhuma vaga vinculada a este profissional no momento.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAdicionarVagaVinculo}
                      className="text-xs h-8 bg-white border-blue-300 text-blue-700"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Vincular Vaga Agora
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formVinculos.map((item, index) => {
                      const cargosPermitidos = getCargosPermitidosParaVaga(item.vaga_id)
                      // Vagas compatíveis com o tipo escolhido nesta linha (dependência dinâmica:
                      // só aparecem opções do cadastro escolhido — Cargo ou Função)
                      const vagasFiltradasPorTipo = vagasDaUnidade.filter(
                        (v) => determinarTipoVinculoVaga(v) === item.tipo_vinculo,
                      )
                      return (
                        <div
                          key={item.idTemp || index}
                          className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-3 relative"
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-800">
                              Vínculo de Vaga #{index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoverVinculo(index)}
                              className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 h-7 px-2 text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Remover vaga
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* 1ª pergunta: a vaga a vincular é de um CARGO ou de uma FUNÇÃO? */}
                            <div className="sm:col-span-2">
                              <Label className="text-xs font-semibold text-slate-700">
                                A vaga a vincular é de um Cargo ou de uma Função?{' '}
                                <span className="text-rose-500">*</span>
                              </Label>
                              <div className="mt-1 grid grid-cols-2 rounded-md border border-slate-200 bg-slate-100 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleAlterarTipoVinculoLinha(index, 'CARGO')}
                                  className={`flex items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    item.tipo_vinculo === 'CARGO'
                                      ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                                      : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  <Layers className="w-3.5 h-3.5" />
                                  Vaga de Cargo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAlterarTipoVinculoLinha(index, 'FUNCAO')}
                                  className={`flex items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    item.tipo_vinculo === 'FUNCAO'
                                      ? 'bg-white text-violet-700 shadow-sm border border-violet-200'
                                      : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  <Briefcase className="w-3.5 h-3.5" />
                                  Vaga de Função
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">
                                A escolha determina de qual cadastro virão as opções de vaga. Trocar
                                a escolha limpa a vaga selecionada.
                              </p>
                            </div>

                            {/* Seleção da Vaga — lista SOMENTE vagas do tipo escolhido acima */}
                            <div className="sm:col-span-2">
                              <Label className="text-xs font-medium text-slate-700">
                                Selecione a Vaga{' '}
                                {item.tipo_vinculo === 'CARGO' ? 'de Cargo' : 'de Função'}{' '}
                                <span className="text-rose-500">*</span>
                              </Label>
                              <Select
                                value={item.vaga_id}
                                onValueChange={(val) => handleAlterarVagaLinha(index, val)}
                              >
                                <SelectTrigger className="mt-1 bg-white">
                                  <SelectValue
                                    placeholder={
                                      item.tipo_vinculo === 'CARGO'
                                        ? 'Escolha uma vaga de cargo disponível...'
                                        : 'Escolha uma vaga de função disponível...'
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {vagasFiltradasPorTipo.map((vg) => {
                                    const jaOcupada =
                                      vg.status === 'OCUPADA' &&
                                      vg.servidor_id !== editingProfissional?.id
                                    return (
                                      <SelectItem key={vg.id} value={vg.id}>
                                        {vg.codigo ? `${vg.codigo} - ` : ''}
                                        {vg.funcao} (Nº {vg.numero_sequencial}
                                        {vg.periodo ? ` - ${vg.periodo}` : ''})
                                        {jaOcupada
                                          ? ` [Ocupada por ${vg.nome_ocupante || 'Outro'}]`
                                          : ' [Disponível]'}
                                      </SelectItem>
                                    )
                                  })}
                                  {vagasFiltradasPorTipo.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-slate-400 italic">
                                      {item.tipo_vinculo === 'CARGO'
                                        ? 'Nenhuma vaga de cargo disponível nesta unidade.'
                                        : 'Nenhuma vaga de função disponível nesta unidade.'}
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>

                              {/* Alerta contextual quando a vaga selecionada nesta linha já estiver ocupada por outro profissional */}
                              {(() => {
                                if (!item.vaga_id) return null
                                const vagaSel = vagasDaUnidade.find((v) => v.id === item.vaga_id)
                                if (
                                  vagaSel &&
                                  vagaSel.status === 'OCUPADA' &&
                                  Boolean(vagaSel.servidor_id) &&
                                  vagaSel.servidor_id !== editingProfissional?.id
                                ) {
                                  return (
                                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-md flex items-start gap-2 text-xs text-amber-900">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                      <div className="space-y-0.5">
                                        <p className="font-semibold text-amber-950">
                                          Vaga atualmente ocupada por:{' '}
                                          <span className="underline font-bold">
                                            {vagaSel.nome_ocupante || 'Outro profissional'}
                                          </span>
                                        </p>
                                        <p className="text-[11px] text-amber-800 leading-snug">
                                          A substituição exigirá sua confirmação ao salvar. O
                                          vínculo do ocupante anterior será removido e registrado na
                                          auditoria.
                                        </p>
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </div>

                            {/* Pergunta: É titular da vaga?
                                FUNÇÃO não tem titular, só ocupante: o switch fica desligado e desabilitado. */}
                            <div
                              className={`p-2.5 rounded-md border flex items-center justify-between ${
                                item.tipo_vinculo === 'FUNCAO'
                                  ? 'bg-slate-100 border-slate-200 opacity-75'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <Label className="text-xs font-semibold text-slate-800">
                                  Titular da Vaga?
                                </Label>
                                <p className="text-[10px] text-slate-500">
                                  {item.tipo_vinculo === 'FUNCAO'
                                    ? 'Indisponível: função não tem titular, só ocupante'
                                    : item.titular
                                      ? 'Sim, titular desta vaga'
                                      : 'Não, suplente/outra'}
                                </p>
                              </div>
                              <Switch
                                checked={item.tipo_vinculo === 'FUNCAO' ? false : item.titular}
                                disabled={item.tipo_vinculo === 'FUNCAO'}
                                onCheckedChange={(val) => handleAlterarTitularLinha(index, val)}
                              />
                            </div>

                            {/* Ocupação / Cargo — apenas para vínculos de CARGO */}
                            {item.tipo_vinculo === 'CARGO' && (
                              <div className="space-y-1">
                                <Label className="text-xs font-medium text-slate-700">
                                  Ocupação (Cargo ocupado na vaga)
                                </Label>
                                <Select
                                  value={item.cargo_id || 'nenhum'}
                                  onValueChange={(val) =>
                                    handleAlterarCargoLinha(index, val === 'nenhum' ? '' : val)
                                  }
                                >
                                  <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione o cargo..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="nenhum">Nenhum cargo específico</SelectItem>
                                    {cargosPermitidos.map((cg) => (
                                      <SelectItem key={cg.id} value={cg.id}>
                                        {cg.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-[10px] text-slate-400">
                                  Cargos compatíveis com a função da vaga na Configuração de RH.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenDialog(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Profissional'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização (Detalhe) */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Detalhes do Profissional
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Informações cadastrais e vínculos de vagas registradas no sistema.
            </DialogDescription>
          </DialogHeader>

          {viewingProfissional && (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Identificador
                  </span>
                  <span className="font-mono font-bold text-blue-700 text-sm">
                    {viewingProfissional.codigo || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Status
                  </span>
                  <Badge
                    className={
                      viewingProfissional.ativo
                        ? 'bg-emerald-600 text-white mt-0.5'
                        : 'bg-slate-200 text-slate-700 mt-0.5'
                    }
                  >
                    {viewingProfissional.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Nome Completo
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {viewingProfissional.nome}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Data de Admissão
                  </span>
                  <span className="font-medium text-slate-800 text-sm">
                    {viewingProfissional.data_admissao
                      ? new Date(
                          `${viewingProfissional.data_admissao}T00:00:00`,
                        ).toLocaleDateString('pt-BR')
                      : 'Não informada'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Data de Nascimento
                  </span>
                  <span className="font-medium text-slate-800 text-sm">
                    {viewingProfissional.data_nascimento
                      ? new Date(
                          `${viewingProfissional.data_nascimento}T00:00:00`,
                        ).toLocaleDateString('pt-BR')
                      : 'Não informada'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Classe do Profissional
                  </span>
                  <Badge
                    className={
                      (viewingProfissional.classe || 'Antigos na Rede') === 'Novos na Rede'
                        ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold text-xs mt-1'
                        : 'bg-sky-100 text-sky-800 border-sky-300 font-semibold text-xs mt-1'
                    }
                    variant="outline"
                  >
                    {viewingProfissional.classe || 'Antigos na Rede'}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Classificação no Concurso
                  </span>
                  {viewingProfissional.classificacao_concurso ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-violet-50 text-violet-800 border border-violet-200 rounded-sm px-2 py-0.5 mt-1">
                      <GraduationCap className="w-3 h-3" />
                      {viewingProfissional.classificacao_concurso}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Não informada</span>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Unidade Escolar
                  </span>
                  <span className="font-medium text-slate-800">
                    {viewingProfissional.unidade_escolar?.nome || '—'}
                  </span>
                </div>
              </div>

              {/* Vínculos com Vagas */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Vagas Vinculadas ({viewingProfissional.vagas_vinculadas?.length || 0})
                </span>

                {!viewingProfissional.vagas_vinculadas ||
                viewingProfissional.vagas_vinculadas.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-md border border-slate-200">
                    Nenhuma vaga vinculada a este profissional.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {viewingProfissional.vagas_vinculadas.map((v, idx) => (
                      <div
                        key={v.id || idx}
                        className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                            {v.vaga?.funcao || 'Função não identificada'}
                            {v.vaga?.codigo && (
                              <span className="font-mono text-[11px] text-slate-500 font-normal">
                                ({v.vaga.codigo})
                              </span>
                            )}
                          </span>

                          <Badge
                            className={
                              v.vaga && determinarTipoVinculoVaga(v.vaga) === 'FUNCAO'
                                ? 'bg-violet-100 text-violet-800 border-violet-200 text-[10px]'
                                : v.titular
                                  ? 'bg-blue-100 text-blue-800 border-blue-200 text-[10px]'
                                  : 'bg-slate-100 text-slate-700 text-[10px]'
                            }
                          >
                            {v.vaga && determinarTipoVinculoVaga(v.vaga) === 'FUNCAO'
                              ? 'Função · Ocupante'
                              : v.titular
                                ? 'Cargo · Titular'
                                : 'Cargo · Não Titular'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Ocupação/Cargo</span>
                            <span className="font-medium text-slate-800">
                              {v.cargo?.nome || 'Não definido'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">
                              Período da Vaga
                            </span>
                            <span>{v.vaga?.periodo || '—'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenViewDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Ajuda e Regras */}
      <Dialog open={openAjuda} onOpenChange={setOpenAjuda}>
        <DialogContent className="p-6 rounded-2xl sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2 text-[#0B2545]">
              <div className="p-2 rounded-lg bg-blue-50">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Ajuda e Regras — Cadastro de Profissionais
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600">
              Orientações sobre os atributos do profissional, a regra de classificação automática da
              rede e o vínculo com vagas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-sm text-slate-700 leading-relaxed">
            {/* Bloco 1: Novos Atributos e Obrigatoriedade */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 space-y-2">
              <h4 className="font-semibold text-blue-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700" /> Atributos Cadastrais Obrigatórios
              </h4>
              <p className="text-xs text-blue-900 font-medium">
                O formulário de cadastro contempla os seguintes campos no bloco superior de
                identificação:
              </p>
              <ol className="text-xs list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
                <li>
                  <strong>Identificador do Profissional (Automático):</strong> Código sequencial
                  gerado automaticamente pelo sistema (ex: <code>PRO-0001</code>), somente leitura.
                </li>
                <li>
                  <strong>Nome do Profissional:</strong> Nome completo do servidor/profissional
                  (obrigatório).
                </li>
                <li>
                  <strong>Data de Admissão:</strong> Data de ingresso do profissional na rede
                  municipal de ensino (obrigatório).
                </li>
                <li>
                  <strong>Data de Nascimento:</strong> Data de nascimento do profissional
                  (obrigatório).
                </li>
                <li>
                  <strong>Classe do Profissional:</strong> Opção entre <em>"Antigos na Rede"</em> e{' '}
                  <em>"Novos na Rede"</em> (obrigatório), posicionada logo após a Data de
                  Nascimento.
                </li>
                <li>
                  <strong>Classificação no Concurso:</strong> Campo posicionado logo após a Classe
                  do Profissional, com obrigatoriedade <strong>condicional</strong>:
                  <ul className="list-disc list-inside pl-3 mt-1 space-y-0.5">
                    <li>
                      Classe <em>"Antigos na Rede"</em> → campo <strong>opcional</strong>.
                    </li>
                    <li>
                      Classe <em>"Novos na Rede"</em> → campo <strong>obrigatório</strong> (o
                      salvamento é bloqueado com aviso amigável se ficar vazio). A obrigatoriedade
                      se reajusta dinamicamente quando a classe muda, inclusive pela classificação
                      automática da Data de Admissão; mudar a classe para "Antigos na Rede" não
                      apaga o valor digitado, apenas deixa de exigi-lo.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Unidade Escolar:</strong> Escola ou CMEI de lotação do profissional
                  (obrigatório).
                </li>
              </ol>
            </div>

            {/* Bloco 2: Regra de Classificação Automática pela Data de Admissão */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
              <h4 className="font-semibold text-amber-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" /> Regra de Classificação Automática da
                Classe
              </h4>
              <p className="text-xs text-amber-900 font-medium">
                A classe do profissional é determinada automaticamente a partir do ano da{' '}
                <strong>Data de Admissão</strong> em comparação ao ano vigente (
                {new Date().getFullYear()}):
              </p>
              <ul className="text-xs list-disc list-inside space-y-1.5 text-slate-700 pl-1">
                <li>
                  <strong>Antigos na Rede:</strong> Profissionais admitidos em anos{' '}
                  <strong>ANTERIORES</strong> ao ano vigente (ano da admissão &lt;{' '}
                  {new Date().getFullYear()}).
                </li>
                <li>
                  <strong>Novos na Rede:</strong> Profissionais admitidos{' '}
                  <strong>NO ANO VIGENTE</strong> (ano da admissão = {new Date().getFullYear()}).
                </li>
                <li>
                  <strong>Registros antigos sem data de admissão:</strong> Profissionais previamente
                  cadastrados sem data de admissão são classificados por padrão como{' '}
                  <em>"Antigos na Rede"</em>, garantindo que nada quebre e preservando a
                  continuidade operacional.
                </li>
                <li>
                  <strong>Derivação ao salvar:</strong> Ao preencher a data de admissão no
                  formulário, a classe é atualizada automaticamente, sendo revalidada e gravada de
                  forma consistente no salvamento.
                </li>
              </ul>
            </div>

            {/* Bloco 3: Vagas Já Ocupadas e Confirmação de Substituição */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 space-y-2">
              <h4 className="font-semibold text-amber-950 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" /> Tratamento de Vagas Já Ocupadas
              </h4>
              <p className="text-xs text-amber-900 font-medium">
                O sistema impede substituições silenciosas e protege a integridade dos vínculos:
              </p>
              <ul className="text-xs list-disc list-inside space-y-1.5 text-slate-700 pl-1">
                <li>
                  <strong>Alerta imediato:</strong> Ao selecionar uma vaga que já esteja ocupada por
                  outro profissional, o sistema emite um alerta claro informando o nome do ocupante
                  atual.
                </li>
                <li>
                  <strong>Confirmação explícita:</strong> Ao salvar o cadastro, é exibido um modal
                  de confirmação nomeando o ocupante anterior e o novo profissional. A substituição
                  só ocorre se confirmada expressamente pelo usuário; caso cancele, nada é alterado.
                </li>
                <li>
                  <strong>Limpeza de vínculo e integridade:</strong> Após confirmada a substituição,
                  o vínculo anterior é removido para que não fique órfão, a vaga recebe o novo
                  profissional como ocupante oficial (status <em>OCUPADA</em>) e a operação é
                  detalhada na Auditoria.
                </li>
              </ul>
            </div>

            {/* Bloco 3.1: Escolha Cargo ou Função antes da vaga */}
            <div className="p-4 rounded-xl border border-violet-200 bg-violet-50/60 space-y-2">
              <h4 className="font-semibold text-violet-950 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-violet-700" /> Vínculo de Vagas: Cargo ou Função
              </h4>
              <p className="text-xs text-violet-900 font-medium">
                Ao adicionar uma vaga da unidade escolar, <strong>antes de escolher a vaga</strong>{' '}
                o sistema pergunta se a vaga a vincular é de um <strong>Cargo</strong> ou de uma{' '}
                <strong>Função</strong>:
              </p>
              <ul className="text-xs list-disc list-inside space-y-1.5 text-slate-700 pl-1">
                <li>
                  <strong>Vaga de Cargo:</strong> o combobox lista somente as vagas geradas a partir
                  das linhas de <strong>Cargo</strong> da Configuração de Vagas por Nível.
                </li>
                <li>
                  <strong>Vaga de Função:</strong> o combobox lista somente as vagas geradas a
                  partir das linhas de <strong>Função</strong>.
                </li>
                <li>
                  <strong>Dependência dinâmica:</strong> trocar a escolha limpa a vaga selecionada e
                  recarrega as opções do cadastro correspondente — nunca é possível misturar vagas
                  de cargo com vínculo de função (e vice-versa).
                </li>
                <li>
                  <strong>Titularidade:</strong> se a escolha for <em>Função</em>, a marcação de
                  titularidade fica <strong>sempre desligada e desabilitada</strong>, porque função
                  não tem titular — <strong>só ocupante</strong>. Se a escolha for <em>Cargo</em>, a
                  titularidade continua marcável como antes (Titular/Suplente).
                </li>
                <li>
                  O cargo ocupado na vaga só é solicitado para vínculos de <strong>Cargo</strong>.
                </li>
              </ul>
            </div>

            {/* Bloco 4: Vínculos com Vagas e Rastreabilidade */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-2">
              <h4 className="font-semibold text-emerald-950 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600" /> Vínculo de Vagas e Auditoria
              </h4>
              <ul className="text-xs list-disc list-inside space-y-1 text-slate-700 pl-1">
                <li>
                  O profissional pode ser vinculado a uma ou mais vagas da sua unidade escolar, com
                  definição de titularidade (apenas para vagas de <strong>Cargo</strong>) e cargo
                  ocupado.
                </li>
                <li>
                  A listagem e o detalhe indicam se cada vaga vinculada é de <em>Cargo</em> ou de{' '}
                  <em>Função</em>; vínculos de função aparecem sempre como <strong>Ocupante</strong>
                  .
                </li>
                <li>
                  Ao salvar a alocação, a vaga fica com o status <strong>OCUPADA</strong>, nome do
                  ocupante preenchido e cargo gravado (quando aplicável).
                </li>
                <li>
                  Ao desvincular uma vaga ou excluir o profissional, a vaga retorna automaticamente
                  ao status <strong>ABERTA</strong>, com o nome do ocupante limpo e cargo
                  desmarcado.
                </li>
                <li>
                  Todas as operações de criação, edição, substituição e exclusão registram na{' '}
                  <strong>Auditoria</strong> os valores completos — inclusive a{' '}
                  <strong>Classificação no Concurso</strong> (valor antigo e novo) e o{' '}
                  <strong>tipo da vaga (Cargo/Função)</strong> — garantindo rastreabilidade
                  histórica.
                </li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 mt-2">
            <Button
              type="button"
              onClick={() => setOpenAjuda(false)}
              className="bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação Explícita de Substituição de Ocupante de Vaga */}
      <AlertDialog
        open={modalSubstituicaoOpen}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setModalSubstituicaoOpen(false)
          }
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Confirmação de Substituição de Ocupante
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-xs text-slate-700 space-y-3 pt-2">
                <p>
                  A alocação de <strong>"{formNome.trim()}"</strong> inclui vaga(s) que já se
                  encontram <strong>ocupadas por outro profissional</strong>:
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {conflitosSubstituicao.map((conf, idx) => (
                    <div
                      key={conf.vagaId || idx}
                      className="p-3 bg-amber-50/80 rounded-lg border border-amber-300 text-xs space-y-1"
                    >
                      <div className="font-semibold text-amber-950">
                        {conf.vagaCodigo ? `${conf.vagaCodigo} - ` : ''}
                        {conf.vagaFuncao}
                      </div>
                      <div className="text-slate-700 flex items-center justify-between">
                        <span>Ocupante anterior:</span>
                        <span className="font-bold text-rose-700">{conf.ocupanteAtualNome}</span>
                      </div>
                      <div className="text-slate-700 flex items-center justify-between">
                        <span>Novo ocupante:</span>
                        <span className="font-bold text-emerald-700">{formNome.trim()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 bg-slate-100 rounded-md border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">O que acontecerá ao confirmar:</p>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    <li>O vínculo do profissional anterior com esta vaga será removido.</li>
                    <li>
                      A vaga passará a ter o nome de <strong>"{formNome.trim()}"</strong> como
                      ocupante oficial.
                    </li>
                    <li>A substituição será registrada no histórico da Auditoria.</li>
                  </ul>
                  <p className="text-slate-500 italic pt-1">
                    Se você cancelar, nenhuma alteração será salva no sistema.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={saving}
              onClick={() => {
                setModalSubstituicaoOpen(false)
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarSubstituicao}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Substituindo...
                </>
              ) : (
                'Confirmar e Substituir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={Boolean(deletingProfissional)}
        onOpenChange={(open) => !open && setDeletingProfissional(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Excluir Profissional?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 space-y-2">
              <p>
                Tem certeza que deseja excluir o cadastro do profissional{' '}
                <strong>"{deletingProfissional?.nome}"</strong> ({deletingProfissional?.codigo})?
              </p>
              <p className="text-rose-700 bg-rose-50 p-2.5 rounded-md border border-rose-200">
                Atenção: todas as vagas ocupadas por este profissional serão automaticamente
                desvinculadas e retornarão ao status <strong>ABERTA</strong>.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {saving ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
