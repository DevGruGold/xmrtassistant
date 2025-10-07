import { OpenAITTSService, OpenAITTSOptions } from './openAITTSService';

export interface UnifiedTTSOptions {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

/**
 * Unified TTS Service that tries multiple methods in order:
 * 1. OpenAI TTS (via Supabase edge function - works everywhere)
 * 2. Web Speech API (browser native, no API needed)
 * 3. Silent mode (display text only)
 */
export class UnifiedTTSService {
  private openAIService: OpenAITTSService | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onSpeechEnd: (() => void) | null = null;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  constructor() {
    this.openAIService = new OpenAITTSService();
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context for mobile compatibility
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context (required for mobile browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
      console.log('✅ Unified TTS Service initialized');
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
      // Continue anyway - Web Speech API might still work
      this.isInitialized = true;
    }
  }

  /**
   * Speak text using the best available method
   */
  async speakText(options: UnifiedTTSOptions, onSpeechEnd?: () => void): Promise<{ success: boolean; method: string }> {
    this.onSpeechEnd = onSpeechEnd;

    if (!this.isInitialized) {
      await this.initialize();
    }

    // Method 1: Try OpenAI TTS (most reliable, works everywhere)
    try {
      console.log('🎵 Trying OpenAI TTS...');
      await this.openAIService!.speakText({
        text: options.text,
        voice: options.voice || 'alloy',
        speed: options.speed || 1.0
      }, onSpeechEnd);
      
      console.log('✅ OpenAI TTS succeeded');
      return { success: true, method: 'OpenAI TTS' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      if (errorMsg.includes('QUOTA_EXCEEDED')) {
        console.warn('⚠️ OpenAI TTS quota exceeded - using Web Speech API fallback');
      } else {
        console.warn('⚠️ OpenAI TTS failed, falling back to Web Speech API:', error);
      }
    }

    // Method 2: Fallback to Web Speech API (always works in browsers)
    try {
      console.log('🎵 Using Web Speech API fallback...');
      await this.speakWithWebSpeech(options);
      console.log('✅ Web Speech API succeeded');
      return { success: true, method: 'Web Speech API' };
    } catch (error) {
      console.error('❌ Web Speech API failed:', error);
    }

    // Method 3: Silent mode with notification (last resort)
    console.warn('⚠️ All TTS methods failed - running in silent mode (text only)');
    console.log('💡 TIP: Web Speech API should work in most browsers. Check browser permissions.');
    onSpeechEnd?.();
    return { success: false, method: 'Silent Mode' };
  }

  /**
   * Web Speech API implementation with proper voice loading
   */
  private async speakWithWebSpeech(options: UnifiedTTSOptions): Promise<void> {
    if (!('speechSynthesis' in window)) {
      throw new Error('Web Speech API not supported');
    }

    // Wait for voices to load (critical for mobile browsers)
    await this.loadVoices();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(options.text);
      this.currentUtterance = utterance;
      
      // Configure voice settings
      utterance.rate = options.speed || 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Select best voice
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Map OpenAI voice names to Web Speech characteristics
        const voicePreferences = this.getVoicePreferences(options.voice || 'alloy');
        const preferredVoice = voices.find(v => 
          voicePreferences.some(pref => v.name.toLowerCase().includes(pref))
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        
        utterance.voice = preferredVoice;
        console.log('🎤 Using voice:', preferredVoice.name);
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        this.onSpeechEnd?.();
        resolve();
      };
      
      utterance.onerror = (event) => {
        this.currentUtterance = null;
        this.onSpeechEnd?.();
        
        // Don't reject on 'canceled' errors (they happen when we interrupt)
        if (event.error === 'canceled') {
          resolve();
        } else {
          reject(new Error(`Speech synthesis error: ${event.error}`));
        }
      };
      
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Small delay to ensure cancel completes
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);
    });
  }

  /**
   * Load voices (handles browser voice loading quirks)
   */
  private loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        resolve();
        return;
      }

      // Wait for voiceschanged event (needed in some browsers)
      const handleVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve();
      };

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

      // Timeout after 1 second
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve();
      }, 1000);
    });
  }

  /**
   * Map OpenAI voice names to Web Speech voice characteristics
   */
  private getVoicePreferences(voice: string): string[] {
    const mapping: Record<string, string[]> = {
      alloy: ['samantha', 'karen', 'victoria', 'female'],
      echo: ['alex', 'daniel', 'male'],
      fable: ['zira', 'hazel', 'female'],
      onyx: ['george', 'rishi', 'male'],
      nova: ['allison', 'tessa', 'female'],
      shimmer: ['nicky', 'amelie', 'female']
    };
    
    return mapping[voice] || ['female'];
  }

  /**
   * Stop all speech playback
   */
  stopSpeaking(): void {
    // Stop OpenAI TTS
    if (this.openAIService) {
      this.openAIService.stopSpeaking();
    }

    // Stop Web Speech API
    if (this.currentUtterance) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
      this.onSpeechEnd?.();
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    const openAISpeaking = this.openAIService?.isSpeaking() || false;
    const webSpeechSpeaking = this.currentUtterance !== null && window.speechSynthesis.speaking;
    
    return openAISpeaking || webSpeechSpeaking;
  }

  /**
   * Get current TTS capabilities
   */
  getCapabilities(): {
    openAIAvailable: boolean;
    webSpeechAvailable: boolean;
  } {
    return {
      openAIAvailable: true, // Always available via edge function
      webSpeechAvailable: 'speechSynthesis' in window
    };
  }
}

// Export singleton instance
export const unifiedTTSService = new UnifiedTTSService();
