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
import { Plus, Edit2, Trash2, Loader2, Search, Sparkles } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  getEspecializacoes,
  salvarEspecializacao,
  deleteEspecializacao,
  CLASSIFICACOES_ESPECIALIDADE,
} from '@/services/especializacoes'
import { PaginacaoTabela, ITENS_POR_PAGINA_PADRAO } from '@/components/PaginacaoTabela'
import { Especializacao } from '@/types/gestao-escolar'

export default function Especializacoes() {
  const { isAdmin, canEdit } = useAuth()
  const canEditEspecializacoes = isAdmin || canEdit('especializacoes')
  const [especializacoes, setEspecializacoes] = useState<Especializacao[]>([])
  const [searchEspecializacao, setSearchEspecializacao] = useState('')
  const [filtroClassificacao, setFiltroClassificacao] = useState<string>('TODAS')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [loadingEspecializacoes, setLoadingEspecializacoes] = useState(true)
  const [openEspecializacaoDialog, setOpenEspecializacaoDialog] = useState(false)
  const [editingEspecializacao, setEditingEspecializacao] = useState<Especializacao | null>(null)
  const [especializacaoForm, setEspecializacaoForm] = useState({
    nome: '',
    classificacao: '',
  })
  const [deletingEspecializacao, setDeletingEspecializacao] = useState<Especializacao | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchEspecializacoes = async () => {
    try {
      setLoadingEspecializacoes(true)
      const data = await getEspecializacoes()
      setEspecializacoes(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar especializações',
        description: err.message || 'Falha ao buscar dados no banco.',
        variant: 'destructive',
      })
    } finally {
      setLoadingEspecializacoes(false)
    }
  }

  useEffect(() => {
    fetchEspecializacoes()
  }, [])

  const handleOpenCreateEspecializacao = () => {
    setEditingEspecializacao(null)
    setEspecializacaoForm({ nome: '', classificacao: '' })
    setOpenEspecializacaoDialog(true)
  }

  const handleOpenEditEspecializacao = (e: Especializacao) => {
    setEditingEspecializacao(e)
    setEspecializacaoForm({ nome: e.nome, classificacao: e.classificacao })
    setOpenEspecializacaoDialog(true)
  }

  const handleSaveEspecializacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!especializacaoForm.nome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o Nome da Especialidade.',
        variant: 'destructive',
      })
      return
    }
    if (!especializacaoForm.classificacao) {
      toast({
        title: 'Atenção',
        description: 'Selecione a Classificação da Especialidade.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      if (editingEspecializacao) {
        await salvarEspecializacao({
          id: editingEspecializacao.id,
          ...especializacaoForm,
        })
        toast({ title: 'Sucesso', description: 'Especialização atualizada com sucesso!' })
      } else {
        await salvarEspecializacao(especializacaoForm)
        toast({ title: 'Sucesso', description: 'Especialização cadastrada com sucesso!' })
      }
      setOpenEspecializacaoDialog(false)
      await fetchEspecializacoes()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar a especialização.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEspecializacaoConfirm = async () => {
    if (!deletingEspecializacao) return
    try {
      setSaving(true)
      await deleteEspecializacao(deletingEspecializacao.id)
      toast({ title: 'Removido', description: 'Especialização excluída com sucesso.' })
      setDeletingEspecializacao(null)
      await fetchEspecializacoes()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Não foi possível excluir a especialização.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredEspecializacoes = especializacoes.filter((e) => {
    const busca = searchEspecializacao.toLowerCase()
    const correspondeBusca =
      e.nome.toLowerCase().includes(busca) ||
      (e.codigo && e.codigo.toLowerCase().includes(busca)) ||
      (e.classificacao && e.classificacao.toLowerCase().includes(busca))
    const correspondeClassificacao =
      filtroClassificacao === 'TODAS' || e.classificacao === filtroClassificacao
    return correspondeBusca && correspondeClassificacao
  })

  const especializacoesPaginadas = filteredEspecializacoes.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA_PADRAO,
    paginaAtual * ITENS_POR_PAGINA_PADRAO,
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
          <span>Cadastros de Apoio</span>
          <span>&rsaquo;</span>
          <span>Especializações</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Cadastro de Especializações
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gerenciamento e manutenção das especializações do sistema de gestão escolar
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Especializações Cadastradas</CardTitle>
            <CardDescription>
              Total de {especializacoes.length} especialização(ões) cadastrada(s) na tabela de apoio
            </CardDescription>
          </div>
          {canEditEspecializacoes && (
            <Button
              onClick={handleOpenCreateEspecializacao}
              className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              <Plus className="w-4 h-4" />
              Nova Especialização
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por código (ESP-XXXX), nome ou classificação..."
                value={searchEspecializacao}
                onChange={(e) => {
                  setSearchEspecializacao(e.target.value)
                  setPaginaAtual(1)
                }}
                className="pl-9 text-sm"
              />
            </div>
            <Select
              value={filtroClassificacao}
              onValueChange={(value) => {
                setFiltroClassificacao(value)
                setPaginaAtual(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Classificação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as classificações</SelectItem>
                {CLASSIFICACOES_ESPECIALIDADE.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingEspecializacoes ? (
            <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando
              especializações...
            </div>
          ) : filteredEspecializacoes.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhuma especialização encontrada.{' '}
              {searchEspecializacao || filtroClassificacao !== 'TODAS'
                ? 'Tente outro termo na pesquisa ou remova o filtro.'
                : 'Clique em "Nova Especialização" para cadastrar.'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium w-28">Código</th>
                    <th className="py-3 px-4 font-medium">Nome da Especialidade</th>
                    <th className="py-3 px-4 font-medium w-48">Classificação</th>
                    <th className="py-3 px-4 font-medium text-right w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {especializacoesPaginadas.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {e.codigo || 'ESP-0000'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{e.nome}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {e.classificacao}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {canEditEspecializacoes ? (
                          <>
                            <Button
                              size="icon"
                              className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                              onClick={() => handleOpenEditEspecializacao(e)}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                              onClick={() => setDeletingEspecializacao(e)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Somente leitura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginacaoTabela
                paginaAtual={paginaAtual}
                totalRegistros={filteredEspecializacoes.length}
                itensPorPagina={ITENS_POR_PAGINA_PADRAO}
                onMudarPagina={setPaginaAtual}
                rotuloItens="especializações"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO: ESPECIALIZAÇÃO (CRIAR/EDITAR) */}
      <Dialog open={openEspecializacaoDialog} onOpenChange={setOpenEspecializacaoDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingEspecializacao ? 'Editar Especialização' : 'Nova Especialização'}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para salvar a especialização de apoio.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEspecializacao} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label
                htmlFor="e-codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador do Sistema (Automático)
              </Label>
              <Input
                id="e-codigo"
                value={
                  editingEspecializacao
                    ? editingEspecializacao.codigo || 'ESP-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: ESP-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="e-nome">Nome da Especialidade *</Label>
              <Input
                id="e-nome"
                placeholder="Ex: Inglês, Artes, Educação Física, Educação Especial"
                value={especializacaoForm.nome}
                onChange={(e) =>
                  setEspecializacaoForm({ ...especializacaoForm, nome: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="e-classificacao">Classificação da Especialidade *</Label>
              <Select
                value={especializacaoForm.classificacao}
                onValueChange={(value) =>
                  setEspecializacaoForm({ ...especializacaoForm, classificacao: value })
                }
                required
              >
                <SelectTrigger id="e-classificacao" className="w-full">
                  <SelectValue placeholder="Selecione a classificação" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSIFICACOES_ESPECIALIDADE.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                onClick={() => setOpenEspecializacaoDialog(false)}
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
                {editingEspecializacao ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: EXCLUSÃO DE ESPECIALIZAÇÃO */}
      <AlertDialog
        open={!!deletingEspecializacao}
        onOpenChange={(open) => !open && setDeletingEspecializacao(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Especialização?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a especialização{' '}
              <strong className="text-slate-900">"{deletingEspecializacao?.nome}"</strong> (
              {deletingEspecializacao?.classificacao}) da base de dados.
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
              onClick={handleDeleteEspecializacaoConfirm}
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
