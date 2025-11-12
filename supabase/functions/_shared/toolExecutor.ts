import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logFunctionUsage } from './functionUsageLogger.ts';

/**
 * Analyze error to provide learning points for executives
 */
function analyzeLearningFromError(toolName: string, error: string, params: any): string {
  // Network errors
  if (error.includes('network') || error.includes('urllib') || error.includes('requests') || error.includes('http')) {
    return `❌ Python sandbox has no network access. For API calls, use invoke_edge_function instead of execute_python. Example: invoke_edge_function({ function_name: "github-integration", payload: {...} })`;
  }
  
  // Import errors
  if (error.includes('ModuleNotFoundError') || error.includes('ImportError')) {
    const match = error.match(/No module named '([^']+)'/);
    const moduleName = match ? match[1] : 'unknown';
    return `❌ Module '${moduleName}' not available in sandbox. Available: math, json, datetime, random, re, collections, itertools. For external APIs, use invoke_edge_function.`;
  }
  
  // Syntax errors
  if (error.includes('SyntaxError')) {
    return `❌ Python syntax error detected. Check code for typos, indentation, or invalid syntax. Validate code structure before calling execute_python.`;
  }
  
  // Parameter errors
  if (error.includes('missing') || error.includes('required')) {
    return `❌ Missing required parameter for ${toolName}. Check tool definition in ELIZA_TOOLS for required fields. Example: execute_python requires both 'code' and 'purpose'.`;
  }
  
  // JSON parse errors
  if (error.includes('JSON') || error.includes('parse')) {
    return `❌ Invalid JSON in tool arguments. Ensure proper escaping of quotes and valid JSON structure.`;
  }
  
  return `❌ Execution failed: ${error}. Review error details and adjust approach.`;
}

/**
 * Shared tool execution framework for all executives
 * Logs usage, routes to appropriate edge functions, handles errors with detailed learning points
 */
export async function executeToolCall(
  supabase: SupabaseClient,
  toolCall: any,
  executiveName: 'Eliza' | 'CSO' | 'CTO' | 'CIO' | 'CAO',
  SUPABASE_URL: string,
  SERVICE_ROLE_KEY: string
): Promise<any> {
  const startTime = Date.now();
  const { name, arguments: args } = toolCall.function || toolCall;
  
  // Validate tool call structure
  if (!name) {
    await logFunctionUsage(supabase, {
      function_name: 'invalid_tool_call',
      executive_name: executiveName,
      success: false,
      execution_time_ms: Date.now() - startTime,
      error_message: 'Tool call missing function name',
      parameters: toolCall
    });
    return { 
      success: false, 
      error: 'Invalid tool call: missing function name',
      learning_point: 'Tool calls must include a function name. Check tool call structure.'
    };
  }
  
  // Parse arguments with detailed error feedback
  let parsedArgs;
  try {
    parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
  } catch (parseError) {
    await logFunctionUsage(supabase, {
      function_name: name,
      executive_name: executiveName,
      success: false,
      execution_time_ms: Date.now() - startTime,
      error_message: 'Failed to parse tool arguments',
      parameters: { raw_args: args, parse_error: parseError.message }
    });
    return { 
      success: false, 
      error: 'Invalid tool arguments: JSON parse failed',
      learning_point: 'Tool arguments must be valid JSON. Check syntax, ensure quotes are properly escaped, and validate JSON structure.'
    };
  }
  
  // Validate execute_python specific requirements
  if (name === 'execute_python') {
    if (!parsedArgs.code) {
      return {
        success: false,
        error: 'execute_python requires "code" parameter',
        learning_point: 'execute_python tool call must include: { code: "your_python_code", purpose: "description" }'
      };
    }
    if (!parsedArgs.purpose) {
      console.warn(`⚠️ execute_python called without purpose parameter by ${executiveName}`);
      parsedArgs.purpose = 'No purpose specified';
    }
  }
  
  console.log(`🔧 [${executiveName}] Executing tool: ${name}`, parsedArgs);
  
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
        
      case 'get_my_feedback':
        const limit = parsedArgs.limit || 10;
        const unacknowledgedOnly = parsedArgs.unacknowledged_only !== false; // Default true
        const acknowledgeIds = parsedArgs.acknowledge_ids || [];
        
        console.log(`📚 [${executiveName}] Get my feedback - limit: ${limit}, unack only: ${unacknowledgedOnly}`);
        
        // Acknowledge specified feedback items first
        if (acknowledgeIds.length > 0) {
          await supabase
            .from('executive_feedback')
            .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
            .in('id', acknowledgeIds);
          console.log(`✅ [${executiveName}] Acknowledged ${acknowledgeIds.length} feedback items`);
        }
        
        // Fetch feedback
        let query = supabase
          .from('executive_feedback')
          .select('*')
          .eq('executive_name', executiveName)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (unacknowledgedOnly) {
          query = query.eq('acknowledged', false);
        }
        
        const { data: feedback, error: feedbackError } = await query;
        
        if (feedbackError) {
          result = { success: false, error: feedbackError.message };
        } else {
          result = { 
            success: true, 
            result: {
              feedback: feedback || [],
              count: feedback?.length || 0,
              acknowledged_count: acknowledgeIds.length
            }
          };
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
        const proposalResult = await supabase.functions.invoke('propose-new-edge-function', {
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
    
    // Add learning point if there was an error
    if (result.error && !result.learning_point) {
      result.learning_point = analyzeLearningFromError(name, result.error, parsedArgs);
    }
    
    // Log function usage
    await logFunctionUsage(supabase, {
      function_name: name,
      executive_name: executiveName,
      invoked_by: 'tool_call',
      success: result.success !== false,
      execution_time_ms: executionTime,
      parameters: parsedArgs,
      result_summary: result.success ? 'Tool executed successfully' : result.error,
      metadata: result.learning_point ? { learning_point: result.learning_point } : undefined
    });
    
    return result;
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
    const learningPoint = analyzeLearningFromError(name, errorMessage, parsedArgs);
    
    console.error(`❌ [${executiveName}] Tool execution error for ${name}:`, error);
    
    // Log failed execution
    await logFunctionUsage(supabase, {
      function_name: name,
      executive_name: executiveName,
      invoked_by: 'tool_call',
      success: false,
      execution_time_ms: executionTime,
      parameters: parsedArgs,
      error_message: errorMessage,
      metadata: { learning_point: learningPoint }
    });
    
    return { 
      success: false, 
      error: errorMessage,
      learning_point: learningPoint
    };
  }
}