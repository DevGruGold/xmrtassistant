// ElevenLabs TTS and Conversational AI Service
export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Generate AI response using ElevenLabs Conversational AI
  async generateResponse(
    userInput: string,
    context?: { miningStats?: any; userContext?: any }
  ): Promise<{ text: string; method: string; confidence: number }> {
    try {
      // Use ElevenLabs text generation API for conversational AI
      const response = await fetch(`${this.baseUrl}/text-to-text`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: `As Eliza, the XMRT-DAO AI assistant, respond intelligently to: "${userInput}". Context: XMRT-DAO is a privacy-focused decentralized ecosystem focused on mining and governance. ${context?.miningStats ? `Mining status: ${context.miningStats.isOnline ? 'active' : 'inactive'}.` : ''} Provide a helpful, contextual response:`,
          model_id: 'eleven_multilingual_v2'
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.text || 'I understand your question about XMRT-DAO. How can I help you further?',
        method: 'ElevenLabs AI',
        confidence: 0.85
      };
    } catch (error) {
      console.error('ElevenLabs AI response error:', error);
      throw error;
    }
  }

  // Convert text to speech using ElevenLabs
  async textToSpeech(
    text: string,
    voiceId: string = 'Xb7hH8MSUJpSbSDYk0k2', // Alice - good for AI assistant
    modelId: string = 'eleven_turbo_v2_5' // Fast, high quality, multilingual
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw error;
    }
  }

  // Play audio blob
  async playAudio(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audio.src = audioUrl;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Audio playback failed'));
      };
      
      audio.play().catch(reject);
    });
  }

  // Convert text to speech and play immediately
  async speakText(
    text: string,
    voiceId?: string,
    modelId?: string
  ): Promise<void> {
    try {
      const audioBlob = await this.textToSpeech(text, voiceId, modelId);
      await this.playAudio(audioBlob);
    } catch (error) {
      console.error('Failed to speak text:', error);
      throw error;
    }
  }

  // Get available voices (subset of top voices)
  static getAvailableVoices() {
    return [
      { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'Clear, professional female voice' },
      { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Warm, friendly male voice' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Conversational female voice' },
      { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Distinguished male voice' },
      { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Professional female voice' }
    ];
  }
}

// Create service instance with environment variable
export const createElevenLabsService = () => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not found in environment variables');
  }
  return new ElevenLabsService(apiKey);
};