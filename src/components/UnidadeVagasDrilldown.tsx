import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  UnidadeEscolar,
  VagaReal,
  StatusVagaReal,
  Cargo,
  UnidadeEscolarAno,
} from '@/types/gestao-escolar'
import {
  listarVagasCompletas,
  editarVaga,
  liberarVaga,
  calcularPreviaGeracao,
  confirmarGeracaoVagas,
  PreviaGeracaoResultado,
  getUnidadeEscolarAno,
} from '@/services/vagas'
import { getCargos } from '@/services/apoio'
import { exportarVagasExcel, exportarVagasPDF } from '@/services/vagas-export'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Building2,
  Briefcase,
  UserCheck,
  UserX,
  Users,
  AlertTriangle,
  RefreshCw,
  PlayCircle,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react'

interface UnidadeVagasDrilldownProps {
  unidade: UnidadeEscolar
  anoLetivo: number
  onVoltar: () => void
  onMudarAno?: (novoAno: number) => void
  cargosGerais?: Cargo[]
  onVagasAlteradas?: () => void
}

export const UnidadeVagasDrilldown: React.FC<UnidadeVagasDrilldownProps> = ({
  unidade,
  anoLetivo,
  onVoltar,
  onMudarAno,
  cargosGerais: cargosGeraisProp,
  onVagasAlteradas,
}) => {
  const { user, canEdit } = useAuth()
  const { toast } = useToast()
  const podeEditar = canEdit('vagas')

  // Estado das vagas e dados anuais da unidade
  const [carregando, setCarregando] = useState<boolean>(true)
  const [vagas, setVagas] = useState<VagaReal[]>([])
  const [dadosAno, setDadosAno] = useState<UnidadeEscolarAno | null>(null)
  const [cargos, setCargos] = useState<Cargo[]>(cargosGeraisProp || [])

  // Filtros internos dentro da unidade escolar
  const [funcaoFiltro, setFuncaoFiltro] = useState<string>('TODAS')
  const [cargoFiltro, setCargoFiltro] = useState<string>('TODOS')
  const [statusFiltro, setStatusFiltro] = useState<StatusVagaReal | 'TODAS'>('TODAS')
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('TODOS')
  const [comOcupanteFiltro, setComOcupanteFiltro] = useState<'TODAS' | 'COM' | 'SEM'>('TODAS')
  const [buscaTexto, setBuscaTexto] = useState<string>('')
  const [paginaAtual, setPaginaAtual] = useState<number>(1)

  // Modal Gerar Vagas para esta unidade
  const [modalGerarAberto, setModalGerarAberto] = useState<boolean>(false)
  const [carregandoPrevia, setCarregandoPrevia] = useState<boolean>(false)
  const [previaAtual, setPreviaAtual] = useState<PreviaGeracaoResultado | null>(null)
  const [confirmandoGeracao, setConfirmandoGeracao] = useState<boolean>(false)

  // Modal Editar Vaga (definir ocupante e cargo)
  const [modalEditarAberto, setModalEditarAberto] = useState<boolean>(false)
  const [vagaEmEdicao, setVagaEmEdicao] = useState<VagaReal | null>(null)
  const [editOcupante, setEditOcupante] = useState<string>('')
  const [editCargoId, setEditCargoId] = useState<string>('')
  const [editObservacao, setEditObservacao] = useState<string>('')
  const [salvandoEdicao, setSalvandoEdicao] = useState<boolean>(false)

  // Carregar dados da unidade no ano
  const carregarDadosUnidade = async () => {
    setCarregando(true)
    try {
      const [listaVagas, unidadeAnoData, listaCargos] = await Promise.all([
        listarVagasCompletas({
          anoLetivo,
          unidadeEscolarId: unidade.id,
          funcao: funcaoFiltro,
          cargoId: cargoFiltro,
          periodo: periodoFiltro,
          status: statusFiltro,
          comOcupante: comOcupanteFiltro,
          buscaTexto,
        }),
        getUnidadeEscolarAno(unidade.id, anoLetivo),
        cargosGeraisProp && cargosGeraisProp.length > 0
          ? Promise.resolve(cargosGeraisProp)
          : getCargos(),
      ])

      setVagas(listaVagas)
      setDadosAno(unidadeAnoData)
      setCargos(listaCargos)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao carregar vagas da unidade',
        description: err.message || 'Falha ao buscar dados no servidor.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    setPaginaAtual(1)
    carregarDadosUnidade()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    unidade.id,
    anoLetivo,
    funcaoFiltro,
    cargoFiltro,
    statusFiltro,
    periodoFiltro,
    comOcupanteFiltro,
    buscaTexto,
  ])

  // Paginação padrão de 10 por página
  const vagasPaginadas = useMemo(() => {
    return vagas.slice(
      (paginaAtual - 1) * ITENS_POR_PAGINA_PADRAO,
      paginaAtual * ITENS_POR_PAGINA_PADRAO,
    )
  }, [vagas, paginaAtual])

  // Funções disponíveis nesta unidade
  const funcoesDisponiveis = useMemo(() => {
    const s = new Set<string>()
    vagas.forEach((v) => {
      if (v.funcao) s.add(v.funcao)
    })
    return Array.from(s).sort()
  }, [vagas])

  // Resumo de contagem das vagas da unidade
  const resumo = useMemo(() => {
    const total = vagas.length
    const ocupadas = vagas.filter((v) => v.status === 'OCUPADA').length
    const abertas = vagas.filter((v) => v.status === 'ABERTA').length
    const excedentes = vagas.filter((v) => v.status === 'EXCEDENTE').length

    return { total, ocupadas, abertas, excedentes }
  }, [vagas])

  // Abrir modal de geração para esta unidade
  const handleAbrirGeracao = async () => {
    setPreviaAtual(null)
    setModalGerarAberto(true)
    setCarregandoPrevia(true)
    try {
      const res = await calcularPreviaGeracao(unidade.id, anoLetivo)
      setPreviaAtual(res)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao calcular prévia de vagas',
        description: err.message || 'Falha ao processar regras de cálculo.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoPrevia(false)
    }
  }

  // Confirmar geração de vagas desta unidade
  const handleConfirmarGeracao = async () => {
    setConfirmandoGeracao(true)
    try {
      const res = await confirmarGeracaoVagas({
        unidadeEscolarId: unidade.id,
        anoLetivo,
        usuarioNome: user?.email || 'Operador',
        usuarioEmail: user?.email || 'operador@local',
      })

      toast({
        title: 'Vagas geradas com sucesso!',
        description: `${res.escolaNome}: Nível ${res.nivelCodigo} gravado (${res.totalVagasFinais} vagas ativas).`,
      })

      setModalGerarAberto(false)
      await carregarDadosUnidade()
      onVagasAlteradas?.()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao gerar vagas',
        description: err.message || 'Falha durante a geração.',
        variant: 'destructive',
      })
    } finally {
      setConfirmandoGeracao(false)
    }
  }

  // Abrir modal de edição de vaga
  const handleAbrirEdicao = (v: VagaReal) => {
    setVagaEmEdicao(v)
    setEditOcupante(v.nome_ocupante || '')
    setEditCargoId(v.cargo_id || '')
    setEditObservacao(v.observacao || '')
    setModalEditarAberto(true)
  }

  // Cargos permitidos para a vaga
  const cargosPermitidosParaEdicao = useMemo(() => {
    if (!vagaEmEdicao) return []
    const linha = vagaEmEdicao.configuracao_rh_linha
    if (!linha || !linha.cargos || linha.cargos.length === 0) {
      return cargos
    }
    return linha.cargos.map((lc) => ({
      ...lc.cargo,
      condicao: lc.condicao,
    }))
  }, [vagaEmEdicao, cargos])

  // Salvar ocupante/cargo da vaga
  const handleSalvarEdicaoVaga = async () => {
    if (!vagaEmEdicao) return
    setSalvandoEdicao(true)
    try {
      await editarVaga({
        vagaId: vagaEmEdicao.id,
        nomeOcupante: editOcupante,
        cargoId: editCargoId || null,
        observacao: editObservacao,
      })

      toast({
        title: 'Vaga atualizada com sucesso',
        description: `Vaga ${vagaEmEdicao.codigo || vagaEmEdicao.id} atualizada com sucesso.`,
      })

      setModalEditarAberto(false)
      await carregarDadosUnidade()
      onVagasAlteradas?.()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar alteração da vaga',
        description: err.message || 'Falha ao atualizar registro.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // Liberar vaga
  const handleLiberarVaga = async (v: VagaReal) => {
    if (
      !confirm(
        `Deseja remover o ocupante "${v.nome_ocupante}" e liberar a vaga ${v.codigo || ''}? O status voltará para ABERTA.`,
      )
    ) {
      return
    }

    try {
      await liberarVaga(v.id)
      toast({
        title: 'Vaga liberada com sucesso',
        description: `O ocupante foi desvinculado e a vaga está ABERTA.`,
      })
      await carregarDadosUnidade()
      onVagasAlteradas?.()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao liberar vaga',
        description: err.message || 'Falha ao atualizar registro.',
        variant: 'destructive',
      })
    }
  }

  const nivelExibicao = dadosAno?.nivel_calculado
    ? `Nível ${dadosAno.nivel_calculado}`
    : 'Nível não calculado'

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-150">
      {/* Barra de Navegação e Ações de Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onVoltar}
            className="text-slate-700 bg-white hover:bg-slate-100 h-9"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar para Listagem
          </Button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {unidade.nome}
              </h1>
              {unidade.codigo && (
                <Badge variant="outline" className="font-mono text-xs text-slate-600">
                  {unidade.codigo}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Visualização detalhada das vagas dimensionadas para o ano letivo {anoLetivo}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDadosUnidade}
            disabled={carregando}
            className="text-slate-700 bg-white text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarVagasExcel(vagas, `vagas-${unidade.codigo || 'escola'}-${anoLetivo}.csv`)
            }
            disabled={vagas.length === 0}
            className="text-slate-700 bg-white text-xs h-9"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarVagasPDF(vagas, {
                anoLetivo,
                escolaNome: unidade.nome,
                totalGeral: resumo.total,
                totalOcupadas: resumo.ocupadas,
                totalAbertas: resumo.abertas,
                totalExcedentes: resumo.excedentes,
              })
            }
            disabled={vagas.length === 0}
            className="text-slate-700 bg-white text-xs h-9"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Imprimir / PDF
          </Button>

          {podeEditar && (
            <Button
              onClick={handleAbrirGeracao}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold text-xs h-9"
            >
              <PlayCircle className="w-4 h-4 mr-1.5" />
              Gerar Vagas desta Unidade
            </Button>
          )}
        </div>
      </div>

      {/* Cabeçalho de Contexto da Unidade Escolar (Cartão de Resumo e Metadados) */}
      <Card className="bg-gradient-to-br from-white to-slate-50/80 border-slate-200 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* Informações Institucionais */}
            <div className="space-y-1.5 pr-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Tipo de Atendimento
              </span>
              <p className="text-sm font-bold text-slate-800">{unidade.tipo_atendimento}</p>
              <div className="flex items-center gap-1.5 pt-1">
                <Badge
                  variant="secondary"
                  className="text-[11px] bg-blue-50 text-blue-700 border-blue-200"
                >
                  {unidade.tipo_atendimento.includes('40h') ? 'Jornada 40h' : 'Jornada 20h'}
                </Badge>
                {unidade.cidade && (
                  <span className="text-xs text-slate-500">• {unidade.cidade}</span>
                )}
              </div>
            </div>
            {/* Ano Letivo e Enquadramento */}
            <div className="space-y-1.5 pt-3 md:pt-0 md:px-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Ano Letivo & Porte
              </span>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">{anoLetivo}</span>
                <Badge className="bg-slate-900 text-white text-[11px] font-semibold">
                  {nivelExibicao}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {dadosAno?.qtd_alunos ? `${dadosAno.qtd_alunos} alunos` : 'Alunos: não informado'} ·{' '}
                {dadosAno?.qtd_turmas ? `${dadosAno.qtd_turmas} turmas` : 'Turmas: não informado'}
              </p>
            </div>

            {/* Totalizadores de Vagas */}
            <div className="space-y-1.5 pt-3 md:pt-0 md:px-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Dimensionamento Total
              </span>
              <p className="text-2xl font-extrabold text-slate-900">
                {resumo.total} <span className="text-xs font-normal text-slate-500">vagas</span>
              </p>
              <p className="text-[11px] text-slate-500">
                {dadosAno?.data_ultima_geracao
                  ? `Última geração: ${new Date(dadosAno.data_ultima_geracao).toLocaleDateString('pt-BR')}`
                  : 'Nenhuma geração gravada'}
              </p>
            </div>

            {/* Status das Vagas (Ocupadas / Abertas / Excedentes) */}
            <div className="space-y-2 pt-3 md:pt-0 md:pl-4 flex flex-col justify-center">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Ocupadas:
                </span>
                <strong className="text-emerald-800 font-bold">{resumo.ocupadas}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Abertas:
                </span>
                <strong className="text-blue-800 font-bold">{resumo.abertas}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Excedentes:
                </span>
                <strong className="text-amber-800 font-bold">{resumo.excedentes}</strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barra de Filtros Internos da Unidade */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold flex items-center gap-2 text-slate-800">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            Filtros para Vagas de {unidade.nome}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFuncaoFiltro('TODAS')
              setCargoFiltro('TODOS')
              setStatusFiltro('TODAS')
              setPeriodoFiltro('TODOS')
              setComOcupanteFiltro('TODAS')
              setBuscaTexto('')
            }}
            className="text-xs text-slate-500 hover:text-slate-800 h-7 px-2"
          >
            Limpar filtros
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Função */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Função</Label>
              <Select value={funcaoFiltro} onValueChange={setFuncaoFiltro}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Todas as funções" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as Funções</SelectItem>
                  {funcoesDisponiveis.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cargo */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Cargo</Label>
              <Select value={cargoFiltro} onValueChange={setCargoFiltro}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Todos os cargos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Cargos</SelectItem>
                  {cargos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Status</Label>
              <Select value={statusFiltro} onValueChange={(val: any) => setStatusFiltro(val)}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todos os Status</SelectItem>
                  <SelectItem value="ABERTA" className="text-blue-600 font-medium">
                    ABERTA
                  </SelectItem>
                  <SelectItem value="OCUPADA" className="text-emerald-600 font-medium">
                    OCUPADA
                  </SelectItem>
                  <SelectItem value="EXCEDENTE" className="text-amber-600 font-medium">
                    EXCEDENTE
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Período</Label>
              <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="MANHA">Manhã</SelectItem>
                  <SelectItem value="TARDE">Tarde</SelectItem>
                  <SelectItem value="INTEGRAL">Integral</SelectItem>
                  <SelectItem value="NOITE">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Com Ocupante */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Ocupante</Label>
              <Select
                value={comOcupanteFiltro}
                onValueChange={(val: any) => setComOcupanteFiltro(val)}
              >
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todos</SelectItem>
                  <SelectItem value="COM">Com Ocupante</SelectItem>
                  <SelectItem value="SEM">Sem Ocupante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Busca textual */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Busca livre</Label>
              <div className="relative mt-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                <Input
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  placeholder="Nome, cargo ou código..."
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Vagas da Unidade Escolar (mesmas colunas da tela principal + paginação 10 por página) */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              Vagas da Unidade: {unidade.nome}
            </span>
            <Badge
              variant="secondary"
              className="font-semibold text-xs bg-slate-100 text-slate-700"
            >
              {vagas.length} vagas
            </Badge>
          </div>
          {podeEditar && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAbrirGeracao}
              className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Regerar Vagas desta Unidade
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow className="border-b border-slate-200 text-xs">
                <TableHead className="w-24 font-semibold text-slate-700">Código</TableHead>
                <TableHead className="font-semibold text-slate-700">Função</TableHead>
                <TableHead className="w-16 font-semibold text-slate-700 text-center">Nº</TableHead>
                <TableHead className="font-semibold text-slate-700">Período</TableHead>
                <TableHead className="font-semibold text-slate-700">Modalidade</TableHead>
                <TableHead className="font-semibold text-slate-700">Cargo</TableHead>
                <TableHead className="font-semibold text-slate-700">Nome do Ocupante</TableHead>
                <TableHead className="w-24 text-center font-semibold text-slate-700">
                  Status
                </TableHead>
                <TableHead className="w-28 text-right font-semibold text-slate-700">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Carregando vagas da unidade...
                  </TableCell>
                </TableRow>
              ) : vagas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-36 text-center text-slate-500">
                    <p className="font-semibold text-slate-700 text-sm">
                      Nenhuma vaga cadastrada para {unidade.nome} em {anoLetivo}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Utilize o botão &quot;Gerar Vagas desta Unidade&quot; para dimensionar as
                      vagas pelo porte escolar.
                    </p>
                    {podeEditar && (
                      <Button
                        size="sm"
                        onClick={handleAbrirGeracao}
                        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                        Gerar Vagas Agora
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                vagasPaginadas.map((v) => (
                  <TableRow
                    key={v.id}
                    className="hover:bg-slate-50/80 transition-colors text-xs border-b border-slate-100"
                  >
                    <TableCell className="font-mono text-[11px] font-semibold text-slate-600">
                      {v.codigo || '—'}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">{v.funcao}</TableCell>
                    <TableCell className="text-center font-bold text-slate-600">
                      {v.numero_sequencial}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {v.periodo ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium border-slate-200"
                        >
                          {v.periodo}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {v.modalidade === 'ITINERANTE' ? (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-medium hover:bg-amber-100">
                          Itinerante {v.dias_semana ? `(${v.dias_semana}x/sem)` : ''}
                        </Badge>
                      ) : (
                        <span className="text-slate-600 text-xs">Fixo</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-slate-700 max-w-[180px] truncate"
                      title={v.cargo?.nome || ''}
                    >
                      {v.cargo?.nome || (
                        <span className="text-slate-400 italic">Não vinculado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {v.nome_ocupante ? (
                        <div>
                          <span
                            className="font-semibold text-slate-900 block truncate max-w-[180px]"
                            title={v.nome_ocupante}
                          >
                            {v.nome_ocupante}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Sem ocupante</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={`text-[10px] uppercase font-bold tracking-wider ${
                          v.status === 'OCUPADA'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                            : v.status === 'EXCEDENTE'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                        }`}
                      >
                        {v.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {podeEditar && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAbrirEdicao(v)}
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            Editar
                          </Button>
                          {v.nome_ocupante && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLiberarVaga(v)}
                              title="Liberar vaga (remover ocupante)"
                              className="h-7 px-2 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <PaginacaoTabela
          paginaAtual={paginaAtual}
          totalRegistros={vagas.length}
          itensPorPagina={ITENS_POR_PAGINA_PADRAO}
          onMudarPagina={setPaginaAtual}
          rotuloItens="vagas da unidade"
        />
      </Card>

      {/* Modal de Geração de Vagas para a Unidade */}
      <Dialog open={modalGerarAberto} onOpenChange={setModalGerarAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              Geração de Vagas: {unidade.nome} ({anoLetivo})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Calcula e dimensiona as vagas a partir da configuração de RH por nível para esta
              escola.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {carregandoPrevia ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                Calculando prévia de dimensionamento...
              </div>
            ) : previaAtual?.bloqueadoPorFaltaDados ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      Dados Essenciais Incompletos
                    </h4>
                    <p className="text-xs text-amber-800 mt-1">
                      {previaAtual.bloqueadoPorFaltaDados.mensagem}
                    </p>
                  </div>
                </div>
              </div>
            ) : previaAtual ? (
              <div className="space-y-4">
                {/* Configuração Usada */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Configuração RH Utilizada:{' '}
                      {previaAtual.configuracaoUsada.codigo || previaAtual.configuracaoUsada.id}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-white border-blue-300 text-blue-800"
                    >
                      Status: {previaAtual.configuracaoUsada.status}
                    </Badge>
                  </div>
                  <p className="text-blue-900">{previaAtual.motivoConfiguracao}</p>
                  <p className="text-[11px] text-blue-700">
                    Tipo: {previaAtual.configuracaoUsada.tipo_atendimento} | Ano:{' '}
                    {previaAtual.configuracaoUsada.ano_letivo}
                  </p>
                </div>

                {/* Porte e Nível */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                      Nível Identificado
                    </span>
                    <span className="text-xl font-bold text-blue-700">
                      Nível {previaAtual.nivelEncontradoCodigo}
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Faixa: {previaAtual.nivelFaixaDescricao}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                      Entrada de Dados
                    </span>
                    <span className="text-base font-bold text-slate-800">
                      {previaAtual.unidadeAno.qtd_alunos} alunos ·{' '}
                      {previaAtual.unidadeAno.qtd_turmas} turmas
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      {previaAtual.unidadeAno.periodos?.join(', ') || 'Sem período'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                      Impacto na Regeração
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-1">
                      {previaAtual.resumoTexto}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Total a manter: {previaAtual.totalVagasCalculadas} vagas
                    </span>
                  </div>
                </div>

                {/* Tabela de Vagas por Função da Prévia */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="text-xs">
                        <TableHead className="font-semibold text-slate-700">Função</TableHead>
                        <TableHead className="font-semibold text-slate-700">
                          Base de Cálculo
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          Matriz
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          Mult.
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">
                          Qtd. Final
                        </TableHead>
                        <TableHead className="font-semibold text-slate-700">Modalidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previaAtual.vagasLinhas.map((vl) => (
                        <TableRow key={vl.linhaId} className="text-xs">
                          <TableCell className="font-semibold text-slate-800">
                            {vl.funcao}
                          </TableCell>
                          <TableCell className="text-slate-600 text-[11px]">
                            {vl.baseCalculo}
                          </TableCell>
                          <TableCell className="text-center text-slate-600">
                            {vl.quantidadeMatriz}
                          </TableCell>
                          <TableCell className="text-center text-slate-600">
                            × {vl.multiplicador}
                          </TableCell>
                          <TableCell className="text-center font-bold text-blue-700">
                            {vl.quantidadeFinal}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {vl.modalidade === 'ITINERANTE'
                              ? `Itinerante (${vl.diasSemana || 2}d)`
                              : 'Fixo'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => setModalGerarAberto(false)}
              disabled={confirmandoGeracao}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarGeracao}
              disabled={
                confirmandoGeracao ||
                carregandoPrevia ||
                Boolean(previaAtual?.bloqueadoPorFaltaDados)
              }
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              {confirmandoGeracao ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Gravando Vagas...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Confirmar Geração
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Vaga */}
      <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Editar Vaga: {vagaEmEdicao?.funcao} (Nº {vagaEmEdicao?.numero_sequencial})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {unidade.nome} · Código: {vagaEmEdicao?.codigo || 'Novo'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Nome do Ocupante / Servidor
              </Label>
              <Input
                value={editOcupante}
                onChange={(e) => setEditOcupante(e.target.value)}
                placeholder="Ex: Maria dos Santos ou José da Silva"
                className="mt-1 h-9 text-xs"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Com ocupante preenchido o status vira <strong>OCUPADA</strong>. Deixe em branco para
                status <strong>ABERTA</strong>.
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Cargo (Permitidos para {vagaEmEdicao?.funcao})
              </Label>
              <Select value={editCargoId} onValueChange={setEditCargoId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Selecione o cargo do ocupante" />
                </SelectTrigger>
                <SelectContent>
                  {cargosPermitidosParaEdicao.length === 0 ? (
                    <SelectItem value="nenhum" disabled>
                      Nenhum cargo permitido cadastrado
                    </SelectItem>
                  ) : (
                    cargosPermitidosParaEdicao.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} {c.condicao && c.condicao !== 'NENHUMA' ? `(${c.condicao})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Observação</Label>
              <Input
                value={editObservacao}
                onChange={(e) => setEditObservacao(e.target.value)}
                placeholder="Ex: Observações adicionais sobre o preenchimento da vaga."
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => setModalEditarAberto(false)}
              disabled={salvandoEdicao}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarEdicaoVaga}
              disabled={salvandoEdicao}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              {salvandoEdicao ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
