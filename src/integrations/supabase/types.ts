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
      documentos_fiscais: {
        Row: {
          baixa_financeiro_em: string | null
          baixa_financeiro_por: string | null
          created_at: string
          data_emissao_nf: string | null
          data_vencimento_boleto: string | null
          id: string
          justificativa_antecipado: string | null
          mime_type: string | null
          nome_arquivo: string
          pagamento_antecipado: boolean | null
          solicitacao_id: string
          storage_path: string
          tamanho_bytes: number | null
          tipo: string
          user_id: string
        }
        Insert: {
          baixa_financeiro_em?: string | null
          baixa_financeiro_por?: string | null
          created_at?: string
          data_emissao_nf?: string | null
          data_vencimento_boleto?: string | null
          id?: string
          justificativa_antecipado?: string | null
          mime_type?: string | null
          nome_arquivo: string
          pagamento_antecipado?: boolean | null
          solicitacao_id: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo: string
          user_id: string
        }
        Update: {
          baixa_financeiro_em?: string | null
          baixa_financeiro_por?: string | null
          created_at?: string
          data_emissao_nf?: string | null
          data_vencimento_boleto?: string | null
          id?: string
          justificativa_antecipado?: string | null
          mime_type?: string | null
          nome_arquivo?: string
          pagamento_antecipado?: boolean | null
          solicitacao_id?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_fiscais_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      fluig_painel_eventos: {
        Row: {
          campo_alterado: string
          created_at: string
          id: string
          importado_em: string
          importado_por: string | null
          solicitacao_fluig: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado: string
          created_at?: string
          id?: string
          importado_em?: string
          importado_por?: string | null
          solicitacao_fluig: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string
          created_at?: string
          id?: string
          importado_em?: string
          importado_por?: string | null
          solicitacao_fluig?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      fluig_painel_snapshot: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          data_lancamento: string | null
          diretoria_conclusao: string | null
          diretoria_responsavel: string | null
          empreendimento: string | null
          fornecedor: string | null
          gerencia_conclusao: string | null
          gerencia_facilities_conclusao: string | null
          gerencia_facilities_responsavel: string | null
          gerencia_financeiro_conclusao: string | null
          gerencia_financeiro_responsavel: string | null
          gerencia_responsavel: string | null
          id: string
          importado_em: string
          importado_por: string | null
          localizacao: string | null
          responsavel_atual: string | null
          servico: string | null
          situacao: string | null
          solicitacao_fluig: string
          solicitacao_interna_id: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          data_lancamento?: string | null
          diretoria_conclusao?: string | null
          diretoria_responsavel?: string | null
          empreendimento?: string | null
          fornecedor?: string | null
          gerencia_conclusao?: string | null
          gerencia_facilities_conclusao?: string | null
          gerencia_facilities_responsavel?: string | null
          gerencia_financeiro_conclusao?: string | null
          gerencia_financeiro_responsavel?: string | null
          gerencia_responsavel?: string | null
          id?: string
          importado_em?: string
          importado_por?: string | null
          localizacao?: string | null
          responsavel_atual?: string | null
          servico?: string | null
          situacao?: string | null
          solicitacao_fluig: string
          solicitacao_interna_id?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          data_lancamento?: string | null
          diretoria_conclusao?: string | null
          diretoria_responsavel?: string | null
          empreendimento?: string | null
          fornecedor?: string | null
          gerencia_conclusao?: string | null
          gerencia_facilities_conclusao?: string | null
          gerencia_facilities_responsavel?: string | null
          gerencia_financeiro_conclusao?: string | null
          gerencia_financeiro_responsavel?: string | null
          gerencia_responsavel?: string | null
          id?: string
          importado_em?: string
          importado_por?: string | null
          localizacao?: string | null
          responsavel_atual?: string | null
          servico?: string | null
          situacao?: string | null
          solicitacao_fluig?: string
          solicitacao_interna_id?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fluig_painel_snapshot_solicitacao_interna_id_fkey"
            columns: ["solicitacao_interna_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cidade: string | null
          cnae_principal_codigo: number | null
          cnae_principal_descricao: string | null
          cnaes_secundarios: Json | null
          cnpj: string
          complemento: string | null
          created_at: string
          data_inicio_atividade: string | null
          data_situacao_cadastral: string | null
          email: string | null
          endereco: string | null
          id: string
          is_mei: boolean | null
          logradouro: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          numero: string | null
          porte: string | null
          razao_social: string | null
          situacao_cadastral: number | null
          situacao_cadastral_descricao: string | null
          telefone: string | null
          uf: string | null
          ultima_atualizacao_api: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cidade?: string | null
          cnae_principal_codigo?: number | null
          cnae_principal_descricao?: string | null
          cnaes_secundarios?: Json | null
          cnpj: string
          complemento?: string | null
          created_at?: string
          data_inicio_atividade?: string | null
          data_situacao_cadastral?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          is_mei?: boolean | null
          logradouro?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          porte?: string | null
          razao_social?: string | null
          situacao_cadastral?: number | null
          situacao_cadastral_descricao?: string | null
          telefone?: string | null
          uf?: string | null
          ultima_atualizacao_api?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cidade?: string | null
          cnae_principal_codigo?: number | null
          cnae_principal_descricao?: string | null
          cnaes_secundarios?: Json | null
          cnpj?: string
          complemento?: string | null
          created_at?: string
          data_inicio_atividade?: string | null
          data_situacao_cadastral?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          is_mei?: boolean | null
          logradouro?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          porte?: string | null
          razao_social?: string | null
          situacao_cadastral?: number | null
          situacao_cadastral_descricao?: string | null
          telefone?: string | null
          uf?: string | null
          ultima_atualizacao_api?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      historico_solicitacoes: {
        Row: {
          acao: string
          anexos_com_problema: Json | null
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
          anexos_com_problema?: Json | null
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
          anexos_com_problema?: Json | null
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
          approved: boolean
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          receber_notificacoes_email: boolean | null
          updated_at: string
        }
        Insert: {
          approved?: boolean
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          receber_notificacoes_email?: boolean | null
          updated_at?: string
        }
        Update: {
          approved?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          receber_notificacoes_email?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      solicitacao_mensagens: {
        Row: {
          created_at: string
          id: string
          mensagem: string
          solicitacao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem: string
          solicitacao_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string
          solicitacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_mensagens_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          cliente_id: string | null
          contrato_mensal: boolean | null
          created_at: string
          custo_cliente: boolean | null
          data_fim: string | null
          data_inicio: string | null
          data_pendente_correcao: string | null
          descricao: string
          dias_garantia: number | null
          dias_garantia_produto: number | null
          dias_garantia_servico: number | null
          emergencial: boolean | null
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          excecao_fornecedores: boolean | null
          faturamento_direto: boolean | null
          fornecedor_concorrente_1_id: string | null
          fornecedor_concorrente_2_id: string | null
          fornecedor_id: string | null
          id: string
          justificativa_fornecedores: string | null
          justificativa_sem_chamado: string | null
          justificativa_sem_memorial: string | null
          natureza_orcamentaria: Database["public"]["Enums"]["natureza_orcamentaria"]
          numero_chamado_fluig: string | null
          numero_projuris: string | null
          origem_custo: Database["public"]["Enums"]["origem_custo"]
          parcelas: number | null
          protocolo: string
          resposta_informacoes: string | null
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
          data_pendente_correcao?: string | null
          descricao: string
          dias_garantia?: number | null
          dias_garantia_produto?: number | null
          dias_garantia_servico?: number | null
          emergencial?: boolean | null
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          excecao_fornecedores?: boolean | null
          faturamento_direto?: boolean | null
          fornecedor_concorrente_1_id?: string | null
          fornecedor_concorrente_2_id?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa_fornecedores?: string | null
          justificativa_sem_chamado?: string | null
          justificativa_sem_memorial?: string | null
          natureza_orcamentaria: Database["public"]["Enums"]["natureza_orcamentaria"]
          numero_chamado_fluig?: string | null
          numero_projuris?: string | null
          origem_custo?: Database["public"]["Enums"]["origem_custo"]
          parcelas?: number | null
          protocolo: string
          resposta_informacoes?: string | null
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
          data_pendente_correcao?: string | null
          descricao?: string
          dias_garantia?: number | null
          dias_garantia_produto?: number | null
          dias_garantia_servico?: number | null
          emergencial?: boolean | null
          empreendimento?: Database["public"]["Enums"]["empreendimento"]
          excecao_fornecedores?: boolean | null
          faturamento_direto?: boolean | null
          fornecedor_concorrente_1_id?: string | null
          fornecedor_concorrente_2_id?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa_fornecedores?: string | null
          justificativa_sem_chamado?: string | null
          justificativa_sem_memorial?: string | null
          natureza_orcamentaria?: Database["public"]["Enums"]["natureza_orcamentaria"]
          numero_chamado_fluig?: string | null
          numero_projuris?: string | null
          origem_custo?: Database["public"]["Enums"]["origem_custo"]
          parcelas?: number | null
          protocolo?: string
          resposta_informacoes?: string | null
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
      status_transitions: {
        Row: {
          created_at: string
          id: string
          status_from: Database["public"]["Enums"]["request_status"]
          status_to: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          status_from: Database["public"]["Enums"]["request_status"]
          status_to: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          created_at?: string
          id?: string
          status_from?: Database["public"]["Enums"]["request_status"]
          status_to?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: []
      }
      user_empreendimentos: {
        Row: {
          created_at: string
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          empreendimento?: Database["public"]["Enums"]["empreendimento"]
          id?: string
          user_id?: string
        }
        Relationships: []
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
      get_solicitacao_detalhes: { Args: { p_id: string }; Returns: Json }
      get_solicitacoes_backoffice: {
        Args: {
          p_empreendimento?: Database["public"]["Enums"]["empreendimento"]
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: Database["public"]["Enums"]["request_status"]
        }
        Returns: {
          cliente_nome: string
          created_at: string
          descricao: string
          emergencial: boolean
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          fornecedor_cnpj: string
          fornecedor_razao: string
          id: string
          numero_chamado_fluig: string
          numero_projuris: string
          protocolo: string
          solicitante_email: string
          solicitante_nome: string
          status: Database["public"]["Enums"]["request_status"]
          tipo: string
          total_anexos: number
          total_docs_emitidos: number
          total_docs_fiscais: number
          ultima_atualizacao_status: string
          updated_at: string
          valor: number
        }[]
      }
      get_solicitacoes_count_by_status: {
        Args: never
        Returns: {
          count: number
          status: Database["public"]["Enums"]["request_status"]
        }[]
      }
      get_user_empreendimentos: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["empreendimento"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_backoffice_or_admin: { Args: { _user_id: string }; Returns: boolean }
      user_can_access_solicitacao: {
        Args: { _solicitacao_id: string }
        Returns: boolean
      }
      user_can_view_fluig_empreendimento: {
        Args: { fluig_empreendimento: string }
        Returns: boolean
      }
      user_has_empreendimento: {
        Args: {
          _empreendimento: Database["public"]["Enums"]["empreendimento"]
          _user_id: string
        }
        Returns: boolean
      }
      user_owns_solicitacao: {
        Args: { _solicitacao_id: string }
        Returns: boolean
      }
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
        | "aguardando_aceite"
        | "aguardando_informacoes"
        | "aguardando_nf_boleto"
        | "nf_boleto_enviados"
        | "enviado_pagamento"
      request_type: "AC" | "OC"
      tipo_contratacao:
        | "servicos"
        | "material_construcao"
        | "material_consumo"
        | "combustivel"
        | "taxas"
        | "agua"
        | "energia"
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
        "aguardando_aceite",
        "aguardando_informacoes",
        "aguardando_nf_boleto",
        "nf_boleto_enviados",
        "enviado_pagamento",
      ],
      request_type: ["AC", "OC"],
      tipo_contratacao: [
        "servicos",
        "material_construcao",
        "material_consumo",
        "combustivel",
        "taxas",
        "agua",
        "energia",
      ],
      tipo_garantia: ["servico", "produto", "nenhuma", "ambos"],
    },
  },
} as const
