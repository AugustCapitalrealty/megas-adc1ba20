import { supabase } from '@/integrations/supabase/client';

type EmailType = 
  | 'nova_solicitacao_backoffice'
  | 'documento_oc_emitido';

interface EmailData {
  protocolo: string;
  descricao?: string;
  valor?: number;
  empreendimento?: string;
  documento_numero?: string;
  documento_tipo?: string;
  solicitacao_id?: string;
  solicitante_nome?: string;
  solicitante_email?: string;
}

export async function sendNotificationEmail(
  type: EmailType,
  to: string | string[],
  data: EmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const recipients = Array.isArray(to) ? to : [to];
    
    if (recipients.length === 0) {
      console.log('No recipients for email notification');
      return { success: true };
    }

    const { data: result, error } = await supabase.functions.invoke('send-notification-email', {
      body: { type, to: recipients, data }
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

// Get all users who should receive email notifications
export async function getEmailRecipients(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('receber_notificacoes_email', true);
  
  if (error || !data) {
    console.error('Error fetching email recipients:', error);
    return [];
  }
  
  return data.map(p => p.email);
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

// Notify all users with email notifications enabled (for new solicitacao)
export async function notifyBackofficeNewSolicitacao(
  data: Omit<EmailData, 'solicitacao_id'> & { solicitacao_id: string }
): Promise<{ success: boolean; error?: string }> {
  const recipients = await getEmailRecipients();
  
  if (recipients.length === 0) {
    console.log('No backoffice recipients configured for email notifications');
    return { success: true };
  }

  return sendNotificationEmail('nova_solicitacao_backoffice', recipients, data);
}

// Notify solicitacao owner when OC is emitted
export async function notifyOwnerOCEmitido(
  solicitacaoId: string,
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
    return sendNotificationEmail('documento_oc_emitido', email, {
      ...data,
      protocolo: data.protocolo || solicitacao.protocolo,
      solicitacao_id: solicitacaoId,
    });
  } catch (err: any) {
    console.error('Error notifying solicitacao owner:', err);
    return { success: false, error: err.message };
  }
}
