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
import { toast } from '@/hooks/use-toast';

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
        console.log('✅ Hume-an mode activated, state:', { 
          mode: this.mode, 
          isConnected: this.isConnected,
          tokenLength: token.length 
        });
        return true;
      }
      
      console.error('❌ Failed to get Hume access token - token was null/undefined');
      return false;
    } catch (error) {
      console.error('❌ Failed to enable Hume-an mode:', error);
      this.mode = 'browser';
      this.isConnected = false;
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
    
    // Debug: Log current state to identify routing decision
    const savedMode = localStorage.getItem('tts_mode');
    console.log('🎙️ humanizedTTS.speak() called:', {
      serviceMode: this.mode,
      isConnected: this.isConnected,
      localStorageMode: savedMode,
      willUseHume: this.mode === 'humanized' && this.isConnected,
      textPreview: options.text.substring(0, 30) + '...'
    });
    
    // Auto-restore mode if localStorage says humanized but service state doesn't match
    if (savedMode === 'humanized' && (this.mode !== 'humanized' || !this.isConnected)) {
      console.warn('⚠️ Mode mismatch detected! localStorage=humanized but service mode=', this.mode, 'connected=', this.isConnected);
      console.log('🔄 Auto-restoring humanized mode...');
      const restored = await this.enableHumanizedMode();
      console.log('🔄 Auto-restore result:', restored);
    }
    
    if (this.mode === 'humanized' && this.isConnected) {
      try {
        console.log('🎭 Routing to Hume TTS');
        // Use Hume TTS API with optional executive voice
        await this.speakWithHume(options.text, options.executive);
      } catch (error) {
        console.error('❌ Hume TTS failed, falling back to browser:', error);
        toast({
          title: "Hume Voice Unavailable",
          description: "Using browser voice as fallback",
          variant: "default",
        });
        // Fallback to browser TTS
        await this.speakWithBrowser(options);
      }
    } else {
      console.log('📢 Using browser TTS (mode:', this.mode, ', connected:', this.isConnected, ')');
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

  private async attemptHumeSpeak(text: string, voiceId: string, _token: string): Promise<void> {
    console.log('🎭 Calling Hume TTS via edge function with voice:', voiceId);
    console.log('🎭 Text length:', text.length, 'chars, preview:', text.substring(0, 50) + '...');

    // Use edge function to call Hume TTS with API key (server-side)
    const { data, error } = await supabase.functions.invoke('hume-tts', {
      body: { text, voiceId }
    });

    if (error) {
      console.error('❌ Hume TTS edge function error:', error);
      throw new Error(`Hume TTS error: ${error.message}`);
    }

    if (!data?.audio) {
      console.error('❌ No audio in Hume TTS response:', data);
      throw new Error('No audio data in Hume TTS response');
    }

    console.log('🎵 Received audio from edge function:', {
      size: data.size,
      format: data.format,
      base64Length: data.audio?.length,
      headerBytes: data.headerBytes
    });

    // Validate MP3 header bytes from server (0xFF 0xFB/0xFA = MP3, 0x49 0x44 0x33 = ID3 tag)
    if (data.headerBytes && data.headerBytes.length >= 2) {
      const isMP3Frame = data.headerBytes[0] === 0xFF && (data.headerBytes[1] === 0xFB || data.headerBytes[1] === 0xFA || data.headerBytes[1] === 0xF3);
      const isID3 = data.headerBytes[0] === 0x49 && data.headerBytes[1] === 0x44 && data.headerBytes[2] === 0x33;
      console.log('🔍 Audio format validation:', { isMP3Frame, isID3, valid: isMP3Frame || isID3 });
      
      if (!isMP3Frame && !isID3) {
        console.warn('⚠️ Audio header does not match MP3 format, bytes:', 
          data.headerBytes.map((b: number) => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' '));
      }
    }

    // Decode base64 to binary using native browser APIs
    try {
      // Use atob + Uint8Array for proper binary decoding
      const binaryString = atob(data.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Verify first bytes match expected header
      const clientHeader = Array.from(bytes.slice(0, 4));
      console.log('🔍 Client-side decoded header bytes:', 
        clientHeader.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' '));
      
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      
      console.log('🎵 Audio blob created, size:', audioBlob.size, 'bytes');
      
      if (audioBlob.size === 0) {
        throw new Error('Audio blob is empty');
      }
      
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
          console.error('❌ Hume audio playback error:', e, 'Audio state:', {
            readyState: this.currentAudio?.readyState,
            networkState: this.currentAudio?.networkState,
            error: this.currentAudio?.error
          });
          this.cleanupAudio();
          reject(new Error('Audio playback failed'));
        };
        
        console.log('▶️ Starting Hume audio playback...');
        this.currentAudio.play().catch((err) => {
          console.error('❌ Audio play() failed:', err);
          this.cleanupAudio();
          reject(err);
        });
      });
    } catch (decodeError) {
      console.error('❌ Failed to decode audio:', decodeError);
      throw new Error(`Audio decoding failed: ${decodeError}`);
    }
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
