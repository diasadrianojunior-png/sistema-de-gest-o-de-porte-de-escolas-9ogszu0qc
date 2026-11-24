import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BotaoAjudaModulo } from '@/components/BotaoAjudaModulo'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import type { Especializacao } from '@/types/gestao-escolar'
import {
  CLASSIFICACOES_ESPECIALIDADE,
  ClassificacaoEspecialidade,
  contarReferenciasEspecializacao,
  deleteEspecializacao,
  getEspecializacoes,
  salvarEspecializacao,
} from '@/services/especializacoes'

const CORES_BADGE_CLASSIFICACAO: Record<string, string> = {
  Graduação: 'bg-blue-100 text-blue-800 border-blue-200',
  'Pós-Graduação': 'bg-purple-100 text-purple-800 border-purple-200',
  Mestrado: 'bg-green-100 text-green-800 border-green-200',
  Doutorado: 'bg-orange-100 text-orange-800 border-orange-200',
  'Pós-Doutorado': 'bg-rose-100 text-rose-800 border-rose-200',
}

interface FormularioEspecializacao {
  id?: string
  nome: string
  classificacoes: string[]
}

const FORMULARIO_VAZIO: FormularioEspecializacao = { nome: '', classificacoes: [] }

export default function Especializacoes() {
  const { toast } = useToast()
  const { isAdmin, canEdit } = useAuth()
  const podeEditar = isAdmin || canEdit('especializacoes')

  const [especializacoes, setEspecializacoes] = useState<Especializacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroClassificacao, setFiltroClassificacao] = useState<string>('TODAS')
  const [dialogoAberto, setDialogoAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [formulario, setFormulario] = useState<FormularioEspecializacao>(FORMULARIO_VAZIO)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [exclusaoPendente, setExclusaoPendente] = useState<Especializacao | null>(null)
  const [infoExclusao, setInfoExclusao] = useState<{ id: string; referencias: number } | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  const carregar = async () => {
    setCarregando(true)
    try {
      const dados = await getEspecializacoes()
      setEspecializacoes(dados)
    } catch (e: any) {
      toast({
        title: 'Erro ao carregar especializações',
        description: e?.message ?? 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  const listaFiltrada = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase()
    return especializacoes.filter((esp) => {
      const casaTexto =
        texto === '' ||
        esp.nome.toLowerCase().includes(texto) ||
        (esp.codigo ?? '').toLowerCase().includes(texto)
      const casaClassificacao =
        filtroClassificacao === 'TODAS' || (esp.classificacoes ?? []).includes(filtroClassificacao)
      return casaTexto && casaClassificacao
    })
  }, [especializacoes, filtroTexto, filtroClassificacao])

  const abrirCriacao = () => {
    setFormulario(FORMULARIO_VAZIO)
    setErroFormulario(null)
    setDialogoAberto(true)
  }

  const abrirEdicao = (esp: Especializacao) => {
    setFormulario({ id: esp.id, nome: esp.nome, classificacoes: [...(esp.classificacoes ?? [])] })
    setErroFormulario(null)
    setDialogoAberto(true)
  }

  const alternarClassificacao = (classificacao: string) => {
    setErroFormulario(null)
    setFormulario((atual) => ({
      ...atual,
      classificacoes: atual.classificacoes.includes(classificacao)
        ? atual.classificacoes.filter((c) => c !== classificacao)
        : [...atual.classificacoes, classificacao],
    }))
  }

  const salvar = async () => {
    setErroFormulario(null)
    if (!formulario.nome || formulario.nome.trim() === '') {
      setErroFormulario('Informe o Nome da Especialidade.')
      return
    }
    if (formulario.classificacoes.length === 0) {
      setErroFormulario('Selecione pelo menos uma Classificação da Especialidade.')
      return
    }
    setSalvando(true)
    try {
      await salvarEspecializacao({
        id: formulario.id,
        nome: formulario.nome,
        classificacoes: formulario.classificacoes,
      })
      toast({
        title: formulario.id ? 'Especialização atualizada' : 'Especialização criada',
        description: formulario.id
          ? 'As alterações foram registradas na Auditoria.'
          : 'O identificador ESP-XXXX foi gerado automaticamente.',
      })
      setDialogoAberto(false)
      setFormulario(FORMULARIO_VAZIO)
      await carregar()
    } catch (e: any) {
      setErroFormulario(e?.message ?? 'Não foi possível salvar a especialização.')
    } finally {
      setSalvando(false)
    }
  }

  const pedirExclusao = async (esp: Especializacao) => {
    try {
      const referencias = await contarReferenciasEspecializacao(esp.id)
      setInfoExclusao({ id: esp.id, referencias })
    } catch {
      setInfoExclusao({ id: esp.id, referencias: 0 })
    }
    setExclusaoPendente(esp)
  }

  const confirmarExclusao = async () => {
    if (!exclusaoPendente) return
    setExcluindo(true)
    try {
      await deleteEspecializacao(exclusaoPendente.id)
      toast({
        title: 'Especialização excluída',
        description: 'A exclusão foi registrada na Auditoria.',
      })
      setExclusaoPendente(null)
      setInfoExclusao(null)
      await carregar()
    } catch (e: any) {
      toast({
        title: 'Não foi possível excluir',
        description: e?.message ?? 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Especializações</h1>
          <p className="text-sm text-slate-600">
            Cadastro das especialidades que podem ser vinculadas aos profissionais. Uma mesma
            especialidade pode ter várias classificações ao mesmo tempo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotaoAjudaModulo menuKey="especializacoes" />
          {podeEditar && <Button onClick={abrirCriacao}>+ Nova Especialização</Button>}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="filtro-texto">Buscar por nome ou identificador</Label>
              <Input
                id="filtro-texto"
                placeholder="Ex.: Educação Física ou ESP-0001"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filtro-classificacao">Classificação da Especialidade</Label>
              <select
                id="filtro-classificacao"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={filtroClassificacao}
                onChange={(e) => setFiltroClassificacao(e.target.value)}
              >
                <option value="TODAS">Todas as classificações</option>
                {CLASSIFICACOES_ESPECIALIDADE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {filtroClassificacao !== 'TODAS' && (
                <p className="text-xs text-slate-500">
                  Mostra especialidades que contêm "{filtroClassificacao}" entre as suas
                  classificações.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Especializações ({listaFiltrada.length}
            {listaFiltrada.length !== especializacoes.length && ` de ${especializacoes.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : listaFiltrada.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma especialização encontrada.</p>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Identificador</TableHead>
                    <TableHead>Nome da Especialidade</TableHead>
                    <TableHead>Classificação da Especialidade</TableHead>
                    {podeEditar && <TableHead className="w-40 text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaFiltrada.map((esp) => (
                    <TableRow key={esp.id}>
                      <TableCell className="font-mono text-xs">{esp.codigo ?? '—'}</TableCell>
                      <TableCell className="font-medium">{esp.nome}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(esp.classificacoes ?? []).map((c) => (
                            <Badge
                              key={c}
                              variant="outline"
                              className={cn(
                                CORES_BADGE_CLASSIFICACAO[c] ??
                                  'bg-slate-100 text-slate-800 border-slate-200',
                              )}
                            >
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      {podeEditar && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => abrirEdicao(esp)}>
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => pedirExclusao(esp)}
                            >
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogoAberto} onOpenChange={setDialogoAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formulario.id ? 'Editar Especialização' : 'Nova Especialização'}
            </DialogTitle>
            <DialogDescription>
              Uma mesma especialidade pode ter várias classificações ao mesmo tempo. Marque todas as
              que se aplicam (pelo menos uma).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="esp-nome">Nome da Especialidade *</Label>
              <Input
                id="esp-nome"
                placeholder="Ex.: Educação Física"
                value={formulario.nome}
                onChange={(e) => {
                  setErroFormulario(null)
                  setFormulario((atual) => ({ ...atual, nome: e.target.value }))
                }}
              />
              <p className="text-xs text-slate-500">
                Obrigatório e único — não pode repetir o nome de outra especialidade.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Classificação da Especialidade *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3">
                {CLASSIFICACOES_ESPECIALIDADE.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={formulario.classificacoes.includes(c)}
                      onCheckedChange={() => alternarClassificacao(c)}
                      disabled={!podeEditar}
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Selecione uma ou mais classificações. Ex.: Graduação + Pós-Graduação.
              </p>
            </div>
            {erroFormulario && (
              <p className="text-sm text-red-600" role="alert">
                {erroFormulario}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!exclusaoPendente}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setExclusaoPendente(null)
            setInfoExclusao(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Especialização</DialogTitle>
            <DialogDescription>
              Confirme a exclusão de {exclusaoPendente?.codigo ?? ''} —{' '}
              {exclusaoPendente?.nome ?? ''}.
            </DialogDescription>
          </DialogHeader>
          {infoExclusao && infoExclusao.referencias > 0 && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              Esta especialização está vinculada a {infoExclusao.referencias} profissional(is) no
              Cadastro de Profissionais. A exclusão será bloqueada até que o vínculo seja removido.
            </p>
          )}
          {infoExclusao && infoExclusao.referencias === 0 && (
            <p className="text-sm text-slate-600">Esta ação não pode ser desfeita.</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExclusaoPendente(null)
                setInfoExclusao(null)
              }}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarExclusao} disabled={excluindo}>
              {excluindo ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
