import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get("c");
    const leadId = url.searchParams.get("l");
    const variantId = url.searchParams.get("v");
    const targetUrl = url.searchParams.get("url");

    console.log("Track click request:", { campaignId, leadId, variantId, targetUrl });

    if (!targetUrl) {
      console.error("Missing target URL");
      return new Response("Missing target URL", { status: 400 });
    }

    // Decode the target URL
    const decodedUrl = decodeURIComponent(targetUrl);

    // Only track if we have campaign and lead IDs
    if (campaignId && leadId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Record the click event
      const { error } = await supabase.from("email_events").insert({
        campaign_id: campaignId,
        lead_id: leadId,
        variant_id: variantId || null,
        event_type: "clicked",
      });

      if (error) {
        console.error("Error recording click event:", error);
      } else {
        console.log("Click event recorded successfully");
      }
    }

    // Redirect to the target URL
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: decodedUrl,
      },
    });
  } catch (error) {
    console.error("Error in track-click function:", error);
    // Still redirect even if tracking fails
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");
    if (targetUrl) {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: decodeURIComponent(targetUrl),
        },
      });
    }
    return new Response("Internal server error", { status: 500 });
  }
});
