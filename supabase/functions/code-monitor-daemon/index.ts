import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This daemon runs periodically to monitor and fix failed code
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action = 'monitor' } = await req.json().catch(() => ({ action: 'monitor' }));

    console.log(`🔍 Code Monitor Daemon - Action: ${action}`);

    if (action === 'monitor' || action === 'fix_all') {
      // Trigger the autonomous code fixer
      const { data: fixerResult, error: fixerError } = await supabase.functions.invoke('autonomous-code-fixer');

      if (fixerError) {
        console.error('Failed to invoke autonomous-code-fixer:', fixerError);
        throw fixerError;
      }

      console.log('✅ Autonomous code fixer completed:', fixerResult);

      // Log monitoring activity
      await supabase.from('eliza_activity_log').insert({
        activity_type: 'code_monitoring',
        title: '🔍 Code Health Monitor',
        description: `Scanned for failed executions. Fixed: ${fixerResult?.fixed || 0}`,
        status: 'completed',
        metadata: {
          fixed_count: fixerResult?.fixed || 0,
          total_processed: fixerResult?.results?.length || 0
        },
        mentioned_to_user: false // Eliza will proactively report this
      });

      return new Response(JSON.stringify({
        success: true,
        monitoring_complete: true,
        fixer_result: fixerResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'status') {
      // Get current status of failed vs successful executions
      const { data: failedCount } = await supabase
        .from('eliza_python_executions')
        .select('id', { count: 'exact', head: true })
        .eq('exit_code', 1)
        .eq('source', 'eliza');

      const { data: successCount } = await supabase
        .from('eliza_python_executions')
        .select('id', { count: 'exact', head: true })
        .eq('exit_code', 0);

      const { data: recentActivity } = await supabase
        .from('eliza_activity_log')
        .select('*')
        .in('activity_type', ['python_fix_success', 'python_fix_delegated', 'code_monitoring'])
        .order('created_at', { ascending: false })
        .limit(10);

      return new Response(JSON.stringify({
        success: true,
        status: {
          failed_executions: failedCount || 0,
          successful_executions: successCount || 0,
          recent_fixes: recentActivity || []
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Unknown action' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Code Monitor Daemon error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
