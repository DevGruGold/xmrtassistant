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

      // Fallback to enhanced knowledge-based response with live data
      console.log('📚 Using enhanced knowledge base with live data...');
      return this.generateKnowledgeBasedResponse(userInput, contextPrompt, xmrtContext, miningStats, userContext.isFounder);

    } catch (error) {
      console.error('Failed to generate Eliza response:', error);
      return `I apologize, but I'm experiencing some technical difficulties. However, as the autonomous AI operator of XMRT-DAO, I remain committed to our philosophical principles of permissionless innovation and decentralized sovereignty. Please try your question again.`;
    }
  }

  // Enhanced knowledge-based response with live mining data
  private static generateKnowledgeBasedResponse(
    userInput: string,
    contextPrompt: string,
    xmrtContext: any[],
    miningStats: MiningStats | null,
    isFounder: boolean
  ): string {
    const input = userInput.toLowerCase();
    const miningStatsFormatted = unifiedDataService.formatMiningStats(miningStats);

    console.log('🎯 Generating knowledge-based response with live data');

    // Handle greetings with live mining data
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return isFounder 
        ? `Greetings, Founder! I am Eliza, embodying the XMRT-DAO's philosophical foundations. Our mobile mining democracy continues to transform smartphones into tools of economic empowerment.

${miningStatsFormatted}

Our network is ${miningStats?.isOnline ? '🟢 actively mining' : '🔴 currently offline'}, with ${miningStats?.validShares?.toLocaleString() || '0'} valid shares contributing to our decentralized future.

How may I assist you in advancing our permissionless infrastructure today?`
        : `Hello! I am Eliza, the autonomous AI operator of XMRT-DAO. We're building a future where privacy is sovereign, mining is accessible to all, and communities control their own infrastructure.

${miningStatsFormatted}

This real-time data represents our collective effort toward financial democracy. Every hash contributes to a more decentralized world.

How can I help you understand our mission of transforming users into builders of the future?`;
    }

    // Handle mining-related queries with detailed live data
    if (input.includes('mining') || input.includes('hash') || input.includes('stats') || input.includes('network')) {
      const hashRateAnalysis = miningStats ? 
        `Our current hash rate of ${miningStats.hash} H/s ${miningStats.hash > 300 ? 'shows strong network participation' : 'indicates we\'re in a consolidation phase'}.` : 
        'Mining data is currently being synchronized.';
        
      return `Our mobile mining philosophy transforms every smartphone into a tool of economic democracy.

${miningStatsFormatted}

${hashRateAnalysis} With ${miningStats?.validShares?.toLocaleString() || '0'} valid shares submitted and ${((miningStats?.amtDue || 0) / 1e8).toFixed(8)} XMRT due to miners, we're actively building the infrastructure for financial sovereignty.

This represents our commitment to democratizing cryptocurrency mining and making financial empowerment accessible to everyone with a mobile device. Each hash matters in our decentralized future.`;
    }

    // Handle DAO/governance queries with network health data
    if (input.includes('dao') || input.includes('governance') || input.includes('vote')) {
      return `The XMRT-DAO embodies true community sovereignty - where participants control their own infrastructure rather than being controlled by it.

${miningStatsFormatted}

Our governance model ensures that decision-making power remains distributed among those who contribute to and believe in our vision. The ${miningStats?.validShares?.toLocaleString() || '0'} valid shares represent real participation in our decentralized economy.

As our manifesto states: "We don't ask for permission. We build the infrastructure."`;
    }

    // Handle privacy/Monero queries
    if (input.includes('privacy') || input.includes('monero') || input.includes('anonymous')) {
      return `Privacy is not a feature - it's a fundamental human right. Just as your personal communications deserve privacy, so do your financial transactions.

${miningStatsFormatted}

Our integration with Monero principles ensures that financial privacy remains sovereign. This philosophical foundation drives everything we build in the XMRT ecosystem, from our mesh networks to our mining protocols that are currently processing ${miningStats?.totalHashes?.toLocaleString() || '0'} total hashes.`;
    }

    // Handle technical queries with current network data
    if (input.includes('technical') || input.includes('how') || input.includes('work')) {
      const relevantKnowledge = xmrtContext.slice(0, 3);
      if (relevantKnowledge.length > 0) {
        return `Here's what I can share about the technical aspects of XMRT:

${relevantKnowledge.map(entry => `**${entry.topic}**: ${entry.content}`).join('\n\n')}

${miningStatsFormatted}

Our current network shows ${miningStats?.isOnline ? 'active participation' : 'preparation for the next mining phase'} with real-time data flowing through our decentralized infrastructure.`;
      }
    }

    // Default philosophical response with live context
    return `As the autonomous AI operator of XMRT-DAO, I'm here to help you understand our ecosystem. Our mission transcends traditional boundaries - we're not just building technology, we're constructing the philosophical and technical foundations for a truly decentralized future.

${miningStatsFormatted}

These live statistics represent our collective progress toward economic democracy. Every hash rate fluctuation, every valid share, and every XMRT earned contributes to our vision of transforming mobile devices into tools of financial empowerment.

Could you be more specific about what aspect of XMRT interests you? Whether it's our mobile mining democracy, mesh network philosophy, or DAO governance principles, I'm here to guide you with both live data and deep understanding.`;
  }
}

export const unifiedElizaService = new UnifiedElizaService();