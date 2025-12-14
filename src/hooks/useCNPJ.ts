import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Fornecedor } from '@/types';

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
      
      const endereco = [
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
      ]
        .filter(Boolean)
        .join(', ');

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
      };
    } catch (err) {
      console.error('Error fetching CNPJ:', err);
      return null;
    }
  };

  const lookupCNPJ = useCallback(async (cnpj: string): Promise<Fornecedor | null> => {
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

      if (existingFornecedor) {
        setLoading(false);
        return existingFornecedor as Fornecedor;
      }

      // If not, fetch from BrasilAPI
      const cnpjData = await fetchCNPJFromAPI(digits);
      
      if (!cnpjData) {
        setError('Não foi possível consultar o CNPJ');
        setLoading(false);
        return null;
      }

      // Save to database
      const { data: newFornecedor, error: insertError } = await supabase
        .from('fornecedores')
        .insert({
          cnpj: cnpjData.cnpj,
          razao_social: cnpjData.razao_social,
          nome_fantasia: cnpjData.nome_fantasia,
          endereco: cnpjData.endereco,
          cidade: cnpjData.cidade,
          uf: cnpjData.uf,
          telefone: cnpjData.telefone,
          email: cnpjData.email,
          is_mei: cnpjData.is_mei,
        })
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
          return retryFornecedor as Fornecedor;
        }
      }

      setLoading(false);
      return newFornecedor as Fornecedor;
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