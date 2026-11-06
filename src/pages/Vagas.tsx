import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  UnidadeEscolar,
  VagaReal,
  StatusVagaReal,
  Cargo,
  Funcao,
  Profissional,
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
  obterResumoVagasAnoOrigem,
  migrarVagasAnoLetivo,
  ResumoVagasAnoOrigem,
  PeriodoVagaOpcao,
  ModalidadeVagaOpcao,
  StatusOcupanteForm,
} from '@/services/vagas'
import { ANOS_LETIVOS } from './Etapas'
import { getUnidadesEscolares } from '@/services/unidades-escolares'
import { getCargos, getFuncoes } from '@/services/apoio'
import { getProfissionais } from '@/services/profissionais'
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
  const [vagaExcedenteFiltro, setVagaExcedenteFiltro] = useState<'TODAS' | 'SIM' | 'NAO'>('TODAS')
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

  // Modal de Escolha / Fluxo Gerar Vagas (Simples vs Migração)
  const [modalEscolhaModoGerarAberto, setModalEscolhaModoGerarAberto] = useState<boolean>(false)
  const [modoGeracaoSelecionado, setModoGeracaoSelecionado] = useState<'SIMPLES' | 'MIGRACAO'>(
    'SIMPLES',
  )

  // Estado da Migração de Ano Letivo
  const [anoOrigemMigracao, setAnoOrigemMigracao] = useState<number | null>(null)
  const [carregandoResumoMigracao, setCarregandoResumoMigracao] = useState<boolean>(false)
  const [resumoMigracao, setResumoMigracao] = useState<ResumoVagasAnoOrigem | null>(null)
  const [modalConfirmarMigracaoAberto, setModalConfirmarMigracaoAberto] = useState<boolean>(false)
  const [executandoMigracao, setExecutandoMigracao] = useState<boolean>(false)

  // Modais de Geração / Regeneração Simples
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

  const [funcoesGerais, setFuncoesGerais] = useState<Funcao[]>([])
  const [profissionaisGerais, setProfissionaisGerais] = useState<Profissional[]>([])

  // Atributos do novo formulário unificado (criação / edição)
  const [modalFormularioAberto, setModalFormularioAberto] = useState<boolean>(false)
  const [modoEdicao, setModoEdicao] = useState<boolean>(false)
  const [vagaSelecionada, setVagaSelecionada] = useState<VagaReal | null>(null)

  // 1. Identificação
  const [formIdentificacao, setFormIdentificacao] = useState<string>('')
  // 2. Ano Letivo
  const [formAnoLetivo, setFormAnoLetivo] = useState<number>(2026)
  // 3. Unidade Escolar
  const [formUnidadeId, setFormUnidadeId] = useState<string>('')
  // 4. Tipo de Vínculo: Cargo ou Função
  const [formTipoVinculo, setFormTipoVinculo] = useState<'CARGO' | 'FUNCAO'>('FUNCAO')
  // 5. Cargo da Vaga ou Função da Vaga
  const [formCargoId, setFormCargoId] = useState<string>('')
  const [formFuncaoId, setFormFuncaoId] = useState<string>('')
  // 6. Período
  const [formPeriodo, setFormPeriodo] = useState<PeriodoVagaOpcao>('GERAL')
  // 7. Modalidade
  const [formModalidade, setFormModalidade] = useState<ModalidadeVagaOpcao>('FIXO')
  const [formDiasSemana, setFormDiasSemana] = useState<number>(2)
  // 8. Status da Vaga do Ocupante (Aberta / Preenchida / Opcional vazio)
  const [formStatusOcupante, setFormStatusOcupante] = useState<StatusOcupanteForm>('ABERTA')
  // 9. Profissional Titular
  const [formTitularId, setFormTitularId] = useState<string>('')
  // 10. Profissional Ocupante
  const [formOcupanteId, setFormOcupanteId] = useState<string>('')

  // Outros campos auxiliares
  const [formSequencial, setFormSequencial] = useState<string>('')
  const [formObservacao, setFormObservacao] = useState<string>('')
  const [salvandoFormulario, setSalvandoFormulario] = useState<boolean>(false)

  // Carregar Unidades, Cargos, Funções e Profissionais na montagem
  useEffect(() => {
    async function carregarMestres() {
      try {
        const [listaEscolas, listaCargos, listaFuncoes, listaProfissionais] = await Promise.all([
          getUnidadesEscolares(),
          getCargos(),
          getFuncoes(),
          getProfissionais(),
        ])
        setEscolas(listaEscolas)
        setCargosGerais(listaCargos)
        setFuncoesGerais(listaFuncoes)
        setProfissionaisGerais(listaProfissionais)
        // Selecionar a primeira unidade ativa se nenhuma selecionada
        if (listaEscolas.length > 0 && !unidadeSelecionadaId) {
          setUnidadeSelecionadaId(listaEscolas[0].id)
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados mestres:', err)
        toast({
          title: 'Erro ao carregar cadastros básicos',
          description: err.message || 'Falha ao buscar unidades, cargos e funções.',
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
      const isTodasUnidades =
        unidadeSelecionadaId === 'TODAS' ||
        unidadeSelecionadaId === 'TODOS' ||
        unidadeSelecionadaId === ''

      // 1. Calcular resumo automático e prévia da unidade selecionada
      if (isTodasUnidades) {
        setDadosResumo(null)
      } else {
        const previaRes = await calcularPreviaGeracao(unidadeSelecionadaId, anoLetivo)
        setDadosResumo(previaRes)
      }

      // 2. Listar vagas cadastradas com filtros (com 'TODAS' / 'TODOS', traz todas as vagas do ano)
      const listaVagas = await listarVagasCompletas({
        anoLetivo,
        unidadeEscolarId: isTodasUnidades ? undefined : unidadeSelecionadaId,
        funcao: funcaoFiltro,
        cargoId: cargoFiltro,
        periodo: periodoFiltro,
        modalidade: modalidadeFiltro,
        status: statusFiltro,
        comOcupante: comOcupanteFiltro,
        vagaExcedente: vagaExcedenteFiltro,
        buscaTexto,
      })
      setVagas(listaVagas as unknown as VagaReal[])
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
    vagaExcedenteFiltro,
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

  // Carregar anos letivos que podem ser origem de migração (excluindo ano letivo destino atual)
  const anosOrigemDisponiveis = useMemo(() => {
    return ANOS_LETIVOS.filter((ano) => ano !== anoLetivo)
  }, [anoLetivo])

  // Abrir fluxo de Gerar Vagas (com escolha de modalidade)
  const handleClicarGerarVagas = () => {
    if (!unidadeSelecionadaId) return
    setModoGeracaoSelecionado('SIMPLES')
    // Resetar estado de migração
    const sugestaoOrigem = anoLetivo > 2020 ? anoLetivo - 1 : 2025
    setAnoOrigemMigracao(sugestaoOrigem)
    setResumoMigracao(null)
    setModalEscolhaModoGerarAberto(true)
  }

  // Ao mudar ano de origem na migração, buscar resumo
  useEffect(() => {
    if (!modalEscolhaModoGerarAberto || modoGeracaoSelecionado !== 'MIGRACAO') return
    if (!unidadeSelecionadaId || !anoOrigemMigracao) return

    let cancelado = false
    async function carregarResumoOrigem() {
      setCarregandoResumoMigracao(true)
      try {
        const resumo = await obterResumoVagasAnoOrigem(anoOrigemMigracao!, unidadeSelecionadaId)
        if (!cancelado) {
          setResumoMigracao(resumo)
        }
      } catch (err: any) {
        if (!cancelado) {
          console.error('Erro ao obter resumo do ano de origem:', err)
          toast({
            title: 'Erro ao carregar dados de origem',
            description: err.message || 'Falha ao buscar vagas do ano de origem.',
            variant: 'destructive',
          })
        }
      } finally {
        if (!cancelado) {
          setCarregandoResumoMigracao(false)
        }
      }
    }

    carregarResumoOrigem()
    return () => {
      cancelado = true
    }
  }, [modalEscolhaModoGerarAberto, modoGeracaoSelecionado, unidadeSelecionadaId, anoOrigemMigracao])

  // Confirmar que deseja prosseguir no modo Simples para a pergunta/prévia
  const handleProsseguirModoSimples = () => {
    setModalEscolhaModoGerarAberto(false)
    if (!dadosResumo) return

    if (dadosResumo.bloqueadoPorFaltaDados) {
      setModalPreviaGeracaoAberto(true)
      return
    }

    setModalPerguntaGerarAberto(true)
  }

  // Prosseguir no modo Migração para confirmação
  const handleProsseguirModoMigracao = () => {
    if (!resumoMigracao || resumoMigracao.total === 0) return
    setModalEscolhaModoGerarAberto(false)
    setModalConfirmarMigracaoAberto(true)
  }

  // Executar migração real
  const handleConfirmarMigracaoReal = async () => {
    if (!unidadeSelecionadaId || !anoOrigemMigracao) return
    setExecutandoMigracao(true)

    try {
      const res = await migrarVagasAnoLetivo({
        unidadeEscolarId: unidadeSelecionadaId,
        anoOrigem: anoOrigemMigracao,
        anoDestino: anoLetivo,
        usuarioNome: user?.email || 'Operador',
        usuarioEmail: user?.email || 'operador@local',
      })

      toast({
        title: 'Migração concluída com sucesso!',
        description: `${res.escolaNome}: ${res.migradasCriadas} vagas copiadas de ${res.anoOrigem} para ${res.anoDestino} (todas ABERTAS, sem ocupante). Total final: ${res.totalDestinoFinal} vagas.`,
      })

      setModalConfirmarMigracaoAberto(false)
      recarregarTudo()
    } catch (err: any) {
      console.error('Erro ao migrar vagas:', err)
      toast({
        title: 'Erro ao migrar vagas',
        description: err.message || 'Falha durante o processo de migração de vagas.',
        variant: 'destructive',
      })
    } finally {
      setExecutandoMigracao(false)
    }
  }

  // Confirmar que deseja prosseguir para a geração (seja primeira vez ou regeração simples)
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

  // Abrir modal de nova vaga (novo formulário com os 10 atributos na ordem exata do usuário)
  const handleAbrirNovaVaga = () => {
    setModoEdicao(false)
    setVagaSelecionada(null)
    setFormIdentificacao('(Gerada automaticamente ao salvar — ex.: VAG-0001 / VAGP-0001)')
    setFormAnoLetivo(anoLetivo)
    setFormUnidadeId(unidadeSelecionadaId || (escolas[0]?.id ?? ''))
    setFormTipoVinculo('FUNCAO')
    setFormCargoId('')
    setFormFuncaoId(funcoesGerais[0]?.id ?? '')
    setFormPeriodo('GERAL')
    setFormModalidade('FIXO')
    setFormDiasSemana(2)
    setFormStatusOcupante('ABERTA')
    setFormTitularId('')
    setFormOcupanteId('')
    setFormSequencial('')
    setFormObservacao('')
    setModalFormularioAberto(true)
  }

  // Abrir modal de edição (preenche os 10 atributos na ordem exata)
  const handleAbrirEdicaoVaga = (v: VagaReal) => {
    setModoEdicao(true)
    setVagaSelecionada(v)
    setFormIdentificacao(v.codigo || v.id)
    setFormAnoLetivo(v.ano_letivo)
    setFormUnidadeId(v.unidade_escolar_id)

    // Tipo de vínculo
    const vinculo: 'CARGO' | 'FUNCAO' =
      (v.tipo_vinculo as 'CARGO' | 'FUNCAO') || (v.cargo_id && !v.funcao_id ? 'CARGO' : 'FUNCAO')
    setFormTipoVinculo(vinculo)
    setFormCargoId(v.cargo_id || '')
    setFormFuncaoId(v.funcao_id || '')

    // Período mapeado para as 5 opções
    const pStr = (v.periodo || '').toUpperCase()
    let pVal: PeriodoVagaOpcao = 'GERAL'
    if (pStr === 'MANHA' || pStr === 'MANHÃ') pVal = 'MANHA'
    else if (pStr === 'TARDE') pVal = 'TARDE'
    else if (pStr === 'INTEGRAL') pVal = 'INTEGRAL'
    else if (pStr === 'NOITE') pVal = 'NOITE'
    setFormPeriodo(pVal)

    // Modalidade
    setFormModalidade((v.modalidade as ModalidadeVagaOpcao) || 'FIXO')
    setFormDiasSemana(v.dias_semana || 2)

    // Status da Vaga do Ocupante: "Aberta" ou "Preenchida"
    setFormStatusOcupante(v.status === 'OCUPADA' ? 'PREENCHIDA' : 'ABERTA')

    // Profissionais
    setFormTitularId(v.profissional_titular_id || '')
    setFormOcupanteId(v.profissional_ocupante_id || '')

    // Auxiliares
    setFormSequencial(String(v.numero_sequencial || ''))
    setFormObservacao(v.observacao || '')

    setModalFormularioAberto(true)
  }

  // Salvar formulário (criação ou edição com dependências dinâmicas estritas)
  const handleSalvarFormulario = async () => {
    if (!formAnoLetivo) {
      toast({
        title: 'Ano Letivo obrigatório',
        description: 'Informe o Ano Letivo da vaga.',
        variant: 'destructive',
      })
      return
    }

    if (!formUnidadeId) {
      toast({
        title: 'Unidade Escolar obrigatória',
        description: 'Selecione uma Unidade Escolar válida para a vaga.',
        variant: 'destructive',
      })
      return
    }

    // Dependência dinâmica estrita de Cargo vs Função
    if (formTipoVinculo === 'CARGO' && !formCargoId) {
      toast({
        title: 'Cargo da Vaga obrigatório',
        description: 'Para uma vaga de Cargo, selecione o Cargo da Vaga correspondente.',
        variant: 'destructive',
      })
      return
    }

    if (formTipoVinculo === 'FUNCAO' && !formFuncaoId) {
      toast({
        title: 'Função da Vaga obrigatória',
        description: 'Para uma vaga de Função, selecione a Função da Vaga correspondente.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoFormulario(true)
    try {
      if (modoEdicao && vagaSelecionada) {
        // Atualização da vaga existente
        await editarVaga({
          vagaId: vagaSelecionada.id,
          tipoVinculo: formTipoVinculo,
          cargoId: formTipoVinculo === 'CARGO' ? formCargoId : null,
          funcaoId: formTipoVinculo === 'FUNCAO' ? formFuncaoId : null,
          periodo: formPeriodo === 'GERAL' ? null : formPeriodo,
          modalidade: formModalidade,
          diasSemana: formModalidade === 'ITINERANTE' ? formDiasSemana : null,
          numeroSequencial: formSequencial ? Number(formSequencial) : null,
          statusOcupante: formStatusOcupante,
          profissionalTitularId: formTitularId || null,
          profissionalOcupanteId: formOcupanteId || null,
          observacao: formObservacao || null,
        })

        toast({
          title: 'Vaga atualizada com sucesso',
          description: `Vaga ${vagaSelecionada.codigo || vagaSelecionada.id} atualizada com integridade.`,
        })
      } else {
        // Criação de nova vaga (vaga inserida manualmente = vaga_excedente: true)
        const funcaoObj = funcoesGerais.find((f) => f.id === formFuncaoId)
        const cargoObj = cargosGerais.find((c) => c.id === formCargoId)
        const nomeDescritivo =
          formTipoVinculo === 'FUNCAO' ? funcaoObj?.nome || 'Função' : cargoObj?.nome || 'Cargo'

        await inserirVagaManual({
          unidadeEscolarId: formUnidadeId,
          anoLetivo: formAnoLetivo,
          configuracaoRhId: dadosResumo?.configuracaoUsada?.id || null,
          configuracaoRhLinhaId: null,
          funcao: nomeDescritivo,
          tipoVinculo: formTipoVinculo,
          cargoId: formTipoVinculo === 'CARGO' ? formCargoId : null,
          funcaoId: formTipoVinculo === 'FUNCAO' ? formFuncaoId : null,
          periodo: formPeriodo === 'GERAL' ? null : formPeriodo,
          modalidade: formModalidade,
          diasSemana: formModalidade === 'ITINERANTE' ? formDiasSemana : null,
          numeroSequencial: formSequencial ? Number(formSequencial) : null,
          statusOcupante: formStatusOcupante,
          profissionalTitularId: formTitularId || null,
          profissionalOcupanteId: formOcupanteId || null,
          observacao: formObservacao || null,
        })

        toast({
          title: 'Vaga cadastrada com sucesso',
          description: `Nova vaga de ${nomeDescritivo} cadastrada com identificação automática gerada pelo sistema.`,
        })
      }

      setModalFormularioAberto(false)
      recarregarTudo()
    } catch (err: any) {
      console.error('Erro ao salvar vaga:', err)
      toast({
        title: 'Erro ao salvar vaga',
        description: err.message || 'Falha ao persistir dados da vaga.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoFormulario(false)
    }
  }

  // Compatibilidade com callbacks antigos
  const handleAbrirInsercaoManual = handleAbrirNovaVaga
  const handleAbrirEdicaoManual = handleAbrirEdicaoVaga

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
                `vagas-${unidadeAtual?.codigo || (unidadeSelecionadaId === 'TODAS' || unidadeSelecionadaId === 'TODOS' ? 'todas' : 'escola')}-${anoLetivo}.csv`,
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
                escolaNome:
                  unidadeSelecionadaId === 'TODAS' || unidadeSelecionadaId === 'TODOS'
                    ? 'Todas as Unidades Escolares'
                    : unidadeAtual?.nome || 'Unidade Escolar',
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
                  {ANOS_LETIVOS.map((ano) => (
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
                  <SelectItem value="TODAS" className="font-semibold text-blue-700">
                    Todas as Unidades Escolares
                  </SelectItem>
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
                disabled={
                  !unidadeSelecionadaId ||
                  unidadeSelecionadaId === 'TODAS' ||
                  unidadeSelecionadaId === 'TODOS'
                }
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold text-xs h-9 disabled:opacity-50"
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
          ) : !dadosResumo ||
            unidadeSelecionadaId === 'TODAS' ||
            unidadeSelecionadaId === 'TODOS' ? (
            <div className="p-4 bg-slate-100/80 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">
                  {unidadeSelecionadaId === 'TODAS' || unidadeSelecionadaId === 'TODOS'
                    ? 'Visualização global: todas as unidades escolares listadas abaixo.'
                    : 'Nenhuma unidade escolar selecionada.'}
                </p>
                <p className="text-slate-500 mt-0.5">
                  Para gerar vagas ou inspecionar o porte de atendimento e turmas vinculadas,
                  selecione uma unidade específica no campo acima.
                </p>
              </div>
            </div>
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
              setVagaExcedenteFiltro('TODAS')
              setBuscaTexto('')
            }}
            className="text-xs text-slate-500 hover:text-slate-800 h-7 px-2"
          >
            Limpar filtros
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
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

            {/* Vaga Excedente */}
            <div>
              <Label className="text-xs text-slate-600 font-medium">Vaga Excedente</Label>
              <Select
                value={vagaExcedenteFiltro}
                onValueChange={(val: any) => setVagaExcedenteFiltro(val)}
              >
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todos</SelectItem>
                  <SelectItem value="SIM">Sim</SelectItem>
                  <SelectItem value="NAO">Não</SelectItem>
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
            <div className="sm:col-span-2 md:col-span-4 lg:col-span-7">
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
              {unidadeSelecionadaId === 'TODAS' || unidadeSelecionadaId === 'TODOS'
                ? `Vagas de Todas as Unidades Escolares (${anoLetivo})`
                : `Vagas de ${unidadeAtual?.nome || 'Unidade'} (${anoLetivo})`}
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
                <TableHead className="w-24 font-semibold text-slate-700">Identificação</TableHead>
                <TableHead className="w-16 font-semibold text-slate-700">Ano Letivo</TableHead>
                <TableHead className="font-semibold text-slate-700">Unidade Escolar</TableHead>
                <TableHead className="w-20 font-semibold text-slate-700">Tipo</TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Cargo / Função da Vaga
                </TableHead>
                <TableHead className="font-semibold text-slate-700">Período</TableHead>
                <TableHead className="font-semibold text-slate-700">Modalidade</TableHead>
                <TableHead className="w-24 text-center font-semibold text-slate-700">
                  Status da Vaga
                </TableHead>
                <TableHead className="font-semibold text-slate-700">Profissional Titular</TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Profissional Ocupante
                </TableHead>
                <TableHead className="w-24 text-center font-semibold text-slate-700">
                  Excedente
                </TableHead>
                <TableHead className="w-28 text-right font-semibold text-slate-700">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-32 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Carregando vagas...
                  </TableCell>
                </TableRow>
              ) : vagas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-36 text-center text-slate-500">
                    <p className="font-semibold text-slate-700 text-sm">
                      {unidadeSelecionadaId === 'TODAS' || unidadeSelecionadaId === 'TODOS'
                        ? `Nenhuma vaga cadastrada para o Ano Letivo ${anoLetivo}`
                        : `Nenhuma vaga cadastrada para ${unidadeAtual?.nome || 'esta unidade'} em ${anoLetivo}`}
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
                    {/* 1. Identificação */}
                    <TableCell className="font-mono text-[11px] font-bold text-blue-700">
                      {v.codigo || v.id.slice(0, 8)}
                    </TableCell>
                    {/* 2. Ano Letivo */}
                    <TableCell className="text-slate-700 font-medium">{v.ano_letivo}</TableCell>
                    {/* 3. Unidade Escolar */}
                    <TableCell
                      className="font-medium text-slate-900 max-w-[180px] truncate"
                      title={v.unidade_escolar?.nome || ''}
                    >
                      {v.unidade_escolar?.nome || '—'}
                    </TableCell>
                    {/* 4. Tipo de Vínculo: Cargo ou Função */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          v.tipo_vinculo === 'CARGO'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {v.tipo_vinculo === 'CARGO' ? 'Cargo' : 'Função'}
                      </Badge>
                    </TableCell>
                    {/* 5. Cargo da Vaga ou Função da Vaga */}
                    <TableCell className="text-slate-800 font-semibold max-w-[200px] truncate">
                      {v.tipo_vinculo === 'CARGO'
                        ? v.cargo?.nome || v.funcao || 'Cargo'
                        : v.funcao_objeto?.nome || v.funcao || 'Função'}
                    </TableCell>
                    {/* 6. Período */}
                    <TableCell className="text-slate-600">
                      <Badge variant="outline" className="text-[10px] font-medium border-slate-200">
                        {v.periodo || 'Geral / Sem Período'}
                      </Badge>
                    </TableCell>
                    {/* 7. Modalidade */}
                    <TableCell className="text-slate-600">
                      {v.modalidade === 'ITINERANTE' ? (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-medium hover:bg-amber-100">
                          Itinerante {v.dias_semana ? `(${v.dias_semana}d)` : ''}
                        </Badge>
                      ) : (
                        <span className="text-slate-600 text-xs">Fixo</span>
                      )}
                    </TableCell>
                    {/* 8. Status da Vaga do Ocupante */}
                    <TableCell className="text-center">
                      <Badge
                        className={`text-[10px] font-bold tracking-wider ${
                          v.status === 'OCUPADA'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                            : v.status === 'EXCEDENTE'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                        }`}
                      >
                        {v.status === 'OCUPADA'
                          ? 'Preenchida'
                          : v.status === 'EXCEDENTE'
                            ? 'Excedente'
                            : 'Aberta'}
                      </Badge>
                    </TableCell>
                    {/* 9. Profissional Titular */}
                    <TableCell
                      className="max-w-[150px] truncate"
                      title={v.profissional_titular?.nome || ''}
                    >
                      {v.profissional_titular ? (
                        <span className="text-slate-900 font-medium text-xs">
                          {v.profissional_titular.nome}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Nenhum</span>
                      )}
                    </TableCell>
                    {/* 10. Profissional Ocupante */}
                    <TableCell
                      className="max-w-[160px] truncate"
                      title={v.profissional_ocupante?.nome || v.nome_ocupante || ''}
                    >
                      {v.profissional_ocupante?.nome || v.nome_ocupante ? (
                        <span className="font-semibold text-slate-900 text-xs block truncate">
                          {v.profissional_ocupante?.nome || v.nome_ocupante}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Sem ocupante</span>
                      )}
                    </TableCell>
                    {/* Excedente */}
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold tracking-wider ${
                          v.vaga_excedente
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {v.vaga_excedente ? 'Sim' : 'Não'}
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
      {/* MODAL 3.0: ESCOLHA DA MODALIDADE DE GERAÇÃO (SIMPLES OU MIGRAÇÃO)    */}
      {/* ==================================================================== */}
      <Dialog open={modalEscolhaModoGerarAberto} onOpenChange={setModalEscolhaModoGerarAberto}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              Gerar Vagas — {unidadeAtual?.nome}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ano Letivo de Destino: <strong>{anoLetivo}</strong> · Selecione a modalidade de
              dimensionamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Seletor de Modalidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModoGeracaoSelecionado('SIMPLES')}
                className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  modoGeracaoSelecionado === 'SIMPLES'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Geração Simples
                    </span>
                    <Badge
                      variant={modoGeracaoSelecionado === 'SIMPLES' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      Padrão Atual
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Calcula e dimensiona as vagas a partir da Configuração Vigente, Porte do Ano e
                    Turmas vinculadas.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 mt-2 block">
                  Regras de matriz, níveis e turmas
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModoGeracaoSelecionado('MIGRACAO')}
                className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                  modoGeracaoSelecionado === 'MIGRACAO'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Migração de Ano Letivo
                    </span>
                    <Badge
                      variant={modoGeracaoSelecionado === 'MIGRACAO' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      Nova Opção
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Copia a estrutura de vagas de um ano letivo anterior diretamente para o ano
                    destino {anoLetivo}.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 mt-2 block">
                  Cópia sem ocupante (todas ABERTAS)
                </span>
              </button>
            </div>

            {/* Conteúdo específico da modalidade selecionada */}
            {modoGeracaoSelecionado === 'SIMPLES' ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Fluxo de Geração Simples Calculada:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>
                    Utiliza a configuração vigente para{' '}
                    <strong>{dadosResumo?.escola.tipo_atendimento || 'a unidade'}</strong>
                  </li>
                  <li>
                    Base de cálculo: {dadosResumo?.unidadeAno.qtd_alunos || 0} alunos ·{' '}
                    {dadosResumo?.unidadeAno.qtd_turmas || 0} turmas
                  </li>
                  <li>
                    Nível calculado sugerido:{' '}
                    <strong>Nível {dadosResumo?.nivelEncontradoCodigo || '—'}</strong>
                  </li>
                  <li>Exibe pergunta de confirmação e prévia com impacto antes de gravar</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-3.5 pt-1">
                {/* Combobox de Ano Letivo de Origem */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Ano Letivo de Origem (fonte para cópia) *
                  </Label>
                  <Select
                    value={anoOrigemMigracao ? String(anoOrigemMigracao) : ''}
                    onValueChange={(val) => setAnoOrigemMigracao(Number(val))}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs bg-white border-slate-300">
                      <SelectValue placeholder="Selecione o ano de origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {anosOrigemDisponiveis.map((ano) => (
                        <SelectItem key={ano} value={String(ano)}>
                          Ano Letivo {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    O ano destino atual ({anoLetivo}) foi excluído da lista de origens.
                  </span>
                </div>

                {/* Resumo do que será copiado */}
                {carregandoResumoMigracao ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1.5" />
                    Consultando vagas do ano {anoOrigemMigracao}...
                  </div>
                ) : resumoMigracao ? (
                  resumoMigracao.total === 0 ? (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900">
                        <p className="font-bold">
                          Nenhuma vaga encontrada no ano letivo {anoOrigemMigracao}
                        </p>
                        <p className="mt-0.5 text-amber-800">
                          A unidade escolar <strong>{unidadeAtual?.nome}</strong> não possui vagas
                          cadastradas no ano {anoOrigemMigracao}. Selecione outro ano de origem para
                          prosseguir com a migração.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Cartões de totais do ano de origem */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                            Total Origem
                          </span>
                          <span className="text-lg font-bold text-slate-900">
                            {resumoMigracao.total}
                          </span>
                        </div>
                        <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                          <span className="text-[10px] font-semibold uppercase text-emerald-700 block">
                            Ocupadas
                          </span>
                          <span className="text-lg font-bold text-emerald-800">
                            {resumoMigracao.ocupadas}
                          </span>
                        </div>
                        <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-[10px] font-semibold uppercase text-blue-700 block">
                            Abertas
                          </span>
                          <span className="text-lg font-bold text-blue-800">
                            {resumoMigracao.abertas}
                          </span>
                        </div>
                        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                          <span className="text-[10px] font-semibold uppercase text-amber-700 block">
                            Excedentes
                          </span>
                          <span className="text-lg font-bold text-amber-800">
                            {resumoMigracao.excedentes}
                          </span>
                        </div>
                      </div>

                      {/* Regra de Ocupação em Destaque */}
                      <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-lg text-xs text-blue-950 space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-blue-900">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          Regras de Migração e Integridade:
                        </p>
                        <p className="text-[11px] leading-relaxed text-blue-900">
                          • <strong>Ocupação NÃO é copiada:</strong> todas as {resumoMigracao.total}{' '}
                          vagas migradas nascerão no ano {anoLetivo}{' '}
                          <strong>SEM ocupante (status ABERTA)</strong>.
                        </p>
                        <p className="text-[11px] leading-relaxed text-blue-900">
                          • <strong>Vaga Excedente:</strong> vagas de geração anterior nascem como
                          "Não"; vagas manuais de origem preservam "Sim".
                        </p>
                        <p className="text-[11px] leading-relaxed text-blue-900">
                          • <strong>Vagas do Destino:</strong> se o ano {anoLetivo} já possuir
                          vagas, elas serão preservadas e as novas serão adicionadas sem duplicar
                          sequenciais.
                        </p>
                      </div>

                      {/* Tabela resumida por Função */}
                      <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                        <Table>
                          <TableHeader className="bg-slate-50 sticky top-0">
                            <TableRow className="text-xs">
                              <TableHead className="py-1.5 px-3 font-semibold text-slate-700">
                                Função
                              </TableHead>
                              <TableHead className="py-1.5 px-3 font-semibold text-slate-700 text-center w-20">
                                Total
                              </TableHead>
                              <TableHead className="py-1.5 px-3 font-semibold text-slate-700 text-center w-24">
                                Ocupadas (Origem)
                              </TableHead>
                              <TableHead className="py-1.5 px-3 font-semibold text-slate-700 text-center w-24">
                                Abertas (Origem)
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {resumoMigracao.porFuncao.map((pf) => (
                              <TableRow key={pf.funcao} className="text-xs">
                                <TableCell className="py-1 px-3 font-medium text-slate-900">
                                  {pf.funcao}
                                </TableCell>
                                <TableCell className="py-1 px-3 text-center font-bold text-blue-700">
                                  {pf.total}
                                </TableCell>
                                <TableCell className="py-1 px-3 text-center text-slate-600">
                                  {pf.ocupadas}
                                </TableCell>
                                <TableCell className="py-1 px-3 text-center text-slate-600">
                                  {pf.abertas}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalEscolhaModoGerarAberto(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            {modoGeracaoSelecionado === 'SIMPLES' ? (
              <Button
                size="sm"
                onClick={handleProsseguirModoSimples}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                Prosseguir com Geração Simples
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleProsseguirModoMigracao}
                disabled={!resumoMigracao || resumoMigracao.total === 0 || carregandoResumoMigracao}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                Prosseguir para Confirmação da Migração
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 3.M: CONFIRMAÇÃO DA MIGRAÇÃO (ALERTA DE DESTINO + EXECUÇÃO)    */}
      {/* ==================================================================== */}
      <Dialog open={modalConfirmarMigracaoAberto} onOpenChange={setModalConfirmarMigracaoAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Layers className="w-5 h-5 text-blue-600" />
              Confirmar Migração de Vagas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Unidade: {unidadeAtual?.nome} · De {anoOrigemMigracao} para {anoLetivo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {/* Alerta se o destino já possui vagas */}
            {vagas.length > 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Atenção: A unidade já possui {vagas.length} vagas em {anoLetivo}!
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                      Atualmente existem{' '}
                      <strong>{resumoEstatistico.ocupadas} vagas ocupadas</strong> e{' '}
                      <strong>{resumoEstatistico.abertas} abertas</strong> no ano destino. A
                      migração <strong>NÃO apagará</strong> nenhuma vaga já existente — as{' '}
                      {resumoMigracao?.total || 0} vagas do ano {anoOrigemMigracao} serão{' '}
                      <strong>adicionadas</strong>, mantendo as sequências livres.
                    </p>
                    <p className="text-[11px] text-amber-900 mt-1 font-semibold">
                      Deseja continuar e adicionar as vagas migradas mesmo assim?
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                A unidade não possui nenhuma vaga cadastrada no ano letivo {anoLetivo}. Serão
                criadas <strong>{resumoMigracao?.total || 0} vagas</strong> copiadas de{' '}
                {anoOrigemMigracao}, todas ABERTAS e sem ocupante.
              </div>
            )}

            {/* Checklist de segurança da cópia */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 text-slate-700">
              <span className="font-bold text-slate-900 block">Resumo da Operação:</span>
              <div className="flex items-center justify-between">
                <span>Vagas a migrar do ano {anoOrigemMigracao}:</span>
                <strong className="text-slate-900">{resumoMigracao?.total || 0} vagas</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Status ao nascer no ano {anoLetivo}:</span>
                <strong className="text-blue-700">ABERTA (sem ocupante)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Atributos preservados:</span>
                <span className="text-slate-600">Função, Cargo, Período, Modalidade</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalConfirmarMigracaoAberto(false)}
              disabled={executandoMigracao}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarMigracaoReal}
              disabled={executandoMigracao}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              {executandoMigracao ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Migrando Vagas...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Confirmar Migração de Vagas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      {/* NOVO FORMULÁRIO UNIFICADO: CADASTRO / EDIÇÃO DE VAGA */}
      {/* Segue a ordem estrita e os 10 atributos especificados pelo usuário: */}
      {/* 1. Identificação (gerada automaticamente pelo sistema) */}
      {/* 2. Ano Letivo (obrigatório, combobox 2020-2040) */}
      {/* 3. Unidade Escolar (obrigatória, FK) */}
      {/* 4. Pergunta: Cargo ou Função (dependência dinâmica) */}
      {/* 5. Cargo da Vaga OU Função da Vaga (conforme escolha) */}
      {/* 6. Período (obrigatório: Geral, Manhã, Tarde, Integral, Noite) */}
      {/* 7. Modalidade (obrigatória: Fixo, Itinerante) */}
      {/* 8. Status da Vaga do Ocupante (opcional: Aberta, Preenchida) */}
      {/* 9. Profissional Titular (opcional, FK) */}
      {/* 10. Profissional Ocupante (opcional, FK - pode ser o mesmo do titular) */}
      {/* ==================================================================== */}
      <Dialog open={modalFormularioAberto} onOpenChange={setModalFormularioAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              {modoEdicao ? (
                <>
                  <Pencil className="w-5 h-5 text-blue-600" />
                  Editar Cadastro de Vaga
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                  Novo Cadastro de Vaga
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Preencha os atributos da vaga. Todos os campos com asterisco (*) são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Identificação (gerada automaticamente pelo sistema, desabilitada para edição) */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                1. Identificação da Vaga (Gerada automaticamente)
              </Label>
              <Input
                value={formIdentificacao}
                disabled
                className="mt-1 h-9 text-xs font-mono font-semibold bg-slate-100/90 text-slate-700 border-slate-300 cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                O identificador é gerado automaticamente pelo sistema mantendo o padrão único do
                cadastro.
              </span>
            </div>

            {/* 2. Ano Letivo */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                2. Ano Letivo <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={String(formAnoLetivo)}
                onValueChange={(val) => setFormAnoLetivo(Number(val))}
              >
                <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                  <SelectValue placeholder="Selecione o ano letivo" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {ANOS_LETIVOS.map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>
                      Ano Letivo {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Unidade Escolar */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                3. Unidade Escolar <span className="text-rose-500">*</span>
              </Label>
              <Select value={formUnidadeId} onValueChange={setFormUnidadeId}>
                <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                  <SelectValue placeholder="Selecione a Unidade Escolar" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {escolas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({e.codigo || 'S/C'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Pergunta: Cargo ou Função (Dependência dinâmica) */}
            <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/40">
              <Label className="text-xs font-bold text-slate-900 block mb-2">
                4. A vaga é de Cargo ou de Função? <span className="text-rose-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormTipoVinculo('CARGO')
                    // Limpar seleção incompatível
                    setFormFuncaoId('')
                    if (!formCargoId && cargosGerais.length > 0) {
                      setFormCargoId(cargosGerais[0].id)
                    }
                  }}
                  className={`p-2.5 rounded-md border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                    formTipoVinculo === 'CARGO'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Vaga de Cargo</span>
                  {formTipoVinculo === 'CARGO' && <Check className="w-4 h-4 text-white" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormTipoVinculo('FUNCAO')
                    // Limpar seleção incompatível
                    setFormCargoId('')
                    if (!formFuncaoId && funcoesGerais.length > 0) {
                      setFormFuncaoId(funcoesGerais[0].id)
                    }
                  }}
                  className={`p-2.5 rounded-md border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                    formTipoVinculo === 'FUNCAO'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Vaga de Função</span>
                  {formTipoVinculo === 'FUNCAO' && <Check className="w-4 h-4 text-white" />}
                </button>
              </div>

              {/* 5. Cargo da Vaga OU Função da Vaga dependente */}
              <div className="mt-3 pt-3 border-t border-blue-100">
                {formTipoVinculo === 'CARGO' ? (
                  <div>
                    <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      5. Cargo da Vaga <span className="text-rose-500">*</span>
                    </Label>
                    <Select value={formCargoId} onValueChange={setFormCargoId}>
                      <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                        <SelectValue placeholder="Selecione o Cargo da Vaga" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {cargosGerais.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome} {c.codigo ? `(${c.codigo})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Vinculado ao Cadastro de Cargos mantendo integridade referencial.
                    </span>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      5. Função da Vaga <span className="text-rose-500">*</span>
                    </Label>
                    <Select value={formFuncaoId} onValueChange={setFormFuncaoId}>
                      <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                        <SelectValue placeholder="Selecione a Função da Vaga" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {funcoesGerais.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome} {f.codigo ? `(${f.codigo})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Vinculada ao Cadastro de Funções mantendo integridade referencial.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Período e 7. Modalidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 6. Período */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  6. Período <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formPeriodo}
                  onValueChange={(val: PeriodoVagaOpcao) => setFormPeriodo(val)}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GERAL">Geral / Sem Período</SelectItem>
                    <SelectItem value="MANHA">Manhã</SelectItem>
                    <SelectItem value="TARDE">Tarde</SelectItem>
                    <SelectItem value="INTEGRAL">Integral</SelectItem>
                    <SelectItem value="NOITE">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 7. Modalidade */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  7. Modalidade <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formModalidade}
                  onValueChange={(val: ModalidadeVagaOpcao) => setFormModalidade(val)}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                    <SelectValue placeholder="Selecione a modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXO">Fixo</SelectItem>
                    <SelectItem value="ITINERANTE">Itinerante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dias de itinerância se modalidade = ITINERANTE */}
            {formModalidade === 'ITINERANTE' && (
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Dias na Semana (Itinerante)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formDiasSemana}
                  onChange={(e) => setFormDiasSemana(Number(e.target.value) || 2)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            )}

            {/* 8. Status da Vaga do Ocupante */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                8. Status da Vaga do Ocupante (Opcional)
              </Label>
              <Select
                value={formStatusOcupante}
                onValueChange={(val: StatusOcupanteForm) => setFormStatusOcupante(val)}
              >
                <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                  <SelectValue placeholder="Selecione o status do ocupante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABERTA">Aberta</SelectItem>
                  <SelectItem value="PREENCHIDA">Preenchida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 9. Profissional Titular e 10. Profissional Ocupante */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
              <span className="text-xs font-bold text-slate-900 block">
                Profissionais Vinculados (Cadastro de Profissionais)
              </span>

              {/* 9. Profissional Titular */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  9. Profissional Titular (Opcional)
                </Label>
                <Select
                  value={formTitularId || 'nenhum'}
                  onValueChange={(val) => setFormTitularId(val === 'nenhum' ? '' : val)}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                    <SelectValue placeholder="Selecione o Profissional Titular" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="nenhum">Nenhum / Sem Titular</SelectItem>
                    {profissionaisGerais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} {p.codigo ? `(${p.codigo})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 10. Profissional Ocupante */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  10. Profissional Ocupante (Opcional — pode ser o mesmo do titular)
                </Label>
                <Select
                  value={formOcupanteId || 'nenhum'}
                  onValueChange={(val) => {
                    const novoId = val === 'nenhum' ? '' : val
                    setFormOcupanteId(novoId)
                    // Ao escolher ocupante, sugere Preenchida
                    if (novoId && formStatusOcupante === 'ABERTA') {
                      setFormStatusOcupante('PREENCHIDA')
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                    <SelectValue placeholder="Selecione o Profissional Ocupante" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="nenhum">Nenhum / Sem Ocupante</SelectItem>
                    {profissionaisGerais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} {p.codigo ? `(${p.codigo})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Regra do sistema: o Profissional Ocupante pode ser o mesmo que o Profissional
                  Titular.
                </span>
              </div>
            </div>

            {/* Observações e Sequencial */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Nº Sequencial (opcional)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={formSequencial}
                  onChange={(e) => setFormSequencial(e.target.value)}
                  placeholder="Automático"
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Observações</Label>
                <Input
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  placeholder="Observação livre da vaga"
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalFormularioAberto(false)}
              disabled={salvandoFormulario}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarFormulario}
              disabled={salvandoFormulario}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              {salvandoFormulario ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : modoEdicao ? (
                'Salvar Alterações'
              ) : (
                'Cadastrar Vaga'
              )}
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
                1. Novo Modelo de Atributos da Vaga
              </h4>
              <p className="mb-2">
                O formulário de cadastro e edição de vagas segue estritamente os atributos e regras
                do sistema:
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-slate-800">
                <li>
                  <strong>Identificação:</strong> gerada automaticamente pelo sistema em padrão
                  sequencial (ex.: VAG-0001 ou VAGP-0001), somente leitura e preservada na edição.
                </li>
                <li>
                  <strong>Ano Letivo:</strong> obrigatório, combobox padrão do sistema (2020 a
                  2040).
                </li>
                <li>
                  <strong>Unidade Escolar:</strong> obrigatória, vinculada com integridade
                  referencial ao Cadastro de Unidades Escolares.
                </li>
                <li>
                  <strong>Pergunta Cargo ou Função:</strong> pergunta se a vaga é de "Cargo" ou
                  "Função", acionando dependência dinâmica estrita.
                </li>
                <li>
                  <strong>Cargo da Vaga / Função da Vaga:</strong> obrigatórios conforme a escolha
                  anterior — ao selecionar "Cargo", solicita o Cargo vinculado ao Cadastro de
                  Cargos; ao selecionar "Função", solicita a Função vinculada ao Cadastro de
                  Funções. A troca limpa o campo anterior.
                </li>
                <li>
                  <strong>Período:</strong> obrigatório com as opções "Geral / Sem Período",
                  "Manhã", "Tarde", "Integral" e "Noite".
                </li>
                <li>
                  <strong>Modalidade:</strong> obrigatória com opções "Fixo" e "Itinerante" (para
                  itinerante, permite informar a quantidade de dias na semana).
                </li>
                <li>
                  <strong>Status da Vaga do Ocupante:</strong> opcional com opções "Aberta" e
                  "Preenchida" (mantendo coerência direta com o preenchimento de ocupante).
                </li>
                <li>
                  <strong>Profissional Titular:</strong> opcional, vinculado ao Cadastro de
                  Profissionais.
                </li>
                <li>
                  <strong>Profissional Ocupante:</strong> opcional, vinculado ao Cadastro de
                  Profissionais, podendo ser o mesmo profissional o titular e o ocupante da mesma
                  vaga.
                </li>
                <li>
                  <strong>Vaga Excedente:</strong> atributo automático ("Não" quando a vaga é gerada
                  automaticamente, "Sim" quando inserida manualmente).
                </li>
              </ol>
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
                3. Modalidades de Geração: Simples e Migração de Ano Letivo
              </h4>
              <p>
                Ao clicar em <strong>"Gerar Vagas"</strong>, o sistema disponibiliza duas
                modalidades para atender tanto ao dimensionamento inicial quanto à transição de anos
                letivos:
              </p>
              <div className="space-y-2 mt-2">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <strong className="text-blue-900 block mb-0.5">
                    Modalidade 1: Geração Simples (Cálculo Oficial)
                  </strong>
                  <p>
                    Calcula e dimensiona as vagas a partir da Configuração Vigente, Porte do Ano e
                    Turmas. Se a escola já possuir vagas no ano destino, o sistema alerta e permite
                    regerar com segurança:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 mt-1 text-[11px] text-slate-600">
                    <li>
                      <strong>Vagas OCUPADAS nunca são apagadas:</strong> se o porte diminuir,
                      passam a <strong>EXCEDENTE</strong> para remanejamento.
                    </li>
                    <li>
                      <strong>Vagas ABERTAS em excesso:</strong> são ajustadas conforme a prévia.
                    </li>
                    <li>
                      <strong>Vagas faltantes:</strong> são adicionadas na sequência livre.
                    </li>
                  </ul>
                </div>

                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded">
                  <strong className="text-blue-900 block mb-0.5">
                    Modalidade 2: Migração de Ano Letivo (Cópia Direta)
                  </strong>
                  <p>
                    Copia a estrutura de vagas de um <strong>Ano Letivo de Origem</strong>{' '}
                    selecionado via combobox (excluindo o ano destino atual) para a unidade escolar
                    no ano letivo em exibição:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 mt-1 text-[11px] text-slate-600">
                    <li>
                      <strong>O que é copiado:</strong> Função, Cargo vinculado, Período, Modalidade
                      (Fixo/Itinerante com dias de semana), Turma equivalente (se existir turma de
                      mesmo nome no ano destino).
                    </li>
                    <li>
                      <strong>O que NÃO é copiado:</strong> Ocupante, cargo do ocupante e status de
                      ocupada. Toda vaga migrada nasce estritamente <strong>SEM ocupante</strong> e
                      com status <strong>ABERTA</strong>.
                    </li>
                    <li>
                      <strong>Regra de Vaga Excedente na migração:</strong> vagas migradas
                      originárias de geração anterior nascem como <em>Não</em>; se a vaga de origem
                      tiver sido inserida manualmente (<em>Sim</em>), preserva <em>Sim</em> para
                      manter sua rastreabilidade.
                    </li>
                    <li>
                      <strong>Integridade e sem duplicidade:</strong> se o destino já possuir vagas,
                      o sistema avisa e não apaga nenhuma existente; as vagas migradas são
                      adicionadas renumerando sequenciais caso necessário para não haver duplicidade
                      exata.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                4. Atributo "Vaga Excedente" vs Status "EXCEDENTE"
              </h4>
              <p>
                O sistema possui um atributo específico chamado <strong>Vaga Excedente</strong>{' '}
                (valores <em>Sim</em> ou <em>Não</em>), preenchido de forma totalmente automática
                pelo sistema de acordo com a origem da vaga:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  <strong>Vaga Excedente = Não:</strong> gravado em todas as vagas criadas pelo
                  processo de <em>Geração Automática de Vagas</em>, dimensionadas pela matriz e
                  porte escolar.
                </li>
                <li>
                  <strong>Vaga Excedente = Sim:</strong> gravado em todas as vagas criadas por{' '}
                  <em>Inserção Manual</em> no sistema (vagas extras inseridas pelo operador).
                </li>
                <li>
                  <strong>Somente leitura:</strong> o campo é determinado exclusivamente pela origem
                  da vaga e não pode ser alterado manualmente pelo usuário nos formulários de
                  edição.
                </li>
                <li>
                  <strong>Diferença do Status "EXCEDENTE":</strong> o <em>status EXCEDENTE</em>{' '}
                  continua sendo utilizado na regeneração de vagas quando uma vaga anteriormente
                  ocupada excede o novo quantitativo dimensionado pelo porte, servindo para
                  remanejamento. O novo atributo <em>Vaga Excedente (Sim/Não)</em> refere-se
                  unicamente à origem da criação da vaga (manual vs automática) e não interfere no
                  fluxo de cálculo ou regeneração.
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                5. Inserção, Edição e Exclusão Manual de Vagas
              </h4>
              <p>O sistema permite a gestão manual de vagas além da geração automática:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>
                  <strong>Inserir vaga manual:</strong> selecione a função (a partir das linhas da
                  configuração vigente), cargo (filtrado apenas pelos cargos permitidos da linha),
                  período, modalidade e ocupante. Toda vaga inserida manualmente recebe
                  automaticamente <strong>Vaga Excedente = Sim</strong>.
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
              <h4 className="font-bold text-slate-900 text-sm mb-1">6. Auditoria de Ações</h4>
              <p>
                Todas as operações de geração, regeração, inserção manual, edição e exclusão de
                vagas são registradas na Auditoria com o usuário responsável, data/hora, valores
                antigos/novos e o valor do atributo <strong>Vaga Excedente</strong> correspondente.
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
