import { useHumeVoiceTools } from '@/services/humeVoiceTools';

// Enhanced hook that uses the voice-only Hume client tools
export const useHumeClientTools = () => {
  // Use the voice-focused client tools
  return useHumeVoiceTools();
};