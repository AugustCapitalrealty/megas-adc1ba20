import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT, RATE_WINDOW_MS);

  if (!rateLimitResult.allowed) {
    console.log(`[check-service-execution] Rate limit exceeded for IP: ${clientIP}`);
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Today in YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];

    // Fetch solicitations with aguardando_execucao and data_execucao_servico <= today
    const { data: solicitacoes, error: solError } = await supabase
      .from("solicitacoes")
      .select("id, protocolo, data_execucao_servico")
      .eq("status", "aguardando_execucao")
      .not("data_execucao_servico", "is", null)
      .lte("data_execucao_servico", today);

    if (solError) throw solError;
    if (!solicitacoes?.length) {
      return new Response(
        JSON.stringify({ alerts: 0, checked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get backoffice/admin user IDs
    const { data: backofficeUsers, error: usersError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["backoffice", "admin"]);

    if (usersError) throw usersError;
    const backofficeUserIds = [...new Set((backofficeUsers || []).map((u: any) => u.user_id))];

    if (!backofficeUserIds.length) {
      return new Response(
        JSON.stringify({ alerts: 0, checked: solicitacoes.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let alertCount = 0;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    for (const sol of solicitacoes) {
      // Check for existing recent notification (last 24h)
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("solicitacao_id", sol.id)
        .ilike("titulo", "%Solicitar NF%")
        .gte("created_at", oneDayAgo)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Format date for message
      const dataExec = sol.data_execucao_servico
        ? new Date(sol.data_execucao_servico + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
        : "N/A";

      const notifications = backofficeUserIds.map((userId: string) => ({
        user_id: userId,
        tipo: "action_required",
        titulo: `📋 Solicitar NF — ${sol.protocolo || sol.id}`,
        mensagem: `O serviço da solicitação ${sol.protocolo || sol.id} foi executado em ${dataExec}. Solicite a NF e boleto ao solicitante.`,
        solicitacao_id: sol.id,
        prioridade: "high",
      }));

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (!insertError) alertCount += notifications.length;
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
