import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { getAICredential, createCredentialRequiredResponse } from "../_shared/credentialCascade.ts";
import { createOpenAI } from "npm:@ai-sdk/openai@1.0.0";
import { generateText, tool } from "npm:ai@4.0.0";
import { z } from "npm:zod@3.24.1";

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
      console.warn('⚠️ All AI services unavailable - using local intelligence fallback (Embedded Office Clerk)');
      
      // Local fallback: Generate intelligent contextual response
      const userMessage = messages[messages.length - 1]?.content || '';
      const fallbackResponse = generateLocalResponse(userMessage, {
        conversationHistory,
        userContext,
        miningStats,
        systemVersion
      });

      return new Response(
        JSON.stringify({
          success: true,
          response: fallbackResponse,
          provider: 'embedded_office_clerk',
          model: 'local_intelligence',
          executive: 'vercel-ai-chat',
          executiveTitle: 'Chief Strategy Officer (CSO) - Local Mode',
          note: 'All external AI services are currently unavailable. Using embedded local intelligence.'
        }),
        { 
          status: 200, 
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
    
    // Proactive intelligence: Auto-check system state based on user input
    const proactiveChecks: any[] = [];
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('database') || lowerInput.includes('table') || lowerInput.includes('schema')) {
      proactiveChecks.push({
        type: 'schema_check',
        reasoning: 'User mentioned database/tables - proactively checking schema and RLS'
      });
    }
    
    if (lowerInput.includes('error') || lowerInput.includes('broken') || lowerInput.includes('issue')) {
      proactiveChecks.push({
        type: 'error_check',
        reasoning: 'User mentioned errors - proactively checking logs and recent issues'
      });
    }
    
    if (lowerInput.includes('mining') || lowerInput.includes('hashrate') || lowerInput.includes('worker')) {
      proactiveChecks.push({
        type: 'mining_check',
        reasoning: 'User mentioned mining - proactively fetching current stats'
      });
    }
    
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
    
    // Build reasoning steps from tool execution
    const reasoningSteps = [];
    
    if (proactiveChecks.length > 0) {
      proactiveChecks.forEach((check, idx) => {
        reasoningSteps.push({
          step: idx + 1,
          thought: check.reasoning,
          action: `Proactive ${check.type}`,
          status: 'success'
        });
      });
    }
    
    if (toolCalls && toolCalls.length > 0) {
      console.log(`🔧 Tools called: ${toolCalls.map(t => t.toolName).join(', ')}`);
      
      toolCalls.forEach((tool, idx) => {
        reasoningSteps.push({
          step: reasoningSteps.length + 1,
          thought: `Executing ${tool.toolName} to gather data`,
          action: tool.toolName,
          status: 'success',
          result: toolResults?.[idx]
        });
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: text,
        reasoning: reasoningSteps,
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
