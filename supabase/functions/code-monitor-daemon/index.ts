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

// Check if code was already executed
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

Deno.serve(async (req) => {
  const scanStartTime = new Date();
  
  await logActivity(
    "daemon_scan",
    "🔍 Code Monitor Daemon: Scanning conversation messages for unexecuted code...",
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
        
        // Check if already executed
        const wasExecuted = await wasCodeExecuted(code);
        
        if (!wasExecuted) {
          // CODE VIOLATION DETECTED!
          const violation = {
            message_id: message.id,
            session_id: message.session_id,
            code_preview: code.substring(0, 200),
            code_length: code.length,
            language,
            message_timestamp: message.timestamp,
            detected_at: new Date().toISOString()
          };
          
          violations.push(violation);
          
          await logActivity(
            "code_violation_detected",
            `🚨 RULE VIOLATION: Eliza wrote code but didn't execute it`,
            violation,
            "pending_execution"
          );
          
          console.log(`🚨 VIOLATION FOUND in message ${message.id}: ${code.substring(0, 100)}...`);
          
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
              "code_violation_detected",
              executionSuccess 
                ? `✅ Retroactive execution succeeded for message ${message.id}`
                : `❌ Retroactive execution failed for message ${message.id}`,
              {
                message_id: message.id,
                code_preview: code.substring(0, 200),
                execution_result: execData,
                execution_error: execError
              },
              executionSuccess ? "completed" : "failed"
            );
            
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
              "code_violation_detected",
              `❌ Exception during retroactive execution for message ${message.id}`,
              {
                message_id: message.id,
                error: execException.message,
                stack: execException.stack
              },
              "failed"
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
      violations_found: violations.length,
      executions_attempted: executionResults.length,
      executions_succeeded: successfulExecutions,
      executions_failed: failedExecutions
    };
    
    await logActivity(
      "daemon_scan",
      `✅ Code Monitor Scan Complete: ${violations.length} violations found, ${successfulExecutions} executed successfully`,
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
