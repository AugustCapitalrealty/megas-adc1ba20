import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Fornecedor, CNAESecundario } from '@/types';
import type { Json } from '@/integrations/supabase/types';

interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  endereco: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  is_mei: boolean;
  // Campos de enriquecimento
  cnae_principal_codigo: number | null;
  cnae_principal_descricao: string | null;
  cnaes_secundarios: CNAESecundario[];
  situacao_cadastral: number | null;
  situacao_cadastral_descricao: string | null;
  data_situacao_cadastral: string | null;
  natureza_juridica: string | null;
  porte: string | null;
  capital_social: number | null;
  data_inicio_atividade: string | null;
  cep: string | null;
  bairro: string | null;
  numero: string | null;
  complemento: string | null;
  logradouro: string | null;
}

// Cache duration: 7 days in milliseconds
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Helper to convert Supabase JSON to CNAESecundario array
export function parseCNAEsSecundarios(json: Json | null): CNAESecundario[] | null {
  if (!json) return null;
  if (!Array.isArray(json)) return null;
  return json.map((item: any) => ({
    codigo: item.codigo ?? 0,
    descricao: item.descricao ?? '',
  }));
}

// Helper to convert DB row to Fornecedor
export function dbRowToFornecedor(row: any): Fornecedor {
  return {
    ...row,
    cnaes_secundarios: parseCNAEsSecundarios(row.cnaes_secundarios),
  } as Fornecedor;
}

// Helper to convert CNAESecundario array to JSON for Supabase
function cnaesToJson(cnaes: CNAESecundario[]): Json {
  return cnaes.map(c => ({ codigo: c.codigo, descricao: c.descricao })) as Json;
}

export function useCNPJ() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const unformatCNPJ = (value: string) => {
    return value.replace(/\D/g, '');
  };

  const validateCNPJ = (cnpj: string): boolean => {
    const digits = unformatCNPJ(cnpj);
    if (digits.length !== 14) return false;
    
    // Check for all same digits
    if (/^(\d)\1+$/.test(digits)) return false;
    
    // Validate check digits
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (parseInt(digits[12]) !== digit1) return false;
    
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(digits[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return parseInt(digits[13]) === digit2;
  };

  const fetchCNPJFromAPI = async (cnpj: string): Promise<CNPJData | null> => {
    const digits = unformatCNPJ(cnpj);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      
      if (!response.ok) {
        throw new Error('CNPJ não encontrado');
      }
      
      const data = await response.json();
      
      // Extrair endereço formatado
      const endereco = [
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
      ]
        .filter(Boolean)
        .join(', ');

      // Extrair CNAEs secundários
      const cnaesSecundarios: CNAESecundario[] = (data.cnaes_secundarios || []).map((cnae: any) => ({
        codigo: cnae.codigo,
        descricao: cnae.descricao || '',
      }));

      // Formatar data da situação cadastral
      let dataSituacao: string | null = null;
      if (data.data_situacao_cadastral) {
        try {
          const [year, month, day] = data.data_situacao_cadastral.split('-');
          dataSituacao = `${year}-${month}-${day}`;
        } catch {
          dataSituacao = data.data_situacao_cadastral;
        }
      }

      // Formatar data de início de atividade
      let dataInicio: string | null = null;
      if (data.data_inicio_atividade) {
        try {
          const [year, month, day] = data.data_inicio_atividade.split('-');
          dataInicio = `${year}-${month}-${day}`;
        } catch {
          dataInicio = data.data_inicio_atividade;
        }
      }

      return {
        cnpj: digits,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        endereco,
        cidade: data.municipio || '',
        uf: data.uf || '',
        telefone: data.ddd_telefone_1 || '',
        email: data.email || '',
        is_mei: data.opcao_pelo_mei || false,
        // Campos de enriquecimento
        cnae_principal_codigo: data.cnae_fiscal || null,
        cnae_principal_descricao: data.cnae_fiscal_descricao || null,
        cnaes_secundarios: cnaesSecundarios,
        situacao_cadastral: data.situacao_cadastral || null,
        situacao_cadastral_descricao: data.descricao_situacao_cadastral || null,
        data_situacao_cadastral: dataSituacao,
        natureza_juridica: data.natureza_juridica || null,
        porte: data.porte || null,
        capital_social: data.capital_social || null,
        data_inicio_atividade: dataInicio,
        cep: data.cep || null,
        bairro: data.bairro || null,
        numero: data.numero || null,
        complemento: data.complemento || null,
        logradouro: data.logradouro || null,
      };
    } catch (err) {
      console.error('Error fetching CNPJ:', err);
      return null;
    }
  };

  const needsApiRefresh = (fornecedor: Fornecedor): boolean => {
    // Se não tem dados enriquecidos, precisa atualizar
    if (!fornecedor.ultima_atualizacao_api) return true;
    
    // Se última atualização foi há mais de 7 dias, precisa atualizar
    const lastUpdate = new Date(fornecedor.ultima_atualizacao_api).getTime();
    const now = Date.now();
    return (now - lastUpdate) > CACHE_DURATION_MS;
  };

  const lookupCNPJ = useCallback(async (cnpj: string, forceRefresh = false): Promise<Fornecedor | null> => {
    const digits = unformatCNPJ(cnpj);
    
    if (!validateCNPJ(digits)) {
      setError('CNPJ inválido');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // First, check if we already have this fornecedor in the database
      const { data: existingFornecedor } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('cnpj', digits)
        .maybeSingle();

      // Se já existe e tem dados atualizados, retorna do cache
      if (existingFornecedor && !forceRefresh && !needsApiRefresh(dbRowToFornecedor(existingFornecedor))) {
        setLoading(false);
        return dbRowToFornecedor(existingFornecedor);
      }

      // Buscar dados da API
      const cnpjData = await fetchCNPJFromAPI(digits);
      
      if (!cnpjData) {
        setError('Não foi possível consultar o CNPJ');
        setLoading(false);
        // Se já existe no banco, retorna os dados existentes mesmo sem atualização
        if (existingFornecedor) {
          return dbRowToFornecedor(existingFornecedor);
        }
        return null;
      }

      const fornecedorData = {
        cnpj: cnpjData.cnpj,
        razao_social: cnpjData.razao_social,
        nome_fantasia: cnpjData.nome_fantasia,
        endereco: cnpjData.endereco,
        cidade: cnpjData.cidade,
        uf: cnpjData.uf,
        telefone: cnpjData.telefone,
        email: cnpjData.email,
        is_mei: cnpjData.is_mei,
        cnae_principal_codigo: cnpjData.cnae_principal_codigo,
        cnae_principal_descricao: cnpjData.cnae_principal_descricao,
        cnaes_secundarios: cnaesToJson(cnpjData.cnaes_secundarios),
        situacao_cadastral: cnpjData.situacao_cadastral,
        situacao_cadastral_descricao: cnpjData.situacao_cadastral_descricao,
        data_situacao_cadastral: cnpjData.data_situacao_cadastral,
        natureza_juridica: cnpjData.natureza_juridica,
        porte: cnpjData.porte,
        capital_social: cnpjData.capital_social,
        data_inicio_atividade: cnpjData.data_inicio_atividade,
        cep: cnpjData.cep,
        bairro: cnpjData.bairro,
        numero: cnpjData.numero,
        complemento: cnpjData.complemento,
        logradouro: cnpjData.logradouro,
        ultima_atualizacao_api: new Date().toISOString(),
      };

      if (existingFornecedor) {
        // Atualizar fornecedor existente
        const { data: updatedFornecedor, error: updateError } = await supabase
          .from('fornecedores')
          .update(fornecedorData)
          .eq('id', existingFornecedor.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating fornecedor:', updateError);
          setLoading(false);
          return dbRowToFornecedor(existingFornecedor);
        }

        setLoading(false);
        return dbRowToFornecedor(updatedFornecedor);
      } else {
        // Inserir novo fornecedor
        const { data: newFornecedor, error: insertError } = await supabase
          .from('fornecedores')
          .insert(fornecedorData)
          .select()
          .single();

        if (insertError) {
          console.error('Error saving fornecedor:', insertError);
          // If insert fails (maybe duplicate), try to fetch again
          const { data: retryFornecedor } = await supabase
            .from('fornecedores')
            .select('*')
            .eq('cnpj', digits)
            .maybeSingle();
          
          if (retryFornecedor) {
            setLoading(false);
            return dbRowToFornecedor(retryFornecedor);
          }
        }

        setLoading(false);
        return newFornecedor ? dbRowToFornecedor(newFornecedor) : null;
      }
    } catch (err) {
      console.error('Error looking up CNPJ:', err);
      setError('Erro ao consultar CNPJ');
      setLoading(false);
      return null;
    }
  }, []);

  return {
    loading,
    error,
    formatCNPJ,
    unformatCNPJ,
    validateCNPJ,
    lookupCNPJ,
    clearError: () => setError(null),
  };
}
