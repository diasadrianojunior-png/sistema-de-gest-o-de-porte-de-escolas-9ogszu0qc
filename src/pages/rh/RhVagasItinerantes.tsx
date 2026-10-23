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
import { getRhVagasItinerantes, getRhVersoes } from '@/services/rh-configuracoes'
import { RhVaga, RhVersaoConfiguracao } from '@/types/gestao-escolar'
import { Compass, Loader2, RefreshCw, Sparkles, Building, UserCheck } from 'lucide-react'

export default function RhVagasItinerantesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [vagas, setVagas] = useState<RhVaga[]>([])
  const [versoes, setVersoes] = useState<RhVersaoConfiguracao[]>([])
  const [anoLetivo, setAnoLetivo] = useState<number>(2026)

  const carregarVagas = async () => {
    try {
      setLoading(true)
      const data = await getRhVagasItinerantes(anoLetivo)
      setVagas(data)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar vagas itinerantes',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const vData = await getRhVersoes()
        setVersoes(vData)
      } catch (err) {
        console.error(err)
      }
    }
    init()
    carregarVagas()
  }, [anoLetivo])

  // Agrupamento por Função para identificar oportunidades de agrupamento
  const agrupadasPorFuncao = new Map<string, RhVaga[]>()
  for (const v of vagas) {
    const fnNome = v.funcao?.nome || 'Função'
    const list = agrupadasPorFuncao.get(fnNome) || []
    list.push(v)
    agrupadasPorFuncao.set(fnNome, list)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Compass className="w-6 h-6 text-blue-600" />
            Demandas de Vagas Itinerantes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centraliza todas as vagas parciais/itinerantes da rede para possibilitar o agrupamento
            de um mesmo servidor em múltiplas escolas.
          </p>
        </div>

        {/* Filtro por Ano */}
        <div className="flex items-center gap-2">
          <Select value={String(anoLetivo)} onValueChange={(val) => setAnoLetivo(Number(val))}>
            <SelectTrigger className="w-32 bg-white">
              <SelectValue placeholder="Ano Letivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={carregarVagas} className="gap-1.5 h-9">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white">
          <div className="text-xs font-semibold text-slate-500">Total de Vagas Itinerantes</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{vagas.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">demandas em aberto na rede</div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="text-xs font-semibold text-slate-500">Funções Itinerantes</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{agrupadasPorFuncao.size}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">especialidades com itinerância</div>
        </Card>

        <Card className="p-4 bg-white">
          <div className="text-xs font-semibold text-slate-500">Vagas Atendidas / Ocupadas</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {vagas.filter((v) => v.status === 'OCUPADA').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">servidores já vinculados</div>
        </Card>
      </div>

      {/* Listagem Agrupada */}
      {loading ? (
        <div className="py-12 flex justify-center items-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Buscando demandas itinerantes da rede...</span>
        </div>
      ) : vagas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-slate-500">
            Nenhuma vaga itinerante identificada para o ano {anoLetivo}. Gere o cálculo nas escolas
            para visualizar demandas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(agrupadasPorFuncao.entries()).map(([fnNome, vagasList]) => (
            <Card key={fnNome}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    {fnNome}
                  </span>
                  <Badge variant="outline">{vagasList.length} demanda(s) na rede</Badge>
                </CardTitle>
                <CardDescription>
                  Escolas que demandam carga horária parcial desta função para formação de jornada
                  integrada.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Código</TableHead>
                        <TableHead>Unidade Escolar Solicitante</TableHead>
                        <TableHead className="w-32 text-center">Frequência</TableHead>
                        <TableHead className="w-32">Origem</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead>Servidor Alocado</TableHead>
                        <TableHead>Observação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vagasList.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs">{v.codigo}</TableCell>
                          <TableCell className="font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              {(v as any).escola_ano?.escola?.nome || 'Unidade Escolar'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="text-blue-700 bg-blue-50 border-blue-200 text-[10px]"
                            >
                              {v.dias_semana ? `${v.dias_semana}x por semana` : 'Itinerante'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{v.origem}</TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[10px] ${
                                v.status === 'OCUPADA'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {v.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 font-medium">
                            {v.servidor ? (
                              <div className="flex items-center gap-1 text-emerald-700">
                                <UserCheck className="w-3.5 h-3.5" />
                                {v.servidor.nome}
                              </div>
                            ) : (
                              <span className="text-slate-400">Pendente de atribuição</span>
                            )}
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
          ))}
        </div>
      )}
    </div>
  )
}
