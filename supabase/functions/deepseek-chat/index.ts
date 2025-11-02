import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callLovableAIGateway } from '../_shared/aiGatewayFallback.ts';
import { generateExecutiveSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { buildContextualPrompt } from '../_shared/contextBuilder.ts';
import { EdgeFunctionLogger } from "../_shared/logging.ts";

const logger = EdgeFunctionLogger('cto-executive');

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
    const { 
      messages, 
      conversationHistory = [], 
      userContext = { ip: 'unknown', isFounder: false }, 
      miningStats = null, 
      systemVersion = null,
      councilMode = false
    } = await req.json();
    
    await logger.info('Request received', 'ai_interaction', { 
      messagesCount: messages?.length,
      hasHistory: conversationHistory?.length > 0,
      userContext,
      executive: 'CTO',
      councilMode
    });

    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Invalid messages parameter');
      await logger.error('Invalid request format', new Error('Messages must be an array'), 'validation');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request: messages must be an array',
          received: typeof messages
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('💻 CTO Executive - Processing request via Lovable AI Gateway');

    // Build CTO-specific system prompt
    const executivePrompt = generateExecutiveSystemPrompt('CTO');
    const contextualPrompt = buildContextualPrompt(executivePrompt, {
      conversationHistory,
      userContext,
      miningStats,
      systemVersion
    });

    // Prepare messages for Lovable AI Gateway
    const aiMessages = [
      { role: 'system', content: contextualPrompt },
      ...messages
    ];

    console.log('📤 Calling Lovable AI Gateway (CTO mode)...');
    
    const apiStartTime = Date.now();
    const response = await callLovableAIGateway(aiMessages, {
      model: 'google/gemini-2.5-flash',
      temperature: 0.7,
      max_tokens: 4000
    });
    
    const apiDuration = Date.now() - apiStartTime;
    
    console.log(`✅ CTO Executive responded in ${apiDuration}ms`);
    await logger.apiCall('lovable_gateway', 200, apiDuration, { 
      executive: 'CTO',
      responseLength: response.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: response,
        executive: 'deepseek-chat',
        executiveTitle: 'Chief Technology Officer (CTO)',
        provider: 'lovable_gateway',
        model: 'google/gemini-2.5-flash',
        confidence: 85
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ CTO Executive error:', error);
    await logger.error('Function execution failed', error, 'error');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    let statusCode = 500;
    
    if (errorMessage.includes('402') || errorMessage.includes('Payment Required')) {
      statusCode = 402;
    } else if (errorMessage.includes('429') || errorMessage.includes('Rate limit')) {
      statusCode = 429;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: {
          type: statusCode === 402 ? 'payment_required' : 
                statusCode === 429 ? 'rate_limit' : 'service_unavailable',
          code: statusCode,
          message: errorMessage,
          service: 'deepseek-chat',
          details: {
            timestamp: new Date().toISOString(),
            executive: 'CTO',
            model: 'google/gemini-2.5-flash'
          },
          canRetry: statusCode !== 402,
          suggestedAction: statusCode === 402 ? 'add_credits' : 'try_alternative'
        }
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
