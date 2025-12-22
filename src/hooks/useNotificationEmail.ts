import { supabase } from '@/integrations/supabase/client';

type EmailType = 
  | 'nova_solicitacao'
  | 'status_change'
  | 'acao_requerida'
  | 'documento_emitido'
  | 'nova_mensagem'
  | 'solicitacao_concluida';

interface EmailData {
  protocolo: string;
  descricao?: string;
  valor?: number;
  status?: string;
  status_anterior?: string;
  status_novo?: string;
  motivo?: string;
  documento_numero?: string;
  documento_tipo?: string;
  mensagem?: string;
  remetente_nome?: string;
  empreendimento?: string;
  solicitacao_id?: string;
}

export async function sendNotificationEmail(
  type: EmailType,
  to: string,
  data: EmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-notification-email', {
      body: { type, to, data }
    });

    if (error) {
      console.error('Error sending notification email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error invoking send-notification-email:', err);
    return { success: false, error: err.message };
  }
}

// Helper to get user email from profiles table
export async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();
  
  if (error || !data) return null;
  return data.email;
}

// Combined function to send email to solicitacao owner
export async function notifySolicitacaoOwner(
  solicitacaoId: string,
  type: EmailType,
  data: Omit<EmailData, 'solicitacao_id'>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get solicitacao to find owner
    const { data: solicitacao, error: solError } = await supabase
      .from('solicitacoes')
      .select('user_id, protocolo')
      .eq('id', solicitacaoId)
      .single();

    if (solError || !solicitacao) {
      return { success: false, error: 'Solicitação não encontrada' };
    }

    // Get owner email
    const email = await getUserEmail(solicitacao.user_id);
    if (!email) {
      return { success: false, error: 'E-mail do usuário não encontrado' };
    }

    // Send email
    return sendNotificationEmail(type, email, {
      ...data,
      protocolo: data.protocolo || solicitacao.protocolo,
      solicitacao_id: solicitacaoId,
    });
  } catch (err: any) {
    console.error('Error notifying solicitacao owner:', err);
    return { success: false, error: err.message };
  }
}
