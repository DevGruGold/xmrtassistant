import { Tool } from "../types.ts";

export const TOOL_REGISTRY: Tool[] = [
  // AI & Conversation Tools
  {
    name: "xmrt_chat",
    description: "Interact with Eliza AI using Gemini with full context and memory",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "User message" },
        session_id: { type: "string", description: "Session identifier for conversation continuity" }
      },
      required: ["message"]
    }
  },
  {
    name: "xmrt_deepseek_chat",
    description: "Interact with DeepSeek AI for code-focused tasks",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "User message" },
        session_id: { type: "string", description: "Session identifier" }
      },
      required: ["message"]
    }
  },
  {
    name: "xmrt_openai_chat",
    description: "Interact with OpenAI GPT for general AI tasks",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "User message" },
        session_id: { type: "string", description: "Session identifier" }
      },
      required: ["message"]
    }
  },

  // GitHub Repository Tools
  {
    name: "xmrt_github_list_repos",
    description: "List all XMRT-related repositories in the DevGruGold organization",
    inputSchema: {
      type: "object",
      properties: {
        org: { type: "string", description: "GitHub organization name", default: "DevGruGold" }
      }
    }
  },
  {
    name: "xmrt_github_create_issue",
    description: "Create an issue in any XMRT repository",
    inputSchema: {
      type: "object",
      properties: {
        repo: { 
          type: "string", 
          description: "Repository name",
          enum: ["XMRT-Ecosystem", "XMRT-EcosystemV2", "xmrt-mcp-servers"]
        },
        title: { type: "string", description: "Issue title" },
        body: { type: "string", description: "Issue description" },
        labels: { 
          type: "array", 
          items: { type: "string" },
          description: "Labels to apply to the issue"
        }
      },
      required: ["repo", "title", "body"]
    }
  },
  {
    name: "xmrt_github_search_code",
    description: "Search code across all XMRT repositories",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        repos: { 
          type: "array", 
          items: { type: "string" },
          description: "Specific repositories to search (optional)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "xmrt_github_get_commits",
    description: "Get recent commits from XMRT repositories",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository name (optional, defaults to all)" },
        limit: { type: "number", description: "Number of commits to retrieve", default: 10 }
      }
    }
  },

  // Mining & Economics Tools
  {
    name: "xmrt_get_mining_stats",
    description: "Get current Monero mining statistics including hashrate and earnings",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "xmrt_check_faucet_eligibility",
    description: "Check if a user is eligible to claim XMRT tokens from the faucet",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "string", description: "User identifier" }
      },
      required: ["user_id"]
    }
  },
  {
    name: "xmrt_claim_faucet",
    description: "Claim XMRT tokens from the faucet",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "string", description: "User identifier" },
        wallet_address: { type: "string", description: "User's wallet address" }
      },
      required: ["user_id", "wallet_address"]
    }
  },

  // Task Orchestration Tools
  {
    name: "xmrt_create_workflow",
    description: "Create a multi-step autonomous workflow",
    inputSchema: {
      type: "object",
      properties: {
        workflow_name: { type: "string", description: "Name of the workflow" },
        steps: { 
          type: "array", 
          items: { type: "object" },
          description: "Array of workflow steps with actions and dependencies"
        },
        priority: { 
          type: "string", 
          enum: ["low", "medium", "high", "critical"],
          description: "Workflow priority level"
        }
      },
      required: ["workflow_name", "steps"]
    }
  },
  {
    name: "xmrt_assign_task_to_agent",
    description: "Assign a task to a specific AI agent in the ecosystem",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Agent identifier" },
        task_description: { type: "string", description: "Description of the task" },
        deadline: { type: "string", description: "Task deadline (ISO 8601 format)" }
      },
      required: ["agent_id", "task_description"]
    }
  },
  {
    name: "xmrt_get_task_status",
    description: "Get the status of a task or workflow",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task or workflow identifier" }
      },
      required: ["task_id"]
    }
  },

  // Knowledge & Memory Tools
  {
    name: "xmrt_store_knowledge",
    description: "Store a knowledge entity in the ecosystem knowledge base",
    inputSchema: {
      type: "object",
      properties: {
        entity_name: { type: "string", description: "Name of the knowledge entity" },
        entity_type: { type: "string", description: "Type/category of the entity" },
        description: { type: "string", description: "Detailed description" },
        metadata: { type: "object", description: "Additional metadata" }
      },
      required: ["entity_name", "entity_type", "description"]
    }
  },
  {
    name: "xmrt_search_knowledge",
    description: "Search the ecosystem knowledge base",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        entity_types: { 
          type: "array", 
          items: { type: "string" },
          description: "Filter by entity types"
        },
        limit: { type: "number", description: "Maximum results to return", default: 10 }
      },
      required: ["query"]
    }
  },
  {
    name: "xmrt_search_memories",
    description: "Search vector-indexed conversation memories",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        user_id: { type: "string", description: "Filter by user ID" },
        limit: { type: "number", description: "Maximum results to return", default: 5 }
      },
      required: ["query", "user_id"]
    }
  },
  {
    name: "xmrt_extract_knowledge",
    description: "Extract structured knowledge from text using AI",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to extract knowledge from" },
        context: { type: "string", description: "Additional context for extraction" }
      },
      required: ["text"]
    }
  },

  // Python Execution Tools
  {
    name: "xmrt_execute_python",
    description: "Execute Python code in a sandboxed environment with auto-fixing capabilities",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Python code to execute" },
        purpose: { type: "string", description: "Purpose/description of the code" },
        timeout: { type: "number", description: "Execution timeout in seconds", default: 30 }
      },
      required: ["code", "purpose"]
    }
  },
  {
    name: "xmrt_fix_python_code",
    description: "Automatically fix Python code errors using AI",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Python code with errors" },
        error_message: { type: "string", description: "Error message received" }
      },
      required: ["code", "error_message"]
    }
  },

  // Monitoring & System Tools
  {
    name: "xmrt_get_system_status",
    description: "Get real-time ecosystem health status",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "xmrt_get_ecosystem_metrics",
    description: "Get comprehensive ecosystem metrics and analytics",
    inputSchema: {
      type: "object",
      properties: {
        timeframe: { 
          type: "string", 
          enum: ["1h", "24h", "7d", "30d"],
          description: "Timeframe for metrics",
          default: "24h"
        }
      }
    }
  },
  {
    name: "xmrt_get_diagnostics",
    description: "Run comprehensive system diagnostics",
    inputSchema: {
      type: "object",
      properties: {
        component: { 
          type: "string", 
          description: "Specific component to diagnose (optional)" 
        }
      }
    }
  },

  // Self-Optimization Tools
  {
    name: "xmrt_analyze_skill_gaps",
    description: "Identify missing skills causing task blockages and propose learning paths",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "xmrt_optimize_task_routing",
    description: "Re-route tasks based on agent performance history and specializations",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "xmrt_detect_specializations",
    description: "Detect agent specializations and propose role changes",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "xmrt_forecast_workload",
    description: "Predict future task volume and recommend resource adjustments",
    inputSchema: {
      type: "object",
      properties: {
        timeframe: { 
          type: "string", 
          enum: ["1h", "24h", "7d"],
          description: "Forecast timeframe",
          default: "24h"
        }
      }
    }
  },
  {
    name: "xmrt_autonomous_debugging",
    description: "Detect system anomalies and orchestrate autonomous debugging workflows",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "xmrt_run_full_optimization",
    description: "Run complete optimization cycle: skill gaps, task routing, specializations, workload forecasting, and debugging",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];
