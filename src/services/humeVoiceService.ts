// Hume AI configuration
const HUME_CONFIG = {
  apiKey: 'IFxseVy6DWSyPXXyA217HBG8ADY50DHRj0avVq5p0LDxSFaA',
  secretKey: 'j4lsRAGxkeFSyLcROAZDPlLR5GRdSyShrNSuIh6BEhoBYPQkFzj9jUqqJw2Ahfoi',
  baseUrl: 'https://api.hume.ai',
};

// XMRT-specific EVI configuration - optimized for transcription only
export const XMRT_EVI_CONFIG = {
  // Minimal system prompt - we want Hume to focus on transcription
  systemPrompt: `You are a voice transcription assistant. Your primary role is to accurately transcribe user speech and detect emotional context. Do not generate conversational responses - simply acknowledge transcription with brief confirmations like "Got it" or "I heard you." The main AI system will handle all substantive responses.`,

  // Voice and conversation settings optimized for transcription
  voiceSettings: {
    speed: 1.0,
    temperature: 0.1, // Low temperature for consistent, brief responses
    maxTokens: 20,    // Very short responses
  },

  // Emotion detection settings
  emotionSettings: {
    enableEmotionDetection: true,
    emotionThreshold: 0.3,
  },

  // Configuration to minimize AI responses from Hume
  transcriptionMode: true,
}

export default HUME_CONFIG;