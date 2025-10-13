import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAICredential, createCredentialRequiredResponse } from "../_shared/credentialCascade.ts";
import { EdgeFunctionLogger } from "../_shared/logging.ts";
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { buildContextualPrompt } from '../_shared/contextBuilder.ts';

const logger = EdgeFunctionLogger('openai-chat');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model = "gpt-4", temperature = 0.9, max_tokens = 8000, session_credentials, conversationHistory, userContext, miningStats, systemVersion } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const openAIApiKey = getAICredential('openai', session_credentials);
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify(createCredentialRequiredResponse(
          'openai',
          'api_key',
          'OpenAI API key needed to use this AI service.',
          'https://platform.openai.com/api-keys'
        )),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🤖 OpenAI Chat - Processing request:', {
      messageCount: messages.length,
      model,
      temperature,
      max_tokens
    });

    await logger.info('Processing chat request', 'ai_interaction', { 
      messageCount: messages.length,
      model 
    });

    // Build system prompt using shared utilities
    const basePrompt = generateElizaSystemPrompt();
    const systemPrompt = buildContextualPrompt(basePrompt, {
      conversationHistory,
      userContext,
      miningStats,
      systemVersion
    });

    // Prepend system prompt to messages if not already present
    const messagesWithSystem = messages[0]?.role === 'system' 
      ? messages 
      : [{ role: 'system', content: systemPrompt }, ...messages];

    // Call OpenAI Chat Completions API
    const apiStartTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: messagesWithSystem,
        temperature,
        max_tokens,
        stream: false
      }),
    });

    const apiDuration = Date.now() - apiStartTime;

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ OpenAI API error:', errorData);
      await logger.apiCall('openai', response.status, apiDuration, { error: errorData });
      throw new Error(errorData.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    console.log('✅ OpenAI Chat - Response received:', {
      choices: data.choices?.length || 0,
      usage: data.usage
    });

    await logger.apiCall('openai', response.status, apiDuration, { 
      tokens: data.usage,
      model: data.model 
    });

    return new Response(JSON.stringify({
      success: true,
      response: data.choices[0]?.message?.content || '',
      usage: data.usage,
      model: data.model,
      executive: 'openai-chat',
      executiveTitle: 'Chief Analytics Officer (CAO)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ OpenAI Chat function error:', error);
    await logger.error('Function execution failed', error, 'error');
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});