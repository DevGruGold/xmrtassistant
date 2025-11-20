/**
 * Hume AI Emotion Analysis Service
 * Analyzes text for emotional context and provides voice tone suggestions
 */

interface EmotionalContext {
  primaryEmotion: string;
  confidence: number;
  emotionalTone: string;
  suggestedResponse: string;
}

export class HumeEmotionService {
  private apiKey: string;
  private baseUrl = 'https://api.hume.ai/v0';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeText(text: string): Promise<EmotionalContext> {
    try {
      const response = await fetch(`${this.baseUrl}/text/sentiment`, {
        method: 'POST',
        headers: {
          'X-Hume-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          models: ['sentiment', 'emotion']
        })
      });

      if (!response.ok) {
        throw new Error(`Hume API error: ${response.status}`);
      }

      const data = await response.json();
      
      const emotions = data.predictions?.emotions || [];
      const topEmotion = emotions.reduce((max: any, current: any) => 
        current.score > (max?.score || 0) ? current : max
      , null);

      return {
        primaryEmotion: topEmotion?.name || 'neutral',
        confidence: topEmotion?.score || 0.5,
        emotionalTone: this.mapEmotionToTone(topEmotion?.name),
        suggestedResponse: this.suggestResponseStyle(topEmotion?.name)
      };
    } catch (error) {
      console.error('❌ Hume emotion analysis failed:', error);
      return {
        primaryEmotion: 'neutral',
        confidence: 0,
        emotionalTone: 'calm',
        suggestedResponse: 'empathetic'
      };
    }
  }

  private mapEmotionToTone(emotion: string): string {
    const toneMap: Record<string, string> = {
      'joy': 'warm',
      'sadness': 'gentle',
      'anger': 'calm',
      'fear': 'reassuring',
      'surprise': 'engaged',
      'neutral': 'professional'
    };
    return toneMap[emotion] || 'warm';
  }

  private suggestResponseStyle(emotion: string): string {
    const styleMap: Record<string, string> = {
      'joy': 'enthusiastic',
      'sadness': 'empathetic',
      'anger': 'de-escalating',
      'fear': 'supportive',
      'surprise': 'informative',
      'neutral': 'balanced'
    };
    return styleMap[emotion] || 'empathetic';
  }
}
