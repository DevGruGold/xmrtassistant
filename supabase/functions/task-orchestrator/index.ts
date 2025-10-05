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

    const { action, data } = await req.json();
    console.log(`🎯 Task Orchestrator - Action: ${action}`);

    let result;

    switch (action) {
      case 'auto_assign_tasks':
        // Automatically assign pending tasks to idle agents
        const { data: pendingTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'PENDING')
          .order('priority', { ascending: false });

        const { data: idleAgents } = await supabase
          .from('agents')
          .select('*')
          .eq('status', 'IDLE');

        if (!pendingTasks || !idleAgents || idleAgents.length === 0) {
          result = { success: true, assignments: 0 };
          break;
        }

        const assignments = [];
        for (let i = 0; i < Math.min(pendingTasks.length, idleAgents.length); i++) {
          const task = pendingTasks[i];
          const agent = idleAgents[i];

          // Assign task to agent
          await supabase
            .from('tasks')
            .update({ 
              status: 'IN_PROGRESS',
              assignee_agent_id: agent.id 
            })
            .eq('id', task.id);

          // Update agent status
          await supabase
            .from('agents')
            .update({ status: 'BUSY' })
            .eq('id', agent.id);

          assignments.push({ task_id: task.id, agent_id: agent.id });

          // Log assignment
          await supabase.from('eliza_activity_log').insert({
            activity_type: 'task_assigned',
            title: `Auto-Assigned: ${task.title}`,
            description: `Assigned to ${agent.name}`,
            metadata: { task_id: task.id, agent_id: agent.id },
            status: 'completed'
          });
        }

        result = { success: true, assignments: assignments.length, details: assignments };
        break;

      case 'rebalance_workload':
        // Rebalance tasks among agents
        const { data: allAgents } = await supabase
          .from('agents')
          .select('id, name, status');

        const workloads = [];
        for (const agent of allAgents || []) {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('assignee_agent_id', agent.id)
            .neq('status', 'COMPLETED');

          workloads.push({
            agent_id: agent.id,
            agent_name: agent.name,
            active_tasks: tasks?.length || 0,
            tasks: tasks || []
          });
        }

        // Sort by workload
        workloads.sort((a, b) => b.active_tasks - a.active_tasks);

        result = { 
          success: true, 
          workloads,
          imbalance: workloads[0]?.active_tasks - workloads[workloads.length - 1]?.active_tasks || 0
        };
        break;

      case 'identify_blockers':
        // Identify blocked tasks and notify
        const { data: blockedTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'BLOCKED');

        for (const task of blockedTasks || []) {
          await supabase.from('eliza_activity_log').insert({
            activity_type: 'task_blocked',
            title: `⚠️ Task Blocked: ${task.title}`,
            description: `Reason: ${task.blocking_reason || 'Unknown'}`,
            metadata: { task_id: task.id },
            status: 'warning'
          });
        }

        result = { success: true, blocked_count: blockedTasks?.length || 0, tasks: blockedTasks };
        break;

      case 'performance_report':
        // Generate performance metrics
        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('*, assignee_agent_id')
          .eq('status', 'COMPLETED')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        const { data: failedTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'FAILED')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        const agentStats = {};
        for (const task of completedTasks || []) {
          if (!agentStats[task.assignee_agent_id]) {
            agentStats[task.assignee_agent_id] = { completed: 0, failed: 0 };
          }
          agentStats[task.assignee_agent_id].completed++;
        }

        for (const task of failedTasks || []) {
          if (!agentStats[task.assignee_agent_id]) {
            agentStats[task.assignee_agent_id] = { completed: 0, failed: 0 };
          }
          agentStats[task.assignee_agent_id].failed++;
        }

        result = {
          success: true,
          metrics: {
            total_completed: completedTasks?.length || 0,
            total_failed: failedTasks?.length || 0,
            agent_performance: agentStats,
            success_rate: completedTasks?.length / (completedTasks?.length + failedTasks?.length || 1)
          }
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Task Orchestrator Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
