import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    console.log("Unsubscribe attempt without token");
    return new Response(
      generateHTML("Invalid Request", "No unsubscribe token provided.", false),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "text/html" } 
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the lead by unsubscribe token
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("id, email, status, campaign_id")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching lead:", fetchError);
      throw fetchError;
    }

    if (!lead) {
      console.log("Invalid unsubscribe token:", token);
      return new Response(
        generateHTML("Invalid Link", "This unsubscribe link is invalid or has expired.", false),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "text/html" } 
        }
      );
    }

    if (lead.status === "unsubscribed") {
      console.log("Lead already unsubscribed:", lead.email);
      return new Response(
        generateHTML("Already Unsubscribed", "You have already been unsubscribed from this campaign.", true),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "text/html" } 
        }
      );
    }

    // Update the lead status to unsubscribed
    const { error: updateError } = await supabase
      .from("leads")
      .update({ status: "unsubscribed" })
      .eq("id", lead.id);

    if (updateError) {
      console.error("Error updating lead status:", updateError);
      throw updateError;
    }

    console.log("Successfully unsubscribed:", lead.email);

    return new Response(
      generateHTML("Unsubscribed Successfully", "You have been successfully unsubscribed from this campaign. You will no longer receive emails.", true),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "text/html" } 
      }
    );

  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new Response(
      generateHTML("Error", "An error occurred while processing your request. Please try again later.", false),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "text/html" } 
      }
    );
  }
});

function generateHTML(title: string, message: string, success: boolean): string {
  const iconColor = success ? "#22c55e" : "#ef4444";
  const icon = success 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 48px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .icon {
      margin-bottom: 24px;
    }
    h1 {
      color: #1a1a2e;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #64748b;
      font-size: 16px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>
  `;
}
