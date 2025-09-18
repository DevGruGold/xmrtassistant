import { VoiceProvider } from '@humeai/voice-react';

// Enhanced Hume EVI Service with emotional intelligence
export class HumeEVIService {
  private apiKey: string;
  private configId: string;
  private isConnected: boolean = false;
  private baseUrl = 'https://api.hume.ai/v0/evi';
  private wsUrl = 'wss://api.hume.ai/v0/evi/chat';

  constructor(apiKey: string, configId?: string) {
    this.apiKey = apiKey;
    this.configId = configId || 'default';
  }

  // Initialize Hume EVI conversation with emotional intelligence
  async initializeConversation(): Promise<boolean> {
    try {
      // Test API connection and get configurations
      const response = await fetch(`${this.baseUrl}/configs`, {
        headers: {
          'X-Hume-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      this.isConnected = response.ok;
      
      if (this.isConnected) {
        const configs = await response.json();
        console.log('✅ Hume EVI initialized with emotional intelligence:', configs.length, 'configs available');
      }
      
      return this.isConnected;
    } catch (error) {
      console.error('❌ Hume EVI initialization failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Voice-only initialization - no chat session needed for speech processing
  async initializeVoiceProcessing(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.initializeConversation();
      }
      return this.isConnected;
    } catch (error) {
      console.error('❌ Hume voice processing initialization failed:', error);
      return false;
    }
  }

  // Voice-only service - AI responses handled by UnifiedElizaService
  // This service focuses purely on emotional voice processing

  // Enhanced TTS with emotional expressiveness and better context
  async speakText(text: string, emotionalContext?: any): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.initializeConversation();
        if (!this.isConnected) {
          throw new Error('Hume EVI not available');
        }
      }

      // Use Hume's emotionally expressive TTS
      const response = await fetch(`${this.baseUrl}/tts/stream`, {
        method: 'POST',
        headers: {
          'X-Hume-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          voice: 'ava', // Hume's expressive voice
          format: 'mp3',
          emotional_expression: emotionalContext || {
            joy: 0.3,
            confidence: 0.7,
            empathy: 0.8
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Hume TTS API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      await this.playAudio(audioBlob);
      
      console.log('🎵 Hume EVI emotional TTS played');
    } catch (error) {
      console.error('❌ Hume EVI TTS failed:', error);
      throw error;
    }
  }

  // Process audio input with emotional understanding
  async processAudioInput(audioBlob: Blob): Promise<{ transcript: string; emotions: any; confidence: number }> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      formData.append('return_emotions', 'true');

      const response = await fetch(`${this.baseUrl}/speech-to-text`, {
        method: 'POST',
        headers: {
          'X-Hume-Api-Key': this.apiKey
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Hume STT API error: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('🎤 Hume emotional speech analysis:', result.emotions);
      
      return {
        transcript: result.transcript || '',
        emotions: result.emotions || {},
        confidence: result.confidence || 0.8
      };
    } catch (error) {
      console.error('❌ Hume audio processing failed:', error);
      throw error;
    }
  }

  // Play audio blob with enhanced error handling
  private async playAudio(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audio.src = audioUrl;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl);
        console.error('Audio playback error:', e);
        reject(new Error('Hume audio playback failed'));
      };
      
      audio.play().catch(error => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      });
    });
  }

  // Check if service is available
  isAvailable(): boolean {
    return this.isConnected && !!this.apiKey;
  }

  // Disconnect from Hume EVI
  async disconnect(): Promise<void> {
    try {
      this.isConnected = false;
      console.log('🔌 Hume EVI disconnected');
    } catch (error) {
      console.error('❌ Hume EVI disconnect failed:', error);
    }
  }

  // Get conversation status with emotional state
  getStatus(): { connected: boolean; hasEmotionalContext: boolean } {
    return {
      connected: this.isConnected,
      hasEmotionalContext: this.isConnected
    };
  }
}

// Factory function for creating Hume EVI service
export const createHumeEVIService = (apiKey: string, configId?: string): HumeEVIService => {
  return new HumeEVIService(apiKey, configId);
};

// Export configured instance with environment variables
export const humeEVIService = () => {
  const apiKey = import.meta.env.VITE_HUME_API_KEY;
  const configId = import.meta.env.VITE_HUME_CONFIG_ID;
  
  if (!apiKey) {
    console.warn('⚠️ HUME_API_KEY not found in environment variables');
    return null;
  }
  
  console.log('🧠 Initializing Hume EVI with emotional intelligence');
  return createHumeEVIService(apiKey, configId);
};