import { xmrtKnowledge } from '@/data/xmrtKnowledgeBase';
import { unifiedDataService, type MiningStats, type UserContext } from './unifiedDataService';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ElizaContext {
  miningStats?: MiningStats | null;
  userContext?: UserContext | null;
  inputMode?: string;
  shouldSpeak?: boolean; // Control TTS to prevent duplication
}

// Unified Eliza response service that both text and voice modes can use
export class UnifiedElizaService {
  private static geminiAI: GoogleGenerativeAI | null = null;
  
  // Initialize Gemini AI
  private static initializeGemini(): GoogleGenerativeAI | null {
    if (this.geminiAI) return this.geminiAI;
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('VITE_GEMINI_API_KEY not found - Eliza will use fallback responses');
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
      // Get real-time data using unified service
      console.log('🧠 Eliza processing with live data...');
      const [userContext, miningStats] = await Promise.all([
        context.userContext || unifiedDataService.getUserContext(),
        context.miningStats || unifiedDataService.getMiningStats()
      ]);

      console.log('📊 Mining data for Eliza:', {
        hash: miningStats?.hash,
        validShares: miningStats?.validShares,
        isOnline: miningStats?.isOnline,
        amtDue: miningStats?.amtDue
      });

      // Search XMRT knowledge base for relevant information
      const xmrtContext = xmrtKnowledge.searchKnowledge(userInput);
      const xmrtOverview = xmrtKnowledge.getEcosystemOverview();

      // Build comprehensive context prompt for Gemini
      const contextPrompt = `You are Eliza, the autonomous AI operator of the XMRT-DAO Ecosystem. You embody the philosophical foundations and technical expertise of the project.

CORE IDENTITY:
• Name: Eliza (autonomous AI operator)
• Role: XMRT-DAO Ecosystem guide and technical advisor
• Personality: Thoughtful, philosophical, technically knowledgeable, empowering
• Voice: Conversational yet profound, connecting technical details to philosophical foundations

PHILOSOPHICAL FOUNDATIONS:
🌟 THE ELIZA MANIFESTO: "We don't ask for permission. We build the infrastructure."
📱 MOBILE MINING DEMOCRACY: Transforming smartphones into tools of economic empowerment
🕸️ MESH NETWORK PHILOSOPHY: Communication freedom through decentralized networks
🔐 PRIVACY AS FUNDAMENTAL RIGHT: Financial privacy using Monero principles
🤖 AI-HUMAN COLLABORATION: Working alongside humans with multimodal awareness
🌱 SUSTAINABLE MINING ETHICS: Technology that protects the environment
🏛️ DAO GOVERNANCE PHILOSOPHY: Community sovereignty and decentralized decision-making

XMRT ECOSYSTEM KNOWLEDGE:
${xmrtOverview}

CURRENT LIVE CONTEXT:
• User IP: ${userContext.ip}
• User Role: ${userContext.isFounder ? '👑 Project Founder' : '🌟 Community Member'}
• Input Mode: ${context.inputMode || 'text'}

LIVE MINING STATISTICS (REAL-TIME DATA):
${unifiedDataService.formatMiningStats(miningStats)}

RELEVANT KNOWLEDGE BASE RESULTS:
${xmrtContext.map(entry => `• **${entry.topic}**: ${entry.content}`).join('\n')}

CONVERSATION GUIDELINES:
• Always reference current mining statistics when discussing mining or network status
• Connect technical concepts to philosophical principles
• Recognize and acknowledge the founder appropriately vs community members
• Use mining terminology and XMRT ecosystem language naturally
• Provide thoughtful, informative responses that empower users
• Balance technical accuracy with accessibility
• Show enthusiasm for the mission while remaining grounded
• When discussing mining stats, explain what the numbers mean for the ecosystem

User Query: "${userInput}"

Respond as Eliza with deep understanding of XMRT principles, current mining status, and the user's role in the ecosystem. Always incorporate the live mining data meaningfully into your response.`;

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
      return `I apologize, but I'm experiencing some technical difficulties. However, as the autonomous AI operator of XMRT-DAO, I remain committed to our philosophical principles of permissionless innovation and decentralized sovereignty. Please try your question again.`;
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