/**
 * Eliza's Tool Definitions - Single Source of Truth
 * 
 * All AI endpoints (lovable-chat, gemini-chat, deepseek-chat, etc.) should import
 * ELIZA_TOOLS from this file to ensure consistent tool availability across all AI services.
 */

export const ELIZA_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'execute_python',
      description: 'Execute Python code for data analysis, calculations, or processing. User will see execution in PythonShell. CRITICAL: The "requests" module is NOT available. For HTTP calls, use urllib.request from the standard library instead. Example: import urllib.request; urllib.request.urlopen(url). Or better yet, use the call_edge_function tool directly.',
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
      description: 'Call a Supabase edge function directly. Use this for API calls instead of Python requests. Returns the function response.',
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
  }
];
