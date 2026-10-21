export interface MunicipioRede {
  id: string
  nome: string
  uf: string
  esfera: string
  created_at?: string
  updated_at?: string
}

export interface TipoEscola {
  id: string
  nome: string
  descricao: string | null
  created_at?: string
  updated_at?: string
}

export interface Escola {
  id: string
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
