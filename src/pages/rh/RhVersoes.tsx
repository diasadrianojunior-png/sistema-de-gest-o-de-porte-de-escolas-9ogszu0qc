import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  getRhVersoes,
  createRhVersao,
  publicarRhVersao,
  duplicarRhVersao,
} from '@/services/rh-configuracoes'
import { RhVersaoConfiguracao, StatusVersaoRH } from '@/types/gestao-escolar'
import { GitBranch, Plus, Copy, CheckCircle2, Archive, Loader2, Sparkles } from 'lucide-react'

export default function RhVersoesPage() {
  const { canEdit } = useAuth()
  const podeEditar = canEdit('rh_versoes')
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [versoes, setVersoes] = useState<RhVersaoConfiguracao[]>([])

  // Modal Criação
  const [modalCriarOpen, setModalCriarOpen] = useState(false)
  const [novoAno, setNovoAno] = useState<number>(2026)
  const [novaDescricao, setNovaDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Modal Duplicação
  const [modalDuplicarOpen, setModalDuplicarOpen] = useState(false)
  const [versaoOrigem, setVersaoOrigem] = useState<RhVersaoConfiguracao | null>(null)
  const [duplicarAno, setDuplicarAno] = useState<number>(2027)
  const [duplicarDescricao, setDuplicarDescricao] = useState('')

  const carregarVersoes = async () => {
    try {
      setLoading(true)
      const data = await getRhVersoes()
      setVersoes(data)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar versões',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarVersoes()
  }, [])

  const handleCriarVersao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaDescricao.trim()) {
      toast({ variant: 'destructive', title: 'Informe a descrição da versão' })
      return
    }

    try {
      setSalvando(true)
      await createRhVersao({
        ano_letivo: novoAno,
        descricao: novaDescricao.trim(),
        status: 'RASCUNHO',
      })
      toast({
        title: 'Versão criada',
        description: 'Nova versão de configuração cadastrada com sucesso como RASCUNHO.',
      })
      setModalCriarOpen(false)
      setNovaDescricao('')
      carregarVersoes()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar versão',
        description: err.message,
      })
    } finally {
      setSalvando(false)
    }
  }

  const handlePublicar = async (versao: RhVersaoConfiguracao) => {
    if (
      !confirm(
        `Deseja publicar a versão "${versao.descricao}" como VIGENTE para o ano ${versao.ano_letivo}? Todas as faixas e contiguidades serão validadas.`,
      )
    ) {
      return
    }

    try {
      setLoading(true)
      await publicarRhVersao(versao.id)
      toast({
        title: 'Versão publicada',
        description: `A versão ${versao.codigo || ''} agora é a VIGENTE para ${versao.ano_letivo}.`,
      })
      carregarVersoes()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na publicação',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAbrirDuplicar = (versao: RhVersaoConfiguracao) => {
    setVersaoOrigem(versao)
    setDuplicarAno(versao.ano_letivo + 1)
    setDuplicarDescricao(`Cópia de ${versao.descricao} (${versao.ano_letivo + 1})`)
    setModalDuplicarOpen(true)
  }

  const handleDuplicar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!versaoOrigem) return
    if (!duplicarDescricao.trim()) {
      toast({ variant: 'destructive', title: 'Informe a descrição da nova versão' })
      return
    }

    try {
      setSalvando(true)
      await duplicarRhVersao(versaoOrigem.id, duplicarAno, duplicarDescricao.trim())
      toast({
        title: 'Versão duplicada',
        description: 'Todos os tipos, níveis, regras e matrizes foram duplicados com sucesso.',
      })
      setModalDuplicarOpen(false)
      carregarVersoes()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao duplicar versão',
        description: err.message,
      })
    } finally {
      setSalvando(false)
    }
  }

  const getStatusBadge = (status: StatusVersaoRH) => {
    switch (status) {
      case 'VIGENTE':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            VIGENTE
          </Badge>
        )
      case 'RASCUNHO':
        return (
          <Badge
            variant="outline"
            className="border-amber-500 text-amber-700 bg-amber-50 gap-1 font-semibold"
          >
            <GitBranch className="w-3.5 h-3.5" />
            RASCUNHO
          </Badge>
        )
      case 'ARQUIVADA':
        return (
          <Badge variant="secondary" className="text-slate-600 bg-slate-100 gap-1 font-semibold">
            <Archive className="w-3.5 h-3.5" />
            ARQUIVADA
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-blue-600" />
            Versões de Configuração de RH
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Nenhuma regra ou faixa fica fixa no código. Tudo é versionado por ano letivo e editável.
          </p>
        </div>

        {podeEditar && (
          <Button
            onClick={() => setModalCriarOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Versão
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Versões Cadastradas</span>
            <Badge variant="outline">{versoes.length} versão(ões)</Badge>
          </CardTitle>
          <CardDescription>
            Apenas UMA versão pode estar VIGENTE por ano letivo. Versões em rascunho permitem
            ajustes livres antes da publicação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Carregando versões de configuração...</span>
            </div>
          ) : versoes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Nenhuma versão encontrada. Crie uma nova versão para começar.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Código</TableHead>
                    <TableHead className="w-24">Ano</TableHead>
                    <TableHead>Descrição da Portaria/Versão</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-36">Criado Por</TableHead>
                    <TableHead className="text-right w-56">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versoes.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono font-medium text-xs">{v.codigo}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{v.ano_letivo}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{v.descricao}</div>
                        <div className="text-xs text-slate-400">
                          Criada em:{' '}
                          {v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '-'}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(v.status)}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {v.criado_por || 'Sistema'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {podeEditar && v.status === 'RASCUNHO' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePublicar(v)}
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs h-8 gap-1"
                              title="Valida regras e faixas e publica como vigente"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Publicar
                            </Button>
                          )}
                          {podeEditar && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAbrirDuplicar(v)}
                              className="text-slate-600 hover:text-slate-900 text-xs h-8 gap-1"
                              title="Duplicar versão com todas as regras, níveis e matrizes"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Duplicar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Criar Nova Versão */}
      <Dialog open={modalCriarOpen} onOpenChange={setModalCriarOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCriarVersao}>
            <DialogHeader>
              <DialogTitle>Nova Versão de Configuração</DialogTitle>
              <DialogDescription>
                Crie um novo rascunho de portaria ou parametrização de recursos humanos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="novo-ano">Ano Letivo</Label>
                <Input
                  id="novo-ano"
                  type="number"
                  min={2020}
                  max={2040}
                  value={novoAno}
                  onChange={(e) => setNovoAno(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nova-desc">Descrição / Nome da Portaria</Label>
                <Input
                  id="nova-desc"
                  placeholder="Ex: Portaria Preliminar de Porte e Lotação 2026"
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalCriarOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar Versão
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Duplicar Versão */}
      <Dialog open={modalDuplicarOpen} onOpenChange={setModalDuplicarOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleDuplicar}>
            <DialogHeader>
              <DialogTitle>Duplicar Versão</DialogTitle>
              <DialogDescription>
                Clona integralmente a matriz de cargos x funções, tipos de atendimento, níveis e
                regras para uma nova versão em rascunho.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="text-xs bg-blue-50 text-blue-800 p-3 rounded-md">
                Origem: <strong>{versaoOrigem?.codigo}</strong> ({versaoOrigem?.descricao} -{' '}
                {versaoOrigem?.ano_letivo})
              </div>

              <div className="space-y-2">
                <Label htmlFor="dup-ano">Novo Ano Letivo</Label>
                <Input
                  id="dup-ano"
                  type="number"
                  min={2020}
                  max={2040}
                  value={duplicarAno}
                  onChange={(e) => setDuplicarAno(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dup-desc">Descrição da Nova Versão</Label>
                <Input
                  id="dup-desc"
                  value={duplicarDescricao}
                  onChange={(e) => setDuplicarDescricao(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalDuplicarOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Duplicar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
