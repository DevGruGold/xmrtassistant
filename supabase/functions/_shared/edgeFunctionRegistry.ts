// Edge Function Registry - Used by search-edge-functions
// This is a shared registry of all available edge functions

export interface EdgeFunctionCapability {
  name: string;
  url: string;
  description: string;
  capabilities: string[];
  category: 'ai' | 'mining' | 'web' | 'speech' | 'faucet' | 'ecosystem' | 'deployment' | 'github' | 'autonomous' | 'knowledge' | 'task-management' | 'monitoring' | 'code-execution' | 'database' | 'network';
  example_use: string;
}

export const EDGE_FUNCTIONS_REGISTRY: EdgeFunctionCapability[] = [
{
    name: 'lovable-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/lovable-chat',
    description: '✅ PRIMARY AI - Model-agnostic chat via Lovable AI Gateway (Gemini 2.5 Flash default, supports OpenAI GPT-5)',
    capabilities: ['Advanced AI chat', 'Context awareness', 'Multi-model support', 'Memory integration', 'Tool calling', 'Multi-step workflows'],
    category: 'ai',
    example_use: 'Main intelligent chat endpoint with full context and memory - use this for all AI chat needs'
  },
  {
    name: 'github-integration',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/github-integration',
    description: 'Complete GitHub OAuth operations - create issues, PRs, comments, discussions',
    capabilities: ['List issues', 'Create issues', 'Comment on issues', 'Create PRs', 'Get file content', 'Search code', 'List discussions'],
    category: 'github',
    example_use: 'Create GitHub issue, list repository issues, manage pull requests'
  },
  {
    name: 'mining-proxy',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/mining-proxy',
    description: 'Unified mining statistics and worker management from SupportXMR',
    capabilities: ['Get mining stats', 'Get worker status', 'Track earnings', 'Monitor hashrate', 'Worker registration'],
    category: 'mining',
    example_use: 'Get comprehensive mining data including pool stats and individual worker performance'
  },
  {
    name: 'agent-manager',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/agent-manager',
    description: 'Primary agent orchestration - create, manage, and monitor AI agents',
    capabilities: ['List agents', 'Spawn agent', 'Update agent status', 'Assign task', 'List tasks', 'Update task', 'Delete task', 'Get workload'],
    category: 'task-management',
    example_use: 'Create a new agent and assign them a task, monitor agent workloads'
  },
  {
    name: 'python-executor',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/python-executor',
    description: 'Sandboxed Python execution via Piston API (stdlib only, no pip)',
    capabilities: ['Execute Python code', 'Data analysis', 'Calculations', 'Network access via proxy', 'Database access via bridge'],
    category: 'code-execution',
    example_use: 'Execute Python to analyze device connection patterns from the last 24 hours'
  },
  {
    name: 'playwright-browse',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/playwright-browse',
    description: 'Web browsing and scraping using Playwright automation',
    capabilities: ['Browse websites', 'Extract data', 'Dynamic content extraction', 'JavaScript rendering', 'Interact with pages'],
    category: 'web',
    example_use: 'Browse websites, extract data, interact with web pages, research real-time information'
  },
  {
    name: 'knowledge-manager',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/knowledge-manager',
    description: 'Knowledge base CRUD operations - store, search, and link entities',
    capabilities: ['Store knowledge', 'Search knowledge', 'Create relationships', 'Get related entities', 'Update confidence'],
    category: 'knowledge',
    example_use: 'Store concepts, link entities, search knowledge graph'
  },
  {
    name: 'task-orchestrator',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/task-orchestrator',
    description: 'Advanced task automation - auto-assign, rebalance, analyze bottlenecks',
    capabilities: ['Auto assign tasks', 'Rebalance workload', 'Identify blockers', 'Clear blocked tasks', 'Analyze bottlenecks', 'Bulk updates'],
    category: 'task-management',
    example_use: 'Automatically distribute all pending tasks to idle agents by priority'
  },
  {
    name: 'system-status',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/system-status',
    description: 'Quick health check - database, agents, tasks status',
    capabilities: ['System health check', 'Database status', 'Agent status', 'Task status', 'Quick diagnostics'],
    category: 'monitoring',
    example_use: 'Get comprehensive system health status'
  },
  {
    name: 'system-diagnostics',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/system-diagnostics',
    description: 'Detailed resource usage and performance metrics',
    capabilities: ['Memory usage', 'CPU usage', 'Database performance', 'Edge function health', 'Deep diagnostics'],
    category: 'monitoring',
    example_use: 'Run detailed system diagnostics when system is slow'
  },
  {
    name: 'autonomous-code-fixer',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/autonomous-code-fixer',
    description: 'Self-healing code execution - auto-fixes and re-executes failed Python',
    capabilities: ['Auto-detect failures', 'Fix syntax errors', 'Fix logic errors', 'Re-execute code', 'Handle API failures'],
    category: 'autonomous',
    example_use: 'Automatically fixes failed Python executions without human intervention'
  },
  {
    name: 'multi-step-orchestrator',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/multi-step-orchestrator',
    description: 'Complex workflow engine for background processing with dependencies',
    capabilities: ['Execute workflows', 'Multi-step tasks', 'Dependency handling', 'Background processing', 'Autonomous workflows'],
    category: 'autonomous',
    example_use: 'Execute debugging workflow: scan logs → identify errors → fix code → verify'
  },
  {
    name: 'search-edge-functions',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/search-edge-functions',
    description: 'Semantic search for edge functions by capability, keywords, or use case',
    capabilities: ['Search functions', 'Find by capability', 'Keyword search', 'Category filter', 'Ranked results'],
    category: 'ecosystem',
    example_use: 'Find the right function when you don\'t know which one to use'
  },
  {
    name: 'xmrt_integration',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/xmrt_integration',
    description: 'Unified ecosystem health & integration hub - connects all XMRT repos (XMRT-Ecosystem, xmrt-wallet-public, mobilemonero, xmrtnet, xmrtdao) for comprehensive health reports and integration monitoring',
    capabilities: [
      'Multi-repository health monitoring',
      'Cross-repo integration verification',
      'Deployment status (Vercel, Render, Supabase)',
      'API health checks (mining, faucet, edge functions)',
      'Database performance metrics',
      'Community engagement analytics',
      'Comprehensive markdown reports',
      'Repository comparison',
      'Integration debugging',
      'Ecosystem-wide status overview'
    ],
    category: 'ecosystem',
    example_use: 'Generate comprehensive ecosystem health report covering all repos, deployments, APIs, and community engagement. Check integration between services. Compare repository activity.'
  },
  {
    name: 'aggregate-device-metrics',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/aggregate-device-metrics',
    description: 'Aggregate and analyze device mining metrics over time',
    capabilities: ["Mining stats", "Device monitoring", "Hashrate tracking"],
    category: 'mining',
    example_use: 'Use aggregate device metrics for aggregate and analyze device mining metrics over time'
  },  {
    name: 'api-key-health-monitor',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/api-key-health-monitor',
    description: 'Monitor health and usage of API keys across services',
    capabilities: ["Health checks", "Performance metrics", "Status monitoring"],
    category: 'monitoring',
    example_use: 'Use api key health monitor for monitor health and usage of api keys across services'
  },  {
    name: 'check-frontend-health',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/check-frontend-health',
    description: 'Health check for frontend application status',
    capabilities: ["Health checks", "Performance metrics", "Status monitoring"],
    category: 'monitoring',
    example_use: 'Use check frontend health for health check for frontend application status'
  },  {
    name: 'cleanup-duplicate-tasks',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/cleanup-duplicate-tasks',
    description: 'Remove duplicate tasks from the task management system',
    capabilities: ["Task creation", "Task assignment", "Workload balancing"],
    category: 'task-management',
    example_use: 'Use cleanup duplicate tasks for remove duplicate tasks from the task management system'
  },  {
    name: 'code-monitor-daemon',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/code-monitor-daemon',
    description: 'Continuous monitoring daemon for code execution and errors',
    capabilities: ["Execute code", "Error handling", "Sandboxed execution"],
    category: 'code-execution',
    example_use: 'Use code monitor daemon for continuous monitoring daemon for code execution and errors'
  },  {
    name: 'community-spotlight-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/community-spotlight-post',
    description: 'Generate and post community spotlight content',
    capabilities: ["Automated posting", "Content generation", "Scheduling"],
    category: 'autonomous',
    example_use: 'Use community spotlight post for generate and post community spotlight content'
  },  {
    name: 'conversation-access',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/conversation-access',
    description: 'Manage conversation access and permissions',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use conversation access for manage conversation access and permissions'
  },  {
    name: 'daily-discussion-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/daily-discussion-post',
    description: 'Generate and post daily discussion topics',
    capabilities: ["Automated posting", "Content generation", "Scheduling"],
    category: 'autonomous',
    example_use: 'Use daily discussion post for generate and post daily discussion topics'
  },  {
    name: 'deepseek-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/deepseek-chat',
    description: 'AI chat via DeepSeek model',
    capabilities: ["AI chat", "Context awareness", "Natural language processing"],
    category: 'ai',
    example_use: 'Use deepseek chat for ai chat via deepseek model'
  },  {
    name: 'ecosystem-monitor',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/ecosystem-monitor',
    description: 'Monitor entire XMRT ecosystem health and status',
    capabilities: ["Health checks", "Performance metrics", "Status monitoring"],
    category: 'monitoring',
    example_use: 'Use ecosystem monitor for monitor entire xmrt ecosystem health and status'
  },  {
    name: 'eliza-python-runtime',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/eliza-python-runtime',
    description: 'Python runtime environment for Eliza agent',
    capabilities: ["Execute code", "Error handling", "Sandboxed execution"],
    category: 'code-execution',
    example_use: 'Use eliza python runtime for python runtime environment for eliza agent'
  },  {
    name: 'enhanced-learning',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/enhanced-learning',
    description: 'Advanced machine learning and pattern recognition',
    capabilities: ["Knowledge storage", "Semantic search", "Entity relationships"],
    category: 'knowledge',
    example_use: 'Use enhanced learning for advanced machine learning and pattern recognition'
  },  {
    name: 'evening-summary-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/evening-summary-post',
    description: 'Generate and post evening summary reports',
    capabilities: ["Automated posting", "Content generation", "Scheduling"],
    category: 'autonomous',
    example_use: 'Use evening summary post for generate and post evening summary reports'
  },  {
    name: 'execute-scheduled-actions',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/execute-scheduled-actions',
    description: 'Execute scheduled tasks and actions',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use execute scheduled actions for execute scheduled tasks and actions'
  },  {
    name: 'extract-knowledge',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/extract-knowledge',
    description: 'Extract and structure knowledge from conversations',
    capabilities: ["Knowledge storage", "Semantic search", "Entity relationships"],
    category: 'knowledge',
    example_use: 'Use extract knowledge for extract and structure knowledge from conversations'
  },  {
    name: 'fetch-auto-fix-results',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/fetch-auto-fix-results',
    description: 'Retrieve results from autonomous code fixing',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use fetch auto fix results for retrieve results from autonomous code fixing'
  },  {
    name: 'gemini-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/gemini-chat',
    description: 'AI chat via Google Gemini model',
    capabilities: ["AI chat", "Context awareness", "Natural language processing"],
    category: 'ai',
    example_use: 'Use gemini chat for ai chat via google gemini model'
  },  {
    name: 'get-code-execution-lessons',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/get-code-execution-lessons',
    description: 'Retrieve lessons learned from code executions',
    capabilities: ["Execute code", "Error handling", "Sandboxed execution"],
    category: 'code-execution',
    example_use: 'Use get code execution lessons for retrieve lessons learned from code executions'
  },  {
    name: 'get-embedding',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/get-embedding',
    description: 'Generate vector embeddings for text',
    capabilities: ["Knowledge storage", "Semantic search", "Entity relationships"],
    category: 'knowledge',
    example_use: 'Use get embedding for generate vector embeddings for text'
  },  {
    name: 'get-lovable-key',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/get-lovable-key',
    description: 'Retrieve Lovable API key',
    capabilities: ["AI chat", "Context awareness", "Natural language processing"],
    category: 'ai',
    example_use: 'Use get lovable key for retrieve lovable api key'
  },  {
    name: 'issue-engagement-command',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/issue-engagement-command',
    description: 'Engage with GitHub issues via commands',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use issue engagement command for engage with github issues via commands'
  },  {
    name: 'kimi-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/kimi-chat',
    description: 'AI chat via Kimi model',
    capabilities: ["AI chat", "Context awareness", "Natural language processing"],
    category: 'ai',
    example_use: 'Use kimi chat for ai chat via kimi model'
  },  {
    name: 'list-available-functions',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/list-available-functions',
    description: 'List all available edge functions',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use list available functions for list all available edge functions'
  },  {
    name: 'monitor-device-connections',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/monitor-device-connections',
    description: 'Monitor mining device connections and status',
    capabilities: ["Mining stats", "Device monitoring", "Hashrate tracking"],
    category: 'mining',
    example_use: 'Use monitor device connections for monitor mining device connections and status'
  },  {
    name: 'morning-discussion-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/morning-discussion-post',
    description: 'Generate and post morning discussion topics',
    capabilities: ["Automated posting", "Content generation", "Scheduling"],
    category: 'autonomous',
    example_use: 'Use morning discussion post for generate and post morning discussion topics'
  },  {
    name: 'nlg-generator',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/nlg-generator',
    description: 'Natural language generation for reports and content',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use nlg generator for natural language generation for reports and content'
  },  {
    name: 'openai-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/openai-chat',
    description: 'AI chat via OpenAI models',
    capabilities: ["AI chat", "Context awareness", "Natural language processing"],
    category: 'ai',
    example_use: 'Use openai chat for ai chat via openai models'
  },  {
    name: 'openai-tts',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/openai-tts',
    description: 'Text-to-speech via OpenAI',
    capabilities: ["AI chat", "Context awareness", "Natural language processing"],
    category: 'ai',
    example_use: 'Use openai tts for text-to-speech via openai'
  },  {
    name: 'predictive-analytics',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/predictive-analytics',
    description: 'Predictive analytics for mining and system metrics',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use predictive analytics for predictive analytics for mining and system metrics'
  },  {
    name: 'process-contributor-reward',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/process-contributor-reward',
    description: 'Process and distribute contributor rewards',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use process contributor reward for process and distribute contributor rewards'
  },  {
    name: 'progress-update-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/progress-update-post',
    description: 'Generate and post progress updates',
    capabilities: ["Automated posting", "Content generation", "Scheduling"],
    category: 'autonomous',
    example_use: 'Use progress update post for generate and post progress updates'
  },  {
    name: 'prometheus-metrics',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/prometheus-metrics',
    description: 'Export Prometheus-compatible metrics',
    capabilities: ["Mining stats", "Device monitoring", "Hashrate tracking"],
    category: 'mining',
    example_use: 'Use prometheus metrics for export prometheus-compatible metrics'
  },  {
    name: 'python-db-bridge',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/python-db-bridge',
    description: 'Bridge for Python code to access database',
    capabilities: ["Execute code", "Error handling", "Sandboxed execution"],
    category: 'code-execution',
    example_use: 'Use python db bridge for bridge for python code to access database'
  },  {
    name: 'python-network-proxy',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/python-network-proxy',
    description: 'Network proxy for Python code execution',
    capabilities: ["Execute code", "Error handling", "Sandboxed execution"],
    category: 'code-execution',
    example_use: 'Use python network proxy for network proxy for python code execution'
  },  {
    name: 'render-api',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/render-api',
    description: 'Interact with Render deployment API',
    capabilities: ["Deployment management", "API integration", "Service control"],
    category: 'deployment',
    example_use: 'Use render api for interact with render deployment api'
  },  {
    name: 'schedule-reminder',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/schedule-reminder',
    description: 'Schedule and send reminders',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use schedule reminder for schedule and send reminders'
  },  {
    name: 'schema-manager',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/schema-manager',
    description: 'Manage database schema and migrations',
    capabilities: ["Database operations", "Schema management", "Data access"],
    category: 'database',
    example_use: 'Use schema manager for manage database schema and migrations'
  },  {
    name: 'self-optimizing-agent-architecture',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/self-optimizing-agent-architecture',
    description: 'Self-optimizing agent system architecture',
    capabilities: ["Task creation", "Task assignment", "Workload balancing"],
    category: 'task-management',
    example_use: 'Use self optimizing agent architecture for self-optimizing agent system architecture'
  },  {
    name: 'summarize-conversation',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/summarize-conversation',
    description: 'Generate conversation summaries',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use summarize conversation for generate conversation summaries'
  },  {
    name: 'system-health',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/system-health',
    description: 'Comprehensive system health monitoring',
    capabilities: ["Health checks", "Performance metrics", "Status monitoring"],
    category: 'monitoring',
    example_use: 'Use system health for comprehensive system health monitoring'
  },  {
    name: 'universal-edge-invoker',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/universal-edge-invoker',
    description: 'Universal invoker for all edge functions',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use universal edge invoker for universal invoker for all edge functions'
  },  {
    name: 'update-api-key',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/update-api-key',
    description: 'Update API keys in the system',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use update api key for update api keys in the system'
  },  {
    name: 'validate-github-contribution',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/validate-github-contribution',
    description: 'Validate GitHub contributions for rewards',
    capabilities: ["GitHub API", "Repository management", "Issue tracking"],
    category: 'github',
    example_use: 'Use validate github contribution for validate github contributions for rewards'
  },  {
    name: 'validate-pop-event',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/validate-pop-event',
    description: 'Validate proof-of-participation events',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use validate pop event for validate proof-of-participation events'
  },  {
    name: 'vectorize-memory',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/vectorize-memory',
    description: 'Convert memories to vector embeddings',
    capabilities: ["Knowledge storage", "Semantic search", "Entity relationships"],
    category: 'knowledge',
    example_use: 'Use vectorize memory for convert memories to vector embeddings'
  },  {
    name: 'vercel-ai-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/vercel-ai-chat',
    description: 'AI chat via Vercel AI SDK',
    capabilities: ["AI chat", "Context awareness", "Natural language processing"],
    category: 'ai',
    example_use: 'Use vercel ai chat for ai chat via vercel ai sdk'
  },  {
    name: 'vercel-ai-chat-stream',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/vercel-ai-chat-stream',
    description: 'Streaming AI chat via Vercel AI SDK',
    capabilities: ["AI chat", "Context awareness", "Natural language processing"],
    category: 'ai',
    example_use: 'Use vercel ai chat stream for streaming ai chat via vercel ai sdk'
  },  {
    name: 'vercel-manager',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/vercel-manager',
    description: 'Manage Vercel deployments',
    capabilities: ["Deployment management", "API integration", "Service control"],
    category: 'deployment',
    example_use: 'Use vercel manager for manage vercel deployments'
  },  {
    name: 'weekly-retrospective-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/weekly-retrospective-post',
    description: 'Generate and post weekly retrospective',
    capabilities: ["Automated posting", "Content generation", "Scheduling"],
    category: 'autonomous',
    example_use: 'Use weekly retrospective post for generate and post weekly retrospective'
  },  {
    name: 'xmrt-mcp-server',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/xmrt-mcp-server',
    description: 'XMRT Model Context Protocol server',
    capabilities: ["Multi-service integration", "Health monitoring", "Status reporting"],
    category: 'ecosystem',
    example_use: 'Use xmrt mcp server for xmrt model context protocol server'
  }
];
