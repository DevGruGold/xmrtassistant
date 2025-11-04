import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-eliza-key',
};

interface TwitterMessage {
  text: string;
  media_ids?: string[];
  reply_to_tweet_id?: string;
  executive_name?: string;
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const hmacSha1 = createHmac("sha1", signingKey);
  return hmacSha1.update(signatureBaseString).digest("base64");
}

function generateOAuthHeader(method: string, url: string, apiKey: string, apiSecret: string, accessToken: string, accessSecret: string): string {
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(method, url, oauthParams, apiSecret, accessSecret);
  const signedOAuthParams = { ...oauthParams, oauth_signature: signature };

  return "OAuth " + Object.entries(signedOAuthParams)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWITTER_API_KEY = Deno.env.get('TWITTER_API_KEY');
    const TWITTER_API_SECRET = Deno.env.get('TWITTER_API_SECRET');
    const TWITTER_ACCESS_TOKEN = Deno.env.get('TWITTER_ACCESS_TOKEN');
    const TWITTER_ACCESS_SECRET = Deno.env.get('TWITTER_ACCESS_SECRET');

    if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
      throw new Error('Twitter API credentials not fully configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { text, media_ids, reply_to_tweet_id, executive_name } = await req.json() as TwitterMessage;

    if (!text) {
      throw new Error('text is required');
    }

    const startTime = Date.now();
    const url = "https://api.x.com/2/tweets";
    const method = "POST";

    const oauthHeader = generateOAuthHeader(
      method, 
      url, 
      TWITTER_API_KEY, 
      TWITTER_API_SECRET, 
      TWITTER_ACCESS_TOKEN, 
      TWITTER_ACCESS_SECRET
    );

    const body: any = { text };
    if (media_ids && media_ids.length > 0) {
      body.media = { media_ids };
    }
    if (reply_to_tweet_id) {
      body.reply = { in_reply_to_tweet_id: reply_to_tweet_id };
    }

    const twitterResponse = await fetch(url, {
      method,
      headers: {
        'Authorization': oauthHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await twitterResponse.json();
    const deliveryTime = Date.now() - startTime;

    // Log to communication_logs
    await supabase.from('communication_logs').insert({
      executive_name: executive_name || 'system',
      channel: 'twitter',
      recipient: 'public',
      message_preview: text.substring(0, 100),
      success: twitterResponse.ok,
      error_message: result.detail || result.error || null,
      delivery_time_ms: deliveryTime,
    });

    if (!twitterResponse.ok) {
      throw new Error(`Twitter API error: ${result.detail || result.error || twitterResponse.status}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tweet_id: result.data?.id,
        delivery_time_ms: deliveryTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Twitter send error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
