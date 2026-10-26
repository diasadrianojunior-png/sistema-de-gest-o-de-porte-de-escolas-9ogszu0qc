import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaginacaoTabelaProps {
  /** Página atual (1-based) */
  paginaAtual: number
  /** Quantidade total de registros após filtros/busca */
  totalRegistros: number
  /** Quantidade de registros por página (padrão do sistema: 10) */
  itensPorPagina?: number
  /** Callback disparado ao mudar de página */
  onMudarPagina: (novaPagina: number) => void
  /** Rótulo no plural para os itens (ex: "unidades escolares", "vagas", "registros") */
  rotuloItens?: string
  /** Classes CSS extras para o container */
  className?: string
  /** Se deve esconder totalmente quando houver 0 registros */
  esconderSeVazio?: boolean
}

export const ITENS_POR_PAGINA_PADRAO = 10

/**
 * Componente unificado e reutilizável de paginação para tabelas/listagens do sistema.
 * Exibe contagem de registros, intervalo exibido, página atual de total e controles
 * "Anterior" / "Próxima" (com atalhos Primeira / Última).
 * Quando há 10 ou menos registros, os botões permanecem desabilitados ou a paginação
 * permanece informativa, mantendo consistência visual sem poluir.
 */
export function PaginacaoTabela({
  paginaAtual,
  totalRegistros,
  itensPorPagina = ITENS_POR_PAGINA_PADRAO,
  onMudarPagina,
  rotuloItens = 'registros',
  className,
  esconderSeVazio = true,
}: PaginacaoTabelaProps) {
  if (esconderSeVazio && totalRegistros === 0) {
    return null
  }

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / itensPorPagina))
  const paginaValida = Math.min(Math.max(1, paginaAtual), totalPaginas)

  const primeiroRegistro = totalRegistros === 0 ? 0 : (paginaValida - 1) * itensPorPagina + 1
  const ultimoRegistro = Math.min(paginaValida * itensPorPagina, totalRegistros)

  const podeVoltar = paginaValida > 1
  const podeAvancar = paginaValida < totalPaginas

  // Gera lista enxuta de números de página para exibição amigável
  const gerarNumerosPagina = () => {
    const paginas: (number | 'ellipsis')[] = []
    if (totalPaginas <= 5) {
      for (let i = 1; i <= totalPaginas; i++) {
        paginas.push(i)
      }
    } else {
      paginas.push(1)
      if (paginaValida > 3) {
        paginas.push('ellipsis')
      }
      const inicio = Math.max(2, paginaValida - 1)
      const fim = Math.min(totalPaginas - 1, paginaValida + 1)
      for (let i = inicio; i <= fim; i++) {
        paginas.push(i)
      }
      if (paginaValida < totalPaginas - 2) {
        paginas.push('ellipsis')
      }
      paginas.push(totalPaginas)
    }
    return paginas
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-3 border-t border-slate-200 bg-slate-50/70 rounded-b-lg text-xs text-slate-600',
        className,
      )}
    >
      {/* Informações de contagem e intervalo */}
      <div className="flex items-center gap-1.5 font-medium text-slate-600 order-2 sm:order-1">
        <span>Exibindo</span>
        {totalRegistros > 0 ? (
          <>
            <strong className="text-slate-900 font-semibold">{primeiroRegistro}</strong>
            <span>a</span>
            <strong className="text-slate-900 font-semibold">{ultimoRegistro}</strong>
            <span>de</span>
          </>
        ) : null}
        <strong className="text-slate-900 font-semibold">{totalRegistros}</strong>
        <span>{rotuloItens}</span>
        {totalPaginas > 1 && (
          <span className="hidden md:inline text-slate-400 ml-1">
            • Página <strong className="text-slate-700">{paginaValida}</strong> de{' '}
            <strong className="text-slate-700">{totalPaginas}</strong>
          </span>
        )}
      </div>

      {/* Controles de Navegação */}
      <div className="flex items-center gap-1 sm:gap-1.5 order-1 sm:order-2">
        {/* Botão Primeira Página (visível quando há muitas páginas) */}
        {totalPaginas > 3 && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onMudarPagina(1)}
            disabled={!podeVoltar}
            className="h-8 w-8 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            title="Primeira página"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
            <span className="sr-only">Primeira página</span>
          </Button>
        )}

        {/* Botão Anterior */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMudarPagina(Math.max(1, paginaValida - 1))}
          disabled={!podeVoltar}
          className="h-8 px-2.5 gap-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-medium disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Anterior</span>
        </Button>

        {/* Números das Páginas */}
        <div className="hidden sm:flex items-center gap-1">
          {gerarNumerosPagina().map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 select-none font-bold">
                  …
                </span>
              )
            }
            const isAtual = p === paginaValida
            return (
              <Button
                key={`page-${p}`}
                type="button"
                variant={isAtual ? 'default' : 'outline'}
                size="sm"
                onClick={() => onMudarPagina(p)}
                className={cn(
                  'h-8 w-8 p-0 text-xs font-semibold',
                  isAtual
                    ? 'bg-[#0B2545] hover:bg-[#133A68] text-white border-transparent'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100',
                )}
                aria-current={isAtual ? 'page' : undefined}
              >
                {p}
              </Button>
            )
          })}
        </div>

        {/* Indicador simples para mobile quando os botões numéricos estão ocultos */}
        <span className="sm:hidden text-xs font-medium text-slate-700 px-1">
          {paginaValida} / {totalPaginas}
        </span>

        {/* Botão Próxima */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMudarPagina(Math.min(totalPaginas, paginaValida + 1))}
          disabled={!podeAvancar}
          className="h-8 px-2.5 gap-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-medium disabled:opacity-40"
        >
          <span>Próxima</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        {/* Botão Última Página (visível quando há muitas páginas) */}
        {totalPaginas > 3 && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onMudarPagina(totalPaginas)}
            disabled={!podeAvancar}
            className="h-8 w-8 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            title="Última página"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
            <span className="sr-only">Última página</span>
          </Button>
        )}
      </div>
    </div>
  )
}

export default PaginacaoTabela
