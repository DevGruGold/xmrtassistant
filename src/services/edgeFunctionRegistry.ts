'''import { supabase } from '@/integrations/supabase/client';

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
    description: '✅ PRIMARY AI - Model-agnostic chat via Lovable AI Gateway (Gemini 2.5 Flash default, Kimi K2 OpenRouter fallback, supports OpenAI GPT-5)',
    capabilities: ['Advanced AI chat', 'Context awareness', 'Multi-model support', 'Memory integration', 'Tool calling', 'Multi-step workflows'],
    category: 'ai',
    example_use: 'Main intelligent chat endpoint with full context and memory - use this for all AI chat needs'
  },
  {
    name: 'kimi-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/kimi-chat',
    description: '✅ FALLBACK AI - Model-agnostic chat via Kimi k2 AI Gateway (OpenRouter API)',
    capabilities: ['Advanced AI chat', 'Context awareness', 'Multi-model support', 'Memory integration', 'Tool calling', 'Multi-step workflows'],
    category: 'ai',
    example_use: 'Fallback intelligent chat endpoint with full context and memory - use this for all AI chat needs when primary fails'
  },
  {
    name: 'gemini-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/gemini-chat',
    description: '⚠️ LEGACY - Use lovable-chat instead. Kept for backward compatibility.',
    capabilities: ['AI conversation', 'Context-aware responses', 'Memory integration'],
    category: 'ai',
    example_use: 'DEPRECATED: Use lovable-chat with model parameter instead'
  },
  {
    name: 'openai-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/openai-chat',
    description: '⚠️ LEGACY - Use lovable-chat instead. Kept for backward compatibility.',
    capabilities: ['AI conversation', 'OpenAI GPT-4/GPT-5', 'Fallback AI'],
    category: 'ai',
    example_use: 'DEPRECATED: Use lovable-chat with model parameter instead'
  },
  {
    name: 'deepseek-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/deepseek-chat',
    description: '⚠️ LEGACY - Use lovable-chat instead. Kept for backward compatibility.',
    capabilities: ['Code generation', 'Technical reasoning', 'Code fixing'],
    category: 'ai',
    example_use: 'DEPRECATED: Use lovable-chat with model parameter instead'
  },
  {
    name: 'xmrt-mcp-server',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/xmrt-mcp-server',
    description: 'Model Context Protocol server for XMRT DAO Ecosystem - unified interface exposing all capabilities via standardized MCP protocol',
    capabilities: [
      'MCP protocol compliance (2025-06-18)',
      '25+ unified tools (AI, GitHub, mining, tasks, knowledge, Python)',
      'Real-time resource subscriptions',
      'Pre-configured prompt templates',
      'Cross-repository GitHub operations',
      'AI agent orchestration',
      'Knowledge base integration',
      'Mining & economics monitoring',
      'Task workflow management',
      'Python code execution',
      'System health monitoring'
    ],
    category: 'ecosystem',
    example_use: 'Connect AI agents (Claude Desktop, GPT-5, VS Code extensions) to entire XMRT ecosystem via standardized MCP protocol for seamless tool calling and resource access'
  },
  {
    name: 'playwright-browse',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/playwright-browse',
    description: 'Web browsing and scraping using Playwright automation',
    capabilities: ['Web browsing', 'Page scraping', 'Dynamic content extraction', 'JavaScript rendering'],
    category: 'web',
    example_use: 'Browse websites, extract data, interact with web pages, research real-time information'
  },
  {
    name: 'mining-proxy',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/mining-proxy',
    description: 'Unified mining statistics and worker management - combines pool stats from SupportXMR with worker registration',
    capabilities: [
      'Mining stats (hash rate, shares, earnings)',
      'Worker registration and tracking', 
      'Per-worker statistics',
      'Worker-to-wallet mapping',
      'User session tracking',
      'XMR balance and payments'
    ],
    category: 'mining',
    example_use: 'Get comprehensive mining data including pool stats AND individual worker performance. Also handles mobile miner worker registration.'
  },
  {
    name: 'speech-to-text',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/speech-to-text',
    description: 'Convert speech audio to text',
    capabilities: ['Audio transcription', 'Voice input processing', 'Speech recognition'],
    category: 'speech',
    example_use: 'Process voice input from users for voice-based interactions'
  },
  {
    name: 'text-to-speech',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/text-to-speech',
    description: 'Convert text to speech audio',
    capabilities: ['Voice synthesis', 'Audio generation', 'TTS output'],
    category: 'speech',
    example_use: 'Generate voice responses for users'
  },
  {
    name: 'openai-tts',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/openai-tts',
    description: 'OpenAI high-quality text-to-speech',
    capabilities: ['Premium voice synthesis', 'Multiple voice models', 'High quality audio'],
    category: 'speech',
    example_use: 'Generate high-quality voice responses using OpenAI voices'
  },
  {
    name: 'check-faucet-eligibility',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/check-faucet-eligibility',
    description: 'Check if user is eligible for XMRT faucet claim',
    capabilities: ['Eligibility verification', 'Cooldown checking', 'User validation'],
    category: 'faucet',
    example_use: 'Verify if user can claim XMRT tokens from faucet'
  },
  {
    name: 'claim-faucet-tokens',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/claim-faucet-tokens',
    description: 'Process XMRT token faucet claims',
    capabilities: ['Token distribution', 'Claim processing', 'Transaction creation'],
    category: 'faucet',
    example_use: 'Help users claim free XMRT tokens from the faucet'
  },
  {
    name: 'get-faucet-stats',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/get-faucet-stats',
    description: 'Get XMRT faucet statistics and status',
    capabilities: ['Faucet statistics', 'Distribution data', 'Claim history'],
    category: 'faucet',
    example_use: 'Display faucet usage statistics and availability'
  },
  {
    name: 'ecosystem-webhook',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/ecosystem-webhook',
    description: 'Handle ecosystem events and webhooks',
    capabilities: ['Event processing', 'Webhook handling', 'System notifications'],
    category: 'ecosystem',
    example_use: 'Process ecosystem events and integrate with external services'
  },
  {
    name: 'conversation-access',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/conversation-access',
    description: 'Manage conversation persistence and history',
    capabilities: ['Session management', 'Message storage', 'Conversation retrieval'],
    category: 'ecosystem',
    example_use: 'Store and retrieve conversation history for perfect memory'
  },
  {
    name: 'render-api',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/render-api',
    description: 'Interface with Render deployment API',
    capabilities: ['Deployment status', 'System version tracking', 'Service monitoring'],
    category: 'deployment',
    example_use: 'Track XMRT Ecosystem deployment versions and status'
  },
  {
    name: 'vercel-manager',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/vercel-manager',
    description: 'Frontend (Vercel) communication and monitoring gateway - connects Eliza to the xmrtdao.vercel.app frontend',
    capabilities: ['Send webhooks to frontend', 'Check frontend health status', 'Notify frontend of backend changes', 'Get Vercel project information', 'Monitor frontend availability'],
    category: 'deployment',
    example_use: 'Send webhook notifications to frontend when backend events occur, monitor frontend health, coordinate backend-frontend integration'
  },
  {
    name: 'python-executor',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/python-executor',
    description: 'Execute Python code in a sandboxed environment',
    capabilities: ['Python code execution', 'Data analysis', 'Script automation', 'Web scraping with libraries'],
    category: 'ai',
    example_use: 'Run Python scripts for data processing, analysis, automation, or testing code snippets'
  },
  {
    name: 'github-integration',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/github-integration',
    description: '🔐 Complete GitHub OAuth integration using GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET. Supports 11 actions: list_issues, create_issue, comment_on_issue, list_discussions, create_discussion, get_repo_info, list_pull_requests, create_pull_request, get_file_content, commit_file, search_code',
    capabilities: ['GitHub OAuth authentication', 'Create/manage issues', 'Create PRs', 'Manage discussions', 'Commit files', 'Search code', 'Monitor repos', 'Repository info', 'Code search'],
    category: 'github',
    example_use: 'Use githubIntegrationService to create issues, manage PRs, commit code changes, search repository code with OAuth authentication'
  },
  {
    name: 'agent-manager',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/agent-manager',
    description: 'Spawn, manage, and delegate to AI agents in the ecosystem',
    capabilities: ['Spawn new agents', 'Assign tasks', 'Monitor agent workload', 'Update agent status', 'Log decisions'],
    category: 'task-management',
    example_use: 'Create specialized agents for complex tasks, delegate work, coordinate multi-agent workflows'
  },
  {
    name: 'extract-knowledge',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/extract-knowledge',
    description: 'Extracts structured knowledge entities from conversations',
    capabilities: ['Entity extraction', 'Knowledge graph building', 'Semantic analysis'],
    category: 'knowledge',
    example_use: 'Auto-extract facts and entities from chat messages'
  },
  {
    name: 'knowledge-manager',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/knowledge-manager',
    description: 'Manages the knowledge base and vector embeddings',
    capabilities: ['Vectorize text', 'Knowledge search', 'Data retrieval'],
    category: 'knowledge',
    example_use: 'Search the knowledge base for relevant information'
  },
  {
    name: 'summarize-conversation',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/summarize-conversation',
    description: 'Summarizes long conversations for context',
    capabilities: ['Text summarization', 'Context compression', 'Conversation analysis'],
    category: 'knowledge',
    example_use: 'Summarize chat history to provide context to AI models'
  },
  {
    name: 'task-orchestrator',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/task-orchestrator',
    description: 'Orchestrates complex multi-step tasks and workflows',
    capabilities: ['Task planning', 'Workflow execution', 'Dependency management'],
    category: 'task-management',
    example_use: 'Execute a sequence of dependent tasks to achieve a complex goal'
  },
  {
    name: 'system-diagnostics',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/system-diagnostics',
    description: 'Runs diagnostic checks on the ecosystem',
    capabilities: ['Health checks', 'Error detection', 'Performance monitoring'],
    category: 'monitoring',
    example_use: 'Run a full system health check to identify potential issues'
  },
  {
    name: 'system-health',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/system-health',
    description: 'Provides a summary of the system health status',
    capabilities: ['Status reporting', 'Health summary', 'Issue highlighting'],
    category: 'monitoring',
    example_use: 'Get a quick overview of the current system health'
  },
  {
    name: 'eliza-python-runtime',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/eliza-python-runtime',
    description: 'Python code execution environment for Eliza agents',
    capabilities: ['Sandboxed Python execution', 'Access to libraries', 'Custom script running'],
    category: 'code-execution',
    example_use: 'Execute Python code in a secure environment for agents'
  },
  {
    name: 'python-db-bridge',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/python-db-bridge',
    description: 'Bridge for Python scripts to interact with the Supabase database',
    capabilities: ['Database access from Python', 'Data manipulation', 'Query execution'],
    category: 'code-execution',
    example_use: 'Allow Python scripts to read and write data from the database'
  },
  {
    name: 'python-network-proxy',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/python-network-proxy',
    description: 'Proxy for Python scripts to make external network requests',
    capabilities: ['External API calls', 'Web scraping', 'Data fetching from internet'],
    category: 'code-execution',
    example_use: 'Enable Python scripts to access external web resources'
  }
];

export async function searchEdgeFunctions(query: string): Promise<EdgeFunctionCapability[]> {
  if (!query) {
    return EDGE_FUNCTIONS_REGISTRY;
  }
  
  const lowerCaseQuery = query.toLowerCase();
  
  const filteredFunctions = EDGE_FUNCTIONS_REGISTRY.filter(fn => {
    const { name, description, capabilities, category, example_use } = fn;
    
    return (
      name.toLowerCase().includes(lowerCaseQuery) ||
      description.toLowerCase().includes(lowerCaseQuery) ||
      capabilities.some(cap => cap.toLowerCase().includes(lowerCaseQuery)) ||
      category.toLowerCase().includes(lowerCaseQuery) ||
      example_use.toLowerCase().includes(lowerCaseQuery)
    );
  });
  
  return filteredFunctions;
}

export async function getFunctionByName(name: string): Promise<EdgeFunctionCapability | undefined> {
  return EDGE_FUNCTIONS_REGISTRY.find(fn => fn.name === name);
}

export async function invokeEdgeFunction(functionName: string, body: any, headers?: Record<string, string>) {
  const fn = await getFunctionByName(functionName);
  
  if (!fn) {
    throw new Error(`Function "${functionName}" not found in registry.`);
  }
  
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body,
    headers: headers
  });

  if (error) {
    throw new Error(`Error invoking ${functionName}: ${error.message}`);
  }

  return data;
}
'''
