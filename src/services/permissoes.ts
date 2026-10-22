import { supabase } from '@/lib/supabase/client'
import { PermissaoUsuario, SistemaMenuKey } from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'

const db = supabase as any

export interface PermissaoItemForm {
  id?: string
  codigo?: string
  menu_key: SistemaMenuKey
  menu_label: string
  pode_ver: boolean
  pode_editar: boolean
  suporta_edicao: boolean
  ordem: number
}

export const MENUS_SISTEMA_PADRAO: Array<{
  key: SistemaMenuKey
  label: string
  path: string
  suporta_edicao: boolean
  ordem: number
  categoria: string
}> = [
  {
    key: 'painel',
    label: 'Painel de Início',
    path: '/painel',
    suporta_edicao: false,
    ordem: 1,
    categoria: 'Principal',
  },
  {
    key: 'unidades_escolares',
    label: 'Unidades escolares',
    path: '/cadastros-mestres',
    suporta_edicao: true,
    ordem: 2,
    categoria: 'Cadastros Mestres',
  },
  {
    key: 'turmas',
    label: 'Turmas',
    path: '/cadastros-mestres/turmas',
    suporta_edicao: true,
    ordem: 3,
    categoria: 'Cadastros Mestres',
  },
  {
    key: 'cargos',
    label: 'Cargos',
    path: '/cadastros-apoio/cargos',
    suporta_edicao: true,
    ordem: 4,
    categoria: 'Cadastros de Apoio',
  },
  {
    key: 'funcoes',
    label: 'Funções',
    path: '/cadastros-apoio/funcoes',
    suporta_edicao: true,
    ordem: 5,
    categoria: 'Cadastros de Apoio',
  },
  {
    key: 'etapas',
    label: 'Etapas',
    path: '/cadastros-apoio/etapas',
    suporta_edicao: true,
    ordem: 6,
    categoria: 'Cadastros de Apoio',
  },
  {
    key: 'anos_series',
    label: 'Ano/Série',
    path: '/cadastros-apoio/anos-series',
    suporta_edicao: true,
    ordem: 7,
    categoria: 'Cadastros de Apoio',
  },
  {
    key: 'crh',
    label: 'Configurações de RH (CRH)',
    path: '/cadastros-apoio/crh',
    suporta_edicao: true,
    ordem: 8,
    categoria: 'Cadastros de Apoio',
  },
  {
    key: 'usuarios',
    label: 'Usuários',
    path: '/administracao/usuarios',
    suporta_edicao: true,
    ordem: 9,
    categoria: 'Administração do sistema',
  },
  {
    key: 'contas_email',
    label: 'Contas de Email',
    path: '/administracao/contas-email',
    suporta_edicao: true,
    ordem: 10,
    categoria: 'Administração do sistema',
  },
  {
    key: 'auditoria',
    label: 'Auditoria',
    path: '/auditoria',
    suporta_edicao: false,
    ordem: 11,
    categoria: 'Auditoria',
  },
]

/**
 * Gera conjunto padrão de permissões para inicializar formulário de novo operador
 */
export const getPermissoesPadraoOperador = (): PermissaoItemForm[] => {
  return [
    {
      menu_key: 'painel',
      menu_label: 'Painel de Início',
      pode_ver: true,
      pode_editar: false,
      suporta_edicao: false,
      ordem: 1,
    },
    {
      menu_key: 'unidades_escolares',
      menu_label: 'Unidades escolares',
      pode_ver: true,
      pode_editar: false,
      suporta_edicao: true,
      ordem: 2,
    },
    {
      menu_key: 'turmas',
      menu_label: 'Turmas',
      pode_ver: true,
      pode_editar: true,
      suporta_edicao: true,
      ordem: 3,
    },
    {
      menu_key: 'cargos',
      menu_label: 'Cargos',
      pode_ver: true,
      pode_editar: false,
      suporta_edicao: true,
      ordem: 4,
    },
    {
      menu_key: 'funcoes',
      menu_label: 'Funções',
      pode_ver: true,
      pode_editar: false,
      suporta_edicao: true,
      ordem: 5,
    },
    {
      menu_key: 'etapas',
      menu_label: 'Etapas',
      pode_ver: true,
      pode_editar: true,
      suporta_edicao: true,
      ordem: 6,
    },
    {
      menu_key: 'anos_series',
      menu_label: 'Ano/Série',
      pode_ver: true,
      pode_editar: true,
      suporta_edicao: true,
      ordem: 7,
    },
    {
      menu_key: 'crh',
      menu_label: 'Configurações de RH (CRH)',
      pode_ver: true,
      pode_editar: true,
      suporta_edicao: true,
      ordem: 8,
    },
    {
      menu_key: 'usuarios',
      menu_label: 'Usuários',
      pode_ver: false,
      pode_editar: false,
      suporta_edicao: true,
      ordem: 9,
    },
    {
      menu_key: 'contas_email',
      menu_label: 'Contas de Email',
      pode_ver: false,
      pode_editar: false,
      suporta_edicao: true,
      ordem: 10,
    },
    {
      menu_key: 'auditoria',
      menu_label: 'Auditoria',
      pode_ver: true,
      pode_editar: false,
      suporta_edicao: false,
      ordem: 11,
    },
  ]
}

/**
 * Busca todas as permissões cadastradas para determinado usuário
 */
export const getPermissoesUsuario = async (usuarioId: string): Promise<PermissaoUsuario[]> => {
  if (!usuarioId) return []

  const { data, error } = await db
    .from('permissoes_usuario')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('ordem', { ascending: true })

  if (error) {
    console.error(`Erro ao buscar permissões do usuário ${usuarioId}:`, error)
    throw error
  }

  return (data as PermissaoUsuario[]) || []
}

/**
 * Salva (upsert) as permissões individuais de um operador e registra na Auditoria.
 */
export const salvarPermissoesUsuario = async (
  usuarioId: string,
  usuarioNome: string,
  usuarioEmail: string,
  permissoes: PermissaoItemForm[],
  permissoesAnteriores?: PermissaoUsuario[],
  usuarioCodigo?: string,
): Promise<PermissaoUsuario[]> => {
  if (!usuarioId) {
    throw new Error('ID do usuário é obrigatório para salvar permissões.')
  }

  // Sanitizar regras: se não pode_ver ou não suporta edição, pode_editar = false
  const rows = permissoes.map((p) => {
    const podeVerFinal = Boolean(p.pode_ver)
    const podeEditarFinal = p.suporta_edicao && podeVerFinal ? Boolean(p.pode_editar) : false

    return {
      usuario_id: usuarioId,
      menu_key: p.menu_key,
      menu_label: p.menu_label,
      pode_ver: podeVerFinal,
      pode_editar: podeEditarFinal,
      suporta_edicao: p.suporta_edicao,
      ordem: p.ordem,
      updated_at: new Date().toISOString(),
    }
  })

  // Upsert com chave de unicidade (usuario_id, menu_key)
  const { data, error } = await db
    .from('permissoes_usuario')
    .upsert(rows, { onConflict: 'usuario_id,menu_key' })
    .select()
    .order('ordem', { ascending: true })

  if (error) {
    console.error('Erro ao salvar permissões do usuário:', error)
    throw error
  }

  const resultados = (data as PermissaoUsuario[]) || []

  // Calcular resumo textual das alterações para o log de auditoria
  const alteracoesDescricao: string[] = []
  if (permissoesAnteriores && permissoesAnteriores.length > 0) {
    const mapaAntigo = new Map(permissoesAnteriores.map((a) => [a.menu_key, a]))
    for (const novo of resultados) {
      const antigo = mapaAntigo.get(novo.menu_key)
      if (antigo) {
        const mudouVer = antigo.pode_ver !== novo.pode_ver
        const mudouEditar = antigo.pode_editar !== novo.pode_editar
        if (mudouVer || mudouEditar) {
          const partes: string[] = []
          if (mudouVer) {
            partes.push(
              `Ver: ${antigo.pode_ver ? 'Sim' : 'Não'} → ${novo.pode_ver ? 'Sim' : 'Não'}`,
            )
          }
          if (mudouEditar) {
            partes.push(
              `Editar: ${antigo.pode_editar ? 'Sim' : 'Não'} → ${novo.pode_editar ? 'Sim' : 'Não'}`,
            )
          }
          alteracoesDescricao.push(`${novo.menu_label} (${partes.join(', ')})`)
        }
      } else {
        alteracoesDescricao.push(`${novo.menu_label} (adicionado)`)
      }
    }
  }

  const textoAuditoria =
    alteracoesDescricao.length > 0
      ? `Configuração de permissões do operador "${usuarioNome}" (${usuarioEmail}). Alterações: ${alteracoesDescricao.join('; ')}.`
      : `Definição inicial de permissões de acesso do operador "${usuarioNome}" (${usuarioEmail}).`

  await registrarAuditoria({
    entidade: 'Permissões',
    acao: permissoesAnteriores && permissoesAnteriores.length > 0 ? 'Edição' : 'Criação',
    registro_codigo: usuarioCodigo || resultados[0]?.codigo || null,
    descricao: textoAuditoria,
    detalhes: {
      usuario_id: usuarioId,
      usuario_nome: usuarioNome,
      usuario_email: usuarioEmail,
      usuario_codigo: usuarioCodigo,
      permissoes: resultados.map((r) => ({
        menu_key: r.menu_key,
        menu_label: r.menu_label,
        pode_ver: r.pode_ver,
        pode_editar: r.pode_editar,
      })),
      alteracoes: alteracoesDescricao,
    },
  })

  return resultados
}
