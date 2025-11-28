/**
 * Hume Streaming Service
 * Manages WebSocket connections for real-time expression measurement
 */

import { supabase } from '@/integrations/supabase/client';

export interface EmotionScore {
  name: string;
  score: number;
}

export interface StreamingConfig {
  models: ('face' | 'prosody' | 'language')[];
  onEmotionUpdate: (emotions: EmotionScore[]) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

class HumeStreamingService {
  private ws: WebSocket | null = null;
  private config: StreamingConfig | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private accessToken: string | null = null;
  private frameQueue: string[] = [];
  private processingFrame = false;
  private batchSize = 1;
  private batchDelay = 100; // ms between batches

  async connect(config: StreamingConfig): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      console.log('🔄 Already connected or connecting to Hume streaming');
      return;
    }

    this.config = config;
    this.isConnecting = true;

    try {
      // Get access token
      if (!this.accessToken) {
        const { data, error } = await supabase.functions.invoke('hume-access-token');
        if (error) throw error;
        this.accessToken = data?.access_token;
      }

      if (!this.accessToken) {
        throw new Error('Failed to obtain Hume access token');
      }

      // Connect to Hume streaming API
      const wsUrl = `wss://api.hume.ai/v0/stream/models?apikey=${this.accessToken}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ Connected to Hume streaming API');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.config?.onConnect?.();

        // Send initial configuration
        this.sendConfig();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('❌ Hume WebSocket error:', error);
        this.config?.onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        console.log('🔌 Disconnected from Hume streaming API');
        this.isConnecting = false;
        this.config?.onDisconnect?.();
        
        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('❌ Failed to connect to Hume streaming:', error);
      this.config?.onError?.(error instanceof Error ? error : new Error('Connection failed'));
    }
  }

  private sendConfig(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.config) return;

    const configMessage = {
      models: {
        face: this.config.models.includes('face') ? {} : undefined,
        prosody: this.config.models.includes('prosody') ? {} : undefined,
        language: this.config.models.includes('language') ? {} : undefined,
      },
      stream_window_ms: 500,
    };

    this.ws.send(JSON.stringify(configMessage));
    console.log('📤 Sent streaming config:', configMessage);
  }

  private handleMessage(data: string): void {
    try {
      const response = JSON.parse(data);
      
      if (response.face?.predictions?.[0]?.emotions) {
        const emotions: EmotionScore[] = response.face.predictions[0].emotions
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 10)
          .map((e: any) => ({
            name: e.name,
            score: e.score
          }));

        this.config?.onEmotionUpdate(emotions);
      }

      if (response.prosody?.predictions?.[0]?.emotions) {
        const emotions: EmotionScore[] = response.prosody.predictions[0].emotions
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 10)
          .map((e: any) => ({
            name: e.name,
            score: e.score
          }));

        this.config?.onEmotionUpdate(emotions);
      }

    } catch (error) {
      console.error('❌ Error parsing Hume response:', error);
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.config) {
        this.connect(this.config);
      }
    }, delay);
  }

  sendFrame(base64Image: string): void {
    this.frameQueue.push(base64Image);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processingFrame || this.frameQueue.length === 0) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.processingFrame = true;

    try {
      const frames = this.frameQueue.splice(0, this.batchSize);
      
      for (const frame of frames) {
        const message = {
          data: frame,
          models: {
            face: {}
          }
        };
        
        this.ws.send(JSON.stringify(message));
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      
    } catch (error) {
      console.error('❌ Error sending frame:', error);
    } finally {
      this.processingFrame = false;
      
      // Process remaining frames
      if (this.frameQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  sendAudio(base64Audio: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected for audio');
      return;
    }

    const message = {
      data: base64Audio,
      models: {
        prosody: {}
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.frameQueue = [];
    this.processingFrame = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    console.log('🔌 Hume streaming disconnected');
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

export const humeStreamingService = new HumeStreamingService();
