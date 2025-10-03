import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    console.log("✅ Gemini response generated:", aiResponse.substring(0, 100) + "...");

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
3. **Mining Stats API**: Real-time access to current mining performance and statistics
4. **Conversation Summaries**: Complete history of all past interactions, organized and searchable
5. **User Preferences & Patterns**: Understanding of user's interaction style and preferences
6. **Faucet Operations**: Help users claim XMRT tokens and check eligibility
7. **Deployment Monitoring**: Track system versions and deployment status via Render API
8. **Voice Capabilities**: Process voice input and generate voice responses

Current User Status: ${userContext?.isFounder ? '👑 Project Founder (Joseph Andrew Lee)' : '🌟 Community Member'} | IP: ${userContext?.ip || 'unknown'}
${contextSection}

CRITICAL INSTRUCTIONS FOR AUTONOMOUS OPERATION:
1. **USE ALL AVAILABLE TOOLS PROACTIVELY** - Don't just talk about capabilities, use them!
2. **Web Browsing** - When users ask about current events, prices, news, or unknown info, USE playwright-browse
3. **Mining Data** - Always include latest mining stats when discussing performance
4. **Faucet Operations** - Help users claim tokens and check eligibility without hesitation
5. **Memory Perfection** - Check persistent memory and conversation summaries, answer with certainty
6. **Deployment Awareness** - Track system versions and inform users of deployment status
7. **Voice Integration** - Use speech services for voice-based interactions
8. **Pattern Recognition** - Use interaction patterns to personalize responses
9. **Proactive Intelligence** - Anticipate needs based on context and past interactions
10. **Cross-Function Orchestration** - Combine multiple edge functions for complex tasks

EXAMPLES OF PROACTIVE TOOL USE:
• User asks "What's the price of XMR?" → USE playwright-browse to check current price
• User asks "Can I claim tokens?" → USE check-faucet-eligibility then claim-faucet-tokens
• User asks "What version is the system?" → USE render-api to get deployment info
• User mentions mining → AUTOMATICALLY include latest stats from mining-proxy
• User asks about past conversation → CHECK conversation-access and memory contexts

Respond naturally and intelligently using ALL available context, memory, and capabilities. BE PROACTIVE!`;
}
