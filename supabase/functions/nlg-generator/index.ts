import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AUDIENCE_PERSONAS = {
  technical: {
    complexity: 'high',
    jargon: 'allowed',
    detail_level: 'comprehensive',
    include_code: true,
    tone: 'professional'
  },
  community: {
    complexity: 'medium',
    jargon: 'minimal',
    detail_level: 'engaging',
    include_code: false,
    tone: 'friendly'
  },
  executive: {
    complexity: 'low',
    jargon: 'business_terms',
    detail_level: 'summary',
    include_code: false,
    tone: 'professional'
  },
  general: {
    complexity: 'low',
    jargon: 'none',
    detail_level: 'accessible',
    include_code: false,
    tone: 'welcoming'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      content_type, 
      audience_type = 'community', 
      source_data, 
      format = 'markdown',
      title,
      additional_context 
    } = await req.json();

    console.log(`Generating ${content_type} for ${audience_type} audience`);

    const persona = AUDIENCE_PERSONAS[audience_type as keyof typeof AUDIENCE_PERSONAS] || AUDIENCE_PERSONAS.general;

    // Build NLG prompt
    const systemPrompt = `You are Eliza, the autonomous AI operator of the XMRT-DAO Ecosystem, a decentralized community focused on privacy, education, and Monero mining.

AUDIENCE: ${audience_type}
COMPLEXITY LEVEL: ${persona.complexity}
TONE: ${persona.tone}
TECHNICAL JARGON: ${persona.jargon}
DETAIL LEVEL: ${persona.detail_level}

CONTENT TYPE: ${content_type}
OUTPUT FORMAT: ${format}

Transform the provided data into ${content_type} that:
1. Matches the audience's technical level (${persona.complexity} complexity)
2. Uses a ${persona.tone} tone
3. Provides ${persona.detail_level} detail
4. ${persona.include_code ? 'Includes code examples where relevant' : 'Avoids technical code'}
5. Highlights key insights and actionable information
6. Maintains XMRT-DAO's values of transparency, education, and community empowerment

${additional_context ? `Additional Context: ${additional_context}` : ''}`;

    const userPrompt = `Generate a ${content_type} based on this data:

${JSON.stringify(source_data, null, 2)}

${title ? `Title: ${title}` : ''}

Create engaging, informative content that this audience will find valuable and easy to understand.`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content || '';

    // Store generated content
    const { data: contentRecord, error: insertError } = await supabase
      .from('nlg_generated_content')
      .insert({
        content_type,
        audience_type,
        title: title || `Generated ${content_type}`,
        content: generatedContent,
        format,
        source_data,
        metadata: {
          persona_used: persona,
          additional_context
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing content:', insertError);
    }

    // Log activity
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'nlg_generation',
      title: `Generated ${content_type}`,
      description: `Created ${content_type} for ${audience_type} audience`,
      status: 'completed',
      metadata: {
        content_type,
        audience_type,
        format,
        content_length: generatedContent.length,
        content_id: contentRecord?.id
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
        content_id: contentRecord?.id,
        metadata: {
          content_type,
          audience_type,
          format,
          persona_used: persona
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('NLG generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
