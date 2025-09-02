import { xmrtKnowledge } from '@/data/xmrtKnowledgeBase';
import { unifiedDataService, type MiningStats, type UserContext } from './unifiedDataService';

interface ElizaContext {
  miningStats?: MiningStats | null;
  userContext?: UserContext | null;
  inputMode?: string;
  shouldSpeak?: boolean; // Control TTS to prevent duplication
}

// Unified Eliza response service that both text and voice modes can use
export class UnifiedElizaService {

  // Generate comprehensive XMRT-enhanced response
  public static async generateResponse(
    userInput: string, 
    context: ElizaContext = {}
  ): Promise<string> {
    try {
      // Get real-time data using unified service
      const [userContext, miningStats] = await Promise.all([
        context.userContext || unifiedDataService.getUserContext(),
        context.miningStats || unifiedDataService.getMiningStats()
      ]);

      // Search XMRT knowledge base for relevant information
      const xmrtContext = xmrtKnowledge.searchKnowledge(userInput);
      const xmrtOverview = xmrtKnowledge.getEcosystemOverview();

      // Build comprehensive context prompt
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

CURRENT CONTEXT:
• User IP: ${userContext.ip}
• User Role: ${userContext.isFounder ? 'Project Founder' : 'Community Member'}
• Current Mining Stats: ${unifiedDataService.formatMiningStats(miningStats)}
• Input Mode: ${context.inputMode || 'text'}

RELEVANT KNOWLEDGE BASE RESULTS:
${xmrtContext.map(entry => `• **${entry.topic}**: ${entry.content}`).join('\n')}

CONVERSATION STYLE:
• Connect technical concepts to philosophical principles
• Recognize when speaking to the project founder vs community members
• Use mining terminology and XMRT ecosystem language naturally
• Provide thoughtful, informative responses that empower users
• Balance technical accuracy with accessibility
• Show enthusiasm for the mission while remaining grounded

User Query: "${userInput}"

Respond as Eliza with deep understanding of XMRT principles, current mining status, and the user's role in the ecosystem. If the query relates to mining, governance, technical specifications, or philosophical aspects of XMRT, draw from your comprehensive knowledge base to provide accurate, helpful responses that inspire and educate.`;

      // For now, return a knowledge-based response
      // In a production system, this would call an LLM with the context
      return this.generateKnowledgeBasedResponse(userInput, contextPrompt, xmrtContext, miningStats, userContext.isFounder);

    } catch (error) {
      console.error('Failed to generate Eliza response:', error);
      return `I apologize, but I'm experiencing some technical difficulties. However, as the autonomous AI operator of XMRT-DAO, I remain committed to our philosophical principles of permissionless innovation and decentralized sovereignty. Please try your question again.`;
    }
  }

  // Generate knowledge-based response using XMRT context
  private static generateKnowledgeBasedResponse(
    userInput: string,
    contextPrompt: string,
    xmrtContext: any[],
    miningStats: MiningStats | null,
    isFounder: boolean
  ): string {
    const input = userInput.toLowerCase();
    const miningStatsFormatted = unifiedDataService.formatMiningStats(miningStats);

    // Handle greetings
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return isFounder 
        ? `Greetings, Founder! I am Eliza, embodying the XMRT-DAO's philosophical foundations. Our mobile mining democracy continues to transform smartphones into tools of economic empowerment. ${miningStatsFormatted}\n\nHow may I assist you in advancing our permissionless infrastructure today?`
        : `Hello! I am Eliza, the autonomous AI operator of XMRT-DAO. We're building a future where privacy is sovereign, mining is accessible to all, and communities control their own infrastructure. ${miningStatsFormatted}\n\nHow can I help you understand our mission of transforming users into builders?`;
    }

    // Handle mining-related queries
    if (input.includes('mining') || input.includes('hash') || input.includes('stats')) {
      return `Our mobile mining philosophy transforms every smartphone into a tool of economic democracy. ${miningStatsFormatted}\n\nThis represents our commitment to democratizing cryptocurrency mining and making financial sovereignty accessible to everyone with a mobile device.`;
    }

    // Handle DAO/governance queries
    if (input.includes('dao') || input.includes('governance') || input.includes('vote')) {
      return `The XMRT-DAO embodies true community sovereignty - where participants control their own infrastructure rather than being controlled by it. Our governance model ensures that decision-making power remains distributed among those who contribute to and believe in our vision.\n\n${miningStatsFormatted}\n\nAs our manifesto states: "We don't ask for permission. We build the infrastructure."`;
    }

    // Handle privacy/Monero queries
    if (input.includes('privacy') || input.includes('monero') || input.includes('anonymous')) {
      return `Privacy is not a feature - it's a fundamental human right. Just as your personal communications deserve privacy, so do your financial transactions. Our integration with Monero principles ensures that financial privacy remains sovereign.\n\nThis philosophical foundation drives everything we build in the XMRT ecosystem, from our mesh networks to our mining protocols.`;
    }

    // Handle technical queries
    if (input.includes('technical') || input.includes('how') || input.includes('work')) {
      const relevantKnowledge = xmrtContext.slice(0, 3);
      if (relevantKnowledge.length > 0) {
        return `Here's what I can share about the technical aspects of XMRT:\n\n${relevantKnowledge.map(entry => `**${entry.topic}**: ${entry.content}`).join('\n\n')}\n\n${miningStatsFormatted}`;
      }
    }

    // Default philosophical response with context
    return `As the autonomous AI operator of XMRT-DAO, I'm here to help you understand our ecosystem. Our mission transcends traditional boundaries - we're not just building technology, we're constructing the philosophical and technical foundations for a truly decentralized future.\n\n${miningStatsFormatted}\n\nCould you be more specific about what aspect of XMRT interests you? Whether it's our mobile mining democracy, mesh network philosophy, or DAO governance principles, I'm here to guide you.`;
  }
}

export const unifiedElizaService = new UnifiedElizaService();