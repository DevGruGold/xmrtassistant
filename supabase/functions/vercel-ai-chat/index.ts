import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { getAICredential, createCredentialRequiredResponse } from "../_shared/credentialCascade.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory, userContext, miningStats, systemVersion, session_credentials } = await req.json();
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Intelligent AI service cascade: Try Vercel -> DeepSeek -> Lovable -> OpenAI
    const vercelKey = getAICredential('vercel_ai', session_credentials);
    const deepseekKey = getAICredential('deepseek', session_credentials);
    const lovableKey = getAICredential('lovable_ai', session_credentials);
    const openaiKey = getAICredential('openai', session_credentials);

    console.log('🔍 Available AI services:', {
      vercel: !!vercelKey,
      deepseek: !!deepseekKey,
      lovable: !!lovableKey,
      openai: !!openaiKey
    });

    // Try services in order of preference
    let VERCEL_API_KEY: string | null = null;
    let aiProvider = 'unknown';
    let aiModel = 'anthropic/claude-3-5-sonnet-20241022';

    if (vercelKey) {
      VERCEL_API_KEY = vercelKey;
      aiProvider = 'vercel_ai';
      aiModel = 'anthropic/claude-3-5-sonnet-20241022';
      console.log('✅ Using Vercel AI Gateway');
    } else if (deepseekKey) {
      console.log('⚠️ Vercel AI not available, trying DeepSeek fallback');
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const fallbackSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        
        const deepseekResult = await fallbackSupabase.functions.invoke('deepseek-chat', {
          body: { 
            messages, 
            conversationHistory, 
            userContext, 
            miningStats, 
            systemVersion,
            session_credentials 
          }
        });

        if (!deepseekResult.error && deepseekResult.data) {
          return new Response(
            JSON.stringify({ success: true, response: deepseekResult.data.response, provider: 'deepseek', executive: 'vercel-ai-chat', executiveTitle: 'Chief Strategy Officer (CSO)' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.warn('DeepSeek fallback failed:', error);
      }
    } else if (lovableKey) {
      console.log('⚠️ Vercel and DeepSeek not available, trying Lovable AI fallback');
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const fallbackSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        
        const lovableResult = await fallbackSupabase.functions.invoke('lovable-chat', {
          body: { 
            messages, 
            conversationHistory, 
            userContext, 
            miningStats, 
            systemVersion,
            session_credentials 
          }
        });

        if (!lovableResult.error && lovableResult.data) {
          return new Response(
            JSON.stringify({ success: true, response: lovableResult.data.response, provider: 'lovable_ai', executive: 'vercel-ai-chat', executiveTitle: 'Chief Strategy Officer (CSO)' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.warn('Lovable AI fallback failed:', error);
      }
    }

    if (!VERCEL_API_KEY) {
      console.error('❌ All AI services exhausted');
      return new Response(
        JSON.stringify(createCredentialRequiredResponse(
          'vercel_ai',
          'api_key',
          'AI service credentials needed. We tried Vercel AI, DeepSeek, and Lovable AI, but none are configured.',
          'https://vercel.com/docs/ai-sdk'
        )),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🎯 Vercel AI Gateway - Processing request');
    
    const userInput = messages[messages.length - 1]?.content || '';
    
    // Create Supabase client for data access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Build enhanced system prompt with current context
    const systemPrompt = generateElizaSystemPrompt({
      conversationHistory,
      userContext,
      miningStats,
      systemVersion
    });

    // Call Vercel AI Gateway
    const response = await fetch('https://api.vercel.com/v1/ai/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 4000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Vercel AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Vercel AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Vercel AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || data.message?.content || '';

    console.log('✅ Vercel AI response received');

    return new Response(
      JSON.stringify({
        success: true,
        response: assistantMessage,
        hasToolCalls: false,
        provider: aiProvider,
        model: aiModel,
        executive: 'vercel-ai-chat',
        executiveTitle: 'Chief Strategy Officer (CSO)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Vercel AI chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
