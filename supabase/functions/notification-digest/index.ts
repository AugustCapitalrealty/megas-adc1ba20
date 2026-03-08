import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL") || "https://megas.lovable.app";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendKey);

    // Find users who opted into email notifications
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, full_name, receber_notificacoes_email")
      .eq("receber_notificacoes_email", true)
      .eq("approved", true);

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users opted in", sent: 0 }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let sent = 0;

    for (const user of users) {
      // Get unread notifications from last 24h
      const { data: notifications, error: notifError } = await supabase
        .from("notifications")
        .select("titulo, mensagem, tipo, created_at")
        .eq("user_id", user.id)
        .eq("lida", false)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);

      if (notifError || !notifications || notifications.length === 0) continue;

      const notifRows = notifications
        .map((n) => {
          const icon = n.tipo === "success" ? "✅" : n.tipo === "error" ? "❌" : n.tipo === "action_required" ? "⚠️" : "ℹ️";
          return `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${icon}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;"><strong>${n.titulo}</strong><br><span style="color:#64748b;font-size:13px;">${n.mensagem}</span></td></tr>`;
        })
        .join("");

      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
            <h1 style="color:white;margin:0;font-size:24px;">BA Chamados</h1>
            <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;">Resumo de Notificações</p>
          </div>
          <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:none;">
            <p>Olá, <strong>${user.full_name || "Usuário"}</strong>!</p>
            <p>Você tem <strong>${notifications.length}</strong> notificação(ões) não lida(s) nas últimas 24 horas:</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              ${notifRows}
            </table>
            <div style="text-align:center;margin:30px 0;">
              <a href="${APP_URL}" style="background:#1e40af;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Acessar Sistema</a>
            </div>
          </div>
          <div style="background:#1e293b;padding:20px;text-align:center;border-radius:0 0 10px 10px;">
            <p style="color:#94a3b8;margin:0;font-size:12px;">
              Este é um e-mail automático do sistema BA Chamados.<br>
              Capital Realty © ${new Date().getFullYear()}
            </p>
          </div>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: "BA Chamados <onboarding@resend.dev>",
          to: [user.email],
          subject: `📋 Resumo: ${notifications.length} notificação(ões) pendente(s) — BA Chamados`,
          html,
        });
        sent++;
      } catch (emailErr: any) {
        console.error(`[DIGEST] Failed to send to ${user.email}:`, emailErr.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, total_users: users.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[DIGEST] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
