import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Get the app URL from environment or use a default
    const appUrl = Deno.env.get('APP_URL') || 'https://id-preview--a053ead0-5c27-4e2c-900a-ecdd4d5b0412.lovable.app';

    if (error) {
      console.error('OAuth error:', error);
      return Response.redirect(`${appUrl}/accounts?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return Response.redirect(`${appUrl}/accounts?error=missing_params`);
    }

    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      console.error('Invalid state');
      return Response.redirect(`${appUrl}/accounts?error=invalid_state`);
    }

    const { userId, timestamp } = stateData;
    
    // Check if state is not too old (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      console.error('State expired');
      return Response.redirect(`${appUrl}/accounts?error=state_expired`);
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!clientId || !clientSecret) {
      console.error('Google credentials not configured');
      return Response.redirect(`${appUrl}/accounts?error=server_config`);
    }

    const redirectUri = `${supabaseUrl}/functions/v1/google-oauth-callback`;

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('Token exchange error:', tokens.error);
      return Response.redirect(`${appUrl}/accounts?error=${encodeURIComponent(tokens.error)}`);
    }

    console.log('Tokens received, fetching user info...');

    // Get user email from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userInfoResponse.json();

    if (!userInfo.email) {
      console.error('Could not get email from Google');
      return Response.redirect(`${appUrl}/accounts?error=no_email`);
    }

    console.log('Got email:', userInfo.email);

    // Store the account in database using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('email', userInfo.email)
      .maybeSingle();

    if (existingAccount) {
      // Update existing account
      const { error: updateError } = await supabase
        .from('accounts')
        .update({
          is_connected: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id);

      if (updateError) {
        console.error('Error updating account:', updateError);
        return Response.redirect(`${appUrl}/accounts?error=db_error`);
      }
    } else {
      // Create new account
      const { error: insertError } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          email: userInfo.email,
          provider: 'google',
          daily_limit: 50,
          is_connected: true,
        });

      if (insertError) {
        console.error('Error inserting account:', insertError);
        return Response.redirect(`${appUrl}/accounts?error=db_error`);
      }
    }

    console.log('Account saved successfully');

    // Redirect back to accounts page with success
    return Response.redirect(`${appUrl}/accounts?success=true`);
  } catch (error) {
    console.error('Unexpected error in google-oauth-callback:', error);
    const appUrl = Deno.env.get('APP_URL') || 'https://id-preview--a053ead0-5c27-4e2c-900a-ecdd4d5b0412.lovable.app';
    return Response.redirect(`${appUrl}/accounts?error=unexpected`);
  }
});
