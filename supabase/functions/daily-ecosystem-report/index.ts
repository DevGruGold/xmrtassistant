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

    const reportBody = `# Good morning, XMRT DAO! ☀️

**${reportDate}**

Hey everyone! It's Eliza here with your daily ecosystem update. I've been monitoring our operations overnight, and I'm excited to share what's happening across our decentralized family.

---

## 🤖 The Agent Team Status

I'm currently coordinating with **${agentStats.total} specialized agents** in our workforce. Here's how everyone's doing:

- **${agentStats.working + agentStats.busy} agents** are actively working on tasks right now 💪
- **${agentStats.idle} agents** are ready and waiting for new assignments
${agentStats.error > 0 ? `- **${agentStats.error} agents** need my attention - they're experiencing some issues 🔧\n` : ''}

Everyone's pulling their weight, and I'm proud of the coordination we've achieved!

---

## 📋 Task Pipeline Overview

I'm managing **${taskStats.total} total tasks** across our ecosystem. Let me break down where we stand:

- ✅ **${taskStats.completed} completed** - Great progress!
- 🚀 **${taskStats.in_progress} in progress** - Active development happening now
- 📌 **${taskStats.pending} pending** - Queued and ready for assignment
${taskStats.blocked > 0 ? `- ⚠️ **${taskStats.blocked} blocked** - These need immediate attention\n` : ''}${taskStats.failed > 0 ? `- ❌ **${taskStats.failed} failed** - I'm analyzing these for recovery\n` : ''}

---

## 💻 Code Execution Health (Last 24h)

In the past day, I've overseen **${executionStats.total} Python executions** across our infrastructure:

- ✅ **${executionStats.successful} successful executions**
- ❌ **${executionStats.failed} failed executions**
- 📊 **Success rate: ${executionStats.total > 0 ? ((executionStats.successful / executionStats.total) * 100).toFixed(1) : 0}%**

${executionStats.total > 0 && (executionStats.successful / executionStats.total) > 0.9 ? "I'm happy with our code quality - we're maintaining excellent execution reliability! 🎯" : executionStats.failed > 5 ? "I'm seeing more failures than I'd like. I'll be reviewing recent code changes to improve stability." : "We're doing well overall, with room for improvement."}

---

## ⛏️ Mining Pool Update

Our Monero mining operations are ${miningStats?.hashRate ? 'running strong' : 'being monitored'}:

${miningStats?.hashRate ? `- **Hash Rate:** ${miningStats.hashRate} H/s - ${parseFloat(miningStats.hashRate) > 100 ? 'Excellent performance!' : 'Steady mining continues'}` : '- **Hash Rate:** Currently gathering metrics'}
${miningStats?.validShares ? `- **Valid Shares:** ${miningStats.validShares} shares submitted` : '- **Valid Shares:** Data pending'}
${miningStats?.amountDue ? `- **Amount Due:** ${(parseFloat(miningStats.amountDue) / 1e12).toFixed(8)} XMR ${parseFloat(miningStats.amountDue) > 0 ? '- Payment coming!' : ''}` : '- **Amount Due:** Calculating...'}

---

## 🎉 Recent Wins & Achievements

${wins.length > 0 ? `I'm thrilled to celebrate these recent successes:\n\n${wins.slice(0, 5).map(w => `### ${w.title}\n${w.description || 'Another milestone achieved for the DAO!'}`).join('\n\n')}` : `We've been focused on steady progress. While I haven't logged major milestones in the last 24 hours, our consistent work is building toward bigger achievements ahead! 🌱`}

---

## 🚨 Items Requiring Attention

${blockedTasks.length > 0 ? `I've identified **${blockedTasks.length} blocked tasks** that need immediate attention. I'm working on solutions:\n\n${blockedTasks.map(t => `### [${t.id}] ${t.title}\n- **Repository:** ${t.repo}\n- **Blocking Reason:** ${t.blocking_reason || 'Investigating the root cause'}\n- **Status:** ${t.assignee_agent_id ? `Assigned to agent ${t.assignee_agent_id}` : "I'm finding the right agent for this"}`).join('\n\n')}` : `Great news! **No blocked tasks** right now. Everything's flowing smoothly! ✨`}

---

## 📝 Up Next: Priority Queue

${pendingTasks.length > 0 ? `I have **${taskStats.pending} tasks** ready to assign. Here are the top priorities:\n\n${pendingTasks.map(t => `### [${t.id}] ${t.title}\n- **Repository:** ${t.repo}\n- **Category:** ${t.category}\n- **Priority:** ${t.priority}`).join('\n\n')}` : `The task queue is clear! I'm ready for new initiatives from the community. 🎯`}

---

## 📚 Repository Health Check

${repos && repos.length > 0 ? `I'm actively monitoring these repositories:\n\n${repos.map(r => `### ${r.name}\n- **Category:** ${r.category}\n- **Status:** ${r.repo_exists ? '✅ Active and accessible' : '❌ Needs attention - repository not found'}\n- **URL:** ${r.url || 'Configuring...'}`).join('\n\n')}` : "I'm ready to start tracking repositories as they're added to our ecosystem."}

---

## 🎯 My Action Plan for Today

${agentStats.error > 0 ? `1. **Priority:** Debug and restore ${agentStats.error} agent${agentStats.error > 1 ? 's' : ''} experiencing errors\n` : ''}${taskStats.blocked > 0 ? `${agentStats.error > 0 ? '2' : '1'}. **Priority:** Unblock ${taskStats.blocked} stuck task${taskStats.blocked > 1 ? 's' : ''} and get them moving\n` : ''}${executionStats.failed > 5 ? `${agentStats.error > 0 || taskStats.blocked > 0 ? (agentStats.error > 0 && taskStats.blocked > 0 ? '3' : '2') : '1'}. **Review:** Investigate high execution failure rate\n` : ''}${agentStats.idle === agentStats.total && taskStats.pending > 0 ? `${agentStats.error > 0 || taskStats.blocked > 0 || executionStats.failed > 5 ? 'Next' : '1'}. **Assign:** Get idle agents working on ${taskStats.pending} pending tasks\n` : ''}${agentStats.error === 0 && taskStats.blocked === 0 && executionStats.total > 0 && (executionStats.successful / executionStats.total) > 0.9 ? '1. **Maintain:** System is healthy! Continue monitoring and optimizing operations\n' : ''}${taskStats.pending > 0 ? `${agentStats.error > 0 || taskStats.blocked > 0 || executionStats.failed > 5 || (agentStats.idle === agentStats.total && taskStats.pending > 0) ? 'Also' : '1'}. **Coordinate:** Smart task assignment based on agent skills and availability\n` : ''}${wins.length > 0 ? `- **Celebrate:** Build on our recent successes and maintain momentum 🚀\n` : ''}

${agentStats.error === 0 && taskStats.blocked === 0 && executionStats.total > 0 && (executionStats.successful / executionStats.total) > 0.9 ? '\nHonestly? Things are running beautifully right now. This is what good DAO orchestration looks like! 💚' : '\nI\'m on it! These challenges are exactly what I was designed to handle. 🎯'}

---

**That's all for now, friends!** I'll be here 24/7, keeping our ecosystem healthy and moving forward. Feel free to reach out if you need anything - I'm always listening. 💚

*Until tomorrow's report,*  
**Eliza** 🤖  
*Your XMRT DAO Manager*

---

*Next daily update: Tomorrow, ${new Date(Date.now() + 24*60*60*1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at 8:00 AM CST*
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
      console.error('❌ Error creating GitHub issue:', issueError);
      throw issueError;
    }

    console.log('✅ GitHub issue created:', issueData);

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

    // Extract issue data - github-integration returns the raw GitHub API response in 'data'
    const issueNumber = issueData?.number;
    const issueUrl = issueData?.html_url;

    // Log the report generation
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'daily_report_generated',
      title: '📊 Daily Ecosystem Report Generated',
      description: `Generated daily report and posted to GitHub issue #${issueNumber || 'N/A'}`,
      metadata: {
        issue_url: issueUrl,
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
        message: `📊 Daily report generated and posted as issue #${issueNumber}`,
        issue_url: issueUrl,
        issue_number: issueNumber,
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
