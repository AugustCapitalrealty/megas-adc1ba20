export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      anexos: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          nome_arquivo: string
          solicitacao_id: string
          storage_path: string
          tamanho_bytes: number | null
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          solicitacao_id: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          solicitacao_id?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "anexos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      clientes_empreendimentos: {
        Row: {
          cliente_id: string
          created_at: string
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          id?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          empreendimento?: Database["public"]["Enums"]["empreendimento"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empreendimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_emitidos: {
        Row: {
          created_at: string
          emitido_por: string
          id: string
          nome_arquivo: string
          numero_documento: string
          observacao: string | null
          solicitacao_id: string
          storage_path: string
          tipo_documento: string
        }
        Insert: {
          created_at?: string
          emitido_por: string
          id?: string
          nome_arquivo: string
          numero_documento: string
          observacao?: string | null
          solicitacao_id: string
          storage_path: string
          tipo_documento: string
        }
        Update: {
          created_at?: string
          emitido_por?: string
          id?: string
          nome_arquivo?: string
          numero_documento?: string
          observacao?: string | null
          solicitacao_id?: string
          storage_path?: string
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_emitidos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cidade: string | null
          cnpj: string
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          is_mei: boolean | null
          nome_fantasia: string | null
          razao_social: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cnpj: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          is_mei?: boolean | null
          nome_fantasia?: string | null
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cnpj?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          is_mei?: boolean | null
          nome_fantasia?: string | null
          razao_social?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      historico_solicitacoes: {
        Row: {
          acao: string
          created_at: string
          id: string
          motivo: string | null
          solicitacao_id: string
          status_anterior: Database["public"]["Enums"]["request_status"] | null
          status_novo: Database["public"]["Enums"]["request_status"] | null
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          motivo?: string | null
          solicitacao_id: string
          status_anterior?: Database["public"]["Enums"]["request_status"] | null
          status_novo?: Database["public"]["Enums"]["request_status"] | null
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          motivo?: string | null
          solicitacao_id?: string
          status_anterior?: Database["public"]["Enums"]["request_status"] | null
          status_novo?: Database["public"]["Enums"]["request_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_solicitacoes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          solicitacao_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          solicitacao_id?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          solicitacao_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      solicitacoes: {
        Row: {
          cliente_id: string | null
          contrato_mensal: boolean | null
          created_at: string
          custo_cliente: boolean | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string
          dias_garantia: number | null
          dias_garantia_produto: number | null
          dias_garantia_servico: number | null
          emergencial: boolean | null
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          faturamento_direto: boolean | null
          fornecedor_concorrente_1_id: string | null
          fornecedor_concorrente_2_id: string | null
          fornecedor_id: string | null
          id: string
          justificativa_fornecedores: string | null
          natureza_orcamentaria: Database["public"]["Enums"]["natureza_orcamentaria"]
          origem_custo: Database["public"]["Enums"]["origem_custo"]
          parcelas: number | null
          protocolo: string
          retencao_6_porcento: boolean | null
          status: Database["public"]["Enums"]["request_status"]
          tipo: Database["public"]["Enums"]["request_type"]
          tipo_contratacao:
            | Database["public"]["Enums"]["tipo_contratacao"]
            | null
          tipo_garantia: Database["public"]["Enums"]["tipo_garantia"] | null
          updated_at: string
          user_id: string
          valor: number
          valor_material: number | null
          valor_servico: number | null
        }
        Insert: {
          cliente_id?: string | null
          contrato_mensal?: boolean | null
          created_at?: string
          custo_cliente?: boolean | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao: string
          dias_garantia?: number | null
          dias_garantia_produto?: number | null
          dias_garantia_servico?: number | null
          emergencial?: boolean | null
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          faturamento_direto?: boolean | null
          fornecedor_concorrente_1_id?: string | null
          fornecedor_concorrente_2_id?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa_fornecedores?: string | null
          natureza_orcamentaria: Database["public"]["Enums"]["natureza_orcamentaria"]
          origem_custo?: Database["public"]["Enums"]["origem_custo"]
          parcelas?: number | null
          protocolo: string
          retencao_6_porcento?: boolean | null
          status?: Database["public"]["Enums"]["request_status"]
          tipo: Database["public"]["Enums"]["request_type"]
          tipo_contratacao?:
            | Database["public"]["Enums"]["tipo_contratacao"]
            | null
          tipo_garantia?: Database["public"]["Enums"]["tipo_garantia"] | null
          updated_at?: string
          user_id: string
          valor: number
          valor_material?: number | null
          valor_servico?: number | null
        }
        Update: {
          cliente_id?: string | null
          contrato_mensal?: boolean | null
          created_at?: string
          custo_cliente?: boolean | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string
          dias_garantia?: number | null
          dias_garantia_produto?: number | null
          dias_garantia_servico?: number | null
          emergencial?: boolean | null
          empreendimento?: Database["public"]["Enums"]["empreendimento"]
          faturamento_direto?: boolean | null
          fornecedor_concorrente_1_id?: string | null
          fornecedor_concorrente_2_id?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa_fornecedores?: string | null
          natureza_orcamentaria?: Database["public"]["Enums"]["natureza_orcamentaria"]
          origem_custo?: Database["public"]["Enums"]["origem_custo"]
          parcelas?: number | null
          protocolo?: string
          retencao_6_porcento?: boolean | null
          status?: Database["public"]["Enums"]["request_status"]
          tipo?: Database["public"]["Enums"]["request_type"]
          tipo_contratacao?:
            | Database["public"]["Enums"]["tipo_contratacao"]
            | null
          tipo_garantia?: Database["public"]["Enums"]["tipo_garantia"] | null
          updated_at?: string
          user_id?: string
          valor?: number
          valor_material?: number | null
          valor_servico?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_fornecedor_concorrente_1_id_fkey"
            columns: ["fornecedor_concorrente_1_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_fornecedor_concorrente_2_id_fkey"
            columns: ["fornecedor_concorrente_2_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_protocolo: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_backoffice_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "solicitante" | "backoffice" | "admin"
      empreendimento: "mega_curitiba" | "mega_itajai" | "mega_esteio" | "todos"
      natureza_orcamentaria:
        | "materiais_informatica"
        | "seguranca_vigilancia"
        | "assistencia_informatica"
        | "limpeza_conservacao"
        | "material_consumo"
        | "telefone"
        | "energia_eletrica"
        | "agua"
        | "manutencao_imoveis"
        | "material_expediente"
        | "servicos_diversos"
        | "propaganda_publicidade"
        | "taxa_impostos"
        | "manutencao_maquinas_equipamentos"
        | "despesas_pessoal"
        | "despesas_administrador"
      origem_custo: "empreendimento" | "cliente"
      request_status:
        | "recebido"
        | "em_analise"
        | "pendente_correcao"
        | "aprovado"
        | "rejeitado"
        | "em_processamento"
        | "oc_ac_emitida"
        | "concluida"
      request_type: "AC" | "OC"
      tipo_contratacao:
        | "servicos"
        | "material_construcao"
        | "material_consumo"
        | "combustivel"
        | "taxas"
      tipo_garantia: "servico" | "produto" | "nenhuma" | "ambos"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["solicitante", "backoffice", "admin"],
      empreendimento: ["mega_curitiba", "mega_itajai", "mega_esteio", "todos"],
      natureza_orcamentaria: [
        "materiais_informatica",
        "seguranca_vigilancia",
        "assistencia_informatica",
        "limpeza_conservacao",
        "material_consumo",
        "telefone",
        "energia_eletrica",
        "agua",
        "manutencao_imoveis",
        "material_expediente",
        "servicos_diversos",
        "propaganda_publicidade",
        "taxa_impostos",
        "manutencao_maquinas_equipamentos",
        "despesas_pessoal",
        "despesas_administrador",
      ],
      origem_custo: ["empreendimento", "cliente"],
      request_status: [
        "recebido",
        "em_analise",
        "pendente_correcao",
        "aprovado",
        "rejeitado",
        "em_processamento",
        "oc_ac_emitida",
        "concluida",
      ],
      request_type: ["AC", "OC"],
      tipo_contratacao: [
        "servicos",
        "material_construcao",
        "material_consumo",
        "combustivel",
        "taxas",
      ],
      tipo_garantia: ["servico", "produto", "nenhuma", "ambos"],
    },
  },
} as const
