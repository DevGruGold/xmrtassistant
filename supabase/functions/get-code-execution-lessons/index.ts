import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

Deno.serve(async (req) => {
  try {
    const { limit = 20 } = await req.json().catch(() => ({}));

    // Get recent executions
    const { data: executions, error } = await supabase
      .from("eliza_python_executions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!executions || executions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No execution history found",
          lessons: [],
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Calculate statistics
    const total = executions.length;
    const successful = executions.filter(e => e.status === "success").length;
    const failed = executions.filter(e => e.status === "error").length;
    const success_rate = (successful / total) * 100;

    // Identify common patterns
    const error_patterns = {};
    const successful_patterns = {};

    executions.forEach(exec => {
      if (exec.status === "error" && exec.error) {
        const error_type = exec.error.split(":")[0].trim();
        error_patterns[error_type] = (error_patterns[error_type] || 0) + 1;
      } else if (exec.status === "success" && exec.metadata?.learning_metadata) {
        const lesson = exec.metadata.learning_metadata.lesson;
        if (lesson) {
          successful_patterns[lesson] = (successful_patterns[lesson] || 0) + 1;
        }
      }
    });

    // Get auto-fix statistics
    const auto_fixed = executions.filter(
      e => e.metadata?.auto_fix_attempted && e.metadata?.auto_fix_success
    ).length;

    // Generate AI insights
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `Analyze these Python execution statistics and provide actionable insights:

Statistics:
- Total executions: ${total}
- Successful: ${successful} (${success_rate.toFixed(1)}%)
- Failed: ${failed}
- Auto-fixed: ${auto_fixed}

Common error patterns:
${Object.entries(error_patterns).map(([type, count]) => `- ${type}: ${count} occurrences`).join("\n")}

Learning patterns from successful fixes:
${Object.entries(successful_patterns).map(([lesson, count]) => `- ${lesson}: ${count} times`).join("\n")}

Provide 3-5 actionable recommendations to improve code quality and reduce errors. Be specific and practical.`;

    const result = await model.generateContent(prompt);
    const recommendations = result.response.text();

    return new Response(
      JSON.stringify({
        success: true,
        statistics: {
          total_executions: total,
          successful,
          failed,
          success_rate: success_rate.toFixed(1) + "%",
          auto_fixed_count: auto_fixed,
        },
        patterns: {
          common_errors: error_patterns,
          successful_lessons: successful_patterns,
        },
        recommendations,
        recent_executions: executions.slice(0, 5).map(e => ({
          id: e.id,
          status: e.status,
          description: e.description,
          created_at: e.created_at,
          had_auto_fix: e.metadata?.auto_fix_attempted || false,
        })),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
