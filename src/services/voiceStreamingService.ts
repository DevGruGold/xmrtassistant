import { supabase } from '@/integrations/supabase/client';

export interface VoiceEmotion {
  name: string;
  score: number;
}

export interface VoiceStreamingConfig {
  onTranscript: (text: string, isFinal: boolean) => void;
  onEmotion: (emotions: VoiceEmotion[]) => void;
  onError: (error: Error) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

export class VoiceStreamingService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private config: VoiceStreamingConfig | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  async connect(audioStream: MediaStream, config: VoiceStreamingConfig): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      console.log('🎤 VoiceStreaming: Already connected or connecting');
      return;
    }

    this.config = config;
    this.isConnecting = true;

    try {
      console.log('🎤 VoiceStreaming: Getting Hume access token...');
      const { data, error } = await supabase.functions.invoke('hume-access-token');
      
      if (error || !data?.access_token) {
        throw new Error(`Failed to get Hume access token: ${error?.message || 'No token returned'}`);
      }

      console.log('🎤 VoiceStreaming: Connecting to Hume EVI...');
      
      // Connect to Hume EVI WebSocket
      const wsUrl = `wss://api.hume.ai/v0/evi/chat?access_token=${data.access_token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🎤 VoiceStreaming: WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Send session configuration
        this.sendSessionConfig();
        
        // Start streaming audio
        this.startAudioStreaming(audioStream);
        
        config.onConnected();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (event) => {
        console.error('🎤 VoiceStreaming: WebSocket error', event);
        this.isConnecting = false;
        config.onError(new Error('WebSocket connection error'));
      };

      this.ws.onclose = (event) => {
        console.log('🎤 VoiceStreaming: WebSocket closed', event.code, event.reason);
        this.isConnecting = false;
        this.cleanup();
        config.onDisconnected();
        
        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🎤 VoiceStreaming: Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          setTimeout(() => this.connect(audioStream, config), 1000 * this.reconnectAttempts);
        }
      };
    } catch (error) {
      console.error('🎤 VoiceStreaming: Connection failed', error);
      this.isConnecting = false;
      config.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private sendSessionConfig(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Configure Hume EVI session for voice processing
    const sessionConfig = {
      type: 'session_settings',
      audio: {
        encoding: 'linear16',
        sample_rate: 16000
      },
      context: {
        text: 'You are Eliza, an AI assistant for XMRT cryptocurrency project. Listen to the user and provide helpful responses.'
      }
    };

    this.ws.send(JSON.stringify(sessionConfig));
    console.log('🎤 VoiceStreaming: Session config sent');
  }

  private startAudioStreaming(audioStream: MediaStream): void {
    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(audioStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const base64Audio = this.encodeAudioForAPI(inputData);
        
        // Send audio data to Hume
        this.ws.send(JSON.stringify({
          type: 'audio_input',
          data: base64Audio
        }));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      console.log('🎤 VoiceStreaming: Audio streaming started');
    } catch (error) {
      console.error('🎤 VoiceStreaming: Failed to start audio streaming', error);
      this.config?.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private encodeAudioForAPI(float32Array: Float32Array): string {
    // Convert Float32 to Int16
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Convert to base64
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'user_message':
          // Real-time transcript from voice
          if (message.message?.content) {
            const isFinal = message.message?.role === 'user';
            console.log('🎤 VoiceStreaming: Transcript received:', message.message.content);
            this.config?.onTranscript(message.message.content, isFinal);
          }
          break;
          
        case 'user_interruption':
          console.log('🎤 VoiceStreaming: User interruption detected');
          break;
          
        case 'assistant_message':
          // Assistant response (we handle our own responses, but log for debugging)
          console.log('🎤 VoiceStreaming: Assistant message:', message.message?.content?.substring(0, 50));
          break;
          
        case 'audio_output':
          // Hume sends audio output - we use our own TTS, so ignore
          break;
          
        case 'emotion':
        case 'models':
          // Extract prosody emotions from voice
          const prosodyScores = message.models?.prosody?.scores || message.prosody?.scores;
          if (prosodyScores) {
            const emotions = this.extractTopEmotions(prosodyScores);
            console.log('🎤 VoiceStreaming: Voice emotions detected:', emotions.map(e => e.name).join(', '));
            this.config?.onEmotion(emotions);
          }
          break;
          
        case 'error':
          console.error('🎤 VoiceStreaming: Hume error:', message);
          this.config?.onError(new Error(message.message || 'Hume EVI error'));
          break;
          
        default:
          console.log('🎤 VoiceStreaming: Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('🎤 VoiceStreaming: Failed to parse message:', error);
    }
  }

  private extractTopEmotions(scores: Record<string, number>): VoiceEmotion[] {
    // Convert scores object to array and sort by score
    const emotions = Object.entries(scores)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 emotions
    
    return emotions;
  }

  disconnect(): void {
    console.log('🎤 VoiceStreaming: Disconnecting...');
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.cleanup();
    this.config?.onDisconnected();
  }

  private cleanup(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.isConnecting) return 'connecting';
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }
}

export const voiceStreamingService = new VoiceStreamingService();
