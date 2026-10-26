import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  UnidadeEscolar,
  VagaReal,
  StatusVagaReal,
  Cargo,
  PeriodoEscola,
} from '@/types/gestao-escolar'
import {
  listarVagasCompletas,
  editarVaga,
  liberarVaga,
  calcularPreviaGeracao,
  confirmarGeracaoVagas,
  PreviaGeracaoResultado,
  getUnidadesEscolaresAnoPorAno,
} from '@/services/vagas'
import { getUnidadesEscolares } from '@/services/unidades-escolares'
import { getCargos } from '@/services/apoio'
import { exportarVagasExcel, exportarVagasPDF } from '@/services/vagas-export'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SelectPaginado } from '@/components/SelectPaginado'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Search,
  Filter,
  PlayCircle,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  UserCheck,
  UserX,
  AlertTriangle,
  Building2,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

const ANOS_DISPONIVEIS = [2024, 2025, 2026, 2027, 2028]

export const VagasPage: React.FC = () => {
  const { user, canEdit } = useAuth()
  const { toast } = useToast()
  const podeEditar = canEdit('vagas')

  // Filtros principais
  const [anoLetivo, setAnoLetivo] = useState<number>(2026)
  const [escolaSelecionada, setEscolaSelecionada] = useState<string>('TODAS')
  const [tipoAtendimentoFiltro, setTipoAtendimentoFiltro] = useState<string>('TODOS')
  const [funcaoFiltro, setFuncaoFiltro] = useState<string>('TODAS')
  const [cargoFiltro, setCargoFiltro] = useState<string>('TODOS')
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('TODOS')
  const [modalidadeFiltro, setModalidadeFiltro] = useState<string>('TODAS')
  const [statusFiltro, setStatusFiltro] = useState<StatusVagaReal | 'TODAS'>('TODAS')
  const [comOcupanteFiltro, setComOcupanteFiltro] = useState<'TODAS' | 'COM' | 'SEM'>('TODAS')
  const [buscaTexto, setBuscaTexto] = useState<string>('')
  const [paginaAtual, setPaginaAtual] = useState<number>(1)

  // Dados carregados
  const [carregando, setCarregando] = useState<boolean>(true)
  const [vagas, setVagas] = useState<VagaReal[]>([])
  const [escolas, setEscolas] = useState<UnidadeEscolar[]>([])
  const [cargosGerais, setCargosGerais] = useState<Cargo[]>([])

  // Modal Gerar Vagas
  const [modalGerarAberto, setModalGerarAberto] = useState<boolean>(false)
  const [gerarParaTodas, setGerarParaTodas] = useState<boolean>(false)
  const [escolaParaGerarId, setEscolaParaGerarId] = useState<string>('')
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

  // Carregar dados iniciais
  const recarregarDados = async () => {
    setCarregando(true)
    try {
      const [listaEscolas, listaCargos, listaVagas] = await Promise.all([
        getUnidadesEscolares(),
        getCargos(),
        listarVagasCompletas({
          anoLetivo,
          unidadeEscolarId: escolaSelecionada,
          tipoAtendimento: tipoAtendimentoFiltro,
          funcao: funcaoFiltro,
          cargoId: cargoFiltro,
          periodo: periodoFiltro,
          modalidade: modalidadeFiltro,
          status: statusFiltro,
          comOcupante: comOcupanteFiltro,
          buscaTexto,
        }),
      ])

      setEscolas(listaEscolas)
      setCargosGerais(listaCargos)
      setVagas(listaVagas)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao carregar cadastro de vagas',
        description: err.message || 'Falha ao consultar banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    setPaginaAtual(1)
    recarregarDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    anoLetivo,
    escolaSelecionada,
    tipoAtendimentoFiltro,
    funcaoFiltro,
    cargoFiltro,
    periodoFiltro,
    modalidadeFiltro,
    statusFiltro,
    comOcupanteFiltro,
    buscaTexto,
  ])

  const vagasPaginadas = useMemo(() => {
    return vagas.slice(
      (paginaAtual - 1) * ITENS_POR_PAGINA_PADRAO,
      paginaAtual * ITENS_POR_PAGINA_PADRAO,
    )
  }, [vagas, paginaAtual])

  // Lista única de funções existentes nas vagas para o combo de filtro
  const funcoesDisponiveis = useMemo(() => {
    const s = new Set<string>()
    vagas.forEach((v) => {
      if (v.funcao) s.add(v.funcao)
    })
    return Array.from(s).sort()
  }, [vagas])

  // Cálculos do Resumo do Topo (Regra 4)
  const resumoTotal = useMemo(() => {
    const total = vagas.length
    const ocupadas = vagas.filter((v) => v.status === 'OCUPADA').length
    const abertas = vagas.filter((v) => v.status === 'ABERTA').length
    const excedentes = vagas.filter((v) => v.status === 'EXCEDENTE').length

    // Agrupamento por escola
    const porEscola = new Map<
      string,
      { nome: string; total: number; ocupadas: number; abertas: number; excedentes: number }
    >()
    // Agrupamento por função
    const porFuncao = new Map<
      string,
      { total: number; ocupadas: number; abertas: number; excedentes: number }
    >()

    for (const v of vagas) {
      const escId = v.unidade_escolar_id
      const escNome = v.unidade_escolar?.nome || 'Não identificada'
      if (!porEscola.has(escId)) {
        porEscola.set(escId, { nome: escNome, total: 0, ocupadas: 0, abertas: 0, excedentes: 0 })
      }
      const eObj = porEscola.get(escId)!
      eObj.total++
      if (v.status === 'OCUPADA') eObj.ocupadas++
      if (v.status === 'ABERTA') eObj.abertas++
      if (v.status === 'EXCEDENTE') eObj.excedentes++

      const funcNome = v.funcao || 'Outra'
      if (!porFuncao.has(funcNome)) {
        porFuncao.set(funcNome, { total: 0, ocupadas: 0, abertas: 0, excedentes: 0 })
      }
      const fObj = porFuncao.get(funcNome)!
      fObj.total++
      if (v.status === 'OCUPADA') fObj.ocupadas++
      if (v.status === 'ABERTA') fObj.abertas++
      if (v.status === 'EXCEDENTE') fObj.excedentes++
    }

    return {
      total,
      ocupadas,
      abertas,
      excedentes,
      porEscola: Array.from(porEscola.values()),
      porFuncao: Array.from(porFuncao.entries()).map(([funcao, stats]) => ({ funcao, ...stats })),
    }
  }, [vagas])

  // Abrir modal de geração
  const handleAbrirGeracao = async (escolaId?: string) => {
    const targetId =
      escolaId || (escolaSelecionada !== 'TODAS' ? escolaSelecionada : escolas[0]?.id)
    setEscolaParaGerarId(targetId)
    setGerarParaTodas(false)
    setPreviaAtual(null)
    setModalGerarAberto(true)

    if (targetId) {
      await carregarPrevia(targetId)
    }
  }

  // Carregar prévia de geração (deriva alunos e turmas automaticamente)
  const carregarPrevia = async (escolaId: string) => {
    setCarregandoPrevia(true)
    try {
      const res = await calcularPreviaGeracao(escolaId, anoLetivo)
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

  // Confirmar geração de vagas
  const handleConfirmarGeracao = async () => {
    if (!escolaParaGerarId) return
    setConfirmandoGeracao(true)

    try {
      if (gerarParaTodas) {
        // Geração em lote para todas as escolas cadastradas
        const escolasAno = await getUnidadesEscolaresAnoPorAno(anoLetivo)
        let totalNovas = 0
        let totalRemovidas = 0
        let totalExcedentes = 0
        let processadas = 0

        for (const esc of escolas) {
          const dadosAno = escolasAno.find((ea) => ea.unidade_escolar_id === esc.id)
          if (!dadosAno || dadosAno.qtd_alunos <= 0 || dadosAno.qtd_turmas <= 0) {
            continue // Pula escolas sem dados completos na geração em lote
          }
          try {
            const res = await confirmarGeracaoVagas({
              unidadeEscolarId: esc.id,
              anoLetivo,
              usuarioNome: user?.email || 'Operador',
              usuarioEmail: user?.email || 'operador@local',
            })
            totalNovas += res.novasCriadas
            totalRemovidas += res.abertasRemovidas
            totalExcedentes += res.excedentesMarcadas
            processadas++
          } catch (e) {
            console.warn(`Erro ao gerar para escola ${esc.nome}:`, e)
          }
        }

        toast({
          title: 'Geração em lote concluída',
          description: `${processadas} escolas processadas (+${totalNovas} novas, -${totalRemovidas} abertas removidas, ${totalExcedentes} excedentes).`,
        })
      } else {
        const res = await confirmarGeracaoVagas({
          unidadeEscolarId: escolaParaGerarId,
          anoLetivo,
          usuarioNome: user?.email || 'Operador',
          usuarioEmail: user?.email || 'operador@local',
        })

        toast({
          title: 'Vagas geradas com sucesso!',
          description: `${res.escolaNome}: Nível ${res.nivelCodigo} gravado com sucesso (${res.totalVagasFinais} vagas ativas).`,
        })
      }

      setModalGerarAberto(false)
      recarregarDados()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao gerar vagas',
        description: err.message || 'Falha durante a transação de geração.',
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

  // Lista dinâmica de cargos permitidos para a vaga em edição (Regra 3 & 4)
  // "O combo de cargo mostra apenas os cargos permitidos na configuração para aquela função."
  const cargosPermitidosParaEdicao = useMemo(() => {
    if (!vagaEmEdicao) return []
    const linha = vagaEmEdicao.configuracao_rh_linha
    if (!linha || !linha.cargos || linha.cargos.length === 0) {
      // Se a linha não tiver restrição explícita cadastrada, exibe todos os cargos
      return cargosGerais
    }

    return linha.cargos.map((lc) => ({
      ...lc.cargo,
      condicao: lc.condicao,
    }))
  }, [vagaEmEdicao, cargosGerais])

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
      recarregarDados()
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
      recarregarDados()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao liberar vaga',
        description: err.message || 'Falha ao atualizar registro.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-blue-600" />
            Cadastro de Vagas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Geração de vagas por Unidade Escolar e Ano Letivo com dimensionamento automático pelo
            porte.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={recarregarDados}
            disabled={carregando}
            className="text-slate-700 bg-white"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportarVagasExcel(vagas, `vagas-${anoLetivo}.csv`)}
            disabled={vagas.length === 0}
            className="text-slate-700 bg-white"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
            Excel (CSV)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarVagasPDF(vagas, {
                anoLetivo,
                escolaNome:
                  escolaSelecionada !== 'TODAS'
                    ? escolas.find((e) => e.id === escolaSelecionada)?.nome
                    : 'Todas as Unidades',
                totalGeral: resumoTotal.total,
                totalOcupadas: resumoTotal.ocupadas,
                totalAbertas: resumoTotal.abertas,
                totalExcedentes: resumoTotal.excedentes,
              })
            }
            disabled={vagas.length === 0}
            className="text-slate-700 bg-white"
          >
            <Printer className="w-4 h-4 mr-1.5 text-blue-600" />
            Imprimir / PDF
          </Button>

          {podeEditar && (
            <Button
              onClick={() => handleAbrirGeracao()}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold"
            >
              <PlayCircle className="w-4 h-4 mr-1.5" />
              Gerar Vagas
            </Button>
          )}
        </div>
      </div>

      {/* Resumo no topo (Regra 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total de Vagas
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{resumoTotal.total}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Vagas Ocupadas
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{resumoTotal.ocupadas}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Vagas Abertas
              </p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{resumoTotal.abertas}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                Vagas Excedentes
              </p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{resumoTotal.excedentes}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros Completos (Regra 4) */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
            <Filter className="w-4 h-4 text-blue-600" />
            Filtros de Consulta
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEscolaSelecionada('TODAS')
              setTipoAtendimentoFiltro('TODOS')
              setFuncaoFiltro('TODAS')
              setCargoFiltro('TODOS')
              setPeriodoFiltro('TODOS')
              setModalidadeFiltro('TODAS')
              setStatusFiltro('TODAS')
              setComOcupanteFiltro('TODAS')
              setBuscaTexto('')
            }}
            className="text-xs text-slate-500 hover:text-slate-800 h-7 px-2"
          >
            Limpar filtros
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Ano Letivo */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Ano Letivo</Label>
              <SelectPaginado
                value={String(anoLetivo)}
                onValueChange={(val) => setAnoLetivo(Number(val))}
                placeholder="Ano Letivo"
                triggerClassName="mt-1 h-9 text-xs"
                searchPlaceholder="Buscar ano..."
                options={ANOS_DISPONIVEIS.map((ano) => ({
                  value: String(ano),
                  label: String(ano),
                  searchText: String(ano),
                }))}
              />
            </div>

            {/* Unidade Escolar */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Unidade Escolar</Label>
              <SelectPaginado
                value={escolaSelecionada}
                onValueChange={setEscolaSelecionada}
                placeholder="Todas as unidades"
                triggerClassName="mt-1 h-9 text-xs"
                searchPlaceholder="Buscar unidade por nome ou código..."
                options={[
                  {
                    value: 'TODAS',
                    label: `Todas as Unidades (${escolas.length})`,
                    isSpecialTop: true,
                  },
                  ...escolas.map((e) => ({
                    value: e.id,
                    label: `${e.nome} (${e.codigo || ''})`,
                    searchText: `${e.nome} ${e.codigo || ''}`,
                  })),
                ]}
              />
            </div>

            {/* Tipo de Atendimento */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Tipo de Atendimento</Label>
              <Select value={tipoAtendimentoFiltro} onValueChange={setTipoAtendimentoFiltro}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS" className="text-xs font-semibold">
                    Todos os Tipos
                  </SelectItem>
                  <SelectItem
                    value="Ensino Fundamental e Educação Infantil (20h)"
                    className="text-xs"
                  >
                    Ensino Fundamental e Infantil (20h)
                  </SelectItem>
                  <SelectItem value="Educação Infantil (40h)" className="text-xs">
                    Educação Infantil (40h)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Função */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Função</Label>
              <SelectPaginado
                value={funcaoFiltro}
                onValueChange={setFuncaoFiltro}
                placeholder="Todas as funções"
                triggerClassName="mt-1 h-9 text-xs"
                searchPlaceholder="Buscar função..."
                options={[
                  { value: 'TODAS', label: 'Todas as Funções', isSpecialTop: true },
                  ...funcoesDisponiveis.map((f) => ({
                    value: f,
                    label: f,
                    searchText: f,
                  })),
                ]}
              />
            </div>

            {/* Status da Vaga */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Status</Label>
              <Select value={statusFiltro} onValueChange={(val: any) => setStatusFiltro(val)}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS" className="text-xs font-semibold">
                    Todos os Status
                  </SelectItem>
                  <SelectItem value="ABERTA" className="text-xs text-blue-600 font-medium">
                    ABERTA
                  </SelectItem>
                  <SelectItem value="OCUPADA" className="text-xs text-emerald-600 font-medium">
                    OCUPADA
                  </SelectItem>
                  <SelectItem value="EXCEDENTE" className="text-xs text-amber-600 font-medium">
                    EXCEDENTE
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ocupante (Com/Sem) */}
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
                  <SelectItem value="TODAS" className="text-xs font-semibold">
                    Todos
                  </SelectItem>
                  <SelectItem value="COM" className="text-xs">
                    Com Ocupante
                  </SelectItem>
                  <SelectItem value="SEM" className="text-xs">
                    Sem Ocupante
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Modalidade */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Modalidade</Label>
              <Select value={modalidadeFiltro} onValueChange={setModalidadeFiltro}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS" className="text-xs font-semibold">
                    Todas
                  </SelectItem>
                  <SelectItem value="FIXO" className="text-xs">
                    Fixo
                  </SelectItem>
                  <SelectItem value="ITINERANTE" className="text-xs">
                    Itinerante
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
                  <SelectItem value="TODOS" className="text-xs font-semibold">
                    Todos
                  </SelectItem>
                  <SelectItem value="MANHA" className="text-xs">
                    Manhã
                  </SelectItem>
                  <SelectItem value="TARDE" className="text-xs">
                    Tarde
                  </SelectItem>
                  <SelectItem value="INTEGRAL" className="text-xs">
                    Integral
                  </SelectItem>
                  <SelectItem value="NOITE" className="text-xs">
                    Noite
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Busca textual livre */}
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-600 font-medium">
                Busca livre (nome, cargo, código)
              </Label>
              <div className="relative mt-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                <Input
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  placeholder="Buscar por escola, função, cargo ou ocupante..."
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listagem de Vagas (Regra 4) */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">Vagas Dimensionadas</span>
            <Badge
              variant="secondary"
              className="font-semibold text-xs bg-slate-100 text-slate-700"
            >
              {vagas.length} registros
            </Badge>
          </div>
          {escolaSelecionada !== 'TODAS' && podeEditar && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAbrirGeracao(escolaSelecionada)}
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
                <TableHead className="font-semibold text-slate-700">Unidade Escolar</TableHead>
                <TableHead className="w-20 font-semibold text-slate-700">Ano</TableHead>
                <TableHead className="font-semibold text-slate-700">Função</TableHead>
                <TableHead className="w-16 font-semibold text-slate-700 text-center">Nº</TableHead>
                <TableHead className="font-semibold text-slate-700">Período</TableHead>
                <TableHead className="font-semibold text-slate-700">Modalidade</TableHead>
                <TableHead className="font-semibold text-slate-700">Cargo</TableHead>
                <TableHead className="font-semibold text-slate-700">Ocupante</TableHead>
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
                  <TableCell colSpan={11} className="h-32 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Carregando vagas...
                  </TableCell>
                </TableRow>
              ) : vagas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-36 text-center text-slate-500">
                    <p className="font-semibold text-slate-700 text-sm">Nenhuma vaga encontrada</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {escolaSelecionada !== 'TODAS'
                        ? 'Esta unidade ainda não possui vagas geradas para o ano letivo selecionado.'
                        : 'Utilize o botão "Gerar Vagas" para calcular o dimensionamento das escolas.'}
                    </p>
                    {podeEditar && (
                      <Button
                        size="sm"
                        onClick={() => handleAbrirGeracao()}
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
                    <TableCell className="font-medium text-slate-900">
                      <div>
                        {v.unidade_escolar?.nome || '—'}
                        <span className="block text-[10px] text-slate-400">
                          {v.unidade_escolar?.tipo_atendimento.includes('40h') ? '40h' : '20h'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{v.ano_letivo}</TableCell>
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
                            className="font-semibold text-slate-900 block truncate max-w-[160px]"
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
          rotuloItens="vagas dimensionadas"
        />
      </Card>

      {/* ==================================================================== */}
      {/* MODAL 1: GERAR VAGAS (COM PRÉVIA E REGRAS DO USUÁRIO) */}
      {/* ==================================================================== */}
      <Dialog open={modalGerarAberto} onOpenChange={setModalGerarAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              Geração de Vagas por Porte
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Calcula e dimensiona as vagas a partir da configuração de RH por nível e dos dados da
              escola no ano letivo {anoLetivo}.
            </DialogDescription>
          </DialogHeader>

          {/* Seleção de Escola e Opção de Gerar para Todas */}
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Unidade Escolar Alvo</Label>
                <SelectPaginado
                  value={escolaParaGerarId}
                  onValueChange={(id) => {
                    setEscolaParaGerarId(id)
                    carregarPrevia(id)
                  }}
                  disabled={gerarParaTodas}
                  placeholder="Selecione a unidade"
                  triggerClassName="mt-1 h-9 text-xs bg-white"
                  searchPlaceholder="Buscar escola por nome..."
                  options={escolas.map((e) => ({
                    value: e.id,
                    label: `${e.nome} (${e.tipo_atendimento.includes('40h') ? '40h' : '20h'})`,
                    searchText: `${e.nome} ${e.tipo_atendimento}`,
                  }))}
                />
              </div>

              <div className="flex flex-col justify-center">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="chk-todas"
                    checked={gerarParaTodas}
                    onCheckedChange={(c) => setGerarParaTodas(Boolean(c))}
                  />
                  <Label
                    htmlFor="chk-todas"
                    className="text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Gerar para todas as escolas cadastradas do ano {anoLetivo}
                  </Label>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-6">
                  Processa de forma idempotente todas as escolas com quantidade de alunos e turmas
                  preenchidas.
                </p>
              </div>
            </div>

            {/* SE FALTAM DADOS: AVISO EXPLICATIVO (Etapa 2 - sem formulário embutido) */}
            {previaAtual?.bloqueadoPorFaltaDados && (
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
            )}

            {/* PAINEL DA PRÉVIA (Regra 1 e 3) */}
            {carregandoPrevia ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                Carregando e calculando prévia...
              </div>
            ) : previaAtual && !previaAtual.bloqueadoPorFaltaDados ? (
              <div className="space-y-4">
                {/* Qual configuração foi usada (Regra 1 do usuário) */}
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
                    {previaAtual.configuracaoUsada.ano_letivo} | Criada em:{' '}
                    {new Date(previaAtual.configuracaoUsada.created_at || '').toLocaleDateString(
                      'pt-BR',
                    )}
                  </p>
                </div>

                {/* Enquadramento de Porte e Faixa */}
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

                {/* Tabela por função da prévia */}
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
                (Boolean(previaAtual?.bloqueadoPorFaltaDados) && !gerarParaTodas)
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

      {/* ==================================================================== */}
      {/* MODAL 2: EDITAR VAGA (DEFINIR OCUPANTE E CARGO - Regra 4) */}
      {/* ==================================================================== */}
      <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Editar Vaga: {vagaEmEdicao?.funcao} (Nº {vagaEmEdicao?.numero_sequencial})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {vagaEmEdicao?.unidade_escolar?.nome} · Código: {vagaEmEdicao?.codigo || 'Novo'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome do Ocupante */}
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

            {/* Cargo (apenas os cargos permitidos da linha da configuração - Regra 4) */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Cargo (Permitidos para {vagaEmEdicao?.funcao})
                </Label>
              </div>
              <SelectPaginado
                value={editCargoId}
                onValueChange={setEditCargoId}
                placeholder="Selecione o cargo do ocupante"
                triggerClassName="mt-1 h-9 text-xs"
                searchPlaceholder="Buscar cargo..."
                emptyMessage="Nenhum cargo permitido cadastrado"
                options={
                  cargosPermitidosParaEdicao.length === 0
                    ? [
                        {
                          value: 'nenhum',
                          label: 'Nenhum cargo permitido cadastrado',
                          disabled: true,
                        },
                      ]
                    : cargosPermitidosParaEdicao.map((c: any) => ({
                        value: c.id,
                        label: `${c.nome} ${c.condicao && c.condicao !== 'NENHUMA' ? `(${c.condicao})` : ''}`,
                        searchText: `${c.nome} ${c.condicao || ''}`,
                      }))
                }
              />
            </div>

            {/* Observação */}
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

export default VagasPage
