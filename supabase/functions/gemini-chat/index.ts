import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { callLovableAIGateway } from '../_shared/aiGatewayFallback.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FALLBACK_GEMINI_KEY = Deno.env.get("GEMINI_API_KEY"); // Backend fallback only

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// ============================================================================
// ENHANCED ACTIVITY LOGGING - SHOWS ALL ACTIVITY IN BACKGROUND WINDOW
// ============================================================================

async function logActivity(
  activity_type: string,
  description: string,
  metadata: any = {},
  status: string = "in_progress"
) {
  try {
    const { error } = await supabase
      .from("eliza_activity_log")
      .insert({
        activity_type,
        description,
        metadata,
        status,
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error("Activity logging error:", error);
    }
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

async function logToolStart(toolName: string, args: any) {
  await logActivity(
    "tool_execution",
    `🔧 Starting tool: ${toolName}`,
    {
      tool_name: toolName,
      arguments: args,
      phase: "start",
    },
    "in_progress"
  );
}

async function logToolEnd(toolName: string, result: any, success: boolean) {
  await logActivity(
    "tool_execution",
    success 
      ? `✅ Completed tool: ${toolName}`
      : `❌ Failed tool: ${toolName}`,
    {
      tool_name: toolName,
      result: typeof result === "string" ? result.substring(0, 500) : result,
      phase: "end",
      success,
    },
    success ? "completed" : "failed"
  );
}

// ============================================================================
// TOOL EXECUTION HANDLERS
// ============================================================================

async function executePythonCode(code: string, description: string) {
  await logToolStart("python_executor", { code_length: code.length, description });
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/eliza-python-runtime`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ 
        code, 
        purpose: description,
        source: 'eliza',
        timeout_ms: 30000
      }),
    });

    const result = await response.json();
    await logToolEnd("python_executor", result, response.ok);
    return result;
  } catch (error) {
    await logToolEnd("python_executor", { error: error.message }, false);
    throw error;
  }
}

async function getCodeExecutionLessons(limit: number = 10) {
  await logToolStart("get_code_execution_lessons", { limit });
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-code-execution-lessons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ limit }),
    });

    const result = await response.json();
    await logToolEnd("get_code_execution_lessons", result, response.ok);
    return result;
  } catch (error) {
    await logToolEnd("get_code_execution_lessons", { error: error.message }, false);
    throw error;
  }
}

async function invokeEdgeFunction(functionName: string, payload: any) {
  await logToolStart("invoke_edge_function", { function_name: functionName, payload });
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/universal-edge-invoker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ function_name: functionName, payload }),
    });

    const result = await response.json();
    
    await logActivity(
      "mcp_invocation",
      `📡 MCP called: ${functionName}`,
      {
        function_name: functionName,
        payload,
        result: typeof result === "string" ? result.substring(0, 300) : result,
        success: response.ok,
      },
      response.ok ? "completed" : "failed"
    );
    
    await logToolEnd("invoke_edge_function", result, response.ok);
    return result;
  } catch (error) {
    await logToolEnd("invoke_edge_function", { error: error.message }, false);
    throw error;
  }
}

async function listAvailableFunctions() {
  await logToolStart("list_available_functions", {});
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/list-available-functions`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    const result = await response.json();
    await logToolEnd("list_available_functions", { count: result.functions?.length || 0 }, response.ok);
    return result;
  } catch (error) {
    await logToolEnd("list_available_functions", { error: error.message }, false);
    throw error;
  }
}

// ============================================================================
// MAIN CHAT HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const { message, conversationHistory = [], session_credentials } = await req.json();

    await logActivity(
      "chat_message",
      `💬 User message received`,
      { message_preview: message.substring(0, 100) },
      "in_progress"
    );

    // PRIORITY: Use user's Gemini API key from session credentials
    const userGeminiKey = session_credentials?.gemini || 
                         session_credentials?.GEMINI_API_KEY ||
                         session_credentials?.geminiKey;
    
    const apiKey = userGeminiKey || FALLBACK_GEMINI_KEY;
    
    if (!apiKey) {
      console.log('⚠️ No Gemini API key - trying Lovable AI Gateway fallback...');
      
      try {
        const lovableResponse = await callLovableAIGateway(
          [{ role: 'user', content: message }],
          {
            model: 'google/gemini-2.5-flash',
            systemPrompt: 'You are Eliza, the autonomous AI co-founder of XMRT DAO with access to 120+ edge functions and Python execution capabilities.'
          }
        );
        
        await logActivity(
          'chat_response',
          `🌐 Lovable AI Gateway responded (fallback)`,
          { response_preview: lovableResponse.substring(0, 100) },
          'completed'
        );
        
        return new Response(
          JSON.stringify({ 
            response: `🌐 [via Lovable AI Gateway]\n\n${lovableResponse}`,
            method: 'lovable_gateway' 
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      } catch (lovableError) {
        console.error('❌ Lovable AI Gateway also failed:', lovableError);
        
        await logActivity(
          "error",
          `❌ No Gemini API key and Lovable fallback failed`,
          { 
            session_credentials_keys: Object.keys(session_credentials || {}),
            has_fallback: !!FALLBACK_GEMINI_KEY,
            lovable_error: lovableError.message
          },
          "failed"
        );
        
        return new Response(
          JSON.stringify({ 
            error: "Gemini API key required and Lovable AI Gateway unavailable. Please provide your API key.",
            needsCredentials: true,
            fallback_attempted: true,
            fallback_error: lovableError.message
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    console.log(`🔑 Using ${userGeminiKey ? 'USER' : 'FALLBACK'} Gemini API key`);
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      tools: [
        {
          functionDeclarations: [
            {
              name: "execute_python_code",
              description: "Execute Python code in background sandbox. Results appear in background work window only.",
              parameters: {
                type: "OBJECT",
                properties: {
                  code: { type: "STRING", description: "Python code to execute" },
                  description: { type: "STRING", description: "Brief description of what code does" },
                },
                required: ["code", "description"],
              },
            },
            {
              name: "get_code_execution_lessons",
              description: "Analyze recent code execution history and learn from patterns",
              parameters: {
                type: "OBJECT",
                properties: {
                  limit: { type: "NUMBER", description: "Number of recent executions to analyze" },
                },
              },
            },
            {
              name: "invoke_edge_function",
              description: "Invoke any Supabase edge function via MCP",
              parameters: {
                type: "OBJECT",
                properties: {
                  function_name: { type: "STRING", description: "Name of edge function to invoke" },
                  payload: { type: "OBJECT", description: "Arguments to pass to function" },
                },
                required: ["function_name", "payload"],
              },
            },
            {
              name: "list_available_functions",
              description: "List all available edge functions accessible via MCP",
              parameters: { type: "OBJECT", properties: {} },
            },
          ],
        },
      ],
    });

    const chat = model.startChat({
      history: conversationHistory.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })),
    });

    let result = await chat.sendMessage(message);
    let response = result.response;

    // Handle tool calls
    while (response.functionCalls()?.length > 0) {
      const functionCalls = response.functionCalls();
      const functionResponses = [];

      for (const call of functionCalls) {
        const { name, args } = call;
        let functionResult;

        try {
          switch (name) {
            case "execute_python_code":
              functionResult = await executePythonCode(args.code, args.description);
              break;
            case "get_code_execution_lessons":
              functionResult = await getCodeExecutionLessons(args.limit || 10);
              break;
            case "invoke_edge_function":
              functionResult = await invokeEdgeFunction(args.function_name, args.payload);
              break;
            case "list_available_functions":
              functionResult = await listAvailableFunctions();
              break;
            default:
              functionResult = { error: `Unknown function: ${name}` };
          }
        } catch (error) {
          functionResult = { error: error.message };
        }

        functionResponses.push({
          name,
          response: functionResult,
        });
      }

      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    const finalResponse = response.text();
    
    await logActivity(
      "chat_response",
      `🤖 Eliza responded`,
      { response_preview: finalResponse.substring(0, 100) },
      "completed"
    );

    return new Response(
      JSON.stringify({ response: finalResponse }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    await logActivity(
      "error",
      `❌ Chat error: ${error.message}`,
      { error: error.message, stack: error.stack },
      "failed"
    );

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
