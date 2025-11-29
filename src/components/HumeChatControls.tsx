import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { HumeMode } from './MakeMeHumanToggle';
import VoiceRecordingIndicator from './VoiceRecordingIndicator';
import VideoPreviewOverlay from './VideoPreviewOverlay';

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
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [topEmotions, setTopEmotions] = useState<{ name: string; score: number }[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Determine what to show
  const showControls = mode !== 'tts' && isEnabled;
  const showMic = (mode === 'voice' || mode === 'multimodal') && isEnabled;
  const showVideo = mode === 'multimodal' && isEnabled;

  // Audio level monitoring - only runs when recording
  useEffect(() => {
    if (!isRecording || !audioStream || !showControls) {
      setAudioLevel(0);
      return;
    }

    let audioContext: AudioContext | null = null;
    
    try {
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(audioStream);
      const analyzer = audioContext.createAnalyser();
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
      if (audioContext) {
        audioContext.close();
      }
      analyzerRef.current = null;
    };
  }, [isRecording, audioStream, showControls]);

  const startRecording = useCallback(async () => {
    if (!audioStream) {
      console.error('No audio stream available');
      return;
    }

    setIsConnecting(true);
    
    try {
      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          try {
            const { data, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: base64Audio }
            });
            
            if (error) throw error;
            
            if (data?.text) {
              setCurrentTranscript(data.text);
              onVoiceInput(data.text);
            }
          } catch (err) {
            console.error('Transcription error:', err);
          }
        };
        reader.readAsDataURL(audioBlob);
      };
      
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setCurrentTranscript('');
    } catch (error) {
      console.error('Failed to start recording:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [audioStream, onVoiceInput]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, stopRecording, startRecording]);

  const toggleVideo = useCallback(() => {
    setIsVideoActive(prev => !prev);
  }, []);

  const handleEmotionDetected = useCallback((emotions: { name: string; score: number }[]) => {
    setTopEmotions(emotions.slice(0, 3));
    onEmotionUpdate?.(emotions);
  }, [onEmotionUpdate]);

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
          onStop={stopRecording}
        />
      )}

      {/* Video Preview Overlay */}
      {isVideoActive && videoStream && (
        <VideoPreviewOverlay
          videoStream={videoStream}
          onClose={() => setIsVideoActive(false)}
          onEmotionDetected={handleEmotionDetected}
          emotions={topEmotions}
        />
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
            isRecording && "animate-pulse ring-2 ring-destructive ring-offset-2 ring-offset-background"
          )}
          title={isRecording ? "Stop recording" : "Start voice input"}
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

      {/* Emotion badges when video is active */}
      {isVideoActive && topEmotions.length > 0 && (
        <div className="hidden sm:flex items-center gap-1">
          {topEmotions.map((emotion) => (
            <span 
              key={emotion.name}
              className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30"
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
