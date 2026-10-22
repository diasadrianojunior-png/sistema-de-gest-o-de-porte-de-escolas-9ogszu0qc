import { supabase } from '@/lib/supabase/client'
import { PermissaoPerfil, SistemaMenuKey, PerfilUsuario } from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'

const db = supabase as any

export interface AtualizarPermissaoInput {
  id: string
  pode_ver: boolean
  pode_editar: boolean
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
    key: 'cargos',
    label: 'Cargos',
    path: '/cadastros-apoio/cargos',
    suporta_edicao: true,
    ordem: 3,
    categoria: 'Cadastros de Apoio',
  },
  {
    key: 'funcoes',
    label: 'Funções',
    path: '/cadastros-apoio/funcoes',
    suporta_edicao: true,
    ordem: 4,
    categoria: 'Cadastros de Apoio',
  },
  {
    key: 'usuarios',
    label: 'Usuários',
    path: '/administracao/usuarios',
    suporta_edicao: true,
    ordem: 5,
    categoria: 'Administração do sistema',
  },
  {
    key: 'contas_email',
    label: 'Contas de Email',
    path: '/administracao/contas-email',
    suporta_edicao: true,
    ordem: 6,
    categoria: 'Administração do sistema',
  },
  {
    key: 'auditoria',
    label: 'Auditoria',
    path: '/auditoria',
    suporta_edicao: false,
    ordem: 7,
    categoria: 'Auditoria',
  },
]

/**
 * Busca todas as permissões cadastradas para determinado perfil (por padrão 'Operador')
 */
export const getPermissoesPerfil = async (
  perfil: PerfilUsuario = 'Operador',
): Promise<PermissaoPerfil[]> => {
  const { data, error } = await db
    .from('permissoes_perfil')
    .select('*')
    .eq('perfil', perfil)
    .order('ordem', { ascending: true })

  if (error) {
    console.error(`Erro ao buscar permissões para o perfil ${perfil}:`, error)
    throw error
  }

  return (data as PermissaoPerfil[]) || []
}

/**
 * Atualiza um conjunto de permissões do perfil Operador.
 * Registra o evento de alteração na Auditoria mantendo padrão AUD-XXXX.
 */
export const salvarPermissoesPerfil = async (
  perfil: PerfilUsuario,
  permissoes: Array<{
    id: string
    menu_key: SistemaMenuKey
    menu_label: string
    pode_ver: boolean
    pode_editar: boolean
    suporta_edicao: boolean
  }>,
  permissoesAnteriores?: PermissaoPerfil[],
): Promise<PermissaoPerfil[]> => {
  // Administrador tem permissão total inalterável
  if (perfil === 'Administrador') {
    throw new Error('As permissões do perfil Administrador são totais e inalteráveis.')
  }

  const updates = permissoes.map(async (p) => {
    // Se não suporta edição ou não pode ver, pode_editar deve ser false
    const podeEditarFinal = p.suporta_edicao && p.pode_ver ? p.pode_editar : false
    const podeVerFinal = p.pode_ver

    const { data, error } = await db
      .from('permissoes_perfil')
      .update({
        pode_ver: podeVerFinal,
        pode_editar: podeEditarFinal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id)
      .select()
      .single()

    if (error) {
      console.error(`Erro ao atualizar permissão ${p.menu_key}:`, error)
      throw error
    }
    return data as PermissaoPerfil
  })

  const resultados = await Promise.all(updates)

  // Calcular resumo textual das alterações para o log de auditoria
  const alteracoesDescricao: string[] = []
  if (permissoesAnteriores) {
    const mapaAntigo = new Map(permissoesAnteriores.map((a) => [a.id, a]))
    for (const novo of resultados) {
      const antigo = mapaAntigo.get(novo.id)
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
      }
    }
  }

  const textoAuditoria =
    alteracoesDescricao.length > 0
      ? `Atualização das permissões do perfil ${perfil}. Alterações: ${alteracoesDescricao.join('; ')}.`
      : `Revisão e confirmação das permissões de menu para o perfil ${perfil}.`

  // Registro na Auditoria
  await registrarAuditoria({
    entidade: 'Permissões',
    acao: 'Edição',
    registro_codigo: resultados[0]?.codigo || null,
    descricao: textoAuditoria,
    detalhes: {
      perfil,
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
