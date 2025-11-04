import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-eliza-key',
};

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: any;
  photo?: string;
  document?: string;
  executive_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { chat_id, text, parse_mode, reply_markup, photo, document, executive_name } = await req.json() as TelegramMessage;

    if (!chat_id || !text) {
      throw new Error('chat_id and text are required');
    }

    const startTime = Date.now();
    const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    
    let endpoint = 'sendMessage';
    let body: any = { chat_id, text, parse_mode, reply_markup };

    // Send photo if provided
    if (photo) {
      endpoint = 'sendPhoto';
      body = { chat_id, photo, caption: text, parse_mode };
    }
    // Send document if provided
    else if (document) {
      endpoint = 'sendDocument';
      body = { chat_id, document, caption: text, parse_mode };
    }

    const telegramResponse = await fetch(`${baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await telegramResponse.json();
    const deliveryTime = Date.now() - startTime;

    // Log to communication_logs
    await supabase.from('communication_logs').insert({
      executive_name: executive_name || 'system',
      channel: 'telegram',
      recipient: chat_id,
      message_preview: text.substring(0, 100),
      success: result.ok,
      error_message: result.description || null,
      delivery_time_ms: deliveryTime,
    });

    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: result.result.message_id,
        delivery_time_ms: deliveryTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Telegram send error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
