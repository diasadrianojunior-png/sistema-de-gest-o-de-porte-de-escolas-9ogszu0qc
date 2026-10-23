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
import { getFuncoes } from '@/services/apoio'
import {
  getRhVersoes,
  getRhTiposAtendimento,
  getRhRegrasTurmas,
  salvarRhRegraTurma,
  deleteRhRegraTurma,
} from '@/services/rh-configuracoes'
import {
  RhVersaoConfiguracao,
  RhTipoAtendimento,
  RhRegraPorTurmas,
  Funcao,
} from '@/types/gestao-escolar'
import { Users2, Plus, Trash2, Edit2, Loader2, Sparkles } from 'lucide-react'

export default function RhRegrasTurmasPage() {
  const { canEdit } = useAuth()
  const podeEditar = canEdit('rh_regras_turmas')
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [versoes, setVersoes] = useState<RhVersaoConfiguracao[]>([])
  const [versaoSelecionadaId, setVersaoSelecionadaId] = useState<string>('')

  const [tipos, setTipos] = useState<RhTipoAtendimento[]>([])
  const [funcoes, setFuncoes] = useState<Funcao[]>([])
  const [regras, setRegras] = useState<RhRegraPorTurmas[]>([])

  // Modal Regra
  const [modalOpen, setModalOpen] = useState(false)
  const [regraEditando, setRegraEditando] = useState<RhRegraPorTurmas | null>(null)
  const [funcaoId, setFuncaoId] = useState('')
  const [tipoAtendimentoId, setTipoAtendimentoId] = useState<string>('todos')
  const [minTurmas, setMinTurmas] = useState<number>(1)
  const [maxTurmas, setMaxTurmas] = useState<string>('')
  const [qtdFixo, setQtdFixo] = useState<number>(0)
  const [qtdItinerante, setQtdItinerante] = useState<number>(0)

  const carregarDadosVersao = async (vId: string) => {
    if (!vId) return
    try {
      setLoading(true)
      const [tiposData, funcoesData, regrasData] = await Promise.all([
        getRhTiposAtendimento(vId),
        getFuncoes(),
        getRhRegrasTurmas(vId),
      ])
      setTipos(tiposData)
      setFuncoes(funcoesData)
      setRegras(regrasData)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: err.message })
    } finally {
      setLoading(false)
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

  const handleAbrirCriar = () => {
    setRegraEditando(null)
    setFuncaoId('')
    setTipoAtendimentoId('todos')
    setMinTurmas(1)
    setMaxTurmas('')
    setQtdFixo(0)
    setQtdItinerante(1)
    setModalOpen(true)
  }

  const handleAbrirEditar = (r: RhRegraPorTurmas) => {
    setRegraEditando(r)
    setFuncaoId(r.funcao_id)
    setTipoAtendimentoId(r.tipo_atendimento_id || 'todos')
    setMinTurmas(r.min_turmas)
    setMaxTurmas(r.max_turmas !== null && r.max_turmas !== undefined ? String(r.max_turmas) : '')
    setQtdFixo(r.qtd_fixo)
    setQtdItinerante(r.qtd_itinerante)
    setModalOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!funcaoId) {
      toast({ variant: 'destructive', title: 'Selecione a função correspondente' })
      return
    }

    try {
      setSalvando(true)
      await salvarRhRegraTurma(versaoSelecionadaId, {
        id: regraEditando?.id,
        funcao_id: funcaoId,
        tipo_atendimento_id: tipoAtendimentoId === 'todos' ? null : tipoAtendimentoId,
        min_turmas: minTurmas,
        max_turmas: maxTurmas.trim() === '' ? null : Number(maxTurmas),
        qtd_fixo: qtdFixo,
        qtd_itinerante: qtdItinerante,
      })

      toast({ title: 'Regra salva com sucesso' })
      setModalOpen(false)
      const data = await getRhRegrasTurmas(versaoSelecionadaId)
      setRegras(data)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar regra', description: err.message })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (r: RhRegraPorTurmas) => {
    if (!confirm('Deseja excluir esta faixa de regra por turmas?')) return
    try {
      setLoading(true)
      await deleteRhRegraTurma(r.id)
      toast({ title: 'Regra excluída' })
      const data = await getRhRegrasTurmas(versaoSelecionadaId)
      setRegras(data)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir regra', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Agrupamento por Função para melhor visualização
  const gruposPorFuncao = new Map<string, RhRegraPorTurmas[]>()
  for (const r of regras) {
    const fnNome = r.funcao?.nome || 'Especialista'
    const list = gruposPorFuncao.get(fnNome) || []
    list.push(r)
    gruposPorFuncao.set(fnNome, list)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users2 className="w-6 h-6 text-blue-600" />
            Regras por Número de Turmas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dimensionamento escalonado para professores especialistas (Arte, Educação Física, R2)
            por faixas de turmas.
          </p>
        </div>

        {/* Versão e Botão Novo */}
        <div className="flex items-center gap-3">
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

          {podeEditar && !versaoBloqueada && (
            <Button
              onClick={handleAbrirCriar}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nova Faixa
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center items-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando regras por turmas...</span>
        </div>
      ) : regras.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-slate-500">
            Nenhuma regra por turmas cadastrada para esta versão.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(gruposPorFuncao.entries()).map(([fnNome, regrasList]) => (
            <Card key={fnNome}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    {fnNome}
                  </span>
                  <Badge variant="outline">{regrasList.length} faixa(s)</Badge>
                </CardTitle>
                <CardDescription>
                  Escalonamento de vagas fixas e itinerantes conforme a quantidade total de turmas
                  da escola.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Código</TableHead>
                        <TableHead>Faixa de Turmas</TableHead>
                        <TableHead>Tipo de Atendimento</TableHead>
                        <TableHead className="text-center w-36">Vagas FIXAS</TableHead>
                        <TableHead className="text-center w-36">Vagas ITINERANTES</TableHead>
                        <TableHead className="text-center w-32">Total</TableHead>
                        <TableHead className="text-right w-28">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regrasList
                        .sort((a, b) => a.min_turmas - b.min_turmas)
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                            <TableCell className="font-semibold text-slate-900">
                              {r.min_turmas}{' '}
                              {r.max_turmas !== null && r.max_turmas !== undefined
                                ? `a ${r.max_turmas}`
                                : 'ou mais'}{' '}
                              turmas
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {r.tipo_atendimento ? r.tipo_atendimento.nome : 'Todos os Tipos'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-bold text-slate-800">
                                {r.qtd_fixo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className="font-bold text-blue-700 bg-blue-50 border-blue-200"
                              >
                                {r.qtd_itinerante}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-900">
                              {r.qtd_fixo + r.qtd_itinerante} vaga(s)
                            </TableCell>
                            <TableCell className="text-right">
                              {podeEditar && !versaoBloqueada && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleAbrirEditar(r)}
                                    className="h-8 w-8 text-slate-500 hover:text-slate-800"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleExcluir(r)}
                                    className="h-8 w-8 text-slate-500 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSalvar}>
            <DialogHeader>
              <DialogTitle>
                {regraEditando ? 'Editar Faixa de Turmas' : 'Nova Faixa por Turmas'}
              </DialogTitle>
              <DialogDescription>
                Define as quantidades de vagas fixas e itinerantes geradas para um intervalo de
                turmas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="fn-sel">Função</Label>
                <Select value={funcaoId} onValueChange={setFuncaoId}>
                  <SelectTrigger id="fn-sel" className="bg-white">
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    {funcoes.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome} ({f.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tipo-atend-sel">Tipo de Atendimento Aplicável</Label>
                <Select value={tipoAtendimentoId} onValueChange={setTipoAtendimentoId}>
                  <SelectTrigger id="tipo-atend-sel" className="bg-white">
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos de Atendimento</SelectItem>
                    {tipos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="min-turmas">Mínimo de Turmas</Label>
                  <Input
                    id="min-turmas"
                    type="number"
                    min={1}
                    value={minTurmas}
                    onChange={(e) => setMinTurmas(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max-turmas">Máximo (Vazio = Sem Teto)</Label>
                  <Input
                    id="max-turmas"
                    type="number"
                    min={minTurmas}
                    placeholder="Sem teto"
                    value={maxTurmas}
                    onChange={(e) => setMaxTurmas(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qtd-fixo">Vagas FIXAS</Label>
                  <Input
                    id="qtd-fixo"
                    type="number"
                    min={0}
                    value={qtdFixo}
                    onChange={(e) => setQtdFixo(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qtd-itin">Vagas ITINERANTES</Label>
                  <Input
                    id="qtd-itin"
                    type="number"
                    min={0}
                    value={qtdItinerante}
                    onChange={(e) => setQtdItinerante(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
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
    </div>
  )
}
