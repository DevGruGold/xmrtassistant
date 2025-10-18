import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

async function logActivity(
  activity_type: string,
  description: string,
  metadata: any = {},
  status: string = "in_progress"
) {
  await supabase.from("eliza_activity_log").insert({
    activity_type,
    description,
    metadata,
    status,
    created_at: new Date().toISOString(),
  });
}

async function generateFix(code: string, error: string, description: string) {
  await logActivity(
    "auto_fix_analysis",
    "🔬 Analyzing code failure to generate fix...",
    {
      code_length: code.length,
      error_preview: error.substring(0, 200),
      description,
    },
    "in_progress"
  );

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `You are an expert code fixer. Analyze this failed code execution and provide a corrected version.

ORIGINAL CODE:
\`\`\`python
${code}
\`\`\`

ERROR MESSAGE:
${error}

DESCRIPTION: ${description}

Provide ONLY the corrected Python code, no explanations. The code should:
1. Fix the error that occurred
2. Maintain the original intent
3. Add error handling if needed
4. Be production-ready

CORRECTED CODE:`;

  const result = await model.generateContent(prompt);
  const fixedCode = result.response.text()
    .replace(/```python
?/g, "")
    .replace(/```
?/g, "")
    .trim();

  await logActivity(
    "auto_fix_analysis",
    "✅ Generated fixed code",
    {
      original_code_length: code.length,
      fixed_code_length: fixedCode.length,
      analysis_complete: true,
    },
    "completed"
  );

  return fixedCode;
}

async function executeFix(code: string, description: string) {
  await logActivity(
    "auto_fix_execution",
    "⚙️ Executing fixed code...",
    {
      code_length: code.length,
      description,
    },
    "in_progress"
  );

  const response = await fetch(`${SUPABASE_URL}/functions/v1/python-executor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      code,
      description: `AUTO-FIX: ${description}`,
    }),
  });

  const result = await response.json();

  await logActivity(
    "auto_fix_execution",
    response.ok 
      ? "✅ Fixed code executed successfully"
      : "❌ Fixed code still has errors",
    {
      success: response.ok,
      result_preview: JSON.stringify(result).substring(0, 300),
    },
    response.ok ? "completed" : "failed"
  );

  return { success: response.ok, result };
}

async function generateLearningMetadata(
  originalCode: string,
  originalError: string,
  fixedCode: string,
  fixSuccess: boolean
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `Analyze this code fix and extract learning insights.

ORIGINAL CODE:
\`\`\`python
${originalCode}
\`\`\`

ORIGINAL ERROR:
${originalError}

FIXED CODE:
\`\`\`python
${fixedCode}
\`\`\`

FIX SUCCESS: ${fixSuccess}

Provide a JSON response with:
{
  "error_type": "string - category of error",
  "root_cause": "string - what caused the error",
  "fix_strategy": "string - how it was fixed",
  "lesson": "string - key takeaway for future",
  "prevention": "string - how to avoid this error"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse learning metadata:", e);
  }
  
  return {
    error_type: "unknown",
    root_cause: originalError.substring(0, 200),
    fix_strategy: "code correction",
    lesson: "See execution logs",
    prevention: "Add error handling",
  };
}

Deno.serve(async (req) => {
  try {
    const { execution_id } = await req.json();

    await logActivity(
      "auto_fix_start",
      `🤖 AUTO-FIXER ACTIVATED for execution ${execution_id}`,
      { execution_id },
      "in_progress"
    );

    // Get the failed execution
    const { data: execution, error: fetchError } = await supabase
      .from("eliza_python_executions")
      .select("*")
      .eq("id", execution_id)
      .single();

    if (fetchError || !execution) {
      throw new Error("Execution not found");
    }

    if (execution.status !== "error") {
      return new Response(
        JSON.stringify({ error: "Execution did not fail" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate fix
    const fixedCode = await generateFix(
      execution.code,
      execution.error,
      execution.description
    );

    // Execute fix
    const { success, result } = await executeFix(
      fixedCode,
      execution.description
    );

    // Generate learning metadata
    const learning = await generateLearningMetadata(
      execution.code,
      execution.error,
      fixedCode,
      success
    );

    await logActivity(
      "learning_analysis",
      `📚 Learning extracted: ${learning.lesson}`,
      {
        execution_id,
        ...learning,
      },
      "completed"
    );

    // Update original execution with fix metadata
    await supabase
      .from("eliza_python_executions")
      .update({
        metadata: {
          ...execution.metadata,
          auto_fix_attempted: true,
          auto_fix_success: success,
          learning_metadata: learning,
          fixed_code: fixedCode,
        },
      })
      .eq("id", execution_id);

    await logActivity(
      "auto_fix_complete",
      success
        ? `✅ AUTO-FIX SUCCESSFUL for execution ${execution_id}`
        : `❌ AUTO-FIX FAILED for execution ${execution_id}`,
      {
        execution_id,
        success,
        learning_captured: true,
      },
      success ? "completed" : "failed"
    );

    return new Response(
      JSON.stringify({
        success,
        execution_id,
        original_code: execution.code,
        fixed_code: fixedCode,
        learning,
        result,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await logActivity(
      "auto_fix_error",
      `❌ Auto-fixer error: ${error.message}`,
      {
        error: error.message,
        stack: error.stack,
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
