import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Save,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Eye,
  Edit3,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  getPermissoesPerfil,
  salvarPermissoesPerfil,
  MENUS_SISTEMA_PADRAO,
} from '@/services/permissoes'
import { PermissaoPerfil } from '@/types/gestao-escolar'

export default function Permissoes() {
  const { isAdmin, user, refreshPermissoes } = useAuth()
  const [permissoes, setPermissoes] = useState<PermissaoPerfil[]>([])
  const [permissoesOriginais, setPermissoesOriginais] = useState<PermissaoPerfil[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const carregarPermissoes = async () => {
    try {
      setLoading(true)
      const data = await getPermissoesPerfil('Operador')
      setPermissoes(data)
      setPermissoesOriginais(JSON.parse(JSON.stringify(data)))
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar permissões',
        description: err.message || 'Falha ao buscar configurações de perfil.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarPermissoes()
  }, [])

  const handleToggleVer = (id: string, novoValor: boolean) => {
    setPermissoes((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            pode_ver: novoValor,
            // Se desabilitar visualização, desabilita edição automaticamente
            pode_editar: novoValor ? item.pode_editar : false,
          }
        }
        return item
      }),
    )
  }

  const handleToggleEditar = (id: string, novoValor: boolean) => {
    setPermissoes((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            pode_editar: novoValor,
            // Se habilitar edição, visualização precisa ser verdadeira
            pode_ver: novoValor ? true : item.pode_ver,
          }
        }
        return item
      }),
    )
  }

  const temAlteracoes = () => {
    if (permissoes.length !== permissoesOriginais.length) return false
    return JSON.stringify(permissoes) !== JSON.stringify(permissoesOriginais)
  }

  const handleRestaurar = () => {
    setPermissoes(JSON.parse(JSON.stringify(permissoesOriginais)))
  }

  const handleSalvar = async () => {
    if (!isAdmin) {
      toast({
        title: 'Acesso negado',
        description: 'Apenas Administradores podem alterar permissões do sistema.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      const payload = permissoes.map((p) => ({
        id: p.id,
        menu_key: p.menu_key,
        menu_label: p.menu_label,
        pode_ver: p.pode_ver,
        pode_editar: p.pode_editar,
        suporta_edicao: p.suporta_edicao,
      }))

      const atualizados = await salvarPermissoesPerfil('Operador', payload, permissoesOriginais)
      setPermissoes(atualizados)
      setPermissoesOriginais(JSON.parse(JSON.stringify(atualizados)))

      // Notificar o AuthProvider para recarregar se necessário
      await refreshPermissoes()

      toast({
        title: 'Permissões atualizadas com sucesso!',
        description: 'As configurações do perfil Operador foram salvas e registradas na Auditoria.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar permissões',
        description: err.message || 'Falha ao persistir permissões no banco.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getMenuInfo = (menuKey: string) => {
    return MENUS_SISTEMA_PADRAO.find((m) => m.key === menuKey)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
            <span>Administração do sistema</span>
            <span>&rsaquo;</span>
            <span>Controle de Acesso</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Lock className="w-7 h-7 text-blue-600" />
            Permissões de Perfis
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Defina quais menus do sistema o perfil <strong>Operador</strong> pode visualizar e
            editar. O perfil <strong>Administrador</strong> tem acesso total e irrestrito
            permanente.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestaurar}
              disabled={!temAlteracoes() || saving || loading}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer alterações
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvar}
              disabled={!temAlteracoes() || saving || loading}
              className="text-xs gap-1.5 bg-[#0B2545] hover:bg-[#133A68] text-white shadow-sm"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Salvar Permissões
            </Button>
          </div>
        )}
      </div>

      {/* Regras e Informações dos Perfis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Perfil Administrador */}
        <Card className="border-purple-200 bg-purple-50/40 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                Perfil: Administrador
              </span>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                Acesso Irrestrito
              </span>
            </div>
            <CardTitle className="text-base text-slate-900 mt-2">
              Pode ver e fazer tudo no sistema
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 leading-relaxed">
              O Administrador possui permissão total, nativa e permanente sobre todos os módulos,
              incluindo gestão de usuários, contas de e-mail e concessão de acessos. Não requer nem
              permite restrição.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-purple-900 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
            <span>Permissões totais ativas para visualização, criação, edição e exclusão.</span>
          </CardContent>
        </Card>

        {/* Card Perfil Operador */}
        <Card className="border-blue-200 bg-blue-50/40 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                Perfil: Operador
              </span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                Personalizável pelo Administrador
              </span>
            </div>
            <CardTitle className="text-base text-slate-900 mt-2">
              Permissões configuradas por menu
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 leading-relaxed">
              O Administrador decide quais itens de menu o Operador poderá <strong>Ver</strong> e
              quais poderá <strong>Editar</strong>. Menus somente leitura (Painel de Início e
              Auditoria) não suportam edição.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-blue-900 font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-700 shrink-0" />
            <span>As regras abaixo são aplicadas imediatamente a todos os usuários Operador.</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Configuração de Permissões */}
      <Card className="shadow-2xs border-slate-200">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                <span>Matriz de Acessos do Perfil Operador</span>
                {temAlteracoes() && (
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                    Alterações pendentes de salvamento
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure os privilégios de visualização e edição por cada item da barra lateral do
                sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" /> Carregando permissões do
              perfil...
            </div>
          ) : permissoes.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Nenhuma configuração de permissão encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#f8fafc] text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-xs tracking-tight text-slate-700 w-28">
                      Identificador
                    </th>
                    <th className="py-3 px-4 font-semibold text-xs tracking-tight text-slate-700 w-44">
                      Categoria do Menu
                    </th>
                    <th className="py-3 px-4 font-semibold text-xs tracking-tight text-slate-700">
                      Item de Menu do Sistema
                    </th>
                    <th className="py-3 px-4 font-semibold text-xs tracking-tight text-slate-700 text-center w-36">
                      <div className="inline-flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Pode Ver</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-semibold text-xs tracking-tight text-slate-700 text-center w-40">
                      <div className="inline-flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pode Editar</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-semibold text-xs tracking-tight text-slate-700 w-52">
                      Status de Acesso
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
                        key={item.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          !item.pode_ver ? 'bg-slate-50/40 text-slate-500' : ''
                        }`}
                      >
                        {/* Identificador PERM-XXXX */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {item.codigo || 'PERM-0000'}
                          </span>
                        </td>

                        {/* Categoria */}
                        <td className="py-3 px-4 text-xs font-medium text-slate-500">
                          {categoria}
                        </td>

                        {/* Menu */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 text-sm">
                              {item.menu_label}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">{rota}</span>
                          </div>
                        </td>

                        {/* Toggle Ver */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              id={`ver-${item.id}`}
                              checked={item.pode_ver}
                              onCheckedChange={(val) => handleToggleVer(item.id, val)}
                              disabled={!isAdmin || saving}
                              aria-label={`Permitir visualização do menu ${item.menu_label}`}
                            />
                            <span
                              className={`text-xs font-semibold w-10 text-left ${
                                item.pode_ver ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                            >
                              {item.pode_ver ? 'Sim' : 'Não'}
                            </span>
                          </div>
                        </td>

                        {/* Toggle Editar */}
                        <td className="py-3 px-4 text-center">
                          {item.suporta_edicao ? (
                            <div className="flex items-center justify-center gap-2">
                              <Switch
                                id={`editar-${item.id}`}
                                checked={item.pode_editar}
                                onCheckedChange={(val) => handleToggleEditar(item.id, val)}
                                disabled={!isAdmin || !item.pode_ver || saving}
                                aria-label={`Permitir edição no menu ${item.menu_label}`}
                              />
                              <span
                                className={`text-xs font-semibold w-10 text-left ${
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
                              className="text-[11px] text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                              title="Este item é restrito à visualização ou leitura em todo o sistema"
                            >
                              Somente leitura
                            </span>
                          )}
                        </td>

                        {/* Resumo visual do status */}
                        <td className="py-3 px-4 text-xs">
                          {!item.pode_ver ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Oculto na barra lateral
                            </span>
                          ) : item.suporta_edicao && item.pode_editar ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Visualização e Edição
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
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
          )}
        </CardContent>
      </Card>

      {/* Barra de ação inferior caso haja mudanças */}
      {isAdmin && temAlteracoes() && (
        <div className="sticky bottom-4 z-20 bg-slate-900 text-white p-4 rounded-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Você fez alterações na matriz de permissões do perfil Operador. Clique em "Salvar
              Permissões" para persistir no banco e registrar a ação na Auditoria.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestaurar}
              disabled={saving}
              className="text-xs bg-slate-800 text-white border-slate-600 hover:bg-slate-700"
            >
              Descartar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvar}
              disabled={saving}
              className="text-xs gap-1.5 bg-[#0B2545] hover:bg-[#133A68] text-white"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Salvar Permissões
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
