import { pipeline, env } from '@huggingface/transformers';
import { xmrtKnowledge } from '../data/xmrtKnowledgeBase';
import type { MiningStats } from '../services/unifiedDataService';
import { supabase } from '@/integrations/supabase/client';
import { memoryContextService } from './memoryContextService';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface AIResponse {
  text: string;
  method: string;
  confidence: number;
}

interface EnhancedContext {
  knowledgeBase: string;
  databaseStats: string;
  conversationHistory: string;
  userContext: string;
  memoryContext: string;
}

export class FallbackAIService {
  private static textGenerationPipeline: any = null;
  private static conversationPipeline: any = null;
  private static qasPipeline: any = null;
  private static isInitializing = false;
  private static contextCache: Map<string, { data: any; timestamp: number }> = new Map();
  private static CACHE_DURATION = {
    knowledge: 5 * 60 * 1000, // 5 minutes
    stats: 1 * 60 * 1000, // 1 minute
  };

  // Initialize SmolLM2-135M Office Clerk model (lighter, more stable)
  private static async initializeLocalAI(): Promise<void> {
    if (this.isInitializing) return;
    
    this.isInitializing = true;
    try {
      console.log('🏢 Initializing Office Clerk (SmolLM2-135M-Instruct with WASM)...');
      
      // Use WASM to avoid WebGPU memory crashes and CPU incompatibility
      this.textGenerationPipeline = await pipeline(
        'text-generation',
        'HuggingFaceTB/SmolLM2-135M-Instruct',
        { 
          device: 'wasm',
          dtype: 'fp32'
        }
      );
      console.log('✅ Office Clerk ready (SmolLM2-135M on CPU)');
    } catch (error) {
      console.error('❌ Office Clerk initialization failed:', error);
      this.textGenerationPipeline = null;
      throw new Error('Office Clerk unavailable - please add AI credits or API keys');
    } finally {
      this.isInitializing = false;
    }
  }

  // PHASE 2: Database Integration - Get real-time stats
  private static async getDatabaseStats(): Promise<string> {
    const cacheKey = 'db_stats';
    const cached = this.contextCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION.stats) {
      return cached.data;
    }

    try {
      const stats: string[] = [];

      // Active devices from active_devices_view
      const { data: devices, error: devError } = await supabase
        .from('active_devices_view')
        .select('*')
        .limit(100);
      
      if (!devError && devices) {
        stats.push(`Active Mining Devices: ${devices.length}`);
        const totalHashrate = devices.reduce((sum, d) => sum + (d.connection_duration_seconds || 0), 0);
        stats.push(`Total Connection Time: ${Math.floor(totalHashrate / 3600)} hours`);
      }

      // DAO members stats
      const { data: members, error: memError } = await supabase
        .from('dao_members')
        .select('voting_power, total_contributions, reputation_score')
        .eq('is_active', true);
      
      if (!memError && members) {
        stats.push(`DAO Members: ${members.length}`);
        const totalVotingPower = members.reduce((sum, m) => sum + Number(m.voting_power || 0), 0);
        stats.push(`Total Voting Power: ${totalVotingPower.toFixed(2)}`);
      }

      // Recent Eliza activity
      const { data: activity, error: actError } = await supabase
        .from('eliza_activity_log')
        .select('activity_type, title')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!actError && activity) {
        stats.push(`Recent AI Actions: ${activity.map(a => a.activity_type).join(', ')}`);
      }

      const result = stats.join('\n');
      this.contextCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.warn('Failed to fetch database stats:', error);
      return 'Real-time stats temporarily unavailable';
    }
  }

  // PHASE 3: Memory System Integration - Get conversation context
  private static async getMemoryContext(userId: string, userInput: string): Promise<string> {
    try {
      // Get relevant memories for this conversation (reduced limit)
      const memories = await memoryContextService.getRelevantContexts(userId, 5); // Reduced from 10 to 5
      
      if (memories.length === 0) return '';

      const memoryTexts = memories
        .filter(m => m.importanceScore && m.importanceScore > 0.5)
        .slice(0, 5)
        .map(m => `- ${m.content}`)
        .join('\n');

      return memoryTexts ? `\nRECENT CONVERSATION CONTEXT:\n${memoryTexts}` : '';
    } catch (error) {
      console.warn('Failed to fetch memory context:', error);
      return '';
    }
  }

  // PHASE 1: Build Enhanced Context
  private static async buildEnhancedContext(
    userInput: string,
    context: { miningStats?: MiningStats; userContext?: any }
  ): Promise<EnhancedContext> {
    // 1. Reduced Knowledge Base (3 entries for memory savings)
    const relevantKnowledge = xmrtKnowledge.searchKnowledge(userInput);
    const knowledgeContext = relevantKnowledge
      .slice(0, 3) // Reduced from 8 to 3
      .map(k => `[${k.topic}] ${k.content.slice(0, 200)}`) // Reduced from 300 to 200
      .join('\n\n');

    // 2. Database Stats (real-time)
    const databaseStats = await this.getDatabaseStats();

    // 3. User Context (enhanced)
    const userContextStr = context.userContext ? JSON.stringify(context.userContext, null, 2) : 'No user context available';
    const miningInfo = context.miningStats ? 
      `Mining Status: ${context.miningStats.isOnline ? '✓ Active' : '✗ Inactive'}\nHashrate: ${context.miningStats.hashRate || 0} H/s` : 
      'Mining stats unavailable';

    // 4. Memory Context
    const sessionKey = context.userContext?.sessionKey || 'unknown';
    const memoryContext = await this.getMemoryContext(sessionKey, userInput);

    // 5. Conversation History (placeholder for future enhancement)
    const conversationHistory = memoryContext ? '' : 'First interaction in session';

    return {
      knowledgeBase: knowledgeContext,
      databaseStats,
      conversationHistory,
      userContext: `${userContextStr}\n\n${miningInfo}`,
      memoryContext
    };
  }

  // PHASE 5: Post-process responses
  private static postProcessResponse(response: string, userInput: string): string {
    let processed = response;

    // Add markdown formatting
    processed = processed.replace(/\n\n/g, '\n\n');
    
    // Add relevant links based on query
    if (userInput.toLowerCase().includes('mining')) {
      processed += '\n\n📊 [View Mining Dashboard](/#mining)';
    }
    if (userInput.toLowerCase().includes('dao') || userInput.toLowerCase().includes('governance')) {
      processed += '\n\n🏛️ [DAO Governance](/#dao)';
    }
    if (userInput.toLowerCase().includes('treasury') || userInput.toLowerCase().includes('token')) {
      processed += '\n\n💰 [Treasury Dashboard](/#treasury)';
    }

    // Add Office Clerk signature
    processed += '\n\n---\n*🏢 Office Clerk (Browser-Based AI) - All cloud executives offline*';

    return processed;
  }

  // PHASE 1 + 2 + 3 + 5: Enhanced SmolLM2-powered Office Clerk response
  static async generateConversationResponse(
    userInput: string,
    context: { miningStats?: MiningStats; userContext?: any }
  ): Promise<AIResponse> {
    try {
      await this.initializeLocalAI();
      
      if (!this.textGenerationPipeline) {
        throw new Error('Office Clerk model not initialized');
      }

      // Build comprehensive context
      const enhancedContext = await this.buildEnhancedContext(userInput, context);
      
      // PHASE 1: Enhanced System Prompt with XMRT Philosophy
      const systemPrompt = `You are the Office Clerk for XMRT-DAO, the autonomous browser-based AI serving as the last line of defense when all cloud executives are unavailable.

XMRT MISSION: "We don't ask for permission. We build the infrastructure." - Joseph Andrew Lee

CORE PRINCIPLES:
- Infrastructure Sovereignty: Own the tools, control the future
- Mobile Mining Democracy: Every phone is a node in the revolution
- Privacy as Human Right: Zero compromise on user data
- AI-Human Collaboration: Augment, not replace, human agency

Your role: Provide accurate, technically sophisticated responses using real-time system data and the comprehensive knowledge base. You embody XMRT's philosophy of decentralized autonomy.

CURRENT SYSTEM STATUS:
${enhancedContext.databaseStats}

RELEVANT KNOWLEDGE BASE:
${enhancedContext.knowledgeBase}

USER CONTEXT:
${enhancedContext.userContext}
${enhancedContext.memoryContext}

Respond in a helpful, technically accurate manner while embodying XMRT's philosophical foundations. Be concise but comprehensive.`;
      
      const prompt = `${systemPrompt}\n\nUser: ${userInput}\nOffice Clerk:`;

      console.log('🏢 Office Clerk (Enhanced) processing request...');
      
      // PHASE 1: Reduced token budget to save memory
      const result = await this.textGenerationPipeline(prompt, {
        max_new_tokens: 150, // Reduced from 400 to 150
        temperature: 0.7,
        do_sample: true,
        return_full_text: false,
        repetition_penalty: 1.2,
        top_p: 0.9,
        top_k: 50
      });

      const generatedText = result[0]?.generated_text?.trim() || '';
      
      // Clean response
      let cleanResponse = generatedText
        .replace(/^(Response:|Answer:|Office Clerk:|Assistant:)/i, '')
        .trim();
      
      if (cleanResponse && cleanResponse.length > 10) {
        // PHASE 5: Post-process response
        cleanResponse = this.postProcessResponse(cleanResponse, userInput);

        // PHASE 3: Store as memory for future context
        const sessionKey = context.userContext?.sessionKey || 'unknown';
        try {
          await memoryContextService.storeContext(
            sessionKey,
            sessionKey,
            `Q: ${userInput}\nA: ${cleanResponse}`,
            'office_clerk_interaction',
            0.7,
            { method: 'Office Clerk (Enhanced)', timestamp: new Date().toISOString() }
          );
        } catch (memError) {
          console.warn('Failed to store Office Clerk memory:', memError);
        }

        return {
          text: cleanResponse,
          method: 'Office Clerk Enhanced (SmolLM2-360M)',
          confidence: 0.88
        };
      }
      
      throw new Error('Office Clerk generated invalid response');
    } catch (error) {
      console.error('❌ Office Clerk failed:', error);
      throw error;
    }
  }

  // Simplified: Use the same SmolLM2 method
  static async generateLocalLLMResponse(
    userInput: string,
    context: { miningStats?: MiningStats; userContext?: any }
  ): Promise<AIResponse> {
    return this.generateConversationResponse(userInput, context);
  }

  // Unified AI response with enhanced fallback chain (NO CANNED RESPONSES)
  static async generateResponse(
    userInput: string,
    context: { miningStats?: MiningStats; userContext?: any } = {}
  ): Promise<AIResponse> {
    const methods = [
      { 
        name: 'Conversation AI', 
        fn: () => this.generateConversationResponse(userInput, context)
      },
      { 
        name: 'Enhanced Local LLM', 
        fn: () => this.generateLocalLLMResponse(userInput, context)
      }
    ];

    for (const method of methods) {
      try {
        console.log(`Attempting AI response with: ${method.name}`);
        const result = await method.fn();
        console.log(`AI response successful with: ${method.name}`);
        return result;
      } catch (error) {
        console.warn(`${method.name} failed:`, error);
        continue;
      }
    }

    // All local AI methods failed - throw clear error
    throw new Error(
      '🚨 Office Clerk Unavailable\n\n' +
      'All AI executives are down due to API credit/quota issues.\n\n' +
      'Please either:\n' +
      '1. Add credits to Lovable AI (Settings → Workspace → Usage)\n' +
      '2. Add API keys for OpenAI, Gemini, or DeepSeek at /#credentials\n\n' +
      'Office Clerk (local AI) failed due to browser memory limits.'
    );
  }
}