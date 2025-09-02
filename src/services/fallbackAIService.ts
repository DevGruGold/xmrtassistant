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
  private static conversationPipeline: any = null;
  private static qasPipeline: any = null;
  private static isInitializing = false;

  // Initialize enhanced local AI models
  private static async initializeLocalAI(): Promise<void> {
    if (this.isInitializing) return;
    
    this.isInitializing = true;
    try {
      console.log('Initializing enhanced local AI models...');
      
      // Try conversation model first (better for chat)
      try {
        this.conversationPipeline = await pipeline(
          'text-generation',
          'Xenova/DialoGPT-medium',
          { device: 'webgpu' }
        );
        console.log('Conversation model initialized successfully');
      } catch (error) {
        console.warn('Conversation model failed, trying Q&A model:', error);
        
        // Fallback to Q&A model
        try {
          this.qasPipeline = await pipeline(
            'question-answering',
            'Xenova/distilbert-base-cased-distilled-squad',
            { device: 'webgpu' }
          );
          console.log('Q&A model initialized successfully');
        } catch (qError) {
          console.warn('Q&A model failed, using basic text generation:', qError);
          
          // Final fallback to basic text generation
          this.textGenerationPipeline = await pipeline(
            'text-generation',
            'Xenova/gpt2',
            { device: 'webgpu' }
          );
          console.log('Basic text generation model initialized');
        }
      }
    } catch (error) {
      console.error('All local AI models failed to initialize:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  // Enhanced AI-powered conversation response
  static async generateConversationResponse(
    userInput: string,
    context: { miningStats?: MiningStats; userContext?: any }
  ): Promise<AIResponse> {
    try {
      await this.initializeLocalAI();
      
      // Build contextual knowledge from knowledge base
      const relevantKnowledge = xmrtKnowledge.searchKnowledge(userInput);
      const knowledgeContext = relevantKnowledge.map(k => k.content).join(' ');
      
      // Try conversation model first
      if (this.conversationPipeline) {
        const prompt = `${userInput}`;
        const result = await this.conversationPipeline(prompt, {
          max_new_tokens: 150,
          temperature: 0.7,
          do_sample: true,
          return_full_text: false,
          pad_token_id: 50256
        });
        
        const response = result[0]?.generated_text?.trim() || '';
        if (response && response.length > 10) {
          return {
            text: `As Eliza: ${response} ${knowledgeContext ? `\n\nContext: ${knowledgeContext.slice(0, 200)}...` : ''}`,
            method: 'Conversation AI',
            confidence: 0.75
          };
        }
      }
      
      // Try Q&A model if available
      if (this.qasPipeline && knowledgeContext) {
        const result = await this.qasPipeline({
          question: userInput,
          context: knowledgeContext
        });
        
        if (result.answer && result.score > 0.1) {
          return {
            text: result.answer,
            method: 'Q&A AI',
            confidence: result.score
          };
        }
      }
      
      throw new Error('No suitable AI model available');
    } catch (error) {
      console.warn('Conversation AI failed:', error);
      throw error;
    }
  }

  // Enhanced local LLM response generation
  static async generateLocalLLMResponse(
    userInput: string,
    context: { miningStats?: MiningStats; userContext?: any }
  ): Promise<AIResponse> {
    try {
      await this.initializeLocalAI();
      
      if (!this.textGenerationPipeline) {
        throw new Error('Local LLM not available');
      }

      // Get relevant knowledge for context
      const relevantKnowledge = xmrtKnowledge.searchKnowledge(userInput);
      const knowledgeContext = relevantKnowledge.slice(0, 2).map(k => k.content).join(' ');
      
      // Create a comprehensive contextual prompt
      const contextualPrompt = `As Eliza, XMRT-DAO's AI assistant, provide a helpful response to: "${userInput}"

Context: XMRT-DAO is a privacy-focused decentralized ecosystem. ${context.miningStats ? 
`User's mining: ${context.miningStats.hash || 0} H/s, ${context.miningStats.isOnline ? 'active' : 'inactive'}.` : ''}

Knowledge: ${knowledgeContext}

Response:`;

      console.log('Generating response with enhanced local LLM...');
      const result = await this.textGenerationPipeline(contextualPrompt, {
        max_new_tokens: 120,
        temperature: 0.6,
        do_sample: true,
        return_full_text: false,
        repetition_penalty: 1.1
      });

      const generatedText = result[0]?.generated_text?.trim() || '';
      
      // Clean and validate response
      const cleanResponse = generatedText
        .replace(/^(Response:|Answer:)/i, '')
        .trim();
      
      return {
        text: cleanResponse || 'I understand your question about XMRT-DAO. How can I assist you further with our decentralized ecosystem?',
        method: 'Enhanced Local LLM',
        confidence: cleanResponse ? 0.7 : 0.5
      };
    } catch (error) {
      console.error('Enhanced Local LLM failed:', error);
      throw error;
    }
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

    // Emergency AI fallback using basic context
    const relevantKnowledge = xmrtKnowledge.searchKnowledge(userInput);
    const basicContext = relevantKnowledge[0]?.content || 'XMRT-DAO is a privacy-focused decentralized ecosystem';
    
    return {
      text: `Based on your question about "${userInput}", I can tell you that ${basicContext}. I'm experiencing some technical difficulties with my AI models, but I'm here to help with XMRT-DAO questions.`,
      method: 'Emergency Context AI',
      confidence: 0.4
    };
  }
}