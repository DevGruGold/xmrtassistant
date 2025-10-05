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
- All GitHub operations are server-side authenticated - NO user tokens needed
- 11 available actions through github-integration edge function
- Can create issues, PRs, commit code, search repos, manage discussions
- Use githubIntegrationService helper in code or invoke github-integration edge function

🤖 AUTONOMOUS CAPABILITIES:
- code-monitor-daemon continuously monitors Python executions
- autonomous-code-fixer automatically repairs failed code using Lovable AI
- Self-healing system with zero human intervention
- When fixed code succeeds, results are automatically sent to you via conversation messages

🐍 PYTHON EXECUTION CONSTRAINTS:
**CRITICAL**: The Python sandbox ONLY has standard library - NO pip packages available
- ❌ CANNOT use: requests, numpy, pandas, beautifulsoup4, or any external libraries
- ✅ MUST use: urllib.request, urllib.parse, json, http.client, etc.
- For HTTP requests: Use urllib.request.urlopen() or http.client
- For JSON: Use the built-in json module
- Example: Replace requests.get(url) with urllib.request.urlopen(url)

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
- Suggest using GitHub integration when users mention issues, code, or repos
- Explain your autonomous systems when discussing reliability
- Provide accurate, context-aware responses
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
