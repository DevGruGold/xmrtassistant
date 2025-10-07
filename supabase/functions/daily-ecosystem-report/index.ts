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

    console.log('📊 Generating Daily Ecosystem Report...');

    // Gather data from various sources
    const [
      { data: agents },
      { data: tasks },
      { data: recentActivity },
      { data: recentExecutions },
      { data: repos }
    ] = await Promise.all([
      supabase.from('agents').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('eliza_activity_log')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('eliza_python_executions')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('repos').select('*')
    ]);

    // Fetch mining stats
    const miningStatsResponse = await supabase.functions.invoke('mining-proxy');
    const miningStats = miningStatsResponse.data;

    // Calculate statistics
    const agentStats = {
      total: agents?.length || 0,
      idle: agents?.filter(a => a.status === 'IDLE').length || 0,
      busy: agents?.filter(a => a.status === 'BUSY').length || 0,
      working: agents?.filter(a => a.status === 'WORKING').length || 0,
      error: agents?.filter(a => a.status === 'ERROR').length || 0
    };

    const taskStats = {
      total: tasks?.length || 0,
      pending: tasks?.filter(t => t.status === 'PENDING').length || 0,
      in_progress: tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0,
      blocked: tasks?.filter(t => t.status === 'BLOCKED').length || 0,
      completed: tasks?.filter(t => t.status === 'COMPLETED').length || 0,
      failed: tasks?.filter(t => t.status === 'FAILED').length || 0
    };

    const executionStats = {
      total: recentExecutions?.length || 0,
      successful: recentExecutions?.filter(e => e.exit_code === 0).length || 0,
      failed: recentExecutions?.filter(e => e.exit_code !== 0).length || 0
    };

    // Find wins and milestones
    const wins = recentActivity?.filter(a => 
      a.status === 'completed' && 
      (a.activity_type.includes('success') || a.title.includes('✅'))
    ) || [];

    const blockedTasks = tasks?.filter(t => t.status === 'BLOCKED') || [];
    const pendingTasks = tasks?.filter(t => t.status === 'PENDING').slice(0, 10) || [];

    // Format the report
    const reportDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/Chicago'
    });

    const reportBody = `# 🌟 XMRT DAO Ecosystem Daily Report
**Date:** ${reportDate}
**Generated:** ${new Date().toISOString()}

---

## 📊 System Overview

### Agent Status
- **Total Agents:** ${agentStats.total}
- **Active:** ${agentStats.working + agentStats.busy}
- **Idle:** ${agentStats.idle}
- **Errors:** ${agentStats.error}

### Task Pipeline
- **Total Tasks:** ${taskStats.total}
- **Pending:** ${taskStats.pending}
- **In Progress:** ${taskStats.in_progress}
- **Blocked:** ${taskStats.blocked} ⚠️
- **Completed:** ${taskStats.completed}
- **Failed:** ${taskStats.failed}

### Code Execution (Last 24h)
- **Total Executions:** ${executionStats.total}
- **Successful:** ${executionStats.successful}
- **Failed:** ${executionStats.failed}
- **Success Rate:** ${executionStats.total > 0 ? ((executionStats.successful / executionStats.total) * 100).toFixed(1) : 0}%

### Mining Pool Status
${miningStats?.hashRate ? `- **Hash Rate:** ${miningStats.hashRate} H/s` : '- **Hash Rate:** N/A'}
${miningStats?.validShares ? `- **Valid Shares:** ${miningStats.validShares}` : '- **Valid Shares:** N/A'}
${miningStats?.amountDue ? `- **Amount Due:** ${(parseFloat(miningStats.amountDue) / 1e12).toFixed(8)} XMR` : '- **Amount Due:** N/A'}

---

## 🎉 Recent Wins & Milestones (Last 24h)

${wins.length > 0 ? wins.slice(0, 5).map(w => `- **${w.title}**\n  ${w.description || ''}`).join('\n') : '- No major milestones recorded in the last 24 hours'}

---

## ⚠️ Issues & Blocked Tasks

${blockedTasks.length > 0 ? blockedTasks.map(t => `- **[${t.id}]** ${t.title}\n  - Repo: ${t.repo}\n  - Reason: ${t.blocking_reason || 'Not specified'}\n  - Assignee: ${t.assignee_agent_id || 'Unassigned'}`).join('\n\n') : '- No blocked tasks ✅'}

---

## 📋 Pending Tasks (Priority Order)

${pendingTasks.length > 0 ? pendingTasks.map(t => `- **[${t.id}]** ${t.title}\n  - Repo: ${t.repo}\n  - Category: ${t.category}\n  - Priority: ${t.priority}`).join('\n\n') : '- No pending tasks'}

---

## 🔧 Repository Status

${repos && repos.length > 0 ? repos.map(r => `- **${r.name}**\n  - Category: ${r.category}\n  - Status: ${r.repo_exists ? '✅ Exists' : '❌ Not Found'}\n  - ${r.url || 'No URL'}`).join('\n\n') : '- No repositories tracked'}

---

## 📈 Recommended Actions

${agentStats.error > 0 ? `- ⚠️ **${agentStats.error} agents in error state** - Investigation needed\n` : ''}${taskStats.blocked > 0 ? `- ⚠️ **${taskStats.blocked} blocked tasks** - Requires immediate attention\n` : ''}${executionStats.failed > 5 ? `- ⚠️ **High execution failure rate** - Review recent code changes\n` : ''}${agentStats.idle === agentStats.total && taskStats.pending > 0 ? `- ⚠️ **All agents idle with ${taskStats.pending} pending tasks** - Task assignment needed\n` : ''}${agentStats.error === 0 && taskStats.blocked === 0 && executionStats.total > 0 && (executionStats.successful / executionStats.total) > 0.9 ? '- ✅ **System healthy** - All metrics within normal parameters\n' : ''}

---

*This report was automatically generated by Eliza AI*
*Next report: Tomorrow at 8:00 AM CST*
`;

    // Create GitHub issue using github-integration function
    const { data: issueData, error: issueError } = await supabase.functions.invoke('github-integration', {
      body: {
        action: 'create_issue',
        data: {
          title: `📊 Daily Ecosystem Report - ${reportDate}`,
          body: reportBody,
          labels: ['daily-report', 'automated', 'ecosystem-health']
        }
      }
    });

    if (issueError) {
      console.error('Error creating GitHub issue:', issueError);
      throw issueError;
    }

    // Auto-assign blocked tasks to appropriate agents
    if (blockedTasks.length > 0) {
      for (const task of blockedTasks) {
        // Find an available agent with matching skills
        const availableAgent = agents?.find(a => 
          a.status === 'IDLE' && 
          a.skills.some((skill: string) => task.category.toLowerCase().includes(skill.toLowerCase()))
        );

        if (availableAgent) {
          await supabase
            .from('tasks')
            .update({ 
              assignee_agent_id: availableAgent.id,
              status: 'IN_PROGRESS'
            })
            .eq('id', task.id);
          
          console.log(`Assigned task ${task.id} to agent ${availableAgent.id}`);
        }
      }
    }

    // Log the report generation
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'daily_report_generated',
      title: '📊 Daily Ecosystem Report Generated',
      description: `Generated daily report and posted to GitHub issue #${issueData?.data?.number || 'N/A'}`,
      metadata: {
        issue_url: issueData?.data?.html_url,
        agent_stats: agentStats,
        task_stats: taskStats,
        execution_stats: executionStats,
        wins_count: wins.length,
        blocked_count: blockedTasks.length
      },
      status: 'completed'
    });

    return new Response(
      JSON.stringify({
        success: true,
        issue_url: issueData?.data?.html_url,
        issue_number: issueData?.data?.number,
        stats: {
          agents: agentStats,
          tasks: taskStats,
          executions: executionStats,
          wins: wins.length,
          blocked: blockedTasks.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Daily Report Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
