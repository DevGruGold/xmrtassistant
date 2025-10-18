import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Complete list of all edge functions in the system
const ALL_FUNCTIONS = [
  // Chat & AI
  { name: "gemini-chat", category: "chat", description: "Main chat interface with Gemini AI" },
  { name: "deepseek-chat", category: "chat", description: "Chat interface with DeepSeek AI" },
  { name: "openai-chat", category: "chat", description: "Chat interface with OpenAI" },
  { name: "lovable-chat", category: "chat", description: "Chat interface with Lovable AI" },
  
  // Code Execution & Learning
  { name: "python-executor", category: "code", description: "Execute Python code in sandbox" },
  { name: "autonomous-code-fixer", category: "code", description: "Automatically fix failed code executions" },
  { name: "code-monitor-daemon", category: "code", description: "Monitor and scan for failed executions" },
  { name: "get-code-execution-lessons", category: "learning", description: "Analyze execution history and generate learning insights" },
  
  // MCP Integration
  { name: "universal-edge-invoker", category: "mcp", description: "Dynamically invoke any edge function" },
  { name: "list-available-functions", category: "mcp", description: "List all available edge functions" },
  
  // GitHub Integration
  { name: "get-github-repos", category: "github", description: "Get user's GitHub repositories" },
  { name: "get-github-issues", category: "github", description: "Get issues from a repository" },
  { name: "create-github-issue", category: "github", description: "Create a new GitHub issue" },
  { name: "update-github-issue", category: "github", description: "Update an existing GitHub issue" },
  { name: "get-github-prs", category: "github", description: "Get pull requests from a repository" },
  { name: "create-github-pr", category: "github", description: "Create a new pull request" },
  { name: "get-github-commits", category: "github", description: "Get commits from a repository" },
  { name: "get-github-branches", category: "github", description: "Get branches from a repository" },
  { name: "create-github-branch", category: "github", description: "Create a new branch" },
  { name: "get-github-file", category: "github", description: "Get file contents from repository" },
  { name: "update-github-file", category: "github", description: "Update file in repository" },
  { name: "create-github-file", category: "github", description: "Create new file in repository" },
  { name: "delete-github-file", category: "github", description: "Delete file from repository" },
  { name: "search-github-code", category: "github", description: "Search code across repositories" },
  { name: "get-github-repo-stats", category: "github", description: "Get repository statistics" },
  
  // Communication
  { name: "send-email", category: "communication", description: "Send email via configured service" },
  { name: "send-sms", category: "communication", description: "Send SMS message" },
  { name: "send-telegram", category: "communication", description: "Send Telegram message" },
  { name: "send-slack", category: "communication", description: "Send Slack message" },
  { name: "send-discord", category: "communication", description: "Send Discord message" },
  
  // Data & Storage
  { name: "query-database", category: "database", description: "Query Supabase database" },
  { name: "insert-database", category: "database", description: "Insert data into database" },
  { name: "update-database", category: "database", description: "Update database records" },
  { name: "delete-database", category: "database", description: "Delete database records" },
  { name: "upload-file", category: "storage", description: "Upload file to Supabase storage" },
  { name: "download-file", category: "storage", description: "Download file from storage" },
  { name: "delete-file", category: "storage", description: "Delete file from storage" },
  { name: "list-files", category: "storage", description: "List files in storage bucket" },
  
  // Analytics & Monitoring
  { name: "log-event", category: "analytics", description: "Log custom analytics event" },
  { name: "get-analytics", category: "analytics", description: "Get analytics data" },
  { name: "track-metric", category: "analytics", description: "Track custom metric" },
  { name: "get-system-health", category: "monitoring", description: "Get system health status" },
  { name: "get-error-logs", category: "monitoring", description: "Get error logs" },
  
  // Utilities
  { name: "generate-uuid", category: "utility", description: "Generate UUID" },
  { name: "hash-password", category: "utility", description: "Hash password securely" },
  { name: "verify-password", category: "utility", description: "Verify password hash" },
  { name: "generate-token", category: "utility", description: "Generate authentication token" },
  { name: "validate-token", category: "utility", description: "Validate authentication token" },
  { name: "parse-json", category: "utility", description: "Parse and validate JSON" },
  { name: "format-date", category: "utility", description: "Format date/time" },
  { name: "calculate-hash", category: "utility", description: "Calculate hash of data" },
  
  // API Integration
  { name: "call-external-api", category: "api", description: "Call external REST API" },
  { name: "call-graphql-api", category: "api", description: "Call GraphQL API" },
  { name: "webhook-handler", category: "api", description: "Handle incoming webhooks" },
  
  // AI & ML
  { name: "analyze-sentiment", category: "ai", description: "Analyze text sentiment" },
  { name: "extract-entities", category: "ai", description: "Extract entities from text" },
  { name: "summarize-text", category: "ai", description: "Summarize long text" },
  { name: "translate-text", category: "ai", description: "Translate text to another language" },
  { name: "generate-embeddings", category: "ai", description: "Generate text embeddings" },
  { name: "semantic-search", category: "ai", description: "Perform semantic search" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");

    let functions = ALL_FUNCTIONS;
    
    if (category) {
      functions = ALL_FUNCTIONS.filter(f => f.category === category);
    }

    const categories = [...new Set(ALL_FUNCTIONS.map(f => f.category))];

    return new Response(
      JSON.stringify({
        success: true,
        total: functions.length,
        categories,
        functions,
        message: `Found ${functions.length} edge functions${category ? ` in category '${category}'` : ""}`,
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
