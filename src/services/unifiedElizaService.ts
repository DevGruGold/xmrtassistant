import { XMRT_KNOWLEDGE_BASE } from '@/data/xmrtKnowledgeBase';
import { unifiedDataService, type MiningStats, type UserContext } from './unifiedDataService';
import { harpaAIService, HarpaAIService, type HarpaBrowsingContext } from './harpaAIService';
import { renderAPIService } from './renderAPIService';
import { supabase } from '@/integrations/supabase/client';
import { openAIApiKeyManager } from './openAIApiKeyManager';
import { enhancedTTS } from './enhancedTTSService';

// Get session credentials if available (outside React component)
let sessionCredentials: any = null;
try {
  const credentialContext = (window as any).__credentialSessionContext;
  if (credentialContext) {
    sessionCredentials = credentialContext.getAll();
  }
} catch (e) {
  // Context not available, will use null
}

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

  /**
   * Check for new autonomous activity and generate summary for Eliza to mention
   */
  private static async checkAndReportAutonomousActivity(
    lastCheckTimestamp: string = new Date(Date.now() - 3600000).toISOString() // Default: last hour
  ): Promise<string> {
    try {
      const { data: newActivities, error } = await supabase
        .from('eliza_activity_log')
        .select('*')
        .eq('mentioned_to_user', false)
        .gt('created_at', lastCheckTimestamp)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !newActivities || newActivities.length === 0) {
        return '';
      }

      // Mark as mentioned
      const activityIds = newActivities.map((a: any) => a.id);
      await supabase
        .from('eliza_activity_log')
        .update({ mentioned_to_user: true })
        .in('id', activityIds);

      // Generate human-readable summary
      const summaries = newActivities.map((activity: any) => {
        const timeDiff = Math.floor((Date.now() - new Date(activity.created_at).getTime()) / 60000);
        const timeStr = timeDiff < 1 ? 'just now' : timeDiff === 1 ? '1 min ago' : `${timeDiff} min ago`;
        
        return `• ${activity.title} (${timeStr}): ${activity.description}`;
      }).join('\n');

      return `\n\n**🔔 NEW AUTONOMOUS ACTIVITY (not yet mentioned to user):**\n${summaries}\n\n**You should mention these updates in your response if relevant!**`;
    } catch (err) {
      console.error('Error checking autonomous activity:', err);
      return '';
    }
  }

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
      
      // Store the hasToolCalls flag and executive for the frontend to use
      (window as any).__lastElizaHasToolCalls = result.hasToolCalls;
      console.log(`✅ Response generated by: ${this.getExecutiveTitle((window as any).__lastElizaExecutive || 'lovable-chat')}`);
      
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

  /**
   * Intelligently select which AI Executive to call based on task characteristics
   * Returns the edge function name to invoke
   */
  private static selectAIExecutive(userInput: string, context: ElizaContext): string {
    const input = userInput.toLowerCase();
    
    // Chief Technology Officer (DeepSeek R1) - Code & Technical Architecture
    if (
      /code|debug|refactor|syntax|error|bug|technical|architecture|implementation|algorithm|optimize.*code/i.test(userInput) ||
      context.inputMode === 'code_review'
    ) {
      console.log('🎯 Routing to CTO (deepseek-chat): Technical/Code task detected');
      return 'deepseek-chat';
    }
    
    // Chief Information Officer (Gemini Multimodal) - Vision & Media
    if (
      /image|photo|picture|visual|diagram|chart|analyze.*image|what.*see|describe.*image|screenshot/i.test(userInput) ||
      context.inputMode === 'vision' ||
      userInput.includes('🖼️') || userInput.includes('📸')
    ) {
      console.log('🎯 Routing to CIO (gemini-chat): Vision/Multimodal task detected');
      return 'gemini-chat';
    }
    
    // Chief Analytics Officer (GPT-5) - Complex Reasoning & Strategic Planning
    if (
      /analyze.*complex|strategic.*plan|forecast|predict|multi.*step.*reasoning|philosophical|ethical.*dilemma|compare.*analyze|synthesize.*information/i.test(userInput) ||
      this.isComplexAgenticTask(userInput) ||
      context.inputMode === 'strategic_analysis'
    ) {
      console.log('🎯 Routing to CAO (openai-chat): Complex reasoning task detected');
      return 'openai-chat';
    }
    
    // Chief Strategy Officer (Lovable AI / Gemini 2.5 Flash) - DEFAULT
    // General reasoning, user interaction, community relations
    console.log('🎯 Routing to CSO (lovable-chat): General strategy/interaction task');
    return 'lovable-chat';
  }

  /**
   * Get human-readable executive title
   */
  private static getExecutiveTitle(executive: string): string {
    const titles: Record<string, string> = {
      'lovable-chat': 'Chief Strategy Officer (CSO)',
      'deepseek-chat': 'Chief Technology Officer (CTO)',
      'gemini-chat': 'Chief Information Officer (CIO)',
      'openai-chat': 'Chief Analytics Officer (CAO)'
    };
    return titles[executive] || 'Executive';
  }

  // Generate response using AI Executive C-Suite
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

    console.log('🧠 AI Executive C-Suite: Analyzing request...');
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

    // Check for new autonomous activity that Eliza should mention
    const autonomousActivitySummary = await UnifiedElizaService.checkAndReportAutonomousActivity();

    // Get latest session credentials
    try {
      const credContext = (window as any).__credentialSessionContext;
      if (credContext) {
        sessionCredentials = credContext.getAll();
        console.log('🔑 Session credentials available:', Object.keys(sessionCredentials || {}));
      }
    } catch (e) {
      console.log('⚠️ Could not retrieve session credentials');
    }

    // Common request body for all executives
    const requestBody = {
      messages: [{ role: 'user', content: userInput + autonomousActivitySummary }],
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
      } : null,
      session_credentials: sessionCredentials
    };

    // NEW: Select the appropriate AI Executive based on task type
    const primaryExecutive = this.selectAIExecutive(userInput, context);
    console.log(`🏛️ AI Executive C-Suite: Dispatching to ${primaryExecutive}`);
    
    // Define fallback chain based on primary selection
    const executiveChain = [primaryExecutive];
    const allExecutives = ['lovable-chat', 'deepseek-chat', 'gemini-chat', 'openai-chat'];
    const fallbacks = allExecutives.filter(exec => exec !== primaryExecutive);
    executiveChain.push(...fallbacks);
    
    console.log('🔄 Executive fallback chain:', executiveChain);
    
    // Try executives in priority order
    for (const executive of executiveChain) {
      try {
        console.log(`🎯 Calling ${executive} (${this.getExecutiveTitle(executive)})...`);
        
        const { data, error } = await supabase.functions.invoke(executive, {
          body: requestBody
        });

        if (!error && data?.success) {
          console.log(`✅ ${executive} (${this.getExecutiveTitle(executive)}) responded successfully`);
          
          // Store which executive responded for transparency
          (window as any).__lastElizaExecutive = executive;
          console.log(`✅ Response generated by: ${this.getExecutiveTitle(executive)}`);
          
          // Handle tool results vs direct responses
          if (data.toolResult && data.toolName) {
            const formattedResponse = this.formatToolResult(data.toolName, data.toolResult);
            return {
              response: formattedResponse,
              hasToolCalls: true
            };
          } else if (data.response) {
            return {
              response: data.response,
              hasToolCalls: data.hasToolCalls || false
            };
          }
        }
        
        console.warn(`⚠️ ${executive} failed:`, error?.message || data?.error, '- trying next executive');
      } catch (err) {
        console.warn(`⚠️ ${executive} exception:`, err.message, '- trying next executive');
      }
    }
    
    // All cloud executives failed - summon the Office Clerk (local browser AI)
    console.log('🏢 All cloud executives unavailable - summoning Office Clerk (local AI)...');
    
    try {
      const { FallbackAIService } = await import('./fallbackAIService');
      const localResponse = await FallbackAIService.generateResponse(userInput, {
        miningStats: contextData.miningStats,
        userContext: contextData
      });
      
      console.log(`✅ Office Clerk responded: ${localResponse.method}`);
      
      // Store the fallback executive
      (window as any).__lastElizaExecutive = 'office-clerk';
      
      // Prepend a notice to the user
      const clerkResponse = `🏢 **Office Clerk** (Local AI)\n\n${localResponse.text}\n\n` +
        `*Note: All cloud AI executives are currently unavailable. This response was generated locally in your browser using ${localResponse.method}.*`;
      
      return {
        response: clerkResponse,
        hasToolCalls: false
      };
    } catch (clerkError) {
      console.error('❌ Even the Office Clerk failed:', clerkError);
      throw new Error('All AI services (including local fallback) are unavailable. Please check system status.');
    }
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

  // Format tool results naturally in context
  private static formatToolResult(toolName: string, result: any): string {
    // For most tools, just present the data naturally without mentioning the tool
    switch (toolName) {
      case 'listAgents':
        if (!result || (Array.isArray(result) && result.length === 0)) {
          return "No agents are currently deployed.";
        }
        const agents = Array.isArray(result) ? result : [result];
        const agentsList = agents.map((agent: any) => {
          const statusIcon = agent.status === 'IDLE' ? '🟢' : '🔴';
          const skills = Array.isArray(agent.skills) ? agent.skills.join(', ') : 'None';
          return `${statusIcon} **${agent.name}** (${agent.role})\n   Status: ${agent.status}\n   Skills: ${skills}`;
        }).join('\n\n');
        return `Here's the current agent status:\n\n${agentsList}`;

      case 'listTasks':
        if (!result || (Array.isArray(result) && result.length === 0)) {
          return "There are no tasks in the queue.";
        }
        const tasks = Array.isArray(result) ? result : [result];
        const tasksList = tasks.map((task: any) => {
          const statusIcon = task.status === 'COMPLETED' ? '✅' : task.status === 'FAILED' ? '❌' : task.status === 'BLOCKED' ? '🚫' : '🔄';
          return `${statusIcon} **${task.title}**\n   Status: ${task.status} | Priority: ${task.priority}/10\n   Repo: ${task.repo} | Assignee: ${task.assignee_agent_id || 'Unassigned'}`;
        }).join('\n\n');
        return `Current task queue (${tasks.length} tasks):\n\n${tasksList}`;

      case 'getMiningStats':
        if (!result) return "Mining stats are currently unavailable.";
        return `Current hashrate is ${result.hashRate || result.hash_rate || 0} H/s with ${result.validShares || result.valid_shares || 0} valid shares. You've earned ${result.amountDue || result.amount_due || 0} XMR so far.`;

      case 'getSystemStatus':
        if (!result) return "System status is currently unavailable.";
        return `System is ${result.overall_status || result.status || 'operational'}. ${result.details ? JSON.stringify(result.details) : ''}`;

      case 'createGitHubIssue':
        if (!result) return "Issue creation status unknown.";
        return `Created issue: ${result.html_url || result.url || 'Issue created successfully'}`;

      case 'executePython':
      case 'executePythonCode':
        if (!result) return "No output from execution.";
        const output = result.output || result.stdout || result.result || '';
        return output.trim() || "Execution completed with no output.";

      default:
        // For unknown tool types, try to present the data reasonably
        if (typeof result === 'string') return result;
        if (typeof result === 'number') return result.toString();
        if (Array.isArray(result)) return `Found ${result.length} items: ${JSON.stringify(result, null, 2)}`;
        if (typeof result === 'object' && result !== null) {
          // Try to find a meaningful representation
          if (result.message) return result.message;
          if (result.content) return result.content;
          if (result.data) return this.formatToolResult(toolName, result.data);
          return JSON.stringify(result, null, 2);
        }
        return "Operation completed.";
    }
  }

}

export const unifiedElizaService = new UnifiedElizaService();