import { unifiedTTSService, UnifiedTTSOptions } from './unifiedTTSService';

/**
 * Enhanced TTS Service - Browser-only speech synthesis
 * Uses Web Speech API for 100% reliability across all browsers, online and offline
 */
export class EnhancedTTSService {
  private static instance: EnhancedTTSService;
  private lastMethod = 'Web Speech API';
  private initialized = false;

  private constructor() {}

  static getInstance(): EnhancedTTSService {
    if (!this.instance) {
      this.instance = new EnhancedTTSService();
    }
    return this.instance;
  }

  async speak(text: string, options?: Partial<UnifiedTTSOptions>): Promise<void> {
    const fullOptions: UnifiedTTSOptions = {
      text,
      voice: options?.voice || 'nova',
      speed: options?.speed || 1.0,
      language: options?.language || 'en'
    };

    try {
      const result = await unifiedTTSService.speakText(fullOptions);
      this.lastMethod = result.method;

      if (!result.success) {
        console.warn('⚠️ TTS failed but continuing silently');
      }
    } catch (error) {
      console.error('❌ TTS error:', error);
    }
  }

  stop(): void {
    unifiedTTSService.stopSpeaking();
  }

  isSpeaking(): boolean {
    return unifiedTTSService.isSpeaking();
  }

  getLastMethod(): string {
    return this.lastMethod;
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await unifiedTTSService.initialize();
      this.initialized = true;
      console.log('🎵 Enhanced TTS Service initialized (browser-only)');
    }
  }

  getCapabilities(): {
    openAI: boolean;
    webSpeech: boolean;
    fallback: boolean;
  } {
    const unified = unifiedTTSService.getCapabilities();
    return {
      openAI: false,
      webSpeech: unified.webSpeechAvailable,
      fallback: unified.webSpeechAvailable
    };
  }
}

export const enhancedTTS = EnhancedTTSService.getInstance();
