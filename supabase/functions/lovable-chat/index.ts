import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { ELIZA_TOOLS } from '../_shared/elizaTools.ts';
import { getAICredential, createCredentialRequiredResponse } from "../_shared/credentialCascade.ts";
import { callLovableAIGateway } from '../_shared/aiGatewayFallback.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


// Helper function to log tool execution to activity log
async function logToolExecution(supabase: any, toolName: string, args: any, status: 'started' | 'completed' | 'failed', result?: any, error?: any) {
  try {
    const metadata: any = {
      tool_name: toolName,
      arguments: args,
      timestamp: new Date().toISOString(),
      execution_status: status
    };
    
    if (result) {
      metadata.result = result;
    }
    
    if (error) {
      metadata.error = error;
    }
    
    await supabase.from('eliza_activity_log').insert({
      activity_type: 'tool_execution',
      title: `🔧 ${toolName}`,
      description: `Eliza executed: ${toolName}`,
      metadata,
      status: status === 'completed' ? 'completed' : (status === 'failed' ? 'failed' : 'in_progress')
    });
    
    console.log(`📊 Logged tool execution: ${toolName} (${status})`);
  } catch (logError) {
    console.error('Failed to log tool execution:', logError);
  }
}

// Helper function to execute tool calls from AI
async function executeToolCall(supabase: any, toolCall: any, SUPABASE_URL: string, SERVICE_ROLE_KEY: string): Promise<any> {
  const { name, arguments: args } = toolCall.function;
  const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
  
  console.log(`🔧 Executing tool: ${name}`, parsedArgs);
  
  // Log ALL tool calls to activity table for visibility
  await logToolExecution(supabase, name, parsedArgs, 'started');
  
  try {
    // Route tool calls to appropriate edge functions
    switch(name) {
      case 'invoke_edge_function':
      case 'call_edge_function':
        const { function_name, payload, body } = parsedArgs;
        const targetFunction = function_name || parsedArgs.function_name;
        const targetPayload = payload || body || {};
        
        console.log(`📡 Invoking edge function: ${targetFunction}`);
        const result = await supabase.functions.invoke(targetFunction, { body: targetPayload });
        
        if (result.error) {
          console.error(`❌ Edge function error:`, result.error);
          return { success: false, error: result.error.message || 'Function execution failed' };
        }
        
        return { success: true, result: result.data };
        
      case 'execute_python':
        const { code, purpose } = parsedArgs;
        console.log(`🐍 [TOOL CALL] execute_python triggered!`);
        console.log(`📝 [CODE LENGTH] ${code?.length || 0} characters`);
        console.log(`🎯 [PURPOSE] ${purpose || 'No purpose specified'}`);
        console.log(`📋 [CODE PREVIEW] ${code?.substring(0, 100) || 'No code'}...`);
        
        const pythonResult = await supabase.functions.invoke('python-executor', {
          body: { 
            code, 
            purpose,
            source: 'lovable-chat',
            agent_id: 'eliza-main'
          }
        });
        
        if (pythonResult.error) {
          console.error(`❌ Python execution error:`, pythonResult.error);
          return { success: false, error: pythonResult.error.message || 'Python execution failed' };
        }
        
        return { success: true, result: pythonResult.data };
        
      case 'createGitHubDiscussion':
        console.log(`📝 [TOOL CALL] createGitHubDiscussion triggered!`);
        console.log(`🎯 [TITLE] ${parsedArgs.title || 'No title'}`);
        console.log(`📋 [BODY LENGTH] ${parsedArgs.body?.length || 0} characters`);
        
        const discussionResult = await supabase.functions.invoke('github-integration', {
          body: {
            action: 'create_discussion',
            data: {
              repositoryId: 'R_kgDONfvCEw', // XMRT-Ecosystem repo ID
              title: parsedArgs.title,
              body: parsedArgs.body,
              categoryId: parsedArgs.categoryId || 'DIC_kwDOPHeChc4CkXxI' // General category
            }
          }
        });
        
        if (discussionResult.error) {
          console.error(`❌ GitHub discussion creation error:`, discussionResult.error);
          return { success: false, error: discussionResult.error.message || 'Discussion creation failed' };
        }
        
        console.log(`✅ Discussion created:`, discussionResult.data);
        return { success: true, result: discussionResult.data };

      case 'createGitHubIssue':
        console.log(`🐛 [TOOL CALL] createGitHubIssue triggered!`);
        console.log(`🎯 [REPO] ${parsedArgs.repo || 'XMRT-Ecosystem'}`);
        console.log(`📋 [TITLE] ${parsedArgs.title || 'No title'}`);
        
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
          console.error(`❌ GitHub issue creation error:`, issueResult.error);
          return { success: false, error: issueResult.error.message || 'Issue creation failed' };
        }
        
        console.log(`✅ Issue created:`, issueResult.data);
        return { success: true, result: issueResult.data };

      case 'listGitHubIssues':
        console.log(`📋 [TOOL CALL] listGitHubIssues triggered!`);
        
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
          console.error(`❌ GitHub issue list error:`, listResult.error);
          return { success: false, error: listResult.error.message || 'Issue listing failed' };
        }
        
        return { success: true, result: listResult.data };
        
      case 'list_available_functions':
        const { category } = parsedArgs;
        const functionsListResult = await supabase.functions.invoke('list-available-functions', {
          body: { category }
        });
        
        return { success: true, result: functionsListResult.data };
        
      // Agent management tools
      case 'list_agents':
        const agentList = await supabase.functions.invoke('agent-manager', {
          body: { action: 'list_agents' }
        });
        return { success: true, result: agentList.data };
        
      case 'spawn_agent':
        const spawnResult = await supabase.functions.invoke('agent-manager', {
          body: { action: 'spawn_agent', ...parsedArgs }
        });
        return { success: true, result: spawnResult.data };
        
      case 'update_agent_status':
        const updateResult = await supabase.functions.invoke('agent-manager', {
          body: { action: 'update_agent_status', ...parsedArgs }
        });
        return { success: true, result: updateResult.data };
        
      case 'assign_task':
        const assignResult = await supabase.functions.invoke('agent-manager', {
          body: { action: 'assign_task', ...parsedArgs }
        });
        return { success: true, result: assignResult.data };
        
      case 'list_tasks':
        const taskList = await supabase.functions.invoke('agent-manager', {
          body: { action: 'list_tasks' }
        });
        return { success: true, result: taskList.data };
        
      case 'update_task_status':
        const taskUpdate = await supabase.functions.invoke('agent-manager', {
          body: { action: 'update_task', ...parsedArgs }
        });
        return { success: true, result: taskUpdate.data };
        
      case 'delete_task':
        const deleteResult = await supabase.functions.invoke('agent-manager', {
          body: { action: 'delete_task', ...parsedArgs }
        });
        return { success: true, result: deleteResult.data };
        
      case 'get_agent_workload':
        const workloadResult = await supabase.functions.invoke('agent-manager', {
          body: { action: 'get_workload', ...parsedArgs }
        });
        return { success: true, result: workloadResult.data };
        
      default:
        console.warn(`⚠️ Unknown tool: ${name}`);
        await logToolExecution(supabase, name, parsedArgs, 'failed', null, `Unknown tool: ${name}`);
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error(`❌ Tool execution error for ${name}:`, error);
    await logToolExecution(supabase, name, parsedArgs, 'failed', null, error.message || 'Tool execution failed');
    return { success: false, error: error.message || 'Tool execution failed' };
  }
}



serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory, userContext, miningStats, systemVersion, session_credentials } = await req.json();
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // Check if Lovable AI Gateway is configured
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: '💳 Lovable AI Gateway is not configured. Please check your workspace settings.',
          needsCredentials: true
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Using Lovable AI Gateway (google/gemini-2.5-flash)');
    
    const aiProvider = 'lovable_gateway';
    const aiModel = 'google/gemini-2.5-flash';
    const aiExecutive = 'lovable-chat';
    const aiExecutiveTitle = 'Chief Strategy Officer (CSO)';

    console.log(`🎯 ${aiExecutiveTitle} - Processing request`);
    
    // Extract user input for multi-step detection
    const userInput = messages[messages.length - 1]?.content || '';
    
    // ========== PHASE 1: EXPANDED MULTI-STEP DETECTION ==========
    // Check if this is a complex multi-step task that should run in background
    const isMultiStepTask = /analyze.*and.*(create|build|implement)|multi[- ]?step|coordinate|orchestrate|plan.*and.*execute|research.*and.*summarize|compare.*across|integrate.*data|build.*workflow|complex.*analysis|autonomous.*task/i.test(userInput);
    
    // Semantic detection - tasks that require data aggregation from multiple sources
    const requiresAggregation = /list.*agents|show.*status|agent.*performance|system.*health|knowledge.*search|find.*all|get.*overview|analyze.*current|all.*tasks|view.*all|show.*all/i.test(userInput);
    
    // Check if this needs enrichment beyond raw data
    const needsEnrichment = /with.*details|comprehensive|full.*report|complete.*picture|status.*and|including|detailed|in-depth/i.test(userInput);
    
    // Check if user wants insights, not just data
    const needsInsights = /why|how.*performing|suggest|recommend|optimize|improve|analysis|trends|predict|forecast/i.test(userInput);
    
    const shouldOrchestrate = isMultiStepTask || requiresAggregation || needsEnrichment || needsInsights;
    
    // Workflow templates for common scenarios
    const workflowTemplates: Record<string, any> = {
      'agent_overview': {
        workflow_name: 'Comprehensive Agent Status Report',
        description: 'Complete analysis of all deployed agents with performance metrics and recommendations',
        steps: [
          { 
            name: 'Fetch All Agents', 
            description: 'Get complete agent roster',
            type: 'api_call',
            function: 'agent-manager',
            body: { action: 'list_agents' }
          },
          { 
            name: 'Get Agent Workloads', 
            description: 'Fetch task assignments for each agent',
            type: 'api_call',
            function: 'agent-manager',
            body: { action: 'get_agent_workload' }
          },
          { 
            name: 'Fetch Recent Activity', 
            description: 'Get agent activity from logs',
            type: 'data_fetch',
            table: 'eliza_activity_log',
            select: 'title, description, created_at, metadata',
            limit: 50
          },
          { 
            name: 'Analyze Performance', 
            description: 'AI synthesis of agent health and recommendations',
            type: 'ai_analysis',
            prompt: 'Analyze the agent roster, workloads, and recent activity. Provide: 1) Status summary, 2) Performance insights, 3) Workload balance analysis, 4) Specific recommendations for optimization'
          }
        ],
        estimated_duration: '2-3 minutes'
      },
      'system_diagnostics': {
        workflow_name: 'Full System Health Check',
        description: 'Comprehensive diagnostic scan of all ecosystem components',
        steps: [
          { 
            name: 'Run System Diagnostics', 
            description: 'Execute diagnostic scan',
            type: 'api_call',
            function: 'system-diagnostics'
          },
          { 
            name: 'Fetch Agent Status', 
            description: 'Get all agent health',
            type: 'api_call',
            function: 'agent-manager',
            body: { action: 'list_agents' }
          },
          { 
            name: 'Fetch Recent Logs', 
            description: 'Get error and warning logs',
            type: 'data_fetch',
            table: 'eliza_activity_log',
            select: '*',
            limit: 100
          },
          { 
            name: 'Health Analysis', 
            description: 'Synthesize system health report',
            type: 'ai_analysis',
            prompt: 'Review diagnostics, agent status, and logs. Identify: 1) Critical issues, 2) Warnings, 3) System health score, 4) Immediate action items'
          }
        ],
        estimated_duration: '3-4 minutes'
      },
      'task_overview': {
        workflow_name: 'Task Pipeline Analysis',
        description: 'Complete view of all tasks with blocking issues and recommendations',
        steps: [
          { 
            name: 'List All Tasks', 
            description: 'Fetch complete task list',
            type: 'api_call',
            function: 'agent-manager',
            body: { action: 'list_tasks' }
          },
          { 
            name: 'Identify Blockers', 
            description: 'Detect blocking issues',
            type: 'api_call',
            function: 'task-orchestrator',
            body: { action: 'identify_blockers' }
          },
          { 
            name: 'Workload Analysis', 
            description: 'Get workload distribution',
            type: 'api_call',
            function: 'agent-manager',
            body: { action: 'get_agent_workload' }
          },
          { 
            name: 'Analyze Bottlenecks', 
            description: 'AI analysis of task blockers and workload',
            type: 'ai_analysis',
            prompt: 'Analyze all tasks, identified blockers, and agent workloads. Provide: 1) Key bottlenecks, 2) Resource constraints, 3) Recommendations to improve throughput'
          }
        ],
        estimated_duration: '2-3 minutes'
      }
    };
    
    // Select a workflow if user input matches a template trigger
    let selectedWorkflow: any = null;
    if (shouldOrchestrate) {
      if (/agent.*(status|overview)/i.test(userInput)) {
        selectedWorkflow = workflowTemplates['agent_overview'];
      } else if (/system.*(health|diagnostic)/i.test(userInput)) {
        selectedWorkflow = workflowTemplates['system_diagnostics'];
      } else if (/task.*(overview|pipeline|blocker)/i.test(userInput)) {
        selectedWorkflow = workflowTemplates['task_overview'];
      }
    }

    if (selectedWorkflow) {
      console.log(`🚀 Auto-Orchestration Triggered: ${selectedWorkflow.workflow_name}`);
      
      // Use Supabase client to invoke the orchestrator function
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      
      try {
        const orchestratorResult = await supabase.functions.invoke('multi-step-orchestrator', {
          body: {
            workflow: selectedWorkflow,
            userInput,
            context: {
              conversationHistory,
              userContext,
              miningStats
            }
          }
        });
        
        if (!orchestratorResult.error && orchestratorResult.data) {
          const orchestratorData = orchestratorResult.data;
          const workflowId = orchestratorData?.workflow_id || 'background_task';
          console.log('✅ Workflow auto-triggered:', workflowId);
          
          return new Response(JSON.stringify({
            success: true,
            response: `🎬 **${selectedWorkflow.workflow_name}**\n\n${selectedWorkflow.description}\n\n**Executing ${selectedWorkflow.steps.length} steps:**\n${selectedWorkflow.steps.map((s: any, i: number) => `${i + 1}. ${s.name} - ${s.description}`).join('\n')}\n\n⏱️ Estimated time: ${selectedWorkflow.estimated_duration}\n\n✅ Running in background - check **Task Pipeline Visualizer** for live progress. You can continue chatting while I complete this analysis.`,
            hasToolCalls: false,
            workflow_id: workflowId,
            background_task: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (orchError) {
        console.warn('⚠️ Auto-orchestration failed, continuing with AI design:', orchError);
      }
    }
    
    // ========== PHASE 2: DIRECT CHAT OR AI DESIGN ==========
    const lastMessage = messages[messages.length - 1];
    const isDesignTask = lastMessage.content.toLowerCase().includes('#design');
    
    if (isDesignTask) {
      console.log('🎨 AI Design Task Detected');
      
      // Use Supabase client to invoke the design function
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      
      try {
        const designResult = await supabase.functions.invoke('design-agent', {
          body: { messages, conversationHistory, userContext }
        });
        
        if (!designResult.error && designResult.data) {
          return new Response(JSON.stringify({
            success: true,
            response: designResult.data.response,
            hasToolCalls: false
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (designError) {
        console.error('Design agent invocation failed:', designError);
        return new Response(JSON.stringify({ success: false, error: 'Design agent failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Default to direct chat if no special task detected
    console.log('💬 Direct Chat - No special task detected');

    const systemPrompt = generateElizaSystemPrompt(userContext, miningStats, systemVersion, aiExecutive, aiExecutiveTitle);
    
    // Create Supabase client for tool execution
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    let currentMessages = [ { role: 'system', content: systemPrompt }, ...messages ];
    let toolIterations = 0;
    const MAX_TOOL_ITERATIONS = 5;
    const executedToolCalls: Array<{
      id: string;
      function_name: string;
      status: 'success' | 'failed' | 'pending';
      arguments: any;
      result_preview?: string;
      execution_time_ms?: number;
    }> = [];
    
    while (toolIterations < MAX_TOOL_ITERATIONS) {
      toolIterations++;
      console.log(`🔄 AI iteration ${toolIterations} using ${aiProvider}`);
      
      let message: any;
      
      if (aiProvider === 'lovable_gateway') {
        // Use Lovable AI Gateway with REAL tool calling support
        try {
          console.log(`📡 Calling Lovable AI Gateway with ${ELIZA_TOOLS.length} tools available`);
          
          // Convert messages (excluding system prompt since it's passed separately)
          const messagesForGateway = currentMessages.filter(m => m.role !== 'system');
          const systemPrompt = currentMessages.find(m => m.role === 'system')?.content || '';
          
          // ✅ CRITICAL FIX: Pass tools to enable REAL execution
          message = await callLovableAIGateway(messagesForGateway, {
            model: 'google/gemini-2.5-flash',
            systemPrompt,
            temperature: 0.7,
            max_tokens: 4000,
            tools: ELIZA_TOOLS // Enable native tool calling
          });
          
          // Gateway now returns full message object with tool_calls array
          console.log(`🔧 Gateway returned ${message.tool_calls?.length || 0} tool calls`);
          
        } catch (error) {
          console.error('❌ Lovable AI Gateway error:', error);
          
          // Check for rate limit or payment errors
          if (error.message?.includes('429')) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Rate limit exceeded. Please wait and try again.',
              provider: 'lovable_gateway'
            }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          if (error.message?.includes('402')) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Payment required. Please add credits to your Lovable AI workspace.',
              provider: 'lovable_gateway'
            }), {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Lovable AI Gateway error: ${error.message}`,
            provider: 'lovable_gateway'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
      } else if (aiProvider === 'openai') {
        // OpenAI fallback
        const apiUrl = 'https://api.openai.com/v1/chat/completions';
        const openaiKey = getAICredential('openai', session_credentials);
        
        const requestBody = {
          model: aiModel,
          messages: currentMessages,
          tools: ELIZA_TOOLS,
          tool_choice: 'auto',
          stream: false,
        };
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        };
        
        console.log(`📡 Calling OpenAI API with ${ELIZA_TOOLS.length} tools available`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`❌ OpenAI API call failed:`, response.status, errorBody);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `OpenAI API call failed: ${errorBody}`,
            provider: 'openai'
          }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        message = choice?.message;
        
        if (!message) {
          console.error("No message in OpenAI response");
          return new Response(JSON.stringify({ success: false, error: 'Invalid OpenAI response' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
      } else {
        console.error(`❌ Unknown AI provider: ${aiProvider}`);
        return new Response(JSON.stringify({ success: false, error: `Unknown AI provider: ${aiProvider}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Add assistant message to conversation
      currentMessages.push(message);
      
      // Check if AI wants to call tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`🔧 AI requested ${message.tool_calls.length} tool calls`);
        
        // Execute all tool calls
        for (const toolCall of message.tool_calls) {
          const startTime = Date.now();
          await logToolExecution(supabase, toolCall.function.name, toolCall.function.arguments, 'started');
          
          const toolResult = await executeToolCall(supabase, toolCall, SUPABASE_URL, SERVICE_ROLE_KEY);
          const executionTime = Date.now() - startTime;
          
          // Track executed tool call for response
          executedToolCalls.push({
            id: toolCall.id,
            function_name: toolCall.function.name,
            status: toolResult.success ? 'success' : 'failed',
            arguments: typeof toolCall.function.arguments === 'string' 
              ? JSON.parse(toolCall.function.arguments) 
              : toolCall.function.arguments,
            result_preview: JSON.stringify(toolResult.result || toolResult).substring(0, 200),
            execution_time_ms: executionTime
          });
          
          await logToolExecution(
            supabase, 
            toolCall.function.name, 
            toolCall.function.arguments, 
            toolResult.success ? 'completed' : 'failed',
            toolResult.result,
            toolResult.error
          );
          
          // Log successful tool executions to activity log for user visibility
          if (toolResult.success) {
            await supabase.from('eliza_activity_log').insert({
              activity_type: 'tool_execution_success',
              title: `✅ ${toolCall.function.name} completed`,
              description: `Successfully executed ${toolCall.function.name}`,
              metadata: { 
                tool: toolCall.function.name,
                args: JSON.parse(toolCall.function.arguments),
                result_preview: JSON.stringify(toolResult.result || toolResult).substring(0, 500)
              },
              status: 'completed'
            });
          }
          
          // Add tool result to conversation
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(toolResult)
          });
        }
        
        // Continue loop to get AI's response after tool execution
        continue;
      }
      
      // No more tool calls - check for rule violations before returning
      const content = message.content || '';
      
      // Detect if response contains code blocks (violation of rules)
      if (content.includes('```python') || content.includes('```js') || content.includes('```javascript')) {
        console.warn('⚠️ [RULE VIOLATION] Eliza wrote code in chat instead of using execute_python tool!');
        console.warn('📋 [VIOLATION CONTENT]:', content.substring(0, 200));
        
        // Log to activity table for debugging
        await supabase.from('eliza_activity_log').insert({
          activity_type: 'rule_violation',
          title: 'Code in Chat Instead of Tool Usage',
          description: 'Eliza wrote code blocks in chat instead of calling execute_python tool',
          metadata: { content_preview: content.substring(0, 500) },
          status: 'failed'
        });
      }
      
      console.log(`✅ Final response ready after ${toolIterations} iterations`);
      
      // Ensure response is always a string, never an object
      const responseContent = message.content 
        || (message.tool_calls?.length ? '⚙️ Processing tools...' : '')
        || (typeof message === 'string' ? message : '')
        || 'No response generated';
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          response: responseContent, 
          provider: aiProvider, 
          executive: aiExecutive, 
          executiveTitle: aiExecutiveTitle,
          toolIterations,
          tool_calls: executedToolCalls,
          hasToolCalls: executedToolCalls.length > 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Max iterations reached
    console.warn(`⚠️ Max tool iterations (${MAX_TOOL_ITERATIONS}) reached`);
    const finalMessage = currentMessages[currentMessages.length - 1];
    const lastContent = finalMessage?.content 
      || (typeof finalMessage === 'string' ? finalMessage : '')
      || 'Max iterations reached';
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        response: lastContent, 
        provider: aiProvider,
        warning: 'Max tool iterations reached',
        tool_calls: executedToolCalls,
        hasToolCalls: executedToolCalls.length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Main error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
