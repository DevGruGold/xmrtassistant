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

  // Initialize SmolLM2-360M Office Clerk model
  private static async initializeLocalAI(): Promise<void> {
    if (this.isInitializing) return;
    
    this.isInitializing = true;
    try {
      console.log('🏢 Initializing Office Clerk (SmolLM2-360M)...');
      
      // Try SmolLM2-360M on WebGPU (best balance of speed/quality)
      try {
        this.textGenerationPipeline = await pipeline(
          'text-generation',
          'onnx-community/SmolLM2-360M-Instruct',
          { 
            dtype: 'q4',        // 4-bit quantization for speed
            device: 'webgpu'    // Try WebGPU first
          }
        );
        console.log('✅ Office Clerk ready (SmolLM2-360M on WebGPU)');
      } catch (error) {
        console.warn('⚠️ WebGPU failed, trying lighter model:', error);
        
        // Fallback to SmolLM2-135M on WebGPU (lighter)
        try {
          this.textGenerationPipeline = await pipeline(
            'text-generation',
            'HuggingFaceTB/SmolLM2-135M-Instruct',
            { device: 'webgpu' }
          );
          console.log('✅ Office Clerk ready (SmolLM2-135M on WebGPU)');
        } catch (tError) {
          console.warn('⚠️ Lighter model failed, trying CPU fallback:', tError);
          
          // Final fallback to CPU-based SmolLM2-360M
          try {
            this.textGenerationPipeline = await pipeline(
              'text-generation',
              'onnx-community/SmolLM2-360M-Instruct',
              { 
                dtype: 'q4',
                device: 'cpu' 
              }
            );
            console.log('✅ Office Clerk ready (SmolLM2-360M on CPU)');
          } catch (cpuError) {
            console.error('❌ All Office Clerk models failed:', cpuError);
          }
        }
      }
    } catch (error) {
      console.error('❌ Office Clerk initialization failed:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  // SmolLM2-powered Office Clerk response
  static async generateConversationResponse(
    userInput: string,
    context: { miningStats?: MiningStats; userContext?: any }
  ): Promise<AIResponse> {
    try {
      await this.initializeLocalAI();
      
      if (!this.textGenerationPipeline) {
        throw new Error('Office Clerk model not initialized');
      }

      // Build contextual knowledge from knowledge base
      const relevantKnowledge = xmrtKnowledge.searchKnowledge(userInput);
      const knowledgeContext = relevantKnowledge.slice(0, 2).map(k => k.content).join('\n');
      
      // Create a chat-formatted prompt for SmolLM2
      const systemPrompt = `You are the Office Clerk for XMRT-DAO, a helpful AI assistant. You answer questions concisely and accurately based on the provided knowledge.`;
      
      const contextInfo = context.miningStats ? 
        `\nUser's mining status: ${context.miningStats.isOnline ? 'active' : 'inactive'}, hashrate: ${context.miningStats.hashRate || 0} H/s` : '';
      
      const prompt = `${systemPrompt}\n\nKnowledge Base:\n${knowledgeContext}${contextInfo}\n\nUser: ${userInput}\nOffice Clerk:`;

      console.log('🏢 Office Clerk processing request...');
      const result = await this.textGenerationPipeline(prompt, {
        max_new_tokens: 150,
        temperature: 0.7,
        do_sample: true,
        return_full_text: false,
        repetition_penalty: 1.2,
        top_p: 0.9
      });

      const generatedText = result[0]?.generated_text?.trim() || '';
      
      // Clean and validate response
      const cleanResponse = generatedText
        .replace(/^(Response:|Answer:|Office Clerk:)/i, '')
        .trim();
      
      if (cleanResponse && cleanResponse.length > 10) {
        return {
          text: cleanResponse,
          method: 'Office Clerk (SmolLM2-360M)',
          confidence: 0.75
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