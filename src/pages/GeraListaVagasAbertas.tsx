import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { registrarAuditoria } from '@/services/auditoria'
import { ANOS_LETIVOS } from './Etapas'
import { VagaCompleta, listarVagasAbertasAnoLetivo } from '@/services/vagas-lista-abertas'
import {
  LinhaListaVagasAbertas,
  exportarListaVagasAbertasExcel,
  exportarListaVagasAbertasPDF,
} from '@/services/vagas-export'
import { BotaoAjudaModulo } from '@/components/BotaoAjudaModulo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PaginacaoTabela, ITENS_POR_PAGINA_PADRAO } from '@/components/PaginacaoTabela'
import { Calendar, FileSpreadsheet, Printer, Loader2, Briefcase, ListChecks } from 'lucide-react'

const montarLinha = (v: VagaCompleta): LinhaListaVagasAbertas => {
  const cargoOuFuncao =
    v.tipo_vinculo === 'CARGO'
      ? v.cargo?.nome || v.funcao || '—'
      : v.funcao_objeto?.nome || v.funcao || '—'

  const titularVazio = !v.profissional_titular_id
  const ocupanteVazio = !v.profissional_ocupante_id && (v.status === 'ABERTA' || !v.status)

  return {
    anoLetivo: v.ano_letivo,
    unidadeEscolar: v.unidade_escolar?.nome || '—',
    cargo: cargoOuFuncao,
    periodo: rotuloPeriodo(v.periodo),
    modalidade: v.modalidade === 'ITINERANTE' ? 'Itinerante' : 'Fixo',
    vagaDeTitular: titularVazio,
    vagaDeOcupacao: ocupanteVazio,
  }
}

const rotuloPeriodo = (p: string | null | undefined): string => {
  if (!p) return 'Geral / Sem Período'
  const mapa: Record<string, string> = {
    MANHA: 'Manhã',
    TARDE: 'Tarde',
    INTEGRAL: 'Integral',
    NOITE: 'Noite',
  }
  return mapa[p] || p
}

export const GeraListaVagasAbertasPage: React.FC = () => {
  const { canView } = useAuth()
  const { toast } = useToast()
  const podeVer = canView('gera_lista_vagas_abertas')

  const [anoLetivo, setAnoLetivo] = useState<string>(String(new Date().getFullYear()))
  const [carregando, setCarregando] = useState(false)
  const [linhas, setLinhas] = useState<LinhaListaVagasAbertas[]>([])
  const [gerado, setGerado] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)

  const gerar = useCallback(async () => {
    const ano = Number(anoLetivo)
    if (!ano || ano < 2020 || ano > 2040) {
      toast({
        title: 'Ano Letivo inválido',
        description: 'Selecione um ano entre 2020 e 2040.',
        variant: 'destructive',
      })
      return
    }

    setCarregando(true)
    try {
      const vagas = await listarVagasAbertasAnoLetivo(ano)
      const montadas = vagas.map(montarLinha)
      await registrarAuditoria({
        entidade: 'VAGA',
        acao: 'CONSULTA',
        descricao: `Geração da Lista de Vagas Abertas — Ano Letivo ${ano} — ${montadas.length} vaga(s) listada(s).`,
      }).catch(() => undefined)
      setLinhas(montadas)
      setGerado(true)
      setPaginaAtual(1)
      toast({
        title: 'Lista gerada com sucesso',
        description: `${montadas.length} vaga(s) encontrada(s) para o Ano Letivo ${ano}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar a lista',
        description: err?.message || 'Falha ao consultar as vagas abertas.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }, [anoLetivo, toast])

  useEffect(() => {
    setPaginaAtual(1)
  }, [linhas])

  const paginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA_PADRAO
    return linhas.slice(inicio, inicio + ITENS_POR_PAGINA_PADRAO)
  }, [linhas, paginaAtual])

  if (!podeVer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso Restrito</CardTitle>
          <CardDescription>Você não possui permissão para visualizar este módulo.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const exportarExcel = () => {
    exportarListaVagasAbertasExcel(linhas, Number(anoLetivo))
  }

  const exportarPdf = () => {
    exportarListaVagasAbertasPDF(linhas, Number(anoLetivo))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Gera Lista de Vagas Abertas
          </h1>
          <p className="text-sm text-muted-foreground">
            Gera a lista de vagas do Ano Letivo, com destaque para Vaga de Titular e Vaga de
            Ocupação.
          </p>
        </div>
        <BotaoAjudaModulo menuKey="gera_lista_vagas_abertas" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Filtros
          </CardTitle>
          <CardDescription>
            Selecione o Ano Letivo (combobox de 2020 a 2040) e clique em "Gerar Lista".
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="ano-letivo">Ano Letivo</Label>
            <Select value={anoLetivo} onValueChange={setAnoLetivo}>
              <SelectTrigger id="ano-letivo" className="w-full sm:w-48">
                <SelectValue placeholder="Selecione o Ano Letivo" />
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
          <Button onClick={gerar} disabled={carregando} className="gap-2">
            {carregando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ListChecks className="h-4 w-4" />
            )}
            Gerar Lista
          </Button>
        </CardContent>
      </Card>

      {gerado && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Lista de Vagas — Ano Letivo {anoLetivo}
              </CardTitle>
              <CardDescription>
                {linhas.length} vaga(s) listada(s). "Vaga de Titular" = vaga sem titular; "Vaga de
                Ocupação" = vaga sem ocupante e com status Aberta.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportarExcel} disabled={!linhas.length}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportarPdf} disabled={!linhas.length}>
                <Printer className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ano Letivo</TableHead>
                    <TableHead>Unidade Escolar</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead className="text-center">Vaga de Titular</TableHead>
                    <TableHead className="text-center">Vaga de Ocupação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginadas.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>{l.anoLetivo}</TableCell>
                      <TableCell>{l.unidadeEscolar}</TableCell>
                      <TableCell>{l.cargo}</TableCell>
                      <TableCell>{l.periodo}</TableCell>
                      <TableCell>{l.modalidade}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={l.vagaDeTitular ? 'default' : 'secondary'}>
                          {l.vagaDeTitular ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={l.vagaDeOcupacao ? 'default' : 'secondary'}>
                          {l.vagaDeOcupacao ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginadas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma vaga encontrada para o Ano Letivo {anoLetivo}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <PaginacaoTabela
              paginaAtual={paginaAtual}
              totalRegistros={linhas.length}
              onMudarPagina={setPaginaAtual}
              rotuloItens="vagas"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default GeraListaVagasAbertasPage
