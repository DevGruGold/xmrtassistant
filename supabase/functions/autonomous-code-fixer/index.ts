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

    // Find all failed Python executions that haven't been fixed yet
    const { data: failedExecutions, error: fetchError } = await supabase
      .from('eliza_python_executions')
      .select('*')
      .eq('exit_code', 1)
      .eq('source', 'eliza') // Only fix Eliza's executions
      .order('created_at', { ascending: false })
      .limit(10); // Process up to 10 at a time

    if (fetchError) {
      console.error('Failed to fetch executions:', fetchError);
      throw fetchError;
    }

    if (!failedExecutions || failedExecutions.length === 0) {
      console.log('✅ No failed executions found - all code is working!');
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
      
      // Check if this execution has already been fixed
      const { data: existingFix } = await supabase
        .from('eliza_python_executions')
        .select('id')
        .eq('source', 'python-fixer-agent')
        .eq('purpose', `Fixed: ${execution.purpose || 'Unknown'}`)
        .eq('exit_code', 0)
        .gte('created_at', execution.created_at)
        .single();

      if (existingFix) {
        console.log(`✅ Execution ${execution.id} already fixed, skipping`);
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
        // DeepSeek API rate limit or quota issue - skip silently
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

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
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
