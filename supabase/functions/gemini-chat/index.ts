import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { generateElizaSystemPrompt } from '../_shared/elizaSystemPrompt.ts';
import { ELIZA_TOOLS } from '../_shared/elizaTools.ts';
import { buildContextualPrompt } from '../_shared/contextBuilder.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client for logging Eliza's activities
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory, userContext, miningStats, systemVersion, session_credentials } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    console.log("🤖 Gemini Chat - Processing request with context:", {
      messagesCount: messages?.length,
      hasHistory: !!conversationHistory,
      hasMiningStats: !!miningStats,
      hasSystemVersion: !!systemVersion,
      userContext: userContext
    });

    // Build system prompt using shared utilities
    const basePrompt = generateElizaSystemPrompt();
    const systemPrompt = buildContextualPrompt(basePrompt, {
      conversationHistory,
      userContext,
      miningStats,
      systemVersion
    });

    // Prepare messages for Gemini
    const geminiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    console.log("📤 Calling Lovable AI Gateway with Gemini Flash...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: geminiMessages,
        temperature: 0.9,
        max_tokens: 8000,
        tools: ELIZA_TOOLS,
        tool_choice: 'auto'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Rate limit exceeded. Please try again in a moment." 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "AI credits depleted. Please add funds to your Lovable workspace." 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    console.log("✅ Gemini response:", { 
      hasContent: !!message?.content,
      hasToolCalls: !!message?.tool_calls,
      toolCallsCount: message?.tool_calls?.length || 0
    });

    // Execute tool calls with multi-step workflow support
    if (message?.tool_calls && message.tool_calls.length > 0) {
      console.log("🔧 Starting multi-step workflow with", message.tool_calls.length, "initial tool calls");
      
      let currentMessages = [...geminiMessages];
      let workflowComplete = false;
      let workflowStep = 0;
      const MAX_WORKFLOW_STEPS = 50;
      let consecutiveDuplicates = 0; // Track consecutive duplicate attempts
      const MAX_CONSECUTIVE_DUPLICATES = 3; // Break after 3 duplicate attempts
      
      while (!workflowComplete && workflowStep < MAX_WORKFLOW_STEPS) {
        workflowStep++;
        console.log(`\n📊 Workflow Step ${workflowStep}/${MAX_WORKFLOW_STEPS}`);
        
        // Get current tool calls from the latest message
        const currentToolCalls = message?.tool_calls;
        if (!currentToolCalls || currentToolCalls.length === 0) {
          workflowComplete = true;
          break;
        }
        
        console.log(`🔧 Executing ${currentToolCalls.length} tool(s) in this step`);
        
        // Execute the tools
        const toolResults = await executeToolCalls(
          currentToolCalls,
          supabase,
          executedToolSignatures,
          conversationHistory
        );
        
        // Check if all tools were duplicates (circuit breaker)
        const allDuplicates = toolResults.every(r => r.note?.includes("cached result"));
        if (allDuplicates) {
          consecutiveDuplicates++;
          console.warn(`⚠️ All tools were duplicates (${consecutiveDuplicates}/${MAX_CONSECUTIVE_DUPLICATES})`);
          
          if (consecutiveDuplicates >= MAX_CONSECUTIVE_DUPLICATES) {
            console.error("🛑 Circuit breaker: Too many consecutive duplicate calls - forcing completion");
            currentMessages.push({
              role: "assistant",
              content: "I've gathered all the necessary information. Let me provide you with a summary based on the data I've collected."
            });
            workflowComplete = true;
            break;
          }
        } else {
          consecutiveDuplicates = 0; // Reset counter on successful execution
        }
        
        // Format tool results for Gemini
        const toolResponseMessages = currentToolCalls.map((toolCall: any, idx: number) => ({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResults[idx])
        }));
        
        // Add tool calls and responses to message history
        currentMessages.push({
          role: "assistant",
          content: message.content || "",
          tool_calls: currentToolCalls
        });
        currentMessages.push(...toolResponseMessages);
        
        console.log("📤 Sending tool results back to Gemini for analysis and next steps...");
        
        // Send updated messages back to Gemini
        const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: currentMessages,
            temperature: 0.9,
            max_tokens: 8000,
            tools: [
              {
                type: 'function',
                function: {
                  name: 'execute_python',
                  description: 'Execute Python code for data analysis, calculations, or processing. User will see execution in PythonShell. CRITICAL: The "requests" module is NOT available. For HTTP calls, use urllib.request from the standard library instead. Example: import urllib.request; urllib.request.urlopen(url). Or better yet, use the call_edge_function tool directly.',
                  parameters: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', description: 'The Python code to execute. DO NOT import requests - use urllib.request instead or use call_edge_function tool' },
                      purpose: { type: 'string', description: 'Brief description of what this code does' }
                    },
                    required: ['code', 'purpose']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'call_edge_function',
                  description: 'Call a Supabase edge function directly. Use this for API calls instead of Python requests. Returns the function response.',
                  parameters: {
                    type: 'object',
                    properties: {
                      function_name: { type: 'string', description: 'Edge function name (e.g., github-integration, mining-proxy)' },
                      body: { type: 'object', description: 'Request body to send to the function' },
                      purpose: { type: 'string', description: 'What this call is for' }
                    },
                    required: ['function_name', 'body']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'list_agents',
                  description: 'Get all existing agents and their IDs/status. ALWAYS call this BEFORE assigning tasks to know agent IDs.',
                  parameters: {
                    type: 'object',
                    properties: {}
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'assign_task',
                  description: 'Assign a task to a specific agent. ALWAYS call list_agents first to get current agent IDs.',
                  parameters: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', description: 'Clear, specific task title (e.g., "Audit wallet security")' },
                      description: { type: 'string', description: 'Detailed requirements, acceptance criteria, and technical approach' },
                      repo: { type: 'string', description: 'Repository name (default: xmrt-ecosystem)' },
                      category: { type: 'string', description: 'Task category (e.g., security, blockchain, infrastructure)' },
                      stage: { type: 'string', description: 'Current stage (PLANNING, DEVELOPMENT, TESTING, REVIEW, DEPLOYMENT)' },
                      assignee_agent_id: { type: 'string', description: 'Agent UUID from list_agents call' },
                      priority: { type: 'number', description: 'Priority level 1-10 (10 = critical)' }
                    },
                    required: ['title', 'description', 'assignee_agent_id']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'update_agent_status',
                  description: 'Update agent status. Valid statuses: IDLE, BUSY, WORKING, COMPLETED, ERROR',
                  parameters: {
                    type: 'object',
                    properties: {
                      agent_id: { type: 'string', description: 'Agent UUID' },
                      status: { type: 'string', description: 'New status (IDLE, BUSY, WORKING, COMPLETED, ERROR)' }
                    },
                    required: ['agent_id', 'status']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'update_task_status',
                  description: 'Update task status and stage',
                  parameters: {
                    type: 'object',
                    properties: {
                      task_id: { type: 'string', description: 'Task UUID' },
                      status: { type: 'string', description: 'PENDING, IN_PROGRESS, BLOCKED, COMPLETED, FAILED' },
                      stage: { type: 'string', description: 'PLANNING, DEVELOPMENT, TESTING, REVIEW, DEPLOYMENT' }
                    },
                    required: ['task_id', 'status']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'list_tasks',
                  description: 'Get all tasks with optional filters',
                  parameters: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', description: 'Filter by status (PENDING, IN_PROGRESS, etc.)' },
                      agent_id: { type: 'string', description: 'Filter by assigned agent' }
                    }
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'check_system_status',
                  description: 'Get comprehensive system health status including database, agents, tasks, mining, and services. Use this for diagnostics and status reports.',
                  parameters: {
                    type: 'object',
                    properties: {}
                  }
                }
              }
            ]
          }),
        });
        
        if (!followUpResponse.ok) {
          const errorText = await followUpResponse.text();
          console.error("❌ Gemini follow-up API error:", followUpResponse.status, errorText);
          throw new Error(`Gemini API error: ${followUpResponse.status} - ${errorText}`);
        }
        
        const followUpData = await followUpResponse.json();
        message = followUpData.choices[0].message;
        
        // Check if Gemini wants to make more tool calls or is done
        if (!message?.tool_calls || message.tool_calls.length === 0) {
          console.log("✅ Workflow complete - no more tool calls needed");
          workflowComplete = true;
        } else {
          console.log(`🔄 Continuing workflow - Gemini requested ${message.tool_calls.length} more tool call(s)`);
        }
      }
      
      if (workflowStep >= MAX_WORKFLOW_STEPS) {
        console.warn("⚠️ Workflow reached maximum steps limit - stopping here");
        
        // Collect all tool results from this workflow
        const allToolResults = Array.from(executedToolSignatures.entries()).map(([sig, result]) => {
          const [funcName] = sig.split(':');
          return `${funcName}: ${JSON.stringify(result).substring(0, 300)}`;
        }).join('\n');
        
        console.log("📊 All collected tool results:", allToolResults);
        
        // If we have successful tool results, use them to generate final response
        if (executedToolSignatures.size > 0) {
          // Force one final response from Gemini without tool calling
          try {
            const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  ...currentMessages,
                  { 
                    role: "system", 
                    content: `CRITICAL INSTRUCTION: You have ALREADY SUCCESSFULLY COLLECTED all the data you need. The tool executions are COMPLETE. Here are the results:

${allToolResults}

DO NOT say you are "retrieving", "gathering", "checking", or "waiting" for information. You ALREADY HAVE IT.
DO NOT make any more tool calls.
DO NOT say there are errors or failures if the data shows success: true.

Your task now is ONLY to present this information to the user in a clear, natural way. Act as if you just received this data and are now sharing it with them.

Example good response: "I've checked the agent status. Currently there are [number] agents in the system: [list key details]"
Example BAD response: "I am currently retrieving..." or "Let me check..." or "I'll gather that information..."

Respond NOW using the data shown above.` 
                  }
                ],
                temperature: 0.7,
                max_tokens: 1000,
                tool_choice: 'none'
              }),
            });
            
            if (finalResponse.ok) {
              const finalData = await finalResponse.json();
              const finalMessage = finalData.choices?.[0]?.message?.content;
              if (finalMessage) {
                console.log("✅ Final response generated from collected data");
                Object.assign(message, { content: finalMessage, tool_calls: [] });
              } else {
                console.warn("⚠️ Final API call succeeded but returned no content");
              }
            } else {
              console.error("❌ Final response API call failed:", finalResponse.status);
            }
          } catch (err) {
            console.error("❌ Error generating final response:", err);
          }
        }
      }
      
      // Return final response with content from Gemini or collected data
      let aiResponse = message?.content;
      
      // Check if Gemini is giving unhelpful responses despite having data
      const unhelpfulPhrases = [
        'currently retrieving',
        'gathering information',
        'let me check',
        'still waiting',
        'i\'ll look into',
        'checking on that'
      ];
      
      const hasUnhelpfulResponse = aiResponse && unhelpfulPhrases.some(phrase => 
        aiResponse!.toLowerCase().includes(phrase)
      );
      
      // If no content from Gemini, or if response is unhelpful despite having data, format tool results directly
      if ((!aiResponse || hasUnhelpfulResponse) && executedToolSignatures.size > 0) {
        if (hasUnhelpfulResponse) {
          console.log("⚠️ Gemini gave unhelpful response despite having data, formatting results directly");
        } else {
          console.log("📦 No final message from Gemini, formatting tool results directly");
        }
        
        const toolSummaries = Array.from(executedToolSignatures.entries()).map(([sig, result]) => {
          const [funcName, argsJson] = sig.split(':');
          
          // Handle list_agents tool
          if (funcName === 'list_agents' && result.success) {
            const agentCount = result.agents?.length || 0;
            const agents = result.agents || [];
            const idleCount = agents.filter((a: any) => a.status === 'IDLE').length;
            const busyCount = agents.filter((a: any) => a.status === 'BUSY').length;
            const workingCount = agents.filter((a: any) => a.status === 'WORKING').length;
            
            let summary = `I found ${agentCount} agent${agentCount !== 1 ? 's' : ''} in the system:\n`;
            summary += `• ${idleCount} idle\n`;
            summary += `• ${busyCount} busy\n`;
            summary += `• ${workingCount} working\n\n`;
            
            if (agents.length > 0) {
              summary += "Agents:\n";
              agents.forEach((agent: any) => {
                summary += `• ${agent.name} (${agent.status}): ${agent.role}\n`;
              });
            }
            
            return summary;
          }
          
          // Handle call_edge_function for agent-manager
          if (funcName === 'call_edge_function' && result.success) {
            const data = result.data?.data || result.data;
            const args = JSON.parse(argsJson || '{}');
            const functionName = args.function_name || 'unknown';
            
            // Check if this was a list_agents call
            if (Array.isArray(data) && data.length > 0 && data[0].name && data[0].role) {
              const agentCount = data.length;
              const idleCount = data.filter((a: any) => a.status === 'IDLE').length;
              const busyCount = data.filter((a: any) => a.status === 'BUSY').length;
              const workingCount = data.filter((a: any) => a.status === 'WORKING').length;
              
              let summary = `I found ${agentCount} agent${agentCount !== 1 ? 's' : ''} in the system:\n`;
              summary += `• ${idleCount} idle\n`;
              summary += `• ${busyCount} busy\n`;
              summary += `• ${workingCount} working\n\n`;
              
              if (data.length > 0) {
                summary += "Agents:\n";
                data.forEach((agent: any) => {
                  summary += `• ${agent.name} (${agent.status}): ${agent.role}\n`;
                });
              }
              
              return summary;
            }
            
            // Format mining-proxy results
            if (functionName === 'mining-proxy' && data.success) {
              const stats = data.stats || {};
              let summary = `📊 Mining Statistics:\n\n`;
              summary += `💰 Balance: ${stats.amtDue ? (stats.amtDue / 1000000000000).toFixed(4) + ' XMR' : 'N/A'}\n`;
              summary += `⚡ Hash Rate: ${stats.hash || 'N/A'}\n`;
              summary += `🔄 Valid Shares: ${stats.validShares || 'N/A'}\n`;
              summary += `❌ Invalid Shares: ${stats.invalidShares || 'N/A'}\n`;
              if (stats.lastShare) {
                summary += `⏰ Last Share: ${new Date(stats.lastShare * 1000).toLocaleString()}\n`;
              }
              return summary;
            }
            
            // Format render-api results
            if (functionName === 'render-api' && data.success) {
              const service = data.service || {};
              let summary = `🚀 Render Service Status:\n\n`;
              summary += `📝 Name: ${service.name || 'N/A'}\n`;
              summary += `🔧 Type: ${service.type || 'N/A'}\n`;
              summary += `✅ State: ${service.state || 'N/A'}\n`;
              summary += `🌿 Branch: ${service.branch || 'N/A'}\n`;
              summary += `📅 Created: ${service.createdAt ? new Date(service.createdAt).toLocaleString() : 'N/A'}\n`;
              if (service.serviceDetails?.url) {
                summary += `🔗 URL: ${service.serviceDetails.url}\n`;
              }
              return summary;
            }
            
            // Format system-diagnostics results
            if (functionName === 'system-diagnostics' && data.success) {
              const diag = data.diagnostics || {};
              let summary = `🖥️ System Diagnostics:\n\n`;
              summary += `🔧 OS: ${diag.system?.os || 'N/A'}\n`;
              summary += `🏗️ Architecture: ${diag.system?.arch || 'N/A'}\n`;
              summary += `📊 Memory (RSS): ${diag.memory?.rss || 'N/A'}\n`;
              summary += `💾 Heap Used: ${diag.memory?.heap_used || 'N/A'}\n`;
              summary += `🌐 Hostname: ${diag.environment?.hostname || 'N/A'}\n`;
              return summary;
            }
            
            // Generic edge function success with data preview
            if (data && typeof data === 'object') {
              const dataStr = JSON.stringify(data, null, 2);
              if (dataStr.length > 300) {
                return `✅ ${functionName} completed:\n${dataStr.substring(0, 300)}...\n[Response truncated]`;
              }
              return `✅ ${functionName} completed:\n${dataStr}`;
            }
            
            return `✅ ${functionName} completed successfully`;
          }
          
          // Handle execute_python results
          if (funcName === 'execute_python' && result.success) {
            const data = result.data;
            const args = JSON.parse(argsJson || '{}');
            const purpose = args.purpose || 'Python execution';
            
            let summary = `🐍 ${purpose}:\n`;
            if (data?.output) {
              const output = data.output.trim();
              if (output.length > 500) {
                summary += `${output.substring(0, 500)}...\n[Output truncated]`;
              } else {
                summary += output;
              }
            }
            if (data?.error && data.error.trim()) {
              summary += `\n⚠️ Errors: ${data.error.trim()}`;
            }
            return summary;
          }
          
          return result.success ? `✅ ${funcName} completed successfully` : `❌ ${funcName} failed: ${result.error}`;
        }).join('\n\n');
        
        aiResponse = toolSummaries || "Tasks completed.";
      }
      
      // Final fallback
      if (!aiResponse) {
        aiResponse = "I've completed all the requested tasks.";
      }
      
      console.log("📤 Sending final response to chat:", aiResponse.substring(0, 100) + "...");
      
      return new Response(
        JSON.stringify({ success: true, response: aiResponse, hasToolCalls: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no tool calls, just return the conversational content directly
    const aiResponse = message?.content || "I'm here to help with XMRT-DAO tasks.";

    return new Response(
      JSON.stringify({ success: true, response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Gemini chat error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Track tool calls executed in this workflow to prevent duplicates
const executedToolSignatures = new Map<string, any>();

// Execute tool calls with automatic retry on failure
async function executeToolCallsWithRetry(
  toolCalls: any[], 
  supabase: any, 
  lovableApiKey: string,
  conversationHistory: any[],
  maxRetries: number = 2
) {
  const results = [];
  
  for (const toolCall of toolCalls) {
    // Create a signature for this tool call to detect duplicates
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);
    const toolSignature = `${functionName}:${JSON.stringify(args)}`;
    
    // Check if this exact tool call was already executed in this workflow
    if (executedToolSignatures.has(toolSignature)) {
      console.warn(`⚠️ Skipping duplicate tool call: ${functionName}`);
      const cachedResult = executedToolSignatures.get(toolSignature);
      results.push({
        ...cachedResult,
        note: "Using cached result from previous execution in this workflow"
      });
      continue;
    }
    
    let retryCount = 0;
    let currentToolCall = toolCall;
    let lastError = null;
    
    while (retryCount <= maxRetries) {
      try {
        const functionName = currentToolCall.function.name;
        const args = JSON.parse(currentToolCall.function.arguments);
        
        console.log(`🔧 Executing tool (attempt ${retryCount + 1}/${maxRetries + 1}): ${functionName}`, args);
        
        const result = await executeSingleTool(functionName, args, supabase, session_credentials);
        
        // Cache successful results for this workflow
        if (result.success) {
          executedToolSignatures.set(toolSignature, result);
        }
        
        // Check if execution failed
        if (!result.success) {
          lastError = result.error || result.data?.error || 'Unknown error';
          console.error(`❌ Tool execution failed:`, lastError);
          
          // If we have retries left, ask Gemini to fix the code
          if (retryCount < maxRetries && functionName === 'execute_python') {
            console.log(`🔄 Asking Gemini to fix the error and retry...`);
            
            const errorOutput = result.data?.output || result.data?.error || lastError;
            const fixPrompt = `The Python code you provided failed with this error:

\`\`\`
${errorOutput}
\`\`\`

Original code:
\`\`\`python
${args.code}
\`\`\`

Please analyze the error and fix the code. CRITICAL RULES:
- The "requests" module is NOT available in this environment
- Use urllib.request from Python's standard library for HTTP calls instead
- Example: import urllib.request; import json; urllib.request.urlopen(urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'}))
- OR better yet, avoid Python for API calls and suggest using the call_edge_function tool instead
- Include proper error handling
`;

            const fixResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  ...conversationHistory,
                  { role: "user", content: fixPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1500,
                tools: [
                  {
                    type: 'function',
                    function: {
                      name: 'execute_python',
                      description: 'Execute corrected Python code',
                      parameters: {
                        type: 'object',
                        properties: {
                          code: { type: 'string' },
                          purpose: { type: 'string' }
                        },
                        required: ['code', 'purpose']
                      }
                    }
                  }
                ],
                tool_choice: { type: "function", function: { name: "execute_python" } }
              }),
            });
            
            if (fixResponse.ok) {
              const fixData = await fixResponse.json();
              const fixMessage = fixData.choices?.[0]?.message;
              
              if (fixMessage?.tool_calls && fixMessage.tool_calls.length > 0) {
                currentToolCall = fixMessage.tool_calls[0];
                retryCount++;
                console.log(`✅ Gemini provided fixed code, retrying...`);
                continue; // Retry with fixed code
              }
            }
          }
          
          // No more retries - if this was a Python execution, delegate to background agent
          if (functionName === 'execute_python' && !result.success) {
            console.log('🔧 Python execution failed after retries, delegating to background fixer agent');
            
            // Get the execution ID from the database (most recent failed execution)
            const { data: failedExec } = await supabase
              .from('eliza_python_executions')
              .select('id')
              .eq('exit_code', 1)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (failedExec) {
              // Trigger the autonomous code fixer in the background (don't await)
              supabase.functions.invoke('autonomous-code-fixer').then(() => {
                console.log('🤖 Background autonomous fixer started to fix Python code');
              }).catch((err: any) => {
                console.error('Failed to trigger autonomous code fixer:', err);
              });
              
              // Log that an agent is working on it
              await supabase.from('eliza_activity_log').insert({
                activity_type: 'python_fix_delegated',
                title: '🤖 Agent Assigned to Fix Python Code',
                description: `A background agent has been assigned to analyze and fix the failed Python execution. I'll notify you once it's resolved.`,
                status: 'in_progress',
                metadata: {
                  execution_id: failedExec.id,
                  error: lastError
                }
              });
            }
          }
          
          results.push(result);
          break;
        } else {
          // Success!
          console.log(`✅ Tool executed successfully`);
          results.push(result);
          break;
        }
      } catch (error) {
        console.error('❌ Tool execution error:', error);
        lastError = error.message;
        
        if (retryCount >= maxRetries) {
          results.push({ success: false, error: lastError });
          break;
        }
        
        retryCount++;
      }
    }
  }
  
  return results;
}

// Execute a single tool
async function executeSingleTool(functionName: string, args: any, supabase: any, session_credentials?: any) {

  let result;
  let activityType = functionName;
  let activityTitle = functionName;
  let activityDescription = '';
  
  if (functionName === 'execute_python') {
    activityType = 'python_execution';
    activityTitle = args.purpose || 'Python Code Execution';
    activityDescription = `Executing Python code: ${args.code.substring(0, 100)}${args.code.length > 100 ? '...' : ''}`;
    
    try {
      const { executePython } = await import('../_shared/gatekeeperClient.ts');
      const execResult = await executePython(args.code, args.purpose, 'gemini-chat');
      
      if (!execResult.success) {
        console.error('❌ Python execution failed:', execResult.error);
        result = {
          success: false, 
          error: execResult.error, 
          data: execResult.data,
          shouldUseFallback: true,
          fallbackQuery: `The Python code execution failed. Please use your own reasoning to answer: ${args.purpose || 'analyze the request'}`
        };
      } else if (execResult.data?.exitCode !== 0) {
        console.error('❌ Python execution had errors:', execResult.data?.output || execResult.data?.error);
        result = { success: false, error: 'Python execution failed', data: execResult.data };
      } else {
        console.log('✅ Python executed successfully');
        result = { success: true, data: execResult.data };
      }
    } catch (err: any) {
      console.error('❌ Exception in Python execution:', err);
      result = { 
        success: false, 
        error: err.message || 'Unknown error',
        shouldUseFallback: true,
        fallbackQuery: `The Python code execution failed. Please use your own reasoning to answer: ${args.purpose || 'analyze the request'}`
      };
    }
  } else if (functionName === 'call_edge_function') {
    activityType = 'edge_function_call';
    activityTitle = args.purpose || `Calling ${args.function_name}`;
    activityDescription = `Calling edge function: ${args.function_name}`;
    
    console.log(`📞 Calling edge function: ${args.function_name} with body:`, JSON.stringify(args.body).substring(0, 200));
    
    const { data, error } = await supabase.functions.invoke(args.function_name, {
      body: args.body
    });
    
    if (error) {
      console.error(`❌ Edge function ${args.function_name} failed with error:`, {
        message: error.message,
        context: error.context,
        data: data
      });
      
      // Provide detailed error information back to the AI
      const errorDetails = `Edge function '${args.function_name}' returned error: ${error.message}${data ? `. Response data: ${JSON.stringify(data).substring(0, 500)}` : ''}`;
      result = { success: false, error: errorDetails, data };
    } else {
      console.log(`✅ Edge function ${args.function_name} succeeded with response:`, JSON.stringify(data).substring(0, 200));
      result = { success: true, data };
    }
  } else if (functionName === 'list_agents') {
    activityType = 'agent_management';
    activityTitle = 'List All Agents';
    activityDescription = 'Retrieving current agent statuses and workloads';
    
    try {
      const { callAgentManager } = await import('../_shared/gatekeeperClient.ts');
      const agentResult = await callAgentManager('list_agents', {}, 'gemini-chat');
      
      if (!agentResult.success) {
        console.error('❌ List agents failed:', agentResult.error);
        // Return error but mark it for fallback handling
        result = { 
          success: false, 
          error: agentResult.error,
          shouldUseFallback: true,
          fallbackQuery: "List all agents in the XMRT-DAO ecosystem and their current status"
        };
      } else {
        const agents = agentResult.data?.data || [];
        console.log('📋 Agents listed:', agents);
        
        // Format agent data for better readability
        const formattedAgents = agents.map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          skills: agent.skills
        }));
        
        result = { 
          success: true, 
          agents: formattedAgents,
          summary: `Found ${agents.length} agents. ${agents.filter((a: any) => a.status === 'IDLE').length} idle, ${agents.filter((a: any) => a.status === 'BUSY').length} busy, ${agents.filter((a: any) => a.status === 'WORKING').length} working.`
        };
      }
    } catch (err: any) {
      console.error('❌ Exception calling list_agents:', err);
      result = { 
        success: false, 
        error: err.message || 'Unknown error',
        shouldUseFallback: true,
        fallbackQuery: "List all agents in the XMRT-DAO ecosystem and their current status"
      };
    }
  } else if (functionName === 'list_issues') {
    activityType = 'github_integration';
    activityTitle = `List GitHub Issues: ${args.repo || 'xmrt-ecosystem'}`;
    activityDescription = `Fetching issues from repository: ${args.repo || 'xmrt-ecosystem'}`;
    
    const { data, error } = await supabase.functions.invoke('github-integration', {
      body: { 
        action: 'list_issues',
        repo: args.repo || 'xmrt-ecosystem',
        session_credentials
      }
    });
    
    if (error) {
      console.error('❌ List issues failed:', error);
      result = { success: false, error: error.message };
    } else {
      console.log('📋 Issues listed:', data);
      result = { success: true, data };
    }
  } else if (functionName === 'spawn_agent') {
    activityType = 'agent_management';
    activityTitle = `Spawn Agent: ${args.name}`;
    activityDescription = `Creating new agent with role: ${args.role}`;
    
    const { callAgentManager } = await import('../_shared/gatekeeperClient.ts');
    const spawnResult = await callAgentManager('spawn_agent', {
      name: args.name,
      role: args.role,
      skills: args.skills
    }, 'gemini-chat');
    
    if (!spawnResult.success) {
      console.error('❌ Agent spawn failed:', spawnResult.error);
      result = { success: false, error: spawnResult.error };
    } else {
      console.log('✅ Agent spawned:', spawnResult.data);
      result = { success: true, data: spawnResult.data };
    }
  } else if (functionName === 'update_agent_status') {
    activityType = 'agent_management';
    activityTitle = 'Update Agent Status';
    activityDescription = `Changing agent ${args.agent_id} status to: ${args.status}`;
    
    const { callAgentManager } = await import('../_shared/gatekeeperClient.ts');
    const statusResult = await callAgentManager('update_agent_status', {
      agent_id: args.agent_id,
      status: args.status
    }, 'gemini-chat');
    
    if (!statusResult.success) {
      console.error('❌ Agent status update failed:', statusResult.error);
      result = { success: false, error: statusResult.error };
    } else {
      console.log('✅ Agent status updated:', statusResult.data);
      result = { success: true, data: statusResult.data };
    }
  } else if (functionName === 'assign_task') {
    activityType = 'task_assignment';
    activityTitle = `Assign Task: ${args.title}`;
    activityDescription = `Priority ${args.priority || 5}: ${args.description.substring(0, 100)}`;
    
    const { callAgentManager } = await import('../_shared/gatekeeperClient.ts');
    const assignResult = await callAgentManager('assign_task', {
      title: args.title,
      description: args.description,
      repo: args.repo,
      category: args.category,
      stage: args.stage,
      assignee_agent_id: args.assignee_agent_id,
      priority: args.priority || 5
    }, 'gemini-chat');
    
    if (!assignResult.success) {
      console.error('❌ Task assignment failed:', assignResult.error);
      
      // Check for foreign key constraint error (agent doesn't exist)
      const errorStr = assignResult.error || '';
      if (errorStr.includes('23503') || errorStr.includes('foreign key constraint') || errorStr.includes('not present in table')) {
        result = { 
          success: false, 
          error: `AGENT DOES NOT EXIST. Agent ID "${args.assignee_agent_id}" was not found. You must call list_agents() to get valid agent IDs, or spawn_agent() to create a new agent.`,
          agent_id: args.assignee_agent_id,
          suggestion: 'Call list_agents() first to see existing agents, or call spawn_agent() to create a new one.'
        };
      } else {
        result = { success: false, error: assignResult.error || 'Task assignment failed', data: assignResult.data };
      }
    } else {
      console.log('✅ Task assigned:', assignResult.data);
      result = { success: true, data: assignResult.data };
    }
  } else if (functionName === 'update_task_status') {
    activityType = 'task_assignment';
    activityTitle = 'Update Task Status';
    activityDescription = `Task ${args.task_id}: ${args.status} - ${args.stage}`;
    
    const { callAgentManager } = await import('../_shared/gatekeeperClient.ts');
    const statusResult = await callAgentManager('update_task_status', {
      task_id: args.task_id,
      status: args.status,
      stage: args.stage
    }, 'gemini-chat');
    
    if (!statusResult.success) {
      console.error('❌ Task status update failed:', statusResult.error);
      result = { success: false, error: statusResult.error };
    } else {
      console.log('✅ Task status updated:', statusResult.data);
      result = { success: true, data: statusResult.data };
    }
  } else if (functionName === 'list_tasks') {
    activityType = 'task_assignment';
    activityTitle = 'List All Tasks';
    activityDescription = 'Retrieving all task statuses and assignments';
    
    const { data, error } = await supabase.functions.invoke('agent-manager', {
      body: { 
        action: 'list_tasks',
        data: {}
      }
    });
    
    if (error) {
      console.error('❌ List tasks failed:', error);
      result = { success: false, error: error.message };
    } else {
      const tasks = data?.data || [];
      console.log('📋 Tasks listed:', tasks.length);
      
      // Format task data for better readability
      const formattedTasks = tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        stage: task.stage,
        assignee: task.assignee_agent_id,
        priority: task.priority,
        category: task.category
      }));
      
      const statusCounts = {
        PENDING: tasks.filter((t: any) => t.status === 'PENDING').length,
        IN_PROGRESS: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
        BLOCKED: tasks.filter((t: any) => t.status === 'BLOCKED').length,
        COMPLETED: tasks.filter((t: any) => t.status === 'COMPLETED').length,
        FAILED: tasks.filter((t: any) => t.status === 'FAILED').length
      };
      
      result = { 
        success: true, 
        tasks: formattedTasks,
        summary: `Total: ${tasks.length} tasks. Pending: ${statusCounts.PENDING}, In Progress: ${statusCounts.IN_PROGRESS}, Blocked: ${statusCounts.BLOCKED}, Completed: ${statusCounts.COMPLETED}, Failed: ${statusCounts.FAILED}`
      };
    }
  } else if (functionName === 'get_agent_workload') {
    activityType = 'agent_management';
    activityTitle = `Get Workload: ${args.agent_id}`;
    activityDescription = 'Checking agent workload and active tasks';
    
    const { callAgentManager } = await import('../_shared/gatekeeperClient.ts');
    const workloadResult = await callAgentManager('get_agent_workload', {
      agent_id: args.agent_id
    }, 'gemini-chat');
    
    if (!workloadResult.success) {
      console.error('❌ Get agent workload failed:', workloadResult.error);
      result = { success: false, error: workloadResult.error };
    } else {
      const workload = workloadResult.data?.data || {};
      console.log('📊 Agent workload:', workload);
      
      result = { 
        success: true, 
        agent_id: workload.agent_id,
        active_tasks: workload.active_tasks,
        tasks: workload.tasks,
        summary: `Agent ${workload.agent_id} has ${workload.active_tasks} active task(s)`
      };
    }
  } else if (functionName === 'delete_task') {
    activityType = 'task_assignment';
    activityTitle = 'Delete Task';
    activityDescription = `Deleting task ${args.task_id}: ${args.reason}`;
    
    const { callAgentManager } = await import('../_shared/gatekeeperClient.ts');
    const deleteResult = await callAgentManager('delete_task', {
      task_id: args.task_id,
      reason: args.reason
    }, 'gemini-chat');
    
    if (!deleteResult.success) {
      console.error('❌ Task deletion failed:', deleteResult.error);
      result = { success: false, error: deleteResult.error };
    } else {
      console.log('✅ Task deleted:', deleteResult.data);
      result = { success: true, data: deleteResult.data };
    }
  } else if (functionName === 'reassign_task') {
    activityType = 'task_assignment';
    activityTitle = 'Reassign Task';
    activityDescription = `Reassigning task ${args.task_id} to ${args.new_assignee_id}`;
    
    const { data, error } = await supabase.functions.invoke('agent-manager', {
      body: { 
        action: 'reassign_task',
        data: {
          task_id: args.task_id,
          new_assignee_id: args.new_assignee_id,
          reason: args.reason
        }
      }
    });
    
    if (error) {
      console.error('❌ Task reassignment failed:', error);
      
      // Check for foreign key constraint error
      const errorStr = JSON.stringify(error);
      if (errorStr.includes('23503') || errorStr.includes('foreign key constraint') || errorStr.includes('not present in table')) {
        result = { 
          success: false, 
          error: `AGENT DOES NOT EXIST. Agent ID "${args.new_assignee_id}" was not found. You must first call list_agents() to get valid agent IDs. Never use made-up agent IDs.`,
          agent_id: args.new_assignee_id,
          suggestion: 'Call list_agents() first to see existing agents'
        };
      } else {
        result = { success: false, error: error.message };
      }
    } else {
      console.log('✅ Task reassigned:', data);
      result = { success: true, data };
    }
  } else if (functionName === 'update_task_details') {
    activityType = 'task_assignment';
    activityTitle = 'Update Task Details';
    activityDescription = `Updating details for task ${args.task_id}`;
    
    const { data, error } = await supabase.functions.invoke('agent-manager', {
      body: { 
        action: 'update_task_details',
        data: args
      }
    });
    
    if (error) {
      console.error('❌ Task update failed:', error);
      result = { success: false, error: error.message };
    } else {
      console.log('✅ Task details updated:', data);
      result = { success: true, data };
    }
  } else if (functionName === 'mark_task_complete') {
    activityType = 'task_assignment';
    activityTitle = 'Mark Task Complete';
    activityDescription = `Completing task ${args.task_id}`;
    
    const { data, error } = await supabase.functions.invoke('agent-manager', {
      body: { 
        action: 'update_task_status',
        data: {
          task_id: args.task_id,
          status: 'COMPLETED',
          stage: 'completed',
          completion_notes: args.completion_notes
        }
      }
    });
    
    if (error) {
      console.error('❌ Mark task complete failed:', error);
      result = { success: false, error: error.message };
    } else {
      console.log('✅ Task marked complete:', data);
      result = { success: true, data };
    }
  } else if (functionName === 'get_task_details') {
    activityType = 'task_assignment';
    activityTitle = 'Get Task Details';
    activityDescription = `Fetching details for task ${args.task_id}`;
    
    const { data, error } = await supabase.functions.invoke('agent-manager', {
      body: { 
        action: 'get_task_details',
        data: {
          task_id: args.task_id
        }
      }
    });
    
    if (error) {
      console.error('❌ Get task details failed:', error);
      result = { success: false, error: error.message };
    } else {
      console.log('📋 Task details:', data);
      result = { success: true, task: data?.data };
    }
  } else if (functionName === 'report_progress') {
    activityType = 'progress_report';
    activityTitle = `Progress Report: ${args.agent_name}`;
    activityDescription = args.progress_message;
    
    const { data, error } = await supabase.functions.invoke('agent-manager', {
      body: { 
        action: 'report_progress',
        data: args
      }
    });
    
    if (error) {
      console.error('❌ Report progress failed:', error);
      result = { success: false, error: error.message };
    } else {
      console.log('📊 Progress reported:', data);
      result = { success: true, data };
    }
  } else if (functionName === 'request_task_assignment') {
    activityType = 'task_assignment';
    activityTitle = `Request Assignment: ${args.agent_name}`;
    activityDescription = 'Requesting next available task';
    
    const { callAgentManager } = await import('../_shared/gatekeeperClient.ts');
    const assignmentResult = await callAgentManager('request_assignment', args, 'gemini-chat');
    
    if (!assignmentResult.success) {
      console.error('❌ Request assignment failed:', assignmentResult.error);
      result = { success: false, error: assignmentResult.error };
    } else {
      console.log('📋 Assignment result:', assignmentResult.data);
      result = { success: true, data: assignmentResult.data?.data };
    }
  } else if (functionName === 'log_decision') {
    activityType = 'decision_log';
    activityTitle = 'Log Decision';
    activityDescription = args.decision;
    
    const { callAgentManager } = await import('../_shared/gatekeeperClient.ts');
    const decisionResult = await callAgentManager('log_decision', {
      agent_id: args.agent_id || 'eliza',
      decision: args.decision,
      rationale: args.rationale
    }, 'gemini-chat');
    
    if (!decisionResult.success) {
      console.error('❌ Log decision failed:', decisionResult.error);
      result = { success: false, error: decisionResult.error };
    } else {
      console.log('📝 Decision logged:', decisionResult.data);
      result = { success: true, data: decisionResult.data };
    }
  } else if (functionName === 'cleanup_duplicate_tasks') {
    activityType = 'system_maintenance';
    activityTitle = 'Clean Up Duplicate Tasks';
    activityDescription = 'Removing duplicate task entries from database';
    
    const { data, error } = await supabase.functions.invoke('cleanup-duplicate-tasks', {
      body: {}
    });
    
    if (error) {
      console.error('❌ Cleanup failed:', error);
      result = { success: false, error: error.message };
    } else {
      console.log('🧹 Cleanup complete:', data);
      result = { success: true, data };
    }
  } else if (functionName === 'check_system_status') {
    activityType = 'system_diagnostics';
    activityTitle = '🔍 Comprehensive System Health Check';
    activityDescription = 'Checking all system components: database, agents, tasks, mining, and Render service';
    
    console.log('🔍 Running comprehensive system status check...');
    
    const { data, error } = await supabase.functions.invoke('system-status', {
      body: {}
    });
    
    if (error) {
      console.error('❌ System status check failed:', error);
      result = { success: false, error: error.message };
    } else {
      console.log('✅ System status check complete:', data);
      result = { success: true, status: data.status };
    }
  } else if (functionName === 'cleanup_duplicate_agents') {
    activityType = 'system_maintenance';
    activityTitle = 'Clean Up Duplicate Agents';
    activityDescription = 'Removing duplicate agent entries from database';
    
    const { callAgentManager } = await import('../_shared/gatekeeperClient.ts');
    const cleanupResult = await callAgentManager('cleanup_duplicate_agents', {}, 'gemini-chat');
    
    if (!cleanupResult.success) {
      console.error('❌ Agent cleanup failed:', cleanupResult.error);
      result = { success: false, error: cleanupResult.error };
    } else {
      console.log('🧹 Agent cleanup complete:', cleanupResult.data);
      result = { success: true, data: cleanupResult.data };
    }
  } else {
    result = { success: false, error: `Unknown function: ${functionName}` };
  }
  
  // Log to activity log
  await supabase
    .from('eliza_activity_log')
    .insert({
      activity_type: activityType,
      title: activityTitle,
      description: activityDescription,
      metadata: {
        function: functionName,
        args: args,
        result: result
      },
      status: result.success ? 'completed' : 'failed'
    });
  
  return result;
}

