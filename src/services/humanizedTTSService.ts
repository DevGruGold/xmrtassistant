/**
 * Humanized TTS Service - Dual Mode System
 * Mode 1 (Default): Browser Web Speech API (free, fast, reliable)
 * Mode 2 (Premium): Hume AI EVI (Empathic Voice Interface)
 * 
 * Features:
 * - Audio tracking to prevent overlapping speech
 * - Executive voice differentiation for Council mode
 */

import { unifiedTTSService } from './unifiedTTSService';
import { supabase } from '@/integrations/supabase/client';

type TTSMode = 'browser' | 'humanized';

interface HumanizedTTSOptions {
  text: string;
  emotion?: string;
  voice?: string;
  speed?: number;
  language?: 'en' | 'es';
  executive?: string; // Executive name for voice selection in council mode
}

// Executive-specific Hume voice IDs for council differentiation (PERMANENT)
const EXECUTIVE_HUME_VOICES: Record<string, string> = {
  'CSO': '445d65ed-a87f-4140-9820-daf6d4f0a200', // Chief Strategy Officer - Authoritative
  'CTO': '5cad536a-3013-4f01-8390-d6d405d266a9', // Chief Technology Officer - Precise, technical
  'CIO': '5bb7de05-c8fe-426a-8fcc-ba4fc4ce9f9c', // Chief Innovation Officer - Inspiring
  'CAO': '5ac595dd-26ce-4898-961a-b19efa9cd491', // Chief Analytics Officer - Spanish native
  'default': 'c7aa10be-57c1-4647-9306-7ac48dde3536', // Eliza's primary voice
};

// Store Hume connection state
let humeAccessToken: string | null = null;
let humeTokenExpiry: number = 0;

export class HumanizedTTSService {
  private mode: TTSMode = 'browser';
  private isConnected = false;
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;

  async enableHumanizedMode(): Promise<boolean> {
    try {
      console.log('🎭 Enabling Hume-an mode...');
      
      // Fetch access token from our edge function
      const token = await this.getHumeAccessToken();
      
      if (token) {
        this.mode = 'humanized';
        this.isConnected = true;
        localStorage.setItem('tts_mode', 'humanized');
        console.log('✅ Hume-an mode activated');
        return true;
      }
      
      console.error('❌ Failed to get Hume access token');
      return false;
    } catch (error) {
      console.error('❌ Failed to enable Hume-an mode:', error);
      return false;
    }
  }

  private async getHumeAccessToken(): Promise<string | null> {
    // Check if we have a valid cached token
    if (humeAccessToken && Date.now() < humeTokenExpiry) {
      return humeAccessToken;
    }

    try {
      const { data, error } = await supabase.functions.invoke('hume-access-token');
      
      if (error) {
        console.error('❌ Error fetching Hume token:', error);
        return null;
      }

      if (data?.accessToken) {
        humeAccessToken = data.accessToken;
        // Set expiry 5 minutes before actual expiry for safety
        humeTokenExpiry = Date.now() + ((data.expiresIn || 3600) - 300) * 1000;
        return humeAccessToken;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to fetch Hume access token:', error);
      return null;
    }
  }

  disableHumanizedMode(): void {
    this.mode = 'browser';
    this.isConnected = false;
    humeAccessToken = null;
    humeTokenExpiry = 0;
    localStorage.setItem('tts_mode', 'browser');
    console.log('📴 Hume-an mode deactivated');
  }

  async restoreMode(): Promise<void> {
    const savedMode = localStorage.getItem('tts_mode');
    if (savedMode === 'humanized') {
      await this.enableHumanizedMode();
    }
  }

  async speak(options: HumanizedTTSOptions): Promise<void> {
    // Stop any currently playing audio before starting new speech
    this.stop();
    
    if (this.mode === 'humanized' && this.isConnected) {
      try {
        // Use Hume TTS API with optional executive voice
        await this.speakWithHume(options.text, options.executive);
      } catch (error) {
        console.error('❌ Hume TTS failed, falling back to browser:', error);
        // Fallback to browser TTS
        await this.speakWithBrowser(options);
      }
    } else {
      await this.speakWithBrowser(options);
    }
  }

  /**
   * Speak council deliberation with different voices for each executive
   */
  async speakCouncilDeliberation(responses: Array<{ executive: string; executiveTitle: string; perspective: string }>, synthesis: string): Promise<void> {
    // Stop any currently playing audio
    this.stop();

    if (this.mode === 'humanized' && this.isConnected) {
      try {
        // Speak each executive's perspective with their designated voice
        for (const response of responses) {
          const introText = `${response.executiveTitle} says: ${response.perspective}`;
          await this.speakWithHume(introText, response.executive);
        }
        
        // Speak the unified synthesis with default voice
        if (synthesis) {
          await this.speakWithHume(`Unified Council Recommendation: ${synthesis}`, 'default');
        }
      } catch (error) {
        console.error('❌ Hume council TTS failed, falling back to browser:', error);
        // Fallback: combine all text and speak with browser
        const combinedText = responses.map(r => `${r.executiveTitle}: ${r.perspective}`).join('. ') + 
          (synthesis ? `. Unified Recommendation: ${synthesis}` : '');
        await this.speakWithBrowser({ text: combinedText });
      }
    } else {
      // Browser TTS: combine all text and speak
      const combinedText = responses.map(r => `${r.executiveTitle}: ${r.perspective}`).join('. ') + 
        (synthesis ? `. Unified Recommendation: ${synthesis}` : '');
      await this.speakWithBrowser({ text: combinedText });
    }
  }

  private getVoiceIdForExecutive(executive?: string): string {
    if (!executive) return EXECUTIVE_HUME_VOICES['default'];
    
    // Try exact match first
    if (EXECUTIVE_HUME_VOICES[executive]) {
      return EXECUTIVE_HUME_VOICES[executive];
    }
    
    // Try to extract role from executive title (e.g., "Chief Security Officer" -> "CSO")
    const roleMap: Record<string, string> = {
      'security': 'CSO',
      'technology': 'CTO',
      'tech': 'CTO',
      'innovation': 'CIO',
      'analytics': 'CAO',
      'operations': 'CAO',
    };
    
    const lowerExec = executive.toLowerCase();
    for (const [keyword, role] of Object.entries(roleMap)) {
      if (lowerExec.includes(keyword)) {
        return EXECUTIVE_HUME_VOICES[role];
      }
    }
    
    return EXECUTIVE_HUME_VOICES['default'];
  }

  private async speakWithHume(text: string, executive?: string): Promise<void> {
    const token = await this.getHumeAccessToken();
    if (!token) {
      throw new Error('No Hume access token available');
    }

    const voiceId = this.getVoiceIdForExecutive(executive);
    
    try {
      await this.attemptHumeSpeak(text, voiceId, token);
    } catch (error) {
      // If executive-specific voice fails, try default voice as fallback
      if (voiceId !== EXECUTIVE_HUME_VOICES['default']) {
        console.warn(`⚠️ Voice ${voiceId} failed for ${executive}, falling back to default voice`);
        await this.attemptHumeSpeak(text, EXECUTIVE_HUME_VOICES['default'], token);
      } else {
        throw error;
      }
    }
  }

  private async attemptHumeSpeak(text: string, voiceId: string, token: string): Promise<void> {
    console.log('🎭 Calling Hume TTS API with voice:', voiceId);
    console.log('🎭 Text:', text.substring(0, 50) + '...');

    const response = await fetch('https://api.hume.ai/v0/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        utterances: [
          {
            text: text,
            voice: {
              id: voiceId
            }
          }
        ],
        format: {
          type: 'mp3'
        }
      }),
    });

    console.log('📡 Hume TTS response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Hume TTS API error:', response.status, errorText);
      throw new Error(`Hume TTS error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let audioBlob: Blob;

    if (contentType.includes('audio/')) {
      console.log('🎵 Received binary audio response');
      audioBlob = await response.blob();
    } else {
      console.log('📦 Received JSON response, parsing...');
      const data = await response.json();
      
      const base64Audio = data.generations?.[0]?.audio;
      if (!base64Audio) {
        console.error('❌ No audio in Hume response:', data);
        throw new Error('No audio data in Hume TTS response');
      }

      const audioBytes = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
      audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
    }

    console.log('🎵 Audio blob size:', audioBlob.size, 'bytes');
    
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
    }
    
    this.currentAudioUrl = URL.createObjectURL(audioBlob);
    this.currentAudio = new Audio(this.currentAudioUrl);
    
    return new Promise((resolve, reject) => {
      if (!this.currentAudio) {
        reject(new Error('Audio element not created'));
        return;
      }
      
      this.currentAudio.onended = () => {
        console.log('🎭 Hume TTS playback complete');
        this.cleanupAudio();
        resolve();
      };
      this.currentAudio.onerror = (e) => {
        console.error('❌ Hume audio playback error:', e);
        this.cleanupAudio();
        reject(e);
      };
      this.currentAudio.play().catch((err) => {
        this.cleanupAudio();
        reject(err);
      });
    });
  }

  private cleanupAudio(): void {
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
    this.currentAudio = null;
  }

  private async speakWithBrowser(options: HumanizedTTSOptions): Promise<void> {
    await unifiedTTSService.speakText({
      text: options.text,
      voice: (options.voice as any) || 'nova',
      speed: options.speed || 1.0,
      language: options.language || 'en'
    });
  }

  stop(): void {
    // Stop Hume audio playback
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.cleanupAudio();
      console.log('🛑 Stopped Hume audio playback');
    }
    
    // Stop browser TTS
    unifiedTTSService.stopSpeaking();
  }

  getCurrentMode(): TTSMode {
    return this.mode;
  }

  isHumanized(): boolean {
    return this.mode === 'humanized';
  }

  getAccessToken(): string | null {
    return humeAccessToken;
  }
}

export const humanizedTTS = new HumanizedTTSService();
