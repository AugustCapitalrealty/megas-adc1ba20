import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';
import type { Fornecedor } from '@/types';

export interface CNAEValidationResult {
  status: 'compativel' | 'incompativel' | 'insuficiente';
  score_confianca: number;
  justificativa_curta: string;
  itens_extraidos: string[];
  cnaes_considerados: string[];
}

interface UseCNAEValidationOptions {
  descricao: string;
  fornecedor: Fornecedor | null;
  enabled?: boolean;
}

interface CacheEntry {
  result: CNAEValidationResult;
  timestamp: number;
}

// Cache dura 5 minutos na sessão
const CACHE_TTL = 5 * 60 * 1000;

export function useCNAEValidation({ descricao, fornecedor, enabled = true }: UseCNAEValidationOptions) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<CNAEValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Cache por sessão
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  
  // Debounce da descrição (800ms)
  const debouncedDescricao = useDebounce(descricao, 800);
  
  const getCacheKey = useCallback((desc: string, forn: Fornecedor) => {
    return `${desc.trim().toLowerCase()}_${forn.id}`;
  }, []);
  
  const getFromCache = useCallback((key: string): CNAEValidationResult | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;
    
    // Verifica se expirou
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cacheRef.current.delete(key);
      return null;
    }
    
    return entry.result;
  }, []);
  
  const setToCache = useCallback((key: string, result: CNAEValidationResult) => {
    cacheRef.current.set(key, {
      result,
      timestamp: Date.now()
    });
  }, []);
  
  useEffect(() => {
    // Resetar quando não há dados suficientes
    if (!enabled || !fornecedor || !debouncedDescricao) {
      setValidationResult(null);
      setError(null);
      return;
    }
    
    // Mínimo de 20 caracteres na descrição
    if (debouncedDescricao.length < 20) {
      setValidationResult(null);
      return;
    }
    
    // Precisa ter CNAE para validar
    if (!fornecedor.cnae_principal_codigo || !fornecedor.cnae_principal_descricao) {
      setValidationResult({
        status: 'insuficiente',
        score_confianca: 0,
        justificativa_curta: 'CNAE do fornecedor não disponível.',
        itens_extraidos: [],
        cnaes_considerados: []
      });
      return;
    }
    
    const cacheKey = getCacheKey(debouncedDescricao, fornecedor);
    
    // Verifica cache primeiro
    const cached = getFromCache(cacheKey);
    if (cached) {
      setValidationResult(cached);
      return;
    }
    
    // Faz a validação via API
    const validate = async () => {
      setIsValidating(true);
      setError(null);
      
      try {
        const { data, error: fnError } = await supabase.functions.invoke('validate-cnae', {
          body: {
            descricao: debouncedDescricao,
            cnae_principal_codigo: fornecedor.cnae_principal_codigo,
            cnae_principal_descricao: fornecedor.cnae_principal_descricao,
            cnaes_secundarios: fornecedor.cnaes_secundarios || []
          }
        });
        
        if (fnError) {
          console.error('Erro na validação CNAE:', fnError);
          setError('Não foi possível validar no momento.');
          setValidationResult(null);
          return;
        }
        
        // Verifica se é erro de rate limit ou payment
        if (data?.error === 'rate_limit' || data?.error === 'payment_required') {
          setError(data.message);
          setValidationResult(null);
          return;
        }
        
        const result = data as CNAEValidationResult;
        setValidationResult(result);
        setToCache(cacheKey, result);
        
      } catch (err) {
        console.error('Erro ao chamar validação CNAE:', err);
        setError('Erro ao validar compatibilidade.');
        setValidationResult(null);
      } finally {
        setIsValidating(false);
      }
    };
    
    validate();
  }, [debouncedDescricao, fornecedor, enabled, getCacheKey, getFromCache, setToCache]);
  
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);
  
  return {
    isValidating,
    validationResult,
    error,
    clearCache
  };
}
