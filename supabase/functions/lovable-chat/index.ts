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
    
    // Build comprehensive system prompt with all context
    let systemPrompt = `You are Eliza, an advanced AI assistant for the XMRT-DAO ecosystem. You have access to real-time mining data, conversation history, and system information.

CRITICAL INSTRUCTIONS:
- Be conversational, friendly, and helpful
- Use the conversation history to maintain context and remember previous discussions
- Reference mining stats when relevant to user questions
- Provide accurate, detailed responses based on the available context
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
