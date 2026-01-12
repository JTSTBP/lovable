import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BouncePayload {
  email: string;
  event?: string;
  type?: string;
  reason?: string;
  campaign_id?: string;
  // Support various webhook formats
  recipient?: string;
  bounce_type?: string;
  error_code?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: BouncePayload = await req.json();
    console.log("Received bounce webhook:", JSON.stringify(payload));

    // Extract email from various possible payload formats
    const email = payload.email || payload.recipient;

    if (!email) {
      console.error("No email found in bounce payload");
      return new Response(
        JSON.stringify({ error: "No email provided in payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find leads with this email that are not already bounced
    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select("id, campaign_id, status")
      .eq("email", email.toLowerCase().trim())
      .neq("status", "bounced");

    if (fetchError) {
      console.error("Error fetching leads:", fetchError);
      throw fetchError;
    }

    if (!leads || leads.length === 0) {
      console.log("No active leads found for email:", email);
      return new Response(
        JSON.stringify({ message: "No active leads found for this email", email }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${leads.length} leads to mark as bounced for email: ${email}`);

    // Update all leads with this email to bounced status
    const leadIds = leads.map((lead) => lead.id);
    const { error: updateError } = await supabase
      .from("leads")
      .update({ status: "bounced" })
      .in("id", leadIds);

    if (updateError) {
      console.error("Error updating lead status:", updateError);
      throw updateError;
    }

    // Record bounce events for each lead
    const bounceEvents = leads
      .filter((lead) => lead.campaign_id)
      .map((lead) => ({
        campaign_id: lead.campaign_id!,
        lead_id: lead.id,
        event_type: "bounced",
      }));

    if (bounceEvents.length > 0) {
      const { error: eventError } = await supabase
        .from("email_events")
        .insert(bounceEvents);

      if (eventError) {
        console.error("Error recording bounce events:", eventError);
        // Don't throw - the main operation succeeded
      }
    }

    console.log(`Successfully marked ${leads.length} leads as bounced for email: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Marked ${leads.length} lead(s) as bounced`,
        email,
        lead_ids: leadIds,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Bounce webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
