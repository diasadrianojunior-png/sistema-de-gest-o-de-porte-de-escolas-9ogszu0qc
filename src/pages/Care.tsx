import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  UserCheck,
  Search,
  Sparkles,
  Info,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Eye,
  RefreshCw,
  Clock,
  Layers,
  GraduationCap,
  Building,
  Check,
  RotateCcw,
} from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getUnidadesEscolares } from '@/services/unidades-escolares'
import {
  getCareVagas,
  calcularPrevisaoGeracao,
  gerarVagasCare,
  updateCareVagaStatus,
  PrevisaoGeracaoResult,
} from '@/services/care'
import { CareVaga, CareStatusVaga, UnidadeEscolar } from '@/types/gestao-escolar'

// Intervalo de anos letivos padronizado no sistema (2020 a 2040)
export const ANOS_LETIVOS = Array.from({ length: 21 }, (_, i) => 2020 + i)

export default function Care() {
  const { toast } = useToast()
  const { canEdit } = useAuth()
  const podeEditarCare = canEdit('care')

  // Listas base
  const [unidades, setUnidades] = useState<UnidadeEscolar[]>([])
  const [vagas, setVagas] = useState<CareVaga[]>([])
  const [loading, setLoading] = useState(true)
  const [carregandoVagas, setCarregandoVagas] = useState(false)

  // Seleções do painel de geração automática
  // IMPORTANTE: comboboxes começam sem seleção (vazios), nunca auto-selecionam o primeiro
  const [gerarUnidadeId, setGerarUnidadeId] = useState<string>('')
  const [gerarAnoLetivo, setGerarAnoLetivo] = useState<string>('')

  // Estado da previsão calculada a partir do CRH
  const [previsao, setPrevisao] = useState<PrevisaoGeracaoResult | null>(null)
  const [calculandoPrevisao, setCalculandoPrevisao] = useState(false)
  const [erroPrevisao, setErroPrevisao] = useState<string | null>(null)

  // Diálogo de confirmação de geração
  const [dialogConfirmarGeracao, setDialogConfirmarGeracao] = useState(false)
  const [gerandoVagas, setGerandoVagas] = useState(false)

  // Filtros da listagem de vagas
  const [filtroUnidade, setFiltroUnidade] = useState<string>('todas')
  const [filtroAno, setFiltroAno] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [busca, setBusca] = useState<string>('')

  // Modal de Detalhes da Vaga
  const [detalheVaga, setDetalheVaga] = useState<CareVaga | null>(null)
  const [dialogDetalhesOpen, setDialogDetalhesOpen] = useState(false)

  // Modal de Edição de Status
  const [vagaEmEdicao, setVagaEmEdicao] = useState<CareVaga | null>(null)
  const [novoStatusSelecionado, setNovoStatusSelecionado] = useState<CareStatusVaga>('Preenchida')
  const [salvandoStatus, setSalvandoStatus] = useState(false)
  const [dialogStatusOpen, setDialogStatusOpen] = useState(false)

  // Carregar dados iniciais
  const carregarDadosIniciais = useCallback(async () => {
    try {
      setLoading(true)
      const [listaUnidades, listaVagas] = await Promise.all([
        getUnidadesEscolares(),
        getCareVagas(),
      ])
      setUnidades(listaUnidades)
      setVagas(listaVagas)
    } catch (err: any) {
      console.error('Erro ao carregar dados do CARE:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: err?.message || 'Falha ao buscar registros do banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    carregarDadosIniciais()
  }, [carregarDadosIniciais])

  // Recalcula a previsão sempre que unidade ou ano letivo forem alterados no painel de geração
  useEffect(() => {
    let ativo = true

    const atualizarPrevisao = async () => {
      if (!gerarUnidadeId || !gerarAnoLetivo) {
        setPrevisao(null)
        setErroPrevisao(null)
        return
      }

      setCalculandoPrevisao(true)
      setErroPrevisao(null)

      try {
        const res = await calcularPrevisaoGeracao(gerarUnidadeId, Number(gerarAnoLetivo))
        if (ativo) {
          setPrevisao(res)
          if (res.configuracoesValidas.length === 0) {
            setErroPrevisao(
              `Nenhuma configuração de RH (CRH) cadastrada para esta unidade no ano letivo ${gerarAnoLetivo}. Cadastre as regras no CRH antes de gerar as vagas.`,
            )
          }
        }
      } catch (err: any) {
        if (ativo) {
          console.error('Erro ao calcular previsão:', err)
          setErroPrevisao(err?.message || 'Erro ao calcular vagas com base no CRH.')
          setPrevisao(null)
        }
      } finally {
        if (ativo) {
          setCalculandoPrevisao(false)
        }
      }
    }

    atualizarPrevisao()

    return () => {
      ativo = false
    }
  }, [gerarUnidadeId, gerarAnoLetivo])

  // Unidade atualmente selecionada no painel de geração
  const unidadeSelecionada = useMemo(() => {
    return unidades.find((u) => u.id === gerarUnidadeId) || null
  }, [unidades, gerarUnidadeId])

  // Disparo da geração de vagas
  const handleConfirmarGeracao = async () => {
    if (!gerarUnidadeId || !gerarAnoLetivo || !previsao) return

    setGerandoVagas(true)
    try {
      const res = await gerarVagasCare(
        gerarUnidadeId,
        Number(gerarAnoLetivo),
        unidadeSelecionada?.nome,
      )

      // Atualiza lista de vagas
      const novasVagas = await getCareVagas()
      setVagas(novasVagas)

      // Ajusta os filtros da tabela para mostrar a unidade e ano recém-gerados
      setFiltroUnidade(gerarUnidadeId)
      setFiltroAno(String(gerarAnoLetivo))

      // Recalcula previsão após geração
      const novaPrevisao = await calcularPrevisaoGeracao(gerarUnidadeId, Number(gerarAnoLetivo))
      setPrevisao(novaPrevisao)

      setDialogConfirmarGeracao(false)

      if (res.totalCriadas > 0) {
        toast({
          title: 'Vagas geradas com sucesso!',
          description: `${res.totalCriadas} nova(s) vaga(s) criada(s) para ${unidadeSelecionada?.nome || 'a unidade'}. Todas inicializadas com status "Preenchida".`,
        })
      } else {
        toast({
          title: 'Idempotência verificada',
          description: `Todas as ${res.totalJaExistentes} vagas previstas para esta unidade e ano letivo já estão criadas. Nenhuma vaga duplicada.`,
        })
      }

      if (res.avisos.length > 0) {
        res.avisos.forEach((aviso) => {
          toast({
            title: 'Aviso de dimensionamento',
            description: aviso,
            variant: 'destructive',
          })
        })
      }
    } catch (err: any) {
      console.error('Erro ao gerar vagas:', err)
      toast({
        title: 'Erro na geração de vagas',
        description: err?.message || 'Falha ao processar as regras do CRH.',
        variant: 'destructive',
      })
    } finally {
      setGerandoVagas(false)
    }
  }

  // Alteração de status individual da vaga
  const handleAbrirEdicaoStatus = (vaga: CareVaga) => {
    setVagaEmEdicao(vaga)
    setNovoStatusSelecionado(vaga.status)
    setDialogStatusOpen(true)
  }

  const handleSalvarStatus = async () => {
    if (!vagaEmEdicao) return

    setSalvandoStatus(true)
    try {
      const atualizada = await updateCareVagaStatus(vagaEmEdicao.id, novoStatusSelecionado)

      setVagas((antigas) =>
        antigas.map((v) => (v.id === atualizada.id ? { ...v, status: atualizada.status } : v)),
      )

      if (detalheVaga && detalheVaga.id === atualizada.id) {
        setDetalheVaga({ ...detalheVaga, status: atualizada.status })
      }

      toast({
        title: 'Status atualizado com sucesso',
        description: `Vaga ${atualizada.codigo} alterada para "${atualizada.status}". Registrado em auditoria.`,
      })

      setDialogStatusOpen(false)
      setVagaEmEdicao(null)
    } catch (err: any) {
      console.error('Erro ao alterar status:', err)
      toast({
        title: 'Falha ao alterar status',
        description: err?.message || 'Não foi possível atualizar o status da vaga.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoStatus(false)
    }
  }

  // Recarregar listagem manualmente
  const handleRecarregar = async () => {
    try {
      setCarregandoVagas(true)
      const listaVagas = await getCareVagas()
      setVagas(listaVagas)
      if (gerarUnidadeId && gerarAnoLetivo) {
        const p = await calcularPrevisaoGeracao(gerarUnidadeId, Number(gerarAnoLetivo))
        setPrevisao(p)
      }
      toast({ title: 'Dados atualizados', description: 'Listagem de vagas recarregada.' })
    } catch (err: any) {
      toast({
        title: 'Erro ao recarregar',
        description: err?.message || 'Não foi possível recarregar os dados.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoVagas(false)
    }
  }

  // Filtragem das vagas da tabela
  const vagasFiltradas = useMemo(() => {
    return vagas.filter((v) => {
      if (filtroUnidade !== 'todas' && v.unidade_escolar_id !== filtroUnidade) {
        return false
      }
      if (filtroAno !== 'todos' && String(v.ano_letivo) !== filtroAno) {
        return false
      }
      if (filtroStatus !== 'todos' && v.status !== filtroStatus) {
        return false
      }

      if (busca.trim()) {
        const q = busca.trim().toLowerCase()
        const matchCodigo = v.codigo?.toLowerCase().includes(q)
        const matchCrhCodigo = v.crh_codigo?.toLowerCase().includes(q)
        const matchCargo = v.cargo?.nome?.toLowerCase().includes(q)
        const matchFuncao = v.funcao?.nome?.toLowerCase().includes(q)
        const matchUnidade = v.unidade_escolar?.nome?.toLowerCase().includes(q)
        const matchCriterio = v.criterio_dimensionamento?.toLowerCase().includes(q)
        const matchNatureza = v.natureza_cargo?.toLowerCase().includes(q)
        const matchStatus = v.status?.toLowerCase().includes(q)

        return (
          matchCodigo ||
          matchCrhCodigo ||
          matchCargo ||
          matchFuncao ||
          matchUnidade ||
          matchCriterio ||
          matchNatureza ||
          matchStatus
        )
      }

      return true
    })
  }, [vagas, filtroUnidade, filtroAno, filtroStatus, busca])

  // Contadores rápidos do filtro ativo
  const totalFiltradas = vagasFiltradas.length
  const totalPreenchidas = vagasFiltradas.filter((v) => v.status === 'Preenchida').length
  const totalAbertas = vagasFiltradas.filter((v) => v.status === 'Aberta').length

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Cadastro de Cargos e Funções (CARE)
              </h1>
              <p className="text-xs text-slate-600">
                Geração automática e conferência das vagas previstas por unidade escolar e ano
                letivo, integradas às regras oficiais do CRH.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecarregar}
            disabled={carregandoVagas || loading}
            className="text-xs h-9 text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${carregandoVagas ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* SEÇÃO 1: PAINEL DE GERAÇÃO AUTOMÁTICA A PARTIR DO CRH */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-slate-50/40 shadow-xs">
        <CardHeader className="pb-3 border-b border-blue-100/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-700" />
              <CardTitle className="text-sm font-semibold text-blue-950">
                Geração Automática de Vagas Previstas (Origem: CRH)
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="text-[11px] font-medium bg-blue-100/60 text-blue-800 border-blue-200"
            >
              Fonte Oficial: crh_configuracoes
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-600">
            Selecione a Unidade Escolar e o Ano Letivo para consultar a quantidade de vagas
            calculadas conforme tipo de atendimento, nível de porte, turmas e regras de
            dimensionamento do CRH.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Campo 1: Unidade Escolar (Combobox obrigatório, sem auto-selecionar) */}
            <div className="md:col-span-6 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-slate-500" />
                Unidade Escolar <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={gerarUnidadeId}
                onValueChange={(val) => {
                  setGerarUnidadeId(val)
                }}
              >
                <SelectTrigger className="text-xs bg-white">
                  <SelectValue placeholder="Selecione uma opção" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.nome} ({u.codigo || 'UN'}) — {u.tipo_atendimento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campo 2: Ano Letivo (Combobox obrigatório 2020 a 2040) */}
            <div className="md:col-span-3 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-slate-500" />
                Ano Letivo <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={gerarAnoLetivo}
                onValueChange={(val) => {
                  setGerarAnoLetivo(val)
                }}
              >
                <SelectTrigger className="text-xs bg-white">
                  <SelectValue placeholder="Selecione uma opção" />
                </SelectTrigger>
                <SelectContent>
                  {ANOS_LETIVOS.map((ano) => (
                    <SelectItem key={ano} value={String(ano)} className="text-xs">
                      Ano Letivo {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botão de Disparo da Geração */}
            <div className="md:col-span-3 flex items-center gap-2">
              <Button
                type="button"
                className="w-full text-xs font-semibold h-9 bg-blue-900 hover:bg-blue-950 text-white shadow-xs"
                disabled={
                  !gerarUnidadeId ||
                  !gerarAnoLetivo ||
                  calculandoPrevisao ||
                  !podeEditarCare ||
                  !previsao ||
                  previsao.configuracoesValidas.length === 0
                }
                onClick={() => setDialogConfirmarGeracao(true)}
              >
                {calculandoPrevisao ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-200" />
                    Gerar Vagas no CARE
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* PAINEL DE CONFERÊNCIA PRÉ-GERAÇÃO (FEEDBACK AO USUÁRIO) */}
          {gerarUnidadeId && gerarAnoLetivo && (
            <div className="mt-3 pt-3 border-t border-blue-100">
              {calculandoPrevisao && (
                <div className="flex items-center gap-2 py-3 text-xs text-blue-700">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-700" />
                  <span>Consultando regras do CRH e turmas vinculadas...</span>
                </div>
              )}

              {erroPrevisao && !calculandoPrevisao && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{erroPrevisao}</p>
                    <p className="mt-0.5 text-amber-800">
                      O CARE não pode gerar vagas sem regras cadastradas no CRH para a unidade e ano
                      selecionados.
                    </p>
                  </div>
                </div>
              )}

              {previsao && !calculandoPrevisao && previsao.configuracoesValidas.length > 0 && (
                <div className="space-y-3">
                  {/* Resumo em cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-lg bg-white border border-slate-200">
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                        Regras no CRH
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {previsao.configuracoesValidas.length}
                      </span>
                      <span className="text-[10px] text-slate-500 block">cargos/funções</span>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-slate-200">
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                        Turmas Vinculadas
                      </span>
                      <span className="text-lg font-bold text-blue-900">
                        {previsao.totalTurmasUnidade}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ano {previsao.anoLetivo}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-slate-200">
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                        Total Previsto
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {previsao.totalVagasPrevistas}
                      </span>
                      <span className="text-[10px] text-slate-500 block">vagas calculadas</span>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-blue-300 bg-blue-50/50">
                      <span className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider block">
                        A Criar Agora
                      </span>
                      <span className="text-lg font-bold text-blue-950">
                        {previsao.totalVagasACriar}
                      </span>
                      <span className="text-[10px] text-blue-700 block">
                        {previsao.totalVagasExistentes} já existentes
                      </span>
                    </div>
                  </div>

                  {/* Avisos de consistência */}
                  {previsao.totalVagasExcedentesOuReduzidas > 0 && (
                    <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Aviso de Governança:</strong> Há{' '}
                        {previsao.totalVagasExcedentesOuReduzidas} vaga(s) com quantidade prevista
                        menor do que as já existentes no CARE. Nenhuma vaga será apagada
                        automaticamente.
                      </span>
                    </div>
                  )}

                  {previsao.totalVagasACriar === 0 && previsao.totalVagasExistentes > 0 && (
                    <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        Todas as {previsao.totalVagasExistentes} vagas previstas no CRH para esta
                        unidade já foram criadas no CARE (idempotência confirmada).
                      </span>
                    </div>
                  )}

                  {/* Tabela de conferência item a item */}
                  <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Conferência de Dimensionamento por Cargo/Função</span>
                      <span className="font-normal text-slate-500 text-[11px]">
                        Previsão individual
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-48">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/70 text-slate-600 sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3 font-medium">CRH Origem</th>
                            <th className="py-2 px-3 font-medium">Cargo</th>
                            <th className="py-2 px-3 font-medium">Função</th>
                            <th className="py-2 px-3 font-medium">Critério</th>
                            <th className="py-2 px-3 font-medium text-center">Previsto</th>
                            <th className="py-2 px-3 font-medium text-center">Existente</th>
                            <th className="py-2 px-3 font-medium text-center">A Criar</th>
                            <th className="py-2 px-3 font-medium">Cálculo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previsao.itensPrevisao.map((item) => (
                            <tr key={item.crh.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono text-[11px] text-blue-700 font-semibold">
                                {item.crh.codigo || 'CRH'}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900">
                                {item.crh.cargo?.nome || '—'}
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                {item.crh.funcao?.nome || '—'}
                              </td>
                              <td className="py-2 px-3">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] py-0 px-1.5 font-normal"
                                >
                                  {item.criterio}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-900">
                                {item.totalPrevisto}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600">
                                {item.vagasExistentes}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`font-bold ${
                                    item.vagasACriar > 0 ? 'text-blue-700' : 'text-slate-400'
                                  }`}
                                >
                                  {item.vagasACriar}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-[11px] text-slate-500 font-mono">
                                {item.detalheCalculo}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 2: LISTAGEM DE VAGAS GERADAS (CARE) */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Vagas Cadastradas no CARE
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Listagem detalhada das vagas geradas a partir do CRH. Cada vaga possui identificador
                único (VAG-XXXX), rastreabilidade da configuração de origem e status individual.
              </CardDescription>
            </div>

            {/* Contadores da listagem filtrada */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Total:</span>
              <Badge variant="outline" className="font-semibold text-slate-800">
                {totalFiltradas} vaga(s)
              </Badge>
              <Badge className="bg-emerald-600 text-white font-medium text-[11px]">
                {totalPreenchidas} Preenchida(s)
              </Badge>
              <Badge className="bg-amber-600 text-white font-medium text-[11px]">
                {totalAbertas} Aberta(s)
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* BARRA DE FILTROS E BUSCA */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {/* Busca textual */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por vaga (VAG-XXXX), CRH, cargo, função, escola..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Filtro Unidade Escolar */}
            <div className="w-full sm:w-56">
              <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs">
                    Todas as unidades
                  </SelectItem>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.nome} ({u.codigo || 'UN'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Ano Letivo */}
            <div className="w-full sm:w-40">
              <Select value={filtroAno} onValueChange={setFiltroAno}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Ano Letivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos os anos
                  </SelectItem>
                  {ANOS_LETIVOS.map((ano) => (
                    <SelectItem key={ano} value={String(ano)} className="text-xs">
                      Ano {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Status */}
            <div className="w-full sm:w-36">
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos os status
                  </SelectItem>
                  <SelectItem value="Preenchida" className="text-xs">
                    Preenchida
                  </SelectItem>
                  <SelectItem value="Aberta" className="text-xs">
                    Aberta
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limpar filtros */}
            {(busca ||
              filtroUnidade !== 'todas' ||
              filtroAno !== 'todos' ||
              filtroStatus !== 'todos') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBusca('')
                  setFiltroUnidade('todas')
                  setFiltroAno('todos')
                  setFiltroStatus('todos')
                }}
                className="text-xs text-slate-600 hover:text-slate-900 h-9 shrink-0"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* TABELA DE VAGAS */}
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-28">Identificador</th>
                    <th className="py-3 px-3">Unidade Escolar</th>
                    <th className="py-3 px-3 w-24 text-center">Ano Letivo</th>
                    <th className="py-3 px-3">Cargo</th>
                    <th className="py-3 px-3">Função</th>
                    <th className="py-3 px-3 text-center">Seq / Qtd Ref</th>
                    <th className="py-3 px-3">Critério / Natureza</th>
                    <th className="py-3 px-3">Origem CRH</th>
                    <th className="py-3 px-3 text-center w-28">Status</th>
                    <th className="py-3 px-3 text-right w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vagasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-500">
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-700" />
                            <span>Carregando vagas do CARE...</span>
                          </div>
                        ) : vagas.length === 0 ? (
                          <div className="max-w-md mx-auto space-y-2">
                            <UserCheck className="h-8 w-8 text-slate-300 mx-auto" />
                            <p className="font-semibold text-slate-700">
                              Nenhuma vaga gerada no sistema ainda
                            </p>
                            <p className="text-xs text-slate-500">
                              Selecione uma Unidade Escolar e o Ano Letivo no painel acima para
                              gerar automaticamente as vagas com base nas regras do CRH.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-700">
                              Nenhuma vaga encontrada com os filtros informados
                            </p>
                            <p className="text-xs text-slate-500">
                              Tente ajustar a busca ou limpar os filtros de unidade/ano/status.
                            </p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    vagasFiltradas.map((v) => {
                      const isPreenchida = v.status === 'Preenchida'
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* Identificador VAG-XXXX */}
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {v.codigo || 'VAG-????'}
                            </span>
                          </td>

                          {/* Unidade Escolar */}
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">
                                {v.unidade_escolar?.nome || '—'}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500">
                                {v.unidade_escolar?.codigo || 'UN'}
                              </span>
                            </div>
                          </td>

                          {/* Ano Letivo */}
                          <td className="py-3 px-3 text-center">
                            <Badge
                              variant="outline"
                              className="font-semibold text-slate-800 text-[11px]"
                            >
                              {v.ano_letivo}
                            </Badge>
                          </td>

                          {/* Cargo */}
                          <td className="py-3 px-3 font-medium text-slate-900">
                            {v.cargo?.nome || '—'}
                          </td>

                          {/* Função */}
                          <td className="py-3 px-3 text-slate-700">{v.funcao?.nome || '—'}</td>

                          {/* Seq / Qtd Ref */}
                          <td className="py-3 px-3 text-center">
                            <span className="text-slate-800 font-medium">
                              Vaga {v.numero_sequencial_vaga}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              (Base: {v.quantidade_referencia})
                            </span>
                          </td>

                          {/* Critério / Natureza */}
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] font-medium text-slate-700">
                                {v.criterio_dimensionamento}
                              </span>
                              <span className="text-[10px] text-slate-500">{v.natureza_cargo}</span>
                            </div>
                          </td>

                          {/* Código da Configuração CRH */}
                          <td className="py-3 px-3">
                            <span className="font-mono text-[11px] font-semibold text-blue-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {v.crh_codigo || v.crh_configuracao?.codigo || 'CRH-XXXX'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <Badge
                              className={`text-[11px] font-medium ${
                                isPreenchida
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
                              }`}
                            >
                              {v.status}
                            </Badge>
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDetalheVaga(v)
                                  setDialogDetalhesOpen(true)
                                }}
                                title="Visualizar Detalhes da Vaga"
                                className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              {podeEditarCare && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAbrirEdicaoStatus(v)}
                                  title="Alterar Status da Vaga"
                                  className="h-7 text-[11px] px-2 text-blue-700 hover:text-blue-900 hover:bg-blue-50 font-medium"
                                >
                                  Status
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIÁLOGO 1: CONFIRMAR GERAÇÃO AUTOMÁTICA */}
      <Dialog open={dialogConfirmarGeracao} onOpenChange={setDialogConfirmarGeracao}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-700" />
              Confirmar Geração de Vagas no CARE
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Confira os dados antes de iniciar a geração automática a partir do CRH.
            </DialogDescription>
          </DialogHeader>

          {previsao && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Unidade Escolar:</span>
                  <span className="font-semibold text-slate-900">
                    {unidadeSelecionada?.nome} ({unidadeSelecionada?.codigo || 'UN'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ano Letivo:</span>
                  <span className="font-semibold text-slate-900">{previsao.anoLetivo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Turmas Vinculadas à Unidade:</span>
                  <span className="font-semibold text-blue-900">
                    {previsao.totalTurmasUnidade} turma(s)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Regras CRH Encontradas:</span>
                  <span className="font-semibold text-slate-900">
                    {previsao.configuracoesValidas.length} configuração(ões)
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>Novas Vagas a Criar Nesta Execução:</span>
                  <span className="text-lg text-blue-900 font-mono">
                    {previsao.totalVagasACriar}
                  </span>
                </div>
                <div className="text-[11px] text-blue-800 space-y-1">
                  <p>• Total previsto pelo cálculo: {previsao.totalVagasPrevistas} vaga(s).</p>
                  <p>
                    • Vagas já cadastradas anteriormente: {previsao.totalVagasExistentes} vaga(s).
                  </p>
                  <p className="font-semibold text-blue-900">
                    • Regra de negócio: TODAS as novas vagas nascerão com status
                    &quot;Preenchida&quot;.
                  </p>
                </div>
              </div>

              {previsao.totalVagasACriar === 0 && (
                <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                  Todas as vagas já foram criadas anteriormente. Nenhuma ação necessária.
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogConfirmarGeracao(false)}
              disabled={gerandoVagas}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarGeracao}
              disabled={gerandoVagas || previsao?.totalVagasACriar === 0}
              className="text-xs bg-blue-900 hover:bg-blue-950 text-white font-semibold"
            >
              {gerandoVagas ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Gerando vagas...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Confirmar e Gerar ({previsao?.totalVagasACriar || 0})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO 2: VISUALIZAR DETALHES DA VAGA (RASTREABILIDADE) */}
      <Dialog open={dialogDetalhesOpen} onOpenChange={setDialogDetalhesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-800" />
              Detalhes da Vaga no CARE
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Rastreabilidade completa da vaga e da configuração de origem no CRH.
            </DialogDescription>
          </DialogHeader>

          {detalheVaga && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Identificador da Vaga
                  </span>
                  <span className="font-mono text-sm font-bold text-blue-900">
                    {detalheVaga.codigo}
                  </span>
                </div>

                <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Status Atual
                  </span>
                  <Badge
                    className={`text-[11px] mt-0.5 ${
                      detalheVaga.status === 'Preenchida'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    {detalheVaga.status}
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Unidade Escolar
                  </span>
                  <span className="font-medium text-slate-900">
                    {detalheVaga.unidade_escolar?.nome} (
                    {detalheVaga.unidade_escolar?.codigo || 'UN'})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Ano Letivo
                    </span>
                    <span className="font-medium text-slate-800">{detalheVaga.ano_letivo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Vaga Sequencial
                    </span>
                    <span className="font-medium text-slate-800">
                      Vaga {detalheVaga.numero_sequencial_vaga} de{' '}
                      {detalheVaga.quantidade_referencia} prevista(s)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Cargo
                    </span>
                    <span className="font-medium text-slate-900">
                      {detalheVaga.cargo?.nome || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Função
                    </span>
                    <span className="font-medium text-slate-900">
                      {detalheVaga.funcao?.nome || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloco de Rastreabilidade CRH */}
              <div className="p-3 rounded-md bg-blue-50/70 border border-blue-200 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-blue-900 block">
                  Rastreabilidade CRH de Origem
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-800">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Código CRH:</span>
                    <span className="font-mono font-semibold text-blue-800">
                      {detalheVaga.crh_codigo || detalheVaga.crh_configuracao?.codigo || 'CRH'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Critério:</span>
                    <span className="font-medium">{detalheVaga.criterio_dimensionamento}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Natureza:</span>
                    <span className="font-medium">{detalheVaga.natureza_cargo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Qtd. Referência CRH:</span>
                    <span className="font-medium">{detalheVaga.quantidade_referencia}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogDetalhesOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
            {podeEditarCare && detalheVaga && (
              <Button
                size="sm"
                onClick={() => {
                  setDialogDetalhesOpen(false)
                  handleAbrirEdicaoStatus(detalheVaga)
                }}
                className="text-xs bg-blue-900 hover:bg-blue-950 text-white"
              >
                Alterar Status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO 3: EDITAR STATUS INDIVIDUAL DA VAGA */}
      <Dialog open={dialogStatusOpen} onOpenChange={setDialogStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-800" />
              Alterar Status da Vaga
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Atualize o status individual desta vaga. A alteração será registrada na Auditoria.
            </DialogDescription>
          </DialogHeader>

          {vagaEmEdicao && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <p>
                  <strong className="text-slate-700">Vaga:</strong>{' '}
                  <span className="font-mono text-blue-900 font-bold">{vagaEmEdicao.codigo}</span>
                </p>
                <p>
                  <strong className="text-slate-700">Cargo / Função:</strong>{' '}
                  {vagaEmEdicao.cargo?.nome} — {vagaEmEdicao.funcao?.nome}
                </p>
                <p>
                  <strong className="text-slate-700">Unidade:</strong>{' '}
                  {vagaEmEdicao.unidade_escolar?.nome} ({vagaEmEdicao.ano_letivo})
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Novo Status da Vaga <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={novoStatusSelecionado}
                  onValueChange={(val) => setNovoStatusSelecionado(val as CareStatusVaga)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preenchida" className="text-xs">
                      Preenchida (vaga ocupada)
                    </SelectItem>
                    <SelectItem value="Aberta" className="text-xs">
                      Aberta (vaga disponível/a preencher)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogStatusOpen(false)}
              disabled={salvandoStatus}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarStatus}
              disabled={salvandoStatus}
              className="text-xs bg-blue-900 hover:bg-blue-950 text-white font-semibold"
            >
              {salvandoStatus ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Salvar Alteração
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
