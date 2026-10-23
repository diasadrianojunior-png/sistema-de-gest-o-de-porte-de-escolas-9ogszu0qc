import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getCargos, getFuncoes } from '@/services/apoio'
import {
  getRhVersoes,
  getRhMatrizCargoFuncao,
  salvarRhVinculoCargoFuncao,
} from '@/services/rh-configuracoes'
import {
  Cargo,
  Funcao,
  RhVersaoConfiguracao,
  RhCargoFuncao,
  CondicaoCargoFuncao,
} from '@/types/gestao-escolar'
import { TableProperties, Loader2, Check, ShieldAlert, FileText, Settings2 } from 'lucide-react'

export default function RhMatrizPage() {
  const { canEdit } = useAuth()
  const podeEditar = canEdit('rh_matriz')
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [versoes, setVersoes] = useState<RhVersaoConfiguracao[]>([])
  const [versaoSelecionadaId, setVersaoSelecionadaId] = useState<string>('')

  const [cargos, setCargos] = useState<Cargo[]>([])
  const [funcoes, setFuncoes] = useState<Funcao[]>([])
  const [matriz, setMatriz] = useState<RhCargoFuncao[]>([])

  // Modal para editar condição do vínculo
  const [modalCondicaoOpen, setModalCondicaoOpen] = useState(false)
  const [vinculoEditando, setVinculoEditando] = useState<{
    cargo: Cargo
    funcao: Funcao
    condicaoAtual: CondicaoCargoFuncao
  } | null>(null)
  const [novaCondicao, setNovaCondicao] = useState<CondicaoCargoFuncao>('NENHUMA')

  const carregarInicial = async () => {
    try {
      setLoading(true)
      const [listaVersoes, listaCargos, listaFuncoes] = await Promise.all([
        getRhVersoes(),
        getCargos(),
        getFuncoes(),
      ])
      setVersoes(listaVersoes)
      setCargos(listaCargos)
      setFuncoes(listaFuncoes)

      // Seleciona a vigente ou a primeira rascunho
      if (listaVersoes.length > 0) {
        const vig = listaVersoes.find((v) => v.status === 'VIGENTE') || listaVersoes[0]
        setVersaoSelecionadaId(vig.id)
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const carregarMatriz = async (versaoId: string) => {
    if (!versaoId) return
    try {
      setSalvando(true)
      const data = await getRhMatrizCargoFuncao(versaoId)
      setMatriz(data)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar matriz',
        description: err.message,
      })
    } finally {
      setSalvando(false)
    }
  }

  useEffect(() => {
    carregarInicial()
  }, [])

  useEffect(() => {
    if (versaoSelecionadaId) {
      carregarMatriz(versaoSelecionadaId)
    }
  }, [versaoSelecionadaId])

  const versaoAtual = versoes.find((v) => v.id === versaoSelecionadaId)
  const versaoBloqueada = versaoAtual?.status === 'ARQUIVADA'

  // Mapa de acesso rápido aos vínculos: cargoId_funcaoId -> RhCargoFuncao
  const mapaVinculos = new Map<string, RhCargoFuncao>()
  for (const m of matriz) {
    mapaVinculos.set(`${m.cargo_id}_${m.funcao_id}`, m)
  }

  const handleToggleVinculo = async (cargo: Cargo, funcao: Funcao) => {
    if (!podeEditar || versaoBloqueada) return
    const chave = `${cargo.id}_${funcao.id}`
    const existente = mapaVinculos.get(chave)

    try {
      if (existente) {
        // Desabilitar
        await salvarRhVinculoCargoFuncao(versaoSelecionadaId, cargo.id, funcao.id, false)
        toast({ title: 'Vínculo removido' })
      } else {
        // Habilitar com NENHUMA condição por padrão
        await salvarRhVinculoCargoFuncao(versaoSelecionadaId, cargo.id, funcao.id, true, 'NENHUMA')
        toast({ title: 'Vínculo habilitado' })
      }
      await carregarMatriz(versaoSelecionadaId)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar vínculo',
        description: err.message,
      })
    }
  }

  const handleAbrirCondicao = (cargo: Cargo, funcao: Funcao, e: React.MouseEvent) => {
    e.stopPropagation()
    const chave = `${cargo.id}_${funcao.id}`
    const existente = mapaVinculos.get(chave)
    if (!existente) return

    setVinculoEditando({
      cargo,
      funcao,
      condicaoAtual: existente.condicao,
    })
    setNovaCondicao(existente.condicao)
    setModalCondicaoOpen(true)
  }

  const handleSalvarCondicao = async () => {
    if (!vinculoEditando) return
    try {
      setSalvando(true)
      await salvarRhVinculoCargoFuncao(
        versaoSelecionadaId,
        vinculoEditando.cargo.id,
        vinculoEditando.funcao.id,
        true,
        novaCondicao,
      )
      toast({ title: 'Condição atualizada com sucesso' })
      setModalCondicaoOpen(false)
      await carregarMatriz(versaoSelecionadaId)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar condição',
        description: err.message,
      })
    } finally {
      setSalvando(false)
    }
  }

  const renderBadgeCondicao = (condicao: CondicaoCargoFuncao) => {
    switch (condicao) {
      case 'READAPTADO_COMPATIVEL_LAUDO':
        return (
          <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 block text-center mt-1">
            Readaptado (Laudo)
          </span>
        )
      case 'AUTORIZACAO_SEMED':
        return (
          <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 block text-center mt-1">
            Aut. SEMED
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <TableProperties className="w-6 h-6 text-blue-600" />
            Matriz de Elegibilidade: Cargo × Função
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Define quais cargos são legalmente elegíveis a ocupar cada função do quadro escolar e
            suas condições.
          </p>
        </div>

        {/* Seleção de Versão */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500 font-medium">Versão:</Label>
          <Select value={versaoSelecionadaId} onValueChange={setVersaoSelecionadaId}>
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {versoes.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.codigo || 'VER'} - {v.descricao} ({v.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Grade de Habilitação</CardTitle>
              <CardDescription>
                Clique na célula para habilitar/desabilitar. Clique no ícone de engrenagem para
                definir restrição (Ex: Readaptado ou Autorização SEMED).
              </CardDescription>
            </div>
            {versaoAtual && (
              <Badge variant={versaoAtual.status === 'VIGENTE' ? 'default' : 'secondary'}>
                {versaoAtual.status} ({versaoAtual.ano_letivo})
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Carregando matriz...</span>
            </div>
          ) : cargos.length === 0 || funcoes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Cargos ou Funções não encontrados.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                  <tr>
                    <th className="p-3 sticky left-0 bg-slate-100 z-10 border-r min-w-[240px]">
                      Cargo \ Função
                    </th>
                    {funcoes.map((f) => (
                      <th
                        key={f.id}
                        className="p-2 border-r min-w-[120px] max-w-[150px] text-center"
                        title={f.nome}
                      >
                        <div className="truncate font-semibold">{f.nome}</div>
                        {f.exige_autorizacao_semed && (
                          <span className="text-[9px] text-amber-600 block">Exige SEMED</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cargos.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 font-medium text-slate-900 sticky left-0 bg-white border-r z-10 shadow-xs">
                        <div className="font-semibold">{c.nome}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {c.codigo} • {c.natureza || 'EFETIVO'} • {c.carga_horaria || '20h'}
                        </div>
                      </td>
                      {funcoes.map((f) => {
                        const chave = `${c.id}_${f.id}`
                        const vinculo = mapaVinculos.get(chave)
                        const ativo = Boolean(vinculo)

                        return (
                          <td
                            key={f.id}
                            onClick={() => handleToggleVinculo(c, f)}
                            className={`p-2 border-r text-center transition-colors select-none ${
                              ativo
                                ? 'bg-blue-50/70 hover:bg-blue-100/70 cursor-pointer'
                                : 'hover:bg-slate-100/50 cursor-pointer'
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center">
                              <div
                                className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                                  ativo
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'border border-slate-300 bg-white hover:border-slate-400'
                                }`}
                              >
                                {ativo && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>

                              {ativo && renderBadgeCondicao(vinculo.condicao)}

                              {ativo && podeEditar && !versaoBloqueada && (
                                <button
                                  type="button"
                                  onClick={(e) => handleAbrirCondicao(c, f, e)}
                                  className="mt-1 text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200/60"
                                  title="Editar condição"
                                >
                                  <Settings2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Editar Condição */}
      <Dialog open={modalCondicaoOpen} onOpenChange={setModalCondicaoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Condição de Ocupação da Função</DialogTitle>
            <DialogDescription>
              Defina se a ocupação é irrestrita ou condicionada a laudo/autorização especial da
              SEMED.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="text-xs bg-slate-50 p-3 rounded border">
              <div>
                Cargo: <strong>{vinculoEditando?.cargo.nome}</strong>
              </div>
              <div>
                Função: <strong>{vinculoEditando?.funcao.nome}</strong>
              </div>
            </div>

            <RadioGroup
              value={novaCondicao}
              onValueChange={(val: any) => setNovaCondicao(val)}
              className="space-y-2.5"
            >
              <div className="flex items-center space-x-2 border p-2.5 rounded-lg hover:bg-slate-50">
                <RadioGroupItem value="NENHUMA" id="cond-nenhuma" />
                <Label htmlFor="cond-nenhuma" className="cursor-pointer text-xs">
                  <strong>NENHUMA</strong> — Vínculo direto e irrestrito.
                </Label>
              </div>

              <div className="flex items-center space-x-2 border p-2.5 rounded-lg hover:bg-slate-50">
                <RadioGroupItem value="READAPTADO_COMPATIVEL_LAUDO" id="cond-readaptado" />
                <Label htmlFor="cond-readaptado" className="cursor-pointer text-xs">
                  <strong>READAPTADO_COMPATIVEL_LAUDO</strong> — Exclusivo ou compatível com
                  professor readaptado mediante laudo médico.
                </Label>
              </div>

              <div className="flex items-center space-x-2 border p-2.5 rounded-lg hover:bg-slate-50">
                <RadioGroupItem value="AUTORIZACAO_SEMED" id="cond-semed" />
                <Label htmlFor="cond-semed" className="cursor-pointer text-xs">
                  <strong>AUTORIZACAO_SEMED</strong> — Exige portaria ou autorização expressa da
                  SEMED (ex: Agente Educacional II em Suporte de Sala).
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCondicaoOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarCondicao}
              disabled={salvando}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Salvar Condição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
