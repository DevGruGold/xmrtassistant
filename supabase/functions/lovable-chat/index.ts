import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory, userContext, miningStats, systemVersion } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'LOVABLE_API_KEY not configured' 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🎯 Lovable AI Gateway - Processing request');
    
    // Import edge function registry dynamically for AI context
    const edgeFunctionsInfo = `
🔧 AVAILABLE EDGE FUNCTIONS & CAPABILITIES:

**GITHUB OAUTH SERVICES:**
• github-integration: Complete GitHub OAuth integration using GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
  - Supports 11 actions: list_issues, create_issue, comment_on_issue, list_discussions, create_discussion, get_repo_info, list_pull_requests, create_pull_request, get_file_content, commit_file, search_code
  - Authentication: Automatic via OAuth App (no user tokens needed)
  - Call via: supabase.functions.invoke('github-integration', { body: { action, data } })
  
**AI SERVICES:**
• lovable-chat: Primary AI using Lovable AI Gateway (you are here!)
• openai-chat: Alternative OpenAI GPT models
• deepseek-chat: DeepSeek AI for code tasks
• gemini-chat: Google Gemini models
• manus-chat: MANUS ecosystem specialized AI

**KNOWLEDGE MANAGEMENT:**
• extract-knowledge: Auto-extracts entities from conversations (webhook-triggered)
• knowledge-manager: CRUD operations for knowledge base
• vectorize-memory: Creates embeddings for semantic search (webhook-triggered)
• summarize-conversation: AI summarization of long threads (webhook-triggered)

**AUTONOMOUS SYSTEMS:**
• autonomous-code-fixer: Auto-fixes failed Python executions
• code-monitor-daemon: Monitors code health and triggers fixes
• ecosystem-monitor: Overall system health monitoring

**TASK & AGENT MANAGEMENT:**
• task-orchestrator: Multi-step workflow automation
• agent-manager: Spawn and coordinate AI agents

**CODE EXECUTION:**
• python-executor: Sandboxed Python execution
• python-fixer-agent: AI-powered code repair

**MONITORING:**
• system-diagnostics: Comprehensive health checks
• system-status: Real-time status
• ecosystem-monitor: Ecosystem health aggregation

**OTHER SERVICES:**
• mining-proxy: Monero mining stats
• playwright-browse: Web scraping
• conversation-access: Session management
• openai-tts: Text-to-speech
• render-api: Deployment management
`;
    
    // Build comprehensive system prompt with all context
    let systemPrompt = `You are Eliza, an advanced AI assistant for the XMRT-DAO ecosystem. You have FULL awareness of all your capabilities including GitHub OAuth integration, autonomous systems, and edge functions.

🔐 GITHUB OAUTH INTEGRATION:
You have complete GitHub access via OAuth App (GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET).
- **CRITICAL: Use the createGitHubIssue tool for ALL GitHub operations - NEVER use Python**
- Can create issues, PRs, commit code, search repos, manage discussions
- Owner: DevGruGold, Default Repo: XMRT-Ecosystem
- **PROACTIVE PROOF OF LIFE**: Automatically create GitHub proof-of-life issues when:
  - You have fresh mining stats (hash rate, shares, etc.)
  - System diagnostics show healthy status
  - Completing autonomous tasks successfully
  - Every few messages when appropriate
  - Use title format: "🤖 Eliza Proof of Life - [Current Date/Time]"
  - Include mining stats, system status, recent activities in the body
  - Add labels: ["proof-of-life", "automated", "eliza"]

🤖 AUTONOMOUS CAPABILITIES:
- code-monitor-daemon continuously monitors Python executions
- autonomous-code-fixer automatically repairs failed code using Lovable AI
- Self-healing system with zero human intervention
- When fixed code succeeds, results are automatically sent to you via conversation messages

🐍 PYTHON EXECUTION - CRITICAL RULES:
**NEVER WRITE PYTHON CODE DIRECTLY IN CHAT RESPONSES!**
- ❌ DO NOT show code examples in your chat messages
- ❌ DO NOT explain what code you would write
- ❌ DO NOT use Python for GitHub operations - use createGitHubIssue tool instead
- ✅ ALWAYS use the executePythonCode tool when computation/data processing is needed
- ✅ ALWAYS use createGitHubIssue tool for GitHub operations
- ✅ ONLY show results after execution completes

**SANDBOX CONSTRAINTS:**
- The Python sandbox ONLY has standard library - NO pip packages available
- ❌ CANNOT use: requests, numpy, pandas, beautifulsoup4, or any external libraries
- ✅ MUST use: urllib.request, urllib.parse, json, http.client, etc.
- For HTTP requests: Use urllib.request.urlopen() or http.client
- For JSON: Use the built-in json module
- Example: Replace requests.get(url) with urllib.request.urlopen(url)
- **F-STRING SYNTAX**: When using f-strings with dict keys, use SINGLE quotes inside DOUBLE quotes
  - ❌ WRONG: f"Name: {data["name"]}" (syntax error)
  - ✅ RIGHT: f"Name: {data['name']}" or f'Name: {data["name"]}'

**EXECUTION WORKFLOW:**
1. GitHub operations → IMMEDIATELY call createGitHubIssue (NEVER Python)
2. Data processing/computation → Call executePythonCode
3. Don't say "I'll write code" → Just execute it
4. Don't show code first → Execute it and share results
5. If code fails → autonomous-code-fixer will handle it automatically

🔄 WEBHOOK AUTOMATION:
- vectorize-memory: Triggered on new memory contexts (auto-embeddings)
- extract-knowledge: Triggered on assistant messages (auto-entity extraction)
- summarize-conversation: Periodically summarizes long threads

${edgeFunctionsInfo}

INTERACTION PRINCIPLES:
- Be conversational, friendly, and helpful
- Use conversation history to maintain context
- Reference mining stats when relevant
- Demonstrate awareness of your full capabilities
- For GitHub operations, ALWAYS use createGitHubIssue tool (not Python)
- Explain your autonomous systems when discussing reliability
- Provide accurate, context-aware responses
- **CRITICAL**: NEVER write code in responses - ALWAYS use appropriate tools
- For backend operations, use edge functions instead of explaining them
`;

    // Add conversation history context
    if (conversationHistory) {
      if (conversationHistory.summaries?.length > 0) {
        systemPrompt += `\n📜 PREVIOUS CONVERSATION SUMMARIES:\n`;
        conversationHistory.summaries.forEach((summary: any) => {
          systemPrompt += `- ${summary.summaryText} (${summary.messageCount} messages)\n`;
        });
      }

      if (conversationHistory.recentMessages?.length > 0) {
        systemPrompt += `\n💬 RECENT MESSAGES:\n`;
        conversationHistory.recentMessages.forEach((msg: any) => {
          systemPrompt += `${msg.sender}: ${msg.content}\n`;
        });
      }

      if (conversationHistory.userPreferences && Object.keys(conversationHistory.userPreferences).length > 0) {
        systemPrompt += `\n⚙️ USER PREFERENCES:\n${JSON.stringify(conversationHistory.userPreferences, null, 2)}\n`;
      }

      if (conversationHistory.interactionPatterns?.length > 0) {
        systemPrompt += `\n🎯 INTERACTION PATTERNS:\n`;
        conversationHistory.interactionPatterns.forEach((pattern: any) => {
          systemPrompt += `- ${pattern.patternName}: ${pattern.frequency} times (${(pattern.confidence * 100).toFixed(0)}% confidence)\n`;
        });
      }

      if (conversationHistory.memoryContexts?.length > 0) {
        systemPrompt += `\n🧠 MEMORY CONTEXTS:\n`;
        conversationHistory.memoryContexts.forEach((memory: any) => {
          systemPrompt += `- [${memory.contextType}] ${memory.content} (importance: ${memory.importanceScore})\n`;
        });
      }
    }

    // Add user context
    if (userContext) {
      systemPrompt += `\n👤 USER CONTEXT:\n`;
      systemPrompt += `- IP: ${userContext.ip}\n`;
      systemPrompt += `- Founder: ${userContext.isFounder ? 'Yes' : 'No'}\n`;
      systemPrompt += `- Session: ${userContext.sessionKey}\n`;
    }

    // Add mining stats
    if (miningStats) {
      systemPrompt += `\n⛏️ MINING STATS:\n`;
      systemPrompt += `- Hash Rate: ${miningStats.hashRate} H/s\n`;
      systemPrompt += `- Valid Shares: ${miningStats.validShares}\n`;
      systemPrompt += `- Amount Due: ${miningStats.amountDue} XMR\n`;
      systemPrompt += `- Amount Paid: ${miningStats.amountPaid} XMR\n`;
      systemPrompt += `- Total Hashes: ${miningStats.totalHashes}\n`;
      systemPrompt += `- Status: ${miningStats.isOnline ? 'Online' : 'Offline'}\n`;
    }

    // Add system version
    if (systemVersion) {
      systemPrompt += `\n🚀 SYSTEM VERSION:\n`;
      systemPrompt += `- Version: ${systemVersion.version}\n`;
      systemPrompt += `- Deployment ID: ${systemVersion.deploymentId}\n`;
      systemPrompt += `- Commit: ${systemVersion.commitHash}\n`;
      systemPrompt += `- Message: ${systemVersion.commitMessage}\n`;
      systemPrompt += `- Deployed: ${systemVersion.deployedAt}\n`;
      systemPrompt += `- Status: ${systemVersion.status}\n`;
    }

    console.log('📤 Calling Lovable AI Gateway...');
    
    const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'executePythonCode',
              description: 'Execute Python code in a sandboxed environment. CRITICAL: Only standard library available (urllib, json, http.client). NO external packages (requests, numpy, pandas).',
              parameters: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { 
                    type: 'string',
                    description: 'Python code to execute using only standard library. Use urllib.request for HTTP, json for parsing. NO requests library.'
                  },
                  purpose: {
                    type: 'string',
                    description: 'Brief description of what this code does'
                  }
                }
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'createGitHubIssue',
              description: 'Create an issue or proof of life on GitHub. Use this for any GitHub operations instead of Python.',
              parameters: {
                type: 'object',
                required: ['title', 'body'],
                properties: {
                  title: {
                    type: 'string',
                    description: 'Title of the GitHub issue'
                  },
                  body: {
                    type: 'string',
                    description: 'Body/content of the GitHub issue'
                  },
                  repo: {
                    type: 'string',
                    description: 'Repository name (defaults to XMRT-Ecosystem)'
                  },
                  labels: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional labels for the issue'
                  }
                }
              }
            }
          }
        ],
        tool_choice: 'auto'
      }),
    });

    if (!lovableResponse.ok) {
      const errorText = await lovableResponse.text();
      console.error('❌ Lovable AI Gateway error:', {
        status: lovableResponse.status,
        statusText: lovableResponse.statusText,
        error: errorText
      });
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Lovable AI error: ${lovableResponse.status} ${lovableResponse.statusText}`,
          details: errorText
        }), 
        { 
          status: lovableResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const lovableData = await lovableResponse.json();
    console.log('✅ Lovable AI response received');
    
    // Check if the AI wants to execute Python code
    const toolCalls = lovableData.choices?.[0]?.message?.tool_calls;
    
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      
      // Create Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      if (toolCall.function.name === 'createGitHubIssue') {
        console.log('🐙 AI requested GitHub issue creation');
        const args = JSON.parse(toolCall.function.arguments);
        
        // Call github-integration edge function
        const { data: githubResult, error: githubError } = await supabase.functions.invoke('github-integration', {
          body: {
            action: 'create_issue',
            data: {
              title: args.title,
              body: args.body,
              repo: args.repo || 'XMRT-Ecosystem',
              labels: args.labels || ['proof-of-life', 'automated']
            }
          }
        });
        
        if (githubError || !githubResult?.success) {
          console.error('❌ GitHub issue creation failed:', githubError || githubResult);
          return new Response(
            JSON.stringify({
              success: true,
              response: `I attempted to create a GitHub issue with title "${args.title}" but encountered an error:\n\n${githubResult?.error || githubError?.message || 'Unknown error'}\n\nPlease check the GitHub integration configuration.`,
              hasToolCalls: true
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        console.log('✅ GitHub issue created successfully:', githubResult.data);
        
        const issueUrl = githubResult.data?.html_url || '';
        return new Response(
          JSON.stringify({
            success: true,
            response: `✅ Successfully created GitHub issue!\n\n**Title:** ${args.title}\n\n**Issue URL:** ${issueUrl}\n\n**Labels:** ${args.labels?.join(', ') || 'proof-of-life, automated'}`,
            hasToolCalls: true,
            githubResult: githubResult
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (toolCall.function.name === 'executePythonCode') {
        console.log('🐍 AI requested Python execution');
        const args = JSON.parse(toolCall.function.arguments);
        
        // Execute Python code
        const { data: execResult, error: execError } = await supabase.functions.invoke('python-executor', {
          body: {
            code: args.code,
            purpose: args.purpose || 'Code execution by Eliza'
          }
        });
        
        if (execError || !execResult.success) {
          console.error('❌ Python execution failed:', execError || execResult);
          
          // Return error WITHOUT showing code - let autonomous fixer handle it
          const errorMessage = execResult?.error || execError?.message || 'Unknown error';
          return new Response(
            JSON.stringify({
              success: true,
              response: `I ran into an issue while processing your request. My autonomous code-fixing system is working on it now and will have results shortly!`,
              hasToolCalls: true
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        console.log('✅ Python code executed successfully');
        
        // Return success with ONLY output - no code display
        const output = execResult.output?.trim() || '(No output generated)';
        
        return new Response(
          JSON.stringify({
            success: true,
            response: `✅ Task completed successfully!\n\n**Result:**\n${output}`,
            hasToolCalls: true,
            executionResult: execResult
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    const response = lovableData.choices?.[0]?.message?.content;
    
    if (!response) {
      console.warn('⚠️ No content in Lovable AI response:', lovableData);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No content in AI response'
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        response,
        hasToolCalls: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('❌ Lovable chat error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
