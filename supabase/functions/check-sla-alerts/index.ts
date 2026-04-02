import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate limit: 5 requests per minute per IP (cron job)
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check rate limit
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT, RATE_WINDOW_MS);
  
  if (!rateLimitResult.allowed) {
    console.log(`[check-sla-alerts] Rate limit exceeded for IP: ${clientIP}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch active solicitations
    const activeStatuses = ["recebido", "em_analise", "aprovado", "em_processamento"];
    const { data: solicitacoes, error: solError } = await supabase
      .from("solicitacoes")
      .select("id, protocolo")
      .in("status", activeStatuses);

    if (solError) throw solError;
    if (!solicitacoes?.length) {
      return new Response(JSON.stringify({ alerts: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get backoffice/admin user IDs
    const { data: backofficeUsers, error: usersError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["backoffice", "admin"]);

    if (usersError) throw usersError;
    const backofficeUserIds = [...new Set((backofficeUsers || []).map((u) => u.user_id))];

    if (!backofficeUserIds.length) {
      return new Response(JSON.stringify({ alerts: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let alertCount = 0;

    for (const sol of solicitacoes) {
      // Calculate SLA
      const { data: slaData, error: slaError } = await supabase.rpc(
        "calcular_sla_solicitacao",
        { p_solicitacao_id: sol.id }
      );

      if (slaError || !slaData) continue;

      const dias = typeof slaData === "object" ? (slaData as any).dias_uteis_backoffice : null;
      if (dias === null || dias === undefined) continue;
      const diasNum = Number(dias);

      // Check if at 80% threshold (2.4 days) but not yet exceeded (3 days)
      if (diasNum >= 2.4 && diasNum < 3) {
        // Check for existing recent alert (last 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("solicitacao_id", sol.id)
          .ilike("titulo", "%SLA%")
          .gte("created_at", oneDayAgo)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Create notification for all backoffice users
        const notifications = backofficeUserIds.map((userId) => ({
          user_id: userId,
          tipo: "action_required",
          titulo: "⚠️ Alerta de SLA",
          mensagem: `A solicitação ${sol.protocolo || sol.id} está em ${diasNum.toFixed(1)} dias úteis (80% do SLA de 3 dias). Ação necessária.`,
          solicitacao_id: sol.id,
          prioridade: "high",
        }));

        const { error: insertError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (!insertError) alertCount += notifications.length;
      }
    }

    return new Response(
      JSON.stringify({ alerts: alertCount, checked: solicitacoes.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
