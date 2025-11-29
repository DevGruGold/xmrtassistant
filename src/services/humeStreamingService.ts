/**
 * Hume Streaming Service
 * Manages WebSocket connections for real-time expression measurement
 * Uses Hume's Expression Measurement streaming API with proper authentication
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
  private apiKey: string | null = null;
  private frameQueue: string[] = [];
  private processingFrame = false;
  private batchSize = 1;
  private batchDelay = 100; // ms between batches
  private lastEmotionUpdate = 0;
  private minUpdateInterval = 200; // Throttle emotion updates

  async connect(config: StreamingConfig): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      console.log('🔄 Already connected or connecting to Hume streaming');
      return;
    }

    this.config = config;
    this.isConnecting = true;

    try {
      // Get API key from edge function
      if (!this.apiKey) {
        const { data, error } = await supabase.functions.invoke('hume-access-token');
        if (error) throw error;
        // The hume-access-token returns either access_token (OAuth) or api_key
        this.apiKey = data?.access_token || data?.api_key;
        console.log('🔑 Obtained Hume credentials');
      }

      if (!this.apiKey) {
        throw new Error('Failed to obtain Hume credentials');
      }

      // Connect to Hume Expression Measurement streaming API
      // Using the models streaming endpoint with API key authentication
      const wsUrl = `wss://api.hume.ai/v0/stream/models?apikey=${encodeURIComponent(this.apiKey)}`;
      
      console.log('🔌 Connecting to Hume streaming API...');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ Connected to Hume streaming API (REAL)');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.config?.onConnect?.();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('❌ Hume WebSocket error:', error);
        this.config?.onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = (event) => {
        console.log('🔌 Disconnected from Hume streaming API', event.code, event.reason);
        this.isConnecting = false;
        this.config?.onDisconnect?.();
        
        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('❌ Failed to connect to Hume streaming:', error);
      this.config?.onError?.(error instanceof Error ? error : new Error('Connection failed'));
    }
  }

  private handleMessage(data: string): void {
    try {
      const response = JSON.parse(data);
      
      // Throttle updates to avoid overwhelming the UI
      const now = Date.now();
      if (now - this.lastEmotionUpdate < this.minUpdateInterval) {
        return;
      }
      this.lastEmotionUpdate = now;

      let emotions: EmotionScore[] = [];

      // Handle face model predictions
      if (response.face?.predictions?.[0]?.emotions) {
        emotions = response.face.predictions[0].emotions
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 10)
          .map((e: any) => ({
            name: e.name,
            score: e.score
          }));
        
        console.log(`🎭 Real face emotions detected: ${emotions[0]?.name} (${(emotions[0]?.score * 100).toFixed(1)}%)`);
      }

      // Handle prosody model predictions (voice)
      if (response.prosody?.predictions?.[0]?.emotions) {
        const prosodyEmotions = response.prosody.predictions[0].emotions
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 10)
          .map((e: any) => ({
            name: e.name,
            score: e.score
          }));

        // Merge with face emotions or use prosody alone
        if (emotions.length === 0) {
          emotions = prosodyEmotions;
        }
        
        console.log(`🎤 Real prosody emotions: ${prosodyEmotions[0]?.name}`);
      }

      // Handle error responses
      if (response.error) {
        console.error('❌ Hume streaming error:', response.error);
        this.config?.onError?.(new Error(response.error.message || 'Hume streaming error'));
        return;
      }

      // Only update if we have emotions
      if (emotions.length > 0) {
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected for frame');
      return;
    }

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
        // Send frame in Hume's expected format
        const message = {
          data: frame,
          models: {
            face: {}
          },
          raw_text: false
        };
        
        this.ws.send(JSON.stringify(message));
      }

      // Small delay between batches to avoid overwhelming the API
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
      },
      raw_text: false
    };

    this.ws.send(JSON.stringify(message));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }
    this.frameQueue = [];
    this.processingFrame = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    this.apiKey = null; // Clear cached key
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

  // Clear the API key cache (useful if credentials change)
  clearCredentials(): void {
    this.apiKey = null;
  }
}

export const humeStreamingService = new HumeStreamingService();
