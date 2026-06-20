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
      acompanhamento_juridico: {
        Row: {
          created_at: string
          etapa: string
          id: string
          observacao: string | null
          solicitacao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          etapa: string
          id?: string
          observacao?: string | null
          solicitacao_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          etapa?: string
          id?: string
          observacao?: string | null
          solicitacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acompanhamento_juridico_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          id: string
          page: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          id?: string
          page?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          page?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      energia_clientes: {
        Row: {
          ativo: boolean
          cidade: string | null
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          nome_fantasia: string | null
          observacao: string | null
          razao_social: string | null
          uf: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          nome_fantasia?: string | null
          observacao?: string | null
          razao_social?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          nome_fantasia?: string | null
          observacao?: string | null
          razao_social?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      energia_competencia_lancamentos: {
        Row: {
          ajuste_manual_reais: number
          competencia_id: string
          consumo_fora_kwh: number
          consumo_ponta_kwh: number
          created_at: string
          demanda_contratada_kw: number
          demanda_usd_medida_kw: number
          id: string
          modulo_id: string
          observacao: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ajuste_manual_reais?: number
          competencia_id: string
          consumo_fora_kwh?: number
          consumo_ponta_kwh?: number
          created_at?: string
          demanda_contratada_kw?: number
          demanda_usd_medida_kw?: number
          id?: string
          modulo_id: string
          observacao?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ajuste_manual_reais?: number
          competencia_id?: string
          consumo_fora_kwh?: number
          consumo_ponta_kwh?: number
          created_at?: string
          demanda_contratada_kw?: number
          demanda_usd_medida_kw?: number
          id?: string
          modulo_id?: string
          observacao?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energia_competencia_lancamentos_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "energia_competencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energia_competencia_lancamentos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "energia_modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      energia_competencia_tarifas: {
        Row: {
          bandeira_valor: number
          cofins_pct: number
          competencia_id: string
          consumo_por_cliente: Json
          copel_consumo_fora_kwh: number
          copel_consumo_ponta_kwh: number
          copel_cred_deb: number
          copel_demanda_kw: number
          copel_valor_bandeira: number
          copel_valor_demanda: number
          copel_valor_icms: number
          copel_valor_iluminacao_publica: number
          copel_valor_pis_cofins: number
          copel_valor_te_fora: number
          copel_valor_te_ponta: number
          copel_valor_total: number
          copel_valor_tusd_fora: number
          copel_valor_tusd_ponta: number
          copel_valor_ultrapassagem: number
          created_at: string
          cred_deb_fatura: number
          demanda_isenta: number
          demanda_usd: number
          fatura_copel_itens: Json
          fotovoltaico_geracao_fora: number
          fotovoltaico_geracao_fora_kwh: number
          fotovoltaico_geracao_ponta: number
          fotovoltaico_geracao_ponta_kwh: number
          fotovoltaico_saldo_final_fora_kwh: number
          fotovoltaico_saldo_final_ponta_kwh: number
          fotovoltaico_saldo_fora: number
          fotovoltaico_saldo_inicial_fora_kwh: number
          fotovoltaico_saldo_inicial_ponta_kwh: number
          fotovoltaico_saldo_ponta: number
          icms_pct: number
          id: string
          iluminacao_publica: number
          perdas_copel_fora_kwh: number
          perdas_copel_ponta_kwh: number
          perdas_energy_fora_kwh: number
          perdas_energy_ponta_kwh: number
          pis_pct: number
          te_fora: number
          te_ponta: number
          tusd_fora: number
          tusd_ponta: number
          ultrapassagem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bandeira_valor?: number
          cofins_pct?: number
          competencia_id: string
          consumo_por_cliente?: Json
          copel_consumo_fora_kwh?: number
          copel_consumo_ponta_kwh?: number
          copel_cred_deb?: number
          copel_demanda_kw?: number
          copel_valor_bandeira?: number
          copel_valor_demanda?: number
          copel_valor_icms?: number
          copel_valor_iluminacao_publica?: number
          copel_valor_pis_cofins?: number
          copel_valor_te_fora?: number
          copel_valor_te_ponta?: number
          copel_valor_total?: number
          copel_valor_tusd_fora?: number
          copel_valor_tusd_ponta?: number
          copel_valor_ultrapassagem?: number
          created_at?: string
          cred_deb_fatura?: number
          demanda_isenta?: number
          demanda_usd?: number
          fatura_copel_itens?: Json
          fotovoltaico_geracao_fora?: number
          fotovoltaico_geracao_fora_kwh?: number
          fotovoltaico_geracao_ponta?: number
          fotovoltaico_geracao_ponta_kwh?: number
          fotovoltaico_saldo_final_fora_kwh?: number
          fotovoltaico_saldo_final_ponta_kwh?: number
          fotovoltaico_saldo_fora?: number
          fotovoltaico_saldo_inicial_fora_kwh?: number
          fotovoltaico_saldo_inicial_ponta_kwh?: number
          fotovoltaico_saldo_ponta?: number
          icms_pct?: number
          id?: string
          iluminacao_publica?: number
          perdas_copel_fora_kwh?: number
          perdas_copel_ponta_kwh?: number
          perdas_energy_fora_kwh?: number
          perdas_energy_ponta_kwh?: number
          pis_pct?: number
          te_fora?: number
          te_ponta?: number
          tusd_fora?: number
          tusd_ponta?: number
          ultrapassagem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bandeira_valor?: number
          cofins_pct?: number
          competencia_id?: string
          consumo_por_cliente?: Json
          copel_consumo_fora_kwh?: number
          copel_consumo_ponta_kwh?: number
          copel_cred_deb?: number
          copel_demanda_kw?: number
          copel_valor_bandeira?: number
          copel_valor_demanda?: number
          copel_valor_icms?: number
          copel_valor_iluminacao_publica?: number
          copel_valor_pis_cofins?: number
          copel_valor_te_fora?: number
          copel_valor_te_ponta?: number
          copel_valor_total?: number
          copel_valor_tusd_fora?: number
          copel_valor_tusd_ponta?: number
          copel_valor_ultrapassagem?: number
          created_at?: string
          cred_deb_fatura?: number
          demanda_isenta?: number
          demanda_usd?: number
          fatura_copel_itens?: Json
          fotovoltaico_geracao_fora?: number
          fotovoltaico_geracao_fora_kwh?: number
          fotovoltaico_geracao_ponta?: number
          fotovoltaico_geracao_ponta_kwh?: number
          fotovoltaico_saldo_final_fora_kwh?: number
          fotovoltaico_saldo_final_ponta_kwh?: number
          fotovoltaico_saldo_fora?: number
          fotovoltaico_saldo_inicial_fora_kwh?: number
          fotovoltaico_saldo_inicial_ponta_kwh?: number
          fotovoltaico_saldo_ponta?: number
          icms_pct?: number
          id?: string
          iluminacao_publica?: number
          perdas_copel_fora_kwh?: number
          perdas_copel_ponta_kwh?: number
          perdas_energy_fora_kwh?: number
          perdas_energy_ponta_kwh?: number
          pis_pct?: number
          te_fora?: number
          te_ponta?: number
          tusd_fora?: number
          tusd_ponta?: number
          ultrapassagem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energia_competencia_tarifas_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: true
            referencedRelation: "energia_competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      energia_competencias: {
        Row: {
          ano_mes: string
          created_at: string
          fechada_em: string | null
          fechada_por: string | null
          id: string
          observacao: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ano_mes: string
          created_at?: string
          fechada_em?: string | null
          fechada_por?: string | null
          id?: string
          observacao?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ano_mes?: string
          created_at?: string
          fechada_em?: string | null
          fechada_por?: string | null
          id?: string
          observacao?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      energia_contrato_modulos: {
        Row: {
          contrato_id: string
          created_at: string
          id: string
          modulo_id: string
          updated_at: string
          updated_by: string | null
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          id?: string
          modulo_id: string
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          id?: string
          modulo_id?: string
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "energia_contrato_modulos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "energia_contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energia_contrato_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "energia_modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      energia_contratos: {
        Row: {
          ativo: boolean
          cliente_id: string
          created_at: string
          demanda_contratada_kw: number
          id: string
          numero_contrato: string
          observacao: string | null
          termo_demanda_path: string | null
          updated_at: string
          updated_by: string | null
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          created_at?: string
          demanda_contratada_kw?: number
          id?: string
          numero_contrato: string
          observacao?: string | null
          termo_demanda_path?: string | null
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          created_at?: string
          demanda_contratada_kw?: number
          id?: string
          numero_contrato?: string
          observacao?: string | null
          termo_demanda_path?: string | null
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "energia_contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "energia_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      energia_fotovoltaico_saldo_pendente: {
        Row: {
          ano_mes: string
          created_at: string
          origem_competencia_id: string | null
          saldo_fora_kwh: number
          saldo_ponta_kwh: number
          updated_at: string
        }
        Insert: {
          ano_mes: string
          created_at?: string
          origem_competencia_id?: string | null
          saldo_fora_kwh?: number
          saldo_ponta_kwh?: number
          updated_at?: string
        }
        Update: {
          ano_mes?: string
          created_at?: string
          origem_competencia_id?: string | null
          saldo_fora_kwh?: number
          saldo_ponta_kwh?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "energia_fotovoltaico_saldo_pendente_origem_competencia_id_fkey"
            columns: ["origem_competencia_id"]
            isOneToOne: false
            referencedRelation: "energia_competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      energia_grandezas_contratadas: {
        Row: {
          bandeira_valor_padrao: number
          created_at: string
          demanda_contratada_kw: number
          demanda_fora_ponta_kw: number
          energia_fora_ponta_kwh: number
          energia_ponta_kwh: number
          id: string
          iluminacao_publica_padrao: number
          montante_fora_ponta_kw: number
          montante_ponta_kw: number
          observacao: string | null
          res_capacidade_fora_ponta_kw: number
          res_capacidade_ponta_kw: number
          tarifa_demanda_isenta: number
          tarifa_demanda_usd: number
          tarifa_ultrapassagem: number
          te_fora: number
          te_ponta: number
          tusd_fora: number
          tusd_ponta: number
          updated_at: string
          updated_by: string | null
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          bandeira_valor_padrao?: number
          created_at?: string
          demanda_contratada_kw?: number
          demanda_fora_ponta_kw?: number
          energia_fora_ponta_kwh?: number
          energia_ponta_kwh?: number
          id?: string
          iluminacao_publica_padrao?: number
          montante_fora_ponta_kw?: number
          montante_ponta_kw?: number
          observacao?: string | null
          res_capacidade_fora_ponta_kw?: number
          res_capacidade_ponta_kw?: number
          tarifa_demanda_isenta?: number
          tarifa_demanda_usd?: number
          tarifa_ultrapassagem?: number
          te_fora?: number
          te_ponta?: number
          tusd_fora?: number
          tusd_ponta?: number
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          bandeira_valor_padrao?: number
          created_at?: string
          demanda_contratada_kw?: number
          demanda_fora_ponta_kw?: number
          energia_fora_ponta_kwh?: number
          energia_ponta_kwh?: number
          id?: string
          iluminacao_publica_padrao?: number
          montante_fora_ponta_kw?: number
          montante_ponta_kw?: number
          observacao?: string | null
          res_capacidade_fora_ponta_kw?: number
          res_capacidade_ponta_kw?: number
          tarifa_demanda_isenta?: number
          tarifa_demanda_usd?: number
          tarifa_ultrapassagem?: number
          te_fora?: number
          te_ponta?: number
          tusd_fora?: number
          tusd_ponta?: number
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      energia_modulos: {
        Row: {
          area_m2: number
          ativo: boolean
          cliente_id: string | null
          created_at: string
          demanda_contratada_kw: number
          id: string
          identificador: string
          observacao: string | null
          ordem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_m2?: number
          ativo?: boolean
          cliente_id?: string | null
          created_at?: string
          demanda_contratada_kw?: number
          id?: string
          identificador: string
          observacao?: string | null
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_m2?: number
          ativo?: boolean
          cliente_id?: string | null
          created_at?: string
          demanda_contratada_kw?: number
          id?: string
          identificador?: string
          observacao?: string | null
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energia_modulos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "energia_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      energia_parametros: {
        Row: {
          cofins_pct: number
          created_at: string
          icms_pct: number
          id: string
          observacao: string | null
          pis_pct: number
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cofins_pct?: number
          created_at?: string
          icms_pct?: number
          id?: string
          observacao?: string | null
          pis_pct?: number
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cofins_pct?: number
          created_at?: string
          icms_pct?: number
          id?: string
          observacao?: string | null
          pis_pct?: number
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json
          created_at: string
          fingerprint: string | null
          id: string
          message: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string | null
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          fingerprint?: string | null
          id?: string
          message: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          fingerprint?: string | null
          id?: string
          message?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feriados: {
        Row: {
          created_at: string | null
          data: string
          descricao: string
          empreendimento: Database["public"]["Enums"]["empreendimento"] | null
          id: string
        }
        Insert: {
          created_at?: string | null
          data: string
          descricao: string
          empreendimento?: Database["public"]["Enums"]["empreendimento"] | null
          id?: string
        }
        Update: {
          created_at?: string | null
          data?: string
          descricao?: string
          empreendimento?: Database["public"]["Enums"]["empreendimento"] | null
          id?: string
        }
        Relationships: []
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
          cnpj: string | null
          complemento: string | null
          created_at: string
          data_inicio_atividade: string | null
          data_situacao_cadastral: string | null
          email: string | null
          endereco: string | null
          id: string
          identificador_fiscal: string | null
          is_mei: boolean | null
          logradouro: string | null
          moeda_padrao: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          numero: string | null
          pais: string | null
          porte: string | null
          razao_social: string | null
          situacao_cadastral: number | null
          situacao_cadastral_descricao: string | null
          telefone: string | null
          tipo_fornecedor: string
          tipo_identificador_fiscal: string | null
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
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          data_inicio_atividade?: string | null
          data_situacao_cadastral?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          identificador_fiscal?: string | null
          is_mei?: boolean | null
          logradouro?: string | null
          moeda_padrao?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          pais?: string | null
          porte?: string | null
          razao_social?: string | null
          situacao_cadastral?: number | null
          situacao_cadastral_descricao?: string | null
          telefone?: string | null
          tipo_fornecedor?: string
          tipo_identificador_fiscal?: string | null
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
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          data_inicio_atividade?: string | null
          data_situacao_cadastral?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          identificador_fiscal?: string | null
          is_mei?: boolean | null
          logradouro?: string | null
          moeda_padrao?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          pais?: string | null
          porte?: string | null
          razao_social?: string | null
          situacao_cadastral?: number | null
          situacao_cadastral_descricao?: string | null
          telefone?: string | null
          tipo_fornecedor?: string
          tipo_identificador_fiscal?: string | null
          uf?: string | null
          ultima_atualizacao_api?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gchat_spaces: {
        Row: {
          active: boolean
          created_at: string
          empreendimento: string | null
          id: string
          label: string
          space_name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          empreendimento?: string | null
          id?: string
          label: string
          space_name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          empreendimento?: string | null
          id?: string
          label?: string
          space_name?: string
        }
        Relationships: []
      }
      historico_solicitacoes: {
        Row: {
          acao: string
          anexos_com_problema: Json | null
          categoria: string
          created_at: string
          documento_emitido_id: string | null
          id: string
          interno: boolean
          lida: boolean
          mensagem: string | null
          motivo: string | null
          previsao_execucao: string | null
          previsao_nf: string | null
          solicitacao_id: string
          status_anterior: Database["public"]["Enums"]["request_status"] | null
          status_novo: Database["public"]["Enums"]["request_status"] | null
          user_id: string
        }
        Insert: {
          acao: string
          anexos_com_problema?: Json | null
          categoria?: string
          created_at?: string
          documento_emitido_id?: string | null
          id?: string
          interno?: boolean
          lida?: boolean
          mensagem?: string | null
          motivo?: string | null
          previsao_execucao?: string | null
          previsao_nf?: string | null
          solicitacao_id: string
          status_anterior?: Database["public"]["Enums"]["request_status"] | null
          status_novo?: Database["public"]["Enums"]["request_status"] | null
          user_id: string
        }
        Update: {
          acao?: string
          anexos_com_problema?: Json | null
          categoria?: string
          created_at?: string
          documento_emitido_id?: string | null
          id?: string
          interno?: boolean
          lida?: boolean
          mensagem?: string | null
          motivo?: string | null
          previsao_execucao?: string | null
          previsao_nf?: string | null
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
      monitoramento_oc_config: {
        Row: {
          dia_corte_justificativa: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          dia_corte_justificativa?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          dia_corte_justificativa?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          prioridade: string
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
          prioridade?: string
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
          prioridade?: string
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
      oc_acompanhamento: {
        Row: {
          created_at: string
          documento_emitido_id: string | null
          id: string
          justificativa: string
          previsao_execucao: string | null
          previsao_nf: string | null
          solicitacao_id: string
          tipo_acao: Database["public"]["Enums"]["tipo_acao_oc"]
          user_id: string
        }
        Insert: {
          created_at?: string
          documento_emitido_id?: string | null
          id?: string
          justificativa: string
          previsao_execucao?: string | null
          previsao_nf?: string | null
          solicitacao_id: string
          tipo_acao: Database["public"]["Enums"]["tipo_acao_oc"]
          user_id: string
        }
        Update: {
          created_at?: string
          documento_emitido_id?: string | null
          id?: string
          justificativa?: string
          previsao_execucao?: string | null
          previsao_nf?: string | null
          solicitacao_id?: string
          tipo_acao?: Database["public"]["Enums"]["tipo_acao_oc"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oc_acompanhamento_documento_emitido_id_fkey"
            columns: ["documento_emitido_id"]
            isOneToOne: false
            referencedRelation: "documentos_emitidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oc_acompanhamento_solicitacao_id_fkey"
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
          onboarding_completed_at: string | null
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
          onboarding_completed_at?: string | null
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
          onboarding_completed_at?: string | null
          receber_notificacoes_email?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      projuris_acoes: {
        Row: {
          acao: string
          created_at: string
          id: string
          observacao: string | null
          proxima_revisao: string | null
          requisicao_id: string
          status_anterior: string | null
          status_novo: string | null
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          observacao?: string | null
          proxima_revisao?: string | null
          requisicao_id: string
          status_anterior?: string | null
          status_novo?: string | null
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          observacao?: string | null
          proxima_revisao?: string | null
          requisicao_id?: string
          status_anterior?: string | null
          status_novo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projuris_acoes_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "projuris_requisicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      projuris_requisicoes: {
        Row: {
          cliente_fornecedor: string | null
          created_at: string
          data_finalizacao: string | null
          data_requisicao: string | null
          data_ultima_aprovacao: string | null
          data_ultimo_envio_aprovacao: string | null
          detalhes: string | null
          empreendimento: string | null
          id: string
          importado_em: string
          importado_por: string | null
          numero_fluig: string | null
          numero_requisicao: string
          ordem_prioridade: number | null
          requisitante: string | null
          responsavel: string | null
          status: string | null
          tipo_requisicao: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          cliente_fornecedor?: string | null
          created_at?: string
          data_finalizacao?: string | null
          data_requisicao?: string | null
          data_ultima_aprovacao?: string | null
          data_ultimo_envio_aprovacao?: string | null
          detalhes?: string | null
          empreendimento?: string | null
          id?: string
          importado_em?: string
          importado_por?: string | null
          numero_fluig?: string | null
          numero_requisicao: string
          ordem_prioridade?: number | null
          requisitante?: string | null
          responsavel?: string | null
          status?: string | null
          tipo_requisicao?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          cliente_fornecedor?: string | null
          created_at?: string
          data_finalizacao?: string | null
          data_requisicao?: string | null
          data_ultima_aprovacao?: string | null
          data_ultimo_envio_aprovacao?: string | null
          detalhes?: string | null
          empreendimento?: string | null
          id?: string
          importado_em?: string
          importado_por?: string | null
          numero_fluig?: string | null
          numero_requisicao?: string
          ordem_prioridade?: number | null
          requisitante?: string | null
          responsavel?: string | null
          status?: string | null
          tipo_requisicao?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      protocolo_counters: {
        Row: {
          ano: string
          last_seq: number
          updated_at: string
        }
        Insert: {
          ano: string
          last_seq?: number
          updated_at?: string
        }
        Update: {
          ano?: string
          last_seq?: number
          updated_at?: string
        }
        Relationships: []
      }
      rateio_configuracao: {
        Row: {
          area_m2: number
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_m2: number
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_m2?: number
          empreendimento?: Database["public"]["Enums"]["empreendimento"]
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      solicitacao_draft_audit: {
        Row: {
          created_at: string
          detalhes: Json
          evento: string
          id: string
          solicitacao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detalhes?: Json
          evento: string
          id?: string
          solicitacao_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          detalhes?: Json
          evento?: string
          id?: string
          solicitacao_id?: string
          user_id?: string
        }
        Relationships: []
      }
      solicitacao_mensagens: {
        Row: {
          created_at: string
          id: string
          interno: boolean
          lida: boolean | null
          mensagem: string
          solicitacao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interno?: boolean
          lida?: boolean | null
          mensagem: string
          solicitacao_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interno?: boolean
          lida?: boolean | null
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
      solicitacao_transfers: {
        Row: {
          created_at: string
          created_by: string
          from_user_id: string
          id: string
          motivo: string
          solicitacao_id: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          from_user_id: string
          id?: string
          motivo: string
          solicitacao_id: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          from_user_id?: string
          id?: string
          motivo?: string
          solicitacao_id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_transfers_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          cancelamento_ciencia_em: string | null
          cancelamento_pendente: boolean
          cliente_id: string | null
          contrato_mensal: boolean | null
          created_at: string
          custo_cliente: boolean | null
          data_conclusao: string | null
          data_enviado_fornecedor: string | null
          data_execucao_servico: string | null
          data_fim: string | null
          data_inicio: string | null
          data_liberado_fornecedor: string | null
          data_pendente_correcao: string | null
          descricao: string | null
          dias_garantia: number | null
          dias_garantia_produto: number | null
          dias_garantia_servico: number | null
          due_diligence_confirmada: boolean | null
          due_diligence_numero_projuris: string | null
          emergencial: boolean | null
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          enviado_fornecedor_por: string | null
          escopo_detalhado_minuta: string | null
          excecao_fornecedores: boolean | null
          faturamento_direto: boolean | null
          fluig_cancelamento_tratado_em: string | null
          fluig_cancelamento_tratado_por: string | null
          fornecedor_concorrente_1_id: string | null
          fornecedor_concorrente_2_id: string | null
          fornecedor_email_contato: string | null
          fornecedor_id: string | null
          fornecedor_telefone_contato: string | null
          fornecimento_exclusivo: boolean | null
          ia_cnae_avaliado_em: string | null
          ia_cnae_justificativa: string | null
          ia_cnae_status: string | null
          ia_descricao_avaliado_em: string | null
          ia_descricao_sugestao: string | null
          ia_descricao_vaga: boolean | null
          id: string
          infraspeak_registrada: boolean | null
          instrumento_juridico:
            | Database["public"]["Enums"]["instrumento_juridico"]
            | null
          justificativa_exclusividade: string | null
          justificativa_fornecedores: string | null
          justificativa_sem_chamado: string | null
          justificativa_sem_memorial: string | null
          liberado_fornecedor_por: string | null
          natureza_orcamentaria:
            | Database["public"]["Enums"]["natureza_orcamentaria"]
            | null
          natureza_servico_altura_risco: boolean | null
          natureza_servico_fossa_filtro: boolean | null
          natureza_servico_obra_civil: boolean | null
          natureza_servico_preco_variavel: boolean | null
          numero_chamado_fluig: string | null
          numero_fluig_cadastro: string | null
          numero_fluig_pagamento: string | null
          numero_projuris: string | null
          origem_custo: Database["public"]["Enums"]["origem_custo"]
          parcelas: number | null
          prazo_liberacao_retencao_dias: number | null
          protocolo: string | null
          rateio_valores: Json | null
          requer_retencao_tecnica: boolean | null
          resposta_informacoes: string | null
          retencao_6_porcento: boolean | null
          status: Database["public"]["Enums"]["request_status"]
          tipo: Database["public"]["Enums"]["request_type"] | null
          tipo_contratacao:
            | Database["public"]["Enums"]["tipo_contratacao"]
            | null
          tipo_entrega: string | null
          tipo_garantia: Database["public"]["Enums"]["tipo_garantia"] | null
          tipo_rateio: string | null
          updated_at: string
          user_id: string
          valor: number | null
          valor_material: number | null
          valor_mensal: number | null
          valor_servico: number | null
        }
        Insert: {
          cancelamento_ciencia_em?: string | null
          cancelamento_pendente?: boolean
          cliente_id?: string | null
          contrato_mensal?: boolean | null
          created_at?: string
          custo_cliente?: boolean | null
          data_conclusao?: string | null
          data_enviado_fornecedor?: string | null
          data_execucao_servico?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_liberado_fornecedor?: string | null
          data_pendente_correcao?: string | null
          descricao?: string | null
          dias_garantia?: number | null
          dias_garantia_produto?: number | null
          dias_garantia_servico?: number | null
          due_diligence_confirmada?: boolean | null
          due_diligence_numero_projuris?: string | null
          emergencial?: boolean | null
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          enviado_fornecedor_por?: string | null
          escopo_detalhado_minuta?: string | null
          excecao_fornecedores?: boolean | null
          faturamento_direto?: boolean | null
          fluig_cancelamento_tratado_em?: string | null
          fluig_cancelamento_tratado_por?: string | null
          fornecedor_concorrente_1_id?: string | null
          fornecedor_concorrente_2_id?: string | null
          fornecedor_email_contato?: string | null
          fornecedor_id?: string | null
          fornecedor_telefone_contato?: string | null
          fornecimento_exclusivo?: boolean | null
          ia_cnae_avaliado_em?: string | null
          ia_cnae_justificativa?: string | null
          ia_cnae_status?: string | null
          ia_descricao_avaliado_em?: string | null
          ia_descricao_sugestao?: string | null
          ia_descricao_vaga?: boolean | null
          id?: string
          infraspeak_registrada?: boolean | null
          instrumento_juridico?:
            | Database["public"]["Enums"]["instrumento_juridico"]
            | null
          justificativa_exclusividade?: string | null
          justificativa_fornecedores?: string | null
          justificativa_sem_chamado?: string | null
          justificativa_sem_memorial?: string | null
          liberado_fornecedor_por?: string | null
          natureza_orcamentaria?:
            | Database["public"]["Enums"]["natureza_orcamentaria"]
            | null
          natureza_servico_altura_risco?: boolean | null
          natureza_servico_fossa_filtro?: boolean | null
          natureza_servico_obra_civil?: boolean | null
          natureza_servico_preco_variavel?: boolean | null
          numero_chamado_fluig?: string | null
          numero_fluig_cadastro?: string | null
          numero_fluig_pagamento?: string | null
          numero_projuris?: string | null
          origem_custo?: Database["public"]["Enums"]["origem_custo"]
          parcelas?: number | null
          prazo_liberacao_retencao_dias?: number | null
          protocolo?: string | null
          rateio_valores?: Json | null
          requer_retencao_tecnica?: boolean | null
          resposta_informacoes?: string | null
          retencao_6_porcento?: boolean | null
          status?: Database["public"]["Enums"]["request_status"]
          tipo?: Database["public"]["Enums"]["request_type"] | null
          tipo_contratacao?:
            | Database["public"]["Enums"]["tipo_contratacao"]
            | null
          tipo_entrega?: string | null
          tipo_garantia?: Database["public"]["Enums"]["tipo_garantia"] | null
          tipo_rateio?: string | null
          updated_at?: string
          user_id: string
          valor?: number | null
          valor_material?: number | null
          valor_mensal?: number | null
          valor_servico?: number | null
        }
        Update: {
          cancelamento_ciencia_em?: string | null
          cancelamento_pendente?: boolean
          cliente_id?: string | null
          contrato_mensal?: boolean | null
          created_at?: string
          custo_cliente?: boolean | null
          data_conclusao?: string | null
          data_enviado_fornecedor?: string | null
          data_execucao_servico?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          data_liberado_fornecedor?: string | null
          data_pendente_correcao?: string | null
          descricao?: string | null
          dias_garantia?: number | null
          dias_garantia_produto?: number | null
          dias_garantia_servico?: number | null
          due_diligence_confirmada?: boolean | null
          due_diligence_numero_projuris?: string | null
          emergencial?: boolean | null
          empreendimento?: Database["public"]["Enums"]["empreendimento"]
          enviado_fornecedor_por?: string | null
          escopo_detalhado_minuta?: string | null
          excecao_fornecedores?: boolean | null
          faturamento_direto?: boolean | null
          fluig_cancelamento_tratado_em?: string | null
          fluig_cancelamento_tratado_por?: string | null
          fornecedor_concorrente_1_id?: string | null
          fornecedor_concorrente_2_id?: string | null
          fornecedor_email_contato?: string | null
          fornecedor_id?: string | null
          fornecedor_telefone_contato?: string | null
          fornecimento_exclusivo?: boolean | null
          ia_cnae_avaliado_em?: string | null
          ia_cnae_justificativa?: string | null
          ia_cnae_status?: string | null
          ia_descricao_avaliado_em?: string | null
          ia_descricao_sugestao?: string | null
          ia_descricao_vaga?: boolean | null
          id?: string
          infraspeak_registrada?: boolean | null
          instrumento_juridico?:
            | Database["public"]["Enums"]["instrumento_juridico"]
            | null
          justificativa_exclusividade?: string | null
          justificativa_fornecedores?: string | null
          justificativa_sem_chamado?: string | null
          justificativa_sem_memorial?: string | null
          liberado_fornecedor_por?: string | null
          natureza_orcamentaria?:
            | Database["public"]["Enums"]["natureza_orcamentaria"]
            | null
          natureza_servico_altura_risco?: boolean | null
          natureza_servico_fossa_filtro?: boolean | null
          natureza_servico_obra_civil?: boolean | null
          natureza_servico_preco_variavel?: boolean | null
          numero_chamado_fluig?: string | null
          numero_fluig_cadastro?: string | null
          numero_fluig_pagamento?: string | null
          numero_projuris?: string | null
          origem_custo?: Database["public"]["Enums"]["origem_custo"]
          parcelas?: number | null
          prazo_liberacao_retencao_dias?: number | null
          protocolo?: string | null
          rateio_valores?: Json | null
          requer_retencao_tecnica?: boolean | null
          resposta_informacoes?: string | null
          retencao_6_porcento?: boolean | null
          status?: Database["public"]["Enums"]["request_status"]
          tipo?: Database["public"]["Enums"]["request_type"] | null
          tipo_contratacao?:
            | Database["public"]["Enums"]["tipo_contratacao"]
            | null
          tipo_entrega?: string | null
          tipo_garantia?: Database["public"]["Enums"]["tipo_garantia"] | null
          tipo_rateio?: string | null
          updated_at?: string
          user_id?: string
          valor?: number | null
          valor_material?: number | null
          valor_mensal?: number | null
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
      user_favorites: {
        Row: {
          created_at: string
          id: string
          solicitacao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          solicitacao_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          solicitacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
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
      calcular_dias_uteis: {
        Args: { data_fim?: string; data_inicio: string }
        Returns: number
      }
      calcular_horas_uteis: {
        Args: { p_data_fim?: string; p_data_inicio: string }
        Returns: number
      }
      calcular_instrumento_juridico: {
        Args: {
          p_altura_risco: boolean
          p_fossa_filtro: boolean
          p_obra_civil: boolean
          p_preco_variavel: boolean
          p_valor: number
        }
        Returns: Database["public"]["Enums"]["instrumento_juridico"]
      }
      calcular_sla_solicitacao: {
        Args: { p_solicitacao_id: string }
        Returns: Json
      }
      energia_grandeza_vigente: {
        Args: { p_data: string }
        Returns: {
          bandeira_valor_padrao: number
          created_at: string
          demanda_contratada_kw: number
          demanda_fora_ponta_kw: number
          energia_fora_ponta_kwh: number
          energia_ponta_kwh: number
          id: string
          iluminacao_publica_padrao: number
          montante_fora_ponta_kw: number
          montante_ponta_kw: number
          observacao: string | null
          res_capacidade_fora_ponta_kw: number
          res_capacidade_ponta_kw: number
          tarifa_demanda_isenta: number
          tarifa_demanda_usd: number
          tarifa_ultrapassagem: number
          te_fora: number
          te_ponta: number
          tusd_fora: number
          tusd_ponta: number
          updated_at: string
          updated_by: string | null
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        SetofOptions: {
          from: "*"
          to: "energia_grandezas_contratadas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      energia_proximo_ano_mes: { Args: { p_ano_mes: string }; Returns: string }
      generate_protocolo: { Args: never; Returns: string }
      get_fluig_filter_options: { Args: never; Returns: Json }
      get_retrabalho_eficiencia: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_empreendimento?: Database["public"]["Enums"]["empreendimento"]
        }
        Returns: {
          retrabalho_count: number
          total_count: number
        }[]
      }
      get_sla_dashboard: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_empreendimento?: Database["public"]["Enums"]["empreendimento"]
          p_status_sla?: string
        }
        Returns: {
          created_at: string
          data_fluig_rm: string
          dias_uteis_backoffice: number
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          id: string
          numero_chamado_fluig: string
          passou_cadastro: boolean
          protocolo: string
          sla_estourado: boolean
          solicitante_email: string
          solicitante_nome: string
          status: Database["public"]["Enums"]["request_status"]
          status_sla: string
        }[]
      }
      get_sla_timeline: {
        Args: { p_solicitacao_id: string }
        Returns: {
          acao: string
          conta_tempo: boolean
          created_at: string
          status_anterior: string
          status_novo: string
          tipo_evento: string
          usuario_nome: string
        }[]
      }
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
          data_execucao_servico: string
          data_pendente_correcao: string
          descricao: string
          emergencial: boolean
          empreendimento: Database["public"]["Enums"]["empreendimento"]
          fornecedor_cnpj: string
          fornecedor_email_contato: string
          fornecedor_razao: string
          fornecedor_telefone_contato: string
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
      get_system_health_cron: {
        Args: never
        Returns: {
          active: boolean
          failures_last_24h: number
          jobid: number
          jobname: string
          last_duration_ms: number
          last_run_end: string
          last_run_start: string
          last_status: string
          runs_last_24h: number
          schedule: string
        }[]
      }
      get_system_health_summary: { Args: never; Returns: Json }
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
      insert_historico_admin: {
        Args: {
          p_acao: string
          p_motivo?: string
          p_solicitacao_id: string
          p_status_anterior?: string
          p_status_novo?: string
          p_user_id: string
        }
        Returns: undefined
      }
      is_backoffice_or_admin: { Args: { _user_id: string }; Returns: boolean }
      update_numero_projuris: {
        Args: { p_numero_projuris: string; p_solicitacao_id: string }
        Returns: undefined
      }
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
      app_role: "solicitante" | "backoffice" | "admin" | "super_admin"
      empreendimento:
        | "mega_curitiba"
        | "mega_itajai"
        | "mega_esteio"
        | "todos"
        | "mega_canoas"
      instrumento_juridico:
        | "oc"
        | "termo_contratacao"
        | "contrato_prestacao"
        | "contrato_fornecimento"
        | "contrato_empreitada"
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
        | "liberado_fornecedor"
        | "enviado_fornecedor"
        | "cancelado"
        | "aguardando_execucao"
        | "rascunho"
      request_type: "AC" | "OC"
      tipo_acao_oc:
        | "justificativa_adiamento"
        | "previsao_atualizada"
        | "cancelamento_solicitado"
        | "cancelamento_aprovado"
        | "cancelamento_rejeitado"
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
      app_role: ["solicitante", "backoffice", "admin", "super_admin"],
      empreendimento: [
        "mega_curitiba",
        "mega_itajai",
        "mega_esteio",
        "todos",
        "mega_canoas",
      ],
      instrumento_juridico: [
        "oc",
        "termo_contratacao",
        "contrato_prestacao",
        "contrato_fornecimento",
        "contrato_empreitada",
      ],
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
        "liberado_fornecedor",
        "enviado_fornecedor",
        "cancelado",
        "aguardando_execucao",
        "rascunho",
      ],
      request_type: ["AC", "OC"],
      tipo_acao_oc: [
        "justificativa_adiamento",
        "previsao_atualizada",
        "cancelamento_solicitado",
        "cancelamento_aprovado",
        "cancelamento_rejeitado",
      ],
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
