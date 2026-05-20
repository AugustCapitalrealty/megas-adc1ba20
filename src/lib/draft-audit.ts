import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type DraftAuditEvent =
  | 'anexo_persistido_aceito'
  | 'rascunho_liberado_envio';

/**
 * Registra um evento de auditoria sobre o modo rascunho.
 * Fire-and-forget: nunca bloqueia a UI; falhas só vão para o logger.
 */
export function logDraftAudit(
  evento: DraftAuditEvent,
  solicitacaoId: string,
  userId: string | null | undefined,
  detalhes: Record<string, unknown> = {},
): void {
  if (!userId || !solicitacaoId) return;

  supabase
    .from('solicitacao_draft_audit' as any)
    .insert([{
      solicitacao_id: solicitacaoId,
      user_id: userId,
      evento,
      detalhes: detalhes as any,
    }])
    .then(({ error }: any) => {
      if (error) logger.debug('[DraftAudit] insert falhou:', error.message);
    });
}