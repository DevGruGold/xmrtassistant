import { unifiedTTSService, UnifiedTTSOptions } from './unifiedTTSService';
import { FallbackTTSService } from './fallbackTTSService';
import { toast } from 'sonner';

/**
 * Enhanced TTS Service with multiple fallback layers
 * Ensures audio ALWAYS works, even when OpenAI quota is exceeded
 */
export class EnhancedTTSService {
  private static instance: EnhancedTTSService;
  private lastMethod: string = 'Unknown';

  private constructor() {}

  static getInstance(): EnhancedTTSService {
    if (!this.instance) {
      this.instance = new EnhancedTTSService();
    }
    return this.instance;
  }

  /**
   * Speak text with guaranteed fallback
   */
  async speak(text: string, options?: Partial<UnifiedTTSOptions>): Promise<void> {
    const fullOptions: UnifiedTTSOptions = {
      text,
      voice: options?.voice || 'alloy',
      speed: options?.speed || 1.0
    };

    try {
      // Try unified TTS service (OpenAI -> Web Speech)
      const result = await unifiedTTSService.speakText(fullOptions);
      this.lastMethod = result.method;

      if (result.success) {
        console.log(`✅ TTS using: ${result.method}`);
        return;
      }

      // If unified service failed, try additional fallback
      console.warn('⚠️ Unified TTS failed, trying additional fallback...');
      await this.tryAdditionalFallback(fullOptions);

    } catch (error) {
      console.error('❌ Primary TTS failed:', error);
      // Try additional fallback on error
      await this.tryAdditionalFallback(fullOptions);
    }
  }

  /**
   * Additional fallback layer using FallbackTTSService
   */
  private async tryAdditionalFallback(options: UnifiedTTSOptions): Promise<void> {
    try {
      console.log('🔄 Attempting fallback TTS service...');
      
      const result = await FallbackTTSService.speak({
        text: options.text,
        rate: options.speed,
        pitch: 1.0,
        volume: 1.0
      });

      this.lastMethod = result.method;
      console.log(`✅ Fallback TTS succeeded with: ${result.method}`);
      
    } catch (error) {
      console.error('❌ All TTS methods failed:', error);
      this.lastMethod = 'None (Silent)';
      
      // Show user-friendly toast
      toast.info('Audio unavailable - text displayed instead', {
        description: 'Check browser audio permissions'
      });
    }
  }

  /**
   * Stop all audio playback
   */
  stop(): void {
    unifiedTTSService.stopSpeaking();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return unifiedTTSService.isSpeaking() || 
           ('speechSynthesis' in window && window.speechSynthesis.speaking);
  }

  /**
   * Get last successful TTS method
   */
  getLastMethod(): string {
    return this.lastMethod;
  }

  /**
   * Initialize audio context (call after user interaction)
   */
  async initialize(): Promise<void> {
    await unifiedTTSService.initialize();
    console.log('🎵 Enhanced TTS Service initialized with multiple fallbacks');
  }

  /**
   * Get TTS capabilities
   */
  getCapabilities(): {
    openAI: boolean;
    webSpeech: boolean;
    fallback: boolean;
  } {
    const unified = unifiedTTSService.getCapabilities();
    return {
      openAI: unified.openAIAvailable,
      webSpeech: unified.webSpeechAvailable,
      fallback: true // Always have fallback
    };
  }
}

// Export singleton instance
export const enhancedTTS = EnhancedTTSService.getInstance();
