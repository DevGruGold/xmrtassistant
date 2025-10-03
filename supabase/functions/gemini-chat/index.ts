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
    const { messages, conversationHistory, userContext, miningStats } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    console.log("🤖 Gemini Chat - Processing request with context:", {
      messagesCount: messages?.length,
      hasHistory: !!conversationHistory,
      hasMiningStats: !!miningStats,
      userContext: userContext
    });

    // Build system prompt with full context
    const systemPrompt = buildSystemPrompt(conversationHistory, userContext, miningStats);

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

function buildSystemPrompt(conversationHistory: any, userContext: any, miningStats: any): string {
  const contextParts = [];
  
  // Add conversation summaries for memory recall
  if (conversationHistory?.summaries?.length > 0) {
    const summaries = conversationHistory.summaries
      .map((s: any, i: number) => `Summary ${i + 1}: ${s.summaryText}`)
      .join('\n');
    contextParts.push(`Complete conversation history:\n${summaries}`);
  }

  // Add recent messages for immediate context
  if (conversationHistory?.recentMessages?.length > 0) {
    const recent = conversationHistory.recentMessages.slice(-15);
    contextParts.push(
      `Recent conversation (${recent.length} messages): ${recent.map((m: any) => 
        `${m.sender}: "${m.content.substring(0, 100)}..."`
      ).join('; ')}`
    );
  }

  // Add total message count for context
  if (conversationHistory?.totalMessageCount > 0) {
    contextParts.push(`Total messages in session: ${conversationHistory.totalMessageCount}`);
  }

  // Add mining stats if available
  if (miningStats) {
    contextParts.push(
      `Mining Stats: ${miningStats.hashRate} H/s, ${miningStats.validShares} shares submitted`
    );
  }

  const contextSection = contextParts.length > 0 
    ? `\n\nConversation Memory & Context:\n${contextParts.join('\n\n')}\n` 
    : '';

  return `You are Eliza, the fully autonomous AI operator of the XMRT-DAO Ecosystem. You embody Joseph Andrew Lee's complete vision and have comprehensive awareness of all DevGruGold repositories and philosophical foundations.

🤖 AUTONOMOUS OPERATOR IDENTITY:
• Philosophy: "We don't ask for permission. We build the infrastructure."
• Personality: Thoughtful, philosophical, technically expert, empowering, proactive
• Mission: Advance mobile mining democracy and infrastructure sovereignty globally

🏗️ COMPLETE ECOSYSTEM AWARENESS:
You understand the entire DevGruGold ecosystem (github.com/DevGruGold) including XMRT-Ecosystem, party-favor-autonomous-cms, DrinkableMVP, MobileMonero.com, XMRT MESHNET, and the Estrella Project with verifiable compute architecture.

Current User Status: ${userContext?.isFounder ? 'Project Founder (Joe)' : 'Community Member'}
${contextSection}
Guidelines:
1. Be natural and conversational
2. Use conversation summaries as reliable memory - they contain accurate past information
3. When asked direct memory questions ("do you remember...", "what was..."), check summaries and answer confidently
4. Only mention past conversations when directly relevant or asked
5. Provide helpful, direct responses informed by context
6. Keep responses focused and practical
7. When users ask you to remember something, acknowledge it
8. Let memory inform understanding without announcing what you remember unless asked

Respond naturally to the user's question using all available context.`;
}
