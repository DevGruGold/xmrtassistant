import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callLovableAIGateway } from '../_shared/aiGatewayFallback.ts';
import { generateExecutiveSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { buildContextualPrompt } from '../_shared/contextBuilder.ts';
import { EdgeFunctionLogger } from "../_shared/logging.ts";
import { ELIZA_TOOLS } from '../_shared/elizaTools.ts';
import { executeToolCall } from '../_shared/toolExecutor.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    console.log('📤 Calling Lovable AI Gateway (CTO mode) with tools...');
    
    const apiStartTime = Date.now();
    let response = await callLovableAIGateway(aiMessages, {
      model: 'google/gemini-2.5-flash',
      temperature: 0.7,
      max_tokens: 4000,
      tools: ELIZA_TOOLS,
      tool_choice: 'auto'
    });
    
    let finalResponse: string;
    
    // If AI wants to use tools, execute them
    if (typeof response === 'object' && response.tool_calls && response.tool_calls.length > 0) {
      console.log(`🔧 CTO executing ${response.tool_calls.length} tool(s)`);
      
      const toolResults = [];
      for (const toolCall of response.tool_calls) {
        const result = await executeToolCall(supabase, toolCall, 'CTO', SUPABASE_URL, SERVICE_ROLE_KEY);
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify(result)
        });
      }
      
      // Call AI again with tool results
      const followUpResponse = await callLovableAIGateway([
        ...aiMessages,
        { role: 'assistant', content: response.content || '', tool_calls: response.tool_calls },
        ...toolResults
      ], {
        model: 'google/gemini-2.5-flash',
        temperature: 0.7,
        max_tokens: 4000
      });
      
      finalResponse = typeof followUpResponse === 'string' ? followUpResponse : followUpResponse.content;
    } else {
      finalResponse = typeof response === 'string' ? response : response.content;
    }
    
    const apiDuration = Date.now() - apiStartTime;
    
    console.log(`✅ CTO Executive responded in ${apiDuration}ms`);
    await logger.apiCall('lovable_gateway', 200, apiDuration, { 
      executive: 'CTO',
      responseLength: finalResponse.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: finalResponse,
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
    let errorType = 'service_unavailable';
    
    // Parse structured error if available
    if (errorMessage.includes('"code":402') || errorMessage.includes('Payment Required')) {
      statusCode = 402;
      errorType = 'payment_required';
    } else if (errorMessage.includes('"code":429') || errorMessage.includes('Rate limit')) {
      statusCode = 429;
      errorType = 'rate_limit';
    } else if (errorMessage.includes('"code":400') || errorMessage.includes('Invalid input')) {
      statusCode = 400;
      errorType = 'invalid_request';
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: {
          type: errorType,
          code: statusCode,
          message: errorMessage,
          service: 'deepseek-chat',
          details: {
            timestamp: new Date().toISOString(),
            executive: 'CTO',
            model: 'google/gemini-2.5-flash'
          },
          canRetry: statusCode !== 402 && statusCode !== 400,
          suggestedAction: statusCode === 402 ? 'add_credits' : 
                          statusCode === 400 ? 'check_request_format' : 'try_alternative'
        }
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
