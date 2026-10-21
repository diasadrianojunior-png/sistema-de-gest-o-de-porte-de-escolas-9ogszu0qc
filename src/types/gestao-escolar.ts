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

export interface Escola {
  id: string
  codigo?: string
  nome: string
  endereco: string
  numero_alunos: number
  numero_servidores: number
  municipio_id: string | null
  tipo_escola_id: string | null
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
