import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Edit2, Trash2, Loader2, Search, Briefcase } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { getCargos, createCargo, updateCargo, deleteCargo } from '@/services/apoio'
import { Cargo } from '@/types/gestao-escolar'

export default function Cargos() {
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [searchCargo, setSearchCargo] = useState('')
  const [loadingCargos, setLoadingCargos] = useState(true)
  const [openCargoDialog, setOpenCargoDialog] = useState(false)
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null)
  const [cargoForm, setCargoForm] = useState({ nome: '' })
  const [deletingCargo, setDeletingCargo] = useState<Cargo | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchCargos = async () => {
    try {
      setLoadingCargos(true)
      const data = await getCargos()
      setCargos(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar cargos',
        description: err.message || 'Falha ao buscar dados no banco.',
        variant: 'destructive',
      })
    } finally {
      setLoadingCargos(false)
    }
  }

  useEffect(() => {
    fetchCargos()
  }, [])

  const handleOpenCreateCargo = () => {
    setEditingCargo(null)
    setCargoForm({ nome: '' })
    setOpenCargoDialog(true)
  }

  const handleOpenEditCargo = (c: Cargo) => {
    setEditingCargo(c)
    setCargoForm({ nome: c.nome })
    setOpenCargoDialog(true)
  }

  const handleSaveCargo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cargoForm.nome.trim()) {
      toast({
        title: 'Atenção',
        description: 'Informe o nome do cargo.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      if (editingCargo) {
        await updateCargo(editingCargo.id, cargoForm)
        toast({ title: 'Sucesso', description: 'Cargo atualizado com sucesso!' })
      } else {
        await createCargo(cargoForm)
        toast({ title: 'Sucesso', description: 'Cargo cadastrado com sucesso!' })
      }
      setOpenCargoDialog(false)
      await fetchCargos()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar o cargo.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCargoConfirm = async () => {
    if (!deletingCargo) return
    try {
      setSaving(true)
      await deleteCargo(deletingCargo.id)
      toast({ title: 'Removido', description: 'Cargo excluído com sucesso.' })
      setDeletingCargo(null)
      await fetchCargos()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Não foi possível excluir o cargo.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredCargos = cargos.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchCargo.toLowerCase()) ||
      (c.codigo && c.codigo.toLowerCase().includes(searchCargo.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
          <span>Cadastros de Apoio</span>
          <span>&rsaquo;</span>
          <span>Cargos</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Cadastro de Cargos
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Gerenciamento e manutenção dos cargos do sistema de gestão escolar
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-lg">Cargos Cadastrados</CardTitle>
            <CardDescription>
              Total de {cargos.length} cargo(s) cadastrado(s) na tabela de apoio
            </CardDescription>
          </div>
          <Button
            onClick={handleOpenCreateCargo}
            className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
          >
            <Plus className="w-4 h-4" />
            Novo Cargo
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por código (CAR-XXXX), nome do cargo..."
              value={searchCargo}
              onChange={(e) => setSearchCargo(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {loadingCargos ? (
            <div className="py-12 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Carregando cargos...
            </div>
          ) : filteredCargos.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed">
              Nenhum cargo encontrado.{' '}
              {searchCargo
                ? 'Tente outro termo na pesquisa.'
                : 'Clique em "Novo Cargo" para cadastrar.'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b">
                  <tr>
                    <th className="py-3 px-4 font-medium w-28">Código</th>
                    <th className="py-3 px-4 font-medium">Nome do Cargo</th>
                    <th className="py-3 px-4 font-medium text-right w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCargos.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {c.codigo || 'CAR-0000'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{c.nome}</td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <Button
                          size="icon"
                          className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                          onClick={() => handleOpenEditCargo(c)}
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="h-8 w-8 bg-[#0B2545] hover:bg-[#133A68] text-white"
                          onClick={() => setDeletingCargo(c)}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO: CARGO (CRIAR/EDITAR) */}
      <Dialog open={openCargoDialog} onOpenChange={setOpenCargoDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingCargo ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para salvar o cargo de apoio.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCargo} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label
                htmlFor="c-codigo"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Identificador do Sistema (Automático)
              </Label>
              <Input
                id="c-codigo"
                value={
                  editingCargo
                    ? editingCargo.codigo || 'CAR-XXXX'
                    : 'Gerado automaticamente ao salvar (ex: CAR-0001)'
                }
                disabled
                className="bg-slate-100 font-mono text-xs text-slate-600 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-nome">Nome do Cargo *</Label>
              <Input
                id="c-nome"
                placeholder="Ex: Professor de Educação Física"
                value={cargoForm.nome}
                onChange={(e) => setCargoForm({ ...cargoForm, nome: e.target.value })}
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                onClick={() => setOpenCargoDialog(false)}
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
                {editingCargo ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: EXCLUSÃO DE CARGO */}
      <AlertDialog open={!!deletingCargo} onOpenChange={(open) => !open && setDeletingCargo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cargo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o cargo{' '}
              <strong className="text-slate-900">"{deletingCargo?.nome}"</strong> da base de dados.
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
              onClick={handleDeleteCargoConfirm}
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
