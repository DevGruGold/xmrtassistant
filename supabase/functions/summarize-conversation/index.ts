import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get recent messages for the session
    const { data: messages, error: messagesError } = await supabase
      .from('conversation_messages')
      .select('content, message_type, timestamp')
      .eq('session_id', session_id)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (messagesError) throw messagesError;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, summary: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create conversation context
    const conversationText = messages
      .reverse()
      .map(m => `${m.message_type}: ${m.content}`)
      .join('\n');

    // Generate summary using Lovable AI
    const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a conversation summarizer. Create concise, informative summaries that capture the key points and context of conversations.'
          },
          {
            role: 'user',
            content: `Summarize this conversation in 2-3 sentences:\n\n${conversationText}`
          }
        ],
      }),
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      console.error('Summary API error:', summaryResponse.status, errorText);
      throw new Error('Failed to generate summary');
    }

    const summaryData = await summaryResponse.json();
    const summary = summaryData.choices[0].message.content;

    // Store summary
    const { error: insertError } = await supabase
      .from('conversation_summaries')
      .insert({
        session_id,
        summary_text: summary,
        message_count: messages.length,
        start_message_id: messages[0].id,
        end_message_id: messages[messages.length - 1].id
      });

    if (insertError) {
      console.error('Failed to store summary:', insertError);
      throw insertError;
    }

    // Log success
    await supabase.from('webhook_logs').insert({
      webhook_name: 'summarize_conversation',
      trigger_table: 'conversation_messages',
      trigger_operation: 'BATCH',
      payload: { session_id, message_count: messages.length },
      status: 'completed'
    });

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in summarize-conversation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
