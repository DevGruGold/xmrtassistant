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
    
    // Use service role key for internal function calls
    const authHeader = `Bearer ${supabaseKey}`;

    console.log(`🔍 Code Monitor Daemon - Action: ${action}`);

    if (action === 'monitor' || action === 'fix_all') {
      // Check GitHub token health first (both backend and session tokens)
      const { data: githubHealth } = await supabase
        .from('api_key_health')
        .select('*')
        .or('service_name.eq.github,service_name.eq.github_session')
        .eq('is_healthy', true) // Only get healthy tokens
        .order('created_at', { ascending: false })
        .limit(1);

      const hasHealthyGitHubToken = githubHealth && githubHealth.length > 0;
      
      console.log(`🔐 GitHub Token Status: ${hasHealthyGitHubToken ? 'Available ✅' : 'Unavailable ❌'}`);
      if (hasHealthyGitHubToken && githubHealth[0]) {
        console.log(`   Source: ${githubHealth[0].service_name} (${githubHealth[0].metadata?.token_name || githubHealth[0].metadata?.user || 'unknown'})`);
      }

      if (!hasHealthyGitHubToken) {
        console.log('⏸️ No valid GitHub token - pausing GitHub-related fixes');
        
        // Create reminder for user to provide PAT
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'github_token_required',
          title: '⚠️ GitHub Token Required',
          description: 'No valid GitHub token available. Please provide your Personal Access Token to enable GitHub operations.',
          status: 'pending',
          metadata: {
            action: 'provide_github_pat',
            urgency: 'high'
          },
          mentioned_to_user: false
        });
      }

      // Trigger the autonomous code fixer directly (bypass gatekeeper in testing mode)
      const fixerUrl = `${supabaseUrl}/functions/v1/autonomous-code-fixer`;
      const fixerResponse = await fetch(fixerUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ github_enabled: hasHealthyGitHubToken })
      });

      if (!fixerResponse.ok) {
        const errorText = await fixerResponse.text();
        console.error('Failed to invoke autonomous-code-fixer:', errorText);
        throw new Error(`Fixer returned ${fixerResponse.status}: ${errorText}`);
      }

      const fixerResult = await fixerResponse.json();

      console.log('✅ Autonomous code fixer completed:', fixerResult);

      // Log monitoring activity with clear GitHub status
      const githubStatusMsg = hasHealthyGitHubToken 
        ? `(GitHub: ✅ ${githubHealth?.[0]?.metadata?.token_name || githubHealth?.[0]?.metadata?.user || 'Available'})`
        : '(GitHub: ❌ No Token)';
      
      await supabase.from('eliza_activity_log').insert({
        activity_type: 'code_monitoring',
        title: '🔍 Code Health Monitor',
        description: `Scanned for failed executions. Fixed: ${fixerResult?.fixed || 0} ${githubStatusMsg}`,
        status: 'completed',
        metadata: {
          fixed_count: fixerResult?.fixed || 0,
          total_processed: fixerResult?.results?.length || 0,
          github_enabled: hasHealthyGitHubToken,
          github_source: hasHealthyGitHubToken ? githubHealth?.[0]?.service_name : null
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
