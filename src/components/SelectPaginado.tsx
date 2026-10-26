import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectPaginadoOption {
  value: string
  label: React.ReactNode
  /** Texto puro usado para busca/filtro (se omitido, tenta converter label ou value) */
  searchText?: string
  disabled?: boolean
  className?: string
  /** Se for uma opção especial fixa no topo (ex: "Todos", "Todas as etapas") */
  isSpecialTop?: boolean
}

export interface SelectPaginadoProps {
  id?: string
  value?: string
  onValueChange?: (value: string) => void
  options: SelectPaginadoOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  /** Quantidade de itens por página. Padrão: 10 */
  pageSize?: number
  /** Habilitar campo de busca textual no topo do dropdown (padrão: true se > 10 itens) */
  enableSearch?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  /** Elemento customizado para renderizar dentro do trigger quando houver valor */
  renderTriggerValue?: (selectedOption?: SelectPaginadoOption) => React.ReactNode
}

/**
 * Componente Select/Combobox paginado.
 * Se a lista tiver mais de 10 opções (ou pageSize definido):
 * - Exibe 10 opções por página
 * - Controles de paginação ("Página X de Y", botões Anterior e Próxima) dentro do próprio dropdown
 * - Busca textual rápida integrada: ao buscar, a paginação aplica-se aos resultados filtrados
 * - Opções com 10 ou menos itens continuam simples, sem controles de paginação (ou apenas com busca se ativada).
 */
export function SelectPaginado({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Selecione uma opção...',
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  pageSize = 10,
  enableSearch = true,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhuma opção encontrada.',
  renderTriggerValue,
}: SelectPaginadoProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)

  // Separar itens especiais fixos (ex: "TODAS", "TODOS") dos itens regulares
  const specialTopOptions = React.useMemo(
    () => options.filter((opt) => opt.isSpecialTop),
    [options],
  )
  const regularOptions = React.useMemo(() => options.filter((opt) => !opt.isSpecialTop), [options])

  // Filtro de busca textual
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return regularOptions
    const term = searchTerm.toLowerCase().trim()
    return regularOptions.filter((opt) => {
      if (opt.searchText) {
        return opt.searchText.toLowerCase().includes(term)
      }
      if (typeof opt.label === 'string') {
        return opt.label.toLowerCase().includes(term)
      }
      return opt.value.toLowerCase().includes(term)
    })
  }, [regularOptions, searchTerm])

  const totalFiltered = filteredOptions.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const needsPagination = totalFiltered > pageSize

  // Ajustar página atual caso a lista filtrada diminua
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  // Ao fechar ou abrir o dropdown, se o item selecionado estiver em outra página, levar até ela
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      setSearchTerm('')
      if (value) {
        const itemIndex = regularOptions.findIndex((opt) => opt.value === value)
        if (itemIndex >= 0) {
          const targetPage = Math.floor(itemIndex / pageSize) + 1
          setCurrentPage(targetPage)
        } else {
          setCurrentPage(1)
        }
      } else {
        setCurrentPage(1)
      }
    }
  }

  // Itens da página atual
  const pagedOptions = React.useMemo(() => {
    if (!needsPagination) return filteredOptions
    const start = (currentPage - 1) * pageSize
    return filteredOptions.slice(start, start + pageSize)
  }, [filteredOptions, needsPagination, currentPage, pageSize])

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value],
  )

  return (
    <div className={cn('w-full', className)}>
      <Select
        value={value}
        onValueChange={(val) => {
          onValueChange?.(val)
        }}
        open={open}
        onOpenChange={handleOpenChange}
        disabled={disabled}
      >
        <SelectTrigger id={id} className={triggerClassName}>
          {renderTriggerValue ? (
            renderTriggerValue(selectedOption)
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>

        <SelectContent
          className={cn(
            'min-w-[220px] max-w-[var(--radix-select-trigger-width)]',
            contentClassName,
          )}
        >
          {/* Campo de Busca textual (aparece quando há mais de 10 opções ou quando enableSearch é true e há mais de 5 itens) */}
          {enableSearch && options.length > 5 && (
            <div
              className="p-1.5 border-b border-slate-200 sticky top-0 bg-popover z-10"
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center">
                <Search className="absolute left-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder={searchPlaceholder}
                  className="h-8 pl-7 pr-7 text-xs bg-slate-50 focus-visible:ring-1"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('')
                      setCurrentPage(1)
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600"
                    title="Limpar busca"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Opções fixas no topo (se houver, ex: "Todas as Unidades", "Todos os Anos") */}
          {specialTopOptions.length > 0 && (
            <div className="border-b border-slate-100 pb-1 mb-1">
              {specialTopOptions.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className={cn('text-xs font-semibold', opt.className)}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </div>
          )}

          {/* Lista paginada */}
          <div className="py-1">
            {pagedOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">{emptyMessage}</div>
            ) : (
              pagedOptions.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className={cn('text-xs', opt.className)}
                >
                  {opt.label}
                </SelectItem>
              ))
            )}
          </div>

          {/* Controles de Paginação Embutidos no Dropdown (quando totalFiltered > pageSize) */}
          {needsPagination && (
            <div
              className="flex items-center justify-between px-2 py-1.5 border-t border-slate-200 bg-slate-50/90 text-xs text-slate-600 sticky bottom-0 z-10"
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCurrentPage((p) => Math.max(1, p - 1))
                }}
                className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                Anterior
              </Button>

              <span className="text-[11px] font-medium text-slate-600 px-1">
                Página {currentPage} de {totalPages}
                <span className="text-slate-400 ml-1">({totalFiltered})</span>
              </span>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }}
                className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              >
                Próxima
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

export default SelectPaginado
