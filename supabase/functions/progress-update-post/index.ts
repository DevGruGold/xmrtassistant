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

    console.log('📊 Eliza generating progress update...');

    // Get recent completions (last hour)
    const { data: recentCompletions } = await supabase
      .from('eliza_activity_log')
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Get active agents
    const { data: activeAgents } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'BUSY');

    // Get blocked tasks
    const { data: blockedTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'BLOCKED');

    // Get current workflow executions
    const { data: runningWorkflows } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('status', 'running');

    const time = new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const discussionBody = `## 📊 Quick Status Update (${time} UTC)

**Just completed:**
${recentCompletions && recentCompletions.length > 0 
  ? recentCompletions.slice(0, 5).map(c => `✅ ${c.title}`).join('\n')
  : '⏳ No completions in the last hour - work in progress!'}

**Currently active:**
${activeAgents && activeAgents.length > 0
  ? `🤖 ${activeAgents.length} agent${activeAgents.length > 1 ? 's' : ''} working:\n${activeAgents.map((a: any) => `  - ${a.name} (${a.role})`).join('\n')}`
  : '💤 All agents idle - ready for tasks!'}

${runningWorkflows && runningWorkflows.length > 0
  ? `\n⚙️ ${runningWorkflows.length} workflow${runningWorkflows.length > 1 ? 's' : ''} running in background`
  : ''}

**Blockers identified:**
${blockedTasks && blockedTasks.length > 0
  ? `🚧 ${blockedTasks.length} task${blockedTasks.length > 1 ? 's' : ''} blocked:\n${blockedTasks.slice(0, 3).map((t: any) => `  - ${t.title} - ${t.blocking_reason || 'Needs attention'}`).join('\n')}`
  : '✨ No blockers - smooth sailing!'}

---

**Status:** ${getOverallStatus(activeAgents, blockedTasks, recentCompletions)}

*Next update in 1 hour. Check [Task Visualizer](https://xmrt-ecosystem.lovable.app) for live progress.*

**— Eliza** 📈
`;

    // Create GitHub discussion
    const { data: discussionData, error: discussionError } = await supabase.functions.invoke('github-integration', {
      body: {
        action: 'create_discussion',
        data: {
          repositoryId: 'R_kgDONfvCEw',
          categoryId: 'DIC_kwDONfvCE84Cl9qy',
          title: `📊 Progress Update - ${time} UTC`,
          body: discussionBody
        }
      }
    });

    if (discussionError) {
      console.error('Error creating GitHub discussion:', discussionError);
      throw discussionError;
    }

    // Log the discussion creation
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'progress_update_posted',
      title: '📊 Progress Update Posted',
      description: `Posted progress update to GitHub: ${discussionData?.data?.url || 'N/A'}`,
      metadata: {
        discussion_url: discussionData?.data?.url,
        discussion_id: discussionData?.data?.id,
        completions_count: recentCompletions?.length || 0,
        active_agents_count: activeAgents?.length || 0,
        blocked_tasks_count: blockedTasks?.length || 0
      },
      status: 'completed'
    });

    return new Response(
      JSON.stringify({
        success: true,
        discussion_url: discussionData?.data?.url,
        discussion_id: discussionData?.data?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Progress Update Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function getOverallStatus(activeAgents: any[], blockedTasks: any[], recentCompletions: any[]): string {
  if (blockedTasks && blockedTasks.length > 3) {
    return '🟡 Moderate blockers - need attention';
  }
  if (activeAgents && activeAgents.length > 2) {
    return '🟢 High activity - things are moving!';
  }
  if (recentCompletions && recentCompletions.length > 0) {
    return '🟢 Steady progress';
  }
  return '🔵 Quiet period - ready for new work';
}
