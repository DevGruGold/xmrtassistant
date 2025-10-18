import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Function Directory Service
 * 
 * Provides a directory of all available Supabase edge functions.
 * This helps Eliza discover what capabilities she has access to.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category } = await req.json().catch(() => ({}));
    
    const functions = {
      "total": 58,
      "categories": {
            "AI & Chat": [
                  "daily-discussion-post",
                  "deepseek-chat",
                  "gemini-chat",
                  "get-lovable-key",
                  "lovable-chat",
                  "openai-chat",
                  "openai-tts",
                  "vercel-ai-chat-stream",
                  "vercel-ai-chat",
                  "vercel-manager"
            ],
            "Python Execution & Code": [
                  "autonomous-code-fixer",
                  "code-monitor-daemon",
                  "get-code-execution-lessons",
                  "python-db-bridge",
                  "python-executor",
                  "python-network-proxy"
            ],
            "GitHub Integration": [
                  "github-integration",
                  "validate-github-contribution"
            ],
            "Agent Management": [
                  "agent-manager",
                  "self-optimizing-agent-architecture"
            ],
            "Task Management": [
                  "cleanup-duplicate-tasks",
                  "task-orchestrator"
            ],
            "Mining & DAO": [
                  "mining-proxy"
            ],
            "Monitoring & Daemon": [
                  "api-key-health-monitor",
                  "ecosystem-monitor",
                  "execute-scheduled-actions",
                  "monitor-device-connections"
            ],
            "Other": [
                  "aggregate-device-metrics",
                  "check-frontend-health",
                  "community-spotlight-post",
                  "conversation-access",
                  "enhanced-learning",
                  "evening-summary-post",
                  "extract-knowledge",
                  "fetch-auto-fix-results",
                  "get-embedding",
                  "issue-engagement-command",
                  "knowledge-manager",
                  "morning-discussion-post",
                  "multi-step-orchestrator",
                  "nlg-generator",
                  "predictive-analytics",
                  "process-contributor-reward",
                  "progress-update-post",
                  "prometheus-metrics",
                  "render-api",
                  "schedule-reminder",
                  "schema-manager",
                  "search-edge-functions",
                  "summarize-conversation",
                  "system-diagnostics",
                  "system-health",
                  "system-status",
                  "update-api-key",
                  "validate-pop-event",
                  "vectorize-memory",
                  "weekly-retrospective-post",
                  "xmrt-mcp-server"
            ]
      },
      "functions": [
            {
                  "name": "agent-manager",
                  "path": "supabase/functions/agent-manager",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "aggregate-device-metrics",
                  "path": "supabase/functions/aggregate-device-metrics",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "api-key-health-monitor",
                  "path": "supabase/functions/api-key-health-monitor",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "autonomous-code-fixer",
                  "path": "supabase/functions/autonomous-code-fixer",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "check-frontend-health",
                  "path": "supabase/functions/check-frontend-health",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "cleanup-duplicate-tasks",
                  "path": "supabase/functions/cleanup-duplicate-tasks",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "code-monitor-daemon",
                  "path": "supabase/functions/code-monitor-daemon",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "community-spotlight-post",
                  "path": "supabase/functions/community-spotlight-post",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "conversation-access",
                  "path": "supabase/functions/conversation-access",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "daily-discussion-post",
                  "path": "supabase/functions/daily-discussion-post",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "deepseek-chat",
                  "path": "supabase/functions/deepseek-chat",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "ecosystem-monitor",
                  "path": "supabase/functions/ecosystem-monitor",
                  "description": "/**",
                  "has_index": true
            },
            {
                  "name": "enhanced-learning",
                  "path": "supabase/functions/enhanced-learning",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "evening-summary-post",
                  "path": "supabase/functions/evening-summary-post",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "execute-scheduled-actions",
                  "path": "supabase/functions/execute-scheduled-actions",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "extract-knowledge",
                  "path": "supabase/functions/extract-knowledge",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "fetch-auto-fix-results",
                  "path": "supabase/functions/fetch-auto-fix-results",
                  "description": "/**",
                  "has_index": true
            },
            {
                  "name": "gemini-chat",
                  "path": "supabase/functions/gemini-chat",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "get-code-execution-lessons",
                  "path": "supabase/functions/get-code-execution-lessons",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "get-embedding",
                  "path": "supabase/functions/get-embedding",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "get-lovable-key",
                  "path": "supabase/functions/get-lovable-key",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "github-integration",
                  "path": "supabase/functions/github-integration",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "issue-engagement-command",
                  "path": "supabase/functions/issue-engagement-command",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "knowledge-manager",
                  "path": "supabase/functions/knowledge-manager",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "lovable-chat",
                  "path": "supabase/functions/lovable-chat",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "mining-proxy",
                  "path": "supabase/functions/mining-proxy",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "monitor-device-connections",
                  "path": "supabase/functions/monitor-device-connections",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "morning-discussion-post",
                  "path": "supabase/functions/morning-discussion-post",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "multi-step-orchestrator",
                  "path": "supabase/functions/multi-step-orchestrator",
                  "description": "description: string;",
                  "has_index": true
            },
            {
                  "name": "nlg-generator",
                  "path": "supabase/functions/nlg-generator",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "openai-chat",
                  "path": "supabase/functions/openai-chat",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "openai-tts",
                  "path": "supabase/functions/openai-tts",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "predictive-analytics",
                  "path": "supabase/functions/predictive-analytics",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "process-contributor-reward",
                  "path": "supabase/functions/process-contributor-reward",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "progress-update-post",
                  "path": "supabase/functions/progress-update-post",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "prometheus-metrics",
                  "path": "supabase/functions/prometheus-metrics",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "python-db-bridge",
                  "path": "supabase/functions/python-db-bridge",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "python-executor",
                  "path": "supabase/functions/python-executor",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "python-network-proxy",
                  "path": "supabase/functions/python-network-proxy",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "render-api",
                  "path": "supabase/functions/render-api",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "schedule-reminder",
                  "path": "supabase/functions/schedule-reminder",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "schema-manager",
                  "path": "supabase/functions/schema-manager",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "search-edge-functions",
                  "path": "supabase/functions/search-edge-functions",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "self-optimizing-agent-architecture",
                  "path": "supabase/functions/self-optimizing-agent-architecture",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "summarize-conversation",
                  "path": "supabase/functions/summarize-conversation",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "system-diagnostics",
                  "path": "supabase/functions/system-diagnostics",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "system-health",
                  "path": "supabase/functions/system-health",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "system-status",
                  "path": "supabase/functions/system-status",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "task-orchestrator",
                  "path": "supabase/functions/task-orchestrator",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "update-api-key",
                  "path": "supabase/functions/update-api-key",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "validate-github-contribution",
                  "path": "supabase/functions/validate-github-contribution",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "validate-pop-event",
                  "path": "supabase/functions/validate-pop-event",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "vectorize-memory",
                  "path": "supabase/functions/vectorize-memory",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "vercel-ai-chat-stream",
                  "path": "supabase/functions/vercel-ai-chat-stream",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "vercel-ai-chat",
                  "path": "supabase/functions/vercel-ai-chat",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "vercel-manager",
                  "path": "supabase/functions/vercel-manager",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "weekly-retrospective-post",
                  "path": "supabase/functions/weekly-retrospective-post",
                  "description": "Unknown function",
                  "has_index": true
            },
            {
                  "name": "xmrt-mcp-server",
                  "path": "supabase/functions/xmrt-mcp-server",
                  "description": "Unknown function",
                  "has_index": true
            }
      ]
};
    
    let result = functions;
    
    // Filter by category if requested
    if (category && functions.categories[category]) {
      result = {
        total: functions.categories[category].length,
        category: category,
        functions: functions.categories[category]
      };
    }
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
