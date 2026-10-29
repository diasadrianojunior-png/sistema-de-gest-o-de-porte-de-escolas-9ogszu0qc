import React, { useState, useEffect, useMemo } from 'react'
import { PorteEscolaAno, UnidadeEscolar } from '@/types/gestao-escolar'
import {
  getPortesEscolaAno,
  salvarPorteEscolaAno,
  deletePorteEscolaAno,
  calcularNivelSugeridoParaUnidade,
  CalculoPorteSugestao,
} from '@/services/porte-escola'
import { getUnidadesEscolares } from '@/services/unidades-escolares'
import { ANOS_LETIVOS } from './Etapas'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { PaginacaoTabela, ITENS_POR_PAGINA_PADRAO } from '@/components/PaginacaoTabela'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  HelpCircle,
  SlidersHorizontal,
  Building,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  Sparkles,
  FileText,
} from 'lucide-react'

export const PorteEscolaAnoPage: React.FC = () => {
  const { canEdit } = useAuth()
  const canEditPorte = canEdit('porte_escola')
  const { toast } = useToast()

  // Estados principais de dados
  const [portes, setPortes] = useState<PorteEscolaAno[]>([])
  const [unidades, setUnidades] = useState<UnidadeEscolar[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filtros e paginação
  const [search, setSearch] = useState('')
  const [filtroAno, setFiltroAno] = useState<string>('todos')
  const [paginaAtual, setPaginaAtual] = useState(1)

  // Modais
  const [openFormDialog, setOpenFormDialog] = useState(false)
  const [openViewDialog, setOpenViewDialog] = useState(false)
  const [openHelpDialog, setOpenHelpDialog] = useState(false)
  const [deletingPorte, setDeletingPorte] = useState<PorteEscolaAno | null>(null)
  const [viewingPorte, setViewingPorte] = useState<PorteEscolaAno | null>(null)
  const [editingPorte, setEditingPorte] = useState<PorteEscolaAno | null>(null)

  // Formulário: atributos obrigatórios com nomes exatos
  const [formUnidadeId, setFormUnidadeId] = useState('')
  const [formAnoLetivo, setFormAnoLetivo] = useState<number>(new Date().getFullYear())
  const [formQuantidadeAlunos, setFormQuantidadeAlunos] = useState<number | string>(0)
  const [formNivelFaixa, setFormNivelFaixa] = useState('')
  const [formJustificativa, setFormJustificativa] = useState('')

  // Estado do cálculo do nível sugerido
  const [calculoSugestao, setCalculoSugestao] = useState<CalculoPorteSugestao | null>(null)
  const [calculandoNivel, setCalculandoNivel] = useState(false)
  // Guarda se o usuário alterou manualmente o nível em relação ao sugerido
  const [nivelEditadoManualmente, setNivelEditadoManualmente] = useState(false)

  // Carregar dados iniciais
  const loadData = async () => {
    try {
      setLoading(true)
      const [listaPortes, listaUnidades] = await Promise.all([
        getPortesEscolaAno(),
        getUnidadesEscolares(),
      ])
      setPortes(listaPortes)
      setUnidades(listaUnidades)
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Não foi possível carregar as informações do servidor.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Unidade atualmente selecionada no formulário
  const unidadeSelecionada = useMemo(() => {
    return unidades.find((u) => u.id === formUnidadeId) || null
  }, [unidades, formUnidadeId])

  // Recalcular dinamicamente o nível sugerido ao mudar Unidade, Ano Letivo ou Quantidade de Alunos
  useEffect(() => {
    if (!openFormDialog) return
    if (!formUnidadeId || !unidadeSelecionada) {
      setCalculoSugestao(null)
      return
    }

    let cancelado = false
    const efetuarCalculo = async () => {
      setCalculandoNivel(true)
      try {
        const resultado = await calcularNivelSugeridoParaUnidade(
          unidadeSelecionada.tipo_atendimento,
          Number(formAnoLetivo),
          Number(formQuantidadeAlunos) || 0,
        )

        if (cancelado) return
        setCalculoSugestao(resultado)

        // Se o usuário ainda não alterou manualmente o nível (ou em criação antes de mexer),
        // adota a sugestão calculada automaticamente
        if (!nivelEditadoManualmente && resultado.rotuloSugerido) {
          setFormNivelFaixa(resultado.rotuloSugerido)
        }
      } catch (err) {
        console.error('Erro ao calcular nível sugerido:', err)
      } finally {
        if (!cancelado) setCalculandoNivel(false)
      }
    }

    efetuarCalculo()

    return () => {
      cancelado = true
    }
  }, [
    formUnidadeId,
    formAnoLetivo,
    formQuantidadeAlunos,
    openFormDialog,
    unidadeSelecionada,
    nivelEditadoManualmente,
  ])

  // Avalia se o nível atualmente escolhido difere do padrão calculado automaticamente
  const nivelSugeridoRotulo = calculoSugestao?.rotuloSugerido || ''
  const isNivelDiferenteDoPadrao = useMemo(() => {
    if (!formNivelFaixa || !nivelSugeridoRotulo) return false
    const escolhido = formNivelFaixa.trim().toLowerCase()
    const sugerido = nivelSugeridoRotulo.trim().toLowerCase()
    if (escolhido === sugerido) return false
    // Se um começa com o outro (ex: "Nível V: De 321 a 420 alunos" vs "Nível V"), considera igual
    if (escolhido.startsWith(sugerido) || sugerido.startsWith(escolhido)) return false
    return true
  }, [formNivelFaixa, nivelSugeridoRotulo])

  // Abertura do modal de criação
  const handleOpenCreate = () => {
    setEditingPorte(null)
    const anoAtual = new Date().getFullYear()
    setFormAnoLetivo(anoAtual)
    setFormUnidadeId(unidades.length > 0 ? unidades[0].id : '')
    setFormQuantidadeAlunos(0)
    setFormNivelFaixa('')
    setFormJustificativa('')
    setNivelEditadoManualmente(false)
    setCalculoSugestao(null)
    setOpenFormDialog(true)
  }

  // Abertura do modal de edição
  const handleOpenEdit = async (item: PorteEscolaAno) => {
    setEditingPorte(item)
    setFormAnoLetivo(item.ano_letivo)
    setFormUnidadeId(item.unidade_escolar_id)
    setFormQuantidadeAlunos(item.quantidade_alunos)
    setFormNivelFaixa(item.nivel_faixa)
    setFormJustificativa(item.justificativa_mudanca || '')
    setNivelEditadoManualmente(true) // preserva a escolha gravada
    setOpenFormDialog(true)
  }

  // Abertura do modal de visualização
  const handleOpenView = (item: PorteEscolaAno) => {
    setViewingPorte(item)
    setOpenViewDialog(true)
  }

  // Salvar formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formUnidadeId) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione a Unidade Escolar.',
        variant: 'destructive',
      })
      return
    }

    if (!formNivelFaixa || !formNivelFaixa.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione ou informe o Nível / Faixa de Alunos.',
        variant: 'destructive',
      })
      return
    }

    // Regra obrigatória: Se mudar para um porte DIFERENTE do calculado automaticamente,
    // a Justificativa se torna OBRIGATÓRIA. Sem justificativa, bloquear salvar com mensagem clara.
    if (isNivelDiferenteDoPadrao) {
      if (!formJustificativa || !formJustificativa.trim()) {
        toast({
          title: 'Justificativa obrigatória',
          description:
            'O porte selecionado é diferente do padrão calculado automaticamente pela Configuração de Vagas por Porte. Preencha o campo "Justificativa para Mudança do Padrão de Porte" antes de salvar.',
          variant: 'destructive',
        })
        return
      }
    }

    try {
      setSaving(true)
      await salvarPorteEscolaAno(editingPorte?.id, {
        unidade_escolar_id: formUnidadeId,
        ano_letivo: Number(formAnoLetivo),
        quantidade_alunos: Number(formQuantidadeAlunos) || 0,
        nivel_faixa: formNivelFaixa,
        nivel_sugerido: nivelSugeridoRotulo || null,
        justificativa_mudanca: isNivelDiferenteDoPadrao ? formJustificativa.trim() : null,
      })

      toast({
        title: editingPorte ? 'Porte atualizado' : 'Porte cadastrado',
        description: `O porte da unidade escolar para o ano ${formAnoLetivo} foi gravado com sucesso.`,
      })
      setOpenFormDialog(false)
      await loadData()
    } catch (err: any) {
      console.error('Erro ao salvar porte:', err)
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar o registro de porte.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Confirmar exclusão
  const handleDeleteConfirm = async () => {
    if (!deletingPorte) return
    try {
      setSaving(true)
      await deletePorteEscolaAno(deletingPorte.id)
      toast({
        title: 'Registro excluído',
        description: 'O porte da escola por ano letivo foi removido com sucesso.',
      })
      setDeletingPorte(null)
      await loadData()
    } catch (err: any) {
      console.error('Erro ao excluir porte:', err)
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Não foi possível excluir o registro.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Filtragem da listagem
  const filteredPortes = useMemo(() => {
    return portes.filter((item) => {
      if (filtroAno !== 'todos' && String(item.ano_letivo) !== filtroAno) {
        return false
      }
      if (!search.trim()) return true
      const termo = search.toLowerCase()
      const codigo = (item.codigo || '').toLowerCase()
      const nomeUnidade = (item.unidade_escolar?.nome || '').toLowerCase()
      const codigoUnidade = (item.unidade_escolar?.codigo || '').toLowerCase()
      const nivel = (item.nivel_faixa || '').toLowerCase()
      const justificativa = (item.justificativa_mudanca || '').toLowerCase()
      const ano = String(item.ano_letivo)
      const qtd = String(item.quantidade_alunos)

      return (
        codigo.includes(termo) ||
        nomeUnidade.includes(termo) ||
        codigoUnidade.includes(termo) ||
        nivel.includes(termo) ||
        justificativa.includes(termo) ||
        ano.includes(termo) ||
        qtd.includes(termo)
      )
    })
  }, [portes, filtroAno, search])

  // Paginação de 10 em 10 registros
  const portesPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA_PADRAO
    return filteredPortes.slice(inicio, inicio + ITENS_POR_PAGINA_PADRAO)
  }, [filteredPortes, paginaAtual])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
          <span>Cadastros Mestres</span>
          <span>&rsaquo;</span>
          <span>Porte da Escola por Ano Letivo</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Porte da Escola por Ano Letivo
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Definição da quantidade de alunos e nível/faixa de porte por unidade escolar para cada ano
          letivo, integrado à Configuração de Vagas por Porte com suporte a ajustes justificados.
        </p>
      </div>

      {/* Card da Listagem */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Relação de Portes por Ano Letivo</CardTitle>
            <CardDescription>
              Total de {filteredPortes.length} registro(s) encontrado(s)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenHelpDialog(true)}
              className="gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Ajuda e Regras
            </Button>
            {canEditPorte && (
              <Button
                onClick={handleOpenCreate}
                className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                <Plus className="w-4 h-4" />+ Novo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por código (PRT-XXXX), escola, nível..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPaginaAtual(1)
                }}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                Ano Letivo:
              </span>
              <Select
                value={filtroAno}
                onValueChange={(val) => {
                  setFiltroAno(val)
                  setPaginaAtual(1)
                }}
              >
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="Ano Letivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os anos</SelectItem>
                  {ANOS_LETIVOS.map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>
                      Ano {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de Portes */}
          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando portes de
              escolas...
            </div>
          ) : filteredPortes.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhum registro de Porte da Escola encontrado.{' '}
              {search || filtroAno !== 'todos'
                ? 'Tente ajustar os filtros ou o termo de busca.'
                : 'Clique no botão "+ Novo" para cadastrar o primeiro porte por ano letivo.'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium w-28">Identificador</th>
                    <th className="py-3 px-4 font-medium">Unidade Escolar</th>
                    <th className="py-3 px-4 font-medium w-28">Ano Letivo</th>
                    <th className="py-3 px-4 font-medium w-36">Quantidade de Alunos</th>
                    <th className="py-3 px-4 font-medium">Nível / Faixa</th>
                    <th className="py-3 px-4 font-medium w-36">Justificativa</th>
                    <th className="py-3 px-4 font-medium text-right w-36">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {portesPaginados.map((item) => {
                    const temJustificativa = Boolean(
                      item.justificativa_mudanca && item.justificativa_mudanca.trim().length > 0,
                    )
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {item.codigo || 'PRT-0000'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">
                            {item.unidade_escolar?.nome || 'Unidade não identificada'}
                          </div>
                          {item.unidade_escolar?.codigo && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              {item.unidade_escolar.codigo} •{' '}
                              {item.unidade_escolar.tipo_atendimento}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {item.ano_letivo}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-900">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            {item.quantidade_alunos} aluno(s)
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <SlidersHorizontal className="w-3 h-3 text-emerald-600" />
                            {item.nivel_faixa}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {temJustificativa ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] gap-1 bg-amber-50 text-amber-800 border-amber-300 font-medium cursor-help"
                              title={item.justificativa_mudanca || ''}
                            >
                              <FileText className="w-3 h-3 text-amber-700" />
                              Preenchida
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Padrão</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                            onClick={() => handleOpenView(item)}
                            title="Visualizar Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canEditPorte && (
                            <>
                              <Button
                                size="icon"
                                className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                                onClick={() => handleOpenEdit(item)}
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                                onClick={() => setDeletingPorte(item)}
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <PaginacaoTabela
                paginaAtual={paginaAtual}
                totalRegistros={filteredPortes.length}
                itensPorPagina={ITENS_POR_PAGINA_PADRAO}
                onMudarPagina={setPaginaAtual}
                rotuloItens="portes escolares"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: CRIAR / EDITAR PORTE */}
      <Dialog open={openFormDialog} onOpenChange={setOpenFormDialog}>
        <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
              {editingPorte
                ? 'Editar Porte da Escola por Ano Letivo'
                : 'Novo Porte da Escola por Ano Letivo'}
            </DialogTitle>
            <DialogDescription>
              Defina os atributos obrigatórios de porte da escola vinculados à Configuração de Vagas
              por Porte.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* 1. "Identificador" (Automático e sequencial) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="porte-codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador (Campo gerado automaticamente)
              </Label>
              <Input
                id="porte-codigo"
                value={
                  editingPorte
                    ? editingPorte.codigo || 'PRT-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: PRT-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* 2. "Unidade Escolar" — Combobox vinculado à tabela de unidades */}
            <div className="space-y-1.5">
              <Label htmlFor="porte-unidade">Unidade Escolar *</Label>
              <Select
                value={formUnidadeId}
                onValueChange={(val) => {
                  setFormUnidadeId(val)
                  setNivelEditadoManualmente(false)
                }}
              >
                <SelectTrigger id="porte-unidade" className="text-sm">
                  <SelectValue placeholder="Selecione a Unidade Escolar..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.codigo ? `${u.codigo} — ` : ''}
                      {u.nome} ({u.tipo_atendimento})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {unidadeSelecionada && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  Tipo de Atendimento:{' '}
                  <strong className="text-slate-700">{unidadeSelecionada.tipo_atendimento}</strong>
                </p>
              )}
            </div>

            {/* 3. "Ano Letivo" — Combobox validado */}
            <div className="space-y-1.5">
              <Label htmlFor="porte-ano">Ano Letivo *</Label>
              <Select
                value={String(formAnoLetivo)}
                onValueChange={(val) => {
                  setFormAnoLetivo(Number(val))
                  setNivelEditadoManualmente(false)
                }}
              >
                <SelectTrigger id="porte-ano" className="text-sm">
                  <SelectValue placeholder="Selecione o Ano Letivo" />
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

            {/* 4. "Quantidade de Alunos na Unidade Escolar no Ano Letivo" — Número inteiro */}
            <div className="space-y-1.5">
              <Label htmlFor="porte-qtd-alunos">
                Quantidade de Alunos na Unidade Escolar no Ano Letivo *
              </Label>
              <Input
                id="porte-qtd-alunos"
                type="number"
                min="0"
                step="1"
                placeholder="Ex: 323"
                value={formQuantidadeAlunos}
                onChange={(e) => {
                  const val =
                    e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0)
                  setFormQuantidadeAlunos(val)
                  setNivelEditadoManualmente(false)
                }}
                required
              />
              <p className="text-[11px] text-slate-500">
                Informe o número total de alunos matriculados na unidade neste ano letivo.
              </p>
            </div>

            {/* Card com o Cálculo Automático da Configuração de Vagas por Porte */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-950">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Cálculo Automático pela Configuração de Vagas por Porte
                </span>
                {calculandoNivel && (
                  <span className="text-[10px] text-blue-600 font-normal flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Calculando...
                  </span>
                )}
              </div>

              {calculoSugestao?.rotuloSugerido ? (
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-500">
                      Nível sugerido para {formQuantidadeAlunos || 0} aluno(s):
                    </span>
                    <strong className="text-blue-800 font-bold text-sm">
                      {calculoSugestao.rotuloSugerido}
                    </strong>
                  </div>
                  {calculoSugestao.configuracao_codigo && (
                    <p className="text-[11px] text-slate-500 font-mono">
                      Origem: Configuração {calculoSugestao.configuracao_codigo} (
                      {calculoSugestao.tipo_atendimento})
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Selecione a unidade escolar e informe a quantidade de alunos para obter a faixa
                  calculada automaticamente.
                </p>
              )}

              {nivelEditadoManualmente && calculoSugestao?.rotuloSugerido && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (calculoSugestao.rotuloSugerido) {
                        setFormNivelFaixa(calculoSugestao.rotuloSugerido)
                        setNivelEditadoManualmente(false)
                        setFormJustificativa('')
                      }
                    }}
                    className="text-xs h-7 text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    Restaurar Porte Padrão Calculado
                  </Button>
                </div>
              )}
            </div>

            {/* 5. "Nível / Faixa de Alunos" — Pode ser editado pelo usuário */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="porte-nivel">Nível / Faixa de Alunos *</Label>
                {isNivelDiferenteDoPadrao && (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Porte alterado manualmente
                  </span>
                )}
              </div>

              {calculoSugestao && calculoSugestao.faixas.length > 0 ? (
                <Select
                  value={formNivelFaixa}
                  onValueChange={(val) => {
                    setFormNivelFaixa(val)
                    setNivelEditadoManualmente(true)
                  }}
                >
                  <SelectTrigger id="porte-nivel" className="text-sm">
                    <SelectValue placeholder="Selecione o Nível / Faixa de Alunos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {calculoSugestao.faixas.map((f) => (
                      <SelectItem key={f.id} value={f.rotulo}>
                        {f.rotulo}
                        {f.rotulo === nivelSugeridoRotulo ? ' (Padrão calculado)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="porte-nivel"
                  placeholder="Ex: Nível V: De 321 a 420 alunos"
                  value={formNivelFaixa}
                  onChange={(e) => {
                    setFormNivelFaixa(e.target.value)
                    setNivelEditadoManualmente(true)
                  }}
                  required
                />
              )}
              <p className="text-[11px] text-slate-500">
                Você pode selecionar uma faixa diferente do cálculo padrão. Caso o porte divirja do
                calculado, a justificativa será obrigatória.
              </p>
            </div>

            {/* 6. "Justificativa para Mudança do Padrão de Porte" — Obrigatório se o nível divergir */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="porte-justificativa"
                  className={`text-sm ${
                    isNivelDiferenteDoPadrao ? 'text-amber-900 font-bold' : 'text-slate-700'
                  }`}
                >
                  Justificativa para Mudança do Padrão de Porte
                  {isNivelDiferenteDoPadrao
                    ? ' * (Obrigatório)'
                    : ' (Opcional quando porte padrão)'}
                </Label>
              </div>
              <Textarea
                id="porte-justificativa"
                rows={3}
                placeholder={
                  isNivelDiferenteDoPadrao
                    ? 'Descreva a fundamentação técnica ou autorização para alteração do porte padrão da escola...'
                    : 'Dispensável: o porte selecionado é exatamente o padrão calculado pelo sistema.'
                }
                value={formJustificativa}
                onChange={(e) => setFormJustificativa(e.target.value)}
                className={`text-sm ${
                  isNivelDiferenteDoPadrao
                    ? 'border-amber-300 focus-visible:ring-amber-500 bg-amber-50/30'
                    : 'bg-slate-50/50'
                }`}
              />
              {isNivelDiferenteDoPadrao ? (
                <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Obrigatório: O porte selecionado ({formNivelFaixa}) difere do padrão calculado (
                  {nivelSugeridoRotulo}).
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Exibido na visualização e na listagem quando preenchido.
                </p>
              )}
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                onClick={() => setOpenFormDialog(false)}
                disabled={saving}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingPorte ? 'Salvar Alterações' : 'Salvar Porte'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: VISUALIZAÇÃO DE DETALHES */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
              Detalhes do Porte da Escola por Ano Letivo
            </DialogTitle>
            <DialogDescription>
              Ficha consolidada com identificador, porte e justificativa
            </DialogDescription>
          </DialogHeader>

          {viewingPorte && (
            <div className="space-y-4 py-2 text-sm">
              <div className="border-b pb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Identificador
                  </span>
                  <p className="font-mono text-sm font-bold text-blue-700 mt-0.5">
                    {viewingPorte.codigo || 'PRT-0000'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Ano Letivo
                  </span>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingPorte.ano_letivo}</p>
                </div>
              </div>

              <div className="border-b pb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Unidade Escolar
                </span>
                <p className="text-base font-medium text-slate-900 mt-0.5">
                  {viewingPorte.unidade_escolar?.nome || 'Unidade não identificada'}
                </p>
                {viewingPorte.unidade_escolar?.tipo_atendimento && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewingPorte.unidade_escolar.tipo_atendimento}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 border-b pb-3">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Quantidade de Alunos
                  </span>
                  <p className="text-slate-900 font-bold mt-0.5">
                    {viewingPorte.quantidade_alunos} aluno(s)
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Nível / Faixa Registrado
                  </span>
                  <p className="text-emerald-800 font-bold mt-0.5">{viewingPorte.nivel_faixa}</p>
                </div>
              </div>

              {viewingPorte.nivel_sugerido && (
                <div className="border-b pb-3">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Nível Padrão Sugerido
                  </span>
                  <p className="text-slate-700 mt-0.5 text-xs font-medium">
                    {viewingPorte.nivel_sugerido}
                  </p>
                </div>
              )}

              <div className="border-b pb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Justificativa para Mudança do Padrão de Porte
                </span>
                {viewingPorte.justificativa_mudanca ? (
                  <p className="text-xs text-slate-800 bg-amber-50/70 p-2.5 rounded-md border border-amber-200 mt-1.5 whitespace-pre-line">
                    {viewingPorte.justificativa_mudanca}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic mt-0.5">
                    Nenhuma justificativa necessária (porte padrão calculado).
                  </p>
                )}
              </div>

              {viewingPorte.created_at && (
                <div className="text-[11px] text-slate-400">
                  Cadastrado em: {new Date(viewingPorte.created_at).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setOpenViewDialog(false)}
              className="bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog open={!!deletingPorte} onOpenChange={(open) => !open && setDeletingPorte(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Porte da Escola?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o registro de porte{' '}
              <strong className="text-slate-900">"{deletingPorte?.codigo || 'PRT-XXXX'}"</strong> da
              unidade{' '}
              <strong className="text-slate-900">
                "{deletingPorte?.unidade_escolar?.nome || 'Unidade'}"
              </strong>{' '}
              para o ano letivo <strong>{deletingPorte?.ano_letivo}</strong>? Esta ação será
              registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={saving}
              className="bg-[#0B2545] hover:bg-[#133A68] text-white hover:text-white border-transparent"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              disabled={saving}
            >
              {saving ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO: AJUDA E REGRAS */}
      <Dialog open={openHelpDialog} onOpenChange={setOpenHelpDialog}>
        <DialogContent className="p-6 rounded-2xl sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2 text-[#0B2545]">
              <div className="p-2 rounded-lg bg-blue-50">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Ajuda e Regras — Porte da Escola por Ano Letivo
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600">
              Orientações sobre os atributos, regras de cálculo dinâmico, mudança de porte e
              auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-sm text-slate-700 leading-relaxed">
            {/* Bloco 1: Atributos Obrigatórios */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 space-y-2">
              <h4 className="font-semibold text-blue-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700" /> Atributos do Cadastro
              </h4>
              <p className="text-xs text-blue-900 font-medium">
                O cadastro contempla os seguintes atributos obrigatórios:
              </p>
              <ol className="text-xs list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
                <li>
                  <strong>Identificador (Automático):</strong> Código sequencial gerado pelo banco
                  no padrão do sistema (ex: <code>PRT-0001</code>).
                </li>
                <li>
                  <strong>Unidade Escolar:</strong> Combobox vinculado à tabela de unidades
                  escolares. Não é permitida duplicidade de Unidade + Ano Letivo. Possui restrição
                  por referência (unidade com porte não pode ser excluída).
                </li>
                <li>
                  <strong>Ano Letivo:</strong> Exercício escolar selecionado no combobox (2020 a
                  2040).
                </li>
                <li>
                  <strong>Quantidade de Alunos na Unidade Escolar no Ano Letivo:</strong> Número
                  inteiro de alunos matriculados na unidade.
                </li>
                <li>
                  <strong>Nível / Faixa de Alunos:</strong> Calculado automaticamente a partir da
                  quantidade de alunos pela Configuração de Vagas por Porte (regra vigente do ano,
                  senão a mais recente). Permite escolha manual.
                </li>
                <li>
                  <strong>Justificativa para Mudança do Padrão de Porte:</strong> Texto obrigatório
                  sempre que o usuário escolher um nível diferente do calculado automaticamente pelo
                  sistema.
                </li>
              </ol>
            </div>

            {/* Bloco 2: Regra de Cálculo e Mudança Manual */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
              <h4 className="font-semibold text-amber-950 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" /> Cálculo Dinâmico e Mudança
                Manual
              </h4>
              <ul className="text-xs list-disc list-inside space-y-1.5 text-slate-700 pl-1">
                <li>
                  Ao alterar a <strong>Unidade Escolar</strong>, o <strong>Ano Letivo</strong> ou a{' '}
                  <strong>Quantidade de Alunos</strong>, o sistema recalcula em tempo real a faixa
                  correspondente na Configuração de Vagas por Porte.
                </li>
                <li>
                  Se o usuário optar por manter o porte padrão calculado, o campo de justificativa
                  permanece opcional e pode ficar limpo.
                </li>
                <li>
                  Se o usuário selecionar um porte <strong>diferente</strong> da faixa calculada, o
                  sistema <strong>bloqueia o salvamento</strong> até que seja fornecida uma
                  justificativa detalhada.
                </li>
                <li>
                  A qualquer momento, o botão "Restaurar Porte Padrão Calculado" permite voltar à
                  faixa recomendada.
                </li>
              </ul>
            </div>

            {/* Bloco 3: Integridade Referencial e Exclusão */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" /> Restrição por Referência de Unidade
              </h4>
              <p className="text-xs text-slate-600">
                Uma unidade escolar referenciada no cadastro de Porte da Escola não pode ser
                excluída do Cadastro de Unidades Escolares. Qualquer tentativa de exclusão é
                impedida com mensagem amigável e registrada na Auditoria do sistema.
              </p>
            </div>

            {/* Bloco 4: Rastreabilidade e Auditoria */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-2">
              <h4 className="font-semibold text-emerald-950 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600" /> Auditoria Permanente
              </h4>
              <p className="text-xs text-slate-700">
                Todas as operações de criação, edição e exclusão registram quem realizou, data,
                hora, valores anteriores e novos, incluindo o nível escolhido vs. o nível padrão
                sugerido e a justificativa preenchida.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 mt-2">
            <Button
              type="button"
              onClick={() => setOpenHelpDialog(false)}
              className="bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PorteEscolaAnoPage
