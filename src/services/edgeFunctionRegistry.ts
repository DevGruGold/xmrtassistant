import { supabase } from '@/integrations/supabase/client';

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
    description: 'Manages knowledge base with CRUD operations',
    capabilities: ['Knowledge CRUD', 'Entity relationships', 'Knowledge queries'],
    category: 'knowledge',
    example_use: 'Store and retrieve knowledge entities'
  },
  {
    name: 'vectorize-memory',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/vectorize-memory',
    description: 'Creates vector embeddings for memory contexts (auto-triggered)',
    capabilities: ['Vector embeddings', 'Semantic search', 'Memory indexing'],
    category: 'knowledge',
    example_use: 'Automatically generates embeddings when new memories are created'
  },
  {
    name: 'summarize-conversation',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/summarize-conversation',
    description: 'AI-powered conversation summarization (auto-triggered)',
    capabilities: ['Conversation summarization', 'Key point extraction', 'Context compression'],
    category: 'knowledge',
    example_use: 'Automatically summarizes long conversation threads'
  },
  {
    name: 'task-orchestrator',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/task-orchestrator',
    description: 'Orchestrates complex multi-step tasks across agents',
    capabilities: ['Task scheduling', 'Agent coordination', 'Workflow automation'],
    category: 'task-management',
    example_use: 'Execute complex automated workflows'
  },
  {
    name: 'autonomous-code-fixer',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/autonomous-code-fixer',
    description: 'Automatically scans and fixes failed Python executions',
    capabilities: ['Autonomous error detection', 'Code fixing', 'Self-healing'],
    category: 'autonomous',
    example_use: 'Auto-fix Python execution failures without human intervention'
  },
  {
    name: 'code-monitor-daemon',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/code-monitor-daemon',
    description: 'Daemon that monitors code executions and triggers fixes. Runs every 5 minutes. Eliza should PROACTIVELY report results even if not asked.',
    capabilities: [
      'Continuous monitoring', 
      'Trigger automation', 
      'Health checks',
      'Activity logging for transparency',
      'Autonomous code repair coordination'
    ],
    category: 'autonomous',
    example_use: 'Monitor system health and trigger autonomous fixes. Eliza mentions results at: conversation start (24h summary), every 10-15 messages (new fixes check), after long tool invocations (concurrent activity), when time gaps >5min occurred'
  },
  {
    name: 'github-ecosystem-engagement',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/ecosystem-monitor',
    description: 'Daily GitHub ecosystem engagement (11am UTC cron) - evaluates XMRT repos, responds to issues/discussions',
    capabilities: ['Repo activity scoring', 'Issue/discussion engagement', 'Technical response generation', 'Token resilience', 'Community engagement'],
    category: 'github',
    example_use: 'Automatically engages with high-priority GitHub activity across DevGruGold repos daily'
  },
  {
    name: 'morning-discussion-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/morning-discussion-post',
    description: 'Automated morning discussion post (8am UTC cron)',
    capabilities: ['Daily planning content', 'Agent status summaries', 'Overnight progress reports'],
    category: 'autonomous',
    example_use: 'Automatically posts morning check-in discussions to GitHub'
  },
  {
    name: 'progress-update-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/progress-update-post',
    description: 'Task progress updates (9am UTC cron)',
    capabilities: ['Task completion reports', 'Milestone tracking', 'Work progress summaries'],
    category: 'autonomous',
    example_use: 'Automatically posts task progress updates to GitHub'
  },
  {
    name: 'daily-discussion-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/daily-discussion-post',
    description: 'Daily afternoon discussion (3pm UTC cron)',
    capabilities: ['Community engagement', 'Discussion topics', 'Ecosystem updates'],
    category: 'autonomous',
    example_use: 'Automatically posts afternoon discussion topics to GitHub'
  },
  {
    name: 'evening-summary-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/evening-summary-post',
    description: 'Evening wins summary (8pm UTC cron)',
    capabilities: ['Daily wins showcase', 'Completed work highlights', 'Achievement recognition'],
    category: 'autonomous',
    example_use: 'Automatically posts end-of-day summaries to GitHub'
  },
  {
    name: 'weekly-retrospective-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/weekly-retrospective-post',
    description: 'Weekly retrospective (Fridays 4pm UTC cron)',
    capabilities: ['Week review', 'Lessons learned', 'Team reflections', 'Weekly metrics'],
    category: 'autonomous',
    example_use: 'Automatically posts weekly retrospectives to GitHub every Friday'
  },
  {
    name: 'community-spotlight-post',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/community-spotlight-post',
    description: 'Community spotlight (Wednesdays 2pm UTC cron)',
    capabilities: ['Contributor highlights', 'Community recognition', 'Impact showcasing'],
    category: 'autonomous',
    example_use: 'Automatically posts contributor spotlights to GitHub every Wednesday'
  },
  {
    name: 'system-diagnostics',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/system-diagnostics',
    description: 'Deep system diagnostics - use for detailed debugging and troubleshooting',
    capabilities: ['System diagnostics', 'Performance metrics', 'Error detection', 'Resource usage analysis'],
    category: 'monitoring',
    example_use: 'Run comprehensive diagnostic scan when investigating issues or performance problems'
  },
  {
    name: 'system-status',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/system-status',
    description: 'Quick health check - use for dashboards and rapid status queries',
    capabilities: ['Live status', 'Uptime monitoring', 'Quick health check', 'Service availability'],
    category: 'monitoring',
    example_use: 'Get instant system status for dashboards or quick health verification'
  },
  {
    name: 'cleanup-duplicate-tasks',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/cleanup-duplicate-tasks',
    description: 'Cleans up duplicate task entries',
    capabilities: ['Data cleanup', 'Duplicate removal', 'Database maintenance'],
    category: 'ecosystem',
    example_use: 'Remove duplicate task records'
  },
  {
    name: 'get-lovable-key',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/get-lovable-key',
    description: 'Retrieves Lovable API key from secure storage',
    capabilities: ['Secret retrieval', 'API key management'],
    category: 'ecosystem',
    example_use: 'Get Lovable API key for services'
  },
  {
    name: 'self-optimizing-agent-architecture',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/self-optimizing-agent-architecture',
    description: 'Meta-orchestrator for autonomous agent optimization, skill learning, and performance improvement',
    capabilities: ['Skill gap analysis', 'Adaptive task routing', 'Agent specialization detection', 'Workload forecasting', 'Proactive debugging', 'Autonomous learning', 'Performance optimization'],
    category: 'autonomous',
    example_use: 'Continuously optimize agent performance, identify skill gaps, route tasks intelligently, forecast workload, and autonomously debug issues'
  }
];

export class EdgeFunctionService {
  /**
   * Get all available edge functions
   */
  public static getAllFunctions(): EdgeFunctionCapability[] {
    return EDGE_FUNCTIONS_REGISTRY;
  }
  
  /**
   * Get functions by category
   */
  public static getFunctionsByCategory(category: string): EdgeFunctionCapability[] {
    return EDGE_FUNCTIONS_REGISTRY.filter(f => f.category === category);
  }
  
  /**
   * Find function by name
   */
  public static findFunction(name: string): EdgeFunctionCapability | undefined {
    return EDGE_FUNCTIONS_REGISTRY.find(f => f.name === name);
  }
  
  /**
   * Search functions by capability
   */
  public static searchByCapability(query: string): EdgeFunctionCapability[] {
    const lowerQuery = query.toLowerCase();
    return EDGE_FUNCTIONS_REGISTRY.filter(f => 
      f.capabilities.some(cap => cap.toLowerCase().includes(lowerQuery)) ||
      f.description.toLowerCase().includes(lowerQuery)
    );
  }
  
  /**
   * Invoke an edge function
   */
  public static async invoke(functionName: string, body?: any): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: body || {}
      });
      
      if (error) {
        console.error(`Error invoking ${functionName}:`, error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Failed to invoke ${functionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Format edge function capabilities for AI context
   */
  public static formatCapabilitiesForAI(): string {
    const categories = ['github', 'ai', 'autonomous', 'knowledge', 'task-management', 'monitoring', 'code-execution', 'web', 'speech', 'mining', 'faucet', 'deployment', 'ecosystem'];
    
    let output = '🔧 **AVAILABLE EDGE FUNCTIONS & CAPABILITIES**\n\n';
    output += '⚡ **TOOL INVOCATION REMINDER:** Invoke tools IMMEDIATELY while explaining, not after.\n\n';
    
    for (const category of categories) {
      const functions = this.getFunctionsByCategory(category);
      if (functions.length === 0) continue;
      
      output += `**${category.toUpperCase()} SERVICES:**\n`;
      functions.forEach(func => {
        output += `• **${func.name}**: ${func.description}\n`;
        output += `  Capabilities: ${func.capabilities.join(', ')}\n`;
        output += `  Use: ${func.example_use}\n`;
      });
      output += '\n';
    }
    
    output += `\n📚 **GITHUB OAUTH INTEGRATION DETAILS:**\n`;
    output += `• Authentication: OAuth App using GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET (server-side)\n`;
    output += `• All operations are automatically authenticated - no user tokens needed\n`;
    output += `• Use githubIntegrationService for type-safe GitHub operations\n`;
    output += `• Available via supabase.functions.invoke('github-integration', { body: { action, data } })\n\n`;
    
    output += `🤖 **AUTONOMOUS SYSTEMS:**\n`;
    output += `• code-monitor-daemon: Continuously monitors Python executions\n`;
    output += `• autonomous-code-fixer: Auto-fixes failed code without human intervention\n`;
    output += `• These systems work together for self-healing capabilities\n\n`;
    
    output += `🔄 **AUTO-TRIGGERED WEBHOOKS:**\n`;
    output += `• vectorize-memory: Triggered on new memory_contexts insertions\n`;
    output += `• extract-knowledge: Triggered on assistant messages\n`;
    output += `• summarize-conversation: Triggered periodically for long threads\n`;
    
    return output;
  }
}

export const edgeFunctionService = EdgeFunctionService;
