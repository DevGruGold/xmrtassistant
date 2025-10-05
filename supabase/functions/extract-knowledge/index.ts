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
    const { message_id, content, session_id } = await req.json();

    if (!message_id || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Extract entities using Lovable AI with structured output
    const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a knowledge extraction AI. Extract key entities, concepts, and relationships from conversations.'
          },
          {
            role: 'user',
            content: `Extract knowledge entities from this message: ${content}`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_entities',
            description: 'Extract knowledge entities from text',
            parameters: {
              type: 'object',
              properties: {
                entities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      description: { type: 'string' },
                      confidence: { type: 'number' }
                    },
                    required: ['name', 'type', 'description', 'confidence']
                  }
                }
              },
              required: ['entities']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_entities' } }
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error('Extraction API error:', extractionResponse.status, errorText);
      throw new Error('Failed to extract knowledge');
    }

    const extractionData = await extractionResponse.json();
    const toolCall = extractionData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.log('No entities extracted');
      return new Response(
        JSON.stringify({ success: true, entities: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { entities } = JSON.parse(toolCall.function.arguments);

    // Store extracted entities
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    for (const entity of entities) {
      await supabase.from('knowledge_entities').insert({
        entity_name: entity.name,
        entity_type: entity.type,
        description: entity.description,
        confidence_score: entity.confidence,
        metadata: { source_message_id: message_id, session_id }
      });
    }

    // Log success
    await supabase.from('webhook_logs').insert({
      webhook_name: 'extract_knowledge',
      trigger_table: 'conversation_messages',
      trigger_operation: 'INSERT',
      payload: { message_id, entity_count: entities.length },
      status: 'completed'
    });

    return new Response(
      JSON.stringify({ success: true, entities_extracted: entities.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in extract-knowledge:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
