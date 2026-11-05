import { useMemo, useState } from 'react'
import { BookOpen, ChevronRight, Printer, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { BotaoAjudaModulo } from '@/components/BotaoAjudaModulo'
import { getAjudasPorCategoria } from '@/services/ajuda'
import {
  ESCOPO_MODULO,
  ESCOPO_TODOS,
  EscopoImpressao,
  rotuloEscopoImpressao,
  registrarAuditoriaImpressaoAjuda,
} from '@/services/impressao-ajuda'

function CentralAjudaConteudo() {
  const [busca, setBusca] = useState('')
  const [moduloSelecionado, setModuloSelecionado] = useState<string | null>(null)
  const [dialogImpressaoAberto, setDialogImpressaoAberto] = useState(false)
  const [escopoImpressao, setEscopoImpressao] = useState<EscopoImpressao>(ESCOPO_TODOS)
  const [imprimindo, setImprimindo] = useState(false)
  const grupos = useMemo(() => getAjudasPorCategoria(), [])

  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return grupos
    return grupos
      .map((grupo) => ({
        ...grupo,
        modulos: grupo.modulos.filter(
          (m) =>
            m.titulo.toLowerCase().includes(termo) ||
            m.resumo.toLowerCase().includes(termo) ||
            m.secoes.some(
              (s) =>
                s.titulo.toLowerCase().includes(termo) ||
                s.itens.some((i) => i.toLowerCase().includes(termo)),
            ),
        ),
      }))
      .filter((grupo) => grupo.modulos.length > 0)
  }, [busca, grupos])

  const totalModulos = gruposFiltrados.reduce((acc, g) => acc + g.modulos.length, 0)

  // Título do módulo atualmente em foco (visível/selecionado), para o escopo "Apenas este módulo"
  const tituloModuloAtual = useMemo(() => {
    if (moduloSelecionado) return moduloSelecionado
    const el = document.querySelector('[data-titulo-ajuda]') as HTMLElement | null
    return el?.dataset.tituloAjuda || null
  }, [moduloSelecionado])

  const abrirDialogImpressao = () => {
    // Sem seleção explícita, o escopo inicial é "todos os módulos"
    setEscopoImpressao(tituloModuloAtual ? ESCOPO_MODULO : ESCOPO_TODOS)
    setDialogImpressaoAberto(true)
  }

  const handleImprimir = async () => {
    setImprimindo(true)
    try {
      await registrarAuditoriaImpressaoAjuda(escopoImpressao, tituloModuloAtual)
    } finally {
      // Aguarda a auditoria ser registrada antes de abrir a janela de impressão,
      // para evitar que o navegador cancele a requisição ao abrir o diálogo.
      window.setTimeout(() => {
        window.print()
        setImprimindo(false)
        setDialogImpressaoAberto(false)
      }, 300)
    }
  }

  const rolarPara = (menuKey: string, titulo: string) => {
    setModuloSelecionado(titulo)
    const el = document.getElementById(`ajuda-${menuKey}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Central de Ajuda</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Ajuda e Regras de todos os módulos do sistema, organizadas pelos grupos do Menu Principal.
          O mesmo conteúdo está disponível no botão "Ajuda e Regras" de cada tela.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por módulo, regra ou palavra-chave..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="secondary">
          {totalModulos} {totalModulos === 1 ? 'módulo' : 'módulos'}
        </Badge>
        <div className="flex items-center gap-2 self-start md:ml-auto md:self-auto">
          <Button variant="outline" size="sm" className="gap-2" onClick={abrirDialogImpressao}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <BotaoAjudaModulo menuKey="central_ajuda" />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-64 lg:shrink-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Índice de módulos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {gruposFiltrados.map((grupo) => (
                <div key={grupo.categoria} className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {grupo.categoria}
                  </p>
                  {grupo.modulos.map((m) => (
                    <Button
                      key={m.menuKey}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-1 font-normal"
                      onClick={() => rolarPara(m.menuKey, m.titulo)}
                    >
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{m.titulo}</span>
                    </Button>
                  ))}
                </div>
              ))}
              {totalModulos === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma ajuda encontrada.</p>
              )}
            </CardContent>
          </Card>
        </aside>

        <div className="min-w-0 flex-1 space-y-8">
          {gruposFiltrados.map((grupo) => (
            <section key={grupo.categoria} className="space-y-3">
              <h2 className="text-lg font-semibold border-b pb-1">{grupo.categoria}</h2>
              {grupo.modulos.map((m) => (
                <Card
                  key={m.menuKey}
                  id={`ajuda-${m.menuKey}`}
                  className="scroll-mt-20"
                  data-titulo-ajuda={m.titulo}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{m.titulo}</CardTitle>
                    <CardDescription>{m.resumo}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {m.secoes.map((secao) => (
                      <div key={secao.titulo} className="space-y-1">
                        <h4 className="text-sm font-semibold">{secao.titulo}</h4>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {secao.itens.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </section>
          ))}
          {totalModulos === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma ajuda encontrada para "{busca}". Tente outro termo.
            </p>
          )}
        </div>
      </div>

      {/* Diálogo de impressão: escolha do escopo antes de acionar a impressão */}
      <Dialog open={dialogImpressaoAberto} onOpenChange={setDialogImpressaoAberto}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Imprimir Central de Ajuda
            </DialogTitle>
            <DialogDescription>
              Escolha o escopo da impressão. A janela de impressão do navegador será aberta em
              seguida.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={escopoImpressao}
            onValueChange={(val) => setEscopoImpressao(val as EscopoImpressao)}
            className="space-y-3 py-2"
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value={ESCOPO_TODOS} id="escopo-todos" />
              <div className="space-y-0.5">
                <Label htmlFor="escopo-todos" className="font-medium">
                  Todos os módulos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Imprime a Central de Ajuda completa ({totalModulos} módulos).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RadioGroupItem
                value={ESCOPO_MODULO}
                id="escopo-modulo"
                disabled={!tituloModuloAtual}
              />
              <div className="space-y-0.5">
                <Label htmlFor="escopo-modulo" className="font-medium">
                  Apenas este módulo
                </Label>
                <p className="text-xs text-muted-foreground">
                  {tituloModuloAtual
                    ? `Imprime somente a ajuda do módulo "${tituloModuloAtual}" (último módulo visitado na tela).`
                    : 'Desabilitado: nenhum módulo específico está selecionado. Use o índice lateral para escolher um módulo primeiro.'}
                </p>
              </div>
            </div>
          </RadioGroup>

          <div className="text-xs text-muted-foreground border-t pt-2">
            Escopo selecionado: {rotuloEscopoImpressao(escopoImpressao, tituloModuloAtual)}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogImpressaoAberto(false)}
              disabled={imprimindo}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleImprimir}
              disabled={imprimindo || (escopoImpressao === ESCOPO_MODULO && !tituloModuloAtual)}
              className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              <Printer className="h-4 w-4" />
              {imprimindo ? 'Preparando impressão...' : 'Imprimir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CentralAjuda() {
  return <CentralAjudaConteudo />
}
