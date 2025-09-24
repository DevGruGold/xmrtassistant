// Disabled service
export class GeminiTTSService {
  async speak(text: string): Promise<void> {
    console.log('TTS disabled');
  }
  async speakText(text: string): Promise<void> {
    console.log('TTS disabled');
  }
  stopSpeaking(): void {
    console.log('TTS stop disabled');
  }
}
export const geminiTTSService = new GeminiTTSService();