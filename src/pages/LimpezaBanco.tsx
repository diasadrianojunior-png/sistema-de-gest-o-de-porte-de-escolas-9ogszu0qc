import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Loader2,
  HelpCircle,
  Building2,
  MapPin,
  Mail,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Sparkles,
  Database,
  Layers,
  GraduationCap,
} from 'lucide-react'
import {
  carregarEstatisticasLimpeza,
  executarLimpezaBanco,
  EstatisticasBancoLimpeza,
} from '@/services/limpeza-banco'
import { ModalAjudaLimpeza } from '@/components/ModalAjudaLimpeza'
import { ModalConfirmacaoLimpeza } from '@/components/ModalConfirmacaoLimpeza'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'

export default function LimpezaBancoPage() {
  const { canEdit, isAdmin } = useAuth()
  const podeExecutar = isAdmin || canEdit('limpeza_banco')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [executando, setExecutando] = useState(false)
  const [stats, setStats] = useState<EstatisticasBancoLimpeza | null>(null)

  // Combobox com opções exatas "Sim" e "Não"
  const [preservarAuditoria, setPreservarAuditoria] = useState<'Sim' | 'Não'>('Sim')
  const [preservarCargosFuncoes, setPreservarCargosFuncoes] = useState<'Sim' | 'Não'>('Sim')

  // Modais
  const [openAjuda, setOpenAjuda] = useState(false)
  const [openConfirmacao, setOpenConfirmacao] = useState(false)

  const carregarDados = async (manual = false) => {
    try {
      if (manual) setRefreshing(true)
      else setLoading(true)

      const dados = await carregarEstatisticasLimpeza()
      setStats(dados)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar estatísticas do banco',
        description: err.message || 'Falha ao consultar contagens das tabelas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Filtra as tabelas operacionais considerando as escolhas Sim/Não dos comboboxes
  const tabelasParaExibicao = useMemo(() => {
    if (!stats) return []
    return stats.tabelasOperacionais.filter((item) => {
      if (item.condicional === 'cargos_funcoes' && preservarCargosFuncoes === 'Sim') {
        return false
      }
      if (item.condicional === 'auditoria' && preservarAuditoria === 'Sim') {
        return false
      }
      return true
    })
  }, [stats, preservarAuditoria, preservarCargosFuncoes])

  // Total de registros que serão efetivamente excluídos baseado nas opções
  const totalRegistrosParaExcluir = useMemo(() => {
    return tabelasParaExibicao.reduce((acc, curr) => acc + (curr.quantidade || 0), 0)
  }, [tabelasParaExibicao])

  const handleConfirmarLimpeza = async () => {
    try {
      setExecutando(true)
      const res = await executarLimpezaBanco({
        preservarAuditoria: preservarAuditoria === 'Sim',
        preservarCargosFuncoes: preservarCargosFuncoes === 'Sim',
      })

      if (res.sucesso) {
        toast({
          title: 'Limpeza realizada com sucesso!',
          description: `${res.totalExcluidos} registro(s) operacionais foram excluídos definitivamente do banco de dados.`,
        })
        setOpenConfirmacao(false)
        await carregarDados(true)
      }
    } catch (err: any) {
      toast({
        title: 'Falha na rotina de limpeza',
        description: err.message || 'Ocorreu um erro ao executar a limpeza do banco.',
        variant: 'destructive',
      })
    } finally {
      setExecutando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Topo / Cabeçalho da página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
            <span>Sistema</span>
            <span>&rsaquo;</span>
            <span>Administração do Sistema</span>
            <span>&rsaquo;</span>
            <span>Manutenção & Governança</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Trash2 className="w-7 h-7 text-rose-600" />
            Rotina de Limpeza do Banco de Dados
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Exclusão controlada de registros operacionais e preparação do sistema para novos ciclos
            letivos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpenAjuda(true)}
            className="gap-2 text-slate-700 hover:bg-slate-100"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            Ajuda e Regras
          </Button>

          <Button
            size="sm"
            onClick={() => carregarDados(true)}
            disabled={loading || refreshing}
            className="gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar Contagens
          </Button>
        </div>
      </div>

      {/* 1. BANNER DE AVISO CRÍTICO DE IRREVERSIBILIDADE */}
      <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5 shadow-xs flex items-start gap-3.5 text-amber-900">
        <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-700" />
        </div>
        <div className="text-xs sm:text-sm leading-relaxed">
          <strong className="font-bold text-amber-950 block sm:inline">
            Aviso Crítico de Irreversibilidade:{' '}
          </strong>
          Esta operação exclui definitivamente os registros operacionais das tabelas listadas
          abaixo. Ela não pode ser desfeita. Certifique-se de que os editais ou ciclos anteriores já
          foram arquivados ou concluídos antes de processar.
        </div>
      </div>

      {/* Grid Principal: 2 Colunas (Tabela Operacional à esquerda, Exceções + Botão à direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: Card Cadastros e Módulos Sujeitos à Limpeza */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900">
                    Cadastros e Módulos Sujeitos à Limpeza
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Registros que serão excluídos na ordem correta de dependências
                  </p>
                </div>
              </div>

              {/* Badge com contagem total de registros operacionais */}
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {totalRegistrosParaExcluir} registros
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-sm text-slate-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                  <span>Consultando tabelas operacionais no banco...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-wider w-16">
                          Etapa
                        </th>
                        <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-wider">
                          Módulo / Cadastro
                        </th>
                        <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-wider w-48">
                          Tabela PostgreSQL
                        </th>
                        <th className="py-3 px-4 font-semibold text-[11px] uppercase tracking-wider text-right w-32">
                          Qtd. Registros
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tabelasParaExibicao.map((item, idx) => {
                        const etapaFormatada = `#${String(idx + 1).padStart(2, '0')}`
                        const temRegistros = (item.quantidade || 0) > 0

                        return (
                          <tr key={item.tabela} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                              {etapaFormatada}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800 text-xs">
                                  {item.modulo}
                                </span>
                                {item.descricao && (
                                  <span className="text-[11px] text-slate-500 mt-0.5">
                                    {item.descricao}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <code className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700 border border-slate-200">
                                {item.tabela}
                              </code>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {temRegistros ? (
                                <span className="inline-flex items-center gap-1 font-bold font-mono text-rose-600 text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {item.quantidade}
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 font-mono text-slate-400 text-xs"
                                  title="Sem registros"
                                >
                                  <Ban className="w-3.5 h-3.5 text-slate-300" />0
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

          {/* 2. OPÇÕES ADICIONAIS DE EXCEÇÃO (Perguntas com combobox Sim / Não) */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Opções Adicionais de Exceção
              </CardTitle>
              <p className="text-xs text-slate-500">
                Selecione as opções antes de realizar a limpeza para definir se determinados dados
                devem ser preservados ou excluídos.
              </p>
            </CardHeader>

            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pergunta 1: Auditoria */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block">
                        Deseja preservar os registros de auditoria?
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Mantém todo o histórico prévio de logs de auditoria do sistema. Se "Não", o
                        histórico anterior será limpo e apenas o registro DESTA limpeza será
                        gravado.
                      </p>
                    </div>
                  </div>

                  <Select
                    value={preservarAuditoria}
                    onValueChange={(val: 'Sim' | 'Não') => setPreservarAuditoria(val)}
                  >
                    <SelectTrigger className="w-full bg-white h-9 text-xs font-semibold">
                      <SelectValue placeholder="Selecione Sim ou Não" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim — Preservar registros de auditoria</SelectItem>
                      <SelectItem value="Não">Não — Excluir auditoria anterior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pergunta 2: Cargos e Funções */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block">
                        Deseja preservar os cargos e as funções?
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Quando "Sim", os cadastros de Cargos, Funções e seus vínculos são
                        preservados. Se "Não", serão excluídos respeitando a integridade do banco.
                      </p>
                    </div>
                  </div>

                  <Select
                    value={preservarCargosFuncoes}
                    onValueChange={(val: 'Sim' | 'Não') => setPreservarCargosFuncoes(val)}
                  >
                    <SelectTrigger className="w-full bg-white h-9 text-xs font-semibold">
                      <SelectValue placeholder="Selecione Sim ou Não" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim — Preservar cargos e funções</SelectItem>
                      <SelectItem value="Não">Não — Excluir cargos e funções</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA: Painel Lateral Verde "Exceções Preservadas" + Botão de Execução */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card Painel Lateral Verde */}
          <Card className="border-emerald-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-emerald-100 bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <CardTitle className="text-base font-bold text-emerald-950">
                  Exceções Preservadas
                </CardTitle>
              </div>
              <p className="text-xs text-emerald-800/80 leading-relaxed mt-1">
                Os cadastros e dados abaixo são <strong>estritamente mantidos</strong> pelo sistema
                durante a limpeza para preservar a infraestrutura educacional:
              </p>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Item 1: Unidades Educativas */}
              <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700 shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-xs">
                    Cadastro de Unidades Educativas
                  </h4>
                  <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                    {stats?.excecoes.totalUnidades ?? 0} estabelecimentos mantidos (sempre
                    preservado)
                  </p>
                </div>
              </div>

              {/* Item 2: Bairros do Município */}
              <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700 shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-xs">Cadastro de Bairros</h4>
                  <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                    {stats?.excecoes.totalBairros ?? 0} bairros do município mantidos (sempre
                    preservado)
                  </p>
                </div>
              </div>

              {/* Item 3: Tipos de Atendimento */}
              <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700 shrink-0 mt-0.5">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-xs">Tipos de Unidade Educativa</h4>
                  <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                    {stats?.excecoes.totalTiposAtendimento ?? 2} tipos educacionais mantidos (sempre
                    preservado)
                  </p>
                </div>
              </div>

              {/* Item 4: Contas de Email (Servidores SMTP) */}
              <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700 shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-xs">
                    Contas de E-mail (Servidores SMTP)
                  </h4>
                  <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                    {stats?.excecoes.totalContasEmail ?? 0} configuração(ões) mantida(s) (sempre
                    preservadas, sem opção de desmarcar)
                  </p>
                </div>
              </div>

              {/* Item 5: Usuários Administradores */}
              <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-xs">Usuários Administradores</h4>
                  <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                    {stats?.excecoes.totalAdmins ?? 0} conta(s) com perfil Administrador mantidas
                    com acesso
                  </p>
                </div>
              </div>

              {/* Item 6: Estrutura Permanente (Anos, Etapas, Séries, CRH) */}
              <div className="p-3 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700 shrink-0 mt-0.5">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-xs">
                    Cadastros Estruturais do Sistema
                  </h4>
                  <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                    Anos letivos, {stats?.excecoes.totalEtapas ?? 0} etapas,{' '}
                    {stats?.excecoes.totalAnosSeries ?? 0} séries e matrizes de configuração de
                    vagas (sempre preservados)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Ação: Executar Limpeza Geral */}
          <Card className="border-slate-200 shadow-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">Executar Limpeza Geral</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Ao clicar no botão abaixo, o sistema exibirá uma confirmação com dupla checagem
                antes de executar as exclusões no banco.
              </p>
            </div>

            <Button
              size="lg"
              onClick={() => setOpenConfirmacao(true)}
              disabled={!podeExecutar || executando || loading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm h-11 gap-2 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Dados do Sistema
            </Button>

            {!podeExecutar && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200">
                Seu usuário não possui permissão de edição para executar a rotina de limpeza.
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* MODAL DE AJUDA E REGRAS */}
      <ModalAjudaLimpeza open={openAjuda} onOpenChange={setOpenAjuda} />

      {/* MODAL DE CONFIRMAÇÃO COM DUPLA CHECAGEM E PALAVRA LIMPAR */}
      <ModalConfirmacaoLimpeza
        open={openConfirmacao}
        onOpenChange={setOpenConfirmacao}
        totalRegistrosParaExcluir={totalRegistrosParaExcluir}
        preservarAuditoria={preservarAuditoria === 'Sim'}
        preservarCargosFuncoes={preservarCargosFuncoes === 'Sim'}
        onConfirmar={handleConfirmarLimpeza}
        loading={executando}
      />
    </div>
  )
}
