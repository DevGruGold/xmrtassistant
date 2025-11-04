import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logFunctionUsage } from './functionUsageLogger.ts';

/**
 * Shared tool execution framework for all executives
 * Logs usage, routes to appropriate edge functions, handles errors
 */
export async function executeToolCall(
  supabase: SupabaseClient,
  toolCall: any,
  executiveName: 'Eliza' | 'CSO' | 'CTO' | 'CIO' | 'CAO',
  SUPABASE_URL: string,
  SERVICE_ROLE_KEY: string
): Promise<any> {
  const { name, arguments: args } = toolCall.function || toolCall;
  const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
  
  console.log(`🔧 [${executiveName}] Executing tool: ${name}`, parsedArgs);
  
  const startTime = Date.now();
  
  try {
    let result: any;
    
    // Route tool calls to appropriate edge functions
    switch(name) {
      case 'invoke_edge_function':
      case 'call_edge_function':
        const { function_name, payload, body } = parsedArgs;
        const targetFunction = function_name || parsedArgs.function_name;
        const targetPayload = payload || body || {};
        
        console.log(`📡 [${executiveName}] Invoking edge function: ${targetFunction}`);
        const funcResult = await supabase.functions.invoke(targetFunction, { body: targetPayload });
        
        if (funcResult.error) {
          console.error(`❌ [${executiveName}] Edge function error:`, funcResult.error);
          result = { success: false, error: funcResult.error.message || 'Function execution failed' };
        } else {
          result = { success: true, result: funcResult.data };
        }
        break;
        
      case 'execute_python':
        const { code, purpose } = parsedArgs;
        console.log(`🐍 [${executiveName}] Execute Python - ${purpose || 'No purpose'}`);
        
        const pythonResult = await supabase.functions.invoke('python-executor', {
          body: { 
            code, 
            purpose,
            source: executiveName.toLowerCase() + '-executive',
            agent_id: executiveName.toLowerCase()
          }
        });
        
        if (pythonResult.error) {
          result = { success: false, error: pythonResult.error.message || 'Python execution failed' };
        } else {
          result = { success: true, result: pythonResult.data };
        }
        break;
        
      case 'createGitHubDiscussion':
        console.log(`📝 [${executiveName}] Create GitHub Discussion`);
        
        const discussionResult = await supabase.functions.invoke('github-integration', {
          body: {
            action: 'create_discussion',
            data: {
              repositoryId: 'R_kgDONfvCEw',
              title: parsedArgs.title,
              body: parsedArgs.body,
              categoryId: parsedArgs.categoryId || 'DIC_kwDOPHeChc4CkXxI'
            }
          }
        });
        
        if (discussionResult.error) {
          result = { success: false, error: discussionResult.error.message };
        } else {
          result = { success: true, result: discussionResult.data };
        }
        break;

      case 'createGitHubIssue':
        console.log(`🐛 [${executiveName}] Create GitHub Issue`);
        
        const issueResult = await supabase.functions.invoke('github-integration', {
          body: {
            action: 'create_issue',
            data: {
              repo: parsedArgs.repo || 'XMRT-Ecosystem',
              title: parsedArgs.title,
              body: parsedArgs.body,
              labels: parsedArgs.labels || []
            }
          }
        });
        
        if (issueResult.error) {
          result = { success: false, error: issueResult.error.message };
        } else {
          result = { success: true, result: issueResult.data };
        }
        break;

      case 'listGitHubIssues':
        console.log(`📋 [${executiveName}] List GitHub Issues`);
        
        const listResult = await supabase.functions.invoke('github-integration', {
          body: {
            action: 'list_issues',
            data: {
              repo: parsedArgs.repo || 'XMRT-Ecosystem',
              state: parsedArgs.state || 'open',
              per_page: parsedArgs.limit || 20
            }
          }
        });
        
        if (listResult.error) {
          result = { success: false, error: listResult.error.message };
        } else {
          result = { success: true, result: listResult.data };
        }
        break;
        
      case 'list_available_functions':
        const functionsResult = await supabase.functions.invoke('list-available-functions', {
          body: { category: parsedArgs.category }
        });
        result = { success: true, result: functionsResult.data };
        break;
        
      case 'get_function_usage_analytics':
        const analyticsResult = await supabase.functions.invoke('function-usage-analytics', {
          body: parsedArgs
        });
        result = { success: true, result: analyticsResult.data };
        break;
        
      case 'propose_new_edge_function':
        const proposalResult = await supabase.functions.invoke('propose-edge-function', {
          body: { ...parsedArgs, proposed_by: executiveName }
        });
        result = { success: true, result: proposalResult.data };
        break;
        
      case 'vote_on_function_proposal':
        const voteResult = await supabase.functions.invoke('vote-on-proposal', {
          body: { ...parsedArgs, executive_name: executiveName }
        });
        result = { success: true, result: voteResult.data };
        break;
        
      case 'list_function_proposals':
        const proposalsResult = await supabase.functions.invoke('list-function-proposals', {
          body: parsedArgs
        });
        result = { success: true, result: proposalsResult.data };
        break;
        
      // Agent management tools
      case 'list_agents':
      case 'spawn_agent':
      case 'update_agent_status':
      case 'assign_task':
      case 'list_tasks':
      case 'update_task_status':
      case 'delete_task':
      case 'get_agent_workload':
        const agentResult = await supabase.functions.invoke('agent-manager', {
          body: { action: name.replace('_', '_').toLowerCase(), ...parsedArgs }
        });
        result = { success: true, result: agentResult.data };
        break;
        
      default:
        console.warn(`⚠️ [${executiveName}] Unknown tool: ${name}`);
        result = { success: false, error: `Unknown tool: ${name}` };
    }
    
    const executionTime = Date.now() - startTime;
    
    // Log function usage
    await logFunctionUsage(supabase, {
      function_name: name,
      executive_name: executiveName,
      invoked_by: 'tool_call',
      success: result.success !== false,
      execution_time_ms: executionTime,
      parameters: parsedArgs,
      result_summary: result.success ? 'Tool executed successfully' : result.error
    });
    
    return result;
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
    
    console.error(`❌ [${executiveName}] Tool execution error for ${name}:`, error);
    
    // Log failed execution
    await logFunctionUsage(supabase, {
      function_name: name,
      executive_name: executiveName,
      invoked_by: 'tool_call',
      success: false,
      execution_time_ms: executionTime,
      parameters: parsedArgs,
      error_message: errorMessage
    });
    
    return { success: false, error: errorMessage };
  }
}
