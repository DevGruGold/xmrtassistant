import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This daemon runs periodically to monitor and fix code issues in GitHub repositories
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

    console.log(`🔍 Code Monitor Daemon - Action: ${action} (GitHub Mode)`);

    if (action === 'monitor' || action === 'scan_repos') {
      // Check GitHub token health first
      const { data: githubHealth } = await supabase
        .from('api_key_health')
        .select('*')
        .or('service_name.eq.github,service_name.eq.github_session')
        .eq('is_healthy', true)
        .order('created_at', { ascending: false })
        .limit(1);

      const hasHealthyGitHubToken = githubHealth && githubHealth.length > 0;
      
      console.log(`🔐 GitHub Token Status: ${hasHealthyGitHubToken ? 'Available ✅' : 'Unavailable ❌'}`);
      
      if (!hasHealthyGitHubToken) {
        console.log('⏸️ No valid GitHub token - cannot scan repositories');
        
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'github_token_required',
          title: '⚠️ GitHub Token Required for Code Monitoring',
          description: 'No valid GitHub token available. Please provide your Personal Access Token to enable repository scanning.',
          status: 'pending',
          metadata: { action: 'provide_github_pat', urgency: 'high' },
          mentioned_to_user: false
        });

        return new Response(JSON.stringify({
          success: false,
          error: 'GitHub token required'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get target repositories from configuration
      const targetRepos = Deno.env.get('GITHUB_MONITOR_REPOS')?.split(',') || ['MoneroTrader/xmrt-wallet-public'];
      
      console.log(`📦 Scanning ${targetRepos.length} repositories: ${targetRepos.join(', ')}`);

      // Scan each repository for issues
      let totalIssuesFound = 0;
      let codeIssues = [];

      for (const repo of targetRepos) {
        console.log(`🔍 Scanning repository: ${repo}`);
        
        // Call github-integration to list open issues
        const issuesResponse = await supabase.functions.invoke('github-integration', {
          body: {
            action: 'list_issues',
            repo: repo,
            state: 'open',
            per_page: 50
          }
        });

        if (issuesResponse.error) {
          console.error(`❌ Failed to fetch issues from ${repo}:`, issuesResponse.error);
          continue;
        }

        const issues = issuesResponse.data || [];
        console.log(`📋 Found ${issues.length} open issues in ${repo}`);
        
        // Filter for code-related issues (bugs, performance, code quality)
        const codeRelatedIssues = issues.filter((issue: any) => {
          const labels = issue.labels?.map((l: any) => l.name.toLowerCase()) || [];
          const title = issue.title.toLowerCase();
          const body = (issue.body || '').toLowerCase();
          
          return labels.some(l => l.includes('bug') || l.includes('fix') || l.includes('error') || l.includes('performance')) ||
                 title.includes('error') || title.includes('bug') || title.includes('fix') ||
                 body.includes('error') || body.includes('fix');
        });

        totalIssuesFound += codeRelatedIssues.length;
        codeIssues.push(...codeRelatedIssues.map((issue: any) => ({ ...issue, repo })));
      }

      console.log(`🎯 Found ${totalIssuesFound} code-related issues across all repositories`);

      // Trigger the autonomous code fixer with GitHub context
      const fixerUrl = `${supabaseUrl}/functions/v1/autonomous-code-fixer`;
      const fixerResponse = await fetch(fixerUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          mode: 'github',
          issues: codeIssues.slice(0, 5), // Process top 5 issues
          repositories: targetRepos
        })
      });

      if (!fixerResponse.ok) {
        const errorText = await fixerResponse.text();
        console.error('Failed to invoke autonomous-code-fixer:', errorText);
        throw new Error(`Fixer returned ${fixerResponse.status}: ${errorText}`);
      }

      const fixerResult = await fixerResponse.json();

      console.log('✅ Autonomous code fixer completed:', fixerResult);

      // Log monitoring activity
      await supabase.from('eliza_activity_log').insert({
        activity_type: 'code_monitoring',
        title: '🔍 GitHub Repository Code Monitor',
        description: `Scanned ${targetRepos.length} repositories. Found ${totalIssuesFound} code issues. Analyzed: ${fixerResult?.analyzed || 0}`,
        status: 'completed',
        metadata: {
          repositories: targetRepos,
          total_issues_found: totalIssuesFound,
          issues_analyzed: fixerResult?.analyzed || 0,
          fixes_suggested: fixerResult?.suggested || 0,
          github_enabled: true
        },
        mentioned_to_user: false
      });

      return new Response(JSON.stringify({
        success: true,
        monitoring_complete: true,
        repositories_scanned: targetRepos.length,
        issues_found: totalIssuesFound,
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
