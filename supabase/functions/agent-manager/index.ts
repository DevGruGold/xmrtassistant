import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const INTERNAL_KEY = Deno.env.get('INTERNAL_ELIZA_KEY')!;

// Helper to call other Eliza instances through gatekeeper
async function callEliza(target: string, action: string, payload: any) {
  const response = await fetch(`${supabaseUrl}/functions/v1/eliza-gatekeeper`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-eliza-key': INTERNAL_KEY,
      'x-eliza-source': 'agent-manager'
    },
    body: JSON.stringify({ target, action, payload })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gatekeeper error: ${error.error || 'Unknown error'}`);
  }
  
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, data, autonomous = false } = body;
    
    // Enhanced request body logging for debugging
    console.log(`📦 [agent-manager] Full request body:`, JSON.stringify(body, null, 2));
    console.log(`🎯 [agent-manager] Extracted action: "${action}"`);
    console.log(`📋 [agent-manager] Extracted data:`, data ? JSON.stringify(data, null, 2) : 'UNDEFINED');

    // Validate request structure
    if (!action || typeof action !== 'string') {
      throw new Error(`Invalid or missing action. Received: ${JSON.stringify(body)}`);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    let result;

    switch (action) {
      case 'list_agents':
        const { data: agents, error: listError } = await supabase
          .from('agents')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('🔍 [agent-manager] list_agents - DB query result:', {
          agentsCount: agents?.length || 0,
          agents: agents,
          error: listError
        });
        
        if (listError) throw listError;
        result = agents;
        console.log('🔍 [agent-manager] list_agents - Setting result:', result);
        break;

      case 'spawn_agent':
        // Check if agent with this name already exists
        const { data: existingAgent, error: checkError } = await supabase
          .from('agents')
          .select('*')
          .eq('name', data.name)
          .maybeSingle();
        
        if (checkError) throw checkError;
        
        // If agent already exists, return it instead of creating duplicate
        if (existingAgent) {
          console.log('Agent already exists, returning existing:', existingAgent);
          result = {
            ...existingAgent,
            message: 'Agent already exists with this name',
            wasExisting: true
          };
          break;
        }
        
        // Create new agent
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
        if (!data || !data.agent_id || !data.status) {
          throw new Error('Missing agent_id or status for update_agent_status action.');
        }
        const { data: updatedAgent, error: updateError } = await supabase
          .from('agents')
          .update({ status: data.status })
          .eq('id', data.agent_id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        result = updatedAgent;
        break;

      case 'execute_autonomous_workflow':
        // NEW: Multi-step autonomous task execution
        const { workflow_steps, agent_id, context } = data;
        
        console.log(`🤖 Starting autonomous workflow for agent ${agent_id} with ${workflow_steps.length} steps`);
        
        const workflowResults = [];
        let currentContext = context || {};
        
        for (let i = 0; i < workflow_steps.length; i++) {
          const step = workflow_steps[i];
          console.log(`📍 Executing step ${i + 1}/${workflow_steps.length}: ${step.action}`);
          
          try {
            let stepResult;
            
            // Execute each step based on its action type
            switch (step.action) {
              case 'analyze':
                // Agent analyzes data and makes decisions
                stepResult = {
                  analysis: step.data,
                  decision: step.expected_outcome,
                  timestamp: new Date().toISOString()
                };
                break;
                
              case 'execute_python':
                // Execute Python code through gatekeeper
                stepResult = await callEliza('python-executor', 'execute', {
                  code: step.code,
                  source: 'autonomous_agent',
                  agent_id: agent_id,
                  task_id: context.task_id,
                  purpose: step.purpose || `Workflow step ${i + 1}`
                });
                break;
                
              case 'github_operation':
                // Execute GitHub operations through gatekeeper
                stepResult = await callEliza('github-integration', step.github_action, step.github_data);
                break;
                
              case 'create_subtask':
                // Create and assign subtask to another agent
                const { data: subtask } = await supabase
                  .from('tasks')
                  .insert({
                    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    title: step.task_title,
                    description: step.task_description,
                    repo: step.repo || 'XMRT-Ecosystem',
                    category: step.category || 'autonomous',
                    stage: 'PLANNING',
                    status: 'PENDING',
                    priority: step.priority || 5,
                    assignee_agent_id: step.assigned_agent || null
                  })
                  .select()
                  .single();
                  
                stepResult = { task: subtask, assigned: true };
                break;
                
              case 'query_knowledge':
                // Query knowledge base or memory contexts
                const { data: knowledge } = await supabase
                  .from('knowledge_entities')
                  .select('*')
                  .or(step.query_filters)
                  .limit(10);
                  
                stepResult = { knowledge_items: knowledge };
                break;
                
              case 'log_decision':
                // Log autonomous decision
                const { data: decision } = await supabase
                  .from('decisions')
                  .insert({
                    id: `decision-${Date.now()}`,
                    agent_id: agent_id,
                    decision: step.decision,
                    rationale: step.rationale
                  })
                  .select()
                  .single();
                  
                stepResult = { decision };
                break;
                
              default:
                stepResult = { status: 'skipped', reason: 'Unknown action type' };
            }
            
            // Store step result and update context
            workflowResults.push({
              step: i + 1,
              action: step.action,
              result: stepResult,
              status: 'completed',
              timestamp: new Date().toISOString()
            });
            
            // Update context with step results for next steps
            currentContext = {
              ...currentContext,
              [`step_${i + 1}_result`]: stepResult
            };
            
            // Log activity
            await supabase.from('eliza_activity_log').insert({
              activity_type: 'autonomous_step',
              title: `Autonomous Step ${i + 1}: ${step.action}`,
              description: `Agent ${agent_id} completed workflow step`,
              metadata: {
                step: i + 1,
                action: step.action,
                result: stepResult
              },
              status: 'completed'
            });
            
          } catch (stepError) {
            console.error(`❌ Error in step ${i + 1}:`, stepError);
            workflowResults.push({
              step: i + 1,
              action: step.action,
              error: stepError.message,
              status: 'failed',
              timestamp: new Date().toISOString()
            });
            
            // Log failure
            await supabase.from('eliza_activity_log').insert({
              activity_type: 'autonomous_step',
              title: `Autonomous Step ${i + 1} Failed: ${step.action}`,
              description: stepError.message,
              metadata: {
                step: i + 1,
                action: step.action,
                error: stepError.message
              },
              status: 'failed'
            });
            
            // Continue or break based on error handling strategy
            if (step.critical) {
              break; // Stop workflow on critical step failure
            }
          }
        }
        
        return new Response(JSON.stringify({
          workflow_completed: true,
          steps_executed: workflowResults.length,
          results: workflowResults,
          final_context: currentContext
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'assign_task':
        // Special handling for assign_task to prevent data loss
        let taskData = data;
        if (!taskData && body.title) {
          console.warn(`⚠️ [agent-manager] Data in root body, restructuring...`);
          taskData = { ...body };
          delete taskData.action;
        }
        
        // Enhanced input validation
        if (!taskData) {
          throw new Error(`Missing data object for assign_task. Body structure: ${JSON.stringify(body)}`);
        }
        if (!taskData.title || typeof taskData.title !== 'string') {
          throw new Error('Missing or invalid title (must be string)');
        }
        if (!taskData.description || typeof taskData.description !== 'string') {
          throw new Error('Missing or invalid description (must be string)');
        }
        if (!taskData.category || typeof taskData.category !== 'string') {
          throw new Error('Missing or invalid category (must be string)');
        }
        if (!taskData.assignee_agent_id || typeof taskData.assignee_agent_id !== 'string') {
          throw new Error('Missing or invalid assignee_agent_id (must be string)');
        }
        
        console.log('✅ assign_task - Input validation passed:', {
          title: taskData.title,
          assignee: taskData.assignee_agent_id,
          category: taskData.category
        });
        
        // Check if task with same title and assignee already exists
        const { data: existingTask, error: existingTaskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('title', taskData.title)
          .eq('assignee_agent_id', taskData.assignee_agent_id)
          .in('status', ['PENDING', 'IN_PROGRESS'])
          .maybeSingle();
        
        if (existingTaskError) throw existingTaskError;
        
        // If task already exists, return it instead of creating duplicate
        if (existingTask) {
          console.log('⚠️ Task already exists, returning existing:', existingTask);
          result = {
            ...existingTask,
            message: 'Task already exists',
            wasExisting: true
          };
          break;
        }
        
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            id: taskData.task_id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: taskData.title,
            description: taskData.description,
            repo: taskData.repo || 'xmrt-ecosystem',
            category: taskData.category,
            stage: taskData.stage || 'PLANNING',
            status: 'PENDING',
            priority: taskData.priority || 5,
            assignee_agent_id: taskData.assignee_agent_id,
          })
          .select()
          .single();
        
        if (taskError) {
          console.error('❌ Task INSERT error:', taskError);
          throw taskError;
        }
        
        if (!task) {
          console.error('❌ Task INSERT returned null - likely RLS blocking writes');
          throw new Error('Task creation failed - database returned null (possible RLS issue)');
        }
        
        console.log('✅ Task created successfully:', {
          id: task.id,
          title: task.title,
          assignee: task.assignee_agent_id,
          status: task.status
        });
        
        // Update agent status to BUSY
        await supabase
          .from('agents')
          .update({ status: 'BUSY' })
          .eq('id', taskData.assignee_agent_id);
        
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

        // If task FAILED or BLOCKED, create agent failure alert for Eliza to investigate
        if (data.status === 'FAILED' || data.status === 'BLOCKED') {
          await supabase.from('eliza_activity_log').insert({
            activity_type: 'agent_failure_alert',
            title: `⚠️ Agent Blocked: ${updatedTask.assignee_agent_id}`,
            description: `Task "${updatedTask.title}" ${data.status.toLowerCase()}: ${data.failure_reason || 'Unknown reason'}`,
            metadata: {
              task_id: updatedTask.id,
              agent_id: updatedTask.assignee_agent_id,
              failure_status: data.status,
              failure_reason: data.failure_reason,
              task_title: updatedTask.title,
              stage: data.stage,
              requires_intervention: true
            },
            status: 'pending'
          });
          
          console.warn(`⚠️ AGENT FAILURE ALERT: Agent ${updatedTask.assignee_agent_id} blocked on task ${updatedTask.id}`);
        }

        // If task is completed, free up the agent for new assignments
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          await supabase
            .from('agents')
            .update({ status: 'IDLE' })
            .eq('id', updatedTask.assignee_agent_id);
          
          console.log(`✅ Agent ${updatedTask.assignee_agent_id} marked IDLE after task completion`);
        }
        
        result = updatedTask;
        break;

      case 'report_progress':
        // Agent reports progress to lead agent
        const progressLog = await supabase.from('eliza_activity_log').insert({
          activity_type: 'progress_report',
          title: `Progress Report: ${data.agent_name}`,
          description: data.progress_message,
          metadata: {
            agent_id: data.agent_id,
            task_id: data.task_id,
            progress_percentage: data.progress_percentage,
            current_stage: data.current_stage
          },
          status: 'completed'
        });
        
        console.log(`📊 Progress reported by ${data.agent_name}:`, data.progress_message);
        result = { success: true, message: 'Progress reported' };
        break;

      case 'request_assignment':
        // Agent requests new assignment from lead
        const { data: availableTasks, error: availableError } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'PENDING')
          .order('priority', { ascending: false })
          .limit(1);
        
        if (availableError) throw availableError;
        
        if (availableTasks && availableTasks.length > 0) {
          const nextTask = availableTasks[0];
          
          // Assign the task
          await supabase
            .from('tasks')
            .update({ 
              status: 'IN_PROGRESS',
              assignee_agent_id: data.agent_id 
            })
            .eq('id', nextTask.id);
          
          // Update agent status
          await supabase
            .from('agents')
            .update({ status: 'BUSY' })
            .eq('id', data.agent_id);
          
          // Log assignment
          await supabase.from('eliza_activity_log').insert({
            activity_type: 'task_assigned',
            title: `Task Assigned: ${nextTask.title}`,
            description: `Assigned to ${data.agent_name}`,
            metadata: {
              task_id: nextTask.id,
              agent_id: data.agent_id
            },
            status: 'completed'
          });
          
          console.log(`📋 Assigned task "${nextTask.title}" to ${data.agent_name}`);
          result = { success: true, task: nextTask };
        } else {
          console.log(`⏸️ No tasks available for ${data.agent_name}`);
          result = { success: false, message: 'No pending tasks available' };
        }
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

      case 'update_agent_skills':
        const { data: agentWithUpdatedSkills, error: updateSkillsError } = await supabase
          .from('agents')
          .update({ skills: data.skills })
          .eq('id', data.agent_id)
          .select()
          .single();
        
        if (updateSkillsError) throw updateSkillsError;
        result = { success: true, agent: agentWithUpdatedSkills };
        break;

      case 'update_agent_role':
        const { data: updatedRoleAgent, error: updateRoleError } = await supabase
          .from('agents')
          .update({ role: data.role })
          .eq('id', data.agent_id)
          .select()
          .single();
        
        if (updateRoleError) throw updateRoleError;
        result = { success: true, agent: updatedRoleAgent };
        break;

      case 'delete_agent':
        const { error: deleteAgentError } = await supabase
          .from('agents')
          .delete()
          .eq('id', data.agent_id);
        
        if (deleteAgentError) throw deleteAgentError;
        result = { success: true, message: `Agent ${data.agent_id} deleted` };
        break;

      case 'search_agents':
        let agentQuery = supabase.from('agents').select('*');
        
        if (data.skills) agentQuery = agentQuery.contains('skills', data.skills);
        if (data.role) agentQuery = agentQuery.ilike('role', `%${data.role}%`);
        if (data.status) agentQuery = agentQuery.eq('status', data.status);
        
        const { data: searchedAgents, error: searchAgentsError } = await agentQuery;
        if (searchAgentsError) throw searchAgentsError;
        result = { success: true, agents: searchedAgents };
        break;

      case 'update_task':
        const { data: taskWithUpdates, error: updateTaskError } = await supabase
          .from('tasks')
          .update(data.updates)
          .eq('id', data.task_id)
          .select()
          .single();
        
        if (updateTaskError) throw updateTaskError;
        result = { success: true, task: taskWithUpdates };
        break;

      case 'search_tasks':
        let taskQuery = supabase.from('tasks').select('*');
        
        if (data.category) taskQuery = taskQuery.eq('category', data.category);
        if (data.repo) taskQuery = taskQuery.eq('repo', data.repo);
        if (data.stage) taskQuery = taskQuery.eq('stage', data.stage);
        if (data.status) taskQuery = taskQuery.eq('status', data.status);
        if (data.min_priority) taskQuery = taskQuery.gte('priority', data.min_priority);
        if (data.max_priority) taskQuery = taskQuery.lte('priority', data.max_priority);
        
        const { data: searchedTasks, error: searchTasksError } = await taskQuery;
        if (searchTasksError) throw searchTasksError;
        result = { success: true, tasks: searchedTasks };
        break;

      case 'bulk_update_tasks':
        const { data: bulkUpdated, error: bulkError } = await supabase
          .from('tasks')
          .update(data.updates)
          .in('id', data.task_ids)
          .select();
        
        if (bulkError) throw bulkError;
        result = { success: true, updated_count: bulkUpdated.length, tasks: bulkUpdated };
        break;

      case 'delete_task':
        const { data: deletedTask, error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', data.task_id)
          .select()
          .single();
        
        if (deleteError) throw deleteError;
        
        // Log deletion
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'task_deleted',
          title: `Deleted Task: ${deletedTask.title}`,
          description: `Reason: ${data.reason}`,
          metadata: {
            task_id: deletedTask.id,
            reason: data.reason
          },
          status: 'completed'
        });
        
        // Free up the agent if it was assigned
        if (deletedTask.assignee_agent_id) {
          await supabase
            .from('agents')
            .update({ status: 'IDLE' })
            .eq('id', deletedTask.assignee_agent_id);
        }
        
        result = { success: true, deleted_task: deletedTask };
        break;

      case 'reassign_task':
        const { data: taskToReassign, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', data.task_id)
          .single();
        
        if (fetchError) throw fetchError;
        
        const oldAssignee = taskToReassign.assignee_agent_id;
        
        // Update task assignment
        const { data: reassignedTask, error: reassignError } = await supabase
          .from('tasks')
          .update({ assignee_agent_id: data.new_assignee_id })
          .eq('id', data.task_id)
          .select()
          .single();
        
        if (reassignError) throw reassignError;
        
        // Free up old agent
        if (oldAssignee) {
          await supabase
            .from('agents')
            .update({ status: 'IDLE' })
            .eq('id', oldAssignee);
        }
        
        // Mark new agent as busy
        await supabase
          .from('agents')
          .update({ status: 'BUSY' })
          .eq('id', data.new_assignee_id);
        
        // Log reassignment
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'task_updated',
          title: `Reassigned Task: ${reassignedTask.title}`,
          description: `From ${oldAssignee || 'unassigned'} to ${data.new_assignee_id}. ${data.reason || ''}`,
          metadata: {
            task_id: reassignedTask.id,
            old_assignee: oldAssignee,
            new_assignee: data.new_assignee_id,
            reason: data.reason
          },
          status: 'completed'
        });
        
        result = reassignedTask;
        break;

      case 'update_task_details':
        const updateFields: any = {};
        if (data.title) updateFields.title = data.title;
        if (data.description) updateFields.description = data.description;
        if (data.priority !== undefined) updateFields.priority = data.priority;
        if (data.category) updateFields.category = data.category;
        if (data.repo) updateFields.repo = data.repo;
        
        const { data: detailUpdatedTask, error: detailUpdateError } = await supabase
          .from('tasks')
          .update(updateFields)
          .eq('id', data.task_id)
          .select()
          .single();
        
        if (detailUpdateError) throw detailUpdateError;
        
        // Log update
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'task_updated',
          title: `Updated Task Details: ${detailUpdatedTask.title}`,
          description: `Updated fields: ${Object.keys(updateFields).join(', ')}`,
          metadata: {
            task_id: detailUpdatedTask.id,
            updated_fields: updateFields
          },
          status: 'completed'
        });
        
        result = detailUpdatedTask;
        break;

      case 'get_task_details':
        const { data: taskDetails, error: taskDetailsError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', data.task_id)
          .single();
        
        if (taskDetailsError) throw taskDetailsError;
        result = taskDetails;
        break;

      case 'cleanup_duplicate_agents':
        // Find all duplicate agents (same name)
        const { data: allAgents, error: agentsFetchError } = await supabase
          .from('agents')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (agentsFetchError) throw agentsFetchError;
        
        // Group by name and keep only the oldest
        const agentsByName = new Map();
        const duplicatesToDelete = [];
        
        for (const agent of allAgents) {
          if (!agentsByName.has(agent.name)) {
            agentsByName.set(agent.name, agent);
          } else {
            duplicatesToDelete.push(agent.id);
          }
        }
        
        // Delete duplicates
        if (duplicatesToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('agents')
            .delete()
            .in('id', duplicatesToDelete);
          
          if (deleteError) throw deleteError;
          
          // Log the cleanup
          await supabase.from('eliza_activity_log').insert({
            activity_type: 'cleanup',
            title: '🧹 Cleaned up duplicate agents',
            description: `Removed ${duplicatesToDelete.length} duplicate agents`,
            metadata: { deleted_ids: duplicatesToDelete },
            status: 'completed'
          });
        }
        
        result = { 
          success: true, 
          duplicatesRemoved: duplicatesToDelete.length,
          deletedIds: duplicatesToDelete
        };
        console.log('Duplicate agents cleaned up:', duplicatesToDelete);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const responsePayload = { success: true, data: result };
    console.log('🔍 [agent-manager] Final response payload:', {
      action,
      dataType: Array.isArray(result) ? 'array' : typeof result,
      dataLength: Array.isArray(result) ? result.length : 'N/A',
      payload: responsePayload
    });
    
    return new Response(
      JSON.stringify(responsePayload),
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
