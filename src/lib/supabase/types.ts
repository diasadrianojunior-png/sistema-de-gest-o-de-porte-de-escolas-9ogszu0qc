// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string
          codigo: string | null
          created_at: string
          descricao: string
          detalhes: Json | null
          entidade: string
          id: string
          registro_codigo: string | null
          usuario_email: string
          usuario_id: string | null
          usuario_nome: string
        }
        Insert: {
          acao: string
          codigo?: string | null
          created_at?: string
          descricao: string
          detalhes?: Json | null
          entidade: string
          id?: string
          registro_codigo?: string | null
          usuario_email?: string
          usuario_id?: string | null
          usuario_nome?: string
        }
        Update: {
          acao?: string
          codigo?: string | null
          created_at?: string
          descricao?: string
          detalhes?: Json | null
          entidade?: string
          id?: string
          registro_codigo?: string | null
          usuario_email?: string
          usuario_id?: string | null
          usuario_nome?: string
        }
        Relationships: []
      }
      cargos: {
        Row: {
          codigo: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      escolas: {
        Row: {
          codigo: string | null
          created_at: string
          endereco: string
          id: string
          municipio_id: string | null
          nome: string
          numero_alunos: number
          numero_servidores: number
          tipo_escola_id: string | null
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          endereco?: string
          id?: string
          municipio_id?: string | null
          nome: string
          numero_alunos?: number
          numero_servidores?: number
          tipo_escola_id?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          endereco?: string
          id?: string
          municipio_id?: string | null
          nome?: string
          numero_alunos?: number
          numero_servidores?: number
          tipo_escola_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'escolas_municipio_id_fkey'
            columns: ['municipio_id']
            isOneToOne: false
            referencedRelation: 'municipios_rede'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'escolas_tipo_escola_id_fkey'
            columns: ['tipo_escola_id']
            isOneToOne: false
            referencedRelation: 'tipos_escola'
            referencedColumns: ['id']
          },
        ]
      }
      funcao_cargos: {
        Row: {
          cargo_id: string
          created_at: string
          funcao_id: string
          id: string
        }
        Insert: {
          cargo_id: string
          created_at?: string
          funcao_id: string
          id?: string
        }
        Update: {
          cargo_id?: string
          created_at?: string
          funcao_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'funcao_cargos_cargo_id_fkey'
            columns: ['cargo_id']
            isOneToOne: false
            referencedRelation: 'cargos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'funcao_cargos_funcao_id_fkey'
            columns: ['funcao_id']
            isOneToOne: false
            referencedRelation: 'funcoes'
            referencedColumns: ['id']
          },
        ]
      }
      funcoes: {
        Row: {
          codigo: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      municipios_rede: {
        Row: {
          codigo: string | null
          created_at: string
          esfera: string
          id: string
          nome: string
          uf: string
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          esfera?: string
          id?: string
          nome: string
          uf?: string
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          esfera?: string
          id?: string
          nome?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      tipos_escola: {
        Row: {
          codigo: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      unidades_escolares: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          codigo: string | null
          created_at: string
          estado_uf: string | null
          id: string
          latitude: number | null
          localizacao: string
          logradouro: string | null
          longitude: number | null
          nivel_porte: string
          nome: string
          numero: string | null
          tipo_atendimento: string
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          created_at?: string
          estado_uf?: string | null
          id?: string
          latitude?: number | null
          localizacao: string
          logradouro?: string | null
          longitude?: number | null
          nivel_porte: string
          nome: string
          numero?: string | null
          tipo_atendimento: string
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          created_at?: string
          estado_uf?: string | null
          id?: string
          latitude?: number | null
          localizacao?: string
          logradouro?: string | null
          longitude?: number | null
          nivel_porte?: string
          nome?: string
          numero?: string | null
          tipo_atendimento?: string
          updated_at?: string
        }
        Relationships: []
      }
      usuarios_sistema: {
        Row: {
          codigo: string | null
          created_at: string
          email: string
          estado: string
          id: string
          nome_completo: string
          perfil: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          email: string
          estado?: string
          id?: string
          nome_completo: string
          perfil?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          codigo?: string | null
          created_at?: string
          email?: string
          estado?: string
          id?: string
          nome_completo?: string
          perfil?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
