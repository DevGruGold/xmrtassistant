import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-eliza-key',
};

interface DiscordMessage {
  channel_id?: string;
  webhook_url?: string;
  content: string;
  embeds?: any[];
  thread_id?: string;
  executive_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
    const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_WEBHOOK_URL');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { channel_id, webhook_url, content, embeds, thread_id, executive_name } = await req.json() as DiscordMessage;

    if (!content) {
      throw new Error('content is required');
    }

    const startTime = Date.now();
    let result;
    let recipient;

    // Use webhook if provided or configured (simpler, no bot needed)
    if (webhook_url || DISCORD_WEBHOOK_URL) {
      const targetWebhook = webhook_url || DISCORD_WEBHOOK_URL!;
      recipient = 'webhook';
      
      const webhookResponse = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, embeds, thread_id }),
      });

      if (!webhookResponse.ok) {
        throw new Error(`Discord webhook error: ${webhookResponse.status}`);
      }

      result = { success: true, method: 'webhook' };
    } 
    // Use bot API if token provided
    else if (DISCORD_BOT_TOKEN && channel_id) {
      recipient = channel_id;
      
      const botResponse = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, embeds }),
      });

      if (!botResponse.ok) {
        throw new Error(`Discord bot API error: ${botResponse.status}`);
      }

      result = await botResponse.json();
      result.method = 'bot';
    } else {
      throw new Error('Either webhook_url or (DISCORD_BOT_TOKEN + channel_id) required');
    }

    const deliveryTime = Date.now() - startTime;

    // Log to communication_logs
    await supabase.from('communication_logs').insert({
      executive_name: executive_name || 'system',
      channel: 'discord',
      recipient,
      message_preview: content.substring(0, 100),
      success: true,
      delivery_time_ms: deliveryTime,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        delivery_time_ms: deliveryTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Discord send error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
