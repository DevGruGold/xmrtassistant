import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    console.log(`Agent Manager - Action: ${action}`, data);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let result;

    switch (action) {
      case 'list_agents':
        const { data: agents, error: listError } = await supabase
          .from('agents')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (listError) throw listError;
        result = agents;
        break;

      case 'spawn_agent':
        const { data: newAgent, error: spawnError } = await supabase
          .from('agents')
          .insert({
            id: data.id || `agent-${Date.now()}`,
            name: data.name,
            role: data.role,
            status: 'IDLE',
            skills: data.skills || [],
          })
          .select()
          .single();
        
        if (spawnError) throw spawnError;
        
        // Log the decision to spawn this agent
        await supabase.from('decisions').insert({
          id: `decision-${Date.now()}`,
          agent_id: 'eliza',
          decision: `Spawned new agent: ${newAgent.name}`,
          rationale: data.rationale || 'Agent spawned for task delegation',
        });
        
        // Log to activity log
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'agent_spawned',
          title: `Spawned Agent: ${newAgent.name}`,
          description: `Role: ${newAgent.role}`,
          metadata: { agent_id: newAgent.id, skills: newAgent.skills },
          status: 'completed'
        });
        
        result = newAgent;
        console.log('New agent spawned:', newAgent);
        break;

      case 'update_agent_status':
        const { data: updatedAgent, error: updateError } = await supabase
          .from('agents')
          .update({ status: data.status })
          .eq('id', data.agent_id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        result = updatedAgent;
        break;

      case 'assign_task':
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            id: data.task_id || `task-${Date.now()}`,
            title: data.title,
            description: data.description,
            repo: data.repo || 'xmrt-ecosystem',
            category: data.category,
            stage: data.stage || 'PLANNING',
            status: 'PENDING',
            priority: data.priority || 5,
            assignee_agent_id: data.assignee_agent_id,
          })
          .select()
          .single();
        
        if (taskError) throw taskError;
        
        // Update agent status to BUSY
        await supabase
          .from('agents')
          .update({ status: 'BUSY' })
          .eq('id', data.assignee_agent_id);
        
        // Log to activity log
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'task_created',
          title: `Created Task: ${task.title}`,
          description: task.description,
          metadata: {
            task_id: task.id,
            assignee: data.assignee_agent_id,
            category: task.category,
            stage: task.stage
          },
          status: 'completed'
        });
        
        result = task;
        console.log('Task assigned:', task);
        break;

      case 'list_tasks':
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });
        
        if (tasksError) throw tasksError;
        result = tasks;
        break;

      case 'update_task_status':
        const { data: updatedTask, error: taskUpdateError } = await supabase
          .from('tasks')
          .update({ 
            status: data.status,
            stage: data.stage,
          })
          .eq('id', data.task_id)
          .select()
          .single();
        
        if (taskUpdateError) throw taskUpdateError;
        
        // Log to activity log
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'task_updated',
          title: `Updated Task: ${updatedTask.title}`,
          description: `Status: ${data.status}, Stage: ${data.stage}`,
          metadata: {
            task_id: updatedTask.id,
            old_status: data.old_status,
            new_status: data.status,
            stage: data.stage
          },
          status: 'completed'
        });
        
        result = updatedTask;
        break;

      case 'get_agent_workload':
        const { data: agentTasks, error: workloadError } = await supabase
          .from('tasks')
          .select('*')
          .eq('assignee_agent_id', data.agent_id)
          .neq('status', 'COMPLETED');
        
        if (workloadError) throw workloadError;
        result = { agent_id: data.agent_id, active_tasks: agentTasks?.length || 0, tasks: agentTasks };
        break;

      case 'log_decision':
        const { data: decision, error: decisionError } = await supabase
          .from('decisions')
          .insert({
            id: `decision-${Date.now()}`,
            agent_id: data.agent_id || 'eliza',
            decision: data.decision,
            rationale: data.rationale,
          })
          .select()
          .single();
        
        if (decisionError) throw decisionError;
        result = decision;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Agent Manager Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
