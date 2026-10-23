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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { getFuncoes } from '@/services/apoio'
import {
  getRhVersoes,
  getRhTiposAtendimento,
  getRhNiveis,
  getRhRegrasNivel,
  salvarRhNivel,
  deleteRhNivel,
  salvarRhRegraNivel,
} from '@/services/rh-configuracoes'
import { validarContiguidadeNiveis } from '@/services/rh-calculo'
import {
  RhVersaoConfiguracao,
  RhTipoAtendimento,
  RhNivel,
  RhRegraNivel,
  Funcao,
  BaseCalculoRegraNivel,
  ModalidadeVaga,
} from '@/types/gestao-escolar'
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  HelpCircle,
} from 'lucide-react'

export default function RhNiveisRegrasPage() {
  const { canEdit } = useAuth()
  const podeEditar = canEdit('rh_niveis_regras')
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [versoes, setVersoes] = useState<RhVersaoConfiguracao[]>([])
  const [versaoSelecionadaId, setVersaoSelecionadaId] = useState<string>('')

  const [tipos, setTipos] = useState<RhTipoAtendimento[]>([])
  const [tipoAtivoId, setTipoAtivoId] = useState<string>('')

  const [niveis, setNiveis] = useState<RhNivel[]>([])
  const [funcoes, setFuncoes] = useState<Funcao[]>([])
  const [regras, setRegras] = useState<RhRegraNivel[]>([])

  // Modal Nível
  const [modalNivelOpen, setModalNivelOpen] = useState(false)
  const [nivelEditando, setNivelEditando] = useState<RhNivel | null>(null)
  const [codigoNivel, setCodigoNivel] = useState('')
  const [minAlunos, setMinAlunos] = useState<number>(0)
  const [maxAlunos, setMaxAlunos] = useState<string>('')
  const [ordemNivel, setOrdemNivel] = useState<number>(1)

  // Modal Regra
  const [modalRegraOpen, setModalRegraOpen] = useState(false)
  const [regraEditando, setRegraEditando] = useState<{
    nivel: RhNivel
    funcao: Funcao
    regra: RhRegraNivel | null
  } | null>(null)
  const [qtdRegra, setQtdRegra] = useState<number>(1)
  const [baseCalculo, setBaseCalculo] = useState<BaseCalculoRegraNivel>('FIXO_ESCOLA')
  const [modalidade, setModalidade] = useState<ModalidadeVaga>('FIXO')
  const [diasSemana, setDiasSemana] = useState<string>('')
  const [etapasFiltro, setEtapasFiltro] = useState<string>('')
  const [obsRegra, setObsRegra] = useState<string>('')

  const carregarDadosVersao = async (vId: string) => {
    if (!vId) return
    try {
      setLoading(true)
      const [tiposData, funcoesData, regrasData] = await Promise.all([
        getRhTiposAtendimento(vId),
        getFuncoes(),
        getRhRegrasNivel(vId),
      ])
      setTipos(tiposData)
      setFuncoes(funcoesData)
      setRegras(regrasData)

      if (tiposData.length > 0) {
        const primeiroTipo = tiposData[0]
        setTipoAtivoId(primeiroTipo.id)
        const niveisData = await getRhNiveis(vId, primeiroTipo.id)
        setNiveis(niveisData)
      } else {
        setNiveis([])
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTrocarTipo = async (novoTipoId: string) => {
    setTipoAtivoId(novoTipoId)
    try {
      const niveisData = await getRhNiveis(versaoSelecionadaId, novoTipoId)
      setNiveis(niveisData)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao trocar tipo', description: err.message })
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const versoesData = await getRhVersoes()
        setVersoes(versoesData)
        if (versoesData.length > 0) {
          const vig = versoesData.find((v) => v.status === 'VIGENTE') || versoesData[0]
          setVersaoSelecionadaId(vig.id)
          await carregarDadosVersao(vig.id)
        }
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Erro inicial', description: err.message })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const versaoAtual = versoes.find((v) => v.id === versaoSelecionadaId)
  const versaoBloqueada = versaoAtual?.status === 'ARQUIVADA'

  // Validação de contiguidade do tipo ativo
  const validacaoFaixas = validarContiguidadeNiveis(niveis)

  // Salvar Nível
  const handleAbrirCriarNivel = () => {
    setNivelEditando(null)
    setCodigoNivel('')
    // Sugere próximo min baseado no último nível
    const ult = niveis[niveis.length - 1]
    const proxMin = ult && ult.max_alunos !== null ? ult.max_alunos + 1 : 0
    setMinAlunos(proxMin)
    setMaxAlunos('')
    setOrdemNivel(niveis.length + 1)
    setModalNivelOpen(true)
  }

  const handleAbrirEditarNivel = (n: RhNivel) => {
    setNivelEditando(n)
    setCodigoNivel(n.codigo_nivel)
    setMinAlunos(n.min_alunos)
    setMaxAlunos(n.max_alunos !== null ? String(n.max_alunos) : '')
    setOrdemNivel(n.ordem)
    setModalNivelOpen(true)
  }

  const handleSalvarNivel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigoNivel.trim()) {
      toast({ variant: 'destructive', title: 'Informe o código do nível (ex: I, II, A, B)' })
      return
    }

    try {
      setSalvando(true)
      await salvarRhNivel(versaoSelecionadaId, {
        id: nivelEditando?.id,
        tipo_atendimento_id: tipoAtivoId,
        codigo_nivel: codigoNivel.trim(),
        min_alunos: minAlunos,
        max_alunos: maxAlunos.trim() === '' ? null : Number(maxAlunos),
        ordem: ordemNivel,
      })

      toast({ title: 'Nível salvo com sucesso' })
      setModalNivelOpen(false)
      const data = await getRhNiveis(versaoSelecionadaId, tipoAtivoId)
      setNiveis(data)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar nível', description: err.message })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluirNivel = async (n: RhNivel) => {
    if (
      !confirm(
        `Deseja realmente excluir o nível ${n.codigo_nivel}? Todas as suas regras associadas serão removidas.`,
      )
    )
      return
    try {
      setLoading(true)
      await deleteRhNivel(n.id)
      toast({ title: 'Nível excluído com sucesso' })
      const data = await getRhNiveis(versaoSelecionadaId, tipoAtivoId)
      setNiveis(data)
      const regrasData = await getRhRegrasNivel(versaoSelecionadaId)
      setRegras(regrasData)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir nível', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Mapa rápido de regras: nivelId_funcaoId -> RhRegraNivel
  const mapaRegras = new Map<string, RhRegraNivel>()
  for (const r of regras) {
    mapaRegras.set(`${r.nivel_id}_${r.funcao_id}`, r)
  }

  const handleAbrirEditarRegra = (nivel: RhNivel, funcao: Funcao) => {
    if (!podeEditar || versaoBloqueada) return
    const chave = `${nivel.id}_${funcao.id}`
    const r = mapaRegras.get(chave) || null

    setRegraEditando({ nivel, funcao, regra: r })
    setQtdRegra(r ? Number(r.quantidade) : 1)
    setBaseCalculo(r ? r.base_calculo : 'FIXO_ESCOLA')
    setModalidade(r ? r.modalidade : 'FIXO')
    setDiasSemana(r && r.dias_semana ? String(r.dias_semana) : '')
    setEtapasFiltro(r && r.etapas_filtro ? r.etapas_filtro.join(', ') : '')
    setObsRegra(r?.observacao || '')
    setModalRegraOpen(true)
  }

  const handleSalvarRegra = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regraEditando) return

    try {
      setSalvando(true)
      const etapasArray = etapasFiltro
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      await salvarRhRegraNivel({
        id: regraEditando.regra?.id,
        nivel_id: regraEditando.nivel.id,
        funcao_id: regraEditando.funcao.id,
        quantidade: qtdRegra,
        base_calculo: baseCalculo,
        modalidade,
        dias_semana: diasSemana.trim() ? Number(diasSemana) : null,
        etapas_filtro: etapasArray,
        observacao: obsRegra.trim() || null,
      })

      toast({ title: 'Regra salva com sucesso' })
      setModalRegraOpen(false)
      const regrasData = await getRhRegrasNivel(versaoSelecionadaId)
      setRegras(regrasData)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar regra', description: err.message })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-blue-600" />
            Tipos de Atendimento, Níveis e Regras
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Grade completa de dimensionamento (Função × Nível), idêntica ao Anexo II da Portaria
            regulamentar.
          </p>
        </div>

        {/* Versão */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500 font-medium">Versão:</Label>
          <Select
            value={versaoSelecionadaId}
            onValueChange={(val) => {
              setVersaoSelecionadaId(val)
              carregarDadosVersao(val)
            }}
          >
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {versoes.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.codigo || 'VER'} - {v.descricao} ({v.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs de Tipos de Atendimento */}
      {tipos.length > 0 && (
        <Tabs value={tipoAtivoId} onValueChange={handleTrocarTipo}>
          <div className="flex items-center justify-between border-b pb-2">
            <TabsList className="bg-slate-100 p-1">
              {tipos.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="text-xs font-semibold px-4">
                  {t.nome}
                </TabsTrigger>
              ))}
            </TabsList>

            {podeEditar && !versaoBloqueada && (
              <Button
                size="sm"
                onClick={handleAbrirCriarNivel}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1 h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Nível / Faixa
              </Button>
            )}
          </div>
        </Tabs>
      )}

      {/* Alerta de Validação de Faixas */}
      {!validacaoFaixas.valido && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block text-sm">
              Atenção: Inconsistência nas faixas de alunos!
            </strong>
            <p className="mt-1">
              Para publicação legal da portaria, as faixas devem ser perfeitamente contíguas, sem
              buracos e sem sobreposições:
            </p>
            <ul className="list-disc list-inside mt-1.5 space-y-0.5 font-medium">
              {validacaoFaixas.erros.map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Card da Matriz Função x Nível */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>Grade Função × Nível de Porte</span>
                {validacaoFaixas.valido && (
                  <Badge
                    variant="outline"
                    className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px] gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Faixas Contíguas
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Clique em qualquer célula de quantidade para ajustar a fórmula (FIXO_ESCOLA,
                POR_TURNO, POR_TURMA, POR_TURMA_ETAPA ou Itinerância).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Carregando regras do nível...</span>
            </div>
          ) : niveis.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Nenhum nível cadastrado para este tipo de atendimento.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                  <tr>
                    <th className="p-3 sticky left-0 bg-slate-100 z-10 border-r min-w-[220px]">
                      Função \ Nível
                    </th>
                    {niveis.map((n) => (
                      <th
                        key={n.id}
                        className="p-2 border-r min-w-[130px] text-center bg-slate-100"
                      >
                        <div className="flex items-center justify-center gap-1 font-bold text-slate-900 text-sm">
                          <span>Nível {n.codigo_nivel}</span>
                          {podeEditar && !versaoBloqueada && (
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => handleAbrirEditarNivel(n)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                                title="Editar faixa de alunos"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExcluirNivel(n)}
                                className="text-slate-400 hover:text-red-600 p-0.5 rounded"
                                title="Excluir nível"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {n.min_alunos} a {n.max_alunos !== null ? n.max_alunos : 'sem teto'}{' '}
                          alunos
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {funcoes.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 font-medium text-slate-900 sticky left-0 bg-white border-r z-10 shadow-xs">
                        <div className="font-semibold">{f.nome}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{f.codigo}</div>
                      </td>
                      {niveis.map((n) => {
                        const chave = `${n.id}_${f.id}`
                        const r = mapaRegras.get(chave)
                        const temRegra = Boolean(r)

                        return (
                          <td
                            key={n.id}
                            onClick={() => handleAbrirEditarRegra(n, f)}
                            className={`p-2 border-r text-center transition-colors cursor-pointer select-none ${
                              temRegra && Number(r.quantidade) > 0
                                ? 'bg-blue-50/40 hover:bg-blue-100/60'
                                : 'hover:bg-slate-100/50'
                            }`}
                          >
                            {temRegra ? (
                              <div className="flex flex-col items-center justify-center">
                                <span className="font-bold text-slate-900 text-sm">
                                  {r.quantidade}
                                </span>
                                <span className="text-[10px] font-semibold text-blue-700">
                                  {r.modalidade === 'ITINERANTE'
                                    ? `ITIN${r.dias_semana ? ` (${r.dias_semana}x)` : ''}`
                                    : r.base_calculo
                                        .replace('FIXO_ESCOLA', 'FIXO')
                                        .replace('POR_', '/')}
                                </span>
                                {r.base_calculo === 'POR_TURMA_ETAPA' && (
                                  <span
                                    className="text-[9px] text-slate-500 truncate max-w-[110px]"
                                    title={r.etapas_filtro?.join(', ')}
                                  >
                                    Etapas
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nível (Faixa) */}
      <Dialog open={modalNivelOpen} onOpenChange={setModalNivelOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSalvarNivel}>
            <DialogHeader>
              <DialogTitle>
                {nivelEditando ? 'Editar Faixa do Nível' : 'Novo Nível / Faixa'}
              </DialogTitle>
              <DialogDescription>
                Configure o código e o intervalo de matrículas consideradas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cod-nivel">Código do Nível</Label>
                  <Input
                    id="cod-nivel"
                    placeholder="Ex: I, II, A, B"
                    value={codigoNivel}
                    onChange={(e) => setCodigoNivel(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ordem-nivel">Ordem de Classificação</Label>
                  <Input
                    id="ordem-nivel"
                    type="number"
                    min={1}
                    value={ordemNivel}
                    onChange={(e) => setOrdemNivel(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="min-al">Mínimo de Alunos</Label>
                  <Input
                    id="min-al"
                    type="number"
                    min={0}
                    value={minAlunos}
                    onChange={(e) => setMinAlunos(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max-al">Máximo (Vazio = Sem Teto)</Label>
                  <Input
                    id="max-al"
                    type="number"
                    min={minAlunos}
                    placeholder="Sem teto"
                    value={maxAlunos}
                    onChange={(e) => setMaxAlunos(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalNivelOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Salvar Faixa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Regra do Nível */}
      <Dialog open={modalRegraOpen} onOpenChange={setModalRegraOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSalvarRegra}>
            <DialogHeader>
              <DialogTitle>Regra de Dimensionamento</DialogTitle>
              <DialogDescription>
                Defina a quantidade e a base de cálculo para{' '}
                <strong>{regraEditando?.funcao.nome}</strong> no{' '}
                <strong>Nível {regraEditando?.nivel.codigo_nivel}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qtd-regra">Quantidade</Label>
                  <Input
                    id="qtd-regra"
                    type="number"
                    step="0.5"
                    min={0}
                    value={qtdRegra}
                    onChange={(e) => setQtdRegra(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modalidade-regra">Modalidade</Label>
                  <Select value={modalidade} onValueChange={(val: any) => setModalidade(val)}>
                    <SelectTrigger id="modalidade-regra" className="bg-white">
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXO">FIXO</SelectItem>
                      <SelectItem value="ITINERANTE">ITINERANTE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="base-calc">Base de Cálculo</Label>
                <Select value={baseCalculo} onValueChange={(val: any) => setBaseCalculo(val)}>
                  <SelectTrigger id="base-calc" className="bg-white">
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXO_ESCOLA">
                      FIXO_ESCOLA — Quantidade fixa da unidade
                    </SelectItem>
                    <SelectItem value="POR_TURNO">POR_TURNO — Quantidade × Nº de Turnos</SelectItem>
                    <SelectItem value="POR_TURMA">
                      POR_TURMA — Quantidade × Nº Total de Turmas
                    </SelectItem>
                    <SelectItem value="POR_TURMA_ETAPA">
                      POR_TURMA_ETAPA — Quantidade × Nº de Turmas das Etapas Selecionadas
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {modalidade === 'ITINERANTE' && (
                <div className="space-y-1.5">
                  <Label htmlFor="dias-sem">Frequência Semanal (Dias/Semana)</Label>
                  <Input
                    id="dias-sem"
                    type="number"
                    min={1}
                    max={5}
                    placeholder="Ex: 2 (para 2x por semana)"
                    value={diasSemana}
                    onChange={(e) => setDiasSemana(e.target.value)}
                  />
                </div>
              )}

              {baseCalculo === 'POR_TURMA_ETAPA' && (
                <div className="space-y-1.5">
                  <Label htmlFor="etapas-filtro">Etapas Consideradas (separadas por vírgula)</Label>
                  <Input
                    id="etapas-filtro"
                    placeholder="Ex: INFANTIL, INFANTIL_I, INFANTIL_II"
                    value={etapasFiltro}
                    onChange={(e) => setEtapasFiltro(e.target.value)}
                  />
                  <span className="text-[11px] text-slate-500">
                    Apenas turmas correspondentes a estas etapas serão multiplicadas.
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="obs-regra">Observação Regulamentar (Opcional)</Label>
                <Input
                  id="obs-regra"
                  placeholder="Ex: Art. 8º da Portaria"
                  value={obsRegra}
                  onChange={(e) => setObsRegra(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalRegraOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Salvar Regra
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
