import React from 'react'
import { Switch } from '@/components/ui/switch'
import { Eye, Edit3, CheckCircle2, XCircle, Info, ShieldCheck } from 'lucide-react'
import { PermissaoItemForm, MENUS_SISTEMA_PADRAO } from '@/services/permissoes'

interface PermissoesFormTableProps {
  permissoes: PermissaoItemForm[]
  onChangePermissoes: (novas: PermissaoItemForm[]) => void
  disabled?: boolean
}

export const PermissoesFormTable: React.FC<PermissoesFormTableProps> = ({
  permissoes,
  onChangePermissoes,
  disabled = false,
}) => {
  const handleToggleVer = (menuKey: string, novoValor: boolean) => {
    const atualizadas = permissoes.map((item) => {
      if (item.menu_key === menuKey) {
        return {
          ...item,
          pode_ver: novoValor,
          pode_editar: novoValor ? item.pode_editar : false,
        }
      }
      return item
    })
    onChangePermissoes(atualizadas)
  }

  const handleToggleEditar = (menuKey: string, novoValor: boolean) => {
    const atualizadas = permissoes.map((item) => {
      if (item.menu_key === menuKey) {
        return {
          ...item,
          pode_editar: novoValor,
          pode_ver: novoValor ? true : item.pode_ver,
        }
      }
      return item
    })
    onChangePermissoes(atualizadas)
  }

  const getMenuInfo = (menuKey: string) => {
    return MENUS_SISTEMA_PADRAO.find((m) => m.key === menuKey)
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Permissões de Acesso do Operador
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
          Individual por Usuário
        </span>
      </div>

      <div className="rounded-xl border border-blue-200 bg-[#f0f6ff] p-3 text-xs text-blue-900 flex items-start gap-2.5 leading-relaxed">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p>
          Configure os privilégios deste operador em cada menu. Menus marcados como{' '}
          <strong>Somente leitura</strong> (Painel e Auditoria) não suportam edição. As permissões
          são exclusivas deste usuário.
        </p>
      </div>

      <div className="overflow-x-auto border rounded-xl bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f8fafc] text-slate-700 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 font-semibold text-[11px] uppercase tracking-tight text-slate-700 w-36">
                Categoria
              </th>
              <th className="py-2.5 px-3 font-semibold text-[11px] uppercase tracking-tight text-slate-700">
                Menu do Sistema
              </th>
              <th className="py-2.5 px-3 font-semibold text-[11px] uppercase tracking-tight text-slate-700 text-center w-28">
                <div className="inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pode Ver</span>
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold text-[11px] uppercase tracking-tight text-slate-700 text-center w-32">
                <div className="inline-flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pode Editar</span>
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold text-[11px] uppercase tracking-tight text-slate-700 w-44">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {permissoes.map((item) => {
              const info = getMenuInfo(item.menu_key)
              const rota = info?.path || ''
              const categoria = info?.categoria || 'Geral'

              return (
                <tr
                  key={item.menu_key}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    !item.pode_ver ? 'bg-slate-50/40 text-slate-500' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-slate-500 font-medium">{categoria}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{item.menu_label}</span>
                      <span className="text-[10px] font-mono text-slate-400">{rota}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Switch
                        id={`ver-${item.menu_key}`}
                        checked={item.pode_ver}
                        onCheckedChange={(val) => handleToggleVer(item.menu_key, val)}
                        disabled={disabled}
                        aria-label={`Permitir visualização do menu ${item.menu_label}`}
                      />
                      <span
                        className={`text-[11px] font-semibold w-7 text-left ${
                          item.pode_ver ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {item.pode_ver ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.suporta_edicao ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <Switch
                          id={`editar-${item.menu_key}`}
                          checked={item.pode_editar}
                          onCheckedChange={(val) => handleToggleEditar(item.menu_key, val)}
                          disabled={disabled || !item.pode_ver}
                          aria-label={`Permitir edição no menu ${item.menu_label}`}
                        />
                        <span
                          className={`text-[11px] font-semibold w-7 text-left ${
                            item.pode_editar && item.pode_ver
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.pode_editar && item.pode_ver ? 'Sim' : 'Não'}
                        </span>
                      </div>
                    ) : (
                      <span
                        className="text-[10px] text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block"
                        title="Este item é restrito à visualização em todo o sistema"
                      >
                        Somente leitura
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {!item.pode_ver ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Oculto na barra lateral
                      </span>
                    ) : item.suporta_edicao && item.pode_editar ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Visualização e Edição
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        <Eye className="w-3 h-3 text-blue-600" />
                        Apenas Visualização
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
