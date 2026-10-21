import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  School,
  Database,
  Settings,
  ArrowRight,
  Clock,
  Layers,
  Building2,
  CheckCircle2,
} from 'lucide-react'
import { getUnidadesEscolares } from '@/services/unidades-escolares'
import { getMunicipios, getTiposEscola } from '@/services/apoio'
import { UnidadeEscolar, MunicipioRede, TipoEscola } from '@/types/gestao-escolar'

export default function Painel() {
  const { user } = useAuth()
  const [unidades, setUnidades] = useState<UnidadeEscolar[]>([])
  const [municipios, setMunicipios] = useState<MunicipioRede[]>([])
  const [tiposEscola, setTiposEscola] = useState<TipoEscola[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoadingData(true)
        const [unidadesData, municipiosData, tiposData] = await Promise.all([
          getUnidadesEscolares().catch(() => []),
          getMunicipios().catch(() => []),
          getTiposEscola().catch(() => []),
        ])
        setUnidades(unidadesData)
        setMunicipios(municipiosData)
        setTiposEscola(tiposData)
      } catch (err) {
        console.error('Erro ao carregar dados do painel:', err)
      } finally {
        setLoadingData(false)
      }
    }

    loadDashboardData()
  }, [])

  const total20h = unidades.filter(
    (u) => u.tipo_atendimento === 'Ensino Fundamental e Educação Infantil (20h)',
  ).length
  const total40h = unidades.filter((u) => u.tipo_atendimento === 'Educação Infantil (40h)').length

  return (
    <div className="space-y-8">
      {/* Header Boas-vindas */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sistema Operacional
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Painel de Início
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Bem-vindo(a), <span className="font-medium text-slate-800">{user?.email}</span>.
            Gerencie os dados cadastrais da rede de ensino.
          </p>
        </div>
      </div>

      {/* Cards de Atalhos Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Atalho: Cadastros Mestres (Unidades Escolares) */}
        <Card className="hover:shadow-md transition-shadow border-slate-200 relative overflow-hidden group">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-blue-600" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <School className="w-6 h-6" />
              </div>
              <span className="text-2xl font-bold text-slate-900">
                {loadingData ? '...' : unidades.length}
              </span>
            </div>
            <CardTitle className="text-xl mt-3">Cadastros Mestres</CardTitle>
            <CardDescription>
              Gestão de unidades escolares com identificador sequencial, tipo de atendimento e
              nível/porte.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Fundamental e Infantil (20h):</span>
              </div>
              <span className="font-semibold text-slate-800">{loadingData ? '...' : total20h}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Educação Infantil (40h):</span>
              </div>
              <span className="font-semibold text-slate-800">{loadingData ? '...' : total40h}</span>
            </div>
            <Button asChild className="w-full gap-2 mt-2">
              <Link to="/cadastros-mestres">
                Acessar Unidades Escolares
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Atalho: Cadastros de Apoio */}
        <Card className="hover:shadow-md transition-shadow border-slate-200 relative overflow-hidden group">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-emerald-600" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <span className="text-2xl font-bold text-slate-900">
                {loadingData ? '...' : municipios.length + tiposEscola.length}
              </span>
            </div>
            <CardTitle className="text-xl mt-3">Cadastros de Apoio</CardTitle>
            <CardDescription>
              Tabelas auxiliares de municípios/redes de ensino e tipos de escolas para
              parametrização.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Municípios / Redes ativas:</span>
              </div>
              <span className="font-semibold text-slate-800">
                {loadingData ? '...' : municipios.length}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>Tipos de escola cadastrados:</span>
              </div>
              <span className="font-semibold text-slate-800">
                {loadingData ? '...' : tiposEscola.length}
              </span>
            </div>
            <Button asChild variant="secondary" className="w-full gap-2 mt-2">
              <Link to="/cadastros-apoio">
                Acessar Tabelas de Apoio
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Resumo Rápido de Unidades Escolares */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Últimas Unidades Escolares Cadastradas
            </h2>
            <p className="text-xs text-slate-500">
              Visualização resumida dos cadastros mestres recentes
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/cadastros-mestres">Ver todas</Link>
          </Button>
        </div>

        {loadingData ? (
          <div className="py-8 text-center text-sm text-slate-500">Carregando dados...</div>
        ) : unidades.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Nenhuma unidade escolar cadastrada ainda. Utilize o botão acima para adicionar a
            primeira.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-medium w-24">Código</th>
                  <th className="py-2.5 px-3 font-medium">Nome da Unidade</th>
                  <th className="py-2.5 px-3 font-medium">Tipo de Atendimento</th>
                  <th className="py-2.5 px-3 font-medium">Nível / Faixa</th>
                  <th className="py-2.5 px-3 font-medium">Localização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unidades.slice(0, 5).map((unidade) => (
                  <tr key={unidade.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {unidade.codigo || 'UN-0000'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">{unidade.nome}</td>
                    <td className="py-3 px-3 text-slate-700 text-xs">{unidade.tipo_atendimento}</td>
                    <td className="py-3 px-3 text-slate-700 text-xs font-medium">
                      {unidade.nivel_porte}
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-xs">{unidade.localizacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
