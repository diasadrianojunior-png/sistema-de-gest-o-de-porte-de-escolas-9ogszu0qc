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

export type TipoAtendimentoUnidade =
  | 'Ensino Fundamental e Educação Infantil (20h)'
  | 'Educação Infantil (40h)'

export const OPCOES_NIVEL_20H = [
  'Nível I',
  'Nível II',
  'Nível III',
  'Nível IV',
  'Nível V',
  'Nível VI',
  'Nível VII',
  'Nível VIII',
  'Até 100 alunos',
  'De 101 a 150 alunos',
  'De 151 a 220 alunos',
  'De 221 a 320 alunos',
  'De 321 a 420 alunos',
  'De 421 a 500 alunos',
  'De 501 a 600 alunos',
  'Acima de 600 alunos',
] as const

export const OPCOES_NIVEL_40H = [
  'Nível A',
  'Nível B',
  'Nível C',
  'Até 90 alunos',
  'De 91 a 140 alunos',
  'Acima de 141 alunos',
] as const

export interface UnidadeEscolar {
  id: string
  codigo?: string
  nome: string
  tipo_atendimento: TipoAtendimentoUnidade
  nivel_porte: string
  localizacao: string
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
