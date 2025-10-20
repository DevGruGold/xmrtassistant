import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { getAICredential, createCredentialRequiredResponse } from "../_shared/credentialCascade.ts";
import { createOpenAI } from "npm:@ai-sdk/openai@1.0.0";
import { generateText, tool } from "npm:ai@4.0.0";
import { z } from "npm:zod@3.24.1";

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
    
    // Intelligent AI service cascade: OpenAI -> DeepSeek -> Gemini -> WAN -> Local Dispatcher
    const openaiKey = getAICredential('openai', session_credentials);
    const deepseekKey = getAICredential('deepseek', session_credentials);
    const geminiKey = getAICredential('gemini', session_credentials);
    const wanKey = getAICredential('wan', session_credentials);

    console.log('🔍 Available AI services:', {
      openai: !!openaiKey,
      deepseek: !!deepseekKey,
      gemini: !!geminiKey,
      wan: !!wanKey
    });

    // Try services in order of preference: OpenAI -> DeepSeek -> Gemini -> WAN
    let API_KEY: string | null = null;
    let aiProvider = 'unknown';
    let aiModel = 'gpt-4o-mini';
    let aiClient: any = null;

    if (openaiKey) {
      API_KEY = openaiKey;
      aiProvider = 'openai';
      aiModel = 'gpt-4o-mini';
      aiClient = createOpenAI({ apiKey: openaiKey });
      console.log('✅ Using OpenAI - Primary AI');
    } else if (deepseekKey) {
      console.log('⚠️ OpenAI not available, trying DeepSeek fallback');
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
    } else if (geminiKey) {
      API_KEY = geminiKey;
      aiProvider = 'gemini';
      aiModel = 'gemini-1.5-flash';
      aiClient = createOpenAI({ 
        apiKey: geminiKey, 
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
      });
      console.log('✅ Using Gemini');
    } else if (wanKey) {
      API_KEY = wanKey;
      aiProvider = 'wan';
      aiModel = 'gpt-4o-mini';
      aiClient = createOpenAI({ 
        apiKey: wanKey,
        baseURL: 'https://api.wan.ai/v1'
      });
      console.log('✅ Using WAN AI');
    }

    if (!API_KEY) {
      console.error('❌ All AI services exhausted - falling back to local Office Clerk');
      return new Response(
        JSON.stringify(createCredentialRequiredResponse(
          'openai',
          'api_key',
          'AI service credentials needed. We tried OpenAI, DeepSeek, Gemini, and WAN AI, but none are configured. Using local Office Clerk.',
          'https://platform.openai.com/api-keys'
        )),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🎯 ${aiProvider} SDK - Processing request with tools`);
    
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

    // Call AI SDK with tool calling support
    const { text, toolCalls, toolResults, usage, finishReason } = await generateText({
      model: aiClient(aiModel),
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content }))
      ],
      maxTokens: 4000,
      temperature: 0.7,
      tools: {
        getMiningStats: tool({
          description: 'Get current mining statistics including active devices, hashrates, and recent activity',
          parameters: z.object({}),
          execute: async () => {
            console.log('🔧 Tool called: getMiningStats');
            const { data, error } = await supabase
              .from('active_devices_view')
              .select('*')
              .limit(10);
            
            if (error) {
              console.error('Mining stats query error:', error);
              return { error: 'Failed to fetch mining stats' };
            }
            
            return {
              activeDevices: data?.length || 0,
              devices: data || [],
              timestamp: new Date().toISOString()
            };
          }
        }),
        getDAOMemberStats: tool({
          description: 'Get DAO member statistics including total members, voting power, and contributions',
          parameters: z.object({}),
          execute: async () => {
            console.log('🔧 Tool called: getDAOMemberStats');
            const { data, error } = await supabase
              .from('dao_members')
              .select('wallet_address, voting_power, total_contributions, reputation_score')
              .eq('is_active', true);
            
            if (error) {
              console.error('DAO stats query error:', error);
              return { error: 'Failed to fetch DAO stats' };
            }
            
            const totalMembers = data?.length || 0;
            const totalVotingPower = data?.reduce((sum, m) => sum + (Number(m.voting_power) || 0), 0) || 0;
            const totalContributions = data?.reduce((sum, m) => sum + (Number(m.total_contributions) || 0), 0) || 0;
            
            return {
              totalMembers,
              totalVotingPower,
              totalContributions,
              timestamp: new Date().toISOString()
            };
          }
        }),
        getRecentActivity: tool({
          description: 'Get recent autonomous actions and system activity from Eliza',
          parameters: z.object({
            limit: z.number().optional().default(5).describe('Number of recent activities to fetch')
          }),
          execute: async ({ limit }) => {
            console.log(`🔧 Tool called: getRecentActivity (limit: ${limit})`);
            const { data, error } = await supabase
              .from('eliza_activity_log')
              .select('activity_type, title, description, status, created_at')
              .order('created_at', { ascending: false })
              .limit(limit);
            
            if (error) {
              console.error('Activity log query error:', error);
              return { error: 'Failed to fetch recent activity' };
            }
            
            return {
              activities: data || [],
              count: data?.length || 0,
              timestamp: new Date().toISOString()
            };
          }
        }),
        getDeviceHealth: tool({
          description: 'Get battery health and charging statistics for connected devices',
          parameters: z.object({
            deviceId: z.string().optional().describe('Specific device ID to query, or omit for all devices')
          }),
          execute: async ({ deviceId }) => {
            console.log(`🔧 Tool called: getDeviceHealth${deviceId ? ` (device: ${deviceId})` : ''}`);
            let query = supabase
              .from('battery_health_snapshots')
              .select('*')
              .order('assessed_at', { ascending: false });
            
            if (deviceId) {
              query = query.eq('device_id', deviceId);
            }
            
            const { data, error } = await query.limit(10);
            
            if (error) {
              console.error('Device health query error:', error);
              return { error: 'Failed to fetch device health' };
            }
            
            return {
              healthSnapshots: data || [],
              count: data?.length || 0,
              timestamp: new Date().toISOString()
            };
          }
        })
      },
      maxSteps: 5 // Allow multi-step tool calling
    });

    console.log(`✅ ${aiProvider} SDK response received (${usage?.totalTokens || 0} tokens, finish: ${finishReason})`);
    
    if (toolCalls && toolCalls.length > 0) {
      console.log(`🔧 Tools called: ${toolCalls.map(t => t.toolName).join(', ')}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: text,
        hasToolCalls: toolCalls && toolCalls.length > 0,
        toolCalls: toolCalls?.map(t => ({
          name: t.toolName,
          args: t.args
        })),
        toolResults: toolResults,
        usage: {
          promptTokens: usage?.promptTokens || 0,
          completionTokens: usage?.completionTokens || 0,
          totalTokens: usage?.totalTokens || 0
        },
        finishReason,
        provider: aiProvider,
        model: aiModel,
        executive: 'vercel-ai-chat',
        executiveTitle: 'Chief Strategy Officer (CSO)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ AI chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
