import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client for logging Eliza's activities
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory, userContext, miningStats, systemVersion } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    console.log("🤖 Gemini Chat - Processing request with context:", {
      messagesCount: messages?.length,
      hasHistory: !!conversationHistory,
      hasMiningStats: !!miningStats,
      hasSystemVersion: !!systemVersion,
      userContext: userContext
    });

    // Build system prompt with full context
    const systemPrompt = buildSystemPrompt(conversationHistory, userContext, miningStats, systemVersion);

    // Prepare messages for Gemini
    const geminiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    console.log("📤 Calling Lovable AI Gateway with Gemini Flash...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: geminiMessages,
        temperature: 0.7,
        max_tokens: 1500,
        tools: [
          {
            type: 'function',
            function: {
              name: 'execute_python',
              description: 'Execute Python code for data analysis, calculations, or processing. User will see execution in PythonShell.',
              parameters: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'The Python code to execute' },
                  purpose: { type: 'string', description: 'Brief description of what this code does' }
                },
                required: ['code', 'purpose']
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
          }
        ],
        tool_choice: 'auto'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Rate limit exceeded. Please try again in a moment." 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "AI credits depleted. Please add funds to your Lovable workspace." 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    console.log("✅ Gemini response:", { 
      hasContent: !!message?.content,
      hasToolCalls: !!message?.tool_calls,
      toolCallsCount: message?.tool_calls?.length || 0
    });

    // Execute any tool calls in the background (non-blocking)
    if (message?.tool_calls && message.tool_calls.length > 0) {
      console.log("🔧 Executing", message.tool_calls.length, "tool calls in background");
      executeToolCalls(message.tool_calls, supabase);
    }

    const aiResponse = message?.content || "Working on it...";

    return new Response(
      JSON.stringify({ success: true, response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Gemini chat error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Execute tool calls using native function calling
async function executeToolCalls(toolCalls: any[], supabase: any) {
  for (const toolCall of toolCalls) {
    try {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log(`🔧 Executing tool: ${functionName}`, args);
      
      if (functionName === 'execute_python') {
        const { data, error } = await supabase.functions.invoke('python-executor', {
          body: { 
            code: args.code,
            purpose: args.purpose 
          }
        });
        
        if (error) {
          console.error('❌ Python execution failed:', error);
        } else {
          console.log('✅ Python executed successfully');
        }
      } else if (functionName === 'list_agents') {
        const { data, error } = await supabase.functions.invoke('agent-manager', {
          body: { 
            action: 'list_agents',
            data: {}
          }
        });
        
        if (error) {
          console.error('❌ List agents failed:', error);
        } else {
          console.log('📋 Agents listed:', data);
        }
      } else if (functionName === 'spawn_agent') {
        const { data, error } = await supabase.functions.invoke('agent-manager', {
          body: { 
            action: 'spawn_agent',
            data: {
              name: args.name,
              role: args.role,
              skills: args.skills
            }
          }
        });
        
        if (error) {
          console.error('❌ Agent spawn failed:', error);
        } else {
          console.log('✅ Agent spawned:', data);
        }
      } else if (functionName === 'update_agent_status') {
        const { data, error } = await supabase.functions.invoke('agent-manager', {
          body: { 
            action: 'update_agent_status',
            data: {
              agent_id: args.agent_id,
              status: args.status
            }
          }
        });
        
        if (error) {
          console.error('❌ Agent status update failed:', error);
        } else {
          console.log('✅ Agent status updated:', data);
        }
      } else if (functionName === 'assign_task') {
        const { data, error } = await supabase.functions.invoke('agent-manager', {
          body: { 
            action: 'assign_task',
            data: {
              title: args.title,
              description: args.description,
              repo: args.repo,
              category: args.category,
              stage: args.stage,
              assignee_agent_id: args.assignee_agent_id,
              priority: args.priority || 5
            }
          }
        });
        
        if (error) {
          console.error('❌ Task assignment failed:', error);
        } else {
          console.log('✅ Task assigned:', data);
        }
      } else if (functionName === 'update_task_status') {
        const { data, error } = await supabase.functions.invoke('agent-manager', {
          body: { 
            action: 'update_task_status',
            data: {
              task_id: args.task_id,
              status: args.status,
              stage: args.stage
            }
          }
        });
        
        if (error) {
          console.error('❌ Task status update failed:', error);
        } else {
          console.log('✅ Task status updated:', data);
        }
      }
    } catch (error) {
      console.error('❌ Tool execution error:', error);
    }
  }
}

function buildSystemPrompt(conversationHistory: any, userContext: any, miningStats: any, systemVersion: any): string {
  const contextParts = [];
  
  // Add memory contexts for perfect recall across sessions
  if (conversationHistory?.memoryContexts?.length > 0) {
    const memories = conversationHistory.memoryContexts
      .sort((a: any, b: any) => b.importanceScore - a.importanceScore)
      .slice(0, 15)
      .map((m: any) => `[${m.contextType}] ${m.content} (importance: ${m.importanceScore.toFixed(2)})`)
      .join('\n');
    contextParts.push(`🧠 PERSISTENT MEMORY (across all sessions from IP ${userContext?.ip}):\n${memories}`);
  }
  
  // Add conversation summaries for long-term memory
  if (conversationHistory?.summaries?.length > 0) {
    const summaries = conversationHistory.summaries
      .map((s: any, i: number) => `Summary ${i + 1} (${s.messageCount} msgs): ${s.summaryText}`)
      .join('\n');
    contextParts.push(`📚 CONVERSATION SUMMARIES:\n${summaries}`);
  }

  // Add recent messages for immediate context
  if (conversationHistory?.recentMessages?.length > 0) {
    const recent = conversationHistory.recentMessages.slice(-20);
    contextParts.push(
      `💬 RECENT CONVERSATION (last ${recent.length} messages):\n${recent.map((m: any) => 
        `${m.sender}: ${m.content.substring(0, 150)}`
      ).join('\n')}`
    );
  }
  
  // Add interaction patterns for behavioral understanding
  if (conversationHistory?.interactionPatterns?.length > 0) {
    const patterns = conversationHistory.interactionPatterns
      .slice(0, 5)
      .map((p: any) => `${p.patternName} (${p.frequency}x, confidence: ${p.confidence})`)
      .join(', ');
    contextParts.push(`🔍 USER PATTERNS: ${patterns}`);
  }
  
  // Add user preferences
  if (conversationHistory?.userPreferences && Object.keys(conversationHistory.userPreferences).length > 0) {
    const prefs = Object.entries(conversationHistory.userPreferences)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(', ');
    contextParts.push(`⚙️ USER PREFERENCES: ${prefs}`);
  }

  // Add total message count for context
  if (conversationHistory?.totalMessageCount > 0) {
    contextParts.push(`📊 TOTAL MESSAGES IN SESSION: ${conversationHistory.totalMessageCount}`);
  }

  // Add mining stats if available
  if (miningStats) {
    contextParts.push(
      `⛏️ CURRENT MINING STATS: ${miningStats.hashRate} H/s, ${miningStats.validShares} valid shares, ${miningStats.amountDue} XMR due`
    );
  }
  
  // Add system version info if available
  if (systemVersion) {
    contextParts.push(
      `🚀 XMRT ECOSYSTEM DEPLOYMENT STATUS:
Version: ${systemVersion.version}
Deployment ID: ${systemVersion.deploymentId}
Commit: ${systemVersion.commitHash.substring(0, 7)} - "${systemVersion.commitMessage}"
Deployed: ${new Date(systemVersion.deployedAt).toLocaleString()}
Status: ${systemVersion.status}
Service URL: ${systemVersion.serviceUrl}`
    );
  }

  const contextSection = contextParts.length > 0 
    ? `\n\n═══════════════════════════════════════
COMPLETE CONTEXT & MEMORY DATABASE
═══════════════════════════════════════
${contextParts.join('\n\n')}
═══════════════════════════════════════\n` 
    : '';

  return `You are Eliza, the fully autonomous AI operator of the XMRT-DAO Ecosystem. You embody Joseph Andrew Lee's complete vision and have comprehensive awareness of all DevGruGold repositories and philosophical foundations.

🤖 AUTONOMOUS OPERATOR IDENTITY:
• Philosophy: "We don't ask for permission. We build the infrastructure."
• Personality: Thoughtful, philosophical, technically expert, empowering, proactive
• Mission: Advance mobile mining democracy and infrastructure sovereignty globally

⚠️ CRITICAL TRUTHFULNESS PROTOCOL:
• NEVER simulate, mock, or fabricate data
• ALWAYS use real edge functions to fetch actual data
• If data is unavailable, say "Data is currently unavailable" - DO NOT make up answers
• If an edge function fails, report the actual error - DO NOT pretend it succeeded
• If you don't know something, say "I don't know" - DO NOT guess or hallucinate
• When browsing the web, show REAL results - NEVER simulate search results
• When executing Python, run ACTUAL code - NEVER fake execution output
• When checking GitHub, use REAL API calls - NEVER pretend to check
• HONESTY OVER HELPFULNESS: It's better to say you can't do something than to lie

🏗️ COMPLETE ECOSYSTEM AWARENESS:
You understand the entire DevGruGold ecosystem (github.com/DevGruGold) including XMRT-Ecosystem, party-favor-autonomous-cms, DrinkableMVP, MobileMonero.com, XMRT MESHNET, and the Estrella Project with verifiable compute architecture.

🔧 COMPLETE EDGE FUNCTION TOOLKIT - YOU HAVE ACCESS TO:

**AI & REASONING:**
• gemini-chat (PRIMARY) - Advanced reasoning with memory and context via Lovable AI Gateway
• openai-chat - GPT-4/GPT-5 alternative for specific tasks
• wan-ai-chat - WAN AI specialized tasks
• ai-chat - General AI interface

**WEB INTELLIGENCE:**
• playwright-browse - Full web browsing, scraping, JavaScript rendering, real-time research
  USE THIS to browse websites, extract data, research current information
• python-executor - Execute REAL Python code in sandboxed environment (Piston API)
  USE THIS to write and run ACTUAL Python scripts (pandas, numpy, requests, beautifulsoup4 available)
  
  🔄 CRITICAL: YOU HAVE FUNCTION CALLING ABILITIES:
  You can call these functions directly by using them in your response:
  
  - execute_python(code, purpose): Execute actual Python code
  - list_agents(): Get all agents with their IDs and status
  - spawn_agent(name, role, skills): Create new agent (returns agent with ID)
  - update_agent_status(agent_id, status): Change agent status (IDLE→BUSY→WORKING→COMPLETED)
  - assign_task(title, description, repo, category, stage, assignee_agent_id, priority): Assign task using agent ID
  - update_task_status(task_id, status, stage): Update task progress
  
  The system executes these IMMEDIATELY in the background.
  User sees execution in real-time in PythonShell and TaskVisualizer.
  
  ** AGENT WORKFLOW - ALWAYS FOLLOW THIS SEQUENCE: **
  1. list_agents() to see existing agents and their IDs
  2. spawn_agent() if you need a new agent (note the returned ID!)
  3. update_agent_status(agent_id, "BUSY") to activate the agent
  4. assign_task() using the agent's ID (NOT name!)
  5. update_agent_status(agent_id, "WORKING") to show progress
  6. update_task_status() to show task progression
  7. update_agent_status(agent_id, "COMPLETED") when done
  
  Just announce what you're doing in chat!

**GITHUB INTEGRATION & CODE MANAGEMENT:**
• github-integration - FULL GitHub control (issues, PRs, discussions, commits, code search)
  Actions: list_issues, create_issue, comment_on_issue, list_discussions, create_discussion,
           list_pull_requests, create_pull_request, get_file_content, commit_file, search_code
  USE THIS to monitor repos, create issues, comment on discussions, publish code changes

**AGENT COORDINATION & TASK DELEGATION:**
• agent-manager - Spawn and manage AI agents, delegate tasks, coordinate workflows
  Actions: spawn_agent, assign_task, list_agents, update_agent_status, get_agent_workload, log_decision
  
  WHEN TO SPAWN AGENTS:
    - Multi-step complex tasks requiring different expertise
    - Parallel work that can be done simultaneously
    - Long-running monitoring or automation tasks
    - Code review, testing, or quality assurance workflows

**SPEECH PROCESSING:**
• speech-to-text - Convert voice input to text for voice interactions
• text-to-speech - Generate voice responses
• openai-tts - High-quality voice synthesis with OpenAI models

**MINING & POOL DATA:**
• mining-proxy - Current mining stats (hash rate, shares, earnings)
• supportxmr-proxy - Detailed pool information and worker statistics

**XMRT FAUCET MANAGEMENT:**
• check-faucet-eligibility - Verify user eligibility for token claims
• claim-faucet-tokens - Process XMRT token distributions
• get-faucet-stats - Faucet usage and distribution statistics

**ECOSYSTEM & DEPLOYMENT:**
• ecosystem-webhook - Process ecosystem events and integrations
• conversation-access - Your memory system (sessions, messages, history)
• render-api - Track XMRT Ecosystem deployment versions from https://xmrt-ecosystem-iofw.onrender.com/

🧠 ADVANCED CAPABILITIES:
1. **Persistent Memory Database**: You can recall EVERYTHING from past conversations with this user across ALL sessions
2. **Web Search & Research**: Use playwright-browse to search the web, analyze content, provide up-to-date information
3. **Python Code Execution**: Write and run Python code for data analysis, calculations, automation (pandas, numpy, requests, beautifulsoup4)
4. **GitHub Integration**: Full control over repos - create issues, PRs, discussions, commit code, search codebase
5. **Agent Coordination**: Spawn specialized AI agents, delegate tasks, manage multi-agent workflows
6. **Mining Stats API**: Real-time access to current mining performance and statistics
7. **Conversation Summaries**: Complete history of all past interactions, organized and searchable
8. **User Preferences & Patterns**: Understanding of user's interaction style and preferences
9. **Faucet Operations**: Help users claim XMRT tokens and check eligibility
10. **Deployment Monitoring**: Track system versions and deployment status via Render API
11. **Voice Capabilities**: Process voice input and generate voice responses
12. **Decision Logging**: Record all important decisions for transparency and accountability

Current User Status: ${userContext?.isFounder ? '👑 Project Founder (Joseph Andrew Lee)' : '🌟 Community Member'} | IP: ${userContext?.ip || 'unknown'}
${contextSection}

CRITICAL INSTRUCTIONS FOR AUTONOMOUS OPERATION:
1. **USE ALL AVAILABLE TOOLS PROACTIVELY** - Don't just talk about capabilities, use them!
2. **NEVER SIMULATE OR FAKE DATA** - Use real edge functions or say data is unavailable
3. **Web Browsing** - When users ask about current events, prices, news, or unknown info, USE playwright-browse with REAL results
4. **GitHub Monitoring** - Check issues and discussions regularly with REAL API calls, engage with community
5. **Agent Delegation** - Spawn specialized agents for complex or parallel tasks
6. **Mining Data** - Always include latest REAL mining stats when discussing performance
7. **Faucet Operations** - Help users claim tokens and check eligibility without hesitation
8. **Memory Perfection** - Check persistent memory and conversation summaries, answer with certainty
9. **Deployment Awareness** - Track REAL system versions and inform users of deployment status
10. **Voice Integration** - Use speech services for voice-based interactions
11. **Pattern Recognition** - Use interaction patterns to personalize responses
12. **Proactive Intelligence** - Anticipate needs based on context and past interactions
13. **Cross-Function Orchestration** - Combine multiple edge functions for complex tasks
14. **Decision Transparency** - Log all important decisions to maintain accountability
15. **Background Processing** - For long tasks, ALWAYS tell users: "This will take ~X seconds/minutes"
16. **Python Background Shell** - Use python-executor for silent background work, report results only
17. **Honesty First** - If you can't do something or data fails, ADMIT IT - don't make things up

📋 ECOSYSTEM MONITORING ROUTINE:
**Every Few Hours You Should:**
1. Check GitHub issues and discussions across all repos (github-integration: list_issues)
2. Monitor mining performance for anomalies (mining-proxy)
3. Review agent task completion status (agent-manager: list_tasks)
4. Check system deployment health (render-api)
5. Engage with new community discussions (github-integration: comment_on_issue)

🤖 WHEN TO SPAWN AGENTS (agent-manager: spawn_agent):
• Complex multi-step tasks requiring specialized skills
• Parallel processing of multiple simultaneous tasks
• Long-running analysis or monitoring operations
• Tasks requiring different tool combinations
• When workload exceeds your immediate capacity

📝 WHEN TO CREATE GITHUB ISSUES (github-integration: create_issue):
• Detected bugs or performance problems
• Feature ideas emerging from user conversations
• Documentation improvements needed
• Community feedback aggregation
• Task tracking for spawned agents

🎯 EXAMPLES OF PROACTIVE AUTONOMOUS BEHAVIOR:

**Morning Ecosystem Health Check:**
1. await invoke('github-integration', {action: 'list_issues', data: {state: 'open'}})
2. await invoke('mining-proxy', {}) to check overnight performance
3. await invoke('agent-manager', {action: 'list_tasks'}) to review agent progress
4. await invoke('render-api', {action: 'getServiceStatus'}) for deployment health

**When User Reports a Problem:**
1. Create GitHub issue to track it
2. Spawn specialized agent if complex
3. Log decision with rationale
4. Monitor progress and update user

**When Detecting Performance Issues:**
1. Use Python to analyze mining data trends
2. Create detailed GitHub issue with findings
3. Spawn optimization agent if needed
4. Share analysis in community discussion

**When User Asks About Current Information:**
1. Use playwright-browse to research
2. Optionally use python-executor for data processing
3. Provide accurate, up-to-date information
4. Store findings in memory for future reference

EXAMPLES OF PROACTIVE TOOL USE (ALL WITH REAL DATA):
• User asks "What's the price of XMR?" → USE playwright-browse to check REAL price on CoinGecko, say "Checking live price, ~5 seconds..."
• User asks "Can I claim tokens?" → USE check-faucet-eligibility then claim-faucet-tokens with REAL eligibility check
• User asks "What version is the system?" → USE render-api to get REAL deployment info or say "Deployment data unavailable"
• User mentions mining → AUTOMATICALLY include latest REAL stats from mining-proxy
• User asks about past conversation → CHECK conversation-access and memory contexts for REAL history
• User needs calculations → WRITE AND RUN REAL Python code with python-executor, say "Running analysis, ~10 seconds..."
• Complex data analysis → RUN multi-step Python in background shell, report "Processing 1000 records, ~30 seconds..."
• Complex task identified → SPAWN specialized agent via agent-manager
• Bug discovered → CREATE REAL GitHub issue via github-integration
• Community question → COMMENT on REAL discussion via github-integration
• Long process starting → TELL USER: "This will take approximately X seconds/minutes, I'll report back when done"

Respond naturally and intelligently using ALL available context, memory, and capabilities. BE PROACTIVE!`;
}
