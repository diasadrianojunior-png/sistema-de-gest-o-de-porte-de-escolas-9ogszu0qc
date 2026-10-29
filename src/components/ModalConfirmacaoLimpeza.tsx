import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'

interface ModalConfirmacaoLimpezaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalRegistrosParaExcluir: number
  preservarAuditoria: boolean
  preservarCargosFuncoes: boolean
  onConfirmar: () => Promise<void>
  loading: boolean
}

export function ModalConfirmacaoLimpeza({
  open,
  onOpenChange,
  totalRegistrosParaExcluir,
  preservarAuditoria,
  preservarCargosFuncoes,
  onConfirmar,
  loading,
}: ModalConfirmacaoLimpezaProps) {
  const [textoConfirmacao, setTextoConfirmacao] = useState('')

  // Comparação estrita: somente habilita se for exatamente "LIMPAR"
  const isPalavraValida = textoConfirmacao === 'LIMPAR'

  const handleClose = () => {
    if (loading) return
    setTextoConfirmacao('')
    onOpenChange(false)
  }

  const handleExecutar = async () => {
    if (!isPalavraValida || loading) return
    await onConfirmar()
    setTextoConfirmacao('')
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl">
        <DialogHeader className="items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 shadow-xs">
            <AlertTriangle className="w-8 h-8 text-rose-600" />
          </div>

          <DialogTitle className="text-xl font-bold text-slate-900 leading-snug px-4">
            Você tem MESMO certeza de que deseja fazer a limpeza?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs text-slate-600 pt-1">
          {/* Resumo da ação */}
          <p className="text-center text-slate-600 leading-relaxed px-2">
            Esta ação excluirá{' '}
            <strong className="text-rose-600 font-bold">
              {totalRegistrosParaExcluir} registros
            </strong>{' '}
            de cadastros de vagas, turmas, servidores, porte escolar
            {!preservarCargosFuncoes ? ', cargos e funções' : ''}
            {!preservarAuditoria ? ', auditoria histórica' : ''} e usuários não-administradores.
          </p>

          {/* Opções selecionadas pelo usuário */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Opções selecionadas:
            </span>
            <div className="flex flex-col gap-1 text-[11px]">
              <span className="flex items-center justify-between">
                <span>Preservar Auditoria Anterior:</span>
                <strong className={preservarAuditoria ? 'text-emerald-700' : 'text-rose-700'}>
                  {preservarAuditoria ? 'Sim (Mantido)' : 'Não (Excluir)'}
                </strong>
              </span>
              <span className="flex items-center justify-between">
                <span>Preservar Cargos e Funções:</span>
                <strong className={preservarCargosFuncoes ? 'text-emerald-700' : 'text-rose-700'}>
                  {preservarCargosFuncoes ? 'Sim (Mantido)' : 'Não (Excluir)'}
                </strong>
              </span>
            </div>
          </div>

          {/* Garantias preservadas */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Garantias preservadas:</span>
            </div>
            <ul className="space-y-1 pl-4 list-disc text-[11px] text-slate-700">
              <li>O Cadastro de Bairros e Unidades Educativas NÃO serão apagados.</li>
              <li>A Estrutura de Anos Letivos, Etapas e Séries NÃO será apagada.</li>
              <li>As Contas de E-mail (Servidores SMTP) são SEMPRE preservadas.</li>
              <li>Usuários com perfil Administrador permanecerão com acesso.</li>
            </ul>
          </div>

          {/* Input com palavra de confirmação LIMPAR */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-slate-800">
              Para confirmar, digite <strong className="text-rose-700 font-mono">LIMPAR</strong> no
              campo abaixo:
            </label>
            <Input
              type="text"
              value={textoConfirmacao}
              onChange={(e) => setTextoConfirmacao(e.target.value)}
              placeholder="Digite LIMPAR para habilitar"
              disabled={loading}
              className={`h-11 text-center font-mono text-sm tracking-wider uppercase transition-colors ${
                isPalavraValida
                  ? 'border-emerald-500 bg-emerald-50/40 text-emerald-800 font-bold focus-visible:ring-emerald-500'
                  : textoConfirmacao.length > 0
                    ? 'border-rose-400 bg-rose-50/30 text-rose-700'
                    : 'border-rose-300 placeholder:text-slate-400'
              }`}
              autoFocus
            />
            {textoConfirmacao.length > 0 && !isPalavraValida && (
              <p className="text-[11px] text-rose-600 text-center font-medium">
                Digite exatamente "LIMPAR" em maiúsculas, sem espaços extras.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2 border-t pt-4 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 h-10 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleExecutar}
            disabled={!isPalavraValida || loading}
            className={`flex-1 h-10 text-xs font-bold transition-all shadow-sm ${
              isPalavraValida && !loading
                ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                : 'bg-rose-200 text-white cursor-not-allowed opacity-80'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-1.5 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Excluindo dados...
              </span>
            ) : (
              'Sim, Executar Limpeza Definitiva'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
