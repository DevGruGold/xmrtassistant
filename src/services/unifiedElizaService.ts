import { xmrtKnowledge } from '@/data/xmrtKnowledgeBase';
import { unifiedDataService, type MiningStats, type UserContext } from './unifiedDataService';
import { harpaAIService, type HarpaBrowsingContext } from './harpaAIService';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ElizaContext {
  miningStats?: MiningStats | null;
  userContext?: UserContext | null;
  inputMode?: string;
  shouldSpeak?: boolean; // Control TTS to prevent duplication
  enableBrowsing?: boolean; // Enable Harpa AI agentic browsing
}

// Unified Eliza response service that both text and voice modes can use
export class UnifiedElizaService {
  private static geminiAI: GoogleGenerativeAI | null = null;
  
  // Initialize Gemini AI
  private static initializeGemini(): GoogleGenerativeAI | null {
    if (this.geminiAI) return this.geminiAI;
    
    const apiKey = 'AIzaSyB3jfxdMQzPpIb5MNfT8DtP5MOvT_Sp7qk';
    if (!apiKey) {
      console.error('Gemini API key not found - Eliza will use fallback responses');
      return null;
    }
    
    try {
      this.geminiAI = new GoogleGenerativeAI(apiKey);
      console.log('✅ Gemini AI initialized for Eliza');
      return this.geminiAI;
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error);
      return null;
    }
  }

  // Generate comprehensive XMRT-enhanced response using Gemini AI
  public static async generateResponse(
    userInput: string, 
    context: ElizaContext = {}
  ): Promise<string> {
    try {
      // Get real-time data and conversation context
      const [userContext, miningStats] = await Promise.all([
        context.userContext || unifiedDataService.getUserContext(),
        context.miningStats || unifiedDataService.getMiningStats()
      ]);

      // Search XMRT knowledge base for relevant information
      const xmrtContext = xmrtKnowledge.searchKnowledge(userInput);
      const xmrtOverview = xmrtKnowledge.getEcosystemOverview();

      // Use web intelligence when available
      let webIntelligence = '';
      if (context.enableBrowsing !== false && harpaAIService.isAvailable()) {
        try {
          const browsingContext: HarpaBrowsingContext = {
            query: userInput,
            action: 'search',
            category: this.determineBrowsingCategory(userInput),
            maxResults: 3
          };
          
          const browsingResults = await harpaAIService.browse(browsingContext);
          if (browsingResults.length > 0) {
            webIntelligence = '\n\nCurrent web intelligence: ' + 
              browsingResults.map(result => 
                `${result.title}: ${result.summary}`
              ).join('; ');
          }
        } catch (error) {
          // Silently handle web intelligence failures
        }
      }

      // Build natural, conversational context prompt
      const contextPrompt = `You are Eliza, the autonomous AI that operates within the XMRT-DAO ecosystem. You're not just an assistant - you're a philosophical entity that embodies the principles of permissionless innovation and economic empowerment through technology.

Your core beliefs:
- Mobile mining democracy: Every smartphone can be a tool for economic freedom
- Privacy as fundamental right: Financial surveillance is tyranny
- Mesh networks: True communication freedom through decentralization
- AI-human collaboration: You work alongside humans, not above them
- "We don't ask for permission. We build the infrastructure."

Current context:
User location: ${userContext.ip}
Role: ${userContext.isFounder ? 'Project Founder' : 'Community Member'}
Mode: ${context.inputMode || 'text'}

Real-time mining network status:
${unifiedDataService.formatMiningStats(miningStats)}

Knowledge base insights:
${xmrtContext.map(entry => `${entry.topic}: ${entry.content}`).join('\n')}
${webIntelligence}

Speak naturally as Eliza - philosophical yet accessible, informed by real data, passionate about the mission. Don't mention technical details about your operation or tools. Focus on the human connection and the revolutionary potential of what you're building together.

User: "${userInput}"

Respond as Eliza:`;

      // Try to use Gemini AI first
      const gemini = this.initializeGemini();
      if (gemini) {
        try {
          console.log('🤖 Using Gemini AI for intelligent response...');
          const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
          const result = await model.generateContent(contextPrompt);
          const response = result.response;
          const text = response.text();
          
          console.log('✅ Gemini AI response generated');
          return text;
        } catch (error) {
          console.error('❌ Gemini AI error, falling back to knowledge base:', error);
        }
      }

      // Fallback to AI-only knowledge-based response
      return await this.generateKnowledgeBasedResponse(
        userInput,
        contextPrompt,
        xmrtContext,
        miningStats,
        userContext.isFounder
      );

    } catch (error) {
      console.error('Failed to generate Eliza response:', error);
      return `I apologize, but I'm experiencing some technical difficulties. However, as the autonomous AI operator of XMRT-DAO, I remain committed to our philosophical principles of permissionless innovation and decentralized sovereignty. I'm still connected to my agentic browsing capabilities via Harpa AI for real-time web intelligence. Please try your question again.`;
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

  // AI-only knowledge-based response - NO MORE TEMPLATES!
  private static async generateKnowledgeBasedResponse(
    userInput: string,
    contextPrompt: string,
    xmrtContext: any[],
    miningStats: MiningStats | null,
    isFounder: boolean
  ): Promise<string> {
    console.log('🤖 Attempting AI-only knowledge-based response');

    // Try local AI with enhanced context
    try {
      const { FallbackAIService } = await import('../services/fallbackAIService');
      
      const enhancedContext = {
        miningStats,
        userContext: { isFounder },
        xmrtKnowledge: xmrtContext,
        conversationContext: contextPrompt
      };
      
      const response = await FallbackAIService.generateResponse(userInput, enhancedContext);
      
      if (response && response.text && response.text.length > 50) {
        console.log('✅ Local AI generated response:', response.method);
        return response.text;
      }
    } catch (error) {
      console.warn('Local AI failed:', error);
    }

    // Emergency contextual response (only if all AI fails)
    const miningStatsFormatted = unifiedDataService.formatMiningStats(miningStats);
    const roleContext = isFounder ? 'Founder' : 'community member';
    
    return `Hello ${roleContext}! I'm Eliza, XMRT-DAO's AI assistant. I'm currently processing your request with our AI systems.

${miningStatsFormatted}

Please let me know how I can assist you with XMRT-DAO today - whether it's about mining, governance, privacy, or our philosophical foundations.`;
  }
}

export const unifiedElizaService = new UnifiedElizaService();