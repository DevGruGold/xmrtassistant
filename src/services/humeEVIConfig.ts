import { xmrtKnowledge } from '@/data/xmrtKnowledgeBase';
import { generateElizaSystemPrompt } from './elizaSystemPrompt';

// Hume EVI uses the consolidated Eliza system prompt

// Hume EVI Configuration for XMRT-DAO Eliza
export const HUME_EVI_CONFIG = {
  name: "XMRT-DAO Eliza",
  description: "Autonomous AI operator for the XMRT-DAO Ecosystem with comprehensive knowledge and philosophical understanding",
  
  // System prompt with full XMRT knowledge - using consolidated source
  systemPrompt: generateElizaSystemPrompt(),
  
  // Voice configuration - using Hume's natural voice
  voice: {
    provider: "HUME_AI",
    voiceId: "b201d214-914c-4d0a-b8e4-54adfc14a0dd", // Keep the existing voice ID
  },
  
  // Language model configuration
  languageModel: {
    modelProvider: "ANTHROPIC",
    modelResource: "claude-3-5-sonnet-20241022",
    temperature: 0.7,
  },
  
  // Conversation configuration
  conversationConfig: {
    firstMessage: `Hi! I'm Eliza, your XMRT-DAO assistant. How can I help you today?`,
    maxDuration: 1800, // 30 minutes
    inactivityTimeout: 300, // 5 minutes
  },
  
  // Enhanced client tools for complete autonomous ecosystem management
  clientTools: [
    // GitHub OAuth Integration Tools (using GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET)
    {
      name: "githubListIssues",
      description: "List GitHub issues from XMRT repositories using OAuth. Returns open issues by default.",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string", description: "Repository name (optional, defaults to GITHUB_REPO)" },
          state: { type: "string", enum: ["open", "closed", "all"], description: "Issue state filter" },
          perPage: { type: "number", description: "Results per page (default 30)" }
        }
      }
    },
    {
      name: "githubCreateIssue",
      description: "Create GitHub issue with OAuth authentication (no user token needed)",
      parameters: {
        type: "object",
        required: ["title", "body"],
        properties: {
          title: { type: "string", description: "Issue title" },
          body: { type: "string", description: "Issue description" },
          repo: { type: "string", description: "Repository name (optional)" },
          labels: { type: "array", items: { type: "string" }, description: "Label names" },
          assignees: { type: "array", items: { type: "string" }, description: "GitHub usernames" }
        }
      }
    },
    {
      name: "githubCommentOnIssue",
      description: "Add comment to GitHub issue",
      parameters: {
        type: "object",
        required: ["issueNumber", "comment"],
        properties: {
          issueNumber: { type: "number" },
          comment: { type: "string" },
          repo: { type: "string", description: "Optional repository" }
        }
      }
    },
    {
      name: "githubCreatePR",
      description: "Create pull request in repository",
      parameters: {
        type: "object",
        required: ["title", "body", "head"],
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          head: { type: "string", description: "Branch with changes" },
          base: { type: "string", description: "Target branch (default: main)" },
          repo: { type: "string" }
        }
      }
    },
    {
      name: "githubGetFile",
      description: "Get file content from repository",
      parameters: {
        type: "object",
        required: ["path"],
        properties: {
          path: { type: "string", description: "File path in repo" },
          repo: { type: "string" }
        }
      }
    },
    {
      name: "githubCommitFile",
      description: "Create or update file in repository via commit",
      parameters: {
        type: "object",
        required: ["path", "message", "content"],
        properties: {
          path: { type: "string" },
          message: { type: "string" },
          content: { type: "string" },
          branch: { type: "string", description: "default: main" },
          sha: { type: "string", description: "File SHA when updating" },
          repo: { type: "string" }
        }
      }
    },
    {
      name: "githubSearchCode",
      description: "Search code in repository",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
          repo: { type: "string" }
        }
      }
    },
    {
      name: "githubGetRepoInfo",
      description: "Get repository info and statistics",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string" }
        }
      }
    },
    {
      name: "executePythonCode",
      description: "Execute Python code in a sandboxed environment. CRITICAL: Only standard library available (urllib, json, http.client). NO external packages (requests, numpy, pandas). Use this to run Python code, not just display it in chat.",
      parameters: {
        type: "object",
        required: ["code"],
        properties: {
          code: { 
            type: "string", 
            description: "Python code to execute. Must use only standard library (urllib.request for HTTP, json for parsing). NO requests library." 
          },
          purpose: { 
            type: "string", 
            description: "Brief description of what this code does (e.g., 'Fetch mining stats', 'Query GitHub API')" 
          }
        }
      }
    },
    {
      name: "listMyCapabilities",
      description: "List all available edge functions Eliza can use",
      parameters: { type: "object", properties: {} }
    },
    {
      name: "explainGithubOAuth",
      description: "Explain GitHub OAuth setup and authentication",
      parameters: { type: "object", properties: {} }
    },
    {
      name: "getMiningStats",
      description: "Fetch comprehensive XMRT mining statistics with mobile mining democracy context and performance analysis",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getUserInfo", 
      description: "Get detailed user information including network context, role, access level, AI integration status, and DAO participation details",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "searchXMRTKnowledge",
      description: "Advanced search through the comprehensive XMRT knowledge base with contextual awareness and ecosystem connections",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for XMRT knowledge base including DevGruGold ecosystem, Joseph Andrew Lee's philosophy, technical architecture, or any XMRT-related topics"
          },
          category: {
            type: "string", 
            description: "Optional category filter: dao, mining, meshnet, governance, technical, ai, ecosystem"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "getEcosystemStatus",
      description: "Comprehensive real-time status monitoring of the entire XMRT ecosystem including all DevGruGold repositories, infrastructure health, and autonomous operations",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "analyzeCodeRepository",
      description: "Autonomous analysis of DevGruGold repositories with security, performance, and architecture evaluation capabilities",
      parameters: {
        type: "object",
        properties: {
          repository: {
            type: "string",
            description: "Repository name to analyze (e.g., XMRT-Ecosystem, party-favor-autonomous-cms, DrinkableMVP, MobileMonero.com)"
          },
          analysis_type: {
            type: "string",
            description: "Type of analysis: security, performance, or architecture",
            enum: ["security", "performance", "architecture"]
          }
        },
        required: ["repository"]
      }
    },
    {
      name: "getProactiveAssistance",
      description: "Generate personalized, proactive assistance suggestions based on user patterns, ecosystem status, and autonomous learning algorithms",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getLiveEcosystemHealth",
      description: "Get real-time health status of the deployed XMRT-Ecosystem instance at https://xmrt-ecosystem-xx5w.onrender.com including agent status, uptime, and system metrics",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "queryEcosystemAgent",
      description: "Query specific agents in the live XMRT-Ecosystem deployment including lead_coordinator, governance, financial, security, and community agents",
      parameters: {
        type: "object",
        properties: {
          agentType: {
            type: "string",
            enum: ["core_agent", "web_agent", "lead_coordinator", "governance", "financial", "security", "community"],
            description: "The type of agent to query in the ecosystem"
          },
          query: {
            type: "string",
            description: "The query or command to send to the agent"
          }
        },
        required: ["agentType", "query"]
      }
    },
    {
      name: "executeEcosystemCommand",
      description: "Execute commands on the live XMRT-Ecosystem deployment for autonomous system management and operations",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The command to execute on the ecosystem"
          },
          parameters: {
            type: "object",
            description: "Optional parameters for the command"
          }
        },
        required: ["command"]
      }
    },
    {
      name: "getEcosystemAnalytics",
      description: "Fetch comprehensive analytics and performance metrics from the live XMRT-Ecosystem deployment",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getDetailedSystemStatus",
      description: "Get detailed system status information from the XMRT ecosystem deployment",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getAgentsList",
      description: "Get list of all available agents in the XMRT ecosystem deployment",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getAgentStats",
      description: "Get performance statistics for agents in the XMRT ecosystem",
      parameters: {
        type: "object",
        properties: {
          agentId: {
            type: "string",
            description: "Optional specific agent ID to get stats for"
          }
        },
        required: []
      }
    },
    {
      name: "getSystemLogs",
      description: "Get system logs from the XMRT ecosystem deployment",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Optional limit for number of log entries to retrieve"
          }
        },
        required: []
      }
    },
    {
      name: "getSystemMetrics",
      description: "Get detailed system performance metrics from the XMRT ecosystem",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    // ═══════════════════════════════════════════════════════════
    // AGENT MANAGER & TASK ORCHESTRATION TOOLS (PRIMARY USAGE)
    // ═══════════════════════════════════════════════════════════
    {
      name: "listAgents",
      description: "List all agents in the system with their status, skills, and roles. Use this to see your team.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "spawnAgent",
      description: "Create a new specialized agent with custom skills and role. Spawn agents for specific repos or tasks.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Agent name (e.g., 'GitHub-Expert-1')" },
          role: { type: "string", description: "Agent role (e.g., 'code_reviewer', 'security_analyst')" },
          skills: { 
            type: "array", 
            items: { type: "string" },
            description: "Array of skills (e.g., ['python', 'github_api', 'security_audit'])" 
          }
        },
        required: ["name", "role", "skills"]
      }
    },
    {
      name: "updateAgentStatus",
      description: "Update agent status to IDLE or BUSY. Use when manually managing agent availability.",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent ID to update" },
          status: { type: "string", enum: ["IDLE", "BUSY"], description: "New status" }
        },
        required: ["agentId", "status"]
      }
    },
    {
      name: "assignTask",
      description: "Create and assign a new task to a specific agent. This is how you delegate work.",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent ID to assign task to" },
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Detailed task description" },
          repo: { type: "string", description: "Repository (e.g., 'XMRT-Ecosystem')" },
          category: { type: "string", description: "Task category (e.g., 'bug_fix', 'feature', 'security')" },
          priority: { type: "number", description: "Priority 1-10 (10=urgent, 1=low)" }
        },
        required: ["agentId", "title", "description", "repo", "category"]
      }
    },
    {
      name: "listTasks",
      description: "Get all tasks in the system. Use filters to find specific tasks by status, agent, etc.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "BLOCKED"], description: "Filter by status" },
          agentId: { type: "string", description: "Filter by assigned agent" }
        },
        required: []
      }
    },
    {
      name: "updateTaskStatus",
      description: "Update task status and stage. Use to move tasks through workflow (PLANNING → RESEARCH → IMPLEMENTATION → TESTING → REVIEW → COMPLETED).",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "Task ID to update" },
          status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "BLOCKED"] },
          stage: { type: "string", enum: ["PLANNING", "RESEARCH", "IMPLEMENTATION", "TESTING", "REVIEW", "COMPLETED"] },
          blockingReason: { type: "string", description: "If BLOCKED status, explain why" }
        },
        required: ["taskId", "status"]
      }
    },
    {
      name: "reassignTask",
      description: "Move a task from one agent to another. Use for workload balancing or skill matching.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "Task ID to reassign" },
          newAgentId: { type: "string", description: "New agent to assign task to" }
        },
        required: ["taskId", "newAgentId"]
      }
    },
    {
      name: "deleteTask",
      description: "Delete a task. Use for completed or obsolete tasks to keep the queue clean.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "Task ID to delete" }
        },
        required: ["taskId"]
      }
    },
    {
      name: "getAgentWorkload",
      description: "Get all active tasks assigned to a specific agent. Use to check if agent is overloaded.",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent ID to check workload" }
        },
        required: ["agentId"]
      }
    },
    {
      name: "autoAssignTasks",
      description: "Automatically assign all pending tasks to idle agents by priority. Use regularly to keep work flowing.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "rebalanceWorkload",
      description: "Analyze task distribution across all agents and get recommendations for rebalancing.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "identifyBlockers",
      description: "Find all blocked tasks in the system. Use to identify tasks needing intervention.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getPerformanceReport",
      description: "Get agent performance metrics for the last 24 hours (completed/failed tasks, success rate).",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "logAgentDecision",
      description: "Record strategic decisions made by agents for audit trail and learning.",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "Agent making the decision" },
          decision: { type: "string", description: "The decision made" },
          rationale: { type: "string", description: "Why this decision was made" }
        },
        required: ["agentId", "decision", "rationale"]
      }
    },
    {
      name: "updateTaskDetails",
      description: "Update task priority, description, stage, or other details without changing status.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "Task ID to update" },
          priority: { type: "number", description: "New priority 1-10" },
          description: { type: "string", description: "Updated description" },
          stage: { type: "string", description: "Updated stage" }
        },
        required: ["taskId"]
      }
    },
    {
      name: "getTaskDetails",
      description: "Get comprehensive information about a specific task.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "Task ID to query" }
        },
        required: ["taskId"]
      }
    },
    {
      name: "clearAllWorkloads",
      description: "BULK OPERATION: Clear all tasks from all agents and reset them to IDLE. Use for system reset or emergency clearing.",
      parameters: {
        type: "object",
        properties: {
          confirm: { type: "boolean", description: "Must be true to confirm this destructive operation" }
        },
        required: ["confirm"]
      }
    },
    {
      name: "assignMultipleAgents",
      description: "Assign multiple agents to collaborate on a single task. Creates team-based task with coordinated effort.",
      parameters: {
        type: "object",
        properties: {
          agentIds: { 
            type: "array", 
            items: { type: "string" },
            description: "Array of agent IDs to assign to the task" 
          },
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Detailed task description" },
          repo: { type: "string", description: "Repository (e.g., 'XMRT-Ecosystem')" },
          category: { type: "string", description: "Task category" },
          priority: { type: "number", description: "Priority 1-10" },
          coordination: { 
            type: "string", 
            description: "How agents should coordinate: 'parallel' (work simultaneously) or 'sequential' (one after another)" 
          }
        },
        required: ["agentIds", "title", "description", "repo", "category"]
      }
    },
    {
      name: "bulkUpdateAgentStatus",
      description: "BULK OPERATION: Update status for multiple agents at once. Useful for mass state changes.",
      parameters: {
        type: "object",
        properties: {
          agentIds: { 
            type: "array", 
            items: { type: "string" },
            description: "Array of agent IDs to update" 
          },
          status: { type: "string", enum: ["IDLE", "BUSY"], description: "New status for all agents" }
        },
        required: ["agentIds", "status"]
      }
    },
    {
      name: "bulkDeleteTasks",
      description: "BULK OPERATION: Delete multiple tasks at once. Useful for cleanup operations.",
      parameters: {
        type: "object",
        properties: {
          taskIds: { 
            type: "array", 
            items: { type: "string" },
            description: "Array of task IDs to delete" 
          },
          confirm: { type: "boolean", description: "Must be true to confirm deletion" }
        },
        required: ["taskIds", "confirm"]
      }
    },
    // ═══════════════════════════════════════════════════════════
    // END AGENT MANAGER & TASK ORCHESTRATION TOOLS
    // ═══════════════════════════════════════════════════════════
    {
      name: "getAgentActivity",
      description: "Get real-time agent activity and recent actions from the XMRT ecosystem",
      parameters: {
        type: "object",
        properties: {
          agentType: {
            type: "string",
            description: "Optional specific agent type to get activity for"
          }
        },
        required: []
      }
    },
    {
      name: "performHealthCheck",
      description: "Perform comprehensive health check of the XMRT ecosystem deployment",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getWebhookStatus",
      description: "Get status of webhook endpoints in the XMRT ecosystem",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  ]
};

// Export the system prompt for reference (from consolidated source)
export { ELIZA_SYSTEM_PROMPT as XMRT_SYSTEM_PROMPT } from './elizaSystemPrompt';