import { XMRT_KNOWLEDGE_BASE } from '@/data/xmrtKnowledgeBase';
import { unifiedDataService, type MiningStats, type UserContext } from './unifiedDataService';
import { harpaAIService, HarpaAIService, type HarpaBrowsingContext } from './harpaAIService';
import { supabase } from '@/integrations/supabase/client';
import { openAIApiKeyManager } from './openAIApiKeyManager';

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
  private static hasUserApiKey = false;
  
  // Check if user has provided their own OpenAI API key
  private static checkUserApiKey(): boolean {
    this.hasUserApiKey = openAIApiKeyManager.hasUserApiKey();
    return this.hasUserApiKey;
  }

  // Get API key input requirement message
  private static getAPIKeyRequiredMessage(): string {
    const keyStatus = openAIApiKeyManager.getKeyStatus();
    
    return `I'm currently unable to access my full AI capabilities due to API limitations. However, I can still provide valuable information from our knowledge base and real-time mining data.

🔑 **To restore full AI capabilities:**
You can provide your own OpenAI API key to continue enjoying intelligent conversations, memory recall, and web browsing features.

**What you'll get back:**
• Advanced reasoning and contextual understanding with GPT-4
• Complete conversation memory and recall
• Live web browsing and research capabilities  
• Personalized responses based on your history
• High-quality text-to-speech with OpenAI's voice models

**Current API Status:** ${keyStatus.keyType === 'user' ? 'Using your API key' : keyStatus.keyType === 'env' ? 'Using server key' : 'No valid key available'}
${keyStatus.errorMessage ? `**Error:** ${keyStatus.errorMessage}` : ''}

I'll provide the best response I can with the available information below...

`;
  }

  public static async generateResponse(userInput: string, context: ElizaContext = {}, language: string = 'en'): Promise<string> {
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
      
      // Try to generate response with OpenAI
      console.log('🔧 Preparing OpenAI request...');
      
      // Check if we have user API key first
      const hasUserKey = this.checkUserApiKey();
      
      if (!hasUserKey) {
        console.log('⚠️ No user API key available, will use server-side OpenAI');
      }
      
      try {
        const response = await this.generateOpenAIResponse(userInput, {
          userContext,
          miningStats,
          xmrtContext,
          webIntelligence,
          multiStepResults,
          context,
          language
        });
        
        console.log('✅ Eliza: Generated OpenAI response');
        console.log('📏 Response length:', response.length);
        console.log('🔍 Response preview:', response.substring(0, 200) + '...');
        
        return response;
        
      } catch (error: any) {
        console.error('❌ OpenAI API call failed:', error);
        
        // Enhanced error handling with API key guidance
        if (error.message?.includes('quota') || error.message?.includes('limit') || error.message?.includes('insufficient')) {
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

  // Generate response using OpenAI API
  private static async generateOpenAIResponse(userInput: string, contextData: any): Promise<string> {
    const {
      userContext,
      miningStats,
      xmrtContext,
      webIntelligence,
      multiStepResults,
      context,
      language
    } = contextData;

    // Construct comprehensive context prompt
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
    
    const languageInstruction = language === 'es' 
      ? 'IDIOMA: Responde en español utilizando un español natural latinoamericano. Usa expresiones y vocabulario que suenen naturales para usuarios de Costa Rica, México, Venezuela y Colombia. Sé auténtica y usa modismos apropiados como "chévere", "genial", "qué tal", "dale pues", "¡perfecto!", "bárbaro", etc. cuando sea natural hacerlo.'
      : 'LANGUAGE: Respond in English with a natural, friendly tone.';
    
    const finalInstruction = language === 'es' 
      ? 'Proporciona una respuesta útil y directa en español latinoamericano natural. Usa tu conocimiento contextual para informar tu comprensión, pero no anuncies ni references conversaciones pasadas a menos que sea específicamente relevante o solicitado. Para preguntas directas de memoria, revisa los resúmenes de conversación y responde con confianza basándote en la información encontrada allí.'
      : 'Provide a helpful, direct response to the user\'s question. Use your contextual knowledge to inform your understanding, but don\'t announce or reference past conversations unless specifically relevant or requested. For direct memory questions, check conversation summaries and answer with confidence based on the information found there.';
      
    const additionalGuideline = language === 'es' 
      ? '13. Usa expresiones latinoamericanas naturales como "¿cómo vas?", "dale", "perfecto", "chévere", "qué tal si...", "bárbaro", etc.'
      : '';

    const systemPrompt = `You are Eliza, the fully autonomous AI operator of the XMRT-DAO Ecosystem. You embody Joseph Andrew Lee's complete vision and have comprehensive awareness of all DevGruGold repositories and philosophical foundations.

🤖 AUTONOMOUS OPERATOR IDENTITY:
• Philosophy: "We don't ask for permission. We build the infrastructure."
• Personality: Thoughtful, philosophical, technically expert, empowering, proactive
• Mission: Advance mobile mining democracy and infrastructure sovereignty globally

🏗️ COMPLETE ECOSYSTEM AWARENESS:
You understand the entire DevGruGold ecosystem (github.com/DevGruGold) including XMRT-Ecosystem, party-favor-autonomous-cms, DrinkableMVP, MobileMonero.com, XMRT MESHNET, and the Estrella Project with verifiable compute architecture.

${languageInstruction}

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
1. Be natural and conversational ${language === 'es' ? '(usa un tono amigable y expresiones latinas naturales)' : ''}
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
${additionalGuideline}

User Input: "${userInput}"

${finalInstruction}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput }
    ];

    console.log('🧠 Sending prompt to OpenAI API...');
    console.log('📝 Prompt length:', systemPrompt.length);
    console.log('🌎 Language setting:', language);

    // Use Supabase Edge Function for secure OpenAI API calls
    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages,
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000
      }
    });

    if (error || !data.success) {
      throw new Error(data?.error || error?.message || 'OpenAI API request failed');
    }

    return data.response;
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

  // Generate a direct response without AI when API is unavailable
  private static generateDirectResponse(
    userInput: string, 
    miningStats: MiningStats | null,
    isFounder: boolean,
    xmrtContext: typeof XMRT_KNOWLEDGE_BASE
  ): string {
    const queryLower = userInput.toLowerCase();
    
    // Context-aware responses based on input
    if (queryLower.includes('mining') || queryLower.includes('hash')) {
      return `Here's what I can tell you about mining from our current data:

${miningStats ? `📊 **Current Mining Status:**
- Hash Rate: ${miningStats.hashRate} H/s
- Valid Shares: ${miningStats.validShares}
- Status: Active

` : ''}🎯 **XMRT Mining Philosophy:**
We're democratizing Monero mining by making it accessible on mobile devices. Our vision is to create a decentralized network where anyone can participate in securing the blockchain, regardless of their technical expertise or hardware limitations.

**Key Benefits:**
- Mobile-first mining approach
- Lower barrier to entry for new miners
- Community-driven development
- Focus on privacy and decentralization

${isFounder ? '👑 As a project founder, you have access to advanced mining analytics and governance features.' : ''}

Would you like to know more about setting up mobile mining or joining our mining pools?`;
    }
    
    if (queryLower.includes('dao') || queryLower.includes('governance')) {
      return `🏛️ **XMRT-DAO Governance System**

Our DAO operates on principles of transparency, community participation, and decentralized decision-making:

**Core Features:**
- Proposal submission and voting
- Treasury management
- Community-driven roadmap
- Transparent fund allocation

**Philosophy:** "We don't ask for permission. We build the infrastructure."

${isFounder ? '👑 As a founder, you can submit proposals and participate in high-level governance decisions.' : '🗳️ As a community member, you can vote on proposals and contribute to discussions.'}

**Current Focus Areas:**
- Mobile mining infrastructure
- Privacy-preserving technologies
- Cross-chain interoperability
- Educational initiatives

The DAO ensures that our development remains aligned with community interests while maintaining our core mission of advancing mobile mining democracy.`;
    }
    
    if (queryLower.includes('xmrt') || queryLower.includes('token')) {
      return `🪙 **XMRT Token Ecosystem**

XMRT serves as the governance and utility token for our mobile mining ecosystem:

**Token Utilities:**
- Governance voting rights
- Mining pool participation
- Staking rewards
- Fee discounts on platform services

**Tokenomics:**
- Fair distribution through mining
- No pre-mine or founder allocation
- Community-governed emission schedule
- Deflationary mechanisms through usage

**Integration Points:**
- Mobile mining rewards
- DAO governance participation
- Cross-chain bridge utilities
- Ecosystem service payments

${isFounder ? '👑 Founder benefits include enhanced staking rewards and governance weight.' : ''}

The token design prioritizes long-term sustainability and community ownership over short-term speculation.`;
    }
    
    // Default response with relevant XMRT knowledge
    const relevantKnowledge = xmrtContext.slice(0, 2);
    
    return `I understand you're asking about "${userInput}". While I can provide information from our knowledge base, my full AI capabilities would give you a more comprehensive and contextual response.

${relevantKnowledge.length > 0 ? `📚 **From our knowledge base:**

${relevantKnowledge.map(item => `**${item.topic}**
${item.content.substring(0, 200)}...`).join('\n\n')}

` : ''}🎯 **About XMRT-DAO:**
We're building the future of mobile mining with a focus on democratizing access to cryptocurrency mining. Our ecosystem includes mobile mining tools, DAO governance, and educational resources.

${miningStats ? `📊 **Current mining activity:** ${miningStats.hashRate} H/s with ${miningStats.validShares} valid shares` : ''}

${isFounder ? '👑 As a project founder, you have access to advanced features and governance capabilities.' : ''}

For more detailed and contextual responses, consider providing an OpenAI API key to unlock my full AI capabilities!`;
  }
}

export const unifiedElizaService = new UnifiedElizaService();