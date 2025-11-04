import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-eliza-key',
};

interface OmnichannelRequest {
  to: string;
  message: string;
  channels: string[]; // ['slack', 'email', 'telegram'] - try in order
  fallback?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  executive_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { to, message, channels, fallback, priority, executive_name } = await req.json() as OmnichannelRequest;

    if (!to || !message || !channels || channels.length === 0) {
      throw new Error('to, message, and channels are required');
    }

    console.log(`Omnichannel send to ${to} via ${channels.join(' -> ')}`);

    const results: any[] = [];
    let successfulChannel: string | null = null;
    const startTime = Date.now();

    // Try each channel in order
    for (const channel of channels) {
      try {
        let result;

        switch (channel) {
          case 'slack':
            result = await supabase.functions.invoke('send-slack', {
              body: { channel: to, text: message, executive_name },
            });
            break;

          case 'discord':
            result = await supabase.functions.invoke('send-discord', {
              body: { channel_id: to, content: message, executive_name },
            });
            break;

          case 'telegram':
            result = await supabase.functions.invoke('send-telegram', {
              body: { chat_id: to, text: message, executive_name },
            });
            break;

          case 'email':
            result = await supabase.functions.invoke('send-email', {
              body: { to, subject: `Message: ${message.substring(0, 50)}`, html: message, executive_name },
            });
            break;

          case 'twitter':
            result = await supabase.functions.invoke('send-twitter', {
              body: { text: message, executive_name },
            });
            break;

          default:
            throw new Error(`Unknown channel: ${channel}`);
        }

        results.push({
          channel,
          success: !result.error,
          error: result.error?.message,
          data: result.data,
        });

        // If successful and we don't need to try all channels
        if (!result.error) {
          successfulChannel = channel;
          if (!fallback) break; // Stop after first success if fallback disabled
        }
      } catch (error: any) {
        results.push({
          channel,
          success: false,
          error: error.message,
        });

        // If fallback is disabled, stop on first failure
        if (!fallback) break;
      }
    }

    const executionTime = Date.now() - startTime;
    const overallSuccess = results.some(r => r.success);

    // Log to eliza_function_usage
    await supabase.from('eliza_function_usage').insert({
      function_name: 'omnichannel-send',
      executive_name: executive_name || 'system',
      success: overallSuccess,
      execution_time_ms: executionTime,
      parameters: { to, channels, priority, fallback },
      result_summary: successfulChannel 
        ? `Delivered via ${successfulChannel}` 
        : 'All channels failed',
      error_message: overallSuccess ? null : 'No channels succeeded',
    });

    return new Response(
      JSON.stringify({ 
        success: overallSuccess,
        successful_channel: successfulChannel,
        results,
        execution_time_ms: executionTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Omnichannel send error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
