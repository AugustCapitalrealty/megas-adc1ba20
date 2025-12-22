import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Empreendimento } from '@/types';

export function useUserEmpreendimentos(userId: string | undefined) {
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAllAccess, setHasAllAccess] = useState(false);

  useEffect(() => {
    if (!userId) {
      setEmpreendimentos([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data, error } = await supabase
        .from('user_empreendimentos')
        .select('empreendimento')
        .eq('user_id', userId);

      if (!error && data) {
        const list = data.map(d => d.empreendimento as Empreendimento);
        setEmpreendimentos(list);
        setHasAllAccess(list.includes('todos'));
      }
      setLoading(false);
    };

    fetch();
  }, [userId]);

  return { empreendimentos, loading, hasAllAccess };
}
