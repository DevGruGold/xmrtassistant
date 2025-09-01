import React, { useEffect, useState } from 'react';
import { useVoice } from '@humeai/voice-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { XMRT_EVI_CONFIG } from '../services/humeVoiceService';

interface HumeVoiceChatProps {
  className?: string;
  onEmotionDetected?: (emotion: string, confidence: number) => void;
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  isEnabled?: boolean;
  miningStats?: any;
  userContext?: string;
}

export function HumeVoiceChat({ 
  className = '',
  onEmotionDetected,
  onTranscriptUpdate,
  isEnabled = true,
  miningStats,
  userContext = ''
}: HumeVoiceChatProps) {
  const {
    status,
    isMuted,
    isPlaying,
    connect,
    disconnect,
    mute,
    unmute,
    messages,
  } = useVoice();

  const [isConnected, setIsConnected] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>('');
  const [emotionConfidence, setEmotionConfidence] = useState<number>(0);

  // Handle connection status
  useEffect(() => {
    setIsConnected(status.value === 'connected');
  }, [status]);

  // Process incoming messages for emotions and transcripts
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      
      // Handle emotion detection
      if (latestMessage.type === 'user_message' && (latestMessage as any).models?.prosody) {
        const emotions = (latestMessage as any).models.prosody.scores;
        if (emotions && Object.keys(emotions).length > 0) {
          // Find the emotion with highest confidence
          const topEmotion = Object.entries(emotions).reduce((a, b) => 
            emotions[a[0]] > emotions[b[0]] ? a : b
          );
          
          const [emotion, confidence] = topEmotion;
          setCurrentEmotion(emotion);
          setEmotionConfidence(confidence as number);
          onEmotionDetected?.(emotion, confidence as number);
        }
      }

      // Handle transcript updates
      if (latestMessage.type === 'user_message' && (latestMessage as any).message?.content) {
        const isFinal = (latestMessage as any).message?.role !== 'user';
        onTranscriptUpdate?.((latestMessage as any).message.content, isFinal);
      }
    }
  }, [messages, onEmotionDetected, onTranscriptUpdate]);

  const handleConnect = async () => {
    try {
      // Connect with auth configuration
      await connect({
        auth: {
          type: 'apiKey',
          value: 'IFxseVy6DWSyPXXyA217HBG8ADY50DHRj0avVq5p0LDxSFaA'
        }
      });
    } catch (error) {
      console.error('Failed to connect to Hume EVI:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect from Hume EVI:', error);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  };

  if (!isEnabled) {
    return null;
  }

  const statusValue = typeof status === 'object' ? status.value : status;

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Voice Assistant</h3>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {statusValue || 'disconnected'}
          </Badge>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={isConnected ? handleDisconnect : handleConnect}
            variant={isConnected ? "destructive" : "default"}
            size="sm"
          >
            {isConnected ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {isConnected ? 'Disconnect' : 'Connect Voice'}
          </Button>

          {isConnected && (
            <Button
              onClick={toggleMute}
              variant="outline"
              size="sm"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
          )}
        </div>

        {/* Status Indicators */}
        {isConnected && (
          <div className="space-y-2">
            {/* Voice Activity */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-gray-300'}`} />
              {isPlaying ? 'AI Speaking' : 'Listening'}
            </div>

            {/* Emotion Display */}
            {currentEmotion && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Emotion:</span>
                <Badge variant="outline">
                  {currentEmotion} ({Math.round(emotionConfidence * 100)}%)
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!isConnected && (
          <p className="text-sm text-muted-foreground">
            Connect to start a voice conversation with the XMRT-DAO AI assistant
          </p>
        )}
      </div>
    </Card>
  );
}