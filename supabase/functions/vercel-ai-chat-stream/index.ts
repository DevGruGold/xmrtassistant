import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { getAICredential, createCredentialRequiredResponse } from "../_shared/credentialCascade.ts";
import { createOpenAI } from "npm:@ai-sdk/openai@1.0.0";
import { streamText } from "npm:ai@4.0.0";

/**
 * Local intelligence fallback - generates contextual responses without external AI APIs
 */
function generateLocalResponse(userMessage: string, context: any): string {
  const msg = userMessage.toLowerCase();
  
  // API key issue detection
  if (msg.includes('api') || msg.includes('key') || msg.includes('error') || msg.includes('not working')) {
    return `I notice we're currently experiencing limitations with external AI services. All API keys appear to be unavailable or expired. 

However, I can still help you with:
• Information about the XMRT ecosystem and mining
• System status and diagnostics
• General guidance and support

To restore full AI capabilities, please check:
1. OpenAI API key (https://platform.openai.com/api-keys)
2. DeepSeek API key (https://platform.deepseek.com)
3. Gemini API key (https://makersuite.google.com/app/apikey)
4. WAN AI key (https://wan.ai)

What would you like to know about the XMRT system?`;
  }

  // Mining questions
  if (msg.includes('mining') || msg.includes('hashrate') || msg.includes('xmrt')) {
    const stats = context.miningStats;
    if (stats) {
      return `Based on current system data:
• Active devices: ${stats.activeDevices || 'N/A'}
• Total hashrate: ${stats.totalHashrate || 'N/A'}
• XMRT balance: ${stats.balance || 'N/A'}

Note: I'm running in local mode due to unavailable external AI services. For more detailed analysis, please ensure API keys are configured.`;
    }
    return `I can help with mining information, but I'm currently in local mode. To get real-time mining statistics and AI-powered analysis, please configure your API keys.`;
  }

  // Greeting
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Hello! I'm Eliza, running in local intelligence mode. While external AI services are currently unavailable, I can still assist with basic information about XMRT, mining operations, and system status. What can I help you with?`;
  }

  // General fallback
  return `I'm currently operating in local mode as all external AI services (OpenAI, DeepSeek, Gemini, WAN AI) are unavailable. 

I can still provide:
✓ Basic information about XMRT and the ecosystem
✓ System status and diagnostics
✓ General guidance

For full AI-powered assistance, please configure at least one AI service API key.

How can I assist you today?`;
}

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
    
    // Intelligent AI service cascade for streaming: OpenAI -> DeepSeek -> Gemini -> WAN
    const openaiKey = getAICredential('openai', session_credentials);
    const deepseekKey = getAICredential('deepseek', session_credentials);
    const geminiKey = getAICredential('gemini', session_credentials);
    const wanKey = getAICredential('wan', session_credentials);

    console.log('🔍 Available AI services for streaming:', {
      openai: !!openaiKey,
      deepseek: !!deepseekKey,
      gemini: !!geminiKey,
      wan: !!wanKey
    });

    // Try services in order of preference: OpenAI -> Gemini -> WAN (DeepSeek doesn't support streaming)
    let API_KEY: string | null = null;
    let aiProvider = 'unknown';
    let aiModel = 'gpt-4o-mini';
    let aiClient: any = null;

    if (openaiKey) {
      API_KEY = openaiKey;
      aiProvider = 'openai';
      aiModel = 'gpt-4o-mini';
      aiClient = createOpenAI({ apiKey: openaiKey });
      console.log('✅ Using OpenAI for streaming - Primary AI');
    } else if (geminiKey) {
      API_KEY = geminiKey;
      aiProvider = 'gemini';
      aiModel = 'gemini-1.5-flash';
      aiClient = createOpenAI({ 
        apiKey: geminiKey, 
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
      });
      console.log('✅ Using Gemini for streaming');
    } else if (wanKey) {
      API_KEY = wanKey;
      aiProvider = 'wan';
      aiModel = 'gpt-4o-mini';
      aiClient = createOpenAI({ 
        apiKey: wanKey,
        baseURL: 'https://api.wan.ai/v1'
      });
      console.log('✅ Using WAN AI for streaming');
    } else if (deepseekKey) {
      console.log('⚠️ DeepSeek does not support streaming. Falling back to non-streaming endpoint.');
      return new Response(
        JSON.stringify({ 
          error: 'Streaming requires OpenAI, Gemini, or WAN AI. DeepSeek does not support streaming.',
          fallback: 'Use /vercel-ai-chat endpoint instead'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!API_KEY) {
      console.warn('⚠️ All streaming AI services unavailable - using local intelligence fallback');
      
      // Local fallback: Generate intelligent contextual response
      const userMessage = messages[messages.length - 1]?.content || '';
      const fallbackResponse = generateLocalResponse(userMessage, {
        conversationHistory,
        userContext,
        miningStats,
        systemVersion
      });

      // Simulate streaming for consistency
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          
          // Send metadata
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'metadata',
              provider: 'embedded_office_clerk',
              model: 'local_intelligence',
              executive: 'vercel-ai-chat-stream',
              executiveTitle: 'Chief Strategy Officer (CSO) - Local Streaming'
            })}\n\n`)
          );

          // Stream response word by word for natural feel
          const words = fallbackResponse.split(' ');
          let i = 0;
          const intervalId = setInterval(() => {
            if (i < words.length) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'text',
                  content: words[i] + ' '
                })}\n\n`)
              );
              i++;
            } else {
              clearInterval(intervalId);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'done'
                })}\n\n`)
              );
              controller.close();
            }
          }, 50); // 50ms between words for natural streaming feel
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    console.log(`🎯 Streaming with ${aiProvider} - Model: ${aiModel}`);
    
    // Build enhanced system prompt with current context
    const systemPrompt = generateElizaSystemPrompt({
      conversationHistory,
      userContext,
      miningStats,
      systemVersion
    });

    // Stream response using Vercel AI SDK with xAI
    const result = await streamText({
      model: aiClient(aiModel),
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content }))
      ],
      maxTokens: 4000,
      temperature: 0.7
    });

    console.log('✅ Streaming started');

    // Create SSE stream with metadata
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Send initial metadata
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'metadata',
            provider: aiProvider,
            model: aiModel,
            executive: 'vercel-ai-chat-stream',
            executiveTitle: 'Chief Strategy Officer (CSO) - Streaming'
          })}\n\n`)
        );

        try {
          // Stream text chunks
          for await (const textPart of result.textStream) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'text',
                content: textPart
              })}\n\n`)
            );
          }

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'done',
              usage: result.usage ? await result.usage : undefined
            })}\n\n`)
          );
          
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: error.message
            })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error('❌ Vercel AI streaming error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
