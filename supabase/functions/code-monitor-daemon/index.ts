import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Configuration
const CODE_SCAN_WINDOW_HOURS = parseInt(Deno.env.get("CODE_SCAN_WINDOW_HOURS") || "24");
const CODE_SCAN_BATCH_SIZE = parseInt(Deno.env.get("CODE_SCAN_BATCH_SIZE") || "100");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Code block extraction regex
const CODE_BLOCK_REGEX = /```(?:python|js|javascript)\n([\s\S]*?)```/g;

async function logActivity(
  activity_type: string,
  description: string,
  metadata: any = {},
  status: string = "completed"
) {
  await supabase.from("eliza_activity_log").insert({
    activity_type,
    description,
    metadata,
    status,
    created_at: new Date().toISOString(),
  });
}

// Normalize code for comparison (remove extra whitespace, comments)
function normalizeCode(code: string): string {
  return code
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/#.*$/gm, '') // Remove Python comments
    .replace(/\/\/.*$/gm, '') // Remove JS comments
    .toLowerCase();
}

// Check if code is executable (has actual statements, not just comments/config)
function isExecutableCode(code: string): boolean {
  const trimmed = code.trim();
  
  // Skip empty code
  if (!trimmed) return false;
  
  // Skip tool call syntax (e.g., "createGitHubIssue({ ... })" or "execute_python({ ... })")
  if (/^\w+\s*\(\s*\{[\s\S]*\}\s*\)$/m.test(trimmed)) {
    console.log('⏭️ Skipping tool call syntax (not executable Python)');
    return false;
  }
  
  // Skip standalone function calls without imports/definitions
  if (/^\w+\([^)]*\)/.test(trimmed) && !trimmed.includes('import') && !trimmed.includes('def') && !trimmed.includes('print')) {
    console.log('⏭️ Skipping standalone function call without context');
    return false;
  }
  
  // Skip if only comments
  const withoutComments = trimmed
    .replace(/#.*$/gm, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  if (!withoutComments) return false;
  
  // Skip pure JSON/YAML/config
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return false;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return false;
  if (trimmed.match(/^[\w_]+:\s*.+$/m)) return false; // YAML-like
  
  // Check for executable indicators
  const hasImports = /^(import |from .+ import)/m.test(trimmed);
  const hasFunctionCalls = /\w+\([^)]*\)/m.test(trimmed);
  const hasAssignments = /\w+\s*=\s*.+/m.test(trimmed);
  const hasStatements = /^(print|return|if|for|while|def|class)/m.test(trimmed);
  
  return hasImports || hasFunctionCalls || hasAssignments || hasStatements;
}

// Check if code was properly executed via tool call
async function wasCodeProperlyExecutedViaTool(
  code: string,
  messageTimestamp: string
): Promise<{ executed: boolean; executiveName?: string }> {
  const normalized = normalizeCode(code);
  
  // Check eliza_function_usage for execute_python tool calls
  const { data: toolCalls } = await supabase
    .from("eliza_function_usage")
    .select("*")
    .eq("function_name", "execute_python")
    .gte("invoked_at", messageTimestamp)
    .limit(100);
  
  if (!toolCalls || toolCalls.length === 0) {
    return { executed: false };
  }
  
  // Check if any tool call contains this code
  for (const call of toolCalls) {
    const callCode = call.parameters?.code || '';
    if (normalizeCode(callCode) === normalized) {
      return { executed: true, executiveName: call.executive_name };
    }
  }
  
  return { executed: false };
}

// Check if code was already executed (legacy check)
async function wasCodeExecuted(code: string): Promise<boolean> {
  const normalized = normalizeCode(code);
  
  // Query recent executions (last 48 hours to catch all retroactive runs)
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  
  const { data: executions } = await supabase
    .from("eliza_python_executions")
    .select("code")
    .gte("created_at", twoDaysAgo)
    .limit(1000);
  
  if (!executions || executions.length === 0) return false;
  
  // Fuzzy match - check if normalized code exists
  for (const exec of executions) {
    const execNormalized = normalizeCode(exec.code || '');
    if (execNormalized === normalized) return true;
    
    // Also check substring match (code might be part of larger execution)
    if (execNormalized.includes(normalized) || normalized.includes(execNormalized)) {
      return true;
    }
  }
  
  return false;
}

// Provide constructive feedback to executive
async function provideFeedbackToAgent(
  executiveName: string,
  opportunity: any,
  testResult: any
) {
  const feedbackMessage = {
    executive_name: executiveName,
    feedback_type: 'optimization_suggestion',
    observation_description: 'Code could have been executed via tool for consistency',
    learning_point: generateLearningPoint(opportunity, testResult),
    original_context: {
      message_id: opportunity.message_id,
      code_preview: opportunity.code_preview,
      language: opportunity.language
    },
    fix_result: {
      success: testResult.success,
      output: testResult.output,
      error: testResult.error,
      note: 'Tested retroactively to validate approach'
    },
    impact_level: 'low',
    suggestion_type: 'optimization',
    acknowledged: false
  };
  
  await supabase.from('executive_feedback').insert(feedbackMessage);
}

function generateLearningPoint(opportunity: any, testResult: any): string {
  if (testResult.success) {
    return `✅ Code executed successfully when tested retroactively. Consider using execute_python tool for consistency and verifiability in future conversations. This helps maintain a clear record of all calculations.`;
  } else {
    const error = testResult.error || '';
    if (error.includes('network') || error.includes('urllib') || error.includes('requests')) {
      return `💡 Network operations require invoke_edge_function instead of execute_python. Good that you didn't attempt execution in Python sandbox - your direct response was appropriate in this case.`;
    } else if (error.includes('ModuleNotFoundError') || error.includes('ImportError')) {
      return `💡 Module not available in Python sandbox. For specialized operations requiring external libraries, consider using a dedicated edge function or continue with direct explanations as you did.`;
    } else if (error.includes('SyntaxError')) {
      return `💡 Code had syntax issues when tested: ${error}. Your direct explanation approach was reasonable. If using execute_python in future, validate syntax first.`;
    } else {
      return `ℹ️ Code had issues when tested: ${error}. Direct explanation was appropriate in this context. Consider execute_python for verifiable calculations when code is correct.`;
    }
  }
}

Deno.serve(async (req) => {
  const scanStartTime = new Date();
  
  await logActivity(
    "daemon_scan",
    "🔍 Code Monitor Daemon: Scanning for optimization opportunities...",
    { 
      scan_time: scanStartTime.toISOString(),
      scan_window_hours: CODE_SCAN_WINDOW_HOURS,
      batch_size: CODE_SCAN_BATCH_SIZE
    },
    "in_progress"
  );

  try {
    // Query conversation_messages for assistant messages with code blocks
    const scanWindowStart = new Date(Date.now() - CODE_SCAN_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    
    const { data: messages, error: fetchError } = await supabase
      .from("conversation_messages")
      .select("id, content, timestamp, session_id, metadata")
      .eq("message_type", "assistant")
      .or(`content.like.%\`\`\`python%,content.like.%\`\`\`js%,content.like.%\`\`\`javascript%`)
      .gte("timestamp", scanWindowStart)
      .order("timestamp", { ascending: false })
      .limit(CODE_SCAN_BATCH_SIZE);

    if (fetchError) throw fetchError;

    const messageCount = messages?.length || 0;
    console.log(`📊 Found ${messageCount} assistant messages with code blocks in last ${CODE_SCAN_WINDOW_HOURS}h`);
    
    if (messageCount === 0) {
      await logActivity(
        "daemon_scan",
        `✅ Scan complete: No messages with code blocks found`,
        {
          scan_window_hours: CODE_SCAN_WINDOW_HOURS,
          scan_duration_ms: Date.now() - scanStartTime.getTime(),
        },
        "completed"
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "No code blocks found in conversation messages",
          scanned_at: scanStartTime.toISOString(),
          messages_scanned: 0,
          violations_found: 0
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract and process code blocks
    const violations: any[] = [];
    const executionResults: any[] = [];
    
    for (const message of messages!) {
      const codeBlocks = [...message.content.matchAll(CODE_BLOCK_REGEX)];
      
      for (const match of codeBlocks) {
        const code = match[1].trim();
        const language = match[0].match(/```(\w+)/)?.[1] || 'python';
        
        // Skip non-executable code
        if (!isExecutableCode(code)) {
          console.log(`⏭️ Skipping non-executable code block (${code.substring(0, 50)}...)`);
          continue;
        }
        
        // Check if code was properly executed via tool call
        const toolCheck = await wasCodeProperlyExecutedViaTool(code, message.timestamp);
        
        if (toolCheck.executed) {
          console.log(`✅ Code was properly executed via tool by ${toolCheck.executiveName}`);
          continue; // No violation - proper tool use
        }
        
        // Legacy check for retroactive executions
        const wasExecuted = await wasCodeExecuted(code);
        
        if (!wasExecuted) {
          // OPTIMIZATION OPPORTUNITY DETECTED!
          const opportunity = {
            message_id: message.id,
            session_id: message.session_id,
            code_preview: code.substring(0, 200),
            code_length: code.length,
            language,
            message_timestamp: message.timestamp,
            detected_at: new Date().toISOString(),
            type: 'code_execution_opportunity'
          };
          
          violations.push(opportunity);
          
          await logActivity(
            "optimization_opportunity",
            `💡 Optimization opportunity: Code could have been executed via tool`,
            opportunity,
            "pending_test"
          );
          
          console.log(`💡 OPPORTUNITY FOUND in message ${message.id}: ${code.substring(0, 100)}...`);
          
          // Retroactively execute the code
          try {
            console.log(`⚡ Executing code retroactively...`);
            
            const { data: execData, error: execError } = await supabase.functions.invoke(
              "python-executor",
              {
                body: {
                  code,
                  language,
                  purpose: "retroactive_execution_from_chat",
                  source: "code-monitor-daemon",
                  agent_id: "eliza",
                  metadata: {
                    original_message_id: message.id,
                    violation_detected_at: new Date().toISOString()
                  }
                }
              }
            );
            
            const executionSuccess = !execError && execData?.success;
            
            executionResults.push({
              message_id: message.id,
              code_preview: code.substring(0, 100),
              success: executionSuccess,
              output: execData?.output || null,
              error: execData?.error || execError?.message || null
            });
            
            await logActivity(
              "optimization_test",
              executionSuccess 
                ? `✅ Retroactive test succeeded for message ${message.id}`
                : `ℹ️ Retroactive test completed for message ${message.id}`,
              {
                message_id: message.id,
                code_preview: code.substring(0, 200),
                execution_result: execData,
                execution_error: execError
              },
              executionSuccess ? "completed" : "informational"
            );
            
            // Provide constructive feedback to the executive
            const executiveName = message.metadata?.executive_name || 'Eliza';
            await provideFeedbackToAgent(executiveName, opportunity, {
              success: executionSuccess,
              output: execData?.output,
              error: execData?.error || execError?.message
            });
            
            console.log(executionSuccess ? `✅ Execution succeeded` : `❌ Execution failed: ${execData?.error || execError?.message}`);
            
          } catch (execException) {
            console.error(`❌ Exception during execution:`, execException);
            executionResults.push({
              message_id: message.id,
              code_preview: code.substring(0, 100),
              success: false,
              error: execException.message
            });
            
            await logActivity(
              "optimization_test",
              `ℹ️ Exception during retroactive test for message ${message.id}`,
              {
                message_id: message.id,
                error: execException.message,
                stack: execException.stack
              },
              "informational"
            );
          }
        }
      }
    }
    
    // Generate summary report
    const successfulExecutions = executionResults.filter(r => r.success).length;
    const failedExecutions = executionResults.filter(r => !r.success).length;
    
    const summary = {
      scan_completed_at: new Date().toISOString(),
      scan_duration_ms: Date.now() - scanStartTime.getTime(),
      scan_window_hours: CODE_SCAN_WINDOW_HOURS,
      messages_scanned: messageCount,
      opportunities_found: violations.length,
      tests_attempted: executionResults.length,
      tests_succeeded: successfulExecutions,
      tests_informational: failedExecutions
    };
    
    await logActivity(
      "daemon_scan",
      `✅ Code Monitor Scan Complete: ${violations.length} optimization opportunities found, ${successfulExecutions} tested successfully`,
      summary,
      "completed"
    );
    
    console.log(`📊 SCAN SUMMARY:`, summary);

    return new Response(
      JSON.stringify({
        success: true,
        ...summary,
        violations: violations.slice(0, 10), // Return first 10 for inspection
        execution_results: executionResults.slice(0, 10)
      }),
      { headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    await logActivity(
      "daemon_scan",
      `❌ Daemon scan error: ${error.message}`,
      {
        error: error.message,
        stack: error.stack,
        scan_time: scanStartTime.toISOString(),
      },
      "failed"
    );

    console.error(`❌ SCAN ERROR:`, error);

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
