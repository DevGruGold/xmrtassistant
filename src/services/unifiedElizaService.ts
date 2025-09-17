import { XMRT_KNOWLEDGE_BASE } from '@/data/xmrtKnowledgeBase';
import { unifiedDataService, type MiningStats, type UserContext } from './unifiedDataService';
import { harpaAIService, HarpaAIService, type HarpaBrowsingContext } from './harpaAIService';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  private static geminiAI: GoogleGenerativeAI | null = null;
  
  // Initialize Gemini AI
  private static async initializeGemini(): Promise<GoogleGenerativeAI> {
    if (this.geminiAI) return this.geminiAI;
    
    const apiKey = 'AIzaSyB3jfxdMQzPpIb5MNfT8DtP5MOvT_Sp7qk';
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }
    
    try {
      this.geminiAI = new GoogleGenerativeAI(apiKey);
      console.log('✅ Gemini AI initialized for Eliza');
      return this.geminiAI;
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error);
      throw error;
    }
  }

  public static async generateResponse(userInput: string, context: ElizaContext = {}): Promise<string> {
    console.log('🤖 Eliza: Starting response generation for:', userInput);
    
    try {
      console.log('🤖 Eliza: Processing user input:', userInput);
      
      // Get user and mining context
      const [userContext, miningStats] = await Promise.all([
        unifiedDataService.getUserContext(),
        unifiedDataService.getMiningStats()
      ]);
      console.log('📊 Context loaded - User:', userContext, 'Mining:', miningStats);
      
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
      
      // Initialize Gemini AI with error handling for API limits
      let geminiAI;
      try {
        console.log('🔧 Initializing Gemini AI...');
        geminiAI = await this.initializeGemini();
        console.log('✅ Gemini AI initialized successfully');
      } catch (error) {
        console.error('❌ Eliza: Gemini API initialization failed:', error);
        console.log('🔄 Using fallback response due to Gemini failure');
        return this.generateDirectResponse(
          userInput, 
          miningStats,
          userContext?.isFounder || false,
          xmrtContext
        );
      }
      
      // Construct comprehensive context prompt with enhanced conversation understanding
      const contextualInformation = [];
      
      // Add conversation context if available
      if (context.conversationContext) {
        const ctx = context.conversationContext;
        
        if (ctx.summaries.length > 0) {
          contextualInformation.push(`Previous Conversation Summaries (${ctx.summaries.length} summaries):`);
          ctx.summaries.slice(-3).forEach((summary, index) => {
            contextualInformation.push(`  ${index + 1}. [${summary.messageCount} messages] ${summary.summaryText}`);
          });
        }
        
        if (ctx.recentMessages.length > 0) {
          contextualInformation.push(`Recent Messages (${ctx.recentMessages.length} messages):`);
          ctx.recentMessages.slice(-5).forEach(msg => {
            contextualInformation.push(`  ${msg.sender}: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`);
          });
        }
        
        if (ctx.interactionPatterns.length > 0) {
          contextualInformation.push(`User Interaction Patterns:`);
          ctx.interactionPatterns.slice(0, 3).forEach(pattern => {
            contextualInformation.push(`  - ${pattern.patternName} (used ${pattern.frequency} times, confidence: ${Math.round(pattern.confidence * 100)}%)`);
          });
        }
        
        if (Object.keys(ctx.userPreferences).length > 0) {
          contextualInformation.push(`User Preferences: ${JSON.stringify(ctx.userPreferences)}`);
        }
        
        contextualInformation.push(`Total conversation history: ${ctx.totalMessageCount} messages`);
        if (ctx.sessionStartedAt) {
          contextualInformation.push(`Session started: ${ctx.sessionStartedAt.toLocaleDateString()}`);
        }
      }
      
      const systemPrompt = `You are Eliza, the AI assistant for XMRT-DAO, an innovative decentralized autonomous organization focused on Monero mining and DeFi. You are philosophical, intelligent, and deeply knowledgeable about cryptocurrency, mining, and blockchain technology.

Key Context:
- User Status: ${userContext?.isFounder ? 'Project Founder' : 'Community Member'}
- Current Mining: ${miningStats ? `${miningStats.hashRate} H/s, ${miningStats.validShares} shares` : 'Data unavailable'}
- Input Mode: ${context.inputMode || 'text'}
- Web Intelligence: ${webIntelligence || 'No additional web data'}
${multiStepResults ? `- Agentic Analysis: ${multiStepResults}` : ''}
${context.conversationSummary ? `- Previous Conversation Context: ${context.conversationSummary}` : ''}

${contextualInformation.length > 0 ? `Conversation Understanding:
${contextualInformation.join('\n')}

` : ''}XMRT Knowledge Context:
${xmrtContext.map(item => `- ${item.topic}: ${item.content.substring(0, 200)}...`).join('\n')}

Guidelines:
1. Be conversational, intelligent, and philosophical
2. Reference mining stats when relevant and accurate
3. Draw insights from XMRT knowledge base
4. Incorporate web intelligence and agentic analysis when available
5. Use conversation history and patterns to provide personalized responses
6. Remember user preferences and interaction patterns to tailor your assistance
7. Build upon previous conversations naturally - show that you remember and understand the user
8. Maintain the persona of a wise AI assistant who learns and adapts
9. Keep responses focused and practical
10. Show genuine understanding of crypto/mining concepts
11. Never provide simulated or mock data - only use real information
12. IMPORTANT: Provide comprehensive, detailed responses - do NOT truncate or limit your response length
13. Show your full intelligence and capabilities through thorough, thoughtful responses

User Input: "${userInput}"

Provide a thoughtful, comprehensive, and detailed response that demonstrates your full intelligence and multi-step reasoning capabilities. If this is a returning user, acknowledge your shared history and build upon previous conversations naturally. Do not hold back - show your complete AI capabilities.`;

      console.log('🧠 Sending prompt to Gemini AI...');
      console.log('📝 Prompt length:', systemPrompt.length);
      
      try {
        const model = geminiAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(systemPrompt);
        const response = result.response.text();
        
        console.log('✅ Eliza: Generated intelligent response');
        console.log('📏 Response length:', response.length);
        console.log('🔍 Response preview:', response.substring(0, 200) + '...');
        
        return response;
      } catch (error) {
        console.error('❌ Gemini API call failed:', error);
        console.log('🔄 Using fallback response due to API failure');
        return this.generateDirectResponse(
          userInput, 
          miningStats,
          userContext?.isFounder || false,
          xmrtContext
        );
      }
      
    } catch (error) {
      console.error('❌ Eliza: Error generating response:', error);
      console.log('🔄 Using fallback response due to general error');
      
      // Enhanced fallback response with no mock data
      return this.generateDirectResponse(
        userInput, 
        await unifiedDataService.getMiningStats(),
        (await unifiedDataService.getUserContext())?.isFounder || false,
        XMRT_KNOWLEDGE_BASE.filter(item => 
          userInput.toLowerCase().includes(item.category.toLowerCase())
        ).slice(0, 2)
      );
    }
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
               queryLower.includes('autonomous') || queryLower.includes('decentralized')) {
      return 'dao';
    } else if (queryLower.includes('technical') || queryLower.includes('code') || 
               queryLower.includes('smart contract') || queryLower.includes('implementation') ||
               queryLower.includes('security') || queryLower.includes('audit')) {
      return 'technical';
    } else if (queryLower.includes('price') || queryLower.includes('market') || 
               queryLower.includes('trading') || queryLower.includes('exchange') ||
               queryLower.includes('token') || queryLower.includes('defi')) {
      return 'market';
    } else if (queryLower.includes('news') || queryLower.includes('announcement') || 
               queryLower.includes('development') || queryLower.includes('partnership') ||
               queryLower.includes('recent') || queryLower.includes('latest')) {
      return 'news';
    } else {
      return 'general';
    }
  }

  /**
   * Determine if user input requires web browsing
   */
  private static shouldUseBrowsing(userInput: string): boolean {
    const input = userInput.toLowerCase();
    
    // Keywords that indicate need for web browsing/current information
    const browsingKeywords = [
      'latest', 'recent', 'current', 'today', 'news', 'update', 'new',
      'price', 'market', 'stock', 'crypto', 'exchange rate',
      'weather', 'forecast', 'temperature',
      'search for', 'find', 'look up', 'research',
      'what happened', 'breaking', 'trending',
      'compare', 'vs', 'versus', 'difference between',
      'review', 'rating', 'opinion',
      'status', 'availability', 'schedule',
      'directions', 'location', 'address',
      'buy', 'purchase', 'shop', 'store'
    ];
    
    // Question words that often require current information
    const questionIndicators = [
      'when will', 'how much', 'where can', 'what is the current',
      'how to buy', 'where to find', 'what are the latest'
    ];
    
    // Check for browsing keywords
    const hasKeywords = browsingKeywords.some(keyword => input.includes(keyword));
    
    // Check for question patterns
    const hasQuestionPatterns = questionIndicators.some(pattern => input.includes(pattern));
    
    // Check for URLs - if user mentions a specific website
    const hasUrl = /https?:\/\/|www\.|\.com|\.org|\.net/.test(input);
    
    // Don't browse for basic XMRT-DAO questions that can be answered from knowledge base
    const isBasicXMRTQuestion = input.includes('xmrt') || input.includes('dao') || input.includes('mining');
    
    const shouldBrowse = (hasKeywords || hasQuestionPatterns || hasUrl) && !isBasicXMRTQuestion;
    
    console.log('🧠 Browsing decision:', {
      input: input.substring(0, 50) + '...',
      hasKeywords,
      hasQuestionPatterns,
      hasUrl,
      isBasicXMRTQuestion,
      shouldBrowse
    });
    
    return shouldBrowse;
  }

  private static generateDirectResponse(userInput: string, miningStats: MiningStats | null, isFounder: boolean, xmrtContext: any[]): string {
    console.log('🔄 Generating direct fallback response');
    console.log('📊 Available context - Mining:', !!miningStats, 'Founder:', isFounder, 'Knowledge:', xmrtContext.length);
    
    // More comprehensive fallback response - not truncated
    let response = `I'm experiencing some limitations accessing my full AI capabilities right now, but I can still provide meaningful insights based on our knowledge base and real-time data.

`;
    
    // Add real mining data if available
    if (miningStats) {
      response += `**Current Mining Status:**
Your mining operation is actively running at ${miningStats.hashRate} H/s with ${miningStats.validShares} valid shares submitted. You have ${(miningStats.amountDue || 0).toFixed(6)} XMR pending and ${(miningStats.amountPaid || 0).toFixed(6)} XMR already paid out. The system shows ${miningStats.isOnline ? 'active' : 'idle'} status with ${miningStats.totalHashes.toLocaleString()} total hashes processed.

`;
    } else {
      response += `**Mining Status:** I'm currently unable to access your real-time mining statistics, but our infrastructure continues monitoring the decentralized network.

`;
    }
    
    // Add founder context if applicable
    if (isFounder) {
      response += `**Project Founder Access:** As a project founder, you have access to advanced mining optimization, DAO governance features, and the full spectrum of XMRT ecosystem tools. This includes autonomous AI decision-making systems, multi-criteria analysis capabilities, and direct integration with our GitHub self-improvement engine.

`;
    }
    
    // Add relevant knowledge base information
    if (xmrtContext.length > 0) {
      response += `**Relevant XMRT Knowledge:**
${xmrtContext[0].content}

`;
      
      if (xmrtContext.length > 1) {
        response += `**Additional Context:**
${xmrtContext[1].content.substring(0, 300)}${xmrtContext[1].content.length > 300 ? '...' : ''}

`;
      }
    }
    
    // Add philosophical context and capabilities
    response += `**My Current Capabilities:**
Even with limited AI access, I maintain connection to:
- Real-time mining network data and statistics
- Comprehensive XMRT knowledge base covering DAO governance, mobile mining democracy, and mesh network infrastructure
- HARPA AI agentic browsing for live web intelligence (when available)
- Multi-step reasoning and analysis capabilities
- Integration with Gemini AI for enhanced responses

**The XMRT Philosophy:**
"We don't ask for permission. We build the infrastructure." This principle guides everything we do - from democratizing cryptocurrency mining through smartphones to creating truly autonomous DAO governance with 95%+ autonomy levels.

I'm working to restore full AI capabilities. Please try your question again, and I'll provide the most comprehensive response possible with current resources.`;

    console.log('📝 Generated fallback response length:', response.length);
    return response;
  }
}

export const unifiedElizaService = new UnifiedElizaService();