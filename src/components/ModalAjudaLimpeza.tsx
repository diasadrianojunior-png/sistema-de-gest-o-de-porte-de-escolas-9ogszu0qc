import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Lock,
  CheckCircle2,
  ListFilter,
  Trash2,
} from 'lucide-react'

interface ModalAjudaLimpezaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModalAjudaLimpeza({ open, onOpenChange }: ModalAjudaLimpezaProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-slate-900">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            Ajuda e Regras: Rotina de Limpeza do Banco de Dados
          </DialogTitle>
          <DialogDescription>
            Orientações completas sobre a rotina de exclusão segura, garantias preservadas e dupla
            checagem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs text-slate-600">
          {/* Aviso Crítico */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Aviso Crítico de Irreversibilidade</p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                Esta operação exclui definitivamente os registros operacionais das tabelas listadas.
                Ela não pode ser desfeita. Certifique-se de que os ciclos letivos ou processos
                anteriores já foram consolidados antes de processar.
              </p>
            </div>
          </div>

          {/* Dados Preservados Obrigatoriamente */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              1. Dados Preservados Obrigatoriamente
            </h3>
            <p className="leading-relaxed">
              Os dados abaixo nunca são apagados pela rotina de limpeza, garantindo que o sistema
              continue plenamente funcional:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>
                <strong>Cadastro de Unidades Escolares:</strong> dados cadastrais, endereços,
                geolocalização e histórico de anos.
              </li>
              <li>
                <strong>Usuários Administradores:</strong> mantêm acesso intacto com todos os
                privilégios preservados.
              </li>
              <li>
                <strong>Contas de E-mail e SMTP:</strong> servidores de envio de mensagens
                cadastrados e suas configurações.
              </li>
              <li>
                <strong>Estrutura Escolar Permanente:</strong> anos letivos, etapas de ensino,
                anos/séries e matrizes de configuração de vagas por nível (CRH).
              </li>
            </ul>
          </div>

          {/* Perguntas Condicionais */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <ListFilter className="w-4 h-4 text-blue-600" />
              2. Opções Condicionais (Checkboxes)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-2.5 bg-slate-50 border rounded-lg">
                <p className="font-semibold text-slate-800">Preservar Registros de Auditoria?</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Quando <strong>marcado</strong>, mantém todo o histórico prévio. Se desmarcado, o
                  histórico antigo é limpo. Mesmo assim, o registro institucional DESTA limpeza será
                  gravado para rastreabilidade.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 border rounded-lg">
                <p className="font-semibold text-slate-800">Preservar Cargos e Funções?</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Quando <strong>marcado</strong>, o plano de cargos e catálogo de funções
                  permanecem intactos. Se desmarcado, são excluídos junto com seus vínculos
                  respeitando a integridade do banco.
                </p>
              </div>
            </div>
          </div>

          {/* Confirmação com LIMPAR */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-rose-600" />
              3. Dupla Checagem e Palavra de Confirmação
            </h3>
            <p className="leading-relaxed">
              Para evitar cliques acidentais, a rotina exige que o operador digite exatamente a
              palavra{' '}
              <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                LIMPAR
              </span>{' '}
              em letras maiúsculas no modal de confirmação. Se houver qualquer divergência ou espaço
              a mais, o botão permanece desabilitado.
            </p>
          </div>

          {/* Execução Atômica */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              4. Transação Segura e Atômica
            </h3>
            <p className="leading-relaxed">
              Todas as exclusões ocorrem em uma única transação atômica no PostgreSQL. Se qualquer
              restrição de referência for encontrada, todo o processo é cancelado imediatamente e
              nenhum dado é perdido.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs bg-[#0B2545] hover:bg-[#133A68] text-white"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
