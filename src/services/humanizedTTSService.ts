/**
 * Humanized TTS Service - Dual Mode System
 * Mode 1 (Default): Browser Web Speech API (free, fast, reliable)
 * Mode 2 (Premium): Hume AI + ElevenLabs (emotional, ultra-realistic)
 */

import { unifiedTTSService } from './unifiedTTSService';
import { ElevenLabsService } from './elevenlabsService';

type TTSMode = 'browser' | 'humanized';

interface HumanizedTTSOptions {
  text: string;
  emotion?: string;
  voice?: string;
  speed?: number;
  language?: 'en' | 'es';
}

export class HumanizedTTSService {
  private mode: TTSMode = 'browser';
  private elevenLabsService: ElevenLabsService | null = null;
  private humeApiKey: string | null = null;
  private elevenLabsApiKey: string | null = null;

  async enableHumanizedMode(
    humeApiKey: string,
    elevenLabsApiKey: string
  ): Promise<boolean> {
    try {
      this.humeApiKey = humeApiKey;
      this.elevenLabsApiKey = elevenLabsApiKey;
      
      this.elevenLabsService = new ElevenLabsService(elevenLabsApiKey);
      const isAvailable = await this.elevenLabsService.testService();
      
      if (isAvailable) {
        this.mode = 'humanized';
        localStorage.setItem('tts_mode', 'humanized');
        localStorage.setItem('hume_api_key', humeApiKey);
        localStorage.setItem('elevenlabs_api_key', elevenLabsApiKey);
        console.log('✅ Humanized mode activated');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to enable humanized mode:', error);
      return false;
    }
  }

  disableHumanizedMode(): void {
    this.mode = 'browser';
    this.elevenLabsService = null;
    localStorage.setItem('tts_mode', 'browser');
    localStorage.removeItem('hume_api_key');
    localStorage.removeItem('elevenlabs_api_key');
    console.log('📴 Humanized mode deactivated');
  }

  async restoreMode(): Promise<void> {
    const savedMode = localStorage.getItem('tts_mode');
    if (savedMode === 'humanized') {
      const humeKey = localStorage.getItem('hume_api_key');
      const elevenLabsKey = localStorage.getItem('elevenlabs_api_key');
      
      if (humeKey && elevenLabsKey) {
        await this.enableHumanizedMode(humeKey, elevenLabsKey);
      }
    }
  }

  async speak(options: HumanizedTTSOptions): Promise<void> {
    if (this.mode === 'humanized' && this.elevenLabsService) {
      const voiceId = options.emotion 
        ? ElevenLabsService.getVoiceForEmotion(options.emotion)
        : 'Xb7hH8MSUJpSbSDYk0k2'; // Alice default
      
      await this.elevenLabsService.speakText(
        options.text,
        voiceId,
        undefined,
        () => {}
      );
    } else {
      await unifiedTTSService.speakText({
        text: options.text,
        voice: (options.voice as any) || 'nova',
        speed: options.speed || 1.0,
        language: options.language || 'en'
      });
    }
  }

  stop(): void {
    if (this.mode === 'humanized' && this.elevenLabsService) {
      this.elevenLabsService.stopSpeaking();
    } else {
      unifiedTTSService.stopSpeaking();
    }
  }

  getCurrentMode(): TTSMode {
    return this.mode;
  }

  isHumanized(): boolean {
    return this.mode === 'humanized';
  }
}

export const humanizedTTS = new HumanizedTTSService();
