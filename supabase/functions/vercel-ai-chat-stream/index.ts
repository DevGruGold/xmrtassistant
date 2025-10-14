import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { getAICredential, createCredentialRequiredResponse } from "../_shared/credentialCascade.ts";
import { anthropic } from "npm:@ai-sdk/anthropic@1.0.0";
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
    
    // Intelligent AI service cascade: Try Vercel -> DeepSeek -> Lovable -> OpenAI
    const vercelKey = getAICredential('vercel_ai', session_credentials);
    const deepseekKey = getAICredential('deepseek', session_credentials);
    const lovableKey = getAICredential('lovable_ai', session_credentials);

    console.log('🔍 Available AI services:', {
      vercel: !!vercelKey,
      deepseek: !!deepseekKey,
      lovable: !!lovableKey
    });

    // Try services in order of preference
    let VERCEL_API_KEY: string | null = null;
    let aiProvider = 'unknown';
    let aiModel = 'claude-sonnet-4';

    if (vercelKey) {
      VERCEL_API_KEY = vercelKey;
      aiProvider = 'vercel_ai';
      aiModel = 'claude-sonnet-4';
      console.log('✅ Using Vercel AI Gateway for streaming with Claude Sonnet 4');
    } else if (deepseekKey || lovableKey) {
      console.log('⚠️ Streaming requires Vercel AI. Falling back to non-streaming endpoint.');
      return new Response(
        JSON.stringify({ 
          error: 'Streaming requires Vercel AI Gateway. Please use the non-streaming endpoint or configure Vercel AI.',
          fallback: 'Use /vercel-ai-chat endpoint instead'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VERCEL_API_KEY) {
      console.error('❌ All AI services exhausted');
      return new Response(
        JSON.stringify(createCredentialRequiredResponse(
          'vercel_ai',
          'api_key',
          'Streaming requires Vercel AI Gateway credentials.',
          'https://vercel.com/docs/ai-sdk'
        )),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🎯 Vercel AI Gateway SDK - Streaming response');
    
    // Build enhanced system prompt with current context
    const systemPrompt = generateElizaSystemPrompt({
      conversationHistory,
      userContext,
      miningStats,
      systemVersion
    });

    // Stream response using Vercel AI SDK
    const result = await streamText({
      model: anthropic(aiModel),
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content }))
      ],
      maxTokens: 4000,
      temperature: 0.7,
      apiKey: VERCEL_API_KEY
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
