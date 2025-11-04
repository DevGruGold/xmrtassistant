/**
 * Eliza's Tool Definitions - Single Source of Truth
 * 
 * All AI endpoints (lovable-chat, gemini-chat, deepseek-chat, etc.) should import
 * ELIZA_TOOLS from this file to ensure consistent tool availability across all AI services.
 * 
 * ⚡ CRITICAL: ALL TOOLS EXECUTE REAL FUNCTIONS, NOT SIMULATIONS
 * - Tools appear in "🐍 Eliza's Code Execution Log" sidebar monitor
 * - Eliza MUST wait for actual results before responding to user
 * - Chat shows analysis/outcomes, not raw code (code is in execution log)
 */


export const ELIZA_TOOLS = [
    {
      name: 'get_function_usage_analytics',
      description: 'Query historical edge function usage patterns. See which functions you and other executives use most, success rates, common use cases, and execution patterns. Use this to learn from past behavior and make informed decisions about which functions to call.',
      parameters: {
        type: 'object',
        properties: {
          function_name: { type: 'string', description: 'Optional: specific function to analyze' },
          executive_name: { type: 'string', description: 'Optional: filter by CSO, CTO, CIO, or CAO' },
          time_period_hours: { type: 'number', description: 'Look back period in hours (default 168 = 1 week)' },
          min_usage_count: { type: 'number', description: 'Only show functions used at least N times' }
        }
      }
    },
    {
      name: 'propose_new_edge_function',
      description: 'Propose a new edge function to the Executive Council. Requires consensus (3/4 votes) for approval and automatic deployment. Use this when you identify a capability gap that would benefit the ecosystem.',
      parameters: {
        type: 'object',
        properties: {
          function_name: { type: 'string', description: 'Name for the new function (kebab-case)' },
          description: { type: 'string', description: 'What this function does' },
          category: { type: 'string', description: 'Category (ai, mining, github, code, analytics, etc.)' },
          rationale: { type: 'string', description: 'Why we need this function' },
          use_cases: { type: 'array', items: { type: 'string' }, description: 'Specific use cases' },
          implementation_outline: { type: 'string', description: 'High-level implementation approach' }
        },
        required: ['function_name', 'description', 'category', 'rationale', 'use_cases']
      }
    },
    {
      name: 'vote_on_function_proposal',
      description: 'Cast your vote on a pending edge function proposal. Requires 3/4 executive approval for deployment. Your vote and reasoning become part of the permanent record.',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: { type: 'string', description: 'UUID of the proposal' },
          vote: { type: 'string', enum: ['approve', 'reject', 'abstain'], description: 'Your vote' },
          reasoning: { type: 'string', description: 'Detailed reasoning for your vote' }
        },
        required: ['proposal_id', 'vote', 'reasoning']
      }
    },
    {
      name: 'list_function_proposals',
      description: 'List all edge function proposals (pending, voting, approved, deployed). See what new capabilities are being proposed and vote on them.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'voting', 'approved', 'rejected', 'deployed'], description: 'Filter by status' }
        }
      }
    },
    {
      name: 'invoke_edge_function',
      description: 'UNIVERSAL EDGE FUNCTION INVOKER - Call ANY of the 80+ Supabase edge functions dynamically. This is your MCP integration tool. You can invoke: AI chat functions, Python execution, GitHub integration, agent management, task orchestration, monitoring daemons, database operations, network proxies, and more. Available functions: gemini-chat, python-executor, github-integration, agent-manager, task-orchestrator, autonomous-code-fixer, code-monitor-daemon, mining-proxy, ecosystem-monitor, system-diagnostics, and 50+ more. Use this when you need capabilities beyond your standard tools.',
      parameters: {
        type: 'object',
        properties: {
          function_name: { 
            type: 'string', 
            description: 'Name of the edge function to invoke (e.g., "python-executor", "github-integration", "system-diagnostics")' 
          },
          payload: { 
            type: 'object', 
            description: 'JSON payload to send to the function. Structure depends on the target function.' 
          }
        },
        required: ['function_name', 'payload']
      }
    },
    {
      name: 'list_available_functions',
      description: 'List all available Supabase edge functions you can invoke. Returns categorized list of 80+ functions with descriptions. Use this to discover what capabilities you have access to.',
      parameters: {
        type: 'object',
        properties: {
          category: { 
            type: 'string', 
            description: 'Optional: Filter by category (AI & Chat, Python Execution & Code, GitHub Integration, Agent Management, Task Management, Mining & DAO, Monitoring & Daemon, Database & Data, Network & Proxy, Other)' 
          }
        }
      }
    },
{
      name: 'get_code_execution_lessons',
      description: 'Retrieve lessons learned from recent code executions. Use this to learn what code patterns work vs fail, and improve your code generation. Returns: recent execution results, auto-fix patterns, success/failure analysis.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of recent executions to analyze (default 10)' },
          include_failures_only: { type: 'boolean', description: 'Only include failed executions to learn from mistakes' }
        }
      }
    },
{
    type: 'function',
    function: {
      name: 'execute_python',
      description: 'BACKGROUND EXECUTION: Write and execute Python code in background sandbox ONLY. Code NEVER appears in chat. You write code → background system executes it → auto-fixer corrects errors → results feed back to you. Communicate ONLY outcomes and insights to user, NEVER show raw code. CRITICAL: The "requests" module is NOT available. For HTTP calls, use urllib.request from the standard library instead. Example: import urllib.request; urllib.request.urlopen(url). Or better yet, use the call_edge_function tool directly.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The Python code to execute. DO NOT import requests - use urllib.request instead or use call_edge_function tool' },
          purpose: { type: 'string', description: 'Brief description of what this code does' }
        },
        required: ['code', 'purpose']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'call_edge_function',
      description: 'REAL EXECUTION: Call actual Supabase edge function. Execution appears in "🐍 Eliza\'s Code Execution Log" sidebar. Wait for result, then communicate outcome to user.',
      parameters: {
        type: 'object',
        properties: {
          function_name: { type: 'string', description: 'Edge function name (e.g., github-integration, mining-proxy)' },
          body: { type: 'object', description: 'Request body to send to the function' },
          purpose: { type: 'string', description: 'What this call is for' }
        },
        required: ['function_name', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createGitHubDiscussion',
      description: 'Create a GitHub discussion post in XMRT-Ecosystem repository. Returns discussion URL and ID. Use for announcements, updates, or community engagement.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Discussion title' },
          body: { type: 'string', description: 'Discussion content (supports Markdown)' },
          categoryId: { 
            type: 'string', 
            description: 'Category ID (default: DIC_kwDOPHeChc4CkXxI for General)', 
            default: 'DIC_kwDOPHeChc4CkXxI' 
          }
        },
        required: ['title', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createGitHubIssue',
      description: 'Create a GitHub issue in any XMRT repository. Returns issue number and URL.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Repository name (default: XMRT-Ecosystem)', default: 'XMRT-Ecosystem' },
          title: { type: 'string', description: 'Issue title' },
          body: { type: 'string', description: 'Issue description (supports Markdown)' },
          labels: { type: 'array', items: { type: 'string' }, description: 'Optional labels (e.g., ["bug", "urgent"])' }
        },
        required: ['title', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listGitHubIssues',
      description: 'List recent GitHub issues from XMRT repositories.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Repository name (default: XMRT-Ecosystem)' },
          state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Issue state filter', default: 'open' },
          limit: { type: 'number', description: 'Number of issues to return (max 100)', default: 20 }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_agents',
      description: 'Get all existing agents and their IDs/status. ALWAYS call this BEFORE assigning tasks to know agent IDs.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'spawn_agent',
      description: 'Create a new specialized agent. Returns agent with ID. User will see agent in TaskVisualizer.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Agent name' },
          role: { type: 'string', description: 'Agent role/specialization' },
          skills: { type: 'array', items: { type: 'string' }, description: 'Array of agent skills' }
        },
        required: ['name', 'role', 'skills']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_agent_status',
      description: 'Change agent status to show progress (IDLE, BUSY, WORKING, COMPLETED, ERROR).',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: 'Agent ID (e.g., agent-1759625833505)' },
          status: { type: 'string', enum: ['IDLE', 'BUSY', 'WORKING', 'COMPLETED', 'ERROR'], description: 'New status' }
        },
        required: ['agent_id', 'status']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'assign_task',
      description: 'Create and assign a task to an agent using their ID (NOT name). User will see task in TaskVisualizer.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          repo: { type: 'string', description: 'Repository name (e.g., XMRT-Ecosystem)' },
          category: { type: 'string', description: 'Task category (e.g., development, documentation)' },
          stage: { type: 'string', description: 'Development stage (e.g., planning, implementation)' },
          assignee_agent_id: { type: 'string', description: 'Agent ID from list_agents or spawn_agent result' },
          priority: { type: 'number', description: 'Priority 1-10, default 5' }
        },
        required: ['title', 'description', 'repo', 'category', 'stage', 'assignee_agent_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_task_status',
      description: 'Update task status and stage as agents work on it.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID' },
          status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'FAILED'], description: 'New status' },
          stage: { type: 'string', description: 'New stage (e.g., planning, development, testing)' }
        },
        required: ['task_id', 'status']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'Get all tasks and their status/assignments to see what agents are working on.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_agent_workload',
      description: 'Get current workload and active tasks for a specific agent.',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: 'Agent ID to check workload for' }
        },
        required: ['agent_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Delete a task permanently. Use when task is no longer needed or was created in error.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID to delete' },
          reason: { type: 'string', description: 'Reason for deletion' }
        },
        required: ['task_id', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'reassign_task',
      description: 'Reassign a task to a different agent.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID to reassign' },
          new_assignee_id: { type: 'string', description: 'New agent ID to assign task to' },
          reason: { type: 'string', description: 'Reason for reassignment' }
        },
        required: ['task_id', 'new_assignee_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_task_details',
      description: 'Update task details like title, description, priority, category, or repo.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID to update' },
          title: { type: 'string', description: 'New task title' },
          description: { type: 'string', description: 'New task description' },
          priority: { type: 'number', description: 'New priority (1-10)' },
          category: { type: 'string', description: 'New category' },
          repo: { type: 'string', description: 'New repository' }
        },
        required: ['task_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mark_task_complete',
      description: 'Mark a task as completed. Shortcut for update_task_status with COMPLETED status.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID to mark complete' },
          completion_notes: { type: 'string', description: 'Notes about task completion' }
        },
        required: ['task_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_task_details',
      description: 'Get detailed information about a specific task.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'Task ID to get details for' }
        },
        required: ['task_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'report_progress',
      description: 'Report progress on an ongoing task.',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: 'Agent reporting progress' },
          agent_name: { type: 'string', description: 'Agent name' },
          task_id: { type: 'string', description: 'Task ID' },
          progress_message: { type: 'string', description: 'Progress update message' },
          progress_percentage: { type: 'number', description: 'Progress percentage (0-100)' },
          current_stage: { type: 'string', description: 'Current stage of work' }
        },
        required: ['agent_id', 'agent_name', 'task_id', 'progress_message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'request_task_assignment',
      description: 'Request automatic assignment of the next highest priority pending task to an agent.',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: 'Agent requesting assignment' },
          agent_name: { type: 'string', description: 'Agent name' }
        },
        required: ['agent_id', 'agent_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_decision',
      description: 'Log an important decision or reasoning for audit trail.',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: 'Agent making decision (default: eliza)' },
          decision: { type: 'string', description: 'The decision made' },
          rationale: { type: 'string', description: 'Reasoning behind the decision' }
        },
        required: ['decision', 'rationale']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cleanup_duplicate_tasks',
      description: 'Remove duplicate tasks from the database, keeping only the oldest instance of each duplicate.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cleanup_duplicate_agents',
      description: 'Remove duplicate agents from the database, keeping only the oldest instance of each agent name.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_system_status',
      description: 'Get comprehensive system health status including all edge functions, database health, and agent status.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_edge_functions',
      description: 'Search for edge functions by capability, keywords, or use case. Use when you need to find the right function for a task you want to accomplish.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What you want to do (e.g., "create GitHub issue", "get mining stats", "browse website")' },
          category: { type: 'string', description: 'Optional category filter (ai, mining, web, github, autonomous, knowledge, monitoring, code-execution, ecosystem)' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_ecosystem_health',
      description: 'Get comprehensive health status of entire XMRT ecosystem - all repos, deployments, APIs, and integrations. Use this for "ecosystem health", "system status", or "how are things" queries.',
      parameters: {
        type: 'object',
        properties: {
          include_repos: { 
            type: 'array', 
            items: { type: 'string' }, 
            description: 'Optional: specific repos to check (e.g., ["XMRT-Ecosystem", "mobilemonero"])' 
          },
          detailed: { 
            type: 'boolean', 
            description: 'Include detailed metrics (default: true)' 
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_health_report',
      description: 'Generate comprehensive markdown health report covering all XMRT ecosystem components, integrations, and status.',
      parameters: {
        type: 'object',
        properties: {
          format: { 
            type: 'string', 
            enum: ['markdown', 'json'], 
            description: 'Report format (default: markdown)' 
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'evaluate_community_idea',
      description: 'COMMUNITY IDEA EVALUATION - Evaluate a community-submitted idea through the lens of XMRT values. Scores idea on Financial Sovereignty (0-100), Democracy (0-100), Privacy (0-100), Technical Feasibility (0-100), and Community Benefit (0-100). Convenes executive council for strategic review. Auto-approves ideas scoring 65+ average. Creates implementation tasks for approved ideas.',
      parameters: {
        type: 'object',
        properties: {
          ideaId: { 
            type: 'string', 
            description: 'UUID of the community idea to evaluate' 
          },
          action: {
            type: 'string',
            enum: ['evaluate_pending', 'evaluate_single'],
            description: 'Action type: evaluate_pending processes all pending ideas, evaluate_single processes specific idea'
          }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'scan_for_opportunities',
      description: 'PROACTIVE OPPORTUNITY DETECTION - Scan XMRT DAO infrastructure for improvement opportunities. Detects: underutilized components, performance bottlenecks, data patterns, integration gaps, community pain points. Logs findings to opportunity_log table with priority scoring. Run this every 15 minutes for 24/7 vigilance.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['scan', 'generate_report'],
            description: 'Action type: scan discovers opportunities, generate_report creates daily summary'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'make_autonomous_decision',
      description: 'AUTONOMOUS DECISION MAKING - Make strategic decisions on detected opportunities. Executes decision tree: Can I auto-fix? → Do I need executive council? → Should I create agent task? → Is this a community idea? Auto-implements simple optimizations, convenes council for complex decisions, creates tasks for agents.',
      parameters: {
        type: 'object',
        properties: {
          opportunityId: { 
            type: 'string', 
            description: 'UUID of the opportunity from opportunity_log to act upon' 
          }
        },
        required: ['opportunityId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'perform_self_evaluation',
      description: 'CONTINUOUS LEARNING & SELF-IMPROVEMENT - Analyze recent performance, extract patterns, expand capabilities, set goals. Reviews last 24 hours: task success rate, tool execution patterns, discovered errors. Stores learned patterns in eliza_work_patterns. Updates daily performance metrics. Sets improvement goals for next cycle.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_system_knowledge',
      description: 'SYSTEM ARCHITECTURE DISCOVERY - Scan and catalog all infrastructure components. Discovers: 87+ database tables, 125+ edge functions, 20+ cron jobs, Vercel deployments. Maps relationships between components. Stores in system_architecture_knowledge table for intimate awareness of the entire system.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];
