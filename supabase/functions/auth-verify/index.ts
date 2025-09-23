import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  address: string;
  message: string;
  signature: string;
  sessionType: 'siwf' | 'wallet';
  farcasterData?: {
    fid: string;
    username: string;
    displayName: string;
    pfpUrl: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { address, message, signature, sessionType, farcasterData }: VerifyRequest = await req.json();

    // Basic validation
    if (!address || !message || !signature || !sessionType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TODO: Implement signature verification logic here
    // For now, we'll assume the signature is valid if all fields are present
    const isValidSignature = true; // Replace with actual verification

    if (!isValidSignature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find or create user
    let user;
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('*')
      .eq('wallet_address', address)
      .single();

    if (existingUser) {
      user = existingUser;
      
      // Update user data if SIWF
      if (sessionType === 'siwf' && farcasterData) {
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({
            farcaster_fid: farcasterData.fid,
            handle: farcasterData.username,
            display_name: farcasterData.displayName,
            avatar_url: farcasterData.pfpUrl,
            last_seen: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      }
    } else {
      // Create new user
      const userData = {
        wallet_address: address,
        display_name: sessionType === 'siwf' && farcasterData 
          ? farcasterData.displayName 
          : `Player ${address.slice(-6)}`,
        is_guest: false
      };

      if (sessionType === 'siwf' && farcasterData) {
        Object.assign(userData, {
          farcaster_fid: farcasterData.fid,
          handle: farcasterData.username,
          avatar_url: farcasterData.pfpUrl
        });
      }

      const { data: newUser, error: createError } = await supabaseClient
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (createError) throw createError;
      user = newUser;
    }

    // Create session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: sessionError } = await supabaseClient
      .from('auth_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        auth_type: sessionType,
        wallet_address: address,
        farcaster_fid: farcasterData?.fid || null,
        signature_data: { message, signature },
        expires_at: expiresAt.toISOString()
      });

    if (sessionError) throw sessionError;

    return new Response(JSON.stringify({
      success: true,
      user,
      sessionToken,
      expiresAt: expiresAt.toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});