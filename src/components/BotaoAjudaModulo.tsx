import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getAjudaPorMenuKey } from '@/services/ajuda'
import { SistemaMenuKey } from '@/types/gestao-escolar'

interface BotaoAjudaModuloProps {
  menuKey: SistemaMenuKey
  /** Título opcional para sobrepor o título do módulo na janela */
  tituloOverride?: string
}

/**
 * Botão + modal "Ajuda e Regras" padrão do sistema.
 * Lê o conteúdo da fonte única (src/services/ajuda.ts), a mesma usada pela Central de Ajuda.
 */
export function BotaoAjudaModulo({ menuKey, tituloOverride }: BotaoAjudaModuloProps) {
  const [aberto, setAberto] = useState(false)
  const ajuda = getAjudaPorMenuKey(menuKey)
  const titulo = tituloOverride ?? ajuda?.titulo ?? 'Módulo'

  if (!ajuda) return null

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Ajuda e Regras
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <HelpCircle className="h-5 w-5" />
            {titulo} — Ajuda e Regras
          </DialogTitle>
          <DialogDescription className="text-left">{ajuda.resumo}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {ajuda.secoes.map((secao) => (
              <div key={secao.titulo} className="space-y-1.5">
                <h4 className="text-sm font-semibold">{secao.titulo}</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {secao.itens.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Esta ajuda também está disponível na Central de Ajuda, no fim do Menu Principal.
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
