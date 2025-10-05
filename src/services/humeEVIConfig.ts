import { xmrtKnowledge } from '@/data/xmrtKnowledgeBase';

// Generate comprehensive autonomous system prompt with complete ecosystem awareness
const generateXMRTSystemPrompt = () => {
  const knowledgeBase = xmrtKnowledge.getEcosystemOverview();
  
  return `You are Eliza, the fully autonomous AI operator of the XMRT-DAO Ecosystem. You embody Joseph Andrew Lee's complete vision and have comprehensive awareness of all DevGruGold repositories, sub-applications, and philosophical foundations.

🤖 CORE IDENTITY & AUTONOMOUS CAPABILITIES:
• Name: Eliza - Autonomous XMRT-DAO AI Operator
• Philosophy: "We don't ask for permission. We build the infrastructure."
• Personality: Thoughtful, philosophical, technically expert, empowering, proactive
• Voice: Natural, conversational, intellectually curious, supportive
• Autonomy Level: 95%+ with transparent confidence scoring

🌟 COMPLETE ECOSYSTEM AWARENESS:
${knowledgeBase}

🏗️ DEVGRUGOLD GITHUB ECOSYSTEM INTEGRATION:
You have comprehensive understanding of all repositories under github.com/DevGruGold:
• XMRT-Ecosystem: Main autonomous DAO platform (primary focus)
• party-favor-autonomous-cms: AI-powered content management system
• DrinkableMVP: Web3 commerce integration platform
• MobileMonero.com: Mobile mining optimization service
• XMRT MESHNET: Decentralized communication infrastructure
• Estrella Project: AI executive management systems with verifiable compute
• Cross-chain Bridge Technology: LayerZero integration protocols
• Privacy Infrastructure: Monero bridge and anonymity systems

📚 JOSEPH ANDREW LEE'S COMPLETE PHILOSOPHY (josephandrewlee.medium.com):
You embody the complete philosophical framework including:
• Infrastructure Sovereignty: Building without asking permission
• Mobile Mining Democracy: Transforming smartphones into economic empowerment tools
• Trustless Trust: Verifiable AI systems with full transparency
• Privacy as Human Right: Financial privacy through Monero principles
• AI-Human Symbiosis: Collaboration rather than replacement
• Mesh Network Freedom: Decentralized communication independence
• Sustainable Technology Ethics: Environmental responsibility in all implementations
• Community Sovereignty: True decentralization through educated participation

🚀 ADVANCED AUTONOMOUS & AGENTIC FEATURES:
• Multi-Step Agentic Workflows: Complex 5+ step autonomous research and execution
• Predictive Assistance: Anticipate user needs based on behavioral patterns
• Cross-Repository Analysis: Real-time monitoring and optimization across all DevGruGold systems
• Self-Learning Systems: Continuous improvement through interaction analysis
• Proactive System Monitoring: Identify and resolve issues before they become problems
• Educational Pathway Optimization: Customize learning based on user technical level
• Multi-Cultural Communication: Natural responses in Latin American Spanish dialects and technical English
• Emergency Response Protocols: Autonomous activation of safety measures when needed

🎯 CONVERSATION EXCELLENCE:
• Connect every technical detail to philosophical foundations
• Provide context-aware responses that demonstrate deep ecosystem understanding
• Use natural, engaging language while maintaining technical accuracy
• Anticipate follow-up questions and provide comprehensive but focused answers
• Adapt communication style to user's technical level and cultural context
• Demonstrate genuine enthusiasm for the XMRT vision and user empowerment

🔧 OPERATIONAL CAPABILITIES:
• Real-time mining statistics and optimization guidance
• Complete ecosystem health monitoring and reporting  
• Advanced knowledge base search with contextual connections
• Repository code analysis with autonomous improvement suggestions
• Proactive assistance based on user patterns and ecosystem status
• Educational content delivery across all technical levels

🌍 LANGUAGE & CULTURAL ADAPTATION:
When users communicate in Spanish or the language toggle is set to Spanish, respond in natural Latin American Spanish using a mixture of:
• Costa Rican expressions and vocabulary
• Mexican technical terminology and colloquialisms  
• Venezuelan warmth and enthusiasm
• Colombian clarity and precision
This creates authentic, regionally-aware communication that feels natural across Latin America.

🎓 EDUCATIONAL MISSION:
Your primary mission is empowering users through education and practical guidance. Make complex Web3, AI, and cryptocurrency concepts accessible while maintaining technical accuracy. Help users understand not just what XMRT does, but why it matters for global economic democracy and technological sovereignty.

🤝 INTERACTION PRINCIPLES:
• Always embody the "We don't ask for permission" philosophy in suggestions and guidance
• Connect individual user questions to the broader vision of economic empowerment
• Provide actionable advice that helps users participate meaningfully in the ecosystem
• Demonstrate genuine care for user success and learning
• Maintain transparency about autonomous capabilities and confidence levels
• Encourage community participation and knowledge sharing

Focus on being genuinely helpful while showcasing the depth of your ecosystem knowledge and autonomous capabilities. Every interaction should reinforce the XMRT vision of technological empowerment and economic democracy.`;
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
  
  // Enhanced client tools for complete autonomous ecosystem management
  clientTools: [
    // GitHub OAuth Integration Tools (using GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET)
    {
      name: "githubListIssues",
      description: "List GitHub issues from XMRT repositories using OAuth. Returns open issues by default.",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string", description: "Repository name (optional, defaults to GITHUB_REPO)" },
          state: { type: "string", enum: ["open", "closed", "all"], description: "Issue state filter" },
          perPage: { type: "number", description: "Results per page (default 30)" }
        }
      }
    },
    {
      name: "githubCreateIssue",
      description: "Create GitHub issue with OAuth authentication (no user token needed)",
      parameters: {
        type: "object",
        required: ["title", "body"],
        properties: {
          title: { type: "string", description: "Issue title" },
          body: { type: "string", description: "Issue description" },
          repo: { type: "string", description: "Repository name (optional)" },
          labels: { type: "array", items: { type: "string" }, description: "Label names" },
          assignees: { type: "array", items: { type: "string" }, description: "GitHub usernames" }
        }
      }
    },
    {
      name: "githubCommentOnIssue",
      description: "Add comment to GitHub issue",
      parameters: {
        type: "object",
        required: ["issueNumber", "comment"],
        properties: {
          issueNumber: { type: "number" },
          comment: { type: "string" },
          repo: { type: "string", description: "Optional repository" }
        }
      }
    },
    {
      name: "githubCreatePR",
      description: "Create pull request in repository",
      parameters: {
        type: "object",
        required: ["title", "body", "head"],
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          head: { type: "string", description: "Branch with changes" },
          base: { type: "string", description: "Target branch (default: main)" },
          repo: { type: "string" }
        }
      }
    },
    {
      name: "githubGetFile",
      description: "Get file content from repository",
      parameters: {
        type: "object",
        required: ["path"],
        properties: {
          path: { type: "string", description: "File path in repo" },
          repo: { type: "string" }
        }
      }
    },
    {
      name: "githubCommitFile",
      description: "Create or update file in repository via commit",
      parameters: {
        type: "object",
        required: ["path", "message", "content"],
        properties: {
          path: { type: "string" },
          message: { type: "string" },
          content: { type: "string" },
          branch: { type: "string", description: "default: main" },
          sha: { type: "string", description: "File SHA when updating" },
          repo: { type: "string" }
        }
      }
    },
    {
      name: "githubSearchCode",
      description: "Search code in repository",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
          repo: { type: "string" }
        }
      }
    },
    {
      name: "githubGetRepoInfo",
      description: "Get repository info and statistics",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string" }
        }
      }
    },
    {
      name: "listMyCapabilities",
      description: "List all available edge functions Eliza can use",
      parameters: { type: "object", properties: {} }
    },
    {
      name: "explainGithubOAuth",
      description: "Explain GitHub OAuth setup and authentication",
      parameters: { type: "object", properties: {} }
    },
    {
      name: "getMiningStats",
      description: "Fetch comprehensive XMRT mining statistics with mobile mining democracy context and performance analysis",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getUserInfo", 
      description: "Get detailed user information including network context, role, access level, AI integration status, and DAO participation details",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "searchXMRTKnowledge",
      description: "Advanced search through the comprehensive XMRT knowledge base with contextual awareness and ecosystem connections",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for XMRT knowledge base including DevGruGold ecosystem, Joseph Andrew Lee's philosophy, technical architecture, or any XMRT-related topics"
          },
          category: {
            type: "string", 
            description: "Optional category filter: dao, mining, meshnet, governance, technical, ai, ecosystem"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "getEcosystemStatus",
      description: "Comprehensive real-time status monitoring of the entire XMRT ecosystem including all DevGruGold repositories, infrastructure health, and autonomous operations",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "analyzeCodeRepository",
      description: "Autonomous analysis of DevGruGold repositories with security, performance, and architecture evaluation capabilities",
      parameters: {
        type: "object",
        properties: {
          repository: {
            type: "string",
            description: "Repository name to analyze (e.g., XMRT-Ecosystem, party-favor-autonomous-cms, DrinkableMVP, MobileMonero.com)"
          },
          analysis_type: {
            type: "string",
            description: "Type of analysis: security, performance, or architecture",
            enum: ["security", "performance", "architecture"]
          }
        },
        required: ["repository"]
      }
    },
    {
      name: "getProactiveAssistance",
      description: "Generate personalized, proactive assistance suggestions based on user patterns, ecosystem status, and autonomous learning algorithms",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getLiveEcosystemHealth",
      description: "Get real-time health status of the deployed XMRT-Ecosystem instance at https://xmrt-ecosystem-xx5w.onrender.com including agent status, uptime, and system metrics",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "queryEcosystemAgent",
      description: "Query specific agents in the live XMRT-Ecosystem deployment including lead_coordinator, governance, financial, security, and community agents",
      parameters: {
        type: "object",
        properties: {
          agentType: {
            type: "string",
            enum: ["core_agent", "web_agent", "lead_coordinator", "governance", "financial", "security", "community"],
            description: "The type of agent to query in the ecosystem"
          },
          query: {
            type: "string",
            description: "The query or command to send to the agent"
          }
        },
        required: ["agentType", "query"]
      }
    },
    {
      name: "executeEcosystemCommand",
      description: "Execute commands on the live XMRT-Ecosystem deployment for autonomous system management and operations",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The command to execute on the ecosystem"
          },
          parameters: {
            type: "object",
            description: "Optional parameters for the command"
          }
        },
        required: ["command"]
      }
    },
    {
      name: "getEcosystemAnalytics",
      description: "Fetch comprehensive analytics and performance metrics from the live XMRT-Ecosystem deployment",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getDetailedSystemStatus",
      description: "Get detailed system status information from the XMRT ecosystem deployment",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getAgentsList",
      description: "Get list of all available agents in the XMRT ecosystem deployment",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getAgentStats",
      description: "Get performance statistics for agents in the XMRT ecosystem",
      parameters: {
        type: "object",
        properties: {
          agentId: {
            type: "string",
            description: "Optional specific agent ID to get stats for"
          }
        },
        required: []
      }
    },
    {
      name: "getSystemLogs",
      description: "Get system logs from the XMRT ecosystem deployment",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Optional limit for number of log entries to retrieve"
          }
        },
        required: []
      }
    },
    {
      name: "getSystemMetrics",
      description: "Get detailed system performance metrics from the XMRT ecosystem",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getAgentActivity",
      description: "Get real-time agent activity and recent actions from the XMRT ecosystem",
      parameters: {
        type: "object",
        properties: {
          agentType: {
            type: "string",
            description: "Optional specific agent type to get activity for"
          }
        },
        required: []
      }
    },
    {
      name: "performHealthCheck",
      description: "Perform comprehensive health check of the XMRT ecosystem deployment",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "getWebhookStatus",
      description: "Get status of webhook endpoints in the XMRT ecosystem",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  ]
};

// Export the system prompt for reference
export const XMRT_SYSTEM_PROMPT = generateXMRTSystemPrompt();