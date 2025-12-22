import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email types supported
type EmailType = 
  | 'nova_solicitacao'
  | 'status_change'
  | 'acao_requerida'
  | 'documento_emitido'
  | 'nova_mensagem'
  | 'solicitacao_concluida';

interface EmailRequest {
  type: EmailType;
  to: string;
  data: {
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
  };
}

const STATUS_LABELS: Record<string, string> = {
  recebido: 'Em Fila',
  em_analise: 'Em Análise pelo Backoffice',
  pendente_correcao: 'Correção Necessária',
  aprovado: 'Em Lançamento',
  rejeitado: 'Não Aprovado',
  em_processamento: 'Em Aprovação',
  oc_ac_emitida: 'OC Enviada - Aguardando Aceite',
  concluida: 'Finalizada',
  aguardando_aceite: 'Aguardando Aceite do Solicitante',
  aguardando_informacoes: 'Aguardando Informações',
  aguardando_nf_boleto: 'Aguardando NF/Boleto',
  nf_boleto_enviados: 'NF/Boleto Enviados',
  enviado_pagamento: 'Enviado para Pagamento',
};

const getStatusLabel = (status: string) => STATUS_LABELS[status] || status;

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
  
  const buttonHtml = data.solicitacao_id ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/minhas-solicitacoes" 
         style="background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        Ver Solicitação
      </a>
    </div>
  ` : '';
  
  const infoBoxHtml = (content: string, borderColor = '#3b82f6') => `
    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${borderColor}; margin: 20px 0;">
      ${content}
    </div>
  `;

  switch (type) {
    case 'nova_solicitacao':
      return {
        subject: `✅ Solicitação ${data.protocolo} recebida`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="${baseStyles}">
            ${headerHtml}
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <h2 style="color: #1e40af; margin-top: 0;">Solicitação Criada com Sucesso!</h2>
              <p>Sua solicitação foi recebida e está sendo processada.</p>
              ${infoBoxHtml(`
                <p style="margin: 0;"><strong>Protocolo:</strong> ${data.protocolo}</p>
                ${data.valor ? `<p style="margin: 10px 0 0 0;"><strong>Valor:</strong> ${formatCurrency(data.valor)}</p>` : ''}
                ${data.empreendimento ? `<p style="margin: 10px 0 0 0;"><strong>Empreendimento:</strong> ${data.empreendimento}</p>` : ''}
              `, '#22c55e')}
              ${data.descricao ? `<p style="color: #666;"><strong>Descrição:</strong> ${data.descricao.substring(0, 200)}${data.descricao.length > 200 ? '...' : ''}</p>` : ''}
              <p>Você receberá atualizações sobre o andamento da sua solicitação.</p>
              ${buttonHtml}
            </div>
            ${footerHtml}
          </body>
          </html>
        `,
      };

    case 'status_change':
      const statusColor = data.status_novo === 'rejeitado' ? '#ef4444' : 
                          data.status_novo === 'concluida' ? '#22c55e' : 
                          data.status_novo === 'pendente_correcao' ? '#f59e0b' : '#3b82f6';
      return {
        subject: `📋 Atualização: Solicitação ${data.protocolo} - ${getStatusLabel(data.status_novo || '')}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="${baseStyles}">
            ${headerHtml}
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <h2 style="color: #1e40af; margin-top: 0;">Status Atualizado</h2>
              <p>A solicitação <strong>${data.protocolo}</strong> teve seu status alterado.</p>
              ${infoBoxHtml(`
                <p style="margin: 0; color: #666;"><strong>Status Anterior:</strong> ${getStatusLabel(data.status_anterior || '')}</p>
                <p style="margin: 10px 0 0 0;"><strong>Novo Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${getStatusLabel(data.status_novo || '')}</span></p>
              `, statusColor)}
              ${data.motivo ? `
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e;"><strong>Observação:</strong> ${data.motivo}</p>
                </div>
              ` : ''}
              ${buttonHtml}
            </div>
            ${footerHtml}
          </body>
          </html>
        `,
      };

    case 'acao_requerida':
      return {
        subject: `⚠️ Ação Necessária: Solicitação ${data.protocolo}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="${baseStyles}">
            ${headerHtml}
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <h2 style="color: #f59e0b; margin-top: 0;">⚠️ Ação Necessária</h2>
              <p>A solicitação <strong>${data.protocolo}</strong> requer sua atenção.</p>
              ${infoBoxHtml(`
                <p style="margin: 0;"><strong>Status:</strong> ${getStatusLabel(data.status_novo || data.status || '')}</p>
              `, '#f59e0b')}
              ${data.motivo ? `
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e;"><strong>Motivo:</strong> ${data.motivo}</p>
                </div>
              ` : ''}
              <p><strong>Por favor, acesse o sistema para verificar e tomar as ações necessárias.</strong></p>
              ${buttonHtml}
            </div>
            ${footerHtml}
          </body>
          </html>
        `,
      };

    case 'documento_emitido':
      return {
        subject: `📄 Documento Emitido: ${data.documento_tipo} ${data.documento_numero} - Solicitação ${data.protocolo}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="${baseStyles}">
            ${headerHtml}
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <h2 style="color: #22c55e; margin-top: 0;">🎉 Documento Emitido!</h2>
              <p>Um documento foi emitido para a solicitação <strong>${data.protocolo}</strong>.</p>
              ${infoBoxHtml(`
                <p style="margin: 0;"><strong>Tipo:</strong> ${data.documento_tipo}</p>
                <p style="margin: 10px 0 0 0;"><strong>Número:</strong> ${data.documento_numero}</p>
              `, '#22c55e')}
              <p>Acesse o sistema para visualizar e baixar o documento.</p>
              ${buttonHtml}
            </div>
            ${footerHtml}
          </body>
          </html>
        `,
      };

    case 'nova_mensagem':
      return {
        subject: `💬 Nova Mensagem: Solicitação ${data.protocolo}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="${baseStyles}">
            ${headerHtml}
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <h2 style="color: #1e40af; margin-top: 0;">Nova Mensagem</h2>
              <p>Você recebeu uma nova mensagem na solicitação <strong>${data.protocolo}</strong>.</p>
              ${data.remetente_nome ? `<p><strong>De:</strong> ${data.remetente_nome}</p>` : ''}
              ${data.mensagem ? `
                <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
                  <p style="margin: 0; color: #333;">"${data.mensagem.substring(0, 300)}${data.mensagem.length > 300 ? '...' : ''}"</p>
                </div>
              ` : ''}
              ${buttonHtml}
            </div>
            ${footerHtml}
          </body>
          </html>
        `,
      };

    case 'solicitacao_concluida':
      return {
        subject: `✅ Solicitação ${data.protocolo} Finalizada`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="${baseStyles}">
            ${headerHtml}
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <h2 style="color: #22c55e; margin-top: 0;">🎉 Solicitação Concluída!</h2>
              <p>A solicitação <strong>${data.protocolo}</strong> foi finalizada com sucesso.</p>
              ${infoBoxHtml(`
                <p style="margin: 0; color: #166534;"><strong>Status:</strong> Finalizada</p>
                ${data.valor ? `<p style="margin: 10px 0 0 0;"><strong>Valor:</strong> ${formatCurrency(data.valor)}</p>` : ''}
              `, '#22c55e')}
              <p>Obrigado por utilizar o sistema BA Chamados!</p>
              ${buttonHtml}
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
    
    const emailResponse = await resend.emails.send({
      from: "BA Chamados <onboarding@resend.dev>", // TODO: Change to noreply@bachamados.capitalrealty.com.br when verified
      to: [to],
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
