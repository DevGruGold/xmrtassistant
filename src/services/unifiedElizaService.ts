// Disabled service
export class UnifiedElizaService {
  static async generateResponse(text: string, options?: any): Promise<string> {
    console.log('UnifiedEliza service disabled');
    return 'AI service temporarily unavailable';
  }
  static resetGeminiInstance() {
    console.log('Gemini reset disabled');
  }
}
export const unifiedElizaService = new UnifiedElizaService();