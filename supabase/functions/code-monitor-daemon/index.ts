import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

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

Deno.serve(async (req) => {
  const scanStartTime = new Date();
  
  await logActivity(
    "daemon_scan",
    "🔍 Code monitor daemon scanning for failed executions...",
    { scan_time: scanStartTime.toISOString() },
    "in_progress"
  );

  try {
    // Query for failed executions in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: failedExecutions, error } = await supabase
      .from("eliza_python_executions")
      .select("*")
      .eq("status", "error")
      .gte("created_at", tenMinutesAgo)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const failureCount = failedExecutions?.length || 0;
    
    await logActivity(
      "daemon_scan",
      `🔍 Scan complete: Found ${failureCount} failed executions`,
      {
        scan_time: scanStartTime.toISOString(),
        failures_found: failureCount,
        scan_duration_ms: Date.now() - scanStartTime.getTime(),
      },
      "completed"
    );

    if (failureCount === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No failed executions found",
          scanned_at: scanStartTime.toISOString(),
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Process each failed execution
    const fixResults = [];
    
    for (const execution of failedExecutions!) {
      await logActivity(
        "auto_fix_triggered",
        `🤖 Triggering auto-fix for execution ${execution.id}`,
        {
          execution_id: execution.id,
          original_code: execution.code.substring(0, 200),
          error: execution.error,
        },
        "in_progress"
      );

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/autonomous-code-fixer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ execution_id: execution.id }),
          }
        );

        const result = await response.json();
        fixResults.push({
          execution_id: execution.id,
          success: response.ok,
          result,
        });

        await logActivity(
          "auto_fix_triggered",
          response.ok 
            ? `✅ Auto-fix succeeded for execution ${execution.id}`
            : `❌ Auto-fix failed for execution ${execution.id}`,
          {
            execution_id: execution.id,
            fix_result: result,
          },
          response.ok ? "completed" : "failed"
        );
      } catch (fixError) {
        await logActivity(
          "auto_fix_triggered",
          `❌ Auto-fix error for execution ${execution.id}`,
          {
            execution_id: execution.id,
            error: fixError.message,
          },
          "failed"
        );
        
        fixResults.push({
          execution_id: execution.id,
          success: false,
          error: fixError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned_at: scanStartTime.toISOString(),
        failures_found: failureCount,
        fixes_attempted: fixResults.length,
        results: fixResults,
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

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
