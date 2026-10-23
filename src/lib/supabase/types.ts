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
      anos_series: {
        Row: {
          ano_letivo: number
          codigo: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ano_letivo: number
          codigo?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ano_letivo?: number
          codigo?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      care_vagas: {
        Row: {
          ano_letivo: number
          cargo_id: string
          codigo: string | null
          created_at: string
          crh_codigo: string | null
          crh_configuracao_id: string
          criterio_dimensionamento: string
          funcao_id: string
          id: string
          natureza_cargo: string
          numero_sequencial_vaga: number
          quantidade_referencia: number
          status: string
          unidade_escolar_id: string
          updated_at: string
        }
        Insert: {
          ano_letivo: number
          cargo_id: string
          codigo?: string | null
          created_at?: string
          crh_codigo?: string | null
          crh_configuracao_id: string
          criterio_dimensionamento?: string
          funcao_id: string
          id?: string
          natureza_cargo?: string
          numero_sequencial_vaga?: number
          quantidade_referencia?: number
          status?: string
          unidade_escolar_id: string
          updated_at?: string
        }
        Update: {
          ano_letivo?: number
          cargo_id?: string
          codigo?: string | null
          created_at?: string
          crh_codigo?: string | null
          crh_configuracao_id?: string
          criterio_dimensionamento?: string
          funcao_id?: string
          id?: string
          natureza_cargo?: string
          numero_sequencial_vaga?: number
          quantidade_referencia?: number
          status?: string
          unidade_escolar_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'care_vagas_cargo_id_fkey'
            columns: ['cargo_id']
            isOneToOne: false
            referencedRelation: 'cargos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'care_vagas_crh_configuracao_id_fkey'
            columns: ['crh_configuracao_id']
            isOneToOne: false
            referencedRelation: 'crh_configuracoes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'care_vagas_funcao_id_fkey'
            columns: ['funcao_id']
            isOneToOne: false
            referencedRelation: 'funcoes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'care_vagas_unidade_escolar_id_fkey'
            columns: ['unidade_escolar_id']
            isOneToOne: false
            referencedRelation: 'unidades_escolares'
            referencedColumns: ['id']
          },
        ]
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
      contas_email: {
        Row: {
          ativa: boolean
          codigo: string | null
          created_at: string
          criptografia: string
          descricao: string
          email_from: string
          host: string
          id: string
          limite_diario: number | null
          nome_from: string
          porta: number
          reply_to: string | null
          senha_smtp_encrypted: string | null
          updated_at: string
          usuario_smtp: string
        }
        Insert: {
          ativa?: boolean
          codigo?: string | null
          created_at?: string
          criptografia?: string
          descricao: string
          email_from: string
          host: string
          id?: string
          limite_diario?: number | null
          nome_from: string
          porta?: number
          reply_to?: string | null
          senha_smtp_encrypted?: string | null
          updated_at?: string
          usuario_smtp: string
        }
        Update: {
          ativa?: boolean
          codigo?: string | null
          created_at?: string
          criptografia?: string
          descricao?: string
          email_from?: string
          host?: string
          id?: string
          limite_diario?: number | null
          nome_from?: string
          porta?: number
          reply_to?: string | null
          senha_smtp_encrypted?: string | null
          updated_at?: string
          usuario_smtp?: string
        }
        Relationships: []
      }
      crh_configuracoes: {
        Row: {
          ano_letivo: number
          cargo_id: string
          codigo: string | null
          created_at: string
          funcao_id: string
          id: string
          natureza_cargo: string
          nivel_unidade: string
          por_periodo: string
          por_turma: string
          quantidade_por_funcao: number
          quantidade_profissionais: number
          tipo_atendimento: string
          unidade_escolar_id: string
          updated_at: string
        }
        Insert: {
          ano_letivo: number
          cargo_id: string
          codigo?: string | null
          created_at?: string
          funcao_id: string
          id?: string
          natureza_cargo?: string
          nivel_unidade: string
          por_periodo?: string
          por_turma?: string
          quantidade_por_funcao?: number
          quantidade_profissionais?: number
          tipo_atendimento: string
          unidade_escolar_id: string
          updated_at?: string
        }
        Update: {
          ano_letivo?: number
          cargo_id?: string
          codigo?: string | null
          created_at?: string
          funcao_id?: string
          id?: string
          natureza_cargo?: string
          nivel_unidade?: string
          por_periodo?: string
          por_turma?: string
          quantidade_por_funcao?: number
          quantidade_profissionais?: number
          tipo_atendimento?: string
          unidade_escolar_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'crh_configuracoes_cargo_id_fkey'
            columns: ['cargo_id']
            isOneToOne: false
            referencedRelation: 'cargos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crh_configuracoes_funcao_id_fkey'
            columns: ['funcao_id']
            isOneToOne: false
            referencedRelation: 'funcoes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'crh_configuracoes_unidade_escolar_id_fkey'
            columns: ['unidade_escolar_id']
            isOneToOne: false
            referencedRelation: 'unidades_escolares'
            referencedColumns: ['id']
          },
        ]
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
      etapas: {
        Row: {
          ano_letivo: number
          codigo: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ano_letivo: number
          codigo?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ano_letivo?: number
          codigo?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
      niveis_porte: {
        Row: {
          alunos_max: number | null
          alunos_min: number
          codigo: string | null
          created_at: string
          descricao: string | null
          id: string
          nivel: string
          ordem: number
          tipo_atendimento: string
          updated_at: string
        }
        Insert: {
          alunos_max?: number | null
          alunos_min?: number
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nivel: string
          ordem?: number
          tipo_atendimento: string
          updated_at?: string
        }
        Update: {
          alunos_max?: number | null
          alunos_min?: number
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nivel?: string
          ordem?: number
          tipo_atendimento?: string
          updated_at?: string
        }
        Relationships: []
      }
      permissoes_perfil: {
        Row: {
          codigo: string | null
          created_at: string
          id: string
          menu_key: string
          menu_label: string
          ordem: number
          perfil: string
          pode_editar: boolean
          pode_ver: boolean
          suporta_edicao: boolean
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          id?: string
          menu_key: string
          menu_label: string
          ordem?: number
          perfil: string
          pode_editar?: boolean
          pode_ver?: boolean
          suporta_edicao?: boolean
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          id?: string
          menu_key?: string
          menu_label?: string
          ordem?: number
          perfil?: string
          pode_editar?: boolean
          pode_ver?: boolean
          suporta_edicao?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      permissoes_usuario: {
        Row: {
          codigo: string | null
          created_at: string
          id: string
          menu_key: string
          menu_label: string
          ordem: number
          pode_editar: boolean
          pode_ver: boolean
          suporta_edicao: boolean
          updated_at: string
          usuario_id: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          id?: string
          menu_key: string
          menu_label: string
          ordem?: number
          pode_editar?: boolean
          pode_ver?: boolean
          suporta_edicao?: boolean
          updated_at?: string
          usuario_id: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          id?: string
          menu_key?: string
          menu_label?: string
          ordem?: number
          pode_editar?: boolean
          pode_ver?: boolean
          suporta_edicao?: boolean
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'permissoes_usuario_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuarios_sistema'
            referencedColumns: ['id']
          },
        ]
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
      turmas: {
        Row: {
          ano_letivo: number
          ano_serie_id: string | null
          codigo: string | null
          created_at: string
          etapa_id: string | null
          id: string
          nome: string
          unidade_escolar_id: string | null
          updated_at: string
        }
        Insert: {
          ano_letivo: number
          ano_serie_id?: string | null
          codigo?: string | null
          created_at?: string
          etapa_id?: string | null
          id?: string
          nome: string
          unidade_escolar_id?: string | null
          updated_at?: string
        }
        Update: {
          ano_letivo?: number
          ano_serie_id?: string | null
          codigo?: string | null
          created_at?: string
          etapa_id?: string | null
          id?: string
          nome?: string
          unidade_escolar_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'turmas_ano_serie_id_fkey'
            columns: ['ano_serie_id']
            isOneToOne: false
            referencedRelation: 'anos_series'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'turmas_etapa_id_fkey'
            columns: ['etapa_id']
            isOneToOne: false
            referencedRelation: 'etapas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'turmas_unidade_escolar_id_fkey'
            columns: ['unidade_escolar_id']
            isOneToOne: false
            referencedRelation: 'unidades_escolares'
            referencedColumns: ['id']
          },
        ]
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
      obter_conta_smtp_ativa: {
        Args: { p_encryption_key?: string }
        Returns: {
          codigo: string
          criptografia: string
          descricao: string
          email_from: string
          host: string
          id: string
          limite_diario: number
          nome_from: string
          porta: number
          reply_to: string
          senha_smtp: string
          usuario_smtp: string
        }[]
      }
      salvar_conta_email: {
        Args: {
          p_ativa: boolean
          p_criptografia: string
          p_descricao: string
          p_email_from: string
          p_encryption_key?: string
          p_host: string
          p_id: string
          p_limite_diario: number
          p_nome_from: string
          p_porta: number
          p_reply_to: string
          p_senha_smtp: string
          p_usuario_smtp: string
        }
        Returns: {
          ativa: boolean
          codigo: string | null
          created_at: string
          criptografia: string
          descricao: string
          email_from: string
          host: string
          id: string
          limite_diario: number | null
          nome_from: string
          porta: number
          reply_to: string | null
          senha_smtp_encrypted: string | null
          updated_at: string
          usuario_smtp: string
        }
        SetofOptions: {
          from: '*'
          to: 'contas_email'
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
