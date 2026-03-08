import { supabase } from '@/integrations/supabase/client';

/**
 * After sending a message, notify the other party:
 * - If sender is backoffice/admin → notify the solicitação owner
 * - If sender is the owner → notify all backoffice/admin users
 */
export async function notifyMessageRecipients(
  solicitacaoId: string,
  senderId: string,
  messagePreview: string,
) {
  try {
    // Get the solicitação owner and protocolo
    const { data: sol } = await supabase
      .from('solicitacoes')
      .select('user_id, protocolo')
      .eq('id', solicitacaoId)
      .single();

    if (!sol) return;

    // Get sender profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', senderId)
      .single();

    const senderName = senderProfile?.full_name || senderProfile?.email || 'Usuário';
    const preview = messagePreview.length > 100 ? messagePreview.slice(0, 100) + '...' : messagePreview;

    // Check if sender is backoffice/admin
    const { data: senderRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', senderId);

    const isBackoffice = senderRoles?.some(r => r.role === 'backoffice' || r.role === 'admin');

    if (isBackoffice) {
      // Notify the owner
      await supabase.from('notifications').insert({
        user_id: sol.user_id,
        tipo: 'action_required',
        titulo: `Nova mensagem de ${senderName}`,
        mensagem: `${senderName} enviou uma mensagem na solicitação ${sol.protocolo}: "${preview}"`,
        solicitacao_id: solicitacaoId,
        prioridade: 'high',
      });
    } else {
      // Sender is the owner → notify all backoffice/admin
      const { data: backofficeUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['backoffice', 'admin']);

      if (backofficeUsers) {
        const uniqueIds = [...new Set(backofficeUsers.map(u => u.user_id))];
        const notifications = uniqueIds
          .filter(uid => uid !== senderId)
          .map(uid => ({
            user_id: uid,
            tipo: 'action_required',
            titulo: `Nova mensagem de ${senderName}`,
            mensagem: `${senderName} enviou uma mensagem na solicitação ${sol.protocolo}: "${preview}"`,
            solicitacao_id: solicitacaoId,
            prioridade: 'high',
          }));

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }
    }
  } catch (error) {
    console.error('Error sending message notifications:', error);
  }
}
