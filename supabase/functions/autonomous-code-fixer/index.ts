import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🤖 Autonomous Code Fixer - Starting scan for failed executions...');

    // Check if we've been called too frequently (circuit breaker)
    const { data: recentRuns } = await supabase
      .from('eliza_activity_log')
      .select('created_at')
      .eq('activity_type', 'code_monitoring')
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last 1 minute
      .order('created_at', { ascending: false });

    if (recentRuns && recentRuns.length > 5) {
      console.log('⏸️ Circuit breaker triggered - too many runs in the last minute. Pausing.');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Circuit breaker active - pausing to prevent runaway loop',
        fixed: 0,
        circuit_breaker: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find all failed Python executions that haven't been fixed yet
    // Only look at failures from the last 24 hours to avoid reprocessing ancient failures
    const { data: failedExecutions, error: fetchError } = await supabase
      .from('eliza_python_executions')
      .select('*')
      .eq('exit_code', 1)
      .eq('source', 'eliza') // Only fix Eliza's executions
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(5); // Reduced from 10 to 5 to prevent overwhelming

    if (fetchError) {
      console.error('Failed to fetch executions:', fetchError);
      throw fetchError;
    }

    if (!failedExecutions || failedExecutions.length === 0) {
      console.log('✅ No recent failed executions found - all code is working!');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No failed executions to fix',
        fixed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Found ${failedExecutions.length} failed executions to fix`);

    const results = [];
    
    for (const execution of failedExecutions) {
      console.log(`🔧 Attempting to fix execution ${execution.id}...`);
      
      // Check if this exact execution has already been attempted (successful or not)
      // Look for any fix attempt in the last hour to prevent infinite retries
      const { data: recentFixAttempts } = await supabase
        .from('eliza_activity_log')
        .select('id')
        .eq('activity_type', 'python_fix')
        .contains('metadata', { original_execution_id: execution.id })
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .limit(1);

      if (recentFixAttempts && recentFixAttempts.length > 0) {
        console.log(`⏭️ Execution ${execution.id} already attempted in the last hour, skipping`);
        results.push({
          execution_id: execution.id,
          success: false,
          error: 'Recently attempted',
          skipped: true
        });
        continue;
      }

      // Call the python-fixer-agent to fix this execution
      const { data: fixResult, error: fixError } = await supabase.functions.invoke('python-fixer-agent', {
        body: { execution_id: execution.id }
      });

      if (fixError) {
        console.error(`❌ Failed to fix execution ${execution.id}:`, fixError);
        results.push({
          execution_id: execution.id,
          success: false,
          error: fixError.message || 'Edge Function returned a non-2xx status code'
        });
      } else if (fixResult?.skipped) {
        // Lovable AI rate limit or quota issue - skip silently
        console.log(`⏸️ Skipped execution ${execution.id}: ${fixResult.reason}`);
        results.push({
          execution_id: execution.id,
          success: false,
          error: `Skipped: ${fixResult.reason}`,
          skipped: true
        });
      } else if (fixResult?.success) {
        console.log(`✅ Successfully fixed execution ${execution.id}`);
        
        // Update the activity log to show progress
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'python_fix_success',
          title: '✅ Code Auto-Fixed Successfully',
          description: `Fixed Python code for: ${execution.purpose || 'Unknown task'}`,
          status: 'completed',
          metadata: {
            original_execution_id: execution.id,
            fixed_execution_id: fixResult.execution_id,
            fixed_code: fixResult.fixed_code?.substring(0, 500)
          }
        });

        results.push({
          execution_id: execution.id,
          success: true,
          fixed_execution_id: fixResult.execution_id
        });
      } else {
        console.warn(`⚠️ Fix attempt for ${execution.id} did not succeed:`, fixResult);
        results.push({
          execution_id: execution.id,
          success: false,
          error: fixResult?.error || 'Fix attempt failed'
        });
      }

      // Longer delay between attempts to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`🎉 Fixed ${successCount} out of ${results.length} executions`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.length} failed executions`,
      fixed: successCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Autonomous Code Fixer error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
