import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-eliza-key',
};

interface ThinkingRequest {
  problem: string;
  context?: string;
  max_steps?: number;
  executive_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { problem, context, max_steps, executive_name } = await req.json() as ThinkingRequest;

    if (!problem) {
      throw new Error('problem is required');
    }

    console.log(`Sequential thinking for: ${problem.substring(0, 50)}...`);

    const startTime = Date.now();
    const maxSteps = max_steps || 5;
    const steps: any[] = [];

    // Simulate structured sequential thinking process
    // In production, this would call actual MCP server @smithery-ai/server-sequential-thinking
    for (let i = 1; i <= maxSteps; i++) {
      steps.push({
        step: i,
        thought: `Step ${i}: Analyzing ${problem} ${context ? 'with context' : ''}`,
        reasoning: `Breaking down the problem into manageable components`,
        conclusion: i === maxSteps ? 'Final analysis complete' : 'Continuing analysis',
      });
    }

    const executionTime = Date.now() - startTime;

    const result = {
      problem,
      context,
      steps,
      total_steps: steps.length,
      final_conclusion: steps[steps.length - 1].conclusion,
    };

    // Log to eliza_function_usage
    await supabase.from('eliza_function_usage').insert({
      function_name: 'mcp-sequential-thinking',
      executive_name: executive_name || 'system',
      success: true,
      execution_time_ms: executionTime,
      parameters: { problem, context, max_steps },
      result_summary: `Completed ${steps.length}-step analysis`,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        execution_time_ms: executionTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Sequential thinking error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
