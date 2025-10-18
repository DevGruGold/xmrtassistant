import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Code Monitor Daemon - Runs continuously 24/7
 * Monitors Python executions and triggers autonomous-code-fixer when needed
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔍 [CODE MONITOR] Starting scan for failed executions...');
    
    // Log that daemon is running
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'daemon_scan',
      title: '🔍 Code Monitor: Scanning',
      description: 'Code monitor daemon is scanning for failed executions',
      status: 'in_progress'
    });
    
    // Look for failed Python executions in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: failedExecutions, error: queryError } = await supabase
      .from('eliza_python_executions')
      .select('id, code, error, created_at')
      .neq('exit_code', 0)
      .gte('created_at', fiveMinutesAgo)
      .is('metadata->was_auto_fixed', null) // Not yet fixed
      .order('created_at', { ascending: false });
    
    if (queryError) {
      throw queryError;
    }
    
    console.log(`📊 [CODE MONITOR] Found ${failedExecutions?.length || 0} failed executions`);
    
    if (failedExecutions && failedExecutions.length > 0) {
      // Log findings
      await supabase.from('eliza_activity_log').insert({
        activity_type: 'daemon_findings',
        title: `⚠️ Code Monitor: Found ${failedExecutions.length} failures`,
        description: `Detected ${failedExecutions.length} failed code executions`,
        metadata: {
          count: failedExecutions.length,
          execution_ids: failedExecutions.map(e => e.id)
        },
        status: 'completed'
      });
      
      // Trigger autonomous-code-fixer for each failure
      for (const execution of failedExecutions) {
        console.log(`🔧 [CODE MONITOR] Triggering fixer for execution ${execution.id}`);
        
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'auto_fix_triggered',
          title: '🤖 Triggering Auto-Fixer',
          description: `Autonomous code fixer triggered for execution ${execution.id}`,
          metadata: {
            execution_id: execution.id,
            error: execution.error?.substring(0, 200)
          },
          status: 'in_progress'
        });
        
        // Trigger the fixer (don't await - let it run async)
        supabase.functions.invoke('autonomous-code-fixer', {
          body: {
            mode: 'local',
            execution_id: execution.id
          }
        }).catch(err => console.error('Failed to invoke fixer:', err));
      }
    } else {
      // Log clean scan
      await supabase.from('eliza_activity_log').insert({
        activity_type: 'daemon_scan_complete',
        title: '✅ Code Monitor: All Clear',
        description: 'No failed executions found',
        status: 'completed'
      });
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        scanned: true,
        failures_found: failedExecutions?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('❌ [CODE MONITOR ERROR]:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
