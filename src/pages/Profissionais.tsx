import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
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
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Search,
  UserCheck,
  Building,
  Briefcase,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  getProfissionais,
  salvarProfissional,
  deleteProfissional,
  getVagasPorUnidade,
  VinculoVagaInput,
} from '@/services/profissionais'
import { getUnidadesEscolares } from '@/services/unidades-escolares'
import { getCargos } from '@/services/apoio'
import { Profissional, UnidadeEscolar, Cargo, VagaReal } from '@/types/gestao-escolar'

interface LinhaVinculoForm {
  idTemp: string
  vaga_id: string
  titular: boolean
  cargo_id: string
}

export default function Profissionais() {
  const { isAdmin, canEdit } = useAuth()
  const canEditProfissionais = isAdmin || canEdit('profissionais')

  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [unidades, setUnidades] = useState<UnidadeEscolar[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])

  const [search, setSearch] = useState('')
  const [filtroUnidade, setFiltroUnidade] = useState<string>('todas')
  const [paginaAtual, setPaginaAtual] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modais de Criação / Edição
  const [openDialog, setOpenDialog] = useState(false)
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formUnidadeId, setFormUnidadeId] = useState<string>('')
  const [formAtivo, setFormAtivo] = useState(true)
  const [formVinculos, setFormVinculos] = useState<LinhaVinculoForm[]>([])

  // Vagas carregadas para a unidade escolar atualmente selecionada no formulário
  const [vagasDaUnidade, setVagasDaUnidade] = useState<VagaReal[]>([])
  const [carregandoVagasUnidade, setCarregandoVagasUnidade] = useState(false)

  // Modal de Visualização (Detalhe)
  const [viewingProfissional, setViewingProfissional] = useState<Profissional | null>(null)
  const [openViewDialog, setOpenViewDialog] = useState(false)

  // Modal de Exclusão
  const [deletingProfissional, setDeletingProfissional] = useState<Profissional | null>(null)

  const carregarDadosIniciais = async () => {
    try {
      setLoading(true)
      const [profsData, unidadesData, cargosData] = await Promise.all([
        getProfissionais(),
        getUnidadesEscolares(),
        getCargos(),
      ])
      setProfissionais(profsData)
      setUnidades(unidadesData)
      setCargos(cargosData)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Falha ao buscar profissionais.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  // Carregar vagas da unidade escolar quando mudar a unidade selecionada no formulário
  useEffect(() => {
    if (!formUnidadeId) {
      setVagasDaUnidade([])
      return
    }

    let ativo = true
    const carregarVagas = async () => {
      try {
        setCarregandoVagasUnidade(true)
        const anoAtual = new Date().getFullYear()
        const anoValido = anoAtual >= 2020 && anoAtual <= 2040 ? anoAtual : 2026
        const vagas = await getVagasPorUnidade(formUnidadeId, anoValido)
        if (ativo) {
          setVagasDaUnidade(vagas)
        }
      } catch (err: any) {
        console.error('Erro ao carregar vagas da unidade:', err)
        toast({
          title: 'Erro ao carregar vagas',
          description: 'Não foi possível listar as vagas da unidade escolar selecionada.',
          variant: 'destructive',
        })
      } finally {
        if (ativo) setCarregandoVagasUnidade(false)
      }
    }

    carregarVagas()

    return () => {
      ativo = false
    }
  }, [formUnidadeId])

  // Tratar mudança da unidade escolar no formulário
  // Regra permanente de relacionamentos dinâmicos: limpamos vínculos incompatíveis
  const handleUnidadeChange = (novaUnidadeId: string) => {
    setFormUnidadeId(novaUnidadeId)
    // Se mudou de unidade escolar, limpa as vagas vinculadas ou redefine
    setFormVinculos([])
  }

  // Abrir modal de criação
  const handleOpenCreate = () => {
    setEditingProfissional(null)
    setFormNome('')
    setFormUnidadeId('')
    setFormAtivo(true)
    setFormVinculos([])
    setVagasDaUnidade([])
    setOpenDialog(true)
  }

  // Abrir modal de edição
  const handleOpenEdit = async (prof: Profissional) => {
    setEditingProfissional(prof)
    setFormNome(prof.nome)
    setFormUnidadeId(prof.unidade_escolar_id)
    setFormAtivo(prof.ativo)

    const linhasIniciais: LinhaVinculoForm[] = (prof.vagas_vinculadas || []).map((v) => ({
      idTemp: v.id || Math.random().toString(),
      vaga_id: v.vaga_id,
      titular: Boolean(v.titular),
      cargo_id: v.cargo_id || '',
    }))

    setFormVinculos(linhasIniciais)
    setOpenDialog(true)
  }

  // Abrir visualização de detalhe
  const handleOpenView = (prof: Profissional) => {
    setViewingProfissional(prof)
    setOpenViewDialog(true)
  }

  // Adicionar outra linha de vaga vinculada
  const handleAdicionarVagaVinculo = () => {
    if (!formUnidadeId) {
      toast({
        title: 'Selecione uma Unidade Escolar',
        description: 'Primeiro selecione a unidade escolar para listar as vagas correspondentes.',
        variant: 'destructive',
      })
      return
    }

    setFormVinculos((prev) => [
      ...prev,
      {
        idTemp: Math.random().toString(),
        vaga_id: '',
        titular: true,
        cargo_id: '',
      },
    ])
  }

  // Remover linha de vínculo
  const handleRemoverVinculo = (index: number) => {
    setFormVinculos((prev) => prev.filter((_, idx) => idx !== index))
  }

  // Alterar seleção de vaga de uma linha
  const handleAlterarVagaLinha = (index: number, novaVagaId: string) => {
    // Buscar a vaga selecionada
    const vagaSel = vagasDaUnidade.find((v) => v.id === novaVagaId)

    // Determinar cargo padrão sugerido (se houver apenas 1 cargo permitido, ou cargo da vaga)
    let cargoPadrao = ''
    if (vagaSel) {
      if (vagaSel.cargo_id) {
        cargoPadrao = vagaSel.cargo_id
      } else {
        const cargosLinha = vagaSel.configuracao_rh_linha?.cargos || []
        if (cargosLinha.length === 1 && cargosLinha[0].cargo_id) {
          cargoPadrao = cargosLinha[0].cargo_id
        }
      }
    }

    setFormVinculos((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item
        return {
          ...item,
          vaga_id: novaVagaId,
          cargo_id: cargoPadrao,
        }
      }),
    )
  }

  // Alterar titularidade de uma linha
  const handleAlterarTitularLinha = (index: number, novoTitular: boolean) => {
    setFormVinculos((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, titular: novoTitular } : item)),
    )
  }

  // Alterar cargo/ocupação de uma linha
  const handleAlterarCargoLinha = (index: number, novoCargoId: string) => {
    setFormVinculos((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, cargo_id: novoCargoId } : item)),
    )
  }

  // Salvar formulário
  const handleSaveProfissional = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formNome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do profissional.',
        variant: 'destructive',
      })
      return
    }

    if (!formUnidadeId) {
      toast({
        title: 'Unidade Escolar obrigatória',
        description: 'Selecione a unidade escolar do profissional.',
        variant: 'destructive',
      })
      return
    }

    // Validar duplicidade de vaga nas linhas de vínculo
    const vagasSelecionadas = formVinculos
      .map((v) => v.vaga_id)
      .filter((vId) => Boolean(vId && vId.trim()))

    const conjuntoVagas = new Set(vagasSelecionadas)
    if (conjuntoVagas.size !== vagasSelecionadas.length) {
      toast({
        title: 'Vagas duplicadas',
        description: 'A mesma vaga não pode ser selecionada mais de uma vez no mesmo profissional.',
        variant: 'destructive',
      })
      return
    }

    // Montar vínculos validados
    const vinculosFinal: VinculoVagaInput[] = formVinculos
      .filter((v) => Boolean(v.vaga_id && v.vaga_id.trim()))
      .map((v) => ({
        vaga_id: v.vaga_id,
        titular: Boolean(v.titular),
        cargo_id: v.cargo_id && v.cargo_id.trim() ? v.cargo_id : null,
      }))

    try {
      setSaving(true)
      await salvarProfissional({
        id: editingProfissional?.id,
        nome: formNome.trim(),
        unidade_escolar_id: formUnidadeId,
        ativo: formAtivo,
        vagas: vinculosFinal,
      })

      toast({
        title: 'Sucesso',
        description: editingProfissional
          ? 'Profissional atualizado com sucesso!'
          : 'Profissional cadastrado com sucesso!',
      })

      setOpenDialog(false)
      await carregarDadosIniciais()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar o cadastro do profissional.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Confirmar exclusão
  const handleDeleteConfirm = async () => {
    if (!deletingProfissional) return

    try {
      setSaving(true)
      await deleteProfissional(deletingProfissional.id)
      toast({
        title: 'Removido',
        description: 'Profissional excluído e vagas vinculadas foram liberadas.',
      })
      setDeletingProfissional(null)
      await carregarDadosIniciais()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Falha ao remover profissional.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Filtros e busca para listagem
  const profissionaisFiltrados = useMemo(() => {
    let lista = profissionais

    if (filtroUnidade && filtroUnidade !== 'todas') {
      lista = lista.filter((p) => p.unidade_escolar_id === filtroUnidade)
    }

    if (search.trim()) {
      const term = search.toLowerCase()
      lista = lista.filter((p) => {
        const codigo = (p.codigo || '').toLowerCase()
        const nome = (p.nome || '').toLowerCase()
        const unidadeNome = (p.unidade_escolar?.nome || '').toLowerCase()
        return codigo.includes(term) || nome.includes(term) || unidadeNome.includes(term)
      })
    }

    return lista
  }, [profissionais, filtroUnidade, search])

  // Paginação 10 registros por página (padrão PaginacaoTabela)
  const itensPorPagina = ITENS_POR_PAGINA_PADRAO
  const totalRegistros = profissionaisFiltrados.length
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina) || 1

  const profissionaisPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return profissionaisFiltrados.slice(inicio, inicio + itensPorPagina)
  }, [profissionaisFiltrados, paginaAtual, itensPorPagina])

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setPaginaAtual(1)
  }, [search, filtroUnidade])

  // Obter cargos permitidos para uma vaga específica (baseado na configuracao_rh_linha_cargo)
  const getCargosPermitidosParaVaga = (vagaId: string): Cargo[] => {
    if (!vagaId) return cargos
    const vaga = vagasDaUnidade.find((v) => v.id === vagaId)
    if (!vaga) return cargos

    const cargosVinculados = vaga.configuracao_rh_linha?.cargos || []
    if (cargosVinculados.length > 0) {
      const permitidosIds = new Set(cargosVinculados.map((c) => c.cargo_id))
      const filtrados = cargos.filter((c) => permitidosIds.has(c.id))
      return filtrados.length > 0 ? filtrados : cargos
    }

    return cargos
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Profissionais
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Cadastros Mestres
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cadastro de profissionais, suas unidades escolares e vínculos com vagas de RH.
          </p>
        </div>

        {canEditProfissionais && (
          <Button
            onClick={handleOpenCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Profissional
          </Button>
        )}
      </div>

      {/* Cartão de Filtros e Busca */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por identificador (PRO-0001), nome ou escola..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            <div className="w-full sm:w-72">
              <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Todas as unidades escolares" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Unidades Escolares</SelectItem>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Listagem */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3.5 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">
              Listagem de Profissionais
            </CardTitle>
            <span className="text-xs text-slate-500 font-medium">
              Total: {totalRegistros} {totalRegistros === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs">Carregando profissionais...</p>
            </div>
          ) : totalRegistros === 0 ? (
            <div className="py-12 px-4 text-center text-slate-500">
              <p className="text-sm font-medium">Nenhum profissional encontrado.</p>
              <p className="text-xs text-slate-400 mt-1">
                {search || filtroUnidade !== 'todas'
                  ? 'Ajuste os filtros de busca para encontrar registros.'
                  : 'Clique em "+ Novo Profissional" para cadastrar o primeiro.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4 w-28">Identificador</th>
                    <th className="py-3 px-4">Nome do Profissional</th>
                    <th className="py-3 px-4">Unidade Escolar</th>
                    <th className="py-3 px-4">Vagas Vinculadas</th>
                    <th className="py-3 px-4 w-24 text-center">Status</th>
                    <th className="py-3 px-4 w-28 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profissionaisPaginados.map((p) => {
                    const qtdVagas = p.vagas_vinculadas?.length || 0
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {p.codigo || '—'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{p.nome}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{p.unidade_escolar?.nome || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {qtdVagas === 0 ? (
                            <span className="text-slate-400 italic text-xs">Nenhuma vaga</span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-xs"
                              >
                                {qtdVagas} {qtdVagas === 1 ? 'vaga' : 'vagas'}
                              </Badge>
                              {p.vagas_vinculadas?.slice(0, 2).map((vin) => (
                                <span
                                  key={vin.id}
                                  className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200 truncate max-w-[180px]"
                                  title={`${vin.vaga?.funcao || 'Vaga'}${vin.titular ? ' (Titular)' : ' (Suplente)'}`}
                                >
                                  {vin.vaga?.funcao || 'Vaga'} {vin.titular ? '(Titular)' : ''}
                                </span>
                              ))}
                              {qtdVagas > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{qtdVagas - 2} mais
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.ativo ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[11px]">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-slate-500 text-[11px]">
                              Inativo
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenView(p)}
                              title="Visualizar detalhes"
                              className="h-8 w-8 text-slate-600 hover:text-slate-900"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {canEditProfissionais && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEdit(p)}
                                  title="Editar profissional"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingProfissional(p)}
                                  title="Excluir profissional"
                                  className="h-8 w-8 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação Padrão */}
          {totalRegistros > 0 && (
            <div className="border-t border-slate-200 p-4">
              <PaginacaoTabela
                paginaAtual={paginaAtual}
                totalRegistros={totalRegistros}
                itensPorPagina={itensPorPagina}
                onMudarPagina={setPaginaAtual}
                rotuloItens="profissionais"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação / Edição do Profissional */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveProfissional}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                {editingProfissional ? 'Editar Profissional' : 'Novo Profissional'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Preencha os dados do profissional e seus vínculos com as vagas da unidade escolar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Identificador automático */}
              {editingProfissional && (
                <div>
                  <Label className="text-xs text-slate-500">Identificador do Sistema</Label>
                  <div className="mt-1 font-mono font-bold text-sm text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 inline-block">
                    {editingProfissional.codigo || 'PRO-0000'}
                  </div>
                </div>
              )}

              {/* Nome do Profissional */}
              <div>
                <Label htmlFor="nome" className="text-xs font-semibold text-slate-700">
                  Nome do Profissional <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Nome completo do profissional"
                  className="mt-1"
                  required
                />
              </div>

              {/* Unidade Escolar do Profissional */}
              <div>
                <Label htmlFor="unidade" className="text-xs font-semibold text-slate-700">
                  Unidade Escolar do Profissional <span className="text-rose-500">*</span>
                </Label>
                <Select value={formUnidadeId} onValueChange={handleUnidadeChange}>
                  <SelectTrigger id="unidade" className="mt-1 bg-white">
                    <SelectValue placeholder="Selecione a Unidade Escolar" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome} ({u.tipo_atendimento})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ao selecionar a unidade escolar, as vagas disponíveis daquela unidade serão
                  carregadas dinamicamente.
                </p>
              </div>

              {/* Status Ativo */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-slate-800">Cadastro Ativo</Label>
                  <p className="text-[11px] text-slate-500">
                    Define se o profissional está ativo na rede municipal.
                  </p>
                </div>
                <Switch checked={formAtivo} onCheckedChange={setFormAtivo} />
              </div>

              {/* Seção Dinâmica de Vínculo com Vagas */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      Vagas da Unidade Escolar
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Vincule o profissional às vagas existentes da unidade escolar selecionada.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdicionarVagaVinculo}
                    disabled={!formUnidadeId || carregandoVagasUnidade}
                    className="text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar outra vaga
                  </Button>
                </div>

                {!formUnidadeId ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    Selecione uma Unidade Escolar acima para visualizar e vincular vagas.
                  </div>
                ) : carregandoVagasUnidade ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    Carregando vagas da unidade escolar...
                  </div>
                ) : vagasDaUnidade.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                    A unidade escolar selecionada ainda não possui vagas geradas no ano letivo
                    atual. Você pode gerar vagas no menu "Cadastro de Vagas".
                  </div>
                ) : formVinculos.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center space-y-2">
                    <p className="text-xs text-slate-600">
                      Nenhuma vaga vinculada a este profissional no momento.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAdicionarVagaVinculo}
                      className="text-xs h-8 bg-white border-blue-300 text-blue-700"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Vincular Vaga Agora
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formVinculos.map((item, index) => {
                      const cargosPermitidos = getCargosPermitidosParaVaga(item.vaga_id)
                      return (
                        <div
                          key={item.idTemp || index}
                          className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-3 relative"
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-800">
                              Vínculo de Vaga #{index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoverVinculo(index)}
                              className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 h-7 px-2 text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Remover vaga
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Seleção da Vaga */}
                            <div className="sm:col-span-2">
                              <Label className="text-xs font-medium text-slate-700">
                                Selecione a Vaga <span className="text-rose-500">*</span>
                              </Label>
                              <Select
                                value={item.vaga_id}
                                onValueChange={(val) => handleAlterarVagaLinha(index, val)}
                              >
                                <SelectTrigger className="mt-1 bg-white">
                                  <SelectValue placeholder="Escolha a vaga disponível..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {vagasDaUnidade.map((vg) => {
                                    const jaOcupada =
                                      vg.status === 'OCUPADA' &&
                                      vg.servidor_id !== editingProfissional?.id
                                    return (
                                      <SelectItem key={vg.id} value={vg.id}>
                                        {vg.codigo ? `${vg.codigo} - ` : ''}
                                        {vg.funcao} (Nº {vg.numero_sequencial}
                                        {vg.periodo ? ` - ${vg.periodo}` : ''})
                                        {jaOcupada
                                          ? ` [Ocupada por ${vg.nome_ocupante || 'Outro'}]`
                                          : ' [Disponível]'}
                                      </SelectItem>
                                    )
                                  })}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Pergunta: É titular da vaga? */}
                            <div className="p-2.5 bg-white rounded-md border border-slate-200 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-xs font-semibold text-slate-800">
                                  Titular da Vaga?
                                </Label>
                                <p className="text-[10px] text-slate-500">
                                  {item.titular ? 'Sim, titular desta vaga' : 'Não, suplente/outra'}
                                </p>
                              </div>
                              <Switch
                                checked={item.titular}
                                onCheckedChange={(val) => handleAlterarTitularLinha(index, val)}
                              />
                            </div>

                            {/* Ocupação / Cargo */}
                            <div className="space-y-1">
                              <Label className="text-xs font-medium text-slate-700">
                                Ocupação (Cargo ocupado na vaga)
                              </Label>
                              <Select
                                value={item.cargo_id || 'nenhum'}
                                onValueChange={(val) =>
                                  handleAlterarCargoLinha(index, val === 'nenhum' ? '' : val)
                                }
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Selecione o cargo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="nenhum">Nenhum cargo específico</SelectItem>
                                  {cargosPermitidos.map((cg) => (
                                    <SelectItem key={cg.id} value={cg.id}>
                                      {cg.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-[10px] text-slate-400">
                                Cargos compatíveis com a função da vaga na Configuração de RH.
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenDialog(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Profissional'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização (Detalhe) */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Detalhes do Profissional
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Informações cadastrais e vínculos de vagas registradas no sistema.
            </DialogDescription>
          </DialogHeader>

          {viewingProfissional && (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Identificador
                  </span>
                  <span className="font-mono font-bold text-blue-700 text-sm">
                    {viewingProfissional.codigo || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Status
                  </span>
                  <Badge
                    className={
                      viewingProfissional.ativo
                        ? 'bg-emerald-600 text-white mt-0.5'
                        : 'bg-slate-200 text-slate-700 mt-0.5'
                    }
                  >
                    {viewingProfissional.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Nome Completo
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {viewingProfissional.nome}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                    Unidade Escolar
                  </span>
                  <span className="font-medium text-slate-800">
                    {viewingProfissional.unidade_escolar?.nome || '—'}
                  </span>
                </div>
              </div>

              {/* Vínculos com Vagas */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Vagas Vinculadas ({viewingProfissional.vagas_vinculadas?.length || 0})
                </span>

                {!viewingProfissional.vagas_vinculadas ||
                viewingProfissional.vagas_vinculadas.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-md border border-slate-200">
                    Nenhuma vaga vinculada a este profissional.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {viewingProfissional.vagas_vinculadas.map((v, idx) => (
                      <div
                        key={v.id || idx}
                        className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                            {v.vaga?.funcao || 'Função não identificada'}
                            {v.vaga?.codigo && (
                              <span className="font-mono text-[11px] text-slate-500 font-normal">
                                ({v.vaga.codigo})
                              </span>
                            )}
                          </span>

                          <Badge
                            className={
                              v.titular
                                ? 'bg-blue-100 text-blue-800 border-blue-200 text-[10px]'
                                : 'bg-slate-100 text-slate-700 text-[10px]'
                            }
                          >
                            {v.titular ? 'Titular' : 'Não Titular'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Ocupação/Cargo</span>
                            <span className="font-medium text-slate-800">
                              {v.cargo?.nome || 'Não definido'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">
                              Período da Vaga
                            </span>
                            <span>{v.vaga?.periodo || '—'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenViewDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={Boolean(deletingProfissional)}
        onOpenChange={(open) => !open && setDeletingProfissional(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Excluir Profissional?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 space-y-2">
              <p>
                Tem certeza que deseja excluir o cadastro do profissional{' '}
                <strong>"{deletingProfissional?.nome}"</strong> ({deletingProfissional?.codigo})?
              </p>
              <p className="text-rose-700 bg-rose-50 p-2.5 rounded-md border border-rose-200">
                Atenção: todas as vagas ocupadas por este profissional serão automaticamente
                desvinculadas e retornarão ao status <strong>ABERTA</strong>.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {saving ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
