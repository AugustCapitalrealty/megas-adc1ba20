import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated admin/backoffice caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supa.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const { data: isBO } = await supa.rpc("is_backoffice_or_admin", { _user_id: user.id });
    if (!isBO) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    console.log("Iniciando envio de e-mail de teste...");
    
    const emailResponse = await resend.emails.send({
      from: "BA Chamados <onboarding@resend.dev>",
      to: ["guilherme.marques@capitalrealty.com.br"],
      subject: "🧪 Teste - Sistema de E-mails BA Chamados",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">BA Chamados</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Sistema de Solicitações</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #1e40af; margin-top: 0;">✅ Teste de E-mail Bem-Sucedido!</h2>
            
            <p>Olá,</p>
            
            <p>Se você está recebendo este e-mail, significa que a integração do sistema de notificações por e-mail está funcionando corretamente.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0;">
              <p style="margin: 0; color: #166534;"><strong>Status:</strong> Configuração concluída com sucesso</p>
              <p style="margin: 10px 0 0 0; color: #666;"><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            </div>
            
            <p>A partir de agora, você poderá receber notificações por e-mail sobre:</p>
            <ul style="color: #666;">
              <li>Novas solicitações criadas</li>
              <li>Atualizações de status</li>
              <li>Documentos emitidos (OC/AC)</li>
              <li>Mensagens no chat</li>
              <li>Ações pendentes</li>
            </ul>
          </div>
          
          <div style="background: #1e293b; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">
              Este é um e-mail automático do sistema BA Chamados.<br>
              Capital Realty © ${new Date().getFullYear()}
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("E-mail enviado com sucesso:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "E-mail de teste enviado com sucesso!",
        data: emailResponse 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro ao enviar e-mail:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
