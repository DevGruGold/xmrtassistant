import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Loader2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HumeMode } from './MakeMeHumanToggle';
import VoiceRecordingIndicator from './VoiceRecordingIndicator';
import VideoPreviewOverlay from './VideoPreviewOverlay';
import { voiceStreamingService, VoiceEmotion } from '@/services/voiceStreamingService';

interface HumeChatControlsProps {
  mode: HumeMode;
  isEnabled: boolean;
  audioStream?: MediaStream | null;
  videoStream?: MediaStream | null;
  onVoiceInput: (transcript: string) => void;
  onEmotionUpdate?: (emotions: { name: string; score: number }[]) => void;
  className?: string;
}

export const HumeChatControls: React.FC<HumeChatControlsProps> = ({
  mode,
  isEnabled,
  audioStream,
  videoStream,
  onVoiceInput,
  onEmotionUpdate,
  className
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [topEmotions, setTopEmotions] = useState<{ name: string; score: number }[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);

  // Determine what to show
  const showControls = mode !== 'tts' && isEnabled;
  const showMic = (mode === 'voice' || mode === 'multimodal') && isEnabled;
  const showVideo = mode === 'multimodal' && isEnabled;

  // Audio level monitoring for visual feedback
  useEffect(() => {
    if (!isRecording || !audioStream || !showControls) {
      setAudioLevel(0);
      return;
    }

    try {
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(audioStream);
      const analyzer = audioContextRef.current.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyzerRef.current) return;
        analyzerRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (error) {
      console.error('Failed to setup audio analyzer:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      analyzerRef.current = null;
    };
  }, [isRecording, audioStream, showControls]);

  // Handle real-time transcript from voice streaming
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    console.log('🎤 Transcript received:', text, 'Final:', isFinal);
    setCurrentTranscript(text);
    
    // Send final transcripts to Eliza immediately
    if (isFinal && text.trim()) {
      onVoiceInput(text);
      setCurrentTranscript(''); // Clear after sending
    }
  }, [onVoiceInput]);

  // Handle voice emotions from streaming
  const handleVoiceEmotions = useCallback((emotions: VoiceEmotion[]) => {
    setTopEmotions(emotions.slice(0, 3));
    onEmotionUpdate?.(emotions);
  }, [onEmotionUpdate]);

  // Start real-time voice streaming
  const startStreaming = useCallback(async () => {
    if (!audioStream) {
      console.error('No audio stream available');
      setConnectionError('No microphone access');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      await voiceStreamingService.connect(audioStream, {
        onTranscript: handleTranscript,
        onEmotion: handleVoiceEmotions,
        onError: (error) => {
          console.error('Voice streaming error:', error);
          setConnectionError(error.message);
          setIsRecording(false);
          setIsConnected(false);
        },
        onConnected: () => {
          console.log('🎤 Voice streaming connected');
          setIsConnected(true);
          setIsRecording(true);
          setConnectionError(null);
        },
        onDisconnected: () => {
          console.log('🎤 Voice streaming disconnected');
          setIsConnected(false);
          setIsRecording(false);
        }
      });
    } catch (error) {
      console.error('Failed to start voice streaming:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  }, [audioStream, handleTranscript, handleVoiceEmotions]);

  // Stop voice streaming
  const stopStreaming = useCallback(() => {
    voiceStreamingService.disconnect();
    setIsRecording(false);
    setIsConnected(false);
    setAudioLevel(0);
    setCurrentTranscript('');
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording || isConnected) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }, [isRecording, isConnected, stopStreaming, startStreaming]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    setIsVideoActive(prev => !prev);
  }, []);

  // Handle facial emotions from video preview
  const handleFacialEmotions = useCallback((emotions: { name: string; score: number }[]) => {
    // Merge with voice emotions if available, prioritizing facial for primary display
    const mergedEmotions = [...emotions];
    
    // Add voice emotions that aren't already in facial emotions
    topEmotions.forEach(voiceEmotion => {
      if (!mergedEmotions.find(e => e.name === voiceEmotion.name)) {
        mergedEmotions.push(voiceEmotion);
      }
    });
    
    setTopEmotions(mergedEmotions.slice(0, 5));
    onEmotionUpdate?.(mergedEmotions);
  }, [topEmotions, onEmotionUpdate]);

  // Don't render anything if controls shouldn't show
  if (!showControls) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Voice Recording Indicator */}
      {isRecording && (
        <VoiceRecordingIndicator 
          audioLevel={audioLevel}
          transcript={currentTranscript}
          onStop={stopStreaming}
        />
      )}

      {/* Video Preview Overlay */}
      {isVideoActive && videoStream && (
        <VideoPreviewOverlay
          videoStream={videoStream}
          onClose={() => setIsVideoActive(false)}
          onEmotionDetected={handleFacialEmotions}
          emotions={topEmotions}
        />
      )}

      {/* Connection Status Indicator */}
      {isConnected && (
        <div className="flex items-center gap-1 text-xs text-green-500">
          <Radio className="h-3 w-3 animate-pulse" />
          <span>Live</span>
        </div>
      )}

      {/* Connection Error */}
      {connectionError && (
        <span className="text-xs text-destructive max-w-32 truncate" title={connectionError}>
          {connectionError}
        </span>
      )}

      {/* Mic Button */}
      {showMic && (
        <Button
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          onClick={toggleRecording}
          disabled={isConnecting || !audioStream}
          className={cn(
            "h-10 w-10 rounded-full transition-all",
            isRecording && "animate-pulse ring-2 ring-destructive ring-offset-2 ring-offset-background",
            isConnected && "ring-2 ring-green-500 ring-offset-2 ring-offset-background"
          )}
          title={isRecording ? "Stop recording" : "Start voice input (real-time)"}
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Video Button */}
      {showVideo && (
        <Button
          variant={isVideoActive ? "default" : "outline"}
          size="icon"
          onClick={toggleVideo}
          disabled={!videoStream}
          className={cn(
            "h-10 w-10 rounded-full transition-all",
            isVideoActive && "bg-purple-600 hover:bg-purple-700"
          )}
          title={isVideoActive ? "Stop video" : "Start video"}
        >
          {isVideoActive ? (
            <VideoOff className="h-4 w-4" />
          ) : (
            <Video className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Emotion badges when active */}
      {(isRecording || isVideoActive) && topEmotions.length > 0 && (
        <div className="hidden sm:flex items-center gap-1">
          {topEmotions.slice(0, 3).map((emotion) => (
            <span 
              key={emotion.name}
              className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30"
              title={`${Math.round(emotion.score * 100)}% confidence`}
            >
              {emotion.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default HumeChatControls;
