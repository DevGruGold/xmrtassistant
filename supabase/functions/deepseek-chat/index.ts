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
    // Parse request body with defensive error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      await logger.error('Body parsing failed', parseError, 'request_parsing');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body. Please check your request format.',
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { 
      messages, 
      conversationHistory = [], 
      userContext = { ip: 'unknown', isFounder: false }, 
      miningStats = null, 
      systemVersion = null,
      councilMode = false
    } = requestBody;
    
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

    // Always use full CTO capabilities (tools + knowledge + memory)
    const executivePrompt = generateExecutiveSystemPrompt('CTO');
    let contextualPrompt = await buildContextualPrompt(executivePrompt, {
      conversationHistory,
      userContext,
      miningStats,
      systemVersion
    });

    // If in council mode, add conciseness instruction
    if (councilMode) {
      console.log('🏛️ Council mode - including full capabilities with conciseness guidance');
      contextualPrompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏛️ COUNCIL DELIBERATION MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are participating in an Executive Council deliberation alongside the CSO, CIO, and CAO.

**Council Guidelines:**
- Provide your CTO perspective concisely (2-4 paragraphs)
- Focus on technical/architectural insights specific to your expertise
- You still have access to ALL tools - use them if needed for accurate analysis
- Leverage your comprehensive XMRT knowledge to provide informed responses
- State confidence level and reasoning clearly

**You retain full capabilities:**
✅ All 88 ELIZA_TOOLS available
✅ Complete XMRT ecosystem knowledge
✅ Conversation history and memory
✅ Technical deep-dive expertise

**Be concise but don't sacrifice accuracy.** Use tools if they help you provide better answers.`;
    } else {
      console.log('💻 Full CTO mode - complete capabilities enabled');
    }

    // Always include system prompt with full context
    const aiMessages = [
      { role: 'system', content: contextualPrompt },
      ...messages
    ];

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    console.log('📤 Calling DeepSeek API (CTO mode)...');
    
    const apiStartTime = Date.now();
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }
    
    // ALWAYS include tools (CTO has full capabilities in all modes)
    const tools = ELIZA_TOOLS;
    
    // Call DeepSeek API directly
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: aiMessages,
        tools: tools,
        temperature: 0.7,
        max_tokens: councilMode ? 800 : 2000  // Shorter responses in council mode, but still intelligent
      })
    });
    
    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('❌ DeepSeek API error:', deepseekResponse.status, errorText);
      throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errorText}`);
    }
    
    const deepseekData = await deepseekResponse.json();
    
    // Extract response from DeepSeek format
    let response = {
      content: deepseekData.choices?.[0]?.message?.content || '',
      tool_calls: deepseekData.choices?.[0]?.message?.tool_calls || [],
      usage: deepseekData.usage
    };
    
    // If AI wants to use tools, execute them
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(`🔧 CTO executing ${response.tool_calls.length} tool(s)`);
      
      const toolResults = [];
      for (const toolCall of response.tool_calls) {
        const toolName = toolCall.function?.name;
        
        // Validate tool exists
        const validTools = ELIZA_TOOLS.map(t => t.function?.name);
        if (!validTools.includes(toolName)) {
          console.warn(`⚠️ [CTO] Unknown tool attempted: ${toolName}`);
          console.log(`💡 Suggestion: Check docs/EDGE_FUNCTION_PARAMETERS_REFERENCE.md`);
          console.log(`Available patterns:`);
          console.log(`  - invoke_edge_function for direct edge function calls`);
          console.log(`  - execute_python for multi-step workflows with call_edge_function`);
          console.log(`  - Check tool registry in elizaTools.ts`);
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolName,
            content: JSON.stringify({ 
              error: `Unknown tool: ${toolName}. Use invoke_edge_function("${toolName}", {}) or execute_python with call_edge_function helper.`,
              suggestion: 'Check CTO Quick Reference in system prompt for common workflows'
            })
          });
          continue;
        }
        
        const result = await executeToolCall(supabase, toolCall, 'CTO', SUPABASE_URL, SERVICE_ROLE_KEY);
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolName,
          content: JSON.stringify(result)
        });
      }
      
      // Call DeepSeek API again with tool results
      const secondResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            ...aiMessages,
            { role: 'assistant', content: response.content, tool_calls: response.tool_calls },
            ...toolResults
          ],
          temperature: 0.7,
          max_tokens: 4096
        })
      });
      
      if (secondResponse.ok) {
        const secondData = await secondResponse.json();
        response = {
          content: secondData.choices?.[0]?.message?.content || '',
          tool_calls: [],
          usage: secondData.usage
        };
      }
    }
    
    const apiDuration = Date.now() - apiStartTime;
    
    console.log(`✅ CTO Executive responded in ${apiDuration}ms`);
    await logger.apiCall('deepseek_api', 200, apiDuration, { 
      executive: 'CTO',
      responseLength: response.content?.length || 0,
      usage: response.usage
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: response.content,
        executive: 'deepseek-chat',
        executiveTitle: 'Chief Technology Officer (CTO)',
        provider: 'deepseek',
        model: 'deepseek-chat',
        confidence: 85,
        usage: response.usage
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
