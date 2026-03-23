import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60000;
const PRAZO_DIAS = 30;
const ALERTA_DIAS_RESTANTES = 7;
const TRACKED_STATUSES = ["pendente_correcao", "aguardando_informacoes"];

interface SolicitacaoPendente {
  id: string;
  protocolo: string;
  user_id: string;
  data_pendente_correcao: string;
  empreendimento: string;
  status: string;
}

function getStatusLabel(status: string): { action: string; noun: string } {
  if (status === "aguardando_informacoes") {
    return { action: "resposta", noun: "Resposta" };
  }
  return { action: "correção", noun: "Correção" };
}

serve(async (req) => {
  console.log("=== CHECK-CORRECTION-DEADLINE FUNCTION CALLED ===");
  console.log("Timestamp:", new Date().toISOString());

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: pendentes, error: fetchError } = await supabase
      .from("solicitacoes")
      .select("id, protocolo, user_id, data_pendente_correcao, empreendimento, status")
      .in("status", TRACKED_STATUSES)
      .not("data_pendente_correcao", "is", null);

    if (fetchError) {
      console.error("[DEADLINE] Error fetching pending:", fetchError);
      throw fetchError;
    }

    console.log(`[DEADLINE] Found ${pendentes?.length || 0} solicitações pendentes`);

    const now = new Date();
    const results = { expired: [] as string[], alertSent: [] as string[], errors: [] as string[] };

    for (const sol of (pendentes || []) as SolicitacaoPendente[]) {
      const { action, noun } = getStatusLabel(sol.status);
      const dataPendente = new Date(sol.data_pendente_correcao);
      const diffDays = Math.floor((now.getTime() - dataPendente.getTime()) / (1000 * 60 * 60 * 24));
      const diasRestantes = PRAZO_DIAS - diffDays;

      console.log(`[DEADLINE] ${sol.protocolo} (${sol.status}): ${diffDays}d pendente (${diasRestantes}d restantes)`);

      try {
        if (diffDays >= PRAZO_DIAS) {
          console.log(`[DEADLINE] ${sol.protocolo}: Prazo expirado! Encerrando...`);

          const { error: updateError } = await supabase
            .from("solicitacoes")
            .update({ status: "rejeitado" })
            .eq("id", sol.id);

          if (updateError) {
            results.errors.push(`${sol.protocolo}: ${updateError.message}`);
            continue;
          }

          const { error: histError } = await supabase
            .from("historico_solicitacoes")
            .insert({
              solicitacao_id: sol.id,
              user_id: sol.user_id,
              acao: `prazo_${action}_expirado`,
              status_anterior: sol.status,
              status_novo: "rejeitado",
              motivo: `Solicitação encerrada automaticamente: prazo de ${PRAZO_DIAS} dias para ${action} expirou.`,
            });

          if (histError) {
            console.error(`[DEADLINE] History error for ${sol.protocolo}:`, histError);
          }

          await supabase.from("notifications").insert({
            user_id: sol.user_id,
            tipo: "error",
            titulo: `Prazo de ${noun} Expirado`,
            mensagem: `A solicitação ${sol.protocolo} foi encerrada automaticamente pois o prazo de ${PRAZO_DIAS} dias para ${action} expirou.`,
            solicitacao_id: sol.id,
          });

          await sendEmail(supabaseUrl, sol, "prazo_correcao_expirado", supabase, action);
          results.expired.push(sol.protocolo);

        } else if (diasRestantes <= ALERTA_DIAS_RESTANTES && diasRestantes > 0) {
          const { data: alertaExistente } = await supabase
            .from("notifications")
            .select("id")
            .eq("solicitacao_id", sol.id)
            .eq("tipo", "action_required")
            .ilike("titulo", `%Prazo de ${noun}%`)
            .gte("created_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!alertaExistente) {
            console.log(`[DEADLINE] ${sol.protocolo}: Enviando alerta (${diasRestantes}d restantes)`);

            await supabase.from("notifications").insert({
              user_id: sol.user_id,
              tipo: "action_required",
              titulo: `Prazo de ${noun}: ${diasRestantes} dias restantes`,
              mensagem: `A solicitação ${sol.protocolo} precisa de ${action} em até ${diasRestantes} dias ou será encerrada automaticamente.`,
              solicitacao_id: sol.id,
            });

            await sendEmail(supabaseUrl, sol, "prazo_correcao_expirando", supabase, action, diasRestantes);
            results.alertSent.push(sol.protocolo);
          }
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[DEADLINE] Error processing ${sol.protocolo}:`, err);
        results.errors.push(`${sol.protocolo}: ${errorMessage}`);
      }
    }

    console.log("[DEADLINE] Results:", JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({ success: true, processed: pendentes?.length || 0, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[DEADLINE] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

async function sendEmail(
  supabaseUrl: string,
  sol: SolicitacaoPendente,
  type: "prazo_correcao_expirando" | "prazo_correcao_expirado",
  supabase: any,
  action: string,
  diasRestantes?: number
) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", sol.user_id)
      .maybeSingle();

    if (!profile?.email) return;

    const response = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        type,
        to: profile.email,
        data: {
          protocolo: sol.protocolo,
          empreendimento: sol.empreendimento,
          solicitacao_id: sol.id,
          solicitante_nome: profile.full_name,
          dias_restantes: diasRestantes,
          tipo_prazo: action,
        },
      }),
    });

    const result = await response.json();
    console.log(`[DEADLINE] Email sent for ${sol.protocolo}:`, result);
  } catch (err) {
    console.error(`[DEADLINE] Error sending email for ${sol.protocolo}:`, err);
  }
}
