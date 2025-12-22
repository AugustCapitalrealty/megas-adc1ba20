import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email types supported (simplified)
type EmailType = 'nova_solicitacao_backoffice' | 'documento_oc_emitido';

interface EmailRequest {
  type: EmailType;
  to: string | string[];
  data: {
    protocolo: string;
    descricao?: string;
    valor?: number;
    empreendimento?: string;
    solicitacao_id?: string;
    solicitante_nome?: string;
    solicitante_email?: string;
    documento_numero?: string;
    documento_tipo?: string;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const APP_URL = Deno.env.get("APP_URL") || "https://bachamados.capitalrealty.com.br";

const getEmailContent = (type: EmailType, data: EmailRequest['data']): { subject: string; html: string } => {
  const baseStyles = `
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  `;
  
  const headerHtml = `
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">BA Chamados</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Sistema de Solicitações</p>
    </div>
  `;
  
  const footerHtml = `
    <div style="background: #1e293b; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
      <p style="color: #94a3b8; margin: 0; font-size: 12px;">
        Este é um e-mail automático do sistema BA Chamados.<br>
        Capital Realty © ${new Date().getFullYear()}
      </p>
    </div>
  `;
  
  const buttonHtml = `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/backoffice" 
         style="background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        Acessar Sistema
      </a>
    </div>
  `;

  const buttonSolicitanteHtml = `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/minhas-solicitacoes" 
         style="background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        Ver Minhas Solicitações
      </a>
    </div>
  `;
  
  const infoBoxHtml = (content: string, borderColor = '#3b82f6') => `
    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${borderColor}; margin: 20px 0;">
      ${content}
    </div>
  `;

  switch (type) {
    case 'nova_solicitacao_backoffice':
      return {
        subject: `🆕 Nova Solicitação ${data.protocolo} - ${data.empreendimento || 'BA Chamados'}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="${baseStyles}">
            ${headerHtml}
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <h2 style="color: #1e40af; margin-top: 0;">Nova Solicitação Recebida</h2>
              <p>Uma nova solicitação foi criada e precisa de análise.</p>
              ${infoBoxHtml(`
                <p style="margin: 0;"><strong>Protocolo:</strong> ${data.protocolo}</p>
                ${data.empreendimento ? `<p style="margin: 10px 0 0 0;"><strong>Empreendimento:</strong> ${data.empreendimento}</p>` : ''}
                ${data.valor ? `<p style="margin: 10px 0 0 0;"><strong>Valor:</strong> ${formatCurrency(data.valor)}</p>` : ''}
              `, '#f59e0b')}
              ${data.solicitante_nome ? `
                <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #0369a1;"><strong>Solicitante:</strong> ${data.solicitante_nome}</p>
                  ${data.solicitante_email ? `<p style="margin: 5px 0 0 0; color: #0369a1;"><strong>E-mail:</strong> ${data.solicitante_email}</p>` : ''}
                </div>
              ` : ''}
              ${data.descricao ? `<p style="color: #666;"><strong>Descrição:</strong> ${data.descricao.substring(0, 300)}${data.descricao.length > 300 ? '...' : ''}</p>` : ''}
              ${buttonHtml}
            </div>
            ${footerHtml}
          </body>
          </html>
        `,
      };

    case 'documento_oc_emitido':
      return {
        subject: `📄 OC Emitida: ${data.documento_numero || ''} - Solicitação ${data.protocolo}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="${baseStyles}">
            ${headerHtml}
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <h2 style="color: #22c55e; margin-top: 0;">🎉 Ordem de Compra Emitida!</h2>
              <p>A Ordem de Compra para sua solicitação <strong>${data.protocolo}</strong> foi emitida.</p>
              ${infoBoxHtml(`
                <p style="margin: 0;"><strong>Tipo:</strong> ${data.documento_tipo || 'OC'}</p>
                ${data.documento_numero ? `<p style="margin: 10px 0 0 0;"><strong>Número:</strong> ${data.documento_numero}</p>` : ''}
                ${data.empreendimento ? `<p style="margin: 10px 0 0 0;"><strong>Empreendimento:</strong> ${data.empreendimento}</p>` : ''}
              `, '#22c55e')}
              <p>Acesse o sistema para visualizar e baixar o documento.</p>
              ${buttonSolicitanteHtml}
            </div>
            ${footerHtml}
          </body>
          </html>
        `,
      };

    default:
      return {
        subject: `Atualização: Solicitação ${data.protocolo}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="${baseStyles}">
            ${headerHtml}
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <h2 style="color: #1e40af; margin-top: 0;">Atualização da Solicitação</h2>
              <p>Houve uma atualização na solicitação <strong>${data.protocolo}</strong>.</p>
              ${buttonHtml}
            </div>
            ${footerHtml}
          </body>
          </html>
        `,
      };
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data } = await req.json() as EmailRequest;
    
    console.log(`Sending ${type} email to ${to}...`, data);
    
    if (!type || !to || !data) {
      throw new Error("Missing required fields: type, to, data");
    }

    const { subject, html } = getEmailContent(type, data);
    
    // FIX: Handle both string and array, avoid double-wrapping
    const recipients = Array.isArray(to) ? to : [to];
    
    console.log(`Recipients (${recipients.length}):`, recipients);
    
    const emailResponse = await resend.emails.send({
      from: "BA Chamados <onboarding@resend.dev>",
      to: recipients,
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
