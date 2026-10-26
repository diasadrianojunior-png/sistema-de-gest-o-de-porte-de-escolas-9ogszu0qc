import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  School,
  Search,
  Loader2,
  MapPin,
  Eye,
  Layers,
  Clock,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  getUnidadesEscolares,
  createUnidadeEscolar,
  updateUnidadeEscolar,
  deleteUnidadeEscolar,
} from '@/services/unidades-escolares'
import {
  UnidadeEscolar,
  TipoAtendimentoUnidade,
  OPCOES_NIVEL_40H,
  normalizarNivelPorte,
} from '@/types/gestao-escolar'
import {
  carregarMapaFaixasPorTipoAtendimento,
  calcularNivelPorQtdAlunos,
  resolverRotuloNivelComFaixas,
  NivelFaixaFormatada,
} from '@/services/faixas-nivel-unidade'
import {
  LocalizacaoUnidadeSection,
  EnderecoUnidadeData,
} from '@/components/LocalizacaoUnidadeSection'

export default function CadastrosMestres() {
  const { isAdmin, canEdit } = useAuth()
  const canEditUnidades = isAdmin || canEdit('unidades_escolares')
  const [unidades, setUnidades] = useState<UnidadeEscolar[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)
  // Mapa dinâmico de níveis do banco por tipo de atendimento (configuracao_rh_nivel)
  const [mapaFaixas, setMapaFaixas] = useState<Record<string, NivelFaixaFormatada[]>>({})

  // Modais
  const [openFormDialog, setOpenFormDialog] = useState(false)
  const [openViewDialog, setOpenViewDialog] = useState(false)
  const [viewingUnidade, setViewingUnidade] = useState<UnidadeEscolar | null>(null)
  const [editingUnidade, setEditingUnidade] = useState<UnidadeEscolar | null>(null)
  const [deletingUnidade, setDeletingUnidade] = useState<UnidadeEscolar | null>(null)

  // Formulário de Unidade Escolar
  const [formData, setFormData] = useState<{
    nome: string
    tipo_atendimento: TipoAtendimentoUnidade | ''
    nivel_porte: string
    quantidade_alunos: string
    localizacao: string
    endereco: EnderecoUnidadeData
  }>({
    nome: '',
    tipo_atendimento: '',
    nivel_porte: '',
    quantidade_alunos: '',
    localizacao: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      estado_uf: 'PR',
      cidade: 'Cambé',
      latitude: null,
      longitude: null,
    },
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [data, faixasBanco] = await Promise.all([
        getUnidadesEscolares(),
        carregarMapaFaixasPorTipoAtendimento(),
      ])
      setUnidades(data)
      setMapaFaixas(faixasBanco)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Falha ao sincronizar com o banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreate = () => {
    setEditingUnidade(null)
    setFormData({
      nome: '',
      tipo_atendimento: '',
      nivel_porte: '',
      quantidade_alunos: '',
      localizacao: '',
      endereco: {
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        estado_uf: 'PR',
        cidade: 'Cambé',
        latitude: null,
        longitude: null,
      },
    })
    setOpenFormDialog(true)
  }

  const handleOpenEdit = (unidade: UnidadeEscolar) => {
    setEditingUnidade(unidade)
    const niveisTipo = mapaFaixas[unidade.tipo_atendimento] || []
    const nivelResolvido = resolverRotuloNivelComFaixas(
      unidade.tipo_atendimento,
      unidade.nivel_porte,
      niveisTipo,
    )
    setFormData({
      nome: unidade.nome,
      tipo_atendimento: unidade.tipo_atendimento,
      nivel_porte: nivelResolvido || unidade.nivel_porte,
      quantidade_alunos:
        unidade.quantidade_alunos !== null && unidade.quantidade_alunos !== undefined
          ? String(unidade.quantidade_alunos)
          : '',
      localizacao: unidade.localizacao,
      endereco: {
        cep: unidade.cep || '',
        logradouro: unidade.logradouro || '',
        numero: unidade.numero || '',
        bairro: unidade.bairro || '',
        estado_uf: unidade.estado_uf || 'PR',
        cidade: unidade.cidade || 'Cambé',
        latitude: unidade.latitude ?? null,
        longitude: unidade.longitude ?? null,
      },
    })
    setOpenFormDialog(true)
  }

  const handleOpenView = (unidade: UnidadeEscolar) => {
    setViewingUnidade(unidade)
    setOpenViewDialog(true)
  }

  // Manipulador da troca de Tipo de Atendimento:
  // Reseta seleção incompatível e recalcula se houver quantidade de alunos preenchida
  const handleTipoAtendimentoChange = (val: string) => {
    const novoTipo = val as TipoAtendimentoUnidade
    setFormData((prev) => {
      let novoNivel = ''
      if (prev.quantidade_alunos && Number(prev.quantidade_alunos) >= 0) {
        const faixasNovoTipo = mapaFaixas[novoTipo] || []
        const calculado = calcularNivelPorQtdAlunos(faixasNovoTipo, Number(prev.quantidade_alunos))
        if (calculado) {
          novoNivel = calculado.rotulo
        }
      }
      return {
        ...prev,
        tipo_atendimento: novoTipo,
        nivel_porte: novoNivel, // Recalcula se tiver alunos ou limpa para evitar vínculo incompatível
      }
    })
  }

  // Manipulador de alteração da quantidade de alunos:
  // Se o usuário informar a quantidade de alunos, calcula o nível automaticamente pelas faixas do banco
  const handleQuantidadeAlunosChange = (val: string) => {
    const num = Number(val)
    setFormData((prev) => {
      let nivelAuto = prev.nivel_porte
      if (val !== '' && !isNaN(num) && num >= 0 && prev.tipo_atendimento) {
        const faixas = mapaFaixas[prev.tipo_atendimento] || []
        const encontrado = calcularNivelPorQtdAlunos(faixas, num)
        if (encontrado) {
          nivelAuto = encontrado.rotulo
        }
      }
      return {
        ...prev,
        quantidade_alunos: val,
        nivel_porte: nivelAuto,
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast({
        title: 'Atenção',
        description: 'O Nome da Unidade escolar é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    if (!formData.tipo_atendimento) {
      toast({
        title: 'Atenção',
        description: 'Selecione o tipo de atendimento da unidade.',
        variant: 'destructive',
      })
      return
    }

    if (!formData.nivel_porte) {
      toast({
        title: 'Atenção',
        description: 'Selecione a opção de nível/porte compatível com o atendimento selecionado.',
        variant: 'destructive',
      })
      return
    }

    // Validação e normalização de compatibilidade entre tipo de atendimento e nível/porte selecionado
    const faixasDisponiveis = mapaFaixas[formData.tipo_atendimento] || []
    const rotulosValidos = faixasDisponiveis.map((f) => f.rotulo)
    const nivelResolvido = resolverRotuloNivelComFaixas(
      formData.tipo_atendimento,
      formData.nivel_porte,
      faixasDisponiveis,
    )

    const ehCompativel =
      rotulosValidos.length > 0
        ? rotulosValidos.includes(nivelResolvido)
        : Boolean(normalizarNivelPorte(formData.tipo_atendimento, formData.nivel_porte))

    if (!ehCompativel) {
      toast({
        title: 'Vínculo incompatível',
        description:
          'O nível/porte selecionado não é compatível com o tipo de atendimento escolhido. Por favor selecione uma opção válida.',
        variant: 'destructive',
      })
      return
    }

    const qtdAlunosNum =
      formData.quantidade_alunos !== '' && !isNaN(Number(formData.quantidade_alunos))
        ? Math.max(0, Math.floor(Number(formData.quantidade_alunos)))
        : null

    // Se o usuário preencheu campos na seção de endereço do Google Maps, valida os obrigatórios da seção
    const temEnderecoIniciado =
      Boolean(formData.endereco.cep) ||
      Boolean(formData.endereco.logradouro) ||
      Boolean(formData.endereco.numero) ||
      Boolean(formData.endereco.bairro)

    if (temEnderecoIniciado) {
      if (!formData.endereco.logradouro.trim()) {
        toast({
          title: 'Atenção',
          description: 'O campo Logradouro é obrigatório no endereço da unidade.',
          variant: 'destructive',
        })
        return
      }
      if (!formData.endereco.numero.trim()) {
        toast({
          title: 'Atenção',
          description:
            'O campo Número é obrigatório no endereço da unidade (digite S/N caso não possua).',
          variant: 'destructive',
        })
        return
      }
      if (!formData.endereco.bairro.trim()) {
        toast({
          title: 'Atenção',
          description: 'O campo Bairro é obrigatório no endereço da unidade.',
          variant: 'destructive',
        })
        return
      }
      // Validação REGRA 2: antes de salvar, validar que a cidade é Cambé (PR)
      const cidadeNorm = (formData.endereco.cidade || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      if (cidadeNorm !== 'cambe') {
        toast({
          title: 'Cidade não permitida',
          description: 'Só é possível cadastrar unidades escolares na cidade de Cambé (PR).',
          variant: 'destructive',
        })
        return
      }
    }

    // Define texto resumo de localização se estiver vazio
    let localizacaoFinal = formData.localizacao.trim()
    if (!localizacaoFinal && temEnderecoIniciado) {
      localizacaoFinal = [
        formData.endereco.logradouro,
        formData.endereco.numero ? `nº ${formData.endereco.numero}` : '',
        formData.endereco.bairro,
        `${formData.endereco.cidade || 'Cambé'} - ${formData.endereco.estado_uf || 'PR'}`,
      ]
        .filter(Boolean)
        .join(', ')
    }

    if (!localizacaoFinal) {
      toast({
        title: 'Atenção',
        description: 'A localização ou endereço da unidade escolar é obrigatória.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      const payload = {
        nome: formData.nome.trim(),
        tipo_atendimento: formData.tipo_atendimento as TipoAtendimentoUnidade,
        nivel_porte: nivelResolvido,
        localizacao: localizacaoFinal,
        cep: formData.endereco.cep ? formData.endereco.cep.trim() : null,
        logradouro: formData.endereco.logradouro ? formData.endereco.logradouro.trim() : null,
        numero: formData.endereco.numero ? formData.endereco.numero.trim() : null,
        bairro: formData.endereco.bairro ? formData.endereco.bairro.trim() : null,
        estado_uf: formData.endereco.estado_uf ? formData.endereco.estado_uf.trim() : 'PR',
        cidade: formData.endereco.cidade ? formData.endereco.cidade.trim() : 'Cambé',
        latitude: formData.endereco.latitude,
        longitude: formData.endereco.longitude,
        ...(qtdAlunosNum !== null ? { quantidade_alunos: qtdAlunosNum } : {}),
      }

      if (editingUnidade) {
        await updateUnidadeEscolar(editingUnidade.id, payload)
        toast({
          title: 'Unidade escolar atualizada',
          description: 'Os dados foram salvos com sucesso!',
        })
      } else {
        await createUnidadeEscolar(payload)
        toast({
          title: 'Unidade escolar cadastrada',
          description: 'Nova unidade escolar inserida com identificador automático.',
        })
      }
      setOpenFormDialog(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar unidade escolar',
        description: err.message || 'Falha ao persistir alterações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingUnidade) return
    try {
      setSaving(true)
      await deleteUnidadeEscolar(deletingUnidade.id)
      toast({
        title: 'Unidade escolar excluída',
        description: 'Registro removido com sucesso.',
      })
      setDeletingUnidade(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir unidade escolar',
        description: err.message || 'Não foi possível remover o registro.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredUnidades = unidades.filter(
    (u) =>
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      (u.codigo && u.codigo.toLowerCase().includes(search.toLowerCase())) ||
      u.tipo_atendimento.toLowerCase().includes(search.toLowerCase()) ||
      u.nivel_porte.toLowerCase().includes(search.toLowerCase()) ||
      u.localizacao.toLowerCase().includes(search.toLowerCase()) ||
      (u.logradouro && u.logradouro.toLowerCase().includes(search.toLowerCase())) ||
      (u.bairro && u.bairro.toLowerCase().includes(search.toLowerCase())) ||
      (u.cep && u.cep.toLowerCase().includes(search.toLowerCase())),
  )

  const unidadesPaginadas = filteredUnidades.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA_PADRAO,
    paginaAtual * ITENS_POR_PAGINA_PADRAO,
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
          <span>Cadastros Mestres</span>
          <span>&rsaquo;</span>
          <span>Unidades escolares</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Unidades Escolares
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Cadastro central de unidades da rede com definição de atendimento, nível/porte e
          localização
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Relação de Unidades Escolares</CardTitle>
            <CardDescription>
              Total de {unidades.length} unidade(s) escolar(es) cadastrada(s)
            </CardDescription>
          </div>
          {canEditUnidades && (
            <Button
              onClick={handleOpenCreate}
              className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              <Plus className="w-4 h-4" />
              Nova Unidade Escolar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar código (UN-XXXX), nome, nível, local..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPaginaAtual(1)
              }}
              className="pl-9 text-sm"
            />
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando unidades
              escolares...
            </div>
          ) : filteredUnidades.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhuma unidade escolar encontrada.{' '}
              {search
                ? 'Tente outro termo na busca.'
                : 'Clique em "Nova Unidade Escolar" para adicionar o primeiro cadastro.'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium w-28">Código</th>
                    <th className="py-3 px-4 font-medium">Nome da Unidade Escolar</th>
                    <th className="py-3 px-4 font-medium">Tipo de Atendimento</th>
                    <th className="py-3 px-4 font-medium">Nível / Faixa</th>
                    <th className="py-3 px-4 font-medium">Localização</th>
                    <th className="py-3 px-4 font-medium text-right w-36">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unidadesPaginadas.map((unidade) => (
                    <tr key={unidade.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {unidade.codigo || 'UN-0000'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{unidade.nome}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {unidade.tipo_atendimento}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          <Layers className="w-3 h-3 text-blue-600" />
                          {resolverRotuloNivelComFaixas(
                            unidade.tipo_atendimento,
                            unidade.nivel_porte,
                            mapaFaixas[unidade.tipo_atendimento],
                          ) ||
                            normalizarNivelPorte(unidade.tipo_atendimento, unidade.nivel_porte) ||
                            unidade.nivel_porte}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span
                              className="truncate max-w-[260px]"
                              title={
                                unidade.logradouro
                                  ? `${unidade.logradouro}, ${unidade.numero || 'S/N'} - ${unidade.bairro || ''} (${unidade.cidade || 'Cambé'}-${unidade.estado_uf || 'PR'})`
                                  : unidade.localizacao
                              }
                            >
                              {unidade.logradouro
                                ? `${unidade.logradouro}, ${unidade.numero || 'S/N'}`
                                : unidade.localizacao}
                            </span>
                          </div>
                          {(unidade.bairro || unidade.cep) && (
                            <div className="text-[11px] text-slate-500 pl-5">
                              {unidade.bairro ? `${unidade.bairro} • ` : ''}
                              {unidade.cidade || 'Cambé'}/{unidade.estado_uf || 'PR'}
                              {unidade.cep ? ` • CEP: ${unidade.cep}` : ''}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <Button
                          size="icon"
                          className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                          onClick={() => handleOpenView(unidade)}
                          title="Visualizar Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canEditUnidades && (
                          <>
                            <Button
                              size="icon"
                              className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                              onClick={() => handleOpenEdit(unidade)}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                              onClick={() => setDeletingUnidade(unidade)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginacaoTabela
                paginaAtual={paginaAtual}
                totalRegistros={filteredUnidades.length}
                itensPorPagina={ITENS_POR_PAGINA_PADRAO}
                onMudarPagina={setPaginaAtual}
                rotuloItens="unidades escolares"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: CRIAR / EDITAR UNIDADE ESCOLAR */}
      <Dialog open={openFormDialog} onOpenChange={setOpenFormDialog}>
        <DialogContent className="sm:max-w-[680px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUnidade ? 'Editar Unidade Escolar' : 'Nova Unidade Escolar'}
            </DialogTitle>
            <DialogDescription>
              Preencha os atributos e a localização da unidade escolar com suporte ao Google Maps e
              restrição à Cambé (PR).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* 1. Identificador da Unidade escolar (Campo gerado automaticamente) */}
            <div className="space-y-2">
              <Label
                htmlFor="codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador da Unidade escolar (Campo gerado automaticamente)
              </Label>
              <Input
                id="codigo"
                value={
                  editingUnidade
                    ? editingUnidade.codigo || 'UN-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: UN-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* 2. Nome da Unidade escolar * */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Unidade escolar *</Label>
              <Input
                id="nome"
                placeholder="Ex: EMEF Professora Maria Aparecida"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>

            {/* 3. Combo box com as seguintes Opções: 'Ensino Fundamental e Educação Infantil (20h)' ou 'Educação Infantil (40h)' */}
            <div className="space-y-2">
              <Label htmlFor="tipo_atendimento">Tipo de Atendimento da Unidade *</Label>
              <Select value={formData.tipo_atendimento} onValueChange={handleTipoAtendimentoChange}>
                <SelectTrigger id="tipo_atendimento">
                  <SelectValue placeholder="Selecione o tipo de atendimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ensino Fundamental e Educação Infantil (20h)">
                    Ensino Fundamental e Educação Infantil (20h)
                  </SelectItem>
                  <SelectItem value="Educação Infantil (40h)">Educação Infantil (40h)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Quantidade de alunos (opcional para cálculo automático ou referência) */}
            {formData.tipo_atendimento && (
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="quantidade_alunos"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Quantidade de Alunos (Cálculo Automático do Nível)
                  </Label>
                  <span className="text-[11px] text-slate-500">Opcional</span>
                </div>
                <Input
                  id="quantidade_alunos"
                  type="number"
                  min="0"
                  placeholder="Ex: 323"
                  value={formData.quantidade_alunos}
                  onChange={(e) => handleQuantidadeAlunosChange(e.target.value)}
                  className="bg-white text-sm"
                />
                <p className="text-[11px] text-slate-500">
                  Ao digitar o total de alunos, o nível oficial da unidade é enquadrado
                  automaticamente conforme a tabela de faixas vigentes do banco.
                </p>
              </div>
            )}

            {/* 5. REGRA CONDICIONAL: Segundo combo box baseado na escolha do primeiro (lido do banco de configuracao_rh_nivel) */}
            {formData.tipo_atendimento === 'Ensino Fundamental e Educação Infantil (20h)' && (
              <div className="space-y-2 bg-blue-50/60 p-3.5 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <Label htmlFor="nivel_porte_20h" className="text-blue-950 font-semibold text-sm">
                    Nível / Faixa de Alunos *
                  </Label>
                  <span className="text-[11px] font-medium text-blue-700">
                    Tabela Oficial (20h)
                  </span>
                </div>
                <SelectPaginado
                  id="nivel_porte_20h"
                  value={formData.nivel_porte}
                  onValueChange={(val) => setFormData({ ...formData, nivel_porte: val })}
                  placeholder="Selecione nível e faixa de alunos"
                  triggerClassName="bg-white"
                  searchPlaceholder="Buscar nível..."
                  options={(mapaFaixas['Ensino Fundamental e Educação Infantil (20h)'] || []).map(
                    (faixa) => ({
                      value: faixa.rotulo,
                      label: <span className="font-semibold">{faixa.rotulo}</span>,
                      searchText: faixa.rotulo,
                    }),
                  )}
                />
                <div className="flex items-center justify-between text-[11px] text-blue-800">
                  <span>
                    {(mapaFaixas['Ensino Fundamental e Educação Infantil (20h)'] || []).length}{' '}
                    faixas ativas cadastradas no módulo de RH
                  </span>
                  {formData.nivel_porte && (
                    <span className="font-semibold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                      Selecionado: {formData.nivel_porte.split(':')[0]}
                    </span>
                  )}
                </div>
              </div>
            )}

            {formData.tipo_atendimento === 'Educação Infantil (40h)' && (
              <div className="space-y-2 bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="nivel_porte_40h"
                    className="text-emerald-950 font-semibold text-sm"
                  >
                    Nível / Faixa de Alunos *
                  </Label>
                  <span className="text-[11px] font-medium text-emerald-700">
                    Tabela Oficial (40h)
                  </span>
                </div>
                <SelectPaginado
                  id="nivel_porte_40h"
                  value={formData.nivel_porte}
                  onValueChange={(val) => setFormData({ ...formData, nivel_porte: val })}
                  placeholder="Selecione nível e faixa de alunos"
                  triggerClassName="bg-white"
                  searchPlaceholder="Buscar nível..."
                  options={(mapaFaixas['Educação Infantil (40h)'] || []).map((faixa) => ({
                    value: faixa.rotulo,
                    label: <span className="font-semibold">{faixa.rotulo}</span>,
                    searchText: faixa.rotulo,
                  }))}
                />
                <div className="flex items-center justify-between text-[11px] text-emerald-800">
                  <span>
                    {(mapaFaixas['Educação Infantil (40h)'] || []).length} faixas ativas cadastradas
                    no módulo de RH
                  </span>
                  {formData.nivel_porte && (
                    <span className="font-semibold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                      Selecionado: {formData.nivel_porte.split(':')[0]}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 5. Seção de Localização e Endereço da Unidade com Google Maps (Conforme imagem) */}
            <LocalizacaoUnidadeSection
              value={formData.endereco}
              onChange={(novoEndereco) => {
                setFormData((prev) => ({
                  ...prev,
                  endereco: novoEndereco,
                  // Atualiza também o campo de localização resumo se estiver vazio ou derivado
                  localizacao: novoEndereco.logradouro
                    ? [
                        novoEndereco.logradouro,
                        novoEndereco.numero ? `nº ${novoEndereco.numero}` : '',
                        novoEndereco.bairro,
                        `${novoEndereco.cidade || 'Cambé'} - ${novoEndereco.estado_uf || 'PR'}`,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    : prev.localizacao,
                }))
              }}
              onLocationSummaryChange={(summary) => {
                setFormData((prev) => ({
                  ...prev,
                  localizacao: summary,
                }))
              }}
              disabled={saving}
            />

            {/* Campo adicional: Descrição ou Complemento da Localização */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="localizacao" className="text-xs font-semibold text-slate-700">
                Resumo / Descrição da Localização
              </Label>
              <Input
                id="localizacao"
                placeholder="Ex: Próximo à praça central ou Zona Urbana"
                value={formData.localizacao}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                className="text-sm bg-slate-50/50"
              />
              <p className="text-[11px] text-slate-500">
                Preenchido automaticamente a partir do endereço geolocalizado ou customizável.
              </p>
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
                {editingUnidade ? 'Atualizar Unidade' : 'Cadastrar Unidade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: VISUALIZAÇÃO DE DETALHES */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="w-5 h-5 text-primary" />
              Detalhes da Unidade Escolar
            </DialogTitle>
            <DialogDescription>Ficha cadastral consolidada no cadastro mestre</DialogDescription>
          </DialogHeader>
          {viewingUnidade && (
            <div className="space-y-4 py-2 text-sm">
              <div className="border-b pb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Identificador da Unidade
                  </span>
                  <p className="font-mono text-sm font-bold text-blue-700 mt-0.5">
                    {viewingUnidade.codigo || 'UN-0000'}
                  </p>
                </div>
              </div>

              <div className="border-b pb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Nome da Unidade Escolar
                </span>
                <p className="text-base font-medium text-slate-900 mt-0.5">{viewingUnidade.nome}</p>
              </div>

              <div className="border-b pb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Tipo de Atendimento
                </span>
                <p className="text-slate-800 font-medium mt-0.5">
                  {viewingUnidade.tipo_atendimento}
                </p>
              </div>

              <div className="border-b pb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Nível / Porte
                </span>
                <p className="text-slate-800 font-medium mt-0.5">
                  {resolverRotuloNivelComFaixas(
                    viewingUnidade.tipo_atendimento,
                    viewingUnidade.nivel_porte,
                    mapaFaixas[viewingUnidade.tipo_atendimento],
                  ) || viewingUnidade.nivel_porte}
                </p>
              </div>

              {viewingUnidade.quantidade_alunos !== null &&
                viewingUnidade.quantidade_alunos !== undefined && (
                  <div className="border-b pb-3">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      Quantidade de Alunos Registrada
                    </span>
                    <p className="text-slate-800 font-medium mt-0.5">
                      {viewingUnidade.quantidade_alunos} aluno(s)
                    </p>
                  </div>
                )}

              <div className="border-b pb-3 space-y-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Endereço Completo & Localização
                </span>
                {viewingUnidade.logradouro ? (
                  <div className="bg-slate-50 rounded-lg p-3 border text-xs space-y-1.5">
                    <p className="font-semibold text-slate-900 text-sm">
                      {viewingUnidade.logradouro}, {viewingUnidade.numero || 'S/N'}
                    </p>
                    <p className="text-slate-700">
                      Bairro: <span className="font-medium">{viewingUnidade.bairro || '—'}</span>
                    </p>
                    <p className="text-slate-700">
                      Cidade/UF:{' '}
                      <span className="font-medium">
                        {viewingUnidade.cidade || 'Cambé'} - {viewingUnidade.estado_uf || 'PR'}
                      </span>
                    </p>
                    {viewingUnidade.cep && (
                      <p className="text-slate-700 font-mono">
                        CEP: <span className="font-medium">{viewingUnidade.cep}</span>
                      </p>
                    )}
                    {viewingUnidade.latitude !== null && viewingUnidade.latitude !== undefined && (
                      <div className="pt-1 border-t text-[11px] text-slate-500 font-mono flex items-center gap-2">
                        <span>Lat: {viewingUnidade.latitude}</span>
                        <span>•</span>
                        <span>Lng: {viewingUnidade.longitude}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-800 mt-0.5">{viewingUnidade.localizacao}</p>
                )}
              </div>

              {viewingUnidade.localizacao && viewingUnidade.logradouro && (
                <div className="pb-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Referência / Observações
                  </span>
                  <p className="text-slate-800 mt-0.5 text-xs">{viewingUnidade.localizacao}</p>
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
      <AlertDialog
        open={!!deletingUnidade}
        onOpenChange={(open) => !open && setDeletingUnidade(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Unidade Escolar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o cadastro da unidade escolar{' '}
              <strong className="text-slate-900">"{deletingUnidade?.nome}"</strong>? Esta ação não
              pode ser desfeita.
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
    </div>
  )
}
