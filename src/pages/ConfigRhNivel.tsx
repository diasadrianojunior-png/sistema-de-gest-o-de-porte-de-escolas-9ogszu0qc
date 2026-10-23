import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'
import {
  getConfiguracoesRh,
  getConfiguracaoRhCompleta,
  salvarConfiguracaoRhCabecalho,
  alterarStatusConfiguracaoRh,
  duplicarConfiguracaoRh,
  salvarEstruturaCompletaConfiguracaoRh,
  deleteConfiguracaoRh,
} from '@/services/configuracao-rh'
import {
  calcularVagasPorNivel,
  validarContiguidadeNiveis,
  ResultadoCalculoVagas,
} from '@/services/configuracao-rh-calculo'
import { getFuncoes, getCargos } from '@/services/apoio'
import {
  ConfiguracaoRh,
  ConfiguracaoRhCompleta,
  ConfiguracaoRhNivel,
  ConfiguracaoRhLinha,
  StatusConfiguracaoRh,
  BaseCalculoRh,
  ModalidadeRhVaga,
  CondicaoLinhaCargo,
  Funcao,
  Cargo,
} from '@/types/gestao-escolar'

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Copy,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  MoveUp,
  MoveDown,
  Info,
  Layers,
  Sparkles,
  Save,
  FileCheck,
  Calendar,
  Building2,
  Calculator,
  ShieldAlert,
} from 'lucide-react'

// Representação editável de uma linha da grade
interface LinhaEditavel {
  tempId: string
  id?: string
  funcao_id: string
  ordem: number
  base_calculo: BaseCalculoRh
  etapas_filtro: string[]
  observacao: string
  cargos: Array<{
    cargo_id: string
    condicao: CondicaoLinhaCargo
  }>
}

// Representação editável de um nível
interface NivelEditavel {
  tempId: string
  id?: string
  codigo_nivel: string
  ordem: number
  min_alunos: number
  max_alunos: number | null
  observacao: string
}

// Representação editável de uma célula da matriz (linhaIndex × nivelIndex)
interface CelulaVagaEditavel {
  quantidade: number
  modalidade: ModalidadeRhVaga
  dias_semana: number | null
}

const OPCOES_TIPO_ATENDIMENTO = [
  'Ensino Fundamental e Educação Infantil (20h)',
  'Educação Infantil (40h)',
]

const OPCOES_BASE_CALCULO: Array<{ value: BaseCalculoRh; label: string; desc: string }> = [
  { value: 'POR_ESCOLA', label: 'Por Escola (fixo)', desc: '1 multiplicador' },
  { value: 'POR_PERIODO', label: 'Por Período', desc: 'multiplica pelo nº de turnos/períodos' },
  { value: 'POR_TURMA', label: 'Por Turma (total)', desc: 'multiplica pelo total de turmas' },
  {
    value: 'POR_TURMA_ETAPA',
    label: 'Por Turma e Etapa',
    desc: 'multiplica apenas pelas etapas filtradas',
  },
]

const OPCOES_CONDICAO: Array<{ value: CondicaoLinhaCargo; label: string }> = [
  { value: 'NENHUMA', label: 'Sem condição restritiva' },
  { value: 'READAPTADO_COMPATIVEL_LAUDO', label: 'Readaptado compatível com laudo' },
  { value: 'AUTORIZACAO_SEMED', label: 'Exige autorização SEMED' },
]

export default function ConfigRhNivel() {
  const { user, canEdit } = useAuth()
  const podeEditar = canEdit('configuracao_rh')

  // Listagens de suporte
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoRh[]>([])
  const [funcoesList, setFuncoesList] = useState<Funcao[]>([])
  const [cargosList, setCargosList] = useState<Cargo[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Configuração selecionada atualmente
  const [configuracaoAtivaId, setConfiguracaoAtivaId] = useState<string>('')
  const [configuracaoAtual, setConfiguracaoAtual] = useState<ConfiguracaoRhCompleta | null>(null)

  // Estado editável da grade
  const [niveisEditaveis, setNiveisEditaveis] = useState<NivelEditavel[]>([])
  const [linhasEditaveis, setLinhasEditaveis] = useState<LinhaEditavel[]>([])
  const [matrizVagas, setMatrizVagas] = useState<Record<string, CelulaVagaEditavel>>({})
  const [observacaoCabecalho, setObservacaoCabecalho] = useState('')

  // Dialogs de controle
  const [dialogNovaCfgAberto, setDialogNovaCfgAberto] = useState(false)
  const [novaCfgTipo, setNovaCfgTipo] = useState(OPCOES_TIPO_ATENDIMENTO[0])
  const [novaCfgAno, setNovaCfgAno] = useState(new Date().getFullYear())

  const [dialogDuplicarAberto, setDialogDuplicarAberto] = useState(false)
  const [duplicarAno, setDuplicarAno] = useState(new Date().getFullYear() + 1)

  const [dialogEditarCelulaAberto, setDialogEditarCelulaAberto] = useState(false)
  const [celulaEmEdicao, setCelulaEmEdicao] = useState<{
    linhaIndex: number
    nivelIndex: number
    linhaNome: string
    nivelCodigo: string
    quantidade: number
    modalidade: ModalidadeRhVaga
    dias_semana: number | null
  } | null>(null)

  const [dialogEditarCargosAberto, setDialogEditarCargosAberto] = useState(false)
  const [linhaEmEdicaoCargos, setLinhaEmEdicaoCargos] = useState<{
    linhaIndex: number
    funcaoNome: string
    cargos: Array<{ cargo_id: string; condicao: CondicaoLinhaCargo }>
  } | null>(null)

  const [dialogExcluirAberto, setDialogExcluirAberto] = useState(false)

  // Estados da aba "Simular"
  const [simAlunos, setSimAlunos] = useState<number>(323)
  const [simPeriodos, setSimPeriodos] = useState<number>(2)
  const [simTurmasEtapas, setSimTurmasEtapas] = useState<Array<{ etapa: string; turmas: number }>>([
    { etapa: 'Ensino Fundamental', turmas: 14 },
  ])
  const [resultadoSimulacao, setResultadoSimulacao] = useState<ResultadoCalculoVagas | null>(null)

  // Carregar dados iniciais
  const carregarDadosIniciais = useCallback(async (preferId?: string) => {
    try {
      setLoading(true)
      const [cfgs, fnList, crgList] = await Promise.all([
        getConfiguracoesRh(),
        getFuncoes(),
        getCargos(),
      ])

      setConfiguracoes(cfgs)
      setFuncoesList(fnList || [])
      setCargosList(crgList || [])

      // Escolher configuração ativa
      let idAlvo = preferId
      if (!idAlvo && cfgs.length > 0) {
        // Preferência para 2026 20h
        const padrao2026 = cfgs.find(
          (c) => c.ano_letivo === 2026 && c.tipo_atendimento.includes('20h'),
        )
        idAlvo = padrao2026 ? padrao2026.id : cfgs[0].id
      }

      if (idAlvo) {
        await carregarConfiguracaoCompleta(idAlvo)
      } else {
        setConfiguracaoAtual(null)
      }
    } catch (err: any) {
      console.error('Erro ao carregar configurações de RH:', err)
      toast({
        title: 'Erro ao carregar configurações de RH',
        description: err.message || 'Verifique sua conexão.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDadosIniciais()
  }, [carregarDadosIniciais])

  // Carrega configuração completa e popula estados locais
  const carregarConfiguracaoCompleta = async (id: string) => {
    try {
      const completa = await getConfiguracaoRhCompleta(id)
      if (!completa) return

      setConfiguracaoAtivaId(id)
      setConfiguracaoAtual(completa)
      setObservacaoCabecalho(completa.observacao || '')

      // Mapear níveis
      const niveisMapeados: NivelEditavel[] = (completa.niveis || []).map((n) => ({
        tempId: n.id,
        id: n.id,
        codigo_nivel: n.codigo_nivel,
        ordem: n.ordem,
        min_alunos: n.min_alunos,
        max_alunos: n.max_alunos,
        observacao: n.observacao || '',
      }))
      setNiveisEditaveis(niveisMapeados)

      // Mapear linhas
      const linhasMapeadas: LinhaEditavel[] = (completa.linhas || []).map((l) => ({
        tempId: l.id,
        id: l.id,
        funcao_id: l.funcao_id,
        ordem: l.ordem,
        base_calculo: l.base_calculo,
        etapas_filtro: l.etapas_filtro || [],
        observacao: l.observacao || '',
        cargos: (l.cargos || []).map((c) => ({
          cargo_id: c.cargo_id,
          condicao: c.condicao,
        })),
      }))
      setLinhasEditaveis(linhasMapeadas)

      // Mapear matriz de vagas (chave: `linha_${lIdx}_nivel_${nIdx}`)
      const novoMapa: Record<string, CelulaVagaEditavel> = {}
      for (let lIdx = 0; lIdx < linhasMapeadas.length; lIdx++) {
        const linha = linhasMapeadas[lIdx]
        for (let nIdx = 0; nIdx < niveisMapeados.length; nIdx++) {
          const nivel = niveisMapeados[nIdx]
          const vaga = (completa.vagas || []).find(
            (v) => v.linha_id === linha.id && v.nivel_id === nivel.id,
          )

          novoMapa[`${lIdx}_${nIdx}`] = {
            quantidade: vaga ? vaga.quantidade : 0,
            modalidade: vaga ? vaga.modalidade : 'FIXO',
            dias_semana: vaga?.dias_semana ?? null,
          }
        }
      }
      setMatrizVagas(novoMapa)

      // Atualizar preset de simulação baseado no tipo
      if (completa.tipo_atendimento.includes('40h')) {
        setSimAlunos(148)
        setSimPeriodos(1)
        setSimTurmasEtapas([
          { etapa: 'INFANTIL_I', turmas: 1 },
          { etapa: 'INFANTIL_II', turmas: 2 },
          { etapa: 'Outras turmas', turmas: 6 },
        ])
      } else {
        setSimAlunos(323)
        setSimPeriodos(2)
        setSimTurmasEtapas([{ etapa: 'Ensino Fundamental', turmas: 14 }])
      }
      setResultadoSimulacao(null)
    } catch (err: any) {
      console.error('Erro ao carregar detalhes da configuração:', err)
      toast({
        title: 'Erro ao abrir configuração',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Validação dinâmica das faixas de alunos em tempo real
  const validacaoFaixas = useMemo(() => {
    return validarContiguidadeNiveis(niveisEditaveis)
  }, [niveisEditaveis])

  // Formatação de exibição da célula da grade
  const formatarCelula = (celula?: CelulaVagaEditavel): string => {
    if (!celula || celula.quantidade === 0) return '-'
    if (celula.modalidade === 'ITINERANTE') {
      if (celula.dias_semana) {
        return `${celula.quantidade} Itin. (${celula.dias_semana}x sem.)`
      }
      return `${celula.quantidade} Itin.`
    }
    return `${celula.quantidade}`
  }

  // Ações de Níveis
  const handleAdicionarNivel = () => {
    setNiveisEditaveis((prev) => {
      const ultimo = prev[prev.length - 1]
      let proximoMin = 0
      let proximoCodigo = 'I'

      if (ultimo) {
        proximoMin = ultimo.max_alunos !== null ? ultimo.max_alunos + 1 : ultimo.min_alunos + 100
        // Sugestão de código
        const codigosRomanos = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
        const codigosLetras = ['A', 'B', 'C', 'D', 'E', 'F']
        const idxRomano = codigosRomanos.indexOf(ultimo.codigo_nivel)
        const idxLetra = codigosLetras.indexOf(ultimo.codigo_nivel)

        if (idxRomano >= 0 && idxRomano < codigosRomanos.length - 1) {
          proximoCodigo = codigosRomanos[idxRomano + 1]
        } else if (idxLetra >= 0 && idxLetra < codigosLetras.length - 1) {
          proximoCodigo = codigosLetras[idxLetra + 1]
        } else {
          proximoCodigo = `N${prev.length + 1}`
        }
      }

      const novoNivel: NivelEditavel = {
        tempId: `nivel_${Date.now()}`,
        codigo_nivel: proximoCodigo,
        ordem: prev.length + 1,
        min_alunos: proximoMin,
        max_alunos: null,
        observacao: '',
      }

      return [...prev, novoNivel]
    })
  }

  const handleRemoverNivel = (index: number) => {
    if (niveisEditaveis.length <= 1) {
      toast({
        title: 'Operação não permitida',
        description: 'A configuração deve conter pelo menos um nível.',
        variant: 'destructive',
      })
      return
    }

    setNiveisEditaveis((prev) => prev.filter((_, i) => i !== index))

    // Reorganizar matriz de vagas
    setMatrizVagas((prev) => {
      const novo: Record<string, CelulaVagaEditavel> = {}
      for (let l = 0; l < linhasEditaveis.length; l++) {
        let novoNIdx = 0
        for (let n = 0; n < niveisEditaveis.length; n++) {
          if (n === index) continue
          const cel = prev[`${l}_${n}`]
          if (cel) {
            novo[`${l}_${novoNIdx}`] = cel
          }
          novoNIdx++
        }
      }
      return novo
    })
  }

  const handleAtualizarNivel = (index: number, campo: keyof NivelEditavel, valor: any) => {
    setNiveisEditaveis((prev) => {
      const novos = [...prev]
      novos[index] = { ...novos[index], [campo]: valor }
      return novos
    })
  }

  // Ações de Linhas
  const handleAdicionarLinha = () => {
    if (funcoesList.length === 0) return
    const primeiraFuncao = funcoesList[0]

    const novaLinha: LinhaEditavel = {
      tempId: `linha_${Date.now()}`,
      funcao_id: primeiraFuncao.id,
      ordem: linhasEditaveis.length + 1,
      base_calculo: 'POR_ESCOLA',
      etapas_filtro: [],
      observacao: '',
      cargos: [],
    }

    const novaLinhaIndex = linhasEditaveis.length
    setLinhasEditaveis((prev) => [...prev, novaLinha])

    // Preencher células default para a nova linha
    setMatrizVagas((prev) => {
      const novo = { ...prev }
      for (let nIdx = 0; nIdx < niveisEditaveis.length; nIdx++) {
        novo[`${novaLinhaIndex}_${nIdx}`] = {
          quantidade: 1,
          modalidade: 'FIXO',
          dias_semana: null,
        }
      }
      return novo
    })
  }

  const handleRemoverLinha = (index: number) => {
    if (linhasEditaveis.length <= 1) {
      toast({
        title: 'Operação não permitida',
        description: 'A configuração deve conter pelo menos uma linha de função.',
        variant: 'destructive',
      })
      return
    }

    setLinhasEditaveis((prev) => prev.filter((_, i) => i !== index))

    // Reorganizar matriz de vagas
    setMatrizVagas((prev) => {
      const novo: Record<string, CelulaVagaEditavel> = {}
      let novoLIdx = 0
      for (let l = 0; l < linhasEditaveis.length; l++) {
        if (l === index) continue
        for (let n = 0; n < niveisEditaveis.length; n++) {
          const cel = prev[`${l}_${n}`]
          if (cel) {
            novo[`${novoLIdx}_${n}`] = cel
          }
        }
        novoLIdx++
      }
      return novo
    })
  }

  const handleMoverLinha = (index: number, direcao: 'cima' | 'baixo') => {
    const destino = direcao === 'cima' ? index - 1 : index + 1
    if (destino < 0 || destino >= linhasEditaveis.length) return

    setLinhasEditaveis((prev) => {
      const copia = [...prev]
      const temp = copia[index]
      copia[index] = copia[destino]
      copia[destino] = temp
      return copia
    })

    // Trocar na matriz de vagas
    setMatrizVagas((prev) => {
      const novo = { ...prev }
      for (let n = 0; n < niveisEditaveis.length; n++) {
        const celOrigem = prev[`${index}_${n}`]
        const celDestino = prev[`${destino}_${n}`]
        if (celOrigem && celDestino) {
          novo[`${index}_${n}`] = celDestino
          novo[`${destino}_${n}`] = celOrigem
        }
      }
      return novo
    })
  }

  const handleAtualizarLinha = (index: number, campo: keyof LinhaEditavel, valor: any) => {
    setLinhasEditaveis((prev) => {
      const novos = [...prev]
      novos[index] = { ...novos[index], [campo]: valor }
      return novos
    })
  }

  // Abertura do modal de edição da célula
  const handleAbrirEdicaoCelula = (lIdx: number, nIdx: number) => {
    if (!podeEditar) return
    const linha = linhasEditaveis[lIdx]
    const nivel = niveisEditaveis[nIdx]
    const funcaoObj = funcoesList.find((f) => f.id === linha.funcao_id)
    const celula = matrizVagas[`${lIdx}_${nIdx}`] || {
      quantidade: 0,
      modalidade: 'FIXO',
      dias_semana: null,
    }

    setCelulaEmEdicao({
      linhaIndex: lIdx,
      nivelIndex: nIdx,
      linhaNome: funcaoObj?.nome || 'Função',
      nivelCodigo: nivel.codigo_nivel,
      quantidade: celula.quantidade,
      modalidade: celula.modalidade,
      dias_semana: celula.dias_semana,
    })
    setDialogEditarCelulaAberto(true)
  }

  const handleSalvarCelula = () => {
    if (!celulaEmEdicao) return
    const { linhaIndex, nivelIndex, quantidade, modalidade, dias_semana } = celulaEmEdicao

    setMatrizVagas((prev) => ({
      ...prev,
      [`${linhaIndex}_${nivelIndex}`]: {
        quantidade: Math.max(0, Number(quantidade) || 0),
        modalidade,
        dias_semana: modalidade === 'ITINERANTE' ? dias_semana : null,
      },
    }))

    setDialogEditarCelulaAberto(false)
    setCelulaEmEdicao(null)
  }

  // Abertura do modal de edição de cargos da linha
  const handleAbrirEdicaoCargos = (linhaIndex: number) => {
    const linha = linhasEditaveis[linhaIndex]
    const funcaoObj = funcoesList.find((f) => f.id === linha.funcao_id)

    setLinhaEmEdicaoCargos({
      linhaIndex,
      funcaoNome: funcaoObj?.nome || 'Função',
      cargos: [...(linha.cargos || [])],
    })
    setDialogEditarCargosAberto(true)
  }

  const handleSalvarCargosLinha = () => {
    if (!linhaEmEdicaoCargos) return
    setLinhasEditaveis((prev) => {
      const novos = [...prev]
      novos[linhaEmEdicaoCargos.linhaIndex] = {
        ...novos[linhaEmEdicaoCargos.linhaIndex],
        cargos: linhaEmEdicaoCargos.cargos,
      }
      return novos
    })
    setDialogEditarCargosAberto(false)
    setLinhaEmEdicaoCargos(null)
  }

  // SALVAR toda a grade
  const handleSalvarEstrutura = async () => {
    if (!configuracaoAtual) return

    if (!validacaoFaixas.valido) {
      toast({
        title: 'Bloqueio de Validação de Faixas',
        description: `Não é possível salvar com faixas inconsistentes:\n${validacaoFaixas.erros.join('\n')}`,
        variant: 'destructive',
      })
      return
    }

    try {
      setSalvando(true)

      // 1. Atualizar observação no cabeçalho se mudou
      if (observacaoCabecalho !== configuracaoAtual.observacao) {
        await salvarConfiguracaoRhCabecalho(
          {
            id: configuracaoAtual.id,
            tipo_atendimento: configuracaoAtual.tipo_atendimento,
            ano_letivo: configuracaoAtual.ano_letivo,
            status: configuracaoAtual.status,
            observacao: observacaoCabecalho,
          },
          user?.email || 'Sistema',
          user?.email || 'sistema@local',
        )
      }

      // 2. Montar payload estrutural
      const vagasPayload: Array<{
        linhaIndex: number
        nivelIndex: number
        quantidade: number
        modalidade: any
        dias_semana?: number | null
      }> = []

      for (let l = 0; l < linhasEditaveis.length; l++) {
        for (let n = 0; n < niveisEditaveis.length; n++) {
          const cel = matrizVagas[`${l}_${n}`] || {
            quantidade: 0,
            modalidade: 'FIXO',
            dias_semana: null,
          }
          vagasPayload.push({
            linhaIndex: l,
            nivelIndex: n,
            quantidade: cel.quantidade,
            modalidade: cel.modalidade,
            dias_semana: cel.dias_semana,
          })
        }
      }

      const atualizado = await salvarEstruturaCompletaConfiguracaoRh(
        configuracaoAtual.id,
        {
          niveis: niveisEditaveis as any,
          linhas: linhasEditaveis as any,
          vagas: vagasPayload,
        },
        user?.email || 'Sistema',
        user?.email || 'sistema@local',
      )

      toast({
        title: 'Grade salva com sucesso!',
        description: `Configuração ${atualizado.tipo_atendimento} (${atualizado.ano_letivo}) atualizada.`,
      })

      await carregarDadosIniciais(atualizado.id)
    } catch (err: any) {
      console.error('Erro ao salvar grade:', err)
      toast({
        title: 'Erro ao salvar configuração de RH',
        description: err.message || 'Falha na gravação.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Alterar Status (ex: publicar VIGENTE ou arquivar)
  const handleAlterarStatus = async (novoStatus: StatusConfiguracaoRh) => {
    if (!configuracaoAtual) return

    if (novoStatus === 'VIGENTE' && !validacaoFaixas.valido) {
      toast({
        title: 'Não é possível tornar VIGENTE',
        description: `Corrija os erros nas faixas de alunos antes de publicar:\n${validacaoFaixas.erros.join('\n')}`,
        variant: 'destructive',
      })
      return
    }

    try {
      setSalvando(true)
      const res = await alterarStatusConfiguracaoRh(
        configuracaoAtual.id,
        novoStatus,
        user?.email || 'Sistema',
        user?.email || 'sistema@local',
      )

      toast({
        title: 'Status atualizado com sucesso!',
        description: `A configuração agora está com status "${res.status}".`,
      })

      await carregarDadosIniciais(res.id)
    } catch (err: any) {
      console.error('Erro ao alterar status:', err)
      toast({
        title: 'Erro ao alterar status',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Ação Duplicar
  const handleConfirmarDuplicar = async () => {
    if (!configuracaoAtual) return
    try {
      setSalvando(true)
      const duplicada = await duplicarConfiguracaoRh(
        configuracaoAtual.id,
        Number(duplicarAno),
        undefined,
        user?.email || 'Sistema',
        user?.email || 'sistema@local',
      )

      toast({
        title: 'Configuração duplicada com sucesso!',
        description: `Nova configuração criada para o ano ${duplicada.ano_letivo} em status RASCUNHO.`,
      })

      setDialogDuplicarAberto(false)
      await carregarDadosIniciais(duplicada.id)
    } catch (err: any) {
      console.error('Erro ao duplicar configuração:', err)
      toast({
        title: 'Erro ao duplicar configuração',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Ação Criar Nova Configuração
  const handleConfirmarNovaCfg = async () => {
    try {
      setSalvando(true)
      const nova = await salvarConfiguracaoRhCabecalho(
        {
          tipo_atendimento: novaCfgTipo,
          ano_letivo: Number(novaCfgAno),
          status: 'RASCUNHO',
          observacao: 'Nova configuração em rascunho.',
        },
        user?.email || 'Sistema',
        user?.email || 'sistema@local',
      )

      toast({
        title: 'Configuração criada!',
        description: 'Agora adicione os níveis e linhas da grade.',
      })

      setDialogNovaCfgAberto(false)
      await carregarDadosIniciais(nova.id)
    } catch (err: any) {
      console.error('Erro ao criar configuração:', err)
      toast({
        title: 'Erro ao criar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Ação Excluir Configuração
  const handleConfirmarExcluir = async () => {
    if (!configuracaoAtual) return
    try {
      setSalvando(true)
      await deleteConfiguracaoRh(
        configuracaoAtual.id,
        user?.email || 'Sistema',
        user?.email || 'sistema@local',
      )

      toast({
        title: 'Configuração excluída com sucesso.',
      })

      setDialogExcluirAberto(false)
      await carregarDadosIniciais()
    } catch (err: any) {
      console.error('Erro ao excluir:', err)
      toast({
        title: 'Erro ao excluir',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Simular cálculo com memória passo a passo
  const handleExecutarSimulacao = () => {
    if (!configuracaoAtual) return

    // Montar objeto estrutural a partir do estado atual da tela (inclusive alterações não salvas)
    const niveisSim: ConfiguracaoRhNivel[] = niveisEditaveis.map((n, idx) => ({
      id: n.id || `sim_n_${idx}`,
      configuracao_rh_id: configuracaoAtual.id,
      codigo_nivel: n.codigo_nivel,
      ordem: idx + 1,
      min_alunos: Number(n.min_alunos) || 0,
      max_alunos: n.max_alunos !== null ? Number(n.max_alunos) : null,
    }))

    const linhasSim: ConfiguracaoRhLinha[] = linhasEditaveis.map((l, idx) => {
      const fnObj = funcoesList.find((f) => f.id === l.funcao_id)
      return {
        id: l.id || `sim_l_${idx}`,
        configuracao_rh_id: configuracaoAtual.id,
        funcao_id: l.funcao_id,
        ordem: idx + 1,
        base_calculo: l.base_calculo,
        etapas_filtro: l.etapas_filtro,
        funcao: fnObj,
        observacao: l.observacao,
        cargos: l.cargos.map((c) => ({
          cargo_id: c.cargo_id,
          condicao: c.condicao,
          cargo: cargosList.find((crg) => crg.id === c.cargo_id),
        })),
      }
    })

    const vagasSim: any[] = []
    for (let l = 0; l < linhasEditaveis.length; l++) {
      for (let n = 0; n < niveisEditaveis.length; n++) {
        const cel = matrizVagas[`${l}_${n}`]
        if (cel) {
          vagasSim.push({
            linha_id: linhasSim[l].id,
            nivel_id: niveisSim[n].id,
            quantidade: cel.quantidade,
            modalidade: cel.modalidade,
            dias_semana: cel.dias_semana,
          })
        }
      }
    }

    const dictEtapas: Record<string, number> = {}
    for (const item of simTurmasEtapas) {
      if (item.etapa.trim()) {
        dictEtapas[item.etapa.trim()] = Number(item.turmas) || 0
      }
    }

    const res = calcularVagasPorNivel(
      {
        tipo_atendimento: configuracaoAtual.tipo_atendimento,
        ano_letivo: configuracaoAtual.ano_letivo,
        niveis: niveisSim,
        linhas: linhasSim,
        vagas: vagasSim,
      },
      simAlunos,
      simPeriodos,
      dictEtapas,
    )

    setResultadoSimulacao(res)
  }

  // Presets rápidos de validação dos exemplos solicitados pelo usuário
  const carregarExemplo20h = () => {
    // Buscar cfg 20h
    const cfg20h = configuracoes.find((c) => c.tipo_atendimento.includes('20h'))
    if (cfg20h && cfg20h.id !== configuracaoAtivaId) {
      carregarConfiguracaoCompleta(cfg20h.id)
    }
    setSimAlunos(323)
    setSimPeriodos(2)
    setSimTurmasEtapas([{ etapa: 'Ensino Fundamental', turmas: 14 }])
    toast({
      title: 'Exemplo 20h carregado',
      description: '323 alunos, 2 períodos e 14 turmas (esperado Nível V).',
    })
  }

  const carregarExemplo40h = () => {
    // Buscar cfg 40h
    const cfg40h = configuracoes.find((c) => c.tipo_atendimento.includes('40h'))
    if (cfg40h && cfg40h.id !== configuracaoAtivaId) {
      carregarConfiguracaoCompleta(cfg40h.id)
    }
    setSimAlunos(148)
    setSimPeriodos(1)
    setSimTurmasEtapas([
      { etapa: 'Infantil I', turmas: 1 },
      { etapa: 'Infantil II', turmas: 2 },
      { etapa: 'Fundamental 1', turmas: 6 },
    ])
    toast({
      title: 'Exemplo 40h carregado',
      description: '148 alunos, 9 turmas (3 de Infantil) → esperado Nível C com 3 Suporte de Sala.',
    })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Configuração de Vagas por Nível
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Parâmetros oficiais de lotação por porte e simulação de dimensionamento de pessoal
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {podeEditar && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogNovaCfgAberto(true)}
                className="text-xs gap-1.5"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                Nova Configuração
              </Button>

              {configuracaoAtual && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDuplicarAno(configuracaoAtual.ano_letivo + 1)
                    setDialogDuplicarAberto(true)
                  }}
                  className="text-xs gap-1.5"
                  title="Duplicar para o próximo ano letivo"
                >
                  <Copy className="w-4 h-4 text-slate-600" />
                  Duplicar
                </Button>
              )}
            </>
          )}

          {configuracaoAtual && podeEditar && (
            <Button
              onClick={handleSalvarEstrutura}
              disabled={salvando || !validacaoFaixas.valido}
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4" />
              {salvando ? 'Salvando...' : 'Salvar Grade'}
            </Button>
          )}
        </div>
      </div>

      {/* SELEÇÃO DE CONFIGURAÇÃO E CABEÇALHO */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Selecione a Configuração de RH
              </Label>
              <Select
                value={configuracaoAtivaId}
                onValueChange={(val) => carregarConfiguracaoCompleta(val)}
                disabled={loading}
              >
                <SelectTrigger className="w-full bg-white text-xs sm:text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {configuracoes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-semibold text-slate-900">{c.ano_letivo}</span> —{' '}
                      {c.tipo_atendimento} ({c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Ano Letivo</Label>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-800">
                <Calendar className="w-4 h-4 text-blue-600" />
                {configuracaoAtual?.ano_letivo || '—'}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Status Vigente</Label>
              <div className="flex items-center justify-between h-9 px-2.5 rounded-md bg-slate-100 border border-slate-200">
                <Badge
                  variant="outline"
                  className={
                    configuracaoAtual?.status === 'VIGENTE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                      : configuracaoAtual?.status === 'ARQUIVADA'
                        ? 'bg-slate-100 text-slate-600 border-slate-300 font-semibold'
                        : 'bg-amber-50 text-amber-700 border-amber-300 font-bold'
                  }
                >
                  {configuracaoAtual?.status || 'RASCUNHO'}
                </Badge>

                {podeEditar && configuracaoAtual && (
                  <div className="flex items-center gap-1">
                    {configuracaoAtual.status !== 'VIGENTE' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAlterarStatus('VIGENTE')}
                        className="h-7 px-2 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-semibold"
                        title="Tornar esta configuração a VIGENTE do ano"
                      >
                        Publicar
                      </Button>
                    )}
                    {configuracaoAtual.status !== 'ARQUIVADA' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAlterarStatus('ARQUIVADA')}
                        className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900 font-medium"
                        title="Arquivar configuração"
                      >
                        Arquivar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ALERTA DE VALIDAÇÃO DE FAIXAS (CONTIGUIDADE E SOBREPOSIÇÃO) */}
      {!validacaoFaixas.valido && (
        <Alert variant="destructive" className="bg-red-50 border-red-300 text-red-900">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertTitle className="font-bold text-sm">
            Inconsistência nas Faixas de Alunos ({validacaoFaixas.erros.length} erro(s)
            detectado(s))
          </AlertTitle>
          <AlertDescription className="text-xs mt-1.5 space-y-1">
            <p className="font-medium text-red-800">
              O salvamento e a publicação como VIGENTE estão bloqueados até que as faixas estejam
              corretas:
            </p>
            <ul className="list-disc pl-5 space-y-0.5">
              {validacaoFaixas.erros.map((erro, idx) => (
                <li key={idx} className="font-semibold text-red-700">
                  {erro}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* TABS: GRADE OFICIAL vs SIMULAÇÃO */}
      <Tabs defaultValue="grade" className="w-full space-y-4">
        <TabsList className="bg-slate-200/80 p-1">
          <TabsTrigger value="grade" className="text-xs sm:text-sm font-semibold gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Grade Função × Nível
          </TabsTrigger>
          <TabsTrigger value="simular" className="text-xs sm:text-sm font-semibold gap-2">
            <Calculator className="w-4 h-4 text-purple-600" />
            Painel Simular Lotação
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: GRADE OFICIAL */}
        <TabsContent value="grade" className="space-y-4">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="py-4 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Matriz de Dimensionamento de Pessoal
                </CardTitle>
                <CardDescription className="text-xs">
                  Valores oficiais do seed e portaria municipal. Clique nas células para alterar
                  quantidade e fixo/itinerante.
                </CardDescription>
              </div>

              {podeEditar && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAdicionarNivel}
                    className="text-xs gap-1.5 h-8 text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    <Plus className="w-3.5 h-3.5" />+ Adicionar Nível
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAdicionarLinha}
                    className="text-xs gap-1.5 h-8 text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    <Plus className="w-3.5 h-3.5" />+ Adicionar Linha (Função)
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table className="w-full text-xs sm:text-sm border-collapse min-w-[850px]">
                <TableHeader className="bg-slate-50/80">
                  {/* Linha 1 de Cabeçalho: Código do Nível */}
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="w-12 text-center font-bold text-slate-700">#</TableHead>
                    <TableHead className="min-w-[200px] font-bold text-slate-900">
                      Função e Critério
                    </TableHead>
                    <TableHead className="min-w-[130px] font-bold text-slate-700">
                      Base Cálculo
                    </TableHead>

                    {niveisEditaveis.map((nivel, nIdx) => (
                      <TableHead
                        key={nivel.tempId}
                        className="text-center bg-blue-50/50 border-l border-slate-200 min-w-[100px] px-2 py-2"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold text-slate-400">
                            Nível {nIdx + 1}
                          </span>
                          {podeEditar && niveisEditaveis.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoverNivel(nIdx)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              title="Remover nível"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {podeEditar ? (
                          <Input
                            value={nivel.codigo_nivel}
                            onChange={(e) =>
                              handleAtualizarNivel(
                                nIdx,
                                'codigo_nivel',
                                e.target.value.toUpperCase(),
                              )
                            }
                            className="h-7 text-center font-bold text-xs uppercase bg-white border-blue-200"
                            placeholder="Cód"
                          />
                        ) : (
                          <span className="font-bold text-blue-800 text-sm">
                            {nivel.codigo_nivel}
                          </span>
                        )}
                      </TableHead>
                    ))}

                    <TableHead className="w-28 text-center font-bold text-slate-700">
                      Cargos
                    </TableHead>
                    {podeEditar && (
                      <TableHead className="w-20 text-center font-bold text-slate-700">
                        Ações
                      </TableHead>
                    )}
                  </TableRow>

                  {/* Linha 2 de Cabeçalho: Faixa de Alunos (Mínimo a Máximo) */}
                  <TableRow className="bg-slate-100/70 border-b border-slate-200 text-[11px]">
                    <TableHead colSpan={3} className="text-right pr-4 font-semibold text-slate-600">
                      Faixa de Alunos (mín — máx):
                    </TableHead>

                    {niveisEditaveis.map((nivel, nIdx) => (
                      <TableHead
                        key={`faixa_${nivel.tempId}`}
                        className="text-center border-l border-slate-200 p-1.5"
                      >
                        {podeEditar ? (
                          <div className="flex items-center gap-1 justify-center">
                            <Input
                              type="number"
                              min={0}
                              value={nivel.min_alunos}
                              onChange={(e) =>
                                handleAtualizarNivel(
                                  nIdx,
                                  'min_alunos',
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="h-6 w-12 text-[10px] text-center p-0.5 bg-white"
                              title="Mínimo de alunos"
                            />
                            <span className="text-slate-400">a</span>
                            <Input
                              type="number"
                              value={nivel.max_alunos ?? ''}
                              placeholder="∞"
                              onChange={(e) =>
                                handleAtualizarNivel(
                                  nIdx,
                                  'max_alunos',
                                  e.target.value === '' ? null : parseInt(e.target.value) || 0,
                                )
                              }
                              className="h-6 w-12 text-[10px] text-center p-0.5 bg-white"
                              title="Máximo de alunos (deixe vazio para sem limite)"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-700 font-medium">
                            {nivel.min_alunos} a{' '}
                            {nivel.max_alunos !== null ? nivel.max_alunos : 'sem limite'}
                          </span>
                        )}
                      </TableHead>
                    ))}

                    <TableHead colSpan={podeEditar ? 2 : 1}></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {linhasEditaveis.map((linha, lIdx) => {
                    const funcaoObj = funcoesList.find((f) => f.id === linha.funcao_id)
                    const isSG =
                      funcaoObj?.nome.includes('Serviços Gerais') ||
                      linha.observacao?.includes('pendente de validação')

                    return (
                      <TableRow
                        key={linha.tempId}
                        className={`hover:bg-blue-50/30 transition-colors ${
                          isSG ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* 1. Ordem */}
                        <TableCell className="text-center font-bold text-slate-400 text-xs">
                          {lIdx + 1}
                        </TableCell>

                        {/* 2. Função / Nome */}
                        <TableCell className="py-2.5">
                          {podeEditar ? (
                            <div className="space-y-1">
                              <Select
                                value={linha.funcao_id}
                                onValueChange={(val) =>
                                  handleAtualizarLinha(lIdx, 'funcao_id', val)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs font-semibold bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {funcoesList.map((f) => (
                                    <SelectItem key={f.id} value={f.id} className="text-xs">
                                      {f.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {linha.observacao && (
                                <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                                  <Info className="w-3 h-3 shrink-0" />
                                  {linha.observacao}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold text-slate-900">
                                {funcaoObj?.nome || 'Função'}
                              </p>
                              {linha.observacao && (
                                <p className="text-[11px] text-amber-700 font-medium">
                                  {linha.observacao}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* 3. Base de Cálculo */}
                        <TableCell className="py-2.5">
                          {podeEditar ? (
                            <div className="space-y-1">
                              <Select
                                value={linha.base_calculo}
                                onValueChange={(val: BaseCalculoRh) =>
                                  handleAtualizarLinha(lIdx, 'base_calculo', val)
                                }
                              >
                                <SelectTrigger className="h-8 text-[11px] font-medium bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {OPCOES_BASE_CALCULO.map((bc) => (
                                    <SelectItem key={bc.value} value={bc.value} className="text-xs">
                                      {bc.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {linha.base_calculo === 'POR_TURMA_ETAPA' && (
                                <div className="space-y-1">
                                  <Input
                                    value={(linha.etapas_filtro || []).join(', ')}
                                    placeholder="Ex: INFANTIL, INFANTIL_I"
                                    onChange={(e) => {
                                      const arr = e.target.value
                                        .split(',')
                                        .map((s) => s.trim())
                                        .filter(Boolean)
                                      handleAtualizarLinha(lIdx, 'etapas_filtro', arr)
                                    }}
                                    className="h-6 text-[10px] bg-white font-mono"
                                    title="Chaves das etapas separadas por vírgula"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <Badge variant="outline" className="text-[10px] font-semibold">
                                {linha.base_calculo}
                              </Badge>
                              {linha.base_calculo === 'POR_TURMA_ETAPA' && (
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {(linha.etapas_filtro || []).join(', ')}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* 4. Células da Matriz (linha × nível) */}
                        {niveisEditaveis.map((nivel, nIdx) => {
                          const celula = matrizVagas[`${lIdx}_${nIdx}`]
                          const formatted = formatarCelula(celula)
                          const isZero = !celula || celula.quantidade === 0

                          return (
                            <TableCell
                              key={`${linha.tempId}_${nivel.tempId}`}
                              onClick={() => handleAbrirEdicaoCelula(lIdx, nIdx)}
                              className={`text-center border-l border-slate-200 py-2 px-1 cursor-pointer select-none transition-colors ${
                                podeEditar ? 'hover:bg-blue-100/70 hover:font-bold' : ''
                              } ${isZero ? 'text-slate-400 font-normal' : 'font-semibold text-slate-900'}`}
                              title={
                                podeEditar
                                  ? 'Clique para editar quantidade e fixo/itinerante'
                                  : undefined
                              }
                            >
                              <div className="py-1 px-1.5 rounded hover:ring-1 hover:ring-blue-300">
                                {formatted}
                              </div>
                            </TableCell>
                          )
                        })}

                        {/* 5. Cargos Elegíveis Vinculados */}
                        <TableCell className="text-center py-2.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAbrirEdicaoCargos(lIdx)}
                            className="h-7 px-2 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                          >
                            {linha.cargos && linha.cargos.length > 0 ? (
                              <Badge
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 font-bold"
                              >
                                {linha.cargos.length} cargo(s)
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-xs">+ Vincular</span>
                            )}
                          </Button>
                        </TableCell>

                        {/* 6. Ações da linha (Mover / Excluir) */}
                        {podeEditar && (
                          <TableCell className="text-center py-2.5">
                            <div className="flex items-center justify-center gap-0.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleMoverLinha(lIdx, 'cima')}
                                disabled={lIdx === 0}
                                className="h-6 w-6 text-slate-400 hover:text-slate-800"
                                title="Mover para cima"
                              >
                                <MoveUp className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleMoverLinha(lIdx, 'baixo')}
                                disabled={lIdx === linhasEditaveis.length - 1}
                                className="h-6 w-6 text-slate-400 hover:text-slate-800"
                                title="Mover para baixo"
                              >
                                <MoveDown className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoverLinha(lIdx)}
                                className="h-6 w-6 text-slate-400 hover:text-red-600"
                                title="Excluir linha"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* OBSERVAÇÃO GERAL E BOTÃO DE EXCLUIR CONFIGURAÇÃO */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-lg bg-white border border-slate-200">
            <div className="flex-1 space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Observações da Configuração / Portaria
              </Label>
              <Input
                value={observacaoCabecalho}
                onChange={(e) => setObservacaoCabecalho(e.target.value)}
                placeholder="Ex: Configuração aprovada pela Portaria SEMED 2026..."
                className="text-xs"
                disabled={!podeEditar}
              />
            </div>

            {podeEditar && configuracaoAtual && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogExcluirAberto(true)}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-9"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir Configuração
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: PAINEL SIMULAR */}
        <TabsContent value="simular" className="space-y-4">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="py-4 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-purple-600" />
                    Simulador Dinâmico de Lotação por Porte
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Informe os dados da escola hipotética para visualizar o nível correspondente e a
                    memória de cálculo passo a passo. <strong>Não grava nada no banco.</strong>
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={carregarExemplo20h}
                    className="text-xs h-8 text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    Exemplo 20h (323 alunos)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={carregarExemplo40h}
                    className="text-xs h-8 text-purple-700 border-purple-200 hover:bg-purple-50"
                  >
                    Exemplo 40h (148 alunos)
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-4 sm:px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Total de Alunos</Label>
                  <Input
                    type="number"
                    min={0}
                    value={simAlunos}
                    onChange={(e) => setSimAlunos(Math.max(0, parseInt(e.target.value) || 0))}
                    className="bg-white font-semibold text-sm"
                  />
                  <p className="text-[11px] text-slate-500">
                    Determina o Nível/Porte da escola na tabela oficial
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Número de Períodos (Turnos)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    value={simPeriodos}
                    onChange={(e) => setSimPeriodos(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-white font-semibold text-sm"
                  />
                  <p className="text-[11px] text-slate-500">Multiplicador das vagas POR_PERIODO</p>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <Button
                    onClick={handleExecutarSimulacao}
                    className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm h-10"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Calcular Dimensionamento
                  </Button>
                </div>
              </div>

              {/* Turmas por Etapa */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-800">
                    Composição de Turmas por Etapa (Total:{' '}
                    {simTurmasEtapas.reduce((acc, cur) => acc + (Number(cur.turmas) || 0), 0)}{' '}
                    turmas)
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSimTurmasEtapas((prev) => [
                        ...prev,
                        { etapa: `Etapa ${prev.length + 1}`, turmas: 1 },
                      ])
                    }
                    className="h-7 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar Etapa
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {simTurmasEtapas.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-md bg-white border border-slate-200"
                    >
                      <Input
                        value={item.etapa}
                        placeholder="Nome da etapa"
                        onChange={(e) => {
                          const val = e.target.value
                          setSimTurmasEtapas((prev) => {
                            const copia = [...prev]
                            copia[idx].etapa = val
                            return copia
                          })
                        }}
                        className="h-8 text-xs font-medium"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={item.turmas}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0)
                          setSimTurmasEtapas((prev) => {
                            const copia = [...prev]
                            copia[idx].turmas = val
                            return copia
                          })
                        }}
                        className="h-8 w-20 text-xs font-bold text-center"
                        title="Quantidade de turmas desta etapa"
                      />
                      {simTurmasEtapas.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setSimTurmasEtapas((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="h-8 w-8 text-slate-400 hover:text-red-600 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* RESULTADO DO CÁLCULO */}
              {resultadoSimulacao && (
                <div className="space-y-6 pt-4 border-t border-slate-200">
                  {/* Banner do Nível Identificado */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
                        {resultadoSimulacao.nivelEncontrado?.codigo_nivel || '?'}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                          Nível Correspondente Identificado
                        </p>
                        <h3 className="text-lg font-bold text-slate-900">
                          Nível {resultadoSimulacao.nivelEncontrado?.codigo_nivel} — Faixa de{' '}
                          {resultadoSimulacao.nivelEncontrado?.min_alunos} a{' '}
                          {resultadoSimulacao.nivelEncontrado?.max_alunos !== null
                            ? `${resultadoSimulacao.nivelEncontrado?.max_alunos} alunos`
                            : 'sem limite'}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500">Total de Vagas Geradas:</span>
                      <p className="text-2xl font-black text-blue-700">
                        {resultadoSimulacao.vagas.reduce(
                          (acc, cur) => acc + cur.quantidadeFinal,
                          0,
                        )}{' '}
                        vaga(s)
                      </p>
                    </div>
                  </div>

                  {/* Tabela de Vagas Geradas */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                    <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wide">
                      Detalhamento de Vagas Calculadas
                    </div>
                    <Table>
                      <TableHeader className="bg-slate-50 text-xs">
                        <TableRow>
                          <TableHead className="font-bold text-slate-900">Função</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">
                            Qtd. Calculada
                          </TableHead>
                          <TableHead className="font-bold text-slate-700">Modalidade</TableHead>
                          <TableHead className="font-bold text-slate-700">
                            Cargos Elegíveis
                          </TableHead>
                          <TableHead className="font-bold text-slate-700">
                            Memória de Cálculo
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultadoSimulacao.vagas.map((vaga, idx) => (
                          <TableRow key={idx} className="text-xs hover:bg-slate-50">
                            <TableCell className="font-bold text-slate-900 py-3">
                              {vaga.funcaoNome}
                              {vaga.observacaoLinha && (
                                <p className="text-[10px] text-amber-700 font-normal mt-0.5">
                                  {vaga.observacaoLinha}
                                </p>
                              )}
                            </TableCell>

                            <TableCell className="text-center font-extrabold text-blue-700 text-sm">
                              {vaga.quantidadeFinal}
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  vaga.modalidade === 'ITINERANTE'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200 font-semibold'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                                }
                              >
                                {vaga.modalidade === 'ITINERANTE'
                                  ? vaga.diasSemana
                                    ? `Itinerante (${vaga.diasSemana}x/sem)`
                                    : 'Itinerante'
                                  : 'Fixo'}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              {vaga.cargosElegiveis.length > 0 ? (
                                <div className="space-y-1">
                                  {vaga.cargosElegiveis.map((c, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className="text-[11px] text-slate-700 flex items-center gap-1"
                                    >
                                      <span>• {c.cargoNome}</span>
                                      {c.condicao !== 'NENHUMA' && (
                                        <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                          {c.condicao === 'READAPTADO_COMPATIVEL_LAUDO'
                                            ? 'Readaptado'
                                            : 'SEMED'}
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">
                                  Nenhum cargo filtrado
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="font-mono text-[11px] text-slate-600">
                              {vaga.memoriaCalculo}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Passos da Memória de Cálculo Completa */}
                  <Card className="border-slate-200 bg-slate-50/50">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Memória de Cálculo Completa (Auditoria de Dimensionamento)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="font-mono text-xs text-slate-700 space-y-1 bg-white p-3 rounded border border-slate-200">
                        {resultadoSimulacao.passosMemoria.map((passo, pIdx) => (
                          <div key={pIdx} className="leading-relaxed">
                            <span className="text-slate-400 select-none mr-2">[{pIdx + 1}]</span>
                            {passo}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: EDIÇÃO DE CÉLULA DA GRADE */}
      <Dialog open={dialogEditarCelulaAberto} onOpenChange={setDialogEditarCelulaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Editar Vagas: {celulaEmEdicao?.linhaNome}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configuração da célula para o Nível {celulaEmEdicao?.nivelCodigo}
            </DialogDescription>
          </DialogHeader>

          {celulaEmEdicao && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Quantidade de Vagas</Label>
                <Input
                  type="number"
                  min={0}
                  value={celulaEmEdicao.quantidade}
                  onChange={(e) =>
                    setCelulaEmEdicao({
                      ...celulaEmEdicao,
                      quantidade: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="text-base font-bold text-center"
                />
                <p className="text-[11px] text-slate-500">
                  Informe 0 caso a função não seja prevista neste nível.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Modalidade</Label>
                <Select
                  value={celulaEmEdicao.modalidade}
                  onValueChange={(val: ModalidadeRhVaga) =>
                    setCelulaEmEdicao({ ...celulaEmEdicao, modalidade: val })
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXO">Fixo na Unidade</SelectItem>
                    <SelectItem value="ITINERANTE">Itinerante (atende mais de uma)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {celulaEmEdicao.modalidade === 'ITINERANTE' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Dias por Semana na Unidade
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={celulaEmEdicao.dias_semana ?? ''}
                    placeholder="Ex: 2 (deixe vazio se indefinido)"
                    onChange={(e) =>
                      setCelulaEmEdicao({
                        ...celulaEmEdicao,
                        dias_semana: e.target.value === '' ? null : parseInt(e.target.value) || 0,
                      })
                    }
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogEditarCelulaAberto(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarCelula}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              Aplicar à Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: VINCULAR CARGOS PERMITIDOS À LINHA */}
      <Dialog open={dialogEditarCargosAberto} onOpenChange={setDialogEditarCargosAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Cargos Elegíveis: {linhaEmEdicaoCargos?.funcaoNome}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina quais cargos da rede podem ocupar as vagas desta função e a condição aplicável.
            </DialogDescription>
          </DialogHeader>

          {linhaEmEdicaoCargos && (
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">
                  Cargos Vinculados ({linhaEmEdicaoCargos.cargos.length})
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (cargosList.length === 0) return
                    setLinhaEmEdicaoCargos({
                      ...linhaEmEdicaoCargos,
                      cargos: [
                        ...linhaEmEdicaoCargos.cargos,
                        { cargo_id: cargosList[0].id, condicao: 'NENHUMA' },
                      ],
                    })
                  }}
                  className="h-7 text-xs text-blue-700 border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar Cargo
                </Button>
              </div>

              {linhaEmEdicaoCargos.cargos.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  Nenhum cargo restrito configurado para esta função.
                </p>
              ) : (
                <div className="space-y-3">
                  {linhaEmEdicaoCargos.cargos.map((cargoVinc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Select
                          value={cargoVinc.cargo_id}
                          onValueChange={(val) => {
                            const copia = [...linhaEmEdicaoCargos.cargos]
                            copia[idx].cargo_id = val
                            setLinhaEmEdicaoCargos({ ...linhaEmEdicaoCargos, cargos: copia })
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs font-semibold bg-white flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {cargosList.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs">
                                {c.nome} {c.carga_horaria ? `(${c.carga_horaria})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const copia = linhaEmEdicaoCargos.cargos.filter((_, i) => i !== idx)
                            setLinhaEmEdicaoCargos({ ...linhaEmEdicaoCargos, cargos: copia })
                          }}
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-600">Condição de ocupação</Label>
                        <Select
                          value={cargoVinc.condicao}
                          onValueChange={(val: CondicaoLinhaCargo) => {
                            const copia = [...linhaEmEdicaoCargos.cargos]
                            copia[idx].condicao = val
                            setLinhaEmEdicaoCargos({ ...linhaEmEdicaoCargos, cargos: copia })
                          }}
                        >
                          <SelectTrigger className="h-7 text-[11px] bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPCOES_CONDICAO.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogEditarCargosAberto(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarCargosLinha}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              Salvar Cargos da Linha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: DUPLICAR CONFIGURAÇÃO */}
      <Dialog open={dialogDuplicarAberto} onOpenChange={setDialogDuplicarAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Copy className="w-4 h-4 text-blue-600" />
              Duplicar Configuração de RH
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Copia todos os níveis, linhas da grade, células e cargos da configuração{' '}
              <strong>
                {configuracaoAtual?.tipo_atendimento} ({configuracaoAtual?.ano_letivo})
              </strong>{' '}
              para um novo ano letivo em status RASCUNHO.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Novo Ano Letivo</Label>
              <Input
                type="number"
                min={2020}
                max={2050}
                value={duplicarAno}
                onChange={(e) => setDuplicarAno(parseInt(e.target.value) || 2027)}
                className="text-sm font-bold text-center"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogDuplicarAberto(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarDuplicar}
              disabled={salvando}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {salvando ? 'Duplicando...' : 'Confirmar Duplicação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: NOVA CONFIGURAÇÃO */}
      <Dialog open={dialogNovaCfgAberto} onOpenChange={setDialogNovaCfgAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Nova Configuração de RH
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre um novo cabeçalho de configuração para dimensionamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Atendimento</Label>
              <Select value={novaCfgTipo} onValueChange={setNovaCfgTipo}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPCOES_TIPO_ATENDIMENTO.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Ano Letivo</Label>
              <Input
                type="number"
                min={2020}
                max={2050}
                value={novaCfgAno}
                onChange={(e) => setNovaCfgAno(parseInt(e.target.value) || 2026)}
                className="text-sm font-bold text-center"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogNovaCfgAberto(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarNovaCfg}
              disabled={salvando}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              Criar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CONFIRMAR EXCLUSÃO */}
      <Dialog open={dialogExcluirAberto} onOpenChange={setDialogExcluirAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Tem certeza de que deseja excluir a configuração{' '}
              <strong>
                {configuracaoAtual?.tipo_atendimento} ({configuracaoAtual?.ano_letivo})
              </strong>
              ? Todos os níveis, linhas da grade e células vinculadas serão removidos. Esta ação é
              irreversível.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogExcluirAberto(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmarExcluir}
              disabled={salvando}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              {salvando ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
