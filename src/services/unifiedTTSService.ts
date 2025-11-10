export interface UnifiedTTSOptions {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
  language?: 'en' | 'es';
}

/**
 * Browser-Only TTS Service
 * 
 * Uses Web Speech API exclusively - works in all modern browsers, online and offline.
 * No external dependencies, no API calls, no costs, 100% reliable.
 */
export class UnifiedTTSService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onSpeechEnd: (() => void) | null = null;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private voicesLoaded = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context for mobile compatibility
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context (required for mobile browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Load voices immediately
      await this.loadVoices();
      
      this.isInitialized = true;
      console.log('✅ Browser TTS initialized with', window.speechSynthesis.getVoices().length, 'voices');
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
      this.isInitialized = true;
    }
  }

  async speakText(options: UnifiedTTSOptions, onSpeechEnd?: () => void): Promise<{ success: boolean; method: string }> {
    this.onSpeechEnd = onSpeechEnd;

    if (!this.isInitialized) {
      await this.initialize();
    }

    // Ensure audio context is resumed
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      await this.speakWithWebSpeech(options);
      return { success: true, method: 'Web Speech API' };
    } catch (error) {
      console.error('❌ Web Speech API failed:', error);
      onSpeechEnd?.();
      return { success: false, method: 'Failed' };
    }
  }

  private async speakWithWebSpeech(options: UnifiedTTSOptions): Promise<void> {
    if (!('speechSynthesis' in window)) {
      throw new Error('Web Speech API not supported in this browser');
    }

    // Ensure voices are loaded
    if (!this.voicesLoaded) {
      await this.loadVoices();
    }

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(options.text);
        this.currentUtterance = utterance;
        
        // Configure voice settings
        utterance.rate = options.speed || 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Select best voice
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const lang = options.language || 'en';
          const langPrefix = lang === 'es' ? 'es' : 'en';
          
          const voicePreferences = this.getVoicePreferences(options.voice || 'nova', lang);
          
          // Find best matching voice
          let preferredVoice = voices.find(v => 
            v.lang.startsWith(langPrefix) && 
            voicePreferences.some(pref => v.name.toLowerCase().includes(pref))
          );
          
          if (!preferredVoice) {
            preferredVoice = voices.find(v => v.lang.startsWith(langPrefix));
          }
          
          if (!preferredVoice) {
            preferredVoice = voices[0];
          }
          
          utterance.voice = preferredVoice;
          utterance.lang = preferredVoice.lang;
          console.log(`🎤 Speaking with voice: ${preferredVoice.name} (${preferredVoice.lang})`);
        } else {
          // No voices available - use default
          utterance.lang = options.language === 'es' ? 'es-ES' : 'en-US';
          console.log(`🎤 Speaking with default voice`);
        }

        utterance.onend = () => {
          this.currentUtterance = null;
          this.onSpeechEnd?.();
          resolve();
        };
        
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event.error);
          this.currentUtterance = null;
          this.onSpeechEnd?.();
          
          if (event.error === 'canceled' || event.error === 'interrupted') {
            resolve(); // Not a real error
          } else {
            reject(new Error(`Speech synthesis error: ${event.error}`));
          }
        };
        
        // Cancel any ongoing speech first
        window.speechSynthesis.cancel();
        
        // Small delay for reliability across browsers
        setTimeout(() => {
          try {
            window.speechSynthesis.speak(utterance);
          } catch (speakError) {
            console.error('Error calling speak():', speakError);
            reject(speakError);
          }
        }, 100);
        
      } catch (error) {
        console.error('Error in speakWithWebSpeech:', error);
        reject(error);
      }
    });
  }

  private loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      if (this.voicesLoaded) {
        resolve();
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        this.voicesLoaded = true;
        console.log(`✅ Loaded ${voices.length} voices`);
        resolve();
        return;
      }

      // Wait for voiceschanged event
      const handleVoicesChanged = () => {
        const newVoices = window.speechSynthesis.getVoices();
        if (newVoices.length > 0) {
          this.voicesLoaded = true;
          console.log(`✅ Loaded ${newVoices.length} voices via event`);
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve();
        }
      };

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

      // Timeout after 2 seconds
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        this.voicesLoaded = true;
        console.log('⏱️ Voice loading timeout - proceeding with default');
        resolve();
      }, 2000);
    });
  }

  /**
   * Map OpenAI voice names to Web Speech voice characteristics
   * Now with Spanish voice preferences
   */
  private getVoicePreferences(voice: string, language: 'en' | 'es' = 'en'): string[] {
    if (language === 'es') {
      // Spanish female voice preferences
      const spanishMapping: Record<string, string[]> = {
        alloy: ['monica', 'paulina', 'luciana', 'female'],
        echo: ['jorge', 'diego', 'male'],
        fable: ['monica', 'esperanza', 'female'],
        onyx: ['jorge', 'male'],
        nova: ['monica', 'paulina', 'female'],
        shimmer: ['luciana', 'penelope', 'female']
      };
      return spanishMapping[voice] || ['female', 'monica', 'paulina'];
    }
    
    // English female voice preferences (default)
    const englishMapping: Record<string, string[]> = {
      alloy: ['samantha', 'karen', 'victoria', 'female'],
      echo: ['alex', 'daniel', 'male'],
      fable: ['zira', 'hazel', 'female'],
      onyx: ['george', 'rishi', 'male'],
      nova: ['allison', 'tessa', 'female'],
      shimmer: ['nicky', 'amelie', 'female']
    };
    
    return englishMapping[voice] || ['female'];
  }

  stopSpeaking(): void {
    if (this.currentUtterance || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
      this.onSpeechEnd?.();
    }
  }

  isSpeaking(): boolean {
    return this.currentUtterance !== null || window.speechSynthesis.speaking;
  }

  getCapabilities(): {
    openAIAvailable: boolean;
    webSpeechAvailable: boolean;
  } {
    return {
      openAIAvailable: false, // No longer using OpenAI TTS
      webSpeechAvailable: 'speechSynthesis' in window
    };
  }
}

// Export singleton instance
export const unifiedTTSService = new UnifiedTTSService();
