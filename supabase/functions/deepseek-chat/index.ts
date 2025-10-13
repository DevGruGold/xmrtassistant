import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAICredential, createCredentialRequiredResponse } from "../_shared/credentialCascade.ts";
import { EdgeFunctionLogger } from "../_shared/logging.ts";
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { buildContextualPrompt } from '../_shared/contextBuilder.ts';

const logger = EdgeFunctionLogger('deepseek-chat');

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
    const { messages, conversationHistory, userContext, miningStats, systemVersion, session_credentials } = await req.json();
    
    await logger.info('Request received', 'ai_interaction', { 
      messagesCount: messages?.length,
      hasHistory: !!conversationHistory,
      userContext 
    });

    const DEEPSEEK_API_KEY = getAICredential('deepseek', session_credentials);
    if (!DEEPSEEK_API_KEY) {
      console.error('⚠️ DEEPSEEK_API_KEY not configured');
      await logger.warning('Missing API key', 'security', { credential_type: 'deepseek' });
      return new Response(
        JSON.stringify(createCredentialRequiredResponse(
          'deepseek',
          'api_key',
          'DeepSeek API key needed to use this AI service.',
          'https://platform.deepseek.com/'
        )),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate messages parameter
    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Invalid messages parameter:', typeof messages);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request: messages must be an array' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🤖 Deepseek Chat - Processing request with context:', {
      messagesCount: messages?.length,
      hasHistory: !!conversationHistory,
      hasMiningStats: !!miningStats,
      hasSystemVersion: !!systemVersion,
      userContext: userContext
    });

    // Build system prompt using shared utilities
    const basePrompt = generateElizaSystemPrompt();
    const systemPrompt = buildContextualPrompt(basePrompt, {
      conversationHistory,
      userContext,
      miningStats,
      systemVersion
    });

    // Prepare messages for Deepseek
    const deepseekMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    console.log('📤 Calling Deepseek API...');
    
    const apiStartTime = Date.now();
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: deepseekMessages,
        temperature: 0.9,
        max_tokens: 8000,
        stream: false
      }),
    });

    const apiDuration = Date.now() - apiStartTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepseek API error:', response.status, errorText);
      await logger.apiCall('deepseek', response.status, apiDuration, { error: errorText });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Rate limit exceeded. Please try again in a moment.' 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'API credits depleted. Please check your Deepseek account.' 
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Deepseek API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    console.log('✅ Deepseek response:', { 
      hasContent: !!message?.content,
      usage: data.usage
    });

    await logger.apiCall('deepseek', response.status, apiDuration, { 
      tokens: data.usage,
      model: 'deepseek-chat' 
    });

    // Return the response
    const aiResponse = message?.content || "I'm here to help with XMRT-DAO tasks.";

    return new Response(
      JSON.stringify({ success: true, response: aiResponse, hasToolCalls: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Deepseek chat error:', error);
    await logger.error('Function execution failed', error, 'error');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
