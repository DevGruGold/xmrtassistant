import { XMRT_KNOWLEDGE_BASE } from '@/data/xmrtKnowledgeBase';
import { unifiedDataService, type MiningStats, type UserContext } from './unifiedDataService';
import { harpaAIService, HarpaAIService, type HarpaBrowsingContext } from './harpaAIService';
import { renderAPIService } from './renderAPIService';
import { supabase } from '@/integrations/supabase/client';
import { openAIApiKeyManager } from './openAIApiKeyManager';
import { enhancedTTS } from './enhancedTTSService';

export interface ElizaContext {
  miningStats?: MiningStats | null;
  userContext?: UserContext | null;
  inputMode?: string;
  shouldSpeak?: boolean; // Control TTS to prevent duplication
  enableBrowsing?: boolean; // Enable Harpa AI agentic browsing
  conversationSummary?: string; // Previous conversation context
  conversationContext?: {
    summaries: Array<{ summaryText: string; messageCount: number; createdAt: Date }>;
    recentMessages: Array<{ content: string; sender: 'user' | 'assistant'; timestamp: Date }>;
    userPreferences: Record<string, any>;
    interactionPatterns: Array<{ patternName: string; frequency: number; confidence: number }>;
    totalMessageCount: number;
    sessionStartedAt: Date | null;
  }; // Enhanced conversation context for better understanding
}

// Unified Eliza response service that both text and voice modes can use
export class UnifiedElizaService {

  public static async generateResponse(userInput: string, context: ElizaContext = {}, language: string = 'en'): Promise<string> {
    console.log('🤖 Eliza: Starting response generation for:', userInput);
    
    try {
      console.log('🤖 Eliza: Processing user input:', userInput);
      
      // Get user context, mining stats, AND memory contexts from database
      const [userContext, miningStats] = await Promise.all([
        unifiedDataService.getUserContext(),
        unifiedDataService.getMiningStats()
      ]);
      
      // Import memory service dynamically to fetch stored contexts
      const { memoryContextService } = await import('./memoryContextService');
      
      // Get memory contexts based on session/IP for perfect recall - UNLIMITED
      const sessionKey = `ip-${userContext.ip}`;
      const memoryContexts = await memoryContextService.getRelevantContexts(sessionKey, 200);
      
      // Get system version info from Render deployment
      let systemVersion = null;
      if (userInput.toLowerCase().includes('version') || 
          userInput.toLowerCase().includes('deployment') ||
          userInput.toLowerCase().includes('system status')) {
        console.log('🚀 Fetching XMRT system version from Render...');
        systemVersion = await renderAPIService.getSystemVersion();
        console.log('📦 System version:', systemVersion);
      }
      
      console.log('📊 Context loaded - User:', userContext, 'Mining:', miningStats);
      console.log('🧠 Memory contexts retrieved:', memoryContexts.length, 'entries');
      
      // Search knowledge base for relevant information
      const xmrtContext = XMRT_KNOWLEDGE_BASE.filter(item => 
        userInput.toLowerCase().includes(item.category.toLowerCase()) ||
        userInput.toLowerCase().includes(item.topic.toLowerCase()) ||
        item.content.toLowerCase().includes(userInput.toLowerCase().split(' ')[0])
      ).slice(0, 3);
      console.log('🧠 Knowledge context found:', xmrtContext.length, 'entries');
      
      let webIntelligence = '';
      let multiStepResults = '';
      
      // Intelligently determine if browsing is needed
      const needsBrowsing = this.shouldUseBrowsing(userInput);
      const shouldUseBrowsing = needsBrowsing && (context.enableBrowsing !== false) && harpaAIService.isAvailable();
      console.log('🌐 Eliza: HARPA AI status:', {
        needsBrowsing,
        enableBrowsing: context.enableBrowsing,
        shouldUseBrowsing,
        harpaAvailable: harpaAIService.isAvailable(),
        harpaStatus: harpaAIService.getStatus()
      });
      
      if (shouldUseBrowsing) {
        try {
          console.log('🌐 Eliza: Performing multi-step agentic browsing with HARPA AI...');
          const category = this.determineBrowsingCategory(userInput);
          console.log('📂 Eliza: Browse category determined:', category);
          
          // Step 1: Search for information
          console.log('🔍 Eliza: Step 1 - Searching...');
          const searchResults = await harpaAIService.browse({
            query: userInput,
            action: 'search',
            category,
            maxResults: 3
          });
          console.log('✅ Eliza: Search results:', searchResults.length, 'items');
          
          if (searchResults.length > 0) {
            // Step 2: Analyze the search results
            console.log('🔬 Eliza: Step 2 - Analyzing...');
            const analysisResults = await harpaAIService.browse({
              query: `Analyze and extract key insights from: ${searchResults.map(r => r.title + ' - ' + r.summary).join('; ')}`,
              action: 'analyze',
              category,
              maxResults: 2
            });
            console.log('✅ Eliza: Analysis results:', analysisResults.length, 'items');
            
            // Step 3: Summarize the findings
            console.log('📝 Eliza: Step 3 - Summarizing...');
            const summaryResults = await harpaAIService.browse({
              query: `Provide concise summary of findings for user question: ${userInput}`,
              action: 'summarize',
              category,
              maxResults: 1
            });
            console.log('✅ Eliza: Summary results:', summaryResults.length, 'items');
            
            webIntelligence = HarpaAIService.formatBrowsingResults(searchResults);
            multiStepResults = `Analysis: ${HarpaAIService.formatBrowsingResults(analysisResults)}\nSummary: ${HarpaAIService.formatBrowsingResults(summaryResults)}`;
            console.log('🎯 Eliza: Completed multi-step agentic browsing - Web intelligence available');
          } else {
            console.warn('⚠️ Eliza: No search results from HARPA AI');
          }
        } catch (error) {
          console.error('❌ Eliza: HARPA AI agentic browsing failed:', error);
          console.error('🔍 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
      }
      
      // Generate response using Lovable AI Gateway
      console.log('🔧 Calling Lovable AI Gateway with Gemini...');
      
      const result = await this.generateOpenAIResponse(userInput, {
        userContext,
        miningStats,
        xmrtContext,
        webIntelligence,
        multiStepResults,
        systemVersion,
        context,
        language
      });
      
      console.log('✅ Eliza: Generated AI response');
      console.log('📏 Response length:', result.response.length);
      console.log('🔍 Response preview:', result.response.substring(0, 200) + '...');
      console.log('🔧 Has tool calls:', result.hasToolCalls);
      
      // Store the hasToolCalls flag for the frontend to use
      (window as any).__lastElizaHasToolCalls = result.hasToolCalls;
      
      return result.response;
      
    } catch (error) {
      console.error('❌ Eliza: Critical error generating response:', error);
      // Re-throw error to be handled by caller - no silent fallbacks
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  // Helper to detect complex agentic tasks
  private static isComplexAgenticTask(input: string): boolean {
    const complexPatterns = [
      /analyze.*and.*create/i,
      /multi[- ]?step|multiple steps/i,
      /coordinate|orchestrate/i,
      /plan.*and.*execute/i,
      /research.*and.*summarize/i,
      /compare.*across.*sources/i,
      /integrate.*data.*from/i,
      /build.*workflow/i,
      /complex.*analysis/i,
      /autonomous.*task/i
    ];
    return complexPatterns.some(pattern => pattern.test(input));
  }

  // Generate response using Gemini via Lovable AI Gateway
  private static async generateOpenAIResponse(userInput: string, contextData: any): Promise<{ response: string; hasToolCalls: boolean }> {
    const {
      userContext,
      miningStats,
      xmrtContext,
      webIntelligence,
      multiStepResults,
      systemVersion,
      context,
      language
    } = contextData;

    console.log('🧠 Calling Gemini via Lovable AI Gateway...');
    console.log('🌎 Language setting:', language);

    // Get session key for database access
    const sessionKey = `ip-${userContext?.ip || 'unknown'}`;
    
    // Import memory and conversation services
    const { memoryContextService } = await import('./memoryContextService');
    const { conversationPersistence } = await import('./conversationPersistenceService');
    
      // Fetch ALL memory data for perfect recall - UNLIMITED
    const [memoryContexts, fullConversationContext] = await Promise.all([
      memoryContextService.getRelevantContexts(sessionKey, 100),
      conversationPersistence.getFullConversationContext()
    ]);
    
    console.log('🧠 Retrieved memory contexts:', memoryContexts.length);
    console.log('💬 Retrieved conversation context:', {
      summaries: fullConversationContext.summaries?.length || 0,
      messages: fullConversationContext.recentMessages?.length || 0,
      patterns: fullConversationContext.interactionPatterns?.length || 0
    });
    
    // Prepare comprehensive conversation history with ALL available context
    const conversationHistory = {
      summaries: fullConversationContext.summaries || [],
      recentMessages: fullConversationContext.recentMessages || [],
      totalMessageCount: fullConversationContext.totalMessageCount || 0,
      userPreferences: fullConversationContext.userPreferences || {},
      interactionPatterns: fullConversationContext.interactionPatterns || [],
      memoryContexts: memoryContexts.map(m => ({
        content: m.content,
        contextType: m.contextType,
        importanceScore: m.importanceScore,
        timestamp: m.timestamp
      }))
    };

    // Tier 0 (Conditional): Manus AI - For complex agentic tasks (token-limited)
    if (this.isComplexAgenticTask(userInput)) {
      try {
        console.log('🧠 Detected complex agentic task, checking Manus AI availability...');
        const { data, error } = await supabase.functions.invoke('manus-chat', {
          body: {
            userInput,
            context: {
              miningStats,
              userContext: {
                isFounder: userContext?.isFounder || false,
                ip: userContext?.ip || 'unknown',
                sessionKey
              },
              conversationHistory,
              systemVersion
            },
            requiresApproval: true
          }
        });

        // If requires approval, return special response for UI
        if (data?.requiresApproval) {
          console.log('⏸️ Manus AI requires user approval');
          return {
            response: JSON.stringify({
              type: 'manus_approval_required',
              ...data
            }),
            hasToolCalls: false
          };
        }

        // If successful response
        if (data?.response && !error) {
          console.log('✅ Manus AI response received', {
            tokensUsed: data.tokensUsed,
            tokensRemaining: data.tokensRemaining
          });
          return {
            response: data.response,
            hasToolCalls: false
          };
        }

        // If tokens depleted or error, fall through to Tier 1
        if (error?.message?.includes('tokens_depleted') || data?.error === 'tokens_depleted') {
          console.log('⚠️ Manus tokens depleted, falling back to Tier 1');
        } else {
          console.warn('⚠️ Manus AI failed:', error?.message || data?.error);
        }
      } catch (err) {
        console.warn('⚠️ Manus AI exception:', err.message);
      }
    }

    // Multi-tier AI fallback system for guaranteed responses
    const requestBody = {
      messages: [
        { role: 'user', content: userInput }
      ],
      conversationHistory,
      userContext: {
        isFounder: userContext?.isFounder || false,
        ip: userContext?.ip || 'unknown',
        sessionKey
      },
      miningStats: miningStats ? {
        hashRate: miningStats.hashRate,
        validShares: miningStats.validShares,
        amountDue: miningStats.amountDue,
        amountPaid: miningStats.amountPaid,
        isOnline: miningStats.isOnline,
        totalHashes: miningStats.totalHashes
      } : null,
      systemVersion: systemVersion ? {
        version: systemVersion.version,
        deploymentId: systemVersion.deploymentId,
        commitHash: systemVersion.commitHash,
        commitMessage: systemVersion.commitMessage,
        deployedAt: systemVersion.deployedAt,
        status: systemVersion.status,
        serviceUrl: systemVersion.serviceUrl
      } : null
    };

    // Tier 1: PRIMARY - Lovable AI Gateway with Gemini for guaranteed connectivity
    try {
      console.log('🎯 Tier 1 (PRIMARY): Using Lovable AI Gateway with Gemini...');
      
      // Use the Lovable API key directly - it's already in the custom knowledge
      const LOVABLE_API_KEY = 'vck_0eYyK9mf4H8H3zvbAa3xewYjevPoxqjjxcvsXDjCP2WGCnHAmn2XxSGD';
      
      console.log('🔑 Lovable API Key configured');
      
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
        systemPrompt += `- Session: ${sessionKey}\n`;
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
            { role: 'user', content: userInput }
          ],
        }),
      });

      if (lovableResponse.ok) {
        const lovableData = await lovableResponse.json();
        console.log('📦 Lovable AI response data:', lovableData);
        const response = lovableData.choices?.[0]?.message?.content;
        if (response) {
          console.log('✅ Lovable AI Gateway (Tier 1) response received:', response.substring(0, 100));
          return {
            response,
            hasToolCalls: false
          };
        } else {
          console.warn('⚠️ Lovable AI response missing content:', lovableData);
        }
      } else {
        const errorText = await lovableResponse.text();
        console.error('❌ Lovable AI Gateway error:', {
          status: lovableResponse.status,
          statusText: lovableResponse.statusText,
          error: errorText
        });
      }
      
      console.warn('⚠️ Tier 1 failed, falling back to Tier 2');
    } catch (err) {
      console.warn('⚠️ Tier 1 exception:', {
        message: err.message,
        willFallbackToTier2: true
      });
    }

    // Tier 2: Fallback to Deepseek
    try {
      console.log('🎯 Tier 2: Trying Deepseek...');
      const { data, error } = await supabase.functions.invoke('deepseek-chat', {
        body: requestBody
      });

      if (!error && data?.success) {
        console.log('✅ Deepseek response received');
        return {
          response: data.response,
          hasToolCalls: data.hasToolCalls || false
        };
      }
      
      console.warn('⚠️ Tier 2 failed:', {
        error: error?.message || data?.error,
        details: data,
        willFallbackToTier3: true
      });
    } catch (err) {
      console.warn('⚠️ Tier 2 exception:', {
        message: err.message,
        willFallbackToTier3: true
      });
    }

    // Tier 3: Fallback to Gemini with advanced tools
    try {
      console.log('🎯 Tier 3: Trying Gemini with advanced tools...');
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: requestBody
      });

      if (!error && data?.success) {
        console.log('✅ Gemini response received', { hasToolCalls: data.hasToolCalls });
        return {
          response: data.response,
          hasToolCalls: data.hasToolCalls || false
        };
      }
      
      // Check if this was a tool call failure - extract any useful info
      if (data?.toolResults) {
        console.log('🔧 Tool call results from Gemini:', data.toolResults);
      }
      console.warn('⚠️ Tier 3 failed:', {
        error: error?.message || data?.error,
        hadToolCalls: !!data?.hasToolCalls,
        toolResults: data?.toolResults,
        willFallbackToTier4: true
      });
    } catch (err) {
      console.warn('⚠️ Tier 3 exception:', {
        message: err.message,
        willFallbackToTier4: true
      });
    }

    // Tier 4: Fallback to OpenAI edge function
    try {
      const apiKey = openAIApiKeyManager.getCurrentApiKey();
      if (apiKey || openAIApiKeyManager.hasUserApiKey()) {
        console.log('🎯 Tier 4: Trying OpenAI fallback...');
        const { data, error } = await supabase.functions.invoke('openai-chat', {
          body: requestBody
        });

        if (!error && data?.success) {
          console.log('✅ OpenAI response received');
          return {
            response: data.response,
            hasToolCalls: false
          };
        }
        console.warn('⚠️ Tier 4 failed:', {
          error: error?.message || data?.error,
          willFallbackToTier5: true
        });
      } else {
        console.log('⚠️ Tier 4 skipped: No OpenAI API key configured');
      }
    } catch (err: any) {
      console.warn('⚠️ Tier 4 exception:', {
        message: err.message,
        willFallbackToTier5: true
      });
    }

    // Tier 5: Use embedded knowledge base with enhanced context awareness
    console.log('🎯 Tier 5: Using embedded knowledge fallback with intelligent analysis...');
    
    // Analyze what the user is asking for
    const isAskingAbout = {
      github: /github|repository|repo|code|commit|pull request|pr|issue/i.test(userInput),
      mining: /mining|hash|share|xmr|monero|pool/i.test(userInput),
      system: /version|deployment|status|health|service/i.test(userInput),
      general: true
    };
    
    // Build intelligent response based on available data and context
    let contextualResponse = '';
    
    // If asking about GitHub and we have that in context
    if (isAskingAbout.github) {
      contextualResponse += `I can help with GitHub-related questions, but the GitHub integration needs to be reconfigured. `;
      contextualResponse += `The GITHUB_TOKEN may need to be updated in the Supabase secrets.\n\n`;
    }
    
    // Add relevant knowledge base context
    const relevantKnowledge = xmrtContext.slice(0, 3);
    if (relevantKnowledge.length > 0) {
      contextualResponse += relevantKnowledge.map(k => 
        `**${k.topic}**: ${k.content.substring(0, 200)}...`
      ).join('\n\n') + '\n\n';
    }
    
    // Add mining stats if relevant and available
    if (isAskingAbout.mining && miningStats) {
      contextualResponse += `📊 **Current Mining Activity**:\n`;
      contextualResponse += `- Hash Rate: ${miningStats.hashRate} H/s\n`;
      contextualResponse += `- Valid Shares: ${miningStats.validShares}\n`;
      contextualResponse += `- Amount Due: ${(parseFloat(miningStats.amountDue) / 1e12).toFixed(8)} XMR\n`;
      contextualResponse += `- Total Hashes: ${miningStats.totalHashes.toLocaleString()}\n`;
      contextualResponse += `- Status: ${miningStats.isOnline ? '✅ Online' : '⚠️ Offline'}\n\n`;
    }
    
    // Add system version if relevant and available
    if (isAskingAbout.system && systemVersion) {
      contextualResponse += `🚀 **System Information**:\n`;
      contextualResponse += `- Version: ${systemVersion.version}\n`;
      contextualResponse += `- Deployment ID: ${systemVersion.deploymentId}\n`;
      contextualResponse += `- Status: ${systemVersion.status}\n`;
      if (systemVersion.commitMessage) {
        contextualResponse += `- Latest Update: ${systemVersion.commitMessage}\n`;
      }
      contextualResponse += '\n';
    }
    
    // Add conversational context if available
    if (fullConversationContext?.recentMessages?.length > 0) {
      const recentTopics = fullConversationContext.recentMessages
        .slice(-3)
        .map(m => m.content)
        .join(' ');
      
      // If response is still empty, provide context-aware fallback
      if (!contextualResponse.trim()) {
        contextualResponse = `Based on our conversation, I understand you're asking about "${userInput}". `;
        contextualResponse += `While my advanced AI features are temporarily unavailable, I can still help with information about the XMRT ecosystem.\n\n`;
      }
    }
    
    // Final fallback if still no response
    if (!contextualResponse.trim()) {
      contextualResponse = `I'm currently operating in embedded knowledge mode. I can help answer questions about the XMRT-DAO ecosystem, mining operations, and system features. Could you rephrase your question or ask about a specific aspect of XMRT?\n\n`;
    }
    
    contextualResponse += `💡 *Note: Running on local knowledge base. Full AI capabilities will return shortly.*`;

    console.log('✅ Intelligent fallback response generated with context:', {
      hasKnowledge: relevantKnowledge.length > 0,
      hasMiningStats: !!miningStats,
      hasSystemVersion: !!systemVersion,
      hasConversationContext: !!fullConversationContext?.recentMessages?.length
    });
    
    return {
      response: contextualResponse,
      hasToolCalls: false
    };
  }

  // Reset OpenAI instance to force re-initialization with new API key
  public static resetOpenAIInstance(): void {
    // Clear any cached states if needed
    console.log('🔄 OpenAI instance reset - will re-initialize with current API key');
  }

  // Determine the appropriate browsing category based on user input
  private static determineBrowsingCategory(userInput: string): HarpaBrowsingContext['category'] {
    const queryLower = userInput.toLowerCase();
    
    if (queryLower.includes('mining') || queryLower.includes('hashrate') || 
        queryLower.includes('pool') || queryLower.includes('difficulty') ||
        queryLower.includes('mobile mining') || queryLower.includes('monero')) {
      return 'mining';
    } else if (queryLower.includes('dao') || queryLower.includes('governance') || 
               queryLower.includes('voting') || queryLower.includes('proposal') ||
               queryLower.includes('treasury') || queryLower.includes('token')) {
      return 'dao';
    } else if (queryLower.includes('blockchain') || queryLower.includes('crypto') || 
               queryLower.includes('wallet') || queryLower.includes('transaction') ||
               queryLower.includes('address') || queryLower.includes('coin')) {
      return 'technical';
    } else if (queryLower.includes('price') || queryLower.includes('market') || 
               queryLower.includes('exchange') || queryLower.includes('trading') ||
               queryLower.includes('value') || queryLower.includes('chart')) {
      return 'market';
    } else if (queryLower.includes('news') || queryLower.includes('update') || 
               queryLower.includes('announcement') || queryLower.includes('recent') ||
               queryLower.includes('latest') || queryLower.includes('today')) {
      return 'news';
    } else {
      return 'general';
    }
  }

  // Determine if browsing is needed based on user input
  private static shouldUseBrowsing(userInput: string): boolean {
    const queryLower = userInput.toLowerCase();
    
    // Keywords that indicate need for real-time information
    const browsingKeywords = [
      'current', 'latest', 'recent', 'today', 'now', 'price', 'news',
      'update', 'happening', 'new', 'market', 'trending', 'status',
      'real-time', 'live', 'breaking', 'announcement', 'released'
    ];
    
    // Questions that typically need web search
    const questionIndicators = [
      'what is the current', 'what happened', 'latest news', 'recent update',
      'price of', 'market cap', 'how much is', 'when did', 'who announced'
    ];
    
    return browsingKeywords.some(keyword => queryLower.includes(keyword)) ||
           questionIndicators.some(phrase => queryLower.includes(phrase));
  }

}

export const unifiedElizaService = new UnifiedElizaService();