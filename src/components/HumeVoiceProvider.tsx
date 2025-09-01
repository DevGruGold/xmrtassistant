import React from 'react';
import { VoiceProvider } from '@humeai/voice-react';

interface HumeVoiceProviderProps {
  children: React.ReactNode;
}

export function HumeVoiceProvider({ children }: HumeVoiceProviderProps) {
  return (
    <VoiceProvider>
      {children}
    </VoiceProvider>
  );
}