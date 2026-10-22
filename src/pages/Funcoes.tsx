import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
  Layers,
  Briefcase,
  Eye,
  CheckSquare,
  Square,
  ShieldAlert,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  getCargos,
  createCargo,
  getFuncoes,
  createFuncao,
  updateFuncao,
  deleteFuncao,
} from '@/services/apoio'
import { Cargo, Funcao } from '@/types/gestao-escolar'

export default function Funcoes() {
  const { isAdmin, canEdit } = useAuth()
  const canEditFuncoes = isAdmin || canEdit('funcoes')
  const [funcoes, setFuncoes] = useState<Funcao[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [searchFuncao, setSearchFuncao] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Diálogo de criação/edição
  const [openFuncaoDialog, setOpenFuncaoDialog] = useState(false)
  const [editingFuncao, setEditingFuncao] = useState<Funcao | null>(null)
  const [funcaoFormNome, setFuncaoFormNome] = useState('')
  const [selectedCargoIds, setSelectedCargoIds] = useState<string[]>([])
  const [searchChecklist, setSearchChecklist] = useState('')

  // Diálogo de criação rápida de cargo a partir de Funções
  const [openNovoCargoDialog, setOpenNovoCargoDialog] = useState(false)
  const [novoCargoNome, setNovoCargoNome] = useState('')
  const [salvandoCargo, setSalvandoCargo] = useState(false)

  // Diálogo de visualização
  const [openViewDialog, setOpenViewDialog] = useState(false)
  const [viewingFuncao, setViewingFuncao] = useState<Funcao | null>(null)

  // Diálogo de exclusão
  const [deletingFuncao, setDeletingFuncao] = useState<Funcao | null>(null)

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [listaFuncoes, listaCargos] = await Promise.all([getFuncoes(), getCargos()])
      // Sanitização de cargos: mantém apenas cargos existentes e ativos com ID e nome válidos
      const cargosValidos = (listaCargos || []).filter((c) => Boolean(c && c.id && c.nome))
      setFuncoes(listaFuncoes)
      setCargos(cargosValidos)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message || 'Falha ao buscar funções e cargos no banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleOpenCreateFuncao = () => {
    setEditingFuncao(null)
    setFuncaoFormNome('')
    setSelectedCargoIds([])
    setSearchChecklist('')
    setOpenFuncaoDialog(true)
  }

  const handleOpenEditFuncao = (funcao: Funcao) => {
    setEditingFuncao(funcao)
    setFuncaoFormNome(funcao.nome)
    // Sanitização dinâmica: manter apenas IDs de cargos que realmente existem na base atual
    const idsCargosAtivos = new Set(cargos.map((c) => c.id))
    const idsVinculadosValidos = (funcao.cargos_vinculados || [])
      .map((c) => c.id)
      .filter((id) => idsCargosAtivos.has(id))
    setSelectedCargoIds(idsVinculadosValidos)
    setSearchChecklist('')
    setOpenFuncaoDialog(true)
  }

  const handleOpenViewFuncao = (funcao: Funcao) => {
    setViewingFuncao(funcao)
    setOpenViewDialog(true)
  }

  // Alternar um cargo no checklist garantindo que apenas cargos existentes possam ser alternados
  const handleToggleCargo = (cargoId: string) => {
    if (!cargos.some((c) => c.id === cargoId)) return
    setSelectedCargoIds((prev) =>
      prev.includes(cargoId) ? prev.filter((id) => id !== cargoId) : [...prev, cargoId],
    )
  }

  // Marcar todos os cargos disponíveis (apenas os ativos/filtrados válidos)
  const handleSelectAllCargos = () => {
    const idsParaMarcar = cargosFiltradosChecklist.map((c) => c.id)
    setSelectedCargoIds((prev) => Array.from(new Set([...prev, ...idsParaMarcar])))
  }

  // Desmarcar todos os cargos
  const handleDeselectAllCargos = () => {
    setSelectedCargoIds([])
  }

  // Abrir diálogo de criação rápida de cargo inline
  const handleOpenNovoCargoInline = () => {
    setNovoCargoNome('')
    setOpenNovoCargoDialog(true)
  }

  // Salvar novo cargo criado inline a partir de Funções
  const handleSaveNovoCargoInline = async (e: React.FormEvent) => {
    e.preventDefault()
    const nomeLimpo = novoCargoNome.trim()
    if (!nomeLimpo) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome do cargo.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSalvandoCargo(true)
      const novoCargo = await createCargo({ nome: nomeLimpo })
      toast({
        title: 'Cargo cadastrado com sucesso!',
        description: `O cargo "${novoCargo.nome}" (${novoCargo.codigo || 'CAR-XXXX'}) foi criado e já está selecionado.`,
      })
      // Recarregar lista de cargos da base
      const listaAtualizada = await getCargos()
      setCargos(listaAtualizada)
      // Marcar automaticamente o novo cargo na lista de selecionados da função
      setSelectedCargoIds((prev) => (prev.includes(novoCargo.id) ? prev : [...prev, novoCargo.id]))
      // Fechar modal de cargo sem fechar o modal da função
      setOpenNovoCargoDialog(false)
      setNovoCargoNome('')
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar cargo',
        description: err.message || 'Não foi possível cadastrar o novo cargo.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoCargo(false)
    }
  }

  // Salvar (criar ou atualizar)
  const handleSaveFuncao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!funcaoFormNome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome da função.',
        variant: 'destructive',
      })
      return
    }

    // Filtrar estritamente apenas cargos que ainda existem na lista atual do sistema
    const idsCargosAtivos = new Set(cargos.map((c) => c.id))
    const cargoIdsFiltrados = selectedCargoIds.filter((id) => idsCargosAtivos.has(id))

    try {
      setSaving(true)
      if (editingFuncao) {
        await updateFuncao(editingFuncao.id, {
          nome: funcaoFormNome.trim(),
          cargo_ids: cargoIdsFiltrados,
        })
        toast({ title: 'Sucesso', description: 'Função atualizada com sucesso!' })
      } else {
        await createFuncao({
          nome: funcaoFormNome.trim(),
          cargo_ids: cargoIdsFiltrados,
        })
        toast({ title: 'Sucesso', description: 'Função cadastrada com sucesso!' })
      }
      setOpenFuncaoDialog(false)
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar função',
        description: err.message || 'Não foi possível salvar o registro.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Excluir confirmação
  const handleDeleteFuncaoConfirm = async () => {
    if (!deletingFuncao) return
    try {
      setSaving(true)
      await deleteFuncao(deletingFuncao.id)
      toast({ title: 'Removido', description: 'Função excluída com sucesso.' })
      setDeletingFuncao(null)
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir função',
        description: err.message || 'Não foi possível excluir o registro.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Filtragem de funções na tabela principal
  const filteredFuncoes = useMemo(() => {
    const q = searchFuncao.trim().toLowerCase()
    if (!q) return funcoes
    return funcoes.filter((f) => {
      const matchNome = f.nome.toLowerCase().includes(q)
      const matchCodigo = f.codigo?.toLowerCase().includes(q)
      const matchCargo = (f.cargos_vinculados || []).some(
        (c) => c.nome.toLowerCase().includes(q) || (c.codigo && c.codigo.toLowerCase().includes(q)),
      )
      return matchNome || matchCodigo || matchCargo
    })
  }, [funcoes, searchFuncao])

  // Cargos filtrados dentro do checklist do modal
  const cargosFiltradosChecklist = useMemo(() => {
    const q = searchChecklist.trim().toLowerCase()
    if (!q) return cargos
    return cargos.filter(
      (c) => c.nome.toLowerCase().includes(q) || (c.codigo && c.codigo.toLowerCase().includes(q)),
    )
  }, [cargos, searchChecklist])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
          <span>Cadastros de Apoio</span>
          <span>&rsaquo;</span>
          <span>Funções</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Layers className="w-7 h-7 text-blue-600" />
          Cadastro de Funções
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gerenciamento de funções escolares e vínculo de quais cargos podem exercê-las
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Funções Cadastradas</CardTitle>
            <CardDescription>
              Total de {funcoes.length} função(ões) cadastrada(s) na tabela de apoio
            </CardDescription>
          </div>
          {canEditFuncoes && (
            <Button
              onClick={handleOpenCreateFuncao}
              className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              <Plus className="w-4 h-4" />
              Nova Função
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por código (FUN-XXXX), nome, cargo..."
              value={searchFuncao}
              onChange={(e) => setSearchFuncao(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando funções...
            </div>
          ) : filteredFuncoes.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhuma função cadastrada.{' '}
              {searchFuncao
                ? 'Tente outro termo na pesquisa.'
                : 'Clique em "Nova Função" para cadastrar.'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium w-28">Código</th>
                    <th className="py-3 px-4 font-medium w-64">Nome da Função</th>
                    <th className="py-3 px-4 font-medium">Cargos que Podem Exercer</th>
                    <th className="py-3 px-4 font-medium text-right w-36">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFuncoes.map((f) => {
                    const cargosVinculados = f.cargos_vinculados || []
                    return (
                      <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Identificador sequencial FUN-XXXX */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {f.codigo || 'FUN-0000'}
                          </span>
                        </td>

                        {/* Nome da função */}
                        <td className="py-3 px-4 font-medium text-slate-900">{f.nome}</td>

                        {/* Cargos que podem exercer com descarte de vínculos fantasmas/órfãos */}
                        <td className="py-3 px-4">
                          {(() => {
                            const validos = cargosVinculados.filter((c) =>
                              Boolean(c && c.id && c.nome),
                            )
                            if (validos.length === 0) {
                              return (
                                <span className="text-xs text-slate-400 italic">
                                  Nenhum cargo vinculado
                                </span>
                              )
                            }
                            return (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {validos.slice(0, 3).map((c) => (
                                  <span
                                    key={c.id}
                                    title={`${c.codigo || ''}: ${c.nome}`}
                                    className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 max-w-[220px] truncate"
                                  >
                                    <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                                    {c.codigo && (
                                      <strong className="font-mono text-blue-700 font-medium">
                                        {c.codigo}
                                      </strong>
                                    )}
                                    <span className="truncate">{c.nome}</span>
                                  </span>
                                ))}
                                {validos.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenViewFuncao(f)}
                                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200"
                                  >
                                    +{validos.length - 3} mais
                                  </button>
                                )}
                              </div>
                            )
                          })()}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right space-x-1">
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                            onClick={() => handleOpenViewFuncao(f)}
                            title="Visualizar Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canEditFuncoes && (
                            <>
                              <Button
                                size="icon"
                                className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                                onClick={() => handleOpenEditFuncao(f)}
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                                onClick={() => setDeletingFuncao(f)}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO: FUNÇÃO (CRIAR/EDITAR COM CHECKLIST DE CARGOS) */}
      <Dialog open={openFuncaoDialog} onOpenChange={setOpenFuncaoDialog}>
        <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              {editingFuncao ? 'Editar Função' : 'Nova Função'}
            </DialogTitle>
            <DialogDescription>
              Preencha o nome da função e marque no checklist quais cargos podem exercê-la.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFuncao} className="space-y-4 pt-1">
            {/* Campo 1: Identificador gerado automaticamente */}
            <div className="space-y-1.5">
              <Label
                htmlFor="f-codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador do Sistema (Automático)
              </Label>
              <Input
                id="f-codigo"
                value={
                  editingFuncao
                    ? editingFuncao.codigo || 'FUN-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: FUN-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* Campo 2: Nome da função (obrigatório) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="f-nome"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Nome da Função *
              </Label>
              <Input
                id="f-nome"
                placeholder="Ex: Diretor de Escola, Coordenador Pedagógico, Vice-Diretor..."
                value={funcaoFormNome}
                onChange={(e) => setFuncaoFormNome(e.target.value)}
                required
              />
            </div>

            {/* Campo 3: Checklist de Cargos que podem exercer com espaço próprio no fluxo */}
            <div className="space-y-3 border-t border-slate-200 pt-4 mt-2">
              {/* Barra superior do atributo: Título e Botões de Ação */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    Cargos que podem exercer
                  </Label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Selecione os cargos habilitados ({selectedCargoIds.length} de {cargos.length}{' '}
                    selecionado(s))
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenNovoCargoInline}
                    className="h-7 text-xs px-2.5 gap-1.5 bg-[#0B2545] hover:bg-[#133A68] text-white font-medium"
                    title="Criar novo cargo diretamente sem sair do cadastro de funções"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Novo cargo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSelectAllCargos}
                    className="h-7 text-xs px-2 gap-1 bg-[#0B2545] hover:bg-[#133A68] text-white"
                  >
                    <CheckSquare className="w-3 h-3" />
                    Marcar todos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDeselectAllCargos}
                    className="h-7 text-xs px-2 gap-1 bg-[#0B2545] hover:bg-[#133A68] text-white"
                  >
                    <Square className="w-3 h-3" />
                    Desmarcar todos
                  </Button>
                </div>
              </div>

              {/* Filtro rápido dentro do checklist */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filtrar cargos do checklist por código ou nome..."
                  value={searchChecklist}
                  onChange={(e) => setSearchChecklist(e.target.value)}
                  className="pl-8 text-xs bg-slate-50 h-8"
                />
              </div>

              {/* Lista rolável do Checklist com altura fixa confortável (~280px) e scroll interno */}
              <div className="h-[280px] overflow-y-auto border border-slate-200 rounded-lg p-1.5 divide-y divide-slate-100 bg-white">
                {cargosFiltradosChecklist.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 py-6">
                    Nenhum cargo encontrado no filtro.
                  </div>
                ) : (
                  cargosFiltradosChecklist.map((c) => {
                    const isChecked = selectedCargoIds.includes(c.id)
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-slate-50 cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-50/70' : ''
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleCargo(c.id)}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-900 leading-snug truncate">
                            {c.nome}
                          </span>
                          <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0 border border-slate-200">
                            {c.codigo || 'CAR-0000'}
                          </span>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            {/* Rodapé de ações — posicionado estritamente abaixo do checklist no fluxo natural */}
            <DialogFooter className="pt-4 border-t border-slate-200 mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
              <Button
                type="button"
                onClick={() => setOpenFuncaoDialog(false)}
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
                {editingFuncao ? 'Atualizar Função' : 'Salvar Função'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: VISUALIZAÇÃO DE DETALHES DA FUNÇÃO */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Detalhes da Função
            </DialogTitle>
            <DialogDescription>
              Informações completas da função e cargos autorizados a exercê-la.
            </DialogDescription>
          </DialogHeader>

          {viewingFuncao && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-lg">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Identificador da Função
                  </span>
                  <span className="font-mono font-bold text-sm text-blue-700 mt-0.5 block">
                    {viewingFuncao.codigo || 'FUN-0000'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Data de Cadastro
                  </span>
                  <span className="font-medium text-slate-900 mt-0.5 block">
                    {viewingFuncao.created_at
                      ? new Date(viewingFuncao.created_at).toLocaleString('pt-BR')
                      : '—'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                  Nome da Função
                </span>
                <p className="text-sm font-semibold text-slate-900 bg-white p-2.5 rounded-md border border-slate-200">
                  {viewingFuncao.nome}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    Cargos que Podem Exercer ({viewingFuncao.cargos_vinculados?.length || 0})
                  </span>
                </div>

                {!viewingFuncao.cargos_vinculados ||
                viewingFuncao.cargos_vinculados.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-md border border-dashed">
                    Nenhum cargo vinculado a esta função.
                  </div>
                ) : (
                  <div className="max-h-[260px] overflow-y-auto border rounded-md divide-y divide-slate-100 bg-white">
                    {viewingFuncao.cargos_vinculados.map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="font-medium text-slate-800">{c.nome}</span>
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                          {c.codigo}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 flex sm:justify-between items-center">
            {viewingFuncao && canEditFuncoes && (
              <Button
                type="button"
                size="sm"
                className="gap-1.5 text-xs bg-[#0B2545] hover:bg-[#133A68] text-white"
                onClick={() => {
                  setOpenViewDialog(false)
                  handleOpenEditFuncao(viewingFuncao)
                }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar Função
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setOpenViewDialog(false)}
              className="text-xs bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: CRIAÇÃO RÁPIDA DE CARGO INLINE */}
      <Dialog open={openNovoCargoDialog} onOpenChange={setOpenNovoCargoDialog}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Novo Cargo
            </DialogTitle>
            <DialogDescription>
              Cadastre um novo cargo de apoio. Ele será salvo na base e marcado automaticamente no
              checklist desta função.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNovoCargoInline} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="inline-cargo-codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador do Sistema (Automático)
              </Label>
              <Input
                id="inline-cargo-codigo"
                value="Gerado automaticamente ao salvar (ex: CAR-0001)"
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inline-cargo-nome" className="text-xs font-semibold text-slate-700">
                Nome do Cargo *
              </Label>
              <Input
                id="inline-cargo-nome"
                placeholder="Ex: Professor de Matemática, Orientador Educacional..."
                value={novoCargoNome}
                onChange={(e) => setNovoCargoNome(e.target.value)}
                autoFocus
                required
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                onClick={() => setOpenNovoCargoDialog(false)}
                disabled={salvandoCargo}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoCargo}
                className="bg-[#0B2545] hover:bg-[#133A68] text-white"
              >
                {salvandoCargo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cadastrar Cargo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: EXCLUSÃO DE FUNÇÃO */}
      <AlertDialog
        open={!!deletingFuncao}
        onOpenChange={(open) => !open && setDeletingFuncao(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Excluir Função?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente a função{' '}
              <strong className="text-slate-900">"{deletingFuncao?.nome}"</strong> (
              {deletingFuncao?.codigo}) e todos os seus vínculos com cargos. O histórico desta
              exclusão será registrado na Auditoria.
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
              onClick={handleDeleteFuncaoConfirm}
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
