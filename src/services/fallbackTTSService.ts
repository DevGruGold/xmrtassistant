import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface TTSFallbackOptions {
  text: string;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export class FallbackTTSService {
  private static speechTTSPipeline: any = null;
  private static isInitializing = false;

  // Initialize local TTS model
  private static async initializeSpeechT5(): Promise<void> {
    if (this.speechTTSPipeline || this.isInitializing) return;
    
    this.isInitializing = true;
    try {
      console.log('Initializing local SpeechT5 TTS model...');
      this.speechTTSPipeline = await pipeline(
        'text-to-speech',
        'Xenova/speecht5_tts',
        { device: 'webgpu' }
      );
      console.log('Local TTS model initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize local TTS model:', error);
      this.speechTTSPipeline = null;
    } finally {
      this.isInitializing = false;
    }
  }

  // Web Speech API fallback
  static async speakWithWebSpeech(options: TTSFallbackOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(options.text);
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      // Try to find a specific voice if voiceId provided
      if (options.voiceId) {
        const voices = speechSynthesis.getVoices();
        const voice = voices.find(v => 
          v.name.toLowerCase().includes(options.voiceId!.toLowerCase()) ||
          v.lang.includes('en')
        );
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      speechSynthesis.speak(utterance);
    });
  }

  // Local TTS model fallback
  static async speakWithLocalModel(options: TTSFallbackOptions): Promise<void> {
    try {
      await this.initializeSpeechT5();
      
      if (!this.speechTTSPipeline) {
        throw new Error('Local TTS model not available');
      }

      console.log('Generating speech with local model...');
      const result = await this.speechTTSPipeline(options.text);
      
      // Convert result to audio and play
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(result.audio.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      return new Promise((resolve, reject) => {
        source.onended = () => resolve();
        source.addEventListener('error', reject);
        source.start();
      });
    } catch (error) {
      console.error('Local TTS model failed:', error);
      throw error;
    }
  }

  // Unified TTS with fallback chain
  static async speak(options: TTSFallbackOptions): Promise<{ method: string }> {
    const methods = [
      { name: 'Web Speech API', fn: () => this.speakWithWebSpeech(options) },
      { name: 'Local TTS Model', fn: () => this.speakWithLocalModel(options) }
    ];

    for (const method of methods) {
      try {
        console.log(`Attempting TTS with: ${method.name}`);
        await method.fn();
        console.log(`TTS successful with: ${method.name}`);
        return { method: method.name };
      } catch (error) {
        console.warn(`${method.name} failed:`, error);
        continue;
      }
    }

    throw new Error('All TTS fallback methods failed');
  }
}