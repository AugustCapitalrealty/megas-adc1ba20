import { supabase } from '@/integrations/supabase/client';
import { MODULO_VAGO_CLIENTE_ID } from '@/lib/solicitacao-rules';

/**
 * Registro em memória dos clientes do tipo "módulo vago".
 * Esses clientes não são clientes reais, então solicitações vinculadas a eles
 * não exigem o anexo `comunicado_cliente`.
 */
const moduloVagoIds = new Set<string>([MODULO_VAGO_CLIENTE_ID]);
let loaded = false;
let loadingPromise: Promise<void> | null = null;

export function isModuloVagoCliente(clienteId: string | null | undefined): boolean {
  if (!clienteId) return false;
  return moduloVagoIds.has(clienteId);
}

export function isModuloVagoNome(nome: string | null | undefined): boolean {
  if (!nome) return false;
  return /m[oó]dulos?\s+vago/i.test(nome);
}

/** Carrega (uma vez) a lista de clientes marcados como módulo vago. */
export async function loadModuloVagoClientes(): Promise<void> {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const { data, error } = await supabase.from('clientes').select('id, nome, modulo_vago');
    if (!error && data) {
      for (const c of data as Array<{ id: string; nome: string; modulo_vago?: boolean }>) {
        if ((c as any).modulo_vago === true || isModuloVagoNome(c.nome)) moduloVagoIds.add(c.id);
      }
      loaded = true;
    }
    loadingPromise = null;
  })();
  return loadingPromise;
}