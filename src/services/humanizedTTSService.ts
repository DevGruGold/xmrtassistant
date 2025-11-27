/**
 * Humanized TTS Service - Dual Mode System
 * Mode 1 (Default): Browser Web Speech API (free, fast, reliable)
 * Mode 2 (Premium): Hume AI EVI (Empathic Voice Interface)
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
}

// Store Hume connection state
let humeAccessToken: string | null = null;
let humeTokenExpiry: number = 0;

export class HumanizedTTSService {
  private mode: TTSMode = 'browser';
  private isConnected = false;

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
    if (this.mode === 'humanized' && this.isConnected) {
      try {
        // Use Hume TTS API
        await this.speakWithHume(options.text);
      } catch (error) {
        console.error('❌ Hume TTS failed, falling back to browser:', error);
        // Fallback to browser TTS
        await this.speakWithBrowser(options);
      }
    } else {
      await this.speakWithBrowser(options);
    }
  }

  private async speakWithHume(text: string): Promise<void> {
    const token = await this.getHumeAccessToken();
    if (!token) {
      throw new Error('No Hume access token available');
    }

    console.log('🎭 Calling Hume TTS API with text:', text.substring(0, 50) + '...');
    console.log('🔑 Using token:', token.substring(0, 10) + '...');

    // Use Hume's TTS API - returns binary audio directly
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
              id: 'c7aa10be-57c1-4647-9306-7ac48dde3536'
            }
          }
        ],
        format: {
          type: 'mp3'
        }
      }),
    });

    console.log('📡 Hume TTS response status:', response.status);
    console.log('📡 Hume TTS content-type:', response.headers.get('content-type'));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Hume TTS API error:', response.status, errorText);
      throw new Error(`Hume TTS error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let audioBlob: Blob;

    // Handle both binary and JSON responses
    if (contentType.includes('audio/')) {
      // Direct binary audio response
      console.log('🎵 Received binary audio response');
      audioBlob = await response.blob();
    } else {
      // JSON response with base64 audio
      console.log('📦 Received JSON response, parsing...');
      const data = await response.json();
      console.log('✅ Hume TTS JSON response received');
      
      const base64Audio = data.generations?.[0]?.audio;
      if (!base64Audio) {
        console.error('❌ No audio in Hume response:', data);
        throw new Error('No audio data in Hume TTS response');
      }

      // Decode base64 to audio blob
      const audioBytes = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
      audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
    }

    console.log('🎵 Audio blob size:', audioBlob.size, 'bytes');
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        console.log('🎭 Hume TTS playback complete');
        resolve();
      };
      audio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl);
        console.error('❌ Hume audio playback error:', e);
        reject(e);
      };
      audio.play().catch(reject);
    });
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
    // Stop browser TTS
    unifiedTTSService.stopSpeaking();
    
    // Note: Hume audio playback would need to be tracked and stopped separately
    // For now, browser fallback handles this
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
