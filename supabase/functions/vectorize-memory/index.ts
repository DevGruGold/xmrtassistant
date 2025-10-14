import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memory_id, content, context_type } = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      console.error('Gemini API key not configured');
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🧠 Vectorizing memory ${memory_id}...`);

    // Generate embedding using Gemini (text-embedding-004 produces 768-dim embeddings)
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: {
            parts: [{ text: content }]
          }
        }),
      }
    );

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.embedding.values;

    // Update memory context with embedding
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabase
      .from('memory_contexts')
      .update({ embedding })
      .eq('id', memory_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log(`✅ Memory ${memory_id} vectorized successfully`);

    return new Response(
      JSON.stringify({ success: true, memory_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vectorize-memory function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
