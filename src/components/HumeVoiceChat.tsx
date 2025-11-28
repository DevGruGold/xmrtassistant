import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';

interface HumeVoiceChatProps {
  onEmotionUpdate?: (emotions: EmotionData[]) => void;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  configId?: string;
  preObtainedStream?: MediaStream | null;
  autoConnect?: boolean;
}

export interface EmotionData {
  name: string;
  score: number;
}

interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotions?: EmotionData[];
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const HumeVoiceChat: React.FC<HumeVoiceChatProps> = ({
  onEmotionUpdate,
  onTranscript,
  preObtainedStream,
  autoConnect = false
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isAssistantMuted, setIsAssistantMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Track call duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Monitor mic levels
  useEffect(() => {
    if (status !== 'connected' || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateLevel = () => {
      if (status !== 'connected') return;
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setMicLevel(average / 255);
      requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  }, [status]);

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      setError(null);

      // Get access token
      const { data, error: tokenError } = await supabase.functions.invoke('hume-access-token');
      if (tokenError || !data?.access_token) {
        throw new Error('Failed to get Hume access token');
      }

      // Use pre-obtained stream or get microphone access
      let stream: MediaStream;
      if (preObtainedStream) {
        stream = preObtainedStream;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          } 
        });
      }
      mediaStreamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Connect to Hume EVI WebSocket
      const wsUrl = `wss://api.hume.ai/v0/evi/chat?access_token=${data.access_token}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ Connected to Hume EVI');
        setStatus('connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleHumeMessage(message);
        } catch (err) {
          console.error('Failed to parse Hume message:', err);
        }
      };

      wsRef.current.onerror = (err) => {
        console.error('Hume WebSocket error:', err);
        setError('Connection error');
        setStatus('error');
      };

      wsRef.current.onclose = () => {
        console.log('Hume WebSocket closed');
        setStatus('disconnected');
        cleanup();
      };

    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setStatus('error');
      cleanup();
    }
  }, []);

  const handleHumeMessage = useCallback((message: any) => {
    if (message.type === 'user_message' || message.type === 'assistant_message') {
      const content = message.message?.content || '';
      const role = message.type === 'user_message' ? 'user' : 'assistant';
      
      // Extract emotions
      const emotions: EmotionData[] = [];
      if (message.models?.prosody?.scores) {
        Object.entries(message.models.prosody.scores)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .forEach(([name, score]) => {
            emotions.push({ name, score: score as number });
          });
      }

      if (emotions.length > 0 && onEmotionUpdate) {
        onEmotionUpdate(emotions);
      }

      const newMessage: VoiceMessage = {
        id: `${Date.now()}-${role}`,
        role,
        content,
        timestamp: new Date(),
        emotions
      };

      setVoiceMessages(prev => {
        if (prev.some(m => m.content === content && m.role === role)) {
          return prev;
        }
        return [...prev, newMessage];
      });

      if (onTranscript && content) {
        onTranscript(content, role);
      }
    }
  }, [onEmotionUpdate, onTranscript]);

  const cleanup = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanup();
    setStatus('disconnected');
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Auto-connect if pre-obtained stream is provided and autoConnect is true
  useEffect(() => {
    if (autoConnect && preObtainedStream && status === 'disconnected') {
      connect();
    }
  }, [autoConnect, preObtainedStream, status, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-muted';
      case 'error': return 'bg-destructive';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Error';
    }
  };

  return (
    <Card className="flex flex-col h-full bg-card/50 backdrop-blur border-border/50">
      {/* Header with status */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
          <span className="text-sm font-medium">{getStatusText()}</span>
          {status === 'connected' && (
            <Badge variant="outline" className="text-xs">
              {formatDuration(callDuration)}
            </Badge>
          )}
        </div>
        <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">
          Hume EVI
        </Badge>
      </div>

      {/* Audio level indicators */}
      {status === 'connected' && (
        <div className="flex items-center gap-4 p-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2 flex-1">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-75"
                style={{ width: `${micLevel * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 bg-destructive/10 border-b border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {voiceMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
              {msg.emotions && msg.emotions.length > 0 && (
                <div className="flex gap-1 flex-wrap max-w-[85%]">
                  {msg.emotions.slice(0, 3).map((emotion) => (
                    <Badge
                      key={emotion.name}
                      variant="outline"
                      className="text-[10px] py-0"
                    >
                      {emotion.name}: {(emotion.score * 100).toFixed(0)}%
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
          {voiceMessages.length === 0 && status === 'connected' && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Start speaking to begin the conversation...
            </div>
          )}
          {status === 'disconnected' && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Click "Start Call" to begin voice chat
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-4 border-t border-border/50">
        {status === 'disconnected' || status === 'error' ? (
          <Button
            onClick={connect}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            <Phone className="h-5 w-5 mr-2" />
            Start Call
          </Button>
        ) : status === 'connecting' ? (
          <Button disabled size="lg">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Connecting...
          </Button>
        ) : (
          <>
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="icon"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              onClick={disconnect}
              variant="destructive"
              size="lg"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              End Call
            </Button>
            <Button
              variant={isAssistantMuted ? 'destructive' : 'secondary'}
              size="icon"
              onClick={() => setIsAssistantMuted(!isAssistantMuted)}
            >
              {isAssistantMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};

export default HumeVoiceChat;
