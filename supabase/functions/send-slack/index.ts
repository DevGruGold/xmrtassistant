import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-eliza-key',
};

interface SlackMessage {
  channel: string;
  text: string;
  thread_ts?: string;
  blocks?: any[];
  attachments?: any[];
  executive_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
    if (!SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { channel, text, thread_ts, blocks, attachments, executive_name } = await req.json() as SlackMessage;

    if (!channel || !text) {
      throw new Error('channel and text are required');
    }

    const startTime = Date.now();

    // Send to Slack
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text,
        thread_ts,
        blocks,
        attachments,
      }),
    });

    const result = await slackResponse.json();
    const deliveryTime = Date.now() - startTime;

    // Log to communication_logs
    await supabase.from('communication_logs').insert({
      executive_name: executive_name || 'system',
      channel: 'slack',
      recipient: channel,
      message_preview: text.substring(0, 100),
      success: result.ok,
      error_message: result.error || null,
      delivery_time_ms: deliveryTime,
    });

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_ts: result.ts,
        channel: result.channel,
        delivery_time_ms: deliveryTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Slack send error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
