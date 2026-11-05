import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ANOS_LETIVOS } from '@/pages/Etapas'

/** Linha do formulário de inscrição no Processo Seletivo (um registro por Ano Letivo) */
export interface LinhaInscricaoAnoForm {
  idTemp: string
  ano_letivo: number | null
  inscrito: boolean | null
}

interface InscricoesAnoProfissionalSectionProps {
  linhas: LinhaInscricaoAnoForm[]
  onAdicionar: () => void
  onRemover: (idTemp: string) => void
  onAlterar: (idTemp: string, campo: 'ano_letivo' | 'inscrito', valor: string) => void
  disabled?: boolean
}

/**
 * Card "Inscrição no Processo Seletivo": lista repetível de Ano Letivo + Sim/Não.
 * Opcional — salvar sem linhas é permitido. Anos já usados em outra linha não aparecem no combobox.
 */
export function InscricoesAnoProfissionalSection({
  linhas,
  onAdicionar,
  onRemover,
  onAlterar,
  disabled = false,
}: InscricoesAnoProfissionalSectionProps) {
  return (
    <Card className="shadow-none border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-slate-800">
          Inscrição no Processo Seletivo
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Informe, por Ano Letivo, se o profissional se inscreveu no Processo Seletivo. Campo
          opcional; cada ano aparece uma única vez.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {linhas.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            Nenhuma inscrição informada (campo opcional).
          </p>
        ) : (
          linhas.map((linha) => {
            const anosUsadosEmOutraLinha = linhas
              .filter((l) => l.idTemp !== linha.idTemp && l.ano_letivo !== null)
              .map((l) => l.ano_letivo as number)
            const anosDisponiveis = ANOS_LETIVOS.filter(
              (ano) => !anosUsadosEmOutraLinha.includes(ano),
            )

            return (
              <div
                key={linha.idTemp}
                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end p-3 rounded-md border border-slate-200 bg-slate-50/60"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Ano Letivo</Label>
                  <Select
                    value={linha.ano_letivo ? String(linha.ano_letivo) : ''}
                    onValueChange={(val) => onAlterar(linha.idTemp, 'ano_letivo', val)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {anosDisponiveis.map((ano) => (
                        <SelectItem key={ano} value={String(ano)}>
                          Ano {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Inscrito no Processo Seletivo
                  </Label>
                  <Select
                    value={linha.inscrito === null ? '' : linha.inscrito ? 'sim' : 'nao'}
                    onValueChange={(val) => onAlterar(linha.idTemp, 'inscrito', val)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onRemover(linha.idTemp)}
                  disabled={disabled}
                  aria-label="Remover inscrição"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )
          })
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdicionar}
          disabled={disabled || linhas.length >= ANOS_LETIVOS.length}
          className="text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Adicionar Ano Letivo
        </Button>
      </CardContent>
    </Card>
  )
}
