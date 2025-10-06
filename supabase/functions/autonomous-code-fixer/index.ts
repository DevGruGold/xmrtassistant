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

    // Check for repeated failures of the same code pattern and DELETE them if excessive
    const { data: recentFailedFixes } = await supabase
      .from('eliza_python_executions')
      .select('id, code, error, created_at')
      .eq('exit_code', 1)
      .eq('source', 'python-fixer-agent')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .limit(50);

    if (recentFailedFixes && recentFailedFixes.length > 15) {
      // Check if the same code keeps failing (first 300 chars to identify pattern)
      const codePatternMap = new Map<string, any[]>();
      recentFailedFixes.forEach((f: any) => {
        const pattern = f.code?.substring(0, 300) || 'unknown';
        if (!codePatternMap.has(pattern)) {
          codePatternMap.set(pattern, []);
        }
        codePatternMap.get(pattern)!.push(f);
      });

      // Find patterns that have failed more than 20 times
      for (const [pattern, failures] of codePatternMap.entries()) {
        if (failures.length > 20) {
          console.log(`🗑️ DELETING ${failures.length} failed executions of same code pattern (exceeded 20 failures)`);
          
          // Delete all failed executions for this pattern
          const idsToDelete = failures.map(f => f.id);
          const { error: deleteError } = await supabase
            .from('eliza_python_executions')
            .delete()
            .in('id', idsToDelete);

          if (deleteError) {
            console.error('Failed to delete failed executions:', deleteError);
          } else {
            console.log(`✅ Deleted ${idsToDelete.length} unfixable failed executions`);
            
            // Log the cleanup action
            await supabase.from('eliza_activity_log').insert({
              activity_type: 'code_monitoring',
              title: '🗑️ Cleaned Up Unfixable Code',
              description: `Deleted ${idsToDelete.length} failed executions of the same code pattern (failed ${failures.length} times). Likely missing environment variables or unfixable issue.`,
              status: 'completed',
              metadata: { 
                deleted_count: idsToDelete.length, 
                failure_count: failures.length,
                code_preview: pattern.substring(0, 100)
              }
            });
          }
        }
      }
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
      .limit(5);
    
    // CRITICAL: Filter out unfixable errors (environment variables, missing dependencies, etc.)
    const fixableExecutions = (failedExecutions || []).filter((exec: any) => {
      const errorLower = (exec.error || exec.output || '').toLowerCase();
      const codeLower = (exec.code || '').toLowerCase();
      
      // Don't try to fix environment variable issues - these can't be fixed with code changes
      if (errorLower.includes('supabase_url') || errorLower.includes('supabase_key') ||
          errorLower.includes('environment variable') || errorLower.includes('env var')) {
        return false;
      }
      
      // Don't try to fix missing system dependencies
      if (errorLower.includes('no module named') || errorLower.includes('modulenotfounderror')) {
        return false;
      }
      
      // Don't try to fix network/API issues that are transient
      if (errorLower.includes('connection refused') || errorLower.includes('timeout') ||
          errorLower.includes('unreachable') || errorLower.includes('network')) {
        return false;
      }
      
      return true;
    });
    
    // Delete unfixable executions immediately to prevent clutter
    const unfixableCount = (failedExecutions?.length || 0) - fixableExecutions.length;
    if (unfixableCount > 0) {
      const unfixableIds = (failedExecutions || [])
        .filter((exec: any) => !fixableExecutions.includes(exec))
        .map((exec: any) => exec.id);
      
      await supabase
        .from('eliza_python_executions')
        .delete()
        .in('id', unfixableIds);
      
      console.log(`🗑️ Deleted ${unfixableCount} unfixable executions (env vars, missing deps, network issues)`);
      
      await supabase.from('eliza_activity_log').insert({
        activity_type: 'code_monitoring',
        title: '🗑️ Cleaned Up Unfixable Errors',
        description: `Deleted ${unfixableCount} executions with unfixable errors (missing env vars, dependencies, or network issues)`,
        status: 'completed',
        metadata: { deleted_count: unfixableCount }
      });
    }

    if (fetchError) {
      console.error('Failed to fetch executions:', fetchError);
      throw fetchError;
    }

    if (fixableExecutions.length === 0) {
      console.log('✅ No fixable executions found - all issues are environmental or already handled');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No fixable executions found',
        fixed: 0,
        unfixable_cleaned: unfixableCount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Found ${fixableExecutions.length} fixable executions (cleaned ${unfixableCount} unfixable ones)`);

    // Get total count of remaining failed executions for progress tracking
    const { count: totalFailedCount } = await supabase
      .from('eliza_python_executions')
      .select('*', { count: 'exact', head: true })
      .eq('exit_code', 1)
      .eq('source', 'eliza')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString());

    const results = [];
    
    for (const execution of fixableExecutions) {
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
    const skippedCount = results.filter(r => r.skipped).length;
    console.log(`🎉 Fixed ${successCount} out of ${results.length} executions`);

    // Log comprehensive progress to activity log
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'code_monitoring',
      title: '🔍 Code Health Monitor',
      description: `Scanned for failed executions. Fixed: ${successCount}`,
      status: 'completed',
      metadata: {
        total_processed: results.length,
        fixed_count: successCount,
        skipped_count: skippedCount,
        unfixable_deleted: unfixableCount,
        remaining_failed: (totalFailedCount || 0) - successCount,
        total_failed_at_start: totalFailedCount
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.length} failed executions`,
      fixed: successCount,
      skipped: skippedCount,
      unfixable_deleted: unfixableCount,
      remaining: (totalFailedCount || 0) - successCount,
      total_at_start: totalFailedCount,
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
