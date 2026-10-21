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

export type TipoAtendimentoUnidade =
  | 'Ensino Fundamental e Educação Infantil (20h)'
  | 'Educação Infantil (40h)'

export const OPCOES_NIVEL_20H = [
  'Nível I: Até 100 alunos',
  'Nível II: De 101 a 150 alunos',
  'Nível III: De 151 a 220 alunos',
  'Nível IV: De 221 a 320 alunos',
  'Nível V: De 321 a 420 alunos',
  'Nível VI: De 421 a 500 alunos',
  'Nível VII: De 501 a 600 alunos',
  'Nível VIII: Acima de 600 alunos',
] as const

export const OPCOES_NIVEL_40H = [
  'Nível A: Até 90 alunos',
  'Nível B: De 91 a 140 alunos',
  'Nível C: Acima de 141 alunos',
] as const

export const MAPA_LEGADO_NIVEL: Record<string, string> = {
  // Mapeamentos para 20h
  'Nível I': 'Nível I: Até 100 alunos',
  'Até 100 alunos': 'Nível I: Até 100 alunos',
  'Nível II': 'Nível II: De 101 a 150 alunos',
  'De 101 a 150 alunos': 'Nível II: De 101 a 150 alunos',
  'Nível III': 'Nível III: De 151 a 220 alunos',
  'De 151 a 220 alunos': 'Nível III: De 151 a 220 alunos',
  'Nível IV': 'Nível IV: De 221 a 320 alunos',
  'De 221 a 320 alunos': 'Nível IV: De 221 a 320 alunos',
  'Nível V': 'Nível V: De 321 a 420 alunos',
  'De 321 a 420 alunos': 'Nível V: De 321 a 420 alunos',
  'Nível VI': 'Nível VI: De 421 a 500 alunos',
  'De 421 a 500 alunos': 'Nível VI: De 421 a 500 alunos',
  'Nível VII': 'Nível VII: De 501 a 600 alunos',
  'De 501 a 600 alunos': 'Nível VII: De 501 a 600 alunos',
  'Nível VIII': 'Nível VIII: Acima de 600 alunos',
  'Acima de 600 alunos': 'Nível VIII: Acima de 600 alunos',

  // Mapeamentos para 40h
  'Nível A': 'Nível A: Até 90 alunos',
  'Até 90 alunos': 'Nível A: Até 90 alunos',
  'Nível B': 'Nível B: De 91 a 140 alunos',
  'De 91 a 140 alunos': 'Nível B: De 91 a 140 alunos',
  'Nível C': 'Nível C: Acima de 141 alunos',
  'Acima de 141 alunos': 'Nível C: Acima de 141 alunos',
}

export function normalizarNivelPorte(tipoAtendimento: string, nivelPorte: string): string {
  if (!nivelPorte) return ''
  const trimmed = nivelPorte.trim()
  if (tipoAtendimento === 'Ensino Fundamental e Educação Infantil (20h)') {
    if ((OPCOES_NIVEL_20H as readonly string[]).includes(trimmed)) return trimmed
    if (MAPA_LEGADO_NIVEL[trimmed]) return MAPA_LEGADO_NIVEL[trimmed]
  } else if (tipoAtendimento === 'Educação Infantil (40h)') {
    if ((OPCOES_NIVEL_40H as readonly string[]).includes(trimmed)) return trimmed
    if (MAPA_LEGADO_NIVEL[trimmed]) return MAPA_LEGADO_NIVEL[trimmed]
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
  | 'Usuários'
  | 'Contas de E-mail'
  | 'Autenticação'

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
