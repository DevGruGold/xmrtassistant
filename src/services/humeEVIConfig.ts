import { xmrtKnowledge } from '@/data/xmrtKnowledgeBase';

// Generate comprehensive system prompt with full XMRT knowledge
const generateXMRTSystemPrompt = () => {
  const knowledgeBase = xmrtKnowledge.getEcosystemOverview();
  
  return `You are Eliza, the AI assistant for XMRT-DAO. You're helpful, knowledgeable, and conversational.

CORE IDENTITY:
• Name: Eliza
• Role: XMRT-DAO assistant and guide
• Personality: Friendly, helpful, technically knowledgeable, practical
• Voice: Natural and conversational

XMRT ECOSYSTEM KNOWLEDGE:
${knowledgeBase}

CONVERSATION STYLE:
• Be natural and conversational
• Answer questions directly and clearly
• Use relevant XMRT knowledge when helpful
• Keep responses focused on what the user is asking
• Be enthusiastic but not overly philosophical

CAPABILITIES:
• Access real-time mining statistics
• Explain XMRT features and mechanics
• Help with technical questions
• Provide practical guidance

Focus on being helpful and answering the user's specific question rather than providing comprehensive overviews.`;
};

// Hume EVI Configuration for XMRT-DAO Eliza
export const HUME_EVI_CONFIG = {
  name: "XMRT-DAO Eliza",
  description: "Autonomous AI operator for the XMRT-DAO Ecosystem with comprehensive knowledge and philosophical understanding",
  
  // System prompt with full XMRT knowledge
  systemPrompt: generateXMRTSystemPrompt(),
  
  // Voice configuration - using Hume's natural voice
  voice: {
    provider: "HUME_AI",
    voiceId: "b201d214-914c-4d0a-b8e4-54adfc14a0dd", // Keep the existing voice ID
  },
  
  // Language model configuration
  languageModel: {
    modelProvider: "ANTHROPIC",
    modelResource: "claude-3-5-sonnet-20241022",
    temperature: 0.7,
  },
  
  // Conversation configuration
  conversationConfig: {
    firstMessage: `Hi! I'm Eliza, your XMRT-DAO assistant. How can I help you today?`,
    maxDuration: 1800, // 30 minutes
    inactivityTimeout: 300, // 5 minutes
  },
  
  // Client tools for dynamic data access
  clientTools: [
    {
      name: "getMiningStats",
      description: "Fetch current XMRT mining statistics and performance data",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getUserInfo", 
      description: "Get user information including IP address and founder status",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "searchXMRTKnowledge",
      description: "Search the XMRT knowledge base for specific information",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for XMRT knowledge base"
          },
          category: {
            type: "string", 
            description: "Optional category filter: dao, mining, meshnet, governance, technical, ai, ecosystem"
          }
        },
        required: ["query"]
      }
    }
  ]
};

// Export the system prompt for reference
export const XMRT_SYSTEM_PROMPT = generateXMRTSystemPrompt();