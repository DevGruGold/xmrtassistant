import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { getAICredential, createCredentialRequiredResponse } from "../_shared/credentialCascade.ts";
import { createXai } from "npm:@ai-sdk/xai@1.0.0";
import { createOpenAI } from "npm:@ai-sdk/openai@1.0.0";
import { streamText } from "npm:ai@4.0.0";

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
    
    // Intelligent AI service cascade: Try xAI -> Gemini -> OpenRouter -> Vercel -> DeepSeek -> Lovable
    const xaiKey = getAICredential('xai', session_credentials);
    const geminiKey = getAICredential('gemini', session_credentials);
    const openrouterKey = getAICredential('openrouter', session_credentials);
    const vercelKey = getAICredential('vercel_ai', session_credentials);
    const deepseekKey = getAICredential('deepseek', session_credentials);
    const lovableKey = getAICredential('lovable_ai', session_credentials);

    console.log('🔍 Available AI services:', {
      xai: !!xaiKey,
      gemini: !!geminiKey,
      openrouter: !!openrouterKey,
      vercel: !!vercelKey,
      deepseek: !!deepseekKey,
      lovable: !!lovableKey
    });

    // Try services in order of preference (xAI -> Gemini -> OpenRouter -> Vercel)
    let API_KEY: string | null = null;
    let aiProvider = 'unknown';
    let aiModel = 'grok-beta';
    let aiClient: any = null;

    if (xaiKey) {
      API_KEY = xaiKey;
      aiProvider = 'xai';
      aiModel = 'grok-beta';
      aiClient = createXai({ apiKey: xaiKey });
      console.log('✅ Using xAI (Grok) for streaming - Lead AI');
    } else if (geminiKey) {
      API_KEY = geminiKey;
      aiProvider = 'gemini';
      aiModel = 'gemini-2.0-flash-exp';
      aiClient = createOpenAI({ 
        apiKey: geminiKey, 
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
      });
      console.log('✅ Using Gemini for streaming');
    } else if (openrouterKey) {
      API_KEY = openrouterKey;
      aiProvider = 'openrouter';
      aiModel = 'google/gemini-2.0-flash-exp:free';
      aiClient = createOpenAI({ 
        apiKey: openrouterKey, 
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': 'https://xmrt-dao.lovable.app',
          'X-Title': 'XMRT DAO'
        }
      });
      console.log('✅ Using OpenRouter for streaming');
    } else if (vercelKey) {
      API_KEY = vercelKey;
      aiProvider = 'vercel_ai';
      aiModel = 'xai/grok-beta';
      aiClient = createOpenAI({ apiKey: vercelKey, baseURL: 'https://gateway.ai.cloudflare.com/v1/2ab66a3e3b0f6c8d1f849bf835e90d7b/xmrt-dao/openai' });
      console.log('✅ Using Vercel AI Gateway for streaming (low priority fallback)');
    } else if (deepseekKey || lovableKey) {
      console.log('⚠️ Streaming requires xAI, Gemini, OpenRouter, or Vercel AI. Falling back to non-streaming endpoint.');
      return new Response(
        JSON.stringify({ 
          error: 'Streaming requires xAI, Gemini, OpenRouter, or Vercel AI Gateway. Please use the non-streaming endpoint or configure one of these services.',
          fallback: 'Use /vercel-ai-chat endpoint instead'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!API_KEY) {
      console.error('❌ All AI services exhausted - falling back to local Office Clerk');
      return new Response(
        JSON.stringify(createCredentialRequiredResponse(
          'xai',
          'api_key',
          'Streaming requires xAI, Gemini, OpenRouter, or Vercel AI Gateway credentials.',
          'https://console.x.ai'
        )),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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
