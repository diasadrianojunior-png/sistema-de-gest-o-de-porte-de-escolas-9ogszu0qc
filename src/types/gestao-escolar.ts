export interface MunicipioRede {
  id: string
  codigo?: string
  nome: string
  uf: string
  esfera: string
  created_at?: string
  updated_at?: string
}

export interface TipoEscola {
  id: string
  codigo?: string
  nome: string
  descricao: string | null
  created_at?: string
  updated_at?: string
}

export interface Cargo {
  id: string
  codigo?: string
  nome: string
  created_at?: string
  updated_at?: string
}

export interface Funcao {
  id: string
  codigo?: string
  nome: string
  created_at?: string
  updated_at?: string
  cargos_vinculados?: Cargo[]
}

export interface FuncaoCargoVinculo {
  id: string
  funcao_id: string
  cargo_id: string
  created_at?: string
}

export interface Etapa {
  id: string
  codigo?: string
  nome: string
  ano_letivo: number
  created_at?: string
  updated_at?: string
}

export interface AnoSerie {
  id: string
  codigo?: string
  nome: string
  ano_letivo: number
  created_at?: string
  updated_at?: string
}

export type TipoAtendimentoUnidade =
  | 'Ensino Fundamental e Educação Infantil (20h)'
  | 'Educação Infantil (40h)'

export const OPCOES_NIVEL_20H = [
  'Nível 1 (até 100 alunos)',
  'Nível 2 (101 a 250 alunos)',
  'Nível 3 (251 a 500 alunos)',
  'Nível 4 (501 a 750 alunos)',
  'Nível 5 (751 a 1.000 alunos)',
  'Nível 6 (1.001 a 1.250 alunos)',
  'Nível 7 (1.251 a 1.500 alunos)',
  'Nível 8 (mais de 1.500 alunos)',
] as const

export const OPCOES_NIVEL_40H = [
  'Até 100 alunos',
  '101 a 200 alunos',
  'Mais de 200 alunos',
] as const

export const MAPA_LEGADO_NIVEL: Record<string, string> = {
  // Variações e formatos legados para Ensino Fundamental e Educação Infantil (20h)
  'Nível 1 (até 100 alunos)': 'Nível 1 (até 100 alunos)',
  'Nível 1': 'Nível 1 (até 100 alunos)',
  'Nível I': 'Nível 1 (até 100 alunos)',
  'Nível I: Até 100 alunos': 'Nível 1 (até 100 alunos)',
  'Porte 1': 'Nível 1 (até 100 alunos)',
  'Nível 2 (101 a 250 alunos)': 'Nível 2 (101 a 250 alunos)',
  'Nível 2': 'Nível 2 (101 a 250 alunos)',
  'Nível II': 'Nível 2 (101 a 250 alunos)',
  'Nível II: De 101 a 150 alunos': 'Nível 2 (101 a 250 alunos)',
  'Porte 2': 'Nível 2 (101 a 250 alunos)',
  'Nível 3 (251 a 500 alunos)': 'Nível 3 (251 a 500 alunos)',
  'Nível 3': 'Nível 3 (251 a 500 alunos)',
  'Nível III': 'Nível 3 (251 a 500 alunos)',
  'Nível III: De 151 a 220 alunos': 'Nível 3 (251 a 500 alunos)',
  'Porte 3': 'Nível 3 (251 a 500 alunos)',
  'Nível 4 (501 a 750 alunos)': 'Nível 4 (501 a 750 alunos)',
  'Nível 4': 'Nível 4 (501 a 750 alunos)',
  'Nível IV': 'Nível 4 (501 a 750 alunos)',
  'Nível IV: De 221 a 320 alunos': 'Nível 4 (501 a 750 alunos)',
  'Porte 4': 'Nível 4 (501 a 750 alunos)',
  'Nível 5 (751 a 1.000 alunos)': 'Nível 5 (751 a 1.000 alunos)',
  'Nível 5': 'Nível 5 (751 a 1.000 alunos)',
  'Nível V': 'Nível V (751 a 1.000 alunos)',
  'Nível V: De 321 a 420 alunos': 'Nível 5 (751 a 1.000 alunos)',
  'Porte 5': 'Nível 5 (751 a 1.000 alunos)',
  'Nível 6 (1.001 a 1.250 alunos)': 'Nível 6 (1.001 a 1.250 alunos)',
  'Nível 6': 'Nível 6 (1.001 a 1.250 alunos)',
  'Nível VI': 'Nível 6 (1.001 a 1.250 alunos)',
  'Nível VI: De 421 a 500 alunos': 'Nível 6 (1.001 a 1.250 alunos)',
  'Porte 6': 'Nível 6 (1.001 a 1.250 alunos)',
  'Nível 7 (1.251 a 1.500 alunos)': 'Nível 7 (1.251 a 1.500 alunos)',
  'Nível 7': 'Nível 7 (1.251 a 1.500 alunos)',
  'Nível VII': 'Nível 7 (1.251 a 1.500 alunos)',
  'Nível VII: De 501 a 600 alunos': 'Nível 7 (1.251 a 1.500 alunos)',
  'Porte 7': 'Nível 7 (1.251 a 1.500 alunos)',
  'Nível 8 (mais de 1.500 alunos)': 'Nível 8 (mais de 1.500 alunos)',
  'Nível 8': 'Nível 8 (mais de 1.500 alunos)',
  'Nível VIII': 'Nível 8 (mais de 1.500 alunos)',
  'Nível VIII: Acima de 600 alunos': 'Nível 8 (mais de 1.500 alunos)',
  'Porte 8': 'Nível 8 (mais de 1.500 alunos)',

  // Variações e formatos legados para Educação Infantil (40h)
  'Até 100 alunos': 'Até 100 alunos',
  'Nível A': 'Até 100 alunos',
  'Nível A: Até 90 alunos': 'Até 100 alunos',
  'Faixa 1': 'Até 100 alunos',
  '101 a 200 alunos': '101 a 200 alunos',
  'Nível B': '101 a 200 alunos',
  'Nível B: De 91 a 140 alunos': '101 a 200 alunos',
  'Faixa 2': '101 a 200 alunos',
  'Mais de 200 alunos': 'Mais de 200 alunos',
  'Nível C': 'Mais de 200 alunos',
  'Nível C: Acima de 141 alunos': 'Mais de 200 alunos',
  'Faixa 3': 'Mais de 200 alunos',
}

export function normalizarNivelPorte(tipoAtendimento: string, nivelPorte: string): string {
  if (!nivelPorte) return ''
  const trimmed = nivelPorte.trim()
  if (tipoAtendimento === 'Ensino Fundamental e Educação Infantil (20h)') {
    if ((OPCOES_NIVEL_20H as readonly string[]).includes(trimmed)) return trimmed
    if (MAPA_LEGADO_NIVEL[trimmed]) return MAPA_LEGADO_NIVEL[trimmed]
    // Tenta encontrar por prefixo ou correspondência suave
    const match = OPCOES_NIVEL_20H.find((op) => op.toLowerCase().includes(trimmed.toLowerCase()))
    if (match) return match
  } else if (tipoAtendimento === 'Educação Infantil (40h)') {
    if ((OPCOES_NIVEL_40H as readonly string[]).includes(trimmed)) return trimmed
    if (MAPA_LEGADO_NIVEL[trimmed]) return MAPA_LEGADO_NIVEL[trimmed]
    const match = OPCOES_NIVEL_40H.find((op) => op.toLowerCase().includes(trimmed.toLowerCase()))
    if (match) return match
  }
  return MAPA_LEGADO_NIVEL[trimmed] || trimmed
}

export interface UnidadeEscolar {
  id: string
  codigo?: string
  nome: string
  tipo_atendimento: TipoAtendimentoUnidade
  nivel_porte: string
  localizacao: string
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  estado_uf?: string | null
  cidade?: string | null
  latitude?: number | null
  longitude?: number | null
  created_at?: string
  updated_at?: string
}

// Compatibilidade transitória se necessário
export interface Escola {
  id: string
  codigo?: string
  nome: string
  endereco?: string
  numero_alunos?: number
  numero_servidores?: number
  municipio_id?: string | null
  tipo_escola_id?: string | null
  created_at?: string
  updated_at?: string
  municipio?: MunicipioRede | null
  tipo_escola?: TipoEscola | null
}

export type PerfilUsuario = 'Administrador' | 'Operador'
export type EstadoUsuario = 'Ativo' | 'Inativo'

export interface UsuarioSistema {
  id: string
  user_id?: string | null
  codigo?: string
  nome_completo: string
  email: string
  perfil: PerfilUsuario
  estado: EstadoUsuario
  created_at?: string
  updated_at?: string
}

export type AcaoAuditoria = 'Criação' | 'Edição' | 'Exclusão' | 'Login'

export type CriptografiaSmtp = 'TLS' | 'SSL' | 'NENHUMA'

export interface ContaEmail {
  id: string
  codigo?: string
  descricao: string
  ativa: boolean
  host: string
  porta: number
  criptografia: CriptografiaSmtp
  usuario_smtp: string
  email_from: string
  nome_from: string
  reply_to?: string | null
  limite_diario?: number | null
  created_at?: string
  updated_at?: string
}

export interface SalvarContaEmailInput {
  id?: string
  descricao: string
  ativa: boolean
  host: string
  porta: number
  criptografia: CriptografiaSmtp
  usuario_smtp: string
  senha_smtp?: string
  email_from: string
  nome_from: string
  reply_to?: string | null
  limite_diario?: number | null
}

export type EntidadeAuditoria =
  | 'Unidades escolares'
  | 'Municípios/Redes'
  | 'Tipos de escola'
  | 'Cargos'
  | 'Funções'
  | 'Etapas'
  | 'Ano/Série'
  | 'Usuários'
  | 'Contas de E-mail'
  | 'Permissões'
  | 'Autenticação'

export type SistemaMenuKey =
  | 'painel'
  | 'unidades_escolares'
  | 'cargos'
  | 'funcoes'
  | 'etapas'
  | 'anos_series'
  | 'usuarios'
  | 'contas_email'
  | 'auditoria'

export interface PermissaoPerfil {
  id: string
  codigo?: string
  perfil: PerfilUsuario
  menu_key: SistemaMenuKey
  menu_label: string
  pode_ver: boolean
  pode_editar: boolean
  suporta_edicao: boolean
  ordem: number
  created_at?: string
  updated_at?: string
}

export interface PermissaoUsuario {
  id: string
  codigo?: string
  usuario_id: string
  menu_key: SistemaMenuKey
  menu_label: string
  pode_ver: boolean
  pode_editar: boolean
  suporta_edicao: boolean
  ordem: number
  created_at?: string
  updated_at?: string
}

export interface RegistroAuditoria {
  id: string
  codigo?: string
  registro_codigo?: string | null
  entidade: EntidadeAuditoria | string
  acao: AcaoAuditoria | string
  descricao: string
  usuario_id?: string | null
  usuario_nome: string
  usuario_email: string
  detalhes?: Record<string, any> | null
  created_at: string
}
