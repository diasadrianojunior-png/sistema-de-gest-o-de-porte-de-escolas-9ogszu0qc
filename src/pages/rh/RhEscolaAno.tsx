import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { getUnidadesEscolares } from '@/services/unidades-escolares'
import { getTurmas } from '@/services/turmas'
import { getFuncoes } from '@/services/apoio'
import {
  getRhVersoes,
  getRhTiposAtendimento,
  getRhNiveis,
  getRhRegrasNivel,
  getRhRegrasTurmas,
  getRhEscolaAno,
  salvarRhEscolaAno,
  getRhExcecoesVaga,
  salvarRhExcecaoVaga,
  deleteRhExcecaoVaga,
  getRhVagasEscolaAno,
  persistirVagasCalculadas,
  getRhLotacoes,
} from '@/services/rh-configuracoes'
import { calcularVagasPorte, ResultadoCalculoPorte } from '@/services/rh-calculo'
import {
  UnidadeEscolar,
  RhVersaoConfiguracao,
  RhTipoAtendimento,
  RhNivel,
  RhRegraNivel,
  RhRegraPorTurmas,
  RhEscolaAnoLetivo,
  RhExcecaoVaga,
  RhVaga,
  RhLotacao,
  Funcao,
} from '@/types/gestao-escolar'
import {
  Calculator,
  Building,
  Play,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  Plus,
  Trash2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'

export default function RhEscolaAnoPage() {
  const { canEdit } = useAuth()
  const podeEditar = canEdit('rh_cenario_escola')
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [calculando, setCalculando] = useState(false)
  const [salvandoCenario, setSalvandoCenario] = useState(false)

  const [escolas, setEscolas] = useState<UnidadeEscolar[]>([])
  const [escolaId, setEscolaId] = useState<string>('')
  const [anoLetivo, setAnoLetivo] = useState<number>(2026)

  const [versoes, setVersoes] = useState<RhVersaoConfiguracao[]>([])
  const [versaoId, setVersaoId] = useState<string>('')

  const [tipos, setTipos] = useState<RhTipoAtendimento[]>([])
  const [tipoAtendimentoId, setTipoAtendimentoId] = useState<string>('')

  const [niveisTipo, setNiveisTipo] = useState<RhNivel[]>([])
  const [regrasNivel, setRegrasNivel] = useState<RhRegraNivel[]>([])
  const [regrasTurmas, setRegrasTurmas] = useState<RhRegraPorTurmas[]>([])
  const [funcoes, setFuncoes] = useState<Funcao[]>([])

  // Dados da escola/cenário
  const [cenarioId, setCenarioId] = useState<string | null>(null)
  const [alunosTotal, setAlunosTotal] = useState<number>(0)
  const [jornadaAmpliada, setJornadaAmpliada] = useState<number>(0)
  const [eja, setEja] = useState<number>(0)
  const [srm, setSrm] = useState<number>(0)
  const [turnos, setTurnos] = useState<string[]>(['MATUTINO', 'VESPERTINO'])
  const [metragem, setMetragem] = useState<number>(0)
  const [nivelOverrideId, setNivelOverrideId] = useState<string>('nenhum')
  const [justificativaOverride, setJustificativaOverride] = useState<string>('')

  // Turmas da escola
  const [turmasEscola, setTurmasEscola] = useState<any[]>([])

  // Exceções SEMED
  const [excecoes, setExcecoes] = useState<RhExcecaoVaga[]>([])
  const [modalExcOpen, setModalExcOpen] = useState(false)
  const [excFuncaoId, setExcFuncaoId] = useState<string>('')
  const [excDelta, setExcDelta] = useState<number>(1)
  const [excJustificativa, setExcJustificativa] = useState<string>('')

  // Vagas e Lotação
  const [vagasExistentes, setVagasExistentes] = useState<RhVaga[]>([])
  const [lotacoesAtuais, setLotacoesAtuais] = useState<RhLotacao[]>([])

  // Resultado do Cálculo
  const [resultado, setResultado] = useState<ResultadoCalculoPorte | null>(null)

  // 1. Carga inicial
  useEffect(() => {
    const carregarTudo = async () => {
      try {
        setLoading(true)
        const [escolasData, versoesData, funcoesData] = await Promise.all([
          getUnidadesEscolares(),
          getRhVersoes(),
          getFuncoes(),
        ])
        setEscolas(escolasData)
        setVersoes(versoesData)
        setFuncoes(funcoesData)

        if (escolasData.length > 0) setEscolaId(escolasData[0].id)
        if (versoesData.length > 0) {
          const vig = versoesData.find((v) => v.status === 'VIGENTE') || versoesData[0]
          setVersaoId(vig.id)
        }
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Erro inicial', description: err.message })
      } finally {
        setLoading(false)
      }
    }
    carregarTudo()
  }, [])

  // 2. Quando mudar a versão, carrega tipos, regras e faixas
  useEffect(() => {
    if (!versaoId) return
    const carregarVersao = async () => {
      try {
        const [tiposData, rNivel, rTurmas] = await Promise.all([
          getRhTiposAtendimento(versaoId),
          getRhRegrasNivel(versaoId),
          getRhRegrasTurmas(versaoId),
        ])
        setTipos(tiposData)
        setRegrasNivel(rNivel)
        setRegrasTurmas(rTurmas)
      } catch (err: any) {
        console.error('Erro ao carregar regras da versão:', err)
      }
    }
    carregarVersao()
  }, [versaoId])

  // 3. Quando mudar escola ou ano, carregar dados da escola e cenário
  useEffect(() => {
    if (!escolaId) return
    const carregarCenario = async () => {
      try {
        setCalculando(true)
        const escola = escolas.find((e) => e.id === escolaId)

        // Buscar turmas cadastradas na escola
        const todasTurmas = await getTurmas()
        const turmasDaEscola = todasTurmas.filter(
          (t) => t.unidade_escolar_id === escolaId && t.ano_letivo === anoLetivo,
        )
        setTurmasEscola(turmasDaEscola)

        // Buscar lotações cadastradas
        const lotacoes = await getRhLotacoes(escolaId)
        setLotacoesAtuais(lotacoes)

        // Buscar cenário salvo
        const cenario = await getRhEscolaAno(escolaId, anoLetivo)

        if (cenario) {
          setCenarioId(cenario.id)
          setTipoAtendimentoId(cenario.tipo_atendimento_id || '')
          setAlunosTotal(cenario.alunos_total)
          setJornadaAmpliada(cenario.alunos_por_modalidade?.jornada_ampliada || 0)
          setEja(cenario.alunos_por_modalidade?.eja || 0)
          setSrm(cenario.alunos_por_modalidade?.srm || 0)
          setTurnos(cenario.turnos || ['MATUTINO', 'VESPERTINO'])
          setMetragem(cenario.metragem_m2 || 0)
          setNivelOverrideId(cenario.nivel_override_id || 'nenhum')
          setJustificativaOverride(cenario.justificativa_override || '')

          // Exceções e vagas
          const [excData, vagasData] = await Promise.all([
            getRhExcecoesVaga(cenario.id),
            getRhVagasEscolaAno(cenario.id),
          ])
          setExcecoes(excData)
          setVagasExistentes(vagasData)
        } else {
          // Inicializa a partir dos dados da escola mestre
          setCenarioId(null)
          setAlunosTotal(120) // default sensível
          setJornadaAmpliada(0)
          setEja(0)
          setSrm(0)
          setTurnos(['MATUTINO', 'VESPERTINO'])
          setMetragem(800)
          setNivelOverrideId('nenhum')
          setJustificativaOverride('')
          setExcecoes([])
          setVagasExistentes([])

          // Auto-identificar tipo pelo nome do atendimento da unidade escolar
          if (escola && tipos.length > 0) {
            const matchTipo = tipos.find((t) => t.nome === escola.tipo_atendimento)
            if (matchTipo) setTipoAtendimentoId(matchTipo.id)
            else setTipoAtendimentoId(tipos[0].id)
          }
        }
      } catch (err: any) {
        console.error('Erro ao carregar cenário:', err)
      } finally {
        setCalculando(false)
      }
    }
    carregarCenario()
  }, [escolaId, anoLetivo, escolas, tipos])

  // 4. Carregar níveis do tipo selecionado
  useEffect(() => {
    if (!versaoId || !tipoAtendimentoId) return
    const carregarNiveis = async () => {
      const niveis = await getRhNiveis(versaoId, tipoAtendimentoId)
      setNiveisTipo(niveis)
    }
    carregarNiveis()
  }, [versaoId, tipoAtendimentoId])

  // Executar simulação de cálculo
  const executarCalculo = () => {
    const tipoAtual = tipos.find((t) => t.id === tipoAtendimentoId)
    const modalidadesExcluidas = tipoAtual?.modalidades_excluidas || []

    const turmasMapeadas = turmasEscola.map((t) => ({
      id: t.id,
      etapaNome: t.etapa?.nome || 'Fundamental',
      turno: 'MATUTINO',
      alunos: 25,
    }))

    const res = calcularVagasPorte({
      alunosTotal,
      alunosPorModalidade: {
        jornada_ampliada: jornadaAmpliada,
        eja,
        srm,
      },
      modalidadesExcluidas,
      niveisTipo,
      nivelOverrideId: nivelOverrideId === 'nenhum' ? null : nivelOverrideId,
      regrasNivel,
      regrasTurmas,
      excecoesVagas: excecoes,
      turnosEscola: turnos,
      turmas: turmasMapeadas,
      vagasExistentes,
      lotacoesAtuais,
    })

    setResultado(res)
    toast({
      title: 'Cálculo executado com sucesso',
      description: `Classificado no Nível ${res.nivelAplicado?.codigo_nivel || 'Indefinido'}. ${res.vagasGeradas.length} vaga(s) geradas.`,
    })
  }

  // Persistir cenário e vagas calculadas
  const handleSalvarCenario = async () => {
    if (!escolaId) return
    try {
      setSalvandoCenario(true)

      // 1. Salvar ou atualizar rh_escolas_ano
      const cenarioSalvo = await salvarRhEscolaAno({
        id: cenarioId || undefined,
        escola_id: escolaId,
        ano_letivo: anoLetivo,
        tipo_atendimento_id: tipoAtendimentoId || null,
        alunos_total: alunosTotal,
        alunos_por_modalidade: {
          jornada_ampliada: jornadaAmpliada,
          eja,
          srm,
        },
        turnos,
        metragem_m2: metragem,
        nivel_calculado_id: resultado?.nivelCalculado?.id || null,
        nivel_override_id: nivelOverrideId === 'nenhum' ? null : nivelOverrideId,
        justificativa_override: justificativaOverride || null,
        versao_id: versaoId || null,
      })

      setCenarioId(cenarioSalvo.id)

      // 2. Se houver resultado calculado, persistir vagas com idempotência
      if (resultado && resultado.vagasGeradas) {
        await persistirVagasCalculadas(cenarioSalvo.id, versaoId, resultado.vagasGeradas)
      }

      toast({
        title: 'Cenário e Vagas Persistidos',
        description: 'Dados de matrícula, nível calculado e vagas geradas foram salvos no banco.',
      })

      // Recarrega vagas persistidas
      const vagasAtualizadas = await getRhVagasEscolaAno(cenarioSalvo.id)
      setVagasExistentes(vagasAtualizadas)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar cenário',
        description: err.message,
      })
    } finally {
      setSalvandoCenario(false)
    }
  }

  // Adicionar Exceção SEMED
  const handleSalvarExcecao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cenarioId) {
      toast({
        variant: 'destructive',
        title: 'Salve o cenário antes de adicionar exceções',
      })
      return
    }
    if (!excFuncaoId || !excJustificativa.trim()) {
      toast({
        variant: 'destructive',
        title: 'Selecione a função e preencha a justificativa',
      })
      return
    }

    try {
      await salvarRhExcecaoVaga({
        escola_ano_id: cenarioId,
        funcao_id: excFuncaoId,
        delta: excDelta,
        justificativa: excJustificativa.trim(),
        autorizado_por: 'SEMED',
      })
      toast({ title: 'Exceção registrada com sucesso' })
      setModalExcOpen(false)
      setExcJustificativa('')
      const excData = await getRhExcecoesVaga(cenarioId)
      setExcecoes(excData)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar exceção', description: err.message })
    }
  }

  const handleExcluirExcecao = async (exc: RhExcecaoVaga) => {
    if (!confirm('Deseja excluir esta exceção?')) return
    try {
      await deleteRhExcecaoVaga(exc.id)
      toast({ title: 'Exceção removida' })
      if (cenarioId) {
        const excData = await getRhExcecoesVaga(cenarioId)
        setExcecoes(excData)
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir exceção', description: err.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            Cálculo de Porte e Geração de Vagas por Escola
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Simulação em tempo real, memória de cálculo auditável e geração idempotente de vagas da
            unidade escolar.
          </p>
        </div>

        {/* Seleção de Escola e Ano */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={escolaId} onValueChange={setEscolaId}>
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {escolas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome} ({e.codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(anoLetivo)} onValueChange={(val) => setAnoLetivo(Number(val))}>
            <SelectTrigger className="w-28 bg-white">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Formulário de Dados de Matrícula e Parâmetros da Escola */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            Parâmetros da Escola e Dados de Matrícula
          </CardTitle>
          <CardDescription>
            Informe a quantidade total de alunos e deduções por modalidade excluída do porte
            (Jornada Ampliada, EJA, SRM).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tipo-atend">Tipo de Atendimento</Label>
              <Select value={tipoAtendimentoId} onValueChange={setTipoAtendimentoId}>
                <SelectTrigger id="tipo-atend" className="bg-white">
                  <SelectValue placeholder="Selecione uma opção" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="al-total">Alunos Total (Matrículas)</Label>
              <Input
                id="al-total"
                type="number"
                min={0}
                value={alunosTotal}
                onChange={(e) => setAlunosTotal(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="metragem">Metragem da Unidade (m²)</Label>
              <Input
                id="metragem"
                type="number"
                min={0}
                value={metragem}
                onChange={(e) => setMetragem(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nº de Turmas Cadastradas</Label>
              <div className="h-10 flex items-center px-3 bg-slate-50 border rounded-md font-semibold text-slate-800 text-sm">
                {turmasEscola.length} turma(s)
              </div>
            </div>
          </div>

          {/* Deduções de Modalidades Excluídas */}
          <div className="p-3 bg-slate-50 rounded-lg border space-y-2">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Modalidades Excluídas do Porte (Alunos não computados na classificação do nível)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="jornada" className="text-xs">
                  Jornada Ampliada
                </Label>
                <Input
                  id="jornada"
                  type="number"
                  min={0}
                  className="bg-white"
                  value={jornadaAmpliada}
                  onChange={(e) => setJornadaAmpliada(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="eja" className="text-xs">
                  EJA
                </Label>
                <Input
                  id="eja"
                  type="number"
                  min={0}
                  className="bg-white"
                  value={eja}
                  onChange={(e) => setEja(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="srm" className="text-xs">
                  Sala de Recursos (SRM)
                </Label>
                <Input
                  id="srm"
                  type="number"
                  min={0}
                  className="bg-white"
                  value={srm}
                  onChange={(e) => setSrm(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Override de Nível SEMED */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="override-sel">Override de Nível (Exceção SEMED)</Label>
              <Select value={nivelOverrideId} onValueChange={setNivelOverrideId}>
                <SelectTrigger id="override-sel" className="bg-white">
                  <SelectValue placeholder="Selecione uma opção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">
                    Nenhum (Usar Nível Calculado Automaticamente)
                  </SelectItem>
                  {niveisTipo.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      Forçar Nível {n.codigo_nivel} ({n.min_alunos} a {n.max_alunos ?? 'sem teto'}{' '}
                      alunos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {nivelOverrideId !== 'nenhum' && (
              <div className="space-y-1.5">
                <Label htmlFor="just-override">Justificativa do Override (Obrigatória)</Label>
                <Input
                  id="just-override"
                  placeholder="Ex: Parecer SEMED nº 12/2026 devido à expansão"
                  value={justificativaOverride}
                  onChange={(e) => setJustificativaOverride(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Button
                onClick={executarCalculo}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Play className="w-4 h-4" />
                Simular Cálculo
              </Button>

              {podeEditar && (
                <Button
                  onClick={handleSalvarCenario}
                  disabled={salvandoCenario}
                  variant="outline"
                  className="gap-2 border-slate-300"
                >
                  {salvandoCenario ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Persistir Cenário e Vagas
                </Button>
              )}
            </div>

            {cenarioId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalExcOpen(true)}
                className="text-purple-700 hover:bg-purple-50 text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Exceção SEMED (+/- vagas)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exceções SEMED Cadastradas */}
      {excecoes.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/20">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold text-purple-900 flex items-center justify-between">
              <span>Exceções Pontuais SEMED Autorizadas ({excecoes.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <div className="space-y-1.5">
              {excecoes.map((exc) => (
                <div
                  key={exc.id}
                  className="flex items-center justify-between bg-white p-2.5 rounded border border-purple-200 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={exc.delta > 0 ? 'default' : 'destructive'}
                      className="font-mono"
                    >
                      {exc.delta > 0 ? `+${exc.delta}` : exc.delta}
                    </Badge>
                    <strong className="text-slate-800">{exc.funcao?.nome || 'Função'}:</strong>
                    <span className="text-slate-600">"{exc.justificativa}"</span>
                    <span className="text-[11px] text-slate-400">
                      ({exc.autorizado_por} - {exc.data})
                    </span>
                  </div>
                  {podeEditar && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExcluirExcecao(exc)}
                      className="h-7 w-7 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Avisos Regulamentares (Art. 9º) */}
      {resultado && resultado.avisosGerais.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-semibold block text-sm">Avisos da Portaria de Porte:</strong>
            {resultado.avisosGerais.map((av, i) => (
              <p key={i}>{av}</p>
            ))}
          </div>
        </div>
      )}

      {/* Memória de Cálculo Passo a Passo */}
      {resultado && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Memória de Cálculo (Passo a Passo)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {resultado.memoriaCalculo.map((passo, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border text-xs space-y-1">
                    <div className="font-bold text-slate-900">{passo.titulo}</div>
                    <div className="text-slate-500">{passo.descricao}</div>
                    <div className="font-semibold text-blue-700 bg-blue-50/80 px-2 py-1 rounded inline-block mt-1">
                      {passo.resultado}
                    </div>
                    {passo.detalhes && passo.detalhes.length > 0 && (
                      <ul className="list-disc list-inside text-slate-600 space-y-0.5 pt-1">
                        {passo.detalhes.map((d, dIdx) => (
                          <li key={dIdx}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Vagas Geradas & Quadro Comparativo */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quadro Comparativo (Previsto x Lotação Atual) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Quadro Comparativo: Previsto pelo Porte × Lotação Atual</span>
                  <Badge variant="outline">Base para Remanejamento</Badge>
                </CardTitle>
                <CardDescription>
                  Diferença entre o dimensionamento da portaria e os servidores efetivamente lotados
                  na escola.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Função</TableHead>
                        <TableHead className="text-center w-24">Previsto Fixo</TableHead>
                        <TableHead className="text-center w-24">Previsto Itin.</TableHead>
                        <TableHead className="text-center w-24 font-bold">Prev. Total</TableHead>
                        <TableHead className="text-center w-24">Lotação</TableHead>
                        <TableHead className="text-center w-28">Situação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultado.quadroComparativo.map((item) => (
                        <TableRow key={item.funcaoId}>
                          <TableCell className="font-medium text-slate-900">
                            <div>{item.funcaoNome}</div>
                            {item.aviso && (
                              <div className="text-[10px] text-amber-700 font-normal">
                                {item.aviso}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs">{item.previstoFixo}</TableCell>
                          <TableCell className="text-center text-xs">
                            {item.previstoItinerante}
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs">
                            {item.previstoTotal}
                          </TableCell>
                          <TableCell className="text-center text-xs font-semibold text-slate-700">
                            {item.lotadoTotal}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`font-semibold text-[10px] ${
                                item.situacao === 'OK'
                                  ? 'bg-emerald-600 text-white'
                                  : item.situacao === 'DÉFICIT'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-amber-500 text-white'
                              }`}
                            >
                              {item.situacao}{' '}
                              {item.saldo !== 0
                                ? `(${item.saldo > 0 ? `+${item.saldo}` : item.saldo})`
                                : ''}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Lista Detalhada de Vagas Geradas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Detalhamento das Vagas Geradas ({resultado.vagasGeradas.length})</span>
                  <Badge variant="outline">{resultado.vagasGeradas.length} Vagas</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Seq</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="w-28">Modalidade</TableHead>
                        <TableHead className="w-28">Origem</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead>Observação Regulamentar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultado.vagasGeradas.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">#{v.sequencial}</TableCell>
                          <TableCell className="font-semibold text-slate-900 text-xs">
                            {v.funcaoNome}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                v.modalidade === 'ITINERANTE'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'text-slate-700'
                              }`}
                            >
                              {v.modalidade} {v.diasSemana ? `(${v.diasSemana}x)` : ''}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{v.origem}</TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[10px] ${
                                v.status === 'OCUPADA'
                                  ? 'bg-blue-600 text-white'
                                  : v.status === 'EXCEDENTE'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {v.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {v.observacao || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal Adicionar Exceção SEMED */}
      <Dialog open={modalExcOpen} onOpenChange={setModalExcOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSalvarExcecao}>
            <DialogHeader>
              <DialogTitle>Autorizar Exceção SEMED</DialogTitle>
              <DialogDescription>
                Ajuste pontual de vagas para a unidade sem alteração da portaria regulamentar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="exc-fn">Função</Label>
                <Select value={excFuncaoId} onValueChange={setExcFuncaoId}>
                  <SelectTrigger id="exc-fn" className="bg-white">
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    {funcoes.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exc-delta">Variação (+ / - vagas)</Label>
                <Input
                  id="exc-delta"
                  type="number"
                  value={excDelta}
                  onChange={(e) => setExcDelta(Number(e.target.value))}
                  required
                />
                <span className="text-[11px] text-slate-500">
                  Valores positivos adicionam vagas extras; valores negativos reduzem vagas abertas.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exc-just">Justificativa / Parecer SEMED</Label>
                <Input
                  id="exc-just"
                  placeholder="Ex: Parecer Pedagógico SEMED nº 45/2026"
                  value={excJustificativa}
                  onChange={(e) => setExcJustificativa(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalExcOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                Autorizar Exceção
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
