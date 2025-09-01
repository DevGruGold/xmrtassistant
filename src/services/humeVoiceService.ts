// Hume AI configuration
const HUME_CONFIG = {
  apiKey: 'IFxseVy6DWSyPXXyA217HBG8ADY50DHRj0avVq5p0LDxSFaA',
  secretKey: 'j4lsRAGxkeFSyLcROAZDPlLR5GRdSyShrNSuIh6BEhoBYPQkFzj9jUqqJw2Ahfoi',
  baseUrl: 'https://api.hume.ai',
};

// Hume Voice Configuration - Pure transcription mode
export const HUME_VOICE_CONFIG = {
  // Voice ID for consistent voice output
  voiceId: 'b201d214-914c-4d0a-b8e4-54adfc14a0dd',
  
  // Voice settings for optimal quality
  voiceSettings: {
    speed: 1.0,
    stability: 0.5,
    clarity: 0.7,
  },

  // Transcription settings
  transcriptionSettings: {
    enableEmotionDetection: true,
    emotionThreshold: 0.3,
    language: 'en',
  },

  // Pure transcription mode - no AI responses from Hume
  transcriptionOnly: true,
}

export default HUME_CONFIG;