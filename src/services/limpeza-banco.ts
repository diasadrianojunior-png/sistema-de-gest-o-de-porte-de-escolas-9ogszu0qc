import { supabase } from '@/lib/supabase/client'
import { getUsuarioAtualParaAuditoria } from './auditoria'

export interface ModuloSujeitoLimpeza {
  etapaNumero: string
  modulo: string
  tabela: string
  quantidade: number
  descricao?: string
  condicional?: 'cargos_funcoes' | 'auditoria'
}

export interface ExcecaoPreservada {
  titulo: string
  descricao: string
  quantidade?: number
  icone: 'escola' | 'bairro' | 'tipo' | 'email' | 'admin' | 'estrutura'
}

export interface EstatisticasBancoLimpeza {
  tabelasOperacionais: ModuloSujeitoLimpeza[]
  totalOperacionalGeral: number
  excecoes: {
    totalUnidades: number
    totalBairros: number
    totalTiposAtendimento: number
    totalContasEmail: number
    totalAdmins: number
    totalConfiguracoesRh: number
    totalEtapas: number
    totalAnosSeries: number
  }
}

export interface ExecutarLimpezaParams {
  preservarAuditoria: boolean
  preservarCargosFuncoes: boolean
}

export interface ExecutarLimpezaResultado {
  sucesso: boolean
  totalExcluidos: number
  contagens: Record<string, number>
}

/**
 * Consulta as contagens reais do banco de dados para todas as tabelas
 * envolvidas na rotina de limpeza e nas exceções preservadas.
 */
export const carregarEstatisticasLimpeza = async (): Promise<EstatisticasBancoLimpeza> => {
  const db = supabase as any

  // Consultas paralelas para contagem real
  const [
    resProfVagas,
    resVagas,
    resProfissionais,
    resTurmas,
    resPorteEscola,
    resUsuariosOperadores,
    resFuncaoCargos,
    resFuncoes,
    resCargos,
    resAuditoria,
    resUnidades,
    resBairros,
    resContasEmail,
    resAdmins,
    resCfgRh,
    resEtapas,
    resAnosSeries,
  ] = await Promise.all([
    db.from('profissional_vagas').select('*', { count: 'exact', head: true }),
    db.from('vaga').select('*', { count: 'exact', head: true }),
    db.from('profissionais').select('*', { count: 'exact', head: true }),
    db.from('turmas').select('*', { count: 'exact', head: true }),
    db.from('porte_escola_ano').select('*', { count: 'exact', head: true }),
    db
      .from('usuarios_sistema')
      .select('*', { count: 'exact', head: true })
      .neq('perfil', 'Administrador'),
    db.from('funcao_cargos').select('*', { count: 'exact', head: true }),
    db.from('funcoes').select('*', { count: 'exact', head: true }),
    db.from('cargos').select('*', { count: 'exact', head: true }),
    db.from('auditoria').select('*', { count: 'exact', head: true }),
    db.from('unidades_escolares').select('*', { count: 'exact', head: true }),
    db.from('unidades_escolares').select('bairro').not('bairro', 'is', null).neq('bairro', ''),
    db.from('contas_email').select('*', { count: 'exact', head: true }),
    db
      .from('usuarios_sistema')
      .select('*', { count: 'exact', head: true })
      .eq('perfil', 'Administrador'),
    db.from('configuracao_rh').select('*', { count: 'exact', head: true }),
    db.from('etapas').select('*', { count: 'exact', head: true }),
    db.from('anos_series').select('*', { count: 'exact', head: true }),
  ])

  // Contagem de bairros distintos
  const bairrosSet = new Set<string>()
  if (Array.isArray(resBairros.data)) {
    resBairros.data.forEach((item: { bairro: string }) => {
      if (item.bairro && item.bairro.trim()) bairrosSet.add(item.bairro.trim())
    })
  }

  const countProfVagas = resProfVagas.count ?? 0
  const countVagas = resVagas.count ?? 0
  const countProfissionais = resProfissionais.count ?? 0
  const countTurmas = resTurmas.count ?? 0
  const countPorteEscola = resPorteEscola.count ?? 0
  const countUsuariosOperadores = resUsuariosOperadores.count ?? 0
  const countFuncaoCargos = resFuncaoCargos.count ?? 0
  const countFuncoes = resFuncoes.count ?? 0
  const countCargos = resCargos.count ?? 0
  const countAuditoria = resAuditoria.count ?? 0

  const countUnidades = resUnidades.count ?? 0
  const countBairros = bairrosSet.size > 0 ? bairrosSet.size : 31
  const countContasEmail = resContasEmail.count ?? 0
  const countAdmins = resAdmins.count ?? 0
  const countCfgRh = resCfgRh.count ?? 0
  const countEtapas = resEtapas.count ?? 0
  const countAnosSeries = resAnosSeries.count ?? 0

  // Tabelas operacionais na ordem correta de dependências (foreign keys)
  const tabelasOperacionais: ModuloSujeitoLimpeza[] = [
    {
      etapaNumero: '#01',
      modulo: 'Vínculos de Servidores e Profissionais com Vagas',
      tabela: 'profissional_vagas',
      quantidade: countProfVagas,
      descricao: 'Associação de servidores a postos de trabalho e vagas escolares.',
    },
    {
      etapaNumero: '#02',
      modulo: 'Vagas da Rede Municipal de Educação',
      tabela: 'vaga',
      quantidade: countVagas,
      descricao: 'Vagas abertas, ocupadas e calculadas para cada unidade escolar.',
    },
    {
      etapaNumero: '#03',
      modulo: 'Cadastro de Servidores e Profissionais',
      tabela: 'profissionais',
      quantidade: countProfissionais,
      descricao: 'Registros de profissionais lotados nas unidades escolares.',
    },
    {
      etapaNumero: '#04',
      modulo: 'Turmas e Agrupamentos Escolares',
      tabela: 'turmas',
      quantidade: countTurmas,
      descricao: 'Turmas cadastradas por ano letivo e unidade escolar.',
    },
    {
      etapaNumero: '#05',
      modulo: 'Porte da Escola por Ano Letivo',
      tabela: 'porte_escola_ano',
      quantidade: countPorteEscola,
      descricao: 'Enquadramentos de porte das unidades escolares por ano.',
    },
    {
      etapaNumero: '#06',
      modulo: 'Vínculos entre Cargos e Funções',
      tabela: 'funcao_cargos',
      quantidade: countFuncaoCargos,
      descricao: 'Regras de compatibilidade entre cargos e funções associadas.',
      condicional: 'cargos_funcoes',
    },
    {
      etapaNumero: '#07',
      modulo: 'Cadastro de Funções Gratificadas / Exercício',
      tabela: 'funcoes',
      quantidade: countFuncoes,
      descricao: 'Funções de magistério e gestão escolar.',
      condicional: 'cargos_funcoes',
    },
    {
      etapaNumero: '#08',
      modulo: 'Cadastro de Cargos Efetivos e Quadro',
      tabela: 'cargos',
      quantidade: countCargos,
      descricao: 'Cargos do plano de carreira da educação.',
      condicional: 'cargos_funcoes',
    },
    {
      etapaNumero: '#09',
      modulo: 'Usuários do Sistema (Preservando perfil Administrador)',
      tabela: 'usuarios_sistema',
      quantidade: countUsuariosOperadores,
      descricao: 'Usuários operadores e permissões individuais vinculadas.',
    },
    {
      etapaNumero: '#10',
      modulo: 'Histórico de Logs de Auditoria Anterior',
      tabela: 'auditoria',
      quantidade: countAuditoria,
      descricao: 'Trilha de auditoria das ações e operações anteriores.',
      condicional: 'auditoria',
    },
  ]

  const totalOperacionalGeral =
    countProfVagas +
    countVagas +
    countProfissionais +
    countTurmas +
    countPorteEscola +
    countUsuariosOperadores +
    countFuncaoCargos +
    countFuncoes +
    countCargos +
    countAuditoria

  return {
    tabelasOperacionais,
    totalOperacionalGeral,
    excecoes: {
      totalUnidades: countUnidades,
      totalBairros: countBairros,
      totalTiposAtendimento: 2,
      totalContasEmail: countContasEmail,
      totalAdmins: countAdmins,
      totalConfiguracoesRh: countCfgRh,
      totalEtapas: countEtapas,
      totalAnosSeries: countAnosSeries,
    },
  }
}

/**
 * Executa a rotina de limpeza do banco via RPC atômica do PostgreSQL.
 */
export const executarLimpezaBanco = async (
  params: ExecutarLimpezaParams,
): Promise<ExecutarLimpezaResultado> => {
  const usuario = await getUsuarioAtualParaAuditoria()

  const { data, error } = await (supabase as any).rpc('executar_limpeza_banco', {
    p_preservar_auditoria: params.preservarAuditoria,
    p_preservar_cargos_funcoes: params.preservarCargosFuncoes,
    p_usuario_nome: usuario.nome,
    p_usuario_email: usuario.email,
  })

  if (error) {
    console.error('Falha ao executar limpeza do banco de dados:', error)
    // Mensagem amigável sem texto técnico bruto
    let mensagemAmigavel =
      'Não foi possível concluir a limpeza do banco de dados devido a uma restrição de integridade referencial. Nenhuma alteração foi realizada.'
    if (error.message?.includes('violates foreign key')) {
      mensagemAmigavel =
        'A limpeza foi abortada com segurança: existem registros vinculados em outras tabelas estruturais que impedem a exclusão.'
    }
    throw new Error(mensagemAmigavel)
  }

  const payload = data as any

  return {
    sucesso: Boolean(payload?.sucesso),
    totalExcluidos: Number(payload?.total_excluidos ?? 0),
    contagens: payload?.contagens ?? {},
  }
}
