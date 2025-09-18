import { ElevenLabsService } from './elevenlabsService';
import { HumeEVIService, createHumeEVIService } from './humeEVIService';
import { UnifiedElizaService } from './unifiedElizaService';
import { apiKeyManager } from './apiKeyManager';
import { FallbackTTSService } from './fallbackTTSService';
import { FallbackAIService } from './fallbackAIService';
import { FallbackSpeechService } from './fallbackSpeechService';
import { GeminiTTSService } from './geminiTTSService';
import type { MiningStats } from './unifiedDataService';

export interface UnifiedServiceOptions {
  elevenLabsApiKey?: string;
  geminiApiKey?: string;
  humeApiKey?: string;
  enableLocalFallbacks?: boolean;
}

export interface ServiceStatus {
  hume: 'available' | 'unavailable' | 'loading';
  elevenlabs: 'available' | 'unavailable' | 'loading';
  gemini: 'available' | 'unavailable' | 'loading';
  webSpeech: 'available' | 'unavailable' | 'loading';
  localModels: 'available' | 'unavailable' | 'loading';
}

export class UnifiedFallbackService {
  private humeEVIService: HumeEVIService | null = null;
  private elevenLabsService: ElevenLabsService | null = null;
  private geminiTTSService: GeminiTTSService | null = null;
  private options: UnifiedServiceOptions;
  private serviceStatus: ServiceStatus = {
    hume: 'loading',
    elevenlabs: 'loading',
    gemini: 'loading',
    webSpeech: 'loading',
    localModels: 'loading'
  };

  constructor(options: UnifiedServiceOptions = {}) {
    this.options = options;
    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    // Initialize Hume EVI if API key provided
    if (this.options.humeApiKey) {
      try {
        this.humeEVIService = createHumeEVIService(this.options.humeApiKey);
        const isConnected = await this.humeEVIService.initializeConversation();
        this.serviceStatus.hume = isConnected ? 'available' : 'unavailable';
        console.log('Hume EVI service initialized:', isConnected);
      } catch (error) {
        console.error('Hume EVI initialization failed:', error);
        this.serviceStatus.hume = 'unavailable';
      }
    } else {
      this.serviceStatus.hume = 'unavailable';
    }

    // Initialize ElevenLabs if API key provided
    if (this.options.elevenLabsApiKey) {
      try {
        this.elevenLabsService = new ElevenLabsService(this.options.elevenLabsApiKey);
        this.serviceStatus.elevenlabs = 'available';
        console.log('ElevenLabs service initialized');
      } catch (error) {
        console.error('ElevenLabs initialization failed:', error);
        this.serviceStatus.elevenlabs = 'unavailable';
      }
    } else {
      this.serviceStatus.elevenlabs = 'unavailable';
    }

    // Initialize Gemini TTS if API key provided
    if (this.options.geminiApiKey) {
      try {
        this.geminiTTSService = await GeminiTTSService.create();
        console.log('Gemini TTS service initialized');
      } catch (error) {
        console.error('Gemini TTS initialization failed:', error);
      }
    }

    // Test Web Speech API availability
    this.serviceStatus.webSpeech = ('speechSynthesis' in window && 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window) 
      ? 'available' : 'unavailable';

    // Test Gemini availability through API key manager
    try {
      const geminiInstance = await apiKeyManager.createGeminiInstance();
      this.serviceStatus.gemini = geminiInstance ? 'available' : 'unavailable';
    } catch (error) {
      this.serviceStatus.gemini = 'unavailable';
    }

    console.log('Service status:', this.serviceStatus);
  }

  // Text-to-Speech with fallback chain
  async speakText(text: string, voiceId?: string): Promise<{ success: boolean; method: string }> {
    const methods = [];

    // Primary: Hume EVI (most advanced with emotional context)
    if (this.humeEVIService && this.serviceStatus.hume === 'available') {
      methods.push({
        name: 'Hume EVI',
        fn: () => this.humeEVIService!.speakText(text, voiceId)
      });
    }

    // Secondary: ElevenLabs (high quality)
    if (this.elevenLabsService && this.serviceStatus.elevenlabs === 'available') {
      methods.push({
        name: 'ElevenLabs',
        fn: () => this.elevenLabsService!.speakText(text, voiceId)
      });
    }

    // Fallback 1: Gemini TTS (enhanced Web Speech)
    if (this.geminiTTSService && this.serviceStatus.gemini === 'available') {
      methods.push({
        name: 'Gemini TTS',
        fn: () => this.geminiTTSService!.speakText({ text, voiceId })
      });
    }

    // Fallback 2: Local TTS (Web Speech + Local models)
    methods.push({
      name: 'Fallback TTS',
      fn: async () => {
        const result = await FallbackTTSService.speak({ text, voiceId });
        return result;
      }
    });

    for (const method of methods) {
      try {
        console.log(`Attempting TTS with: ${method.name}`);
        await method.fn();
        console.log(`TTS successful with: ${method.name}`);
        return { success: true, method: method.name };
      } catch (error) {
        console.warn(`${method.name} TTS failed:`, error);
        continue;
      }
    }

    return { success: false, method: 'none' };
  }

  // AI Response Generation with fallback chain
  async generateResponse(
    userInput: string, 
    context: { miningStats?: MiningStats; userContext?: any } = {}
  ): Promise<{ text: string; method: string; confidence: number }> {
    const methods = [];

    // Use Gemini AI as primary response generator (through UnifiedElizaService)
    if (this.serviceStatus.gemini === 'available') {
      methods.push({
        name: 'Gemini AI (Unified)',
        fn: async () => {
          const response = await UnifiedElizaService.generateResponse(userInput, context);
          return { text: response, method: 'Gemini AI (Unified)', confidence: 0.95 };
        }
      });
    }

    // Final Fallback: Enhanced Local AI
    methods.push({
      name: 'Enhanced Local AI',
      fn: () => FallbackAIService.generateResponse(userInput, context)
    });

    for (const method of methods) {
      try {
        console.log(`Attempting AI response with: ${method.name}`);
        const result = await method.fn();
        console.log(`AI response successful with: ${method.name}`);
        return result;
      } catch (error) {
        console.warn(`${method.name} AI failed:`, error);
        continue;
      }
    }

    return {
      text: 'I apologize, but I\'m experiencing technical difficulties. Please try again later.',
      method: 'error fallback',
      confidence: 0.1
    };
  }

  // Speech Recognition with fallback chain
  async recognizeSpeech(audioBlob?: Blob): Promise<{ text: string; confidence: number; method: string }> {
    try {
      const result = await FallbackSpeechService.recognize(audioBlob);
      return result;
    } catch (error) {
      console.error('All speech recognition methods failed:', error);
      return {
        text: '',
        confidence: 0,
        method: 'failed'
      };
    }
  }

  // Get current service status
  getServiceStatus(): ServiceStatus {
    return { ...this.serviceStatus };
  }

  // Update service options
  updateOptions(newOptions: Partial<UnifiedServiceOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.initializeServices();
  }

  // Test all services
  async testAllServices(): Promise<ServiceStatus> {
    // Test ElevenLabs
    if (this.elevenLabsService) {
      try {
        await this.elevenLabsService.textToSpeech('test', undefined, 'eleven_turbo_v2');
        this.serviceStatus.elevenlabs = 'available';
      } catch (error) {
        this.serviceStatus.elevenlabs = 'unavailable';
      }
    }

    // Test local models (lightweight test)
    try {
      this.serviceStatus.localModels = 'loading';
      await FallbackTTSService.speak({ text: 'test' });
      this.serviceStatus.localModels = 'available';
    } catch (error) {
      this.serviceStatus.localModels = 'unavailable';
    }

    return this.serviceStatus;
  }
}

// Export singleton instance
export const unifiedFallbackService = new UnifiedFallbackService({
  humeApiKey: import.meta.env.VITE_HUME_API_KEY,
  elevenLabsApiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
  enableLocalFallbacks: true
});