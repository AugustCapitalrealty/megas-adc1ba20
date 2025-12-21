import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  isVague: boolean;
  suggestion: string;
}

interface UseDescriptionValidationReturn {
  isValidating: boolean;
  validationResult: ValidationResult | null;
  error: string | null;
}

export function useDescriptionValidation(descricao: string, debounceMs = 1500): UseDescriptionValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidatedRef = useRef<string>('');

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset state if description is too short
    if (!descricao || descricao.trim().length < 15) {
      setValidationResult(null);
      setError(null);
      setIsValidating(false);
      return;
    }

    // Don't re-validate the same description
    if (descricao === lastValidatedRef.current) {
      return;
    }

    // Set debounce timeout
    timeoutRef.current = setTimeout(async () => {
      setIsValidating(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('validate-description', {
          body: { descricao: descricao.trim() }
        });

        if (fnError) {
          console.error('Validation function error:', fnError);
          setError('Erro ao validar descrição');
          setValidationResult(null);
        } else {
          lastValidatedRef.current = descricao;
          setValidationResult(data as ValidationResult);
        }
      } catch (err) {
        console.error('Validation error:', err);
        setError('Erro ao validar descrição');
        setValidationResult(null);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [descricao, debounceMs]);

  return { isValidating, validationResult, error };
}
