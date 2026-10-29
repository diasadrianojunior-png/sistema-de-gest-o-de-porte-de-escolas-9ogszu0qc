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
  inserirVagaManual,
  excluirVagaManual,
  liberarVaga,
  calcularPreviaGeracao,
  confirmarGeracaoVagas,
  PreviaGeracaoResultado,
} from '@/services/vagas'
import { getUnidadesEscolares } from '@/services/unidades-escolares'
import { getCargos } from '@/services/apoio'
import { exportarVagasExcel, exportarVagasPDF } from '@/services/vagas-export'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Search,
  Filter,
  PlayCircle,
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
  ShieldCheck,
  PlusCircle,
  Pencil,
  Trash2,
  GraduationCap,
  Calendar,
  School,
  FileText,
  Clock,
  Check,
} from 'lucide-react'

const ANOS_DISPONIVEIS = [2024, 2025, 2026, 2027, 2028]

export const VagasPage: React.FC = () => {
  const { user, canEdit } = useAuth()
  const { toast } = useToast()
  const podeEditar = canEdit('vagas')

  // 1) Atributos principais da tela (conforme instrução do usuário)
  const [anoLetivo, setAnoLetivo] = useState<number>(2026)
  const [unidadeSelecionadaId, setUnidadeSelecionadaId] = useState<string>('')

  // Filtros secundários da listagem
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
  const [escolas, setEscolas] = useState<UnidadeEscolar[]>([])
  const [cargosGerais, setCargosGerais] = useState<Cargo[]>([])
  const [vagas, setVagas] = useState<VagaReal[]>([])

  // Resumo automático e prévia da unidade selecionada
  const [carregandoResumo, setCarregandoResumo] = useState<boolean>(false)
  const [dadosResumo, setDadosResumo] = useState<PreviaGeracaoResultado | null>(null)

  // Modais de Geração / Regeneração
  const [modalPerguntaGerarAberto, setModalPerguntaGerarAberto] = useState<boolean>(false)
  const [modalPreviaGeracaoAberto, setModalPreviaGeracaoAberto] = useState<boolean>(false)
  const [confirmandoGeracao, setConfirmandoGeracao] = useState<boolean>(false)

  // Modal Inserção Manual de Vaga
  const [modalInserirAberto, setModalInserirAberto] = useState<boolean>(false)
  const [novaLinhaId, setNovaLinhaId] = useState<string>('')
  const [novaFuncao, setNovaFuncao] = useState<string>('')
  const [novoCargoId, setNovoCargoId] = useState<string>('')
  const [novoPeriodo, setNovoPeriodo] = useState<PeriodoEscola | 'SEM'>('SEM')
  const [novaModalidade, setNovaModalidade] = useState<'FIXO' | 'ITINERANTE'>('FIXO')
  const [novosDiasSemana, setNovosDiasSemana] = useState<number>(2)
  const [novoSequencial, setNovoSequencial] = useState<string>('')
  const [novoOcupante, setNovoOcupante] = useState<string>('')
  const [novaObservacao, setNovaObservacao] = useState<string>('')
  const [salvandoInsercao, setSalvandoInsercao] = useState<boolean>(false)

  // Modal Edição Manual de Vaga
  const [modalEditarAberto, setModalEditarAberto] = useState<boolean>(false)
  const [vagaEmEdicao, setVagaEmEdicao] = useState<VagaReal | null>(null)
  const [editOcupante, setEditOcupante] = useState<string>('')
  const [editCargoId, setEditCargoId] = useState<string>('')
  const [editPeriodo, setEditPeriodo] = useState<PeriodoEscola | 'SEM'>('SEM')
  const [editModalidade, setEditModalidade] = useState<'FIXO' | 'ITINERANTE'>('FIXO')
  const [editDiasSemana, setEditDiasSemana] = useState<number>(2)
  const [editSequencial, setEditSequencial] = useState<string>('')
  const [editStatus, setEditStatus] = useState<StatusVagaReal>('ABERTA')
  const [editObservacao, setEditObservacao] = useState<string>('')
  const [salvandoEdicao, setSalvandoEdicao] = useState<boolean>(false)

  // Modal Exclusão de Vaga
  const [modalExcluirAberto, setModalExcluirAberto] = useState<boolean>(false)
  const [vagaParaExcluir, setVagaParaExcluir] = useState<VagaReal | null>(null)
  const [excluindoVaga, setExcluindoVaga] = useState<boolean>(false)

  // Modal de Ajuda e Regras
  const [modalAjudaAberto, setModalAjudaAberto] = useState<boolean>(false)

  // Carregar Unidades e Cargos na montagem
  useEffect(() => {
    async function carregarMestres() {
      try {
        const [listaEscolas, listaCargos] = await Promise.all([getUnidadesEscolares(), getCargos()])
        setEscolas(listaEscolas)
        setCargosGerais(listaCargos)
        // Selecionar a primeira unidade ativa se nenhuma selecionada
        if (listaEscolas.length > 0 && !unidadeSelecionadaId) {
          setUnidadeSelecionadaId(listaEscolas[0].id)
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados mestres:', err)
        toast({
          title: 'Erro ao carregar cadastros básicos',
          description: err.message || 'Falha ao buscar unidades e cargos.',
          variant: 'destructive',
        })
      }
    }
    carregarMestres()
  }, [])

  // Recarregar dados de vagas e do painel resumo sempre que a unidade ou ano mudar
  const recarregarTudo = async () => {
    if (!unidadeSelecionadaId) return
    setCarregando(true)
    setCarregandoResumo(true)

    try {
      // 1. Calcular resumo automático e prévia da unidade selecionada
      const previaRes = await calcularPreviaGeracao(unidadeSelecionadaId, anoLetivo)
      setDadosResumo(previaRes)

      // 2. Listar vagas cadastradas com filtros
      const listaVagas = await listarVagasCompletas({
        anoLetivo,
        unidadeEscolarId: unidadeSelecionadaId,
        funcao: funcaoFiltro,
        cargoId: cargoFiltro,
        periodo: periodoFiltro,
        modalidade: modalidadeFiltro,
        status: statusFiltro,
        comOcupante: comOcupanteFiltro,
        buscaTexto,
      })
      setVagas(listaVagas)
    } catch (err: any) {
      console.error('Erro ao carregar dados da unidade:', err)
      toast({
        title: 'Erro ao carregar dados da unidade',
        description: err.message || 'Falha ao processar informações da unidade e ano.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
      setCarregandoResumo(false)
    }
  }

  useEffect(() => {
    setPaginaAtual(1)
    if (unidadeSelecionadaId) {
      recarregarTudo()
    }
  }, [
    anoLetivo,
    unidadeSelecionadaId,
    funcaoFiltro,
    cargoFiltro,
    periodoFiltro,
    modalidadeFiltro,
    statusFiltro,
    comOcupanteFiltro,
    buscaTexto,
  ])

  // Unidade escolar atualmente selecionada
  const unidadeAtual = useMemo(() => {
    return escolas.find((e) => e.id === unidadeSelecionadaId) || null
  }, [escolas, unidadeSelecionadaId])

  // Vagas paginadas de 10 em 10 (padrão obrigatório do projeto)
  const vagasPaginadas = useMemo(() => {
    return vagas.slice(
      (paginaAtual - 1) * ITENS_POR_PAGINA_PADRAO,
      paginaAtual * ITENS_POR_PAGINA_PADRAO,
    )
  }, [vagas, paginaAtual])

  // Funções disponíveis nas vagas da unidade para o filtro
  const funcoesDisponiveis = useMemo(() => {
    const s = new Set<string>()
    vagas.forEach((v) => {
      if (v.funcao) s.add(v.funcao)
    })
    return Array.from(s).sort()
  }, [vagas])

  // Resumo estatístico do topo (Totais, Ocupadas, Abertas, Excedentes)
  const resumoEstatistico = useMemo(() => {
    const total = vagas.length
    const ocupadas = vagas.filter((v) => v.status === 'OCUPADA').length
    const abertas = vagas.filter((v) => v.status === 'ABERTA').length
    const excedentes = vagas.filter((v) => v.status === 'EXCEDENTE').length
    return { total, ocupadas, abertas, excedentes }
  }, [vagas])

  // Linhas da configuração vigente/utilizada para preencher combo de funções na inserção manual
  const linhasConfiguracaoDisponiveis = useMemo(() => {
    if (!dadosResumo?.configuracaoUsada?.linhas) return []
    return dadosResumo.configuracaoUsada.linhas.map((l) => ({
      id: l.id,
      funcaoNome: l.funcao?.nome || l.cargo?.nome || 'Função',
      tipoLinha: l.tipo_linha,
      baseCalculo: l.base_calculo,
      cargoPadraoId: l.cargo_id,
      cargosElegiveis: (l.cargos || []).map((c) => ({
        id: c.cargo_id,
        nome: c.cargo?.nome || 'Cargo',
        condicao: c.condicao || 'NENHUMA',
      })),
    }))
  }, [dadosResumo])

  // Cargos elegíveis para a linha selecionada na Inserção Manual
  const cargosElegiveisInsercao = useMemo(() => {
    if (!novaLinhaId) return cargosGerais
    const linha = linhasConfiguracaoDisponiveis.find((l) => l.id === novaLinhaId)
    if (!linha || linha.cargosElegiveis.length === 0) return cargosGerais
    return linha.cargosElegiveis
  }, [novaLinhaId, linhasConfiguracaoDisponiveis, cargosGerais])

  // Cargos elegíveis para a vaga selecionada na Edição Manual
  const cargosElegiveisEdicao = useMemo(() => {
    if (!vagaEmEdicao) return cargosGerais
    const linha = vagaEmEdicao.configuracao_rh_linha
    if (!linha || !linha.cargos || linha.cargos.length === 0) return cargosGerais
    return linha.cargos.map((lc) => ({
      id: lc.cargo_id,
      nome: lc.cargo?.nome || 'Cargo',
      condicao: lc.condicao || 'NENHUMA',
    }))
  }, [vagaEmEdicao, cargosGerais])

  // Disparar pergunta de geração
  const handleClicarGerarVagas = () => {
    if (!dadosResumo) return

    // Se faltam dados obrigatórios, abrir prévia diretamente mostrando a mensagem de bloqueio
    if (dadosResumo.bloqueadoPorFaltaDados) {
      setModalPreviaGeracaoAberto(true)
      return
    }

    // Se já existirem vagas geradas, perguntar / alertar
    setModalPerguntaGerarAberto(true)
  }

  // Confirmar que deseja prosseguir para a geração (seja primeira vez ou regeração)
  const handleProsseguirParaGeracao = () => {
    setModalPerguntaGerarAberto(false)
    setModalPreviaGeracaoAberto(true)
  }

  // Executar geração real idempotente no backend
  const handleConfirmarGeracaoReal = async () => {
    if (!unidadeSelecionadaId) return
    setConfirmandoGeracao(true)

    try {
      const res = await confirmarGeracaoVagas({
        unidadeEscolarId: unidadeSelecionadaId,
        anoLetivo,
        usuarioNome: user?.email || 'Operador',
        usuarioEmail: user?.email || 'operador@local',
      })

      toast({
        title: 'Vagas geradas com sucesso!',
        description: `${res.escolaNome}: ${res.totalVagasFinais} vagas gravadas (Nível ${res.nivelCodigo}). Novas criadas: +${res.novasCriadas}, abertas removidas: -${res.abertasRemovidas}, excedentes: ${res.excedentesMarcadas}.`,
      })

      setModalPreviaGeracaoAberto(false)
      recarregarTudo()
    } catch (err: any) {
      console.error('Erro ao gerar vagas:', err)
      toast({
        title: 'Erro ao gerar vagas',
        description: err.message || 'Falha durante o processamento da geração.',
        variant: 'destructive',
      })
    } finally {
      setConfirmandoGeracao(false)
    }
  }

  // Abrir modal de inserção manual
  const handleAbrirInsercaoManual = () => {
    if (linhasConfiguracaoDisponiveis.length > 0) {
      const prim = linhasConfiguracaoDisponiveis[0]
      setNovaLinhaId(prim.id)
      setNovaFuncao(prim.funcaoNome)
      setNovoCargoId(prim.cargoPadraoId || (prim.cargosElegiveis[0]?.id ?? ''))
    } else {
      setNovaLinhaId('')
      setNovaFuncao('')
      setNovoCargoId('')
    }
    setNovoPeriodo('SEM')
    setNovaModalidade('FIXO')
    setNovosDiasSemana(2)
    setNovoSequencial('')
    setNovoOcupante('')
    setNovaObservacao('')
    setModalInserirAberto(true)
  }

  // Salvar inserção manual de vaga
  const handleSalvarInsercaoManual = async () => {
    if (!unidadeSelecionadaId || !dadosResumo?.configuracaoUsada) return

    if (!novaLinhaId || !novaFuncao) {
      toast({
        title: 'Campos incompletos',
        description: 'Selecione uma função compatível com a configuração vigente.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoInsercao(true)
    try {
      await inserirVagaManual({
        unidadeEscolarId: unidadeSelecionadaId,
        anoLetivo,
        configuracaoRhId: dadosResumo.configuracaoUsada.id,
        configuracaoRhLinhaId: novaLinhaId,
        funcao: novaFuncao,
        cargoId: novoCargoId || null,
        periodo: novoPeriodo === 'SEM' ? null : novoPeriodo,
        modalidade: novaModalidade,
        diasSemana: novaModalidade === 'ITINERANTE' ? novosDiasSemana : null,
        numeroSequencial: novoSequencial ? Number(novoSequencial) : null,
        nomeOcupante: novoOcupante || null,
        observacao: novaObservacao || null,
      })

      toast({
        title: 'Vaga inserida com sucesso',
        description: `Nova vaga de ${novaFuncao} cadastrada para ${unidadeAtual?.nome}.`,
      })

      setModalInserirAberto(false)
      recarregarTudo()
    } catch (err: any) {
      console.error('Erro ao inserir vaga manualmente:', err)
      toast({
        title: 'Erro ao cadastrar vaga',
        description: err.message || 'Falha ao salvar registro.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoInsercao(false)
    }
  }

  // Abrir modal de edição manual
  const handleAbrirEdicaoManual = (v: VagaReal) => {
    setVagaEmEdicao(v)
    setEditOcupante(v.nome_ocupante || '')
    setEditCargoId(v.cargo_id || '')
    setEditPeriodo((v.periodo as PeriodoEscola) || 'SEM')
    setEditModalidade(v.modalidade === 'ITINERANTE' ? 'ITINERANTE' : 'FIXO')
    setEditDiasSemana(v.dias_semana || 2)
    setEditSequencial(String(v.numero_sequencial || '1'))
    setEditStatus(v.status)
    setEditObservacao(v.observacao || '')
    setModalEditarAberto(true)
  }

  // Salvar edição manual de vaga
  const handleSalvarEdicaoManual = async () => {
    if (!vagaEmEdicao) return
    setSalvandoEdicao(true)

    try {
      await editarVaga({
        vagaId: vagaEmEdicao.id,
        nomeOcupante: editOcupante,
        cargoId: editCargoId || null,
        periodo: editPeriodo === 'SEM' ? null : editPeriodo,
        modalidade: editModalidade,
        diasSemana: editModalidade === 'ITINERANTE' ? editDiasSemana : null,
        numeroSequencial: editSequencial ? Number(editSequencial) : null,
        status: editStatus,
        observacao: editObservacao,
      })

      toast({
        title: 'Vaga atualizada com sucesso',
        description: `Vaga ${vagaEmEdicao.codigo || vagaEmEdicao.id} editada com sucesso.`,
      })

      setModalEditarAberto(false)
      recarregarTudo()
    } catch (err: any) {
      console.error('Erro ao atualizar vaga:', err)
      toast({
        title: 'Erro ao atualizar vaga',
        description: err.message || 'Falha ao gravar alterações.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // Abrir modal de confirmação de exclusão
  const handleAbrirExclusao = (v: VagaReal) => {
    setVagaParaExcluir(v)
    setModalExcluirAberto(true)
  }

  // Confirmar exclusão manual
  const handleConfirmarExclusao = async () => {
    if (!vagaParaExcluir) return
    setExcluindoVaga(true)

    try {
      await excluirVagaManual(vagaParaExcluir.id)
      toast({
        title: 'Vaga excluída com sucesso',
        description: `A vaga ${vagaParaExcluir.codigo || ''} (${vagaParaExcluir.funcao} Nº ${vagaParaExcluir.numero_sequencial}) foi removida.`,
      })
      setModalExcluirAberto(false)
      recarregarTudo()
    } catch (err: any) {
      console.error('Erro ao excluir vaga:', err)
      toast({
        title: 'Erro ao excluir vaga',
        description: err.message || 'Falha ao excluir registro.',
        variant: 'destructive',
      })
    } finally {
      setExcluindoVaga(false)
    }
  }

  // Liberar vaga rápida (remover ocupante)
  const handleLiberarVagaRapida = async (v: VagaReal) => {
    if (
      !confirm(
        `Deseja desvincular o ocupante "${v.nome_ocupante}" da vaga ${v.codigo || ''}? O status voltará para ABERTA.`,
      )
    ) {
      return
    }

    try {
      await liberarVaga(v.id)
      toast({
        title: 'Vaga liberada com sucesso',
        description: 'Ocupante desvinculado. Status alterado para ABERTA.',
      })
      recarregarTudo()
    } catch (err: any) {
      console.error('Erro ao liberar vaga:', err)
      toast({
        title: 'Erro ao liberar vaga',
        description: err.message || 'Falha ao liberar vaga.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ==================================================================== */}
      {/* CABEÇALHO DA TELA */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-blue-600" />
            Cadastro de Vagas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Geração por Unidade Escolar e Ano Letivo com base no Porte da Escola, Turmas e
            Configuração de RH Vigente.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalAjudaAberto(true)}
            className="text-slate-700 bg-white"
          >
            <HelpCircle className="w-4 h-4 mr-1.5 text-blue-600" />
            Ajuda e Regras
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={recarregarTudo}
            disabled={carregando || carregandoResumo}
            className="text-slate-700 bg-white"
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${carregando || carregandoResumo ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarVagasExcel(
                vagas,
                `vagas-${unidadeAtual?.codigo || 'escola'}-${anoLetivo}.csv`,
              )
            }
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
                escolaNome: unidadeAtual?.nome || 'Unidade Escolar',
                totalGeral: resumoEstatistico.total,
                totalOcupadas: resumoEstatistico.ocupadas,
                totalAbertas: resumoEstatistico.abertas,
                totalExcedentes: resumoEstatistico.excedentes,
              })
            }
            disabled={vagas.length === 0}
            className="text-slate-700 bg-white"
          >
            <Printer className="w-4 h-4 mr-1.5 text-blue-600" />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1) FILTROS PRINCIPAIS: ANO LETIVO e UNIDADE ESCOLAR */}
      {/* ==================================================================== */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
            <School className="w-4 h-4 text-blue-600" />
            Seleção Principal
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Selecione o Ano Letivo e a Unidade Escolar. O sistema resgata automaticamente todos os
            dados de porte, turmas e configuração.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Ano Letivo */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Ano Letivo
              </Label>
              <Select value={String(anoLetivo)} onValueChange={(val) => setAnoLetivo(Number(val))}>
                <SelectTrigger className="mt-1 h-10 text-sm font-semibold text-slate-900 bg-white border-slate-300">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {ANOS_DISPONIVEIS.map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>
                      Ano Letivo {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unidade Escolar */}
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Unidade Escolar
              </Label>
              <Select value={unidadeSelecionadaId} onValueChange={setUnidadeSelecionadaId}>
                <SelectTrigger className="mt-1 h-10 text-sm font-semibold text-slate-900 bg-white border-slate-300">
                  <SelectValue placeholder="Selecione uma Unidade Escolar" />
                </SelectTrigger>
                <SelectContent>
                  {escolas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({e.codigo || 'S/C'}) —{' '}
                      {e.tipo_atendimento.includes('40h') ? '40h' : '20h'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================================================================== */}
      {/* 2) PAINEL RESUMO RESGATADO AUTOMATICAMENTE (SOMENTE LEITURA) */}
      {/* ==================================================================== */}
      <Card className="bg-gradient-to-br from-slate-50 to-blue-50/40 border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-3 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Resumo Automático da Unidade Escolar ({anoLetivo})
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Dados integrados de Tipo de Atendimento, Porte da Escola por Ano Letivo, Turmas e
              Configuração Vigente.
            </p>
          </div>

          {podeEditar && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleClicarGerarVagas}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold text-xs h-9"
              >
                <PlayCircle className="w-4 h-4 mr-1.5" />
                Gerar Vagas
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4">
          {carregandoResumo ? (
            <div className="py-8 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              Resgatando dados do Porte da Escola, Turmas e Configuração...
            </div>
          ) : !dadosResumo ? (
            <p className="text-xs text-slate-500">Selecione uma unidade para resgatar os dados.</p>
          ) : (
            <div className="space-y-4">
              {/* Aviso se Porte não está cadastrado */}
              {!dadosResumo.porteEscola && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <p className="font-bold">
                      Aviso: Porte da Escola não cadastrado para {anoLetivo}
                    </p>
                    <p className="mt-0.5 text-amber-800">
                      Não foi encontrado registro para esta unidade escolar no cadastro{' '}
                      <strong>"Cadastros Mestres &gt; Porte da Escola por Ano Letivo"</strong>.{' '}
                      Cadastre o porte (quantidade de alunos e nível) antes de gerar as vagas.
                    </p>
                  </div>
                </div>
              )}

              {/* Grid de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Tipo de Atendimento */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Tipo de Atendimento
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {dadosResumo.escola.tipo_atendimento}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Código: {dadosResumo.escola.codigo || '—'}
                  </span>
                </div>

                {/* 2. Dados do Porte da Escola no Ano Letivo */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Porte no Ano Letivo (porte_escola_ano)
                  </span>
                  {dadosResumo.porteEscola ? (
                    <>
                      <p className="text-base font-bold text-blue-700 mt-1">
                        {dadosResumo.porteEscola.quantidade_alunos} Alunos
                      </p>
                      <p
                        className="text-xs font-semibold text-slate-800 truncate"
                        title={dadosResumo.porteEscola.nivel_faixa}
                      >
                        {dadosResumo.porteEscola.nivel_faixa}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-amber-700 font-semibold mt-1">
                      Não cadastrado no módulo de Porte
                    </p>
                  )}
                </div>

                {/* 3. Dados das Turmas */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Turmas Vinculadas ({anoLetivo})
                  </span>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {dadosResumo.turmasCadastradas.length} Turmas
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {Object.entries(dadosResumo.contagemTurmasPorEtapa)
                      .map(([etapa, qtd]) => `${etapa}: ${qtd}`)
                      .join(' · ') || 'Sem turmas cadastradas'}
                  </p>
                </div>

                {/* 4. Configuração de RH Vigente */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Configuração de Vagas
                  </span>
                  <p className="text-sm font-bold text-blue-900 mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      {dadosResumo.configuracaoUsada.codigo || dadosResumo.configuracaoUsada.id}
                    </span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge
                      className={`text-[10px] font-semibold ${
                        dadosResumo.configuracaoUsada.status === 'VIGENTE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {dadosResumo.configuracaoUsada.status}
                    </Badge>
                    <span className="text-[11px] text-slate-500">
                      Ano {dadosResumo.configuracaoUsada.ano_letivo}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informação detalhada sobre a configuração usada */}
              <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-md text-xs text-blue-900 flex items-center justify-between">
                <span>
                  <strong>Critério de Resolução:</strong> {dadosResumo.motivoConfiguracao}
                </span>
                <span className="text-[11px] text-blue-700">
                  Data de criação:{' '}
                  {new Date(dadosResumo.configuracaoUsada.created_at || '').toLocaleDateString(
                    'pt-BR',
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================================================================== */}
      {/* 3) RESUMO ESTATÍSTICO DE VAGAS GERADAS DA UNIDADE NO TOPO */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total de Vagas
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{resumoEstatistico.total}</p>
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
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {resumoEstatistico.ocupadas}
              </p>
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
              <p className="text-2xl font-bold text-blue-700 mt-1">{resumoEstatistico.abertas}</p>
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
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {resumoEstatistico.excedentes}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ==================================================================== */}
      {/* FILTROS DA LISTAGEM DE VAGAS */}
      {/* ==================================================================== */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
            <Filter className="w-4 h-4 text-blue-600" />
            Filtros da Listagem de Vagas
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                  {cargosGerais.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
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

            {/* Modalidade */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Modalidade</Label>
              <Select value={modalidadeFiltro} onValueChange={setModalidadeFiltro}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  <SelectItem value="FIXO">Fixo</SelectItem>
                  <SelectItem value="ITINERANTE">Itinerante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Status</Label>
              <Select value={statusFiltro} onValueChange={(val: any) => setStatusFiltro(val)}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Todos os status" />
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

            {/* Busca textual livre */}
            <div className="sm:col-span-2 md:col-span-4 lg:col-span-6">
              <Label className="text-xs text-slate-600 font-medium">
                Busca textual (nome do ocupante, código, função, cargo)
              </Label>
              <div className="relative mt-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                <Input
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  placeholder="Filtrar por nome de ocupante, cargo ou código de vaga..."
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================================================================== */}
      {/* 4 e 5) LISTAGEM DE VAGAS COM INSERÇÃO, EDIÇÃO E EXCLUSÃO MANUAL */}
      {/* ==================================================================== */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              Vagas de {unidadeAtual?.nome || 'Unidade'} ({anoLetivo})
            </span>
            <Badge
              variant="secondary"
              className="font-semibold text-xs bg-slate-100 text-slate-700"
            >
              {vagas.length} registros
            </Badge>
          </div>

          {podeEditar && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleAbrirInsercaoManual}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Inserir Vaga Manual
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow className="border-b border-slate-200 text-xs">
                <TableHead className="w-24 font-semibold text-slate-700">Código</TableHead>
                <TableHead className="font-semibold text-slate-700">Unidade Escolar</TableHead>
                <TableHead className="w-16 font-semibold text-slate-700">Ano</TableHead>
                <TableHead className="font-semibold text-slate-700">Função</TableHead>
                <TableHead className="w-16 font-semibold text-slate-700 text-center">Nº</TableHead>
                <TableHead className="font-semibold text-slate-700">Período</TableHead>
                <TableHead className="font-semibold text-slate-700">Modalidade (dias)</TableHead>
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
                    <p className="font-semibold text-slate-700 text-sm">
                      Nenhuma vaga cadastrada para {unidadeAtual?.nome} em {anoLetivo}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Utilize o botão "Gerar Vagas" no topo para dimensionar automaticamente ou
                      "Inserir Vaga Manual" para criar manualmente.
                    </p>
                    {podeEditar && (
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={handleClicarGerarVagas}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                          <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                          Gerar Vagas
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAbrirInsercaoManual}
                          className="text-xs"
                        >
                          <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                          Inserir Manualmente
                        </Button>
                      </div>
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
                      {v.unidade_escolar?.nome || '—'}
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
                          Itinerante {v.dias_semana ? `(${v.dias_semana}d)` : ''}
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
                        <span
                          className="font-semibold text-slate-900 block truncate max-w-[160px]"
                          title={v.nome_ocupante}
                        >
                          {v.nome_ocupante}
                        </span>
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
                    <TableCell className="text-right">
                      {podeEditar && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAbrirEdicaoManual(v)}
                            title="Editar vaga"
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {v.nome_ocupante && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLiberarVagaRapida(v)}
                              title="Liberar ocupante (status volta para ABERTA)"
                              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAbrirExclusao(v)}
                            title="Excluir vaga"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
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
      {/* MODAL 3.A: PERGUNTA SE DESEJA GERAR AS VAGAS + ALERTA SE JÁ EXISTEM */}
      {/* ==================================================================== */}
      <Dialog open={modalPerguntaGerarAberto} onOpenChange={setModalPerguntaGerarAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              Gerar Vagas para {unidadeAtual?.nome}?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ano Letivo: {anoLetivo} · Nível calculado: {dadosResumo?.nivelEncontradoCodigo || '—'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Alerta se já existem vagas geradas */}
            {dadosResumo && dadosResumo.vagasExistentes.length > 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Atenção: Já existem vagas geradas para esta unidade!
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                      Esta escola já possui{' '}
                      <strong>{dadosResumo.vagasExistentes.length} vagas</strong> cadastradas no ano{' '}
                      {anoLetivo} (
                      {dadosResumo.vagasExistentes.filter((v) => v.status === 'OCUPADA').length}{' '}
                      ocupadas,{' '}
                      {dadosResumo.vagasExistentes.filter((v) => v.status === 'ABERTA').length}{' '}
                      abertas).
                    </p>
                    <p className="text-[11px] text-amber-800 mt-1 font-semibold">
                      Você pode gerar novamente com segurança: vagas OCUPADAS nunca são apagadas.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                Ainda não há vagas geradas para esta unidade escolar no ano letivo {anoLetivo}.
                Deseja prosseguir para a prévia do cálculo?
              </div>
            )}

            <p className="text-xs text-slate-600">
              Deseja que o sistema gere as vagas dimensionadas para esta Unidade Escolar?
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalPerguntaGerarAberto(false)}
              className="text-xs"
            >
              Não
            </Button>
            <Button
              size="sm"
              onClick={handleProsseguirParaGeracao}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              Sim, Gerar Vagas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 3.B: PRÉVIA DA GERAÇÃO / REGERAÇÃO IDEMPOTENTE */}
      {/* ==================================================================== */}
      <Dialog open={modalPreviaGeracaoAberto} onOpenChange={setModalPreviaGeracaoAberto}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              Prévia do Dimensionamento de Vagas: {unidadeAtual?.nome} ({anoLetivo})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Confira os impactos da geração antes de confirmar a gravação definitiva.
            </DialogDescription>
          </DialogHeader>

          {dadosResumo?.bloqueadoPorFaltaDados ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    Geração Bloqueada: Faltam Dados Obrigatórios
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    {dadosResumo.bloqueadoPorFaltaDados.mensagem}
                  </p>
                </div>
              </div>
            </div>
          ) : dadosResumo ? (
            <div className="space-y-4 py-2">
              {/* Resumo da configuração e enquadramento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                    Nível / Porte
                  </span>
                  <span className="text-lg font-bold text-blue-700">
                    Nível {dadosResumo.nivelEncontradoCodigo}
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    {dadosResumo.nivelFaixaDescricao}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                    Base de Entrada
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {dadosResumo.unidadeAno.qtd_alunos} alunos · {dadosResumo.unidadeAno.qtd_turmas}{' '}
                    turmas
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Períodos: {dadosResumo.unidadeAno.periodos?.join(', ') || 'Nenhum'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                    Impacto do Cálculo
                  </span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">
                    {dadosResumo.resumoTexto}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Total final: {dadosResumo.totalVagasCalculadas} vagas
                  </span>
                </div>
              </div>

              {/* Tabela de Vagas por Função */}
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
                    {dadosResumo.vagasLinhas.map((vl) => (
                      <TableRow key={vl.linhaId} className="text-xs">
                        <TableCell className="font-semibold text-slate-800">{vl.funcao}</TableCell>
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

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalPreviaGeracaoAberto(false)}
              disabled={confirmandoGeracao}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarGeracaoReal}
              disabled={confirmandoGeracao || Boolean(dadosResumo?.bloqueadoPorFaltaDados)}
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
                  Confirmar e Gravar Vagas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 4.A: INSERÇÃO MANUAL DE VAGA */}
      {/* ==================================================================== */}
      <Dialog open={modalInserirAberto} onOpenChange={setModalInserirAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              Inserir Vaga Manual
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Unidade: {unidadeAtual?.nome} · Ano Letivo: {anoLetivo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {/* Escolha da Linha / Função da configuração vigente */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Função (linhas da configuração vigente) *
              </Label>
              <Select
                value={novaLinhaId}
                onValueChange={(id) => {
                  setNovaLinhaId(id)
                  const lin = linhasConfiguracaoDisponiveis.find((l) => l.id === id)
                  if (lin) {
                    setNovaFuncao(lin.funcaoNome)
                    setNovoCargoId(lin.cargoPadraoId || (lin.cargosElegiveis[0]?.id ?? ''))
                  }
                }}
              >
                <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {linhasConfiguracaoDisponiveis.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.funcaoNome} ({l.baseCalculo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cargo permitido */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Cargo (somente permitidos para {novaFuncao || 'a função'})
              </Label>
              <Select value={novoCargoId} onValueChange={setNovoCargoId}>
                <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                  <SelectValue placeholder="Selecione o cargo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum / A vincular posteriormente</SelectItem>
                  {cargosElegiveisInsercao.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.condicao && c.condicao !== 'NENHUMA' ? `(${c.condicao})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período e Modalidade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Período</Label>
                <Select value={novoPeriodo} onValueChange={(val: any) => setNovoPeriodo(val)}>
                  <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEM">Geral / Sem Período</SelectItem>
                    <SelectItem value="MANHA">Manhã</SelectItem>
                    <SelectItem value="TARDE">Tarde</SelectItem>
                    <SelectItem value="INTEGRAL">Integral</SelectItem>
                    <SelectItem value="NOITE">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Modalidade</Label>
                <Select value={novaModalidade} onValueChange={(val: any) => setNovaModalidade(val)}>
                  <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                    <SelectValue placeholder="Modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXO">Fixo</SelectItem>
                    <SelectItem value="ITINERANTE">Itinerante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dias se itinerante e Número Sequencial */}
            <div className="grid grid-cols-2 gap-3">
              {novaModalidade === 'ITINERANTE' && (
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Dias na Semana</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={novosDiasSemana}
                    onChange={(e) => setNovosDiasSemana(Number(e.target.value) || 2)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Nº Sequencial (opcional)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={novoSequencial}
                  onChange={(e) => setNovoSequencial(e.target.value)}
                  placeholder="Automático se vazio"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Ocupante */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Nome do Ocupante (opcional)
              </Label>
              <Input
                value={novoOcupante}
                onChange={(e) => setNovoOcupante(e.target.value)}
                placeholder="Ex: Maria dos Santos"
                className="mt-1 h-9 text-xs"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Com ocupante preenchido o status vira <strong>OCUPADA</strong>; sem vira{' '}
                <strong>ABERTA</strong>.
              </span>
            </div>

            {/* Observação */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Observação</Label>
              <Input
                value={novaObservacao}
                onChange={(e) => setNovaObservacao(e.target.value)}
                placeholder="Ex: Vaga inserida manualmente por necessidade pedagógica."
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalInserirAberto(false)}
              disabled={salvandoInsercao}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarInsercaoManual}
              disabled={salvandoInsercao}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {salvandoInsercao ? 'Salvando...' : 'Salvar Vaga'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 4.B: EDIÇÃO MANUAL DE VAGA */}
      {/* ==================================================================== */}
      <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Pencil className="w-5 h-5 text-blue-600" />
              Editar Vaga: {vagaEmEdicao?.funcao} (Nº {vagaEmEdicao?.numero_sequencial})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Código: {vagaEmEdicao?.codigo || '—'} · Unidade: {vagaEmEdicao?.unidade_escolar?.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {/* Ocupante */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Nome do Ocupante</Label>
              <Input
                value={editOcupante}
                onChange={(e) => setEditOcupante(e.target.value)}
                placeholder="Deixe vazio para liberar a vaga"
                className="mt-1 h-9 text-xs"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Com ocupante preenchido o status vira <strong>OCUPADA</strong>. Se vazio, vira{' '}
                <strong>ABERTA</strong>.
              </span>
            </div>

            {/* Cargo permitido */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Cargo (Permitidos para {vagaEmEdicao?.funcao})
              </Label>
              <Select value={editCargoId} onValueChange={setEditCargoId}>
                <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                  <SelectValue placeholder="Selecione o cargo do ocupante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum / Desvincular cargo</SelectItem>
                  {cargosElegiveisEdicao.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.condicao && c.condicao !== 'NENHUMA' ? `(${c.condicao})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período e Modalidade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Período</Label>
                <Select value={editPeriodo} onValueChange={(val: any) => setEditPeriodo(val)}>
                  <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEM">Sem Período</SelectItem>
                    <SelectItem value="MANHA">Manhã</SelectItem>
                    <SelectItem value="TARDE">Tarde</SelectItem>
                    <SelectItem value="INTEGRAL">Integral</SelectItem>
                    <SelectItem value="NOITE">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Modalidade</Label>
                <Select value={editModalidade} onValueChange={(val: any) => setEditModalidade(val)}>
                  <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                    <SelectValue placeholder="Modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXO">Fixo</SelectItem>
                    <SelectItem value="ITINERANTE">Itinerante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dias de itinerância e Sequencial */}
            <div className="grid grid-cols-2 gap-3">
              {editModalidade === 'ITINERANTE' && (
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Dias na Semana</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={editDiasSemana}
                    onChange={(e) => setEditDiasSemana(Number(e.target.value) || 2)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold text-slate-700">Nº Sequencial</Label>
                <Input
                  type="number"
                  min={1}
                  value={editSequencial}
                  onChange={(e) => setEditSequencial(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Status (se ocupante, pode ser forçado para EXCEDENTE) */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Status</Label>
              <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)}>
                <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABERTA">ABERTA (sem ocupante)</SelectItem>
                  <SelectItem value="OCUPADA">OCUPADA (com ocupante)</SelectItem>
                  <SelectItem value="EXCEDENTE">EXCEDENTE (ocupante excedente)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observação */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Observação</Label>
              <Input
                value={editObservacao}
                onChange={(e) => setEditObservacao(e.target.value)}
                placeholder="Observações adicionais"
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalEditarAberto(false)}
              disabled={salvandoEdicao}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarEdicaoManual}
              disabled={salvandoEdicao}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 4.C: EXCLUSÃO DE VAGA */}
      {/* ==================================================================== */}
      <Dialog open={modalExcluirAberto} onOpenChange={setModalExcluirAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-700">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Confirmar Exclusão de Vaga
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Esta ação removerá a vaga permanentemente e registrará auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-700 leading-relaxed">
              Deseja realmente excluir a vaga{' '}
              <strong>
                {vagaParaExcluir?.codigo || ''} ({vagaParaExcluir?.funcao} Nº{' '}
                {vagaParaExcluir?.numero_sequencial})
              </strong>{' '}
              de <strong>{vagaParaExcluir?.unidade_escolar?.nome}</strong>?
            </p>

            {vagaParaExcluir?.status === 'OCUPADA' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção reforçada:</strong> Esta vaga está atualmente{' '}
                  <strong>OCUPADA</strong> pelo servidor{' '}
                  <strong>"{vagaParaExcluir.nome_ocupante}"</strong>. Ao excluir a vaga, o vínculo
                  será desfeito.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalExcluirAberto(false)}
              disabled={excluindoVaga}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarExclusao}
              disabled={excluindoVaga}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              {excluindoVaga ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 7: AJUDA E REGRAS DO CADASTRO DE VAGAS */}
      {/* ==================================================================== */}
      <Dialog open={modalAjudaAberto} onOpenChange={setModalAjudaAberto}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              Ajuda e Regras — Cadastro de Vagas (Etapa 2)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Orientações sobre o novo fluxo de seleção, resumo automático, geração e edição manual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs text-slate-700 py-2 leading-relaxed">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-bold text-blue-900 text-sm mb-1">
                1. Atributos Principais da Tela
              </h4>
              <p>
                A tela opera com base em <strong>"Ano Letivo"</strong> e{' '}
                <strong>"Unidade Escolar"</strong>. Ao selecionar a unidade, o sistema não exige
                digitação de alunos nem turmas: esses dados são resgatados automaticamente das suas
                fontes oficiais.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                2. Origem dos Dados no Resumo Automático
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Tipo de Atendimento:</strong> resgatado do cadastro mestre da Unidade
                  Escolar (20h ou 40h).
                </li>
                <li>
                  <strong>Porte da Escola por Ano Letivo:</strong> resgatado da tabela{' '}
                  <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">
                    porte_escola_ano
                  </code>{' '}
                  (quantidade de alunos e Nível/Faixa da escola no ano). Se não houver registro, o
                  sistema exibe um aviso amigável orientando o cadastro antes de gerar as vagas.
                </li>
                <li>
                  <strong>Turmas:</strong> resgatadas do cadastro de Turmas vinculadas à unidade e
                  ano, agrupadas por Etapa, Ano/Série e contagem total.
                </li>
                <li>
                  <strong>Configuração de Vagas Vigente:</strong> resgatada da Etapa 1. O sistema
                  utiliza prioritariamente a configuração com status <strong>VIGENTE</strong> para o
                  tipo de atendimento e ano letivo da escola; se não houver vigente, utiliza a mais
                  recente cadastrada informando na tela o critério.
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                3. Pergunta de Geração e Regeneração Idempotente
              </h4>
              <p>
                Ao clicar em <strong>"Gerar Vagas"</strong>, o sistema pergunta se você deseja gerar
                as vagas. Se a escola já possui vagas geradas no ano letivo, é exibido um alerta
                informando as quantidades atuais, mas possibilitando a regeração com segurança:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  <strong>Vagas OCUPADAS nunca são apagadas:</strong> se o novo porte diminuir o
                  total, a vaga ocupada excedente passa para o status <strong>EXCEDENTE</strong>{' '}
                  para servir de base de remanejamento.
                </li>
                <li>
                  <strong>Vagas ABERTAS em excesso:</strong> são removidas somente após exibição na
                  prévia detalhada.
                </li>
                <li>
                  <strong>Vagas faltantes:</strong> são criadas com sequenciais contínuos
                  preservando o histórico.
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                4. Inserção, Edição e Exclusão Manual de Vagas
              </h4>
              <p>O sistema permite a gestão manual de vagas além da geração automática:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  <strong>Inserir vaga manual:</strong> selecione a função (a partir das linhas da
                  configuração vigente), cargo (filtrado apenas pelos cargos permitidos da linha),
                  período, modalidade e ocupante.
                </li>
                <li>
                  <strong>Regra de Status:</strong> com ocupante informado o status é
                  automaticamente <strong>OCUPADA</strong>; ao remover o ocupante o status volta
                  para <strong>ABERTA</strong>.
                </li>
                <li>
                  <strong>Exclusão Manual:</strong> permite excluir qualquer vaga com confirmação;
                  se a vaga for OCUPADA, é exibido um alerta reforçado destacando a desvinculação do
                  servidor.
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">5. Auditoria de Ações</h4>
              <p>
                Todas as operações de geração, regeração, inserção manual, edição e exclusão de
                vagas são registradas na Auditoria com o usuário responsável, data/hora e valores
                antigos/novos.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-200">
            <Button
              size="sm"
              onClick={() => setModalAjudaAberto(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VagasPage
