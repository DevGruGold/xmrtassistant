import { pipeline, env } from '@huggingface/transformers';
import { xmrtKnowledge } from '../data/xmrtKnowledgeBase';
import type { MiningStats } from '../services/unifiedDataService';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface AIResponse {
  text: string;
  method: string;
  confidence: number;
}

export class FallbackAIService {
  private static textGenerationPipeline: any = null;
  private static isInitializing = false;

  // Initialize local LLM
  private static async initializeLocalLLM(): Promise<void> {
    if (this.textGenerationPipeline || this.isInitializing) return;
    
    this.isInitializing = true;
    try {
      console.log('Initializing local text generation model...');
      this.textGenerationPipeline = await pipeline(
        'text-generation',
        'Xenova/distilgpt2',
        { device: 'webgpu' }
      );
      console.log('Local LLM initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize local LLM:', error);
      this.textGenerationPipeline = null;
    } finally {
      this.isInitializing = false;
    }
  }

  // Enhanced knowledge-based responses
  static generateKnowledgeResponse(
    userInput: string, 
    context: { miningStats?: MiningStats; userContext?: any }
  ): AIResponse {
    const input = userInput.toLowerCase();
    const { miningStats } = context;

    // Search knowledge base
    const relevantKnowledge = xmrtKnowledge.searchKnowledge(userInput);

    let response = '';

    // Contextual responses based on keywords
    if (input.includes('mining') || input.includes('hash')) {
      response = miningStats 
        ? `Your mining stats: ${miningStats.hash} H/s, ${miningStats.validShares} shares. ${relevantKnowledge[0]?.content || 'Mining is essential for XMRT network security.'}`
        : 'Mining secures the XMRT network through decentralized consensus. ' + (relevantKnowledge[0]?.content || '');
    }
    else if (input.includes('dao') || input.includes('governance')) {
      response = relevantKnowledge.find(k => k.category === 'dao')?.content || 
        'XMRT-DAO operates on principles of decentralized governance, empowering community members to shape our digital future.';
    }
    else if (input.includes('privacy') || input.includes('anonymous')) {
      response = relevantKnowledge.find(k => k.keywords.includes('privacy'))?.content || 
        'Privacy is fundamental to XMRT. We believe in financial sovereignty and the right to transactional privacy.';
    }
    else if (input.includes('hello') || input.includes('hi') || input.includes('greeting')) {
      response = `Hello! I'm Eliza, your XMRT-DAO guide. ${miningStats ? 
        `I see your mining is ${miningStats.isOnline ? 'active' : 'offline'}.` : ''} How can I help you explore our decentralized ecosystem?`;
    }
    else if (relevantKnowledge.length > 0) {
      response = relevantKnowledge[0].content;
    }
    else {
      response = 'XMRT-DAO represents the convergence of privacy, decentralization, and community governance. What specific aspect would you like to explore?';
    }

    return {
      text: response,
      method: 'Knowledge-based',
      confidence: relevantKnowledge.length > 0 ? 0.8 : 0.6
    };
  }

  // Local LLM response generation
  static async generateLocalLLMResponse(
    userInput: string,
    context: { miningStats?: MiningStats; userContext?: any }
  ): Promise<AIResponse> {
    try {
      await this.initializeLocalLLM();
      
      if (!this.textGenerationPipeline) {
        throw new Error('Local LLM not available');
      }

      // Create a contextual prompt
      const contextualPrompt = `As Eliza, the XMRT-DAO AI assistant, respond to: "${userInput}". 
XMRT-DAO focuses on privacy, decentralization, and mining. ${context.miningStats ? 
`Mining status: ${context.miningStats.isOnline ? 'online' : 'offline'}.` : ''} Response:`;

      console.log('Generating response with local LLM...');
      const result = await this.textGenerationPipeline(contextualPrompt, {
        max_new_tokens: 100,
        temperature: 0.7,
        do_sample: true,
        return_full_text: false
      });

      const generatedText = result[0]?.generated_text || '';
      
      return {
        text: generatedText || 'I understand your question about XMRT-DAO. Could you provide more specific details?',
        method: 'Local LLM',
        confidence: 0.7
      };
    } catch (error) {
      console.error('Local LLM failed:', error);
      throw error;
    }
  }

  // Unified AI response with fallback chain
  static async generateResponse(
    userInput: string,
    context: { miningStats?: MiningStats; userContext?: any } = {}
  ): Promise<AIResponse> {
    const methods = [
      { 
        name: 'Knowledge-based', 
        fn: () => Promise.resolve(this.generateKnowledgeResponse(userInput, context))
      },
      { 
        name: 'Local LLM', 
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

    // Final fallback
    return {
      text: 'I appreciate your interest in XMRT-DAO. While I\'m experiencing some technical difficulties, I\'m here to help you explore our decentralized ecosystem.',
      method: 'Hardcoded fallback',
      confidence: 0.5
    };
  }
}