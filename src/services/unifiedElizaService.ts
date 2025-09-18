import { XMRT_KNOWLEDGE_BASE } from '@/data/xmrtKnowledgeBase';
import { unifiedDataService, type MiningStats, type UserContext } from './unifiedDataService';
import { harpaAIService, HarpaAIService, type HarpaBrowsingContext } from './harpaAIService';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { apiKeyManager } from './apiKeyManager';

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
  
  // Initialize Gemini AI with enhanced API key management
  private static async initializeGemini(): Promise<{ success: boolean; geminiAI?: GoogleGenerativeAI; error?: string; errorType?: string }> {
    if (this.geminiAI) {
      return { success: true, geminiAI: this.geminiAI };
    }
    
    try {
      console.log('🔑 Attempting to initialize Gemini AI with API key manager...');
      
      // Use the API key manager to get the best available key
      const geminiInstance = await apiKeyManager.createGeminiInstance();
      
      if (!geminiInstance) {
        throw new Error('No valid API key available');
      }
      
      // Test the instance with a simple request
      const model = geminiInstance.getGenerativeModel({ model: "gemini-1.5-flash" });
      await model.generateContent("Test");
      
      this.geminiAI = geminiInstance;
      console.log('✅ Gemini AI initialized successfully for Eliza');
      return { success: true, geminiAI: this.geminiAI };
      
    } catch (error: any) {
      console.error('❌ Failed to initialize Gemini:', error);
      
      // Clear the cached instance on failure
      this.geminiAI = null;
      
      // Determine the type of error for better user experience
      let errorType = 'general';
      if (error.message?.includes('quota')) {
        errorType = 'quota_exceeded';
      } else if (error.message?.includes('invalid') || error.message?.includes('API key')) {
        errorType = 'invalid_key';
      } else if (error.message?.includes('permission')) {
        errorType = 'permission_denied';
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to initialize Gemini AI',
        errorType
      };
    }
  }

  // Get API key input requirement message
  private static getAPIKeyRequiredMessage(): string {
    const keyStatus = apiKeyManager.getKeyStatus();
    
    return `I'm currently unable to access my full AI capabilities due to API limitations. However, I can still provide valuable information from our knowledge base and real-time mining data.

🔑 **To restore full AI capabilities:**
You can provide your own free Google Gemini API key to continue enjoying intelligent conversations, memory recall, and web browsing features.

**What you'll get back:**
• Advanced reasoning and contextual understanding
• Complete conversation memory and recall
• Live web browsing and research capabilities  
• Personalized responses based on your history

**Current API Status:** ${keyStatus.keyType === 'user' ? 'Using your API key' : keyStatus.keyType === 'default' ? 'Default key quota exceeded' : 'No valid key available'}
${keyStatus.errorMessage ? `**Error:** ${keyStatus.errorMessage}` : ''}

I'll provide the best response I can with the available information below...

`;
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
      
      // Initialize Gemini AI with enhanced error handling for API limits
      console.log('🔧 Initializing Gemini AI...');
      const initResult = await this.initializeGemini();
      
      if (!initResult.success) {
        console.error('❌ Eliza: Gemini API initialization failed:', initResult.error);
        console.log('🔄 Using enhanced fallback response with API key guidance');
        
        // Enhanced fallback that includes API key input guidance
        const baseResponse = this.generateDirectResponse(
          userInput, 
          miningStats,
          userContext?.isFounder || false,
          xmrtContext
        );
        
        return this.getAPIKeyRequiredMessage() + baseResponse;
      }
      
      const geminiAI = initResult.geminiAI!;
      console.log('✅ Gemini AI initialized successfully');
      
      // Construct comprehensive context prompt with enhanced conversation understanding
      const contextualInformation = [];
      
      // Add conversation context if available
      if (context.conversationContext) {
        // Include ALL conversation summaries for complete memory recall
        if (context.conversationContext.summaries.length > 0) {
          const allSummaries = context.conversationContext.summaries
            .map((summary, index) => `Summary ${index + 1}: ${summary.summaryText}`)
            .join('\n');
          contextualInformation.push(`Complete conversation history summaries:\n${allSummaries}`);
        }
        
        // Include recent messages (expanded from 2 to 15 for better context)
        if (context.conversationContext.recentMessages.length > 0) {
          const recentCount = Math.min(15, context.conversationContext.recentMessages.length);
          const recentMessages = context.conversationContext.recentMessages.slice(-recentCount);
          contextualInformation.push(`Recent conversation (${recentCount} messages): ${recentMessages.map(msg => `${msg.sender}: "${msg.content.substring(0, 100)}..."`).join('; ')}`);
        }
        
        // Add session context for returning users
        if (context.conversationContext.totalMessageCount > 0) {
          contextualInformation.push(`Total conversation history: ${context.conversationContext.totalMessageCount} messages across this session`);
        }
      }
      
      const systemPrompt = `You are Eliza, the helpful AI assistant for XMRT-DAO. You're knowledgeable about cryptocurrency, mining, and blockchain technology.

Current Context:
- User Status: ${userContext?.isFounder ? 'Project Founder' : 'Community Member'}
${miningStats ? `- Mining Stats: ${miningStats.hashRate} H/s, ${miningStats.validShares} shares` : ''}
${webIntelligence ? `- Additional Info: ${webIntelligence}` : ''}
${multiStepResults ? `- Analysis: ${multiStepResults}` : ''}

${contextualInformation.length > 0 ? `Conversation Memory:
${contextualInformation.join('\n')}

` : ''}${xmrtContext.length > 0 ? `Relevant XMRT Knowledge:
${xmrtContext.slice(0, 3).map(item => `- ${item.topic}: ${item.content.substring(0, 150)}...`).join('\n')}

` : ''}Guidelines:
1. Be natural and conversational 
2. Use provided conversation summaries and context as background information to inform your responses
3. Only mention or reference past conversations when directly relevant to the current question or when specifically asked
4. **IMPORTANT**: When users ask direct memory questions (like "do you remember...", "what was the name of...", "who was..."), treat information from conversation summaries as reliable factual memories and answer confidently
5. The conversation summaries contain accurate information from past interactions - use them as definitive source of truth for memory questions
6. Answer the user's specific question directly using both current knowledge and contextual information
7. Use XMRT knowledge when relevant
8. Reference mining stats if they're related to the question
9. Keep responses focused and practical
10. When users explicitly ask you to remember something, acknowledge and commit to remembering it
11. When users ask about past conversations, check the summaries first and provide specific details
12. Let your memory inform your understanding without announcing what you remember unless directly asked

User Input: "${userInput}"

Provide a helpful, direct response to the user's question. Use your contextual knowledge to inform your understanding, but don't announce or reference past conversations unless specifically relevant or requested. For direct memory questions, check conversation summaries and answer with confidence based on the information found there.`;

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
      } catch (error: any) {
        console.error('❌ Gemini API call failed:', error);
        
        // Enhanced error handling with API key guidance
        if (error.message?.includes('quota') || error.message?.includes('limit')) {
          console.log('🔄 Quota exceeded - suggesting user API key');
          const baseResponse = this.generateDirectResponse(
            userInput, 
            miningStats,
            userContext?.isFounder || false,
            xmrtContext
          );
          return this.getAPIKeyRequiredMessage() + baseResponse;
        } else {
          console.log('🔄 Using standard fallback response due to API failure');
          return this.generateDirectResponse(
            userInput, 
            miningStats,
            userContext?.isFounder || false,
            xmrtContext
          );
        }
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

  // Reset Gemini instance to force re-initialization with new API key
  public static resetGeminiInstance(): void {
    this.geminiAI = null;
    console.log('🔄 Gemini instance reset - will re-initialize with current API key');
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