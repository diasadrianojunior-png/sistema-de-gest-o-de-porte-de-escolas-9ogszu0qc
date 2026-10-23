import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  getRhVersoes,
  getRhTiposAtendimento,
  getRhNiveis,
  getRhRegrasNivel,
  getRhRegrasTurmas,
  getRhLotacoes,
} from '@/services/rh-configuracoes'
import { calcularVagasPorte } from '@/services/rh-calculo'
import {
  UnidadeEscolar,
  RhVersaoConfiguracao,
  RhTipoAtendimento,
  RhNivel,
} from '@/types/gestao-escolar'
import { LayoutDashboard, Loader2, RefreshCw, Filter, Sparkles, Building2 } from 'lucide-react'

interface LinhaPainelGeral {
  escola: UnidadeEscolar
  tipoAtendimentoNome: string
  alunosTotal: number
  alunosConsiderados: number
  nivelCodigo: string
  totalPrevisto: number
  totalLotado: number
  saldo: number
  situacao: 'DÉFICIT' | 'OK' | 'EXCEDENTE'
}

export default function RhPainelGeralPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [calculandoLote, setCalculandoLote] = useState(false)

  const [versoes, setVersoes] = useState<RhVersaoConfiguracao[]>([])
  const [versaoSelecionadaId, setVersaoSelecionadaId] = useState<string>('')
  const [anoLetivo, setAnoLetivo] = useState<number>(2026)

  const [linhas, setLinhas] = useState<LinhaPainelGeral[]>([])
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroNivel, setFiltroNivel] = useState<string>('todos')

  const carregarPainel = async (vId: string) => {
    if (!vId) return
    try {
      setCalculandoLote(true)
      const [escolas, tipos, niveis, regrasNivel, regrasTurmas, todasTurmas, todasLotacoes] =
        await Promise.all([
          getUnidadesEscolares(),
          getRhTiposAtendimento(vId),
          getRhNiveis(vId),
          getRhRegrasNivel(vId),
          getRhRegrasTurmas(vId),
          getTurmas(),
          getRhLotacoes(),
        ])

      const mapaTipos = new Map<string, RhTipoAtendimento>(tipos.map((t) => [t.id, t]))
      const mapaTiposPorNome = new Map<string, RhTipoAtendimento>(tipos.map((t) => [t.nome, t]))

      const novasLinhas: LinhaPainelGeral[] = []

      for (const esc of escolas) {
        // Achar tipo de atendimento correspondente
        let tipo = mapaTiposPorNome.get(esc.tipo_atendimento || '')
        if (!tipo && tipos.length > 0) tipo = tipos[0]

        const niveisDoTipo = niveis.filter((n) => n.tipo_atendimento_id === tipo?.id)
        const turmasEscola = todasTurmas.filter(
          (t) => t.unidade_escolar_id === esc.id && t.ano_letivo === anoLetivo,
        )
        const lotacoesEscola = todasLotacoes.filter((l) => l.escola_id === esc.id)

        const alunosTot = esc.quantidade_alunos || 150
        const res = calcularVagasPorte({
          alunosTotal: alunosTot,
          alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
          modalidadesExcluidas: tipo?.modalidades_excluidas || [],
          niveisTipo: niveisDoTipo,
          regrasNivel,
          regrasTurmas,
          excecoesVagas: [],
          turnosEscola: ['MATUTINO', 'VESPERTINO'],
          turmas: turmasEscola.map((t) => ({
            etapaNome: t.etapa?.nome || 'Ensino',
            turno: 'MATUTINO',
          })),
          lotacoesAtuais: lotacoesEscola,
        })

        const totalPrevisto = res.vagasGeradas.filter((v) => v.status !== 'EXCEDENTE').length
        const totalLotado = lotacoesEscola.length
        const saldo = totalLotado - totalPrevisto

        let situacao: 'DÉFICIT' | 'OK' | 'EXCEDENTE' = 'OK'
        if (saldo < 0) situacao = 'DÉFICIT'
        else if (saldo > 0) situacao = 'EXCEDENTE'

        novasLinhas.push({
          escola: esc,
          tipoAtendimentoNome: tipo?.nome || esc.tipo_atendimento || 'Fundamental',
          alunosTotal: alunosTot,
          alunosConsiderados: res.alunosConsiderados,
          nivelCodigo: res.nivelAplicado?.codigo_nivel || 'I',
          totalPrevisto,
          totalLotado,
          saldo,
          situacao,
        })
      }

      setLinhas(novasLinhas)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao gerar painel', description: err.message })
    } finally {
      setCalculandoLote(false)
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
          await carregarPainel(vig.id)
        }
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Erro inicial', description: err.message })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Filtros aplicados
  const linhasFiltradas = linhas.filter((l) => {
    if (filtroTipo !== 'todos' && l.tipoAtendimentoNome !== filtroTipo) return false
    if (filtroNivel !== 'todos' && l.nivelCodigo !== filtroNivel) return false
    return true
  })

  // Agrupamento por Nível de Porte
  const gruposPorNivel = new Map<string, LinhaPainelGeral[]>()
  for (const l of linhasFiltradas) {
    const list = gruposPorNivel.get(l.nivelCodigo) || []
    list.push(l)
    gruposPorNivel.set(l.nivelCodigo, list)
  }

  // Totais Gerais
  const totalGeralAlunos = linhasFiltradas.reduce((acc, l) => acc + l.alunosTotal, 0)
  const totalGeralPrevisto = linhasFiltradas.reduce((acc, l) => acc + l.totalPrevisto, 0)
  const totalGeralLotado = linhasFiltradas.reduce((acc, l) => acc + l.totalLotado, 0)
  const totalGeralSaldo = totalGeralLotado - totalGeralPrevisto

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            Classificação Geral do Porte e Quadro da Rede
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visão consolidada de todas as unidades escolares agrupadas por nível de porte,
            confrontando ATUAL × PREVISTO.
          </p>
        </div>

        {/* Versão e Ação */}
        <div className="flex items-center gap-2">
          <Select
            value={versaoSelecionadaId}
            onValueChange={(val) => {
              setVersaoSelecionadaId(val)
              carregarPainel(val)
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarPainel(versaoSelecionadaId)}
            disabled={calculandoLote}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${calculandoLote ? 'animate-spin' : ''}`} />
            Recalcular Rede
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Consolidadas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white">
          <div className="text-xs font-semibold text-slate-500">Unidades Escolares</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{linhasFiltradas.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">escolas na portaria</div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="text-xs font-semibold text-slate-500">Alunos Atendidos</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {totalGeralAlunos.toLocaleString('pt-BR')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">matrículas na rede</div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="text-xs font-semibold text-slate-500">Vagas Dimensionadas (Porte)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalGeralPrevisto}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">postos de trabalho previstos</div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="text-xs font-semibold text-slate-500">
            Balanço Rede (Lotado × Previsto)
          </div>
          <div
            className={`text-2xl font-bold mt-1 ${
              totalGeralSaldo === 0
                ? 'text-emerald-600'
                : totalGeralSaldo < 0
                  ? 'text-red-600'
                  : 'text-amber-600'
            }`}
          >
            {totalGeralSaldo > 0 ? `+${totalGeralSaldo}` : totalGeralSaldo}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalGeralLotado} lotados atualmente
          </div>
        </Card>
      </div>

      {/* Tabela Agrupada por Nível */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Tabela "Classificação do Porte" da Rede Municipal</span>
            <Badge variant="outline">
              {Array.from(gruposPorNivel.keys()).length} Níveis em Operação
            </Badge>
          </CardTitle>
          <CardDescription>
            Confronto direto entre o quadro dimensionado e o efetivo atual de cada unidade de
            ensino.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || calculandoLote ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Calculando porte consolidado da rede...</span>
            </div>
          ) : linhasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Nenhuma escola encontrada para os critérios selecionados.
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(gruposPorNivel.entries()).map(([nivelCod, itensNivel]) => (
                <div key={nivelCod} className="rounded-md border overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 font-bold text-sm text-slate-800 flex items-center justify-between border-b">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      NÍVEL {nivelCod} ({itensNivel.length} unidade(s))
                    </span>
                    <span className="text-xs text-slate-500 font-normal">
                      Subtotal: {itensNivel.reduce((acc, i) => acc + i.totalPrevisto, 0)} vagas
                      previstas
                    </span>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="w-28">Código</TableHead>
                        <TableHead>Unidade Escolar</TableHead>
                        <TableHead>Tipo de Atendimento</TableHead>
                        <TableHead className="text-center w-28">Alunos Matr.</TableHead>
                        <TableHead className="text-center w-28">Alunos Consid.</TableHead>
                        <TableHead className="text-center w-28">Previsto</TableHead>
                        <TableHead className="text-center w-28">Lotação</TableHead>
                        <TableHead className="text-center w-28">Balanço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensNivel.map((item) => (
                        <TableRow key={item.escola.id}>
                          <TableCell className="font-mono text-xs">{item.escola.codigo}</TableCell>
                          <TableCell className="font-semibold text-slate-900">
                            {item.escola.nome}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {item.tipoAtendimentoNome}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {item.alunosTotal}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-semibold text-blue-700">
                            {item.alunosConsiderados}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-900">
                            {item.totalPrevisto}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-700">
                            {item.totalLotado}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[10px] font-semibold ${
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
