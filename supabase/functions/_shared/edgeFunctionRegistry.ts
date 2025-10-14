// Edge Function Registry - Used by search-edge-functions
// This is a shared registry of all available edge functions

export interface EdgeFunctionCapability {
  name: string;
  url: string;
  description: string;
  capabilities: string[];
  category: 'ai' | 'mining' | 'web' | 'speech' | 'faucet' | 'ecosystem' | 'deployment' | 'github' | 'autonomous' | 'knowledge' | 'task-management' | 'monitoring' | 'code-execution';
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
  }
];