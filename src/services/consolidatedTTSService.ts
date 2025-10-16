/**
 * Consolidated TTS Service
 * Merges functionality from: elevenlabsService, geminiTTSService, openAITTSService,
 * fallbackTTSService, simplifiedVoiceService, fallbackSpeechService
 * 
 * Provides unified text-to-speech with automatic fallback chain
 */

interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  speed?: number;
  pitch?: number;
}

interface TTSProvider {
  name: string;
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  isAvailable: () => boolean;
}

class ConsolidatedTTSService {
  private providers: TTSProvider[] = [];
  private currentProvider: TTSProvider | null = null;
  private initialized = false;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.setupProviders();
  }

  private setupProviders() {
    // Provider 1: ElevenLabs (highest quality)
    this.providers.push({
      name: 'ElevenLabs',
      isAvailable: () => !!import.meta.env.VITE_ELEVENLABS_API_KEY,
      speak: async (text: string, options?: TTSOptions) => {
        const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        const voiceId = options?.voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Default voice
        
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': apiKey
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: options?.stability || 0.5,
                similarity_boost: options?.similarityBoost || 0.75
              }
            })
          }
        );

        if (!response.ok) throw new Error('ElevenLabs API failed');

        const audioBlob = await response.blob();
        await this.playAudioBlob(audioBlob);
      }
    });

    // Provider 2: OpenAI TTS
    this.providers.push({
      name: 'OpenAI',
      isAvailable: () => !!import.meta.env.VITE_OPENAI_API_KEY,
      speak: async (text: string, options?: TTSOptions) => {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'tts-1',
            voice: 'alloy',
            input: text,
            speed: options?.speed || 1.0
          })
        });

        if (!response.ok) throw new Error('OpenAI TTS failed');

        const audioBlob = await response.blob();
        await this.playAudioBlob(audioBlob);
      }
    });

    // Provider 3: Browser Speech Synthesis (fallback)
    this.providers.push({
      name: 'Browser',
      isAvailable: () => 'speechSynthesis' in window,
      speak: async (text: string, options?: TTSOptions) => {
        return new Promise((resolve, reject) => {
          if (!('speechSynthesis' in window)) {
            reject(new Error('Speech synthesis not supported'));
            return;
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = options?.speed || 1.0;
          utterance.pitch = options?.pitch || 1.0;
          
          utterance.onend = () => resolve();
          utterance.onerror = (error) => reject(error);
          
          window.speechSynthesis.speak(utterance);
        });
      }
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize audio context
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Find first available provider
    for (const provider of this.providers) {
      if (provider.isAvailable()) {
        this.currentProvider = provider;
        console.log(`✅ TTS initialized with ${provider.name}`);
        break;
      }
    }

    if (!this.currentProvider) {
      console.warn('⚠️ No TTS provider available, using browser fallback');
      this.currentProvider = this.providers[this.providers.length - 1]; // Browser fallback
    }

    this.initialized = true;
  }

  async speak(text: string, options?: TTSOptions): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Try current provider first
    try {
      if (this.currentProvider) {
        await this.currentProvider.speak(text, options);
        return;
      }
    } catch (error) {
      console.warn(`${this.currentProvider?.name} failed, trying fallback:`, error);
    }

    // Fallback chain
    for (const provider of this.providers) {
      if (provider === this.currentProvider) continue;
      
      try {
        if (provider.isAvailable()) {
          await provider.speak(text, options);
          this.currentProvider = provider; // Switch to working provider
          console.log(`✅ Switched to ${provider.name} TTS`);
          return;
        }
      } catch (error) {
        console.warn(`${provider.name} failed:`, error);
      }
    }

    throw new Error('All TTS providers failed');
  }

  private async playAudioBlob(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        resolve();
      };
      audio.onerror = (error) => {
        URL.revokeObjectURL(audio.src);
        reject(error);
      };
      audio.play().catch(reject);
    });
  }

  stop(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  getCurrentProvider(): string {
    return this.currentProvider?.name || 'None';
  }
}

export const consolidatedTTS = new ConsolidatedTTSService();

