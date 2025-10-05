import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userInput, 
      context = {}, 
      requiresApproval = false,
      userApproved = false 
    } = await req.json();

    console.log('🧠 Manus AI Chat - Request received:', {
      input: userInput?.substring(0, 100),
      requiresApproval,
      userApproved,
      hasContext: !!context
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Reset tokens if it's a new day
    await supabase.rpc('reset_manus_tokens');

    // Get current token status
    const { data: tokenData, error: tokenError } = await supabase
      .from('manus_token_usage')
      .select('*')
      .eq('date', new Date().toISOString().split('T')[0])
      .single();

    if (tokenError) {
      console.error('❌ Error fetching token data:', tokenError);
      throw new Error('Failed to check token availability');
    }

    const tokensRemaining = tokenData.tokens_available;
    console.log('🎫 Token status:', {
      used: tokenData.tokens_used,
      available: tokensRemaining
    });

    // Check if tokens are depleted
    if (tokensRemaining <= 0) {
      console.warn('⚠️ Manus tokens depleted for today');
      return new Response(JSON.stringify({
        error: 'tokens_depleted',
        message: 'Manus AI tokens depleted for today. Resets at midnight UTC.',
        tokensRemaining: 0,
        fallbackToTier1: true
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If approval is required and not yet approved, return approval request
    if (requiresApproval && !userApproved) {
      console.log('⏸️ Awaiting user approval for Manus AI usage');
      return new Response(JSON.stringify({
        requiresApproval: true,
        service: 'manus',
        tokensRequired: 1,
        tokensRemaining,
        taskDescription: 'Complex multi-step agentic task execution',
        estimatedCapability: 'Advanced reasoning, tool coordination, and autonomous decision-making'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Execute Manus AI request
    const MANUS_API_KEY = Deno.env.get('MANUS_API_KEY');
    if (!MANUS_API_KEY) {
      throw new Error('MANUS_API_KEY not configured');
    }

    console.log('🚀 Executing Manus AI request...');
    const startTime = Date.now();

    const manusResponse = await fetch('https://api.manus.ai/v1/agents/execute', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MANUS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: userInput,
        context: {
          miningStats: context.miningStats,
          userContext: context.userContext,
          conversationHistory: context.conversationHistory?.slice(-5) || [],
          systemVersion: context.systemVersion || 'v2.0',
        },
        mode: 'autonomous',
        max_steps: 10,
      }),
    });

    const executionTime = Date.now() - startTime;

    if (!manusResponse.ok) {
      const errorText = await manusResponse.text();
      console.error('❌ Manus API error:', {
        status: manusResponse.status,
        error: errorText
      });

      // Log failed attempt
      await supabase.from('eliza_activity_log').insert({
        activity_type: 'manus_execution',
        title: '🧠 Manus AI - Execution Failed',
        description: `Failed to execute task: ${userInput.substring(0, 100)}`,
        status: 'failed',
        metadata: {
          error: errorText,
          status_code: manusResponse.status,
          execution_time_ms: executionTime,
          tokens_used: 0
        }
      });

      throw new Error(`Manus API failed: ${manusResponse.status}`);
    }

    const manusData = await manusResponse.json();
    console.log('✅ Manus AI response received');

    // Decrement token count
    const { error: updateError } = await supabase
      .from('manus_token_usage')
      .update({
        tokens_used: tokenData.tokens_used + 1,
        tokens_available: tokensRemaining - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.id);

    if (updateError) {
      console.error('⚠️ Failed to update token count:', updateError);
    }

    // Log successful execution
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'manus_execution',
      title: '🧠 Manus AI - Complex Task Executed',
      description: `Successfully executed: ${userInput.substring(0, 100)}`,
      status: 'completed',
      metadata: {
        tokens_used: 1,
        tokens_remaining: tokensRemaining - 1,
        execution_time_ms: executionTime,
        user_approved: userApproved,
        steps_executed: manusData.steps?.length || 0
      }
    });

    return new Response(JSON.stringify({
      response: manusData.result || manusData.output,
      tokensUsed: 1,
      tokensRemaining: tokensRemaining - 1,
      executionTimeMs: executionTime,
      steps: manusData.steps,
      service: 'manus'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Manus chat error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      fallbackToTier1: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
