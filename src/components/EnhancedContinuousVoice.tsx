import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, Square, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedContinuousVoiceProps {
  onTranscript: (transcript: string, isFinal?: boolean) => void;
  isListening?: boolean;
  isProcessing?: boolean;
  isSpeaking?: boolean;
  disabled?: boolean;
  className?: string;
  autoListen?: boolean; // Automatically start listening when component mounts
  pushToTalk?: boolean; // Enable push-to-talk mode
}

export const EnhancedContinuousVoice = ({
  onTranscript,
  isListening: externalListening,
  isProcessing = false,
  isSpeaking = false,
  disabled = false,
  className = '',
  autoListen = false,
  pushToTalk = false
}: EnhancedContinuousVoiceProps) => {
  // Core state
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);

  // Refs for cleanup
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Speech recognition setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        setFinalTranscript(prev => prev + final);
        onTranscript(final, true);
        resetSilenceTimer();
      } else if (interim) {
        resetSilenceTimer();
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setHasPermission(false);
      }
    };

    recognition.onend = () => {
      if (isListening && !isSpeaking && hasPermission) {
        // Restart recognition if we're still supposed to be listening
        try {
          recognition.start();
        } catch (error) {
          console.error('Failed to restart recognition:', error);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isListening, isSpeaking, hasPermission, onTranscript]);

  // Silence detection
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    silenceTimerRef.current = setTimeout(() => {
      if (finalTranscript.trim()) {
        // Process accumulated transcript after silence
        onTranscript(finalTranscript.trim(), true);
        setFinalTranscript('');
        setInterimTranscript('');
      }
    }, 2000); // 2 second silence threshold
  }, [finalTranscript, onTranscript]);

  // Audio level monitoring
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || isSpeaking) {
      setAudioLevel(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }

    const average = sum / dataArray.length;
    const normalizedLevel = Math.min(average / 50, 1); // Normalize to 0-1
    setAudioLevel(normalizedLevel);

    // Contribute to silence detection
    if (normalizedLevel < 0.1) {
      resetSilenceTimer();
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, [isSpeaking, resetSilenceTimer]);

  // Start listening
  const startListening = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);

      // Set up audio analysis
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start audio level monitoring
      updateAudioLevel();

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      setIsListening(true);
    } catch (error) {
      console.error('Failed to start listening:', error);
      setHasPermission(false);
    }
  };

  // Stop listening
  const stopListening = () => {
    setIsListening(false);

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Process any remaining transcript
    if (finalTranscript.trim()) {
      onTranscript(finalTranscript.trim(), true);
      setFinalTranscript('');
    }
    setInterimTranscript('');

    // Clean up audio resources
    cleanup();
  };

  // Cleanup function
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevel(0);
  };

  // Auto-listen effect
  useEffect(() => {
    if (autoListen && !disabled && !isListening) {
      startListening();
    }

    return () => {
      cleanup();
    };
  }, [autoListen, disabled]);

  // Sync with external listening state
  useEffect(() => {
    if (externalListening !== undefined) {
      if (externalListening && !isListening && !disabled) {
        startListening();
      } else if (!externalListening && isListening) {
        stopListening();
      }
    }
  }, [externalListening]);

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Get current status
  const getStatus = () => {
    if (disabled) return 'disabled';
    if (isSpeaking) return 'speaking';
    if (isProcessing) return 'processing';
    if (isListening) return 'listening';
    return 'ready';
  };

  const getStatusColor = () => {
    switch (getStatus()) {
      case 'listening': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'speaking': return 'bg-blue-500';
      case 'disabled': return 'bg-gray-300';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (getStatus()) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'speaking': return 'Eliza Speaking';
      case 'disabled': return 'Voice Disabled';
      default: return 'Ready to Listen';
    }
  };

  return (
    <div className={cn("p-6 bg-gradient-to-b from-background to-secondary/20", className)}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${getStatusColor()} ${
            isListening ? 'animate-pulse' : ''
          }`} />
          <Badge variant="outline" className="text-sm">
            {getStatusText()}
          </Badge>
        </div>

        {!hasPermission && (
          <Badge variant="destructive" className="text-xs">
            Microphone Permission Required
          </Badge>
        )}
      </div>

      {/* Main Voice Interface */}
      <div className="flex flex-col items-center space-y-6">
        {/* Central Microphone Button */}
        <div className="relative">
          <Button
            onClick={toggleListening}
            disabled={disabled || (!hasPermission && !isListening)}
            size="lg"
            variant={isListening ? "default" : "outline"}
            className={cn(
              "h-20 w-20 rounded-full p-0 transition-all duration-300",
              isListening && "scale-110 shadow-lg shadow-primary/50",
              isSpeaking && "animate-pulse"
            )}
          >
            {isListening ? (
              <Square className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>

          {/* Audio level indicator ring */}
          {isListening && (
            <div 
              className="absolute inset-0 rounded-full border-4 border-primary/30 transition-transform duration-150"
              style={{
                transform: `scale(${1 + audioLevel * 0.3})`,
                borderWidth: `${2 + audioLevel * 6}px`
              }}
            />
          )}
        </div>

        {/* Live Transcript Display */}
        {(isListening || finalTranscript || interimTranscript) && (
          <Card className="w-full max-w-2xl p-4 bg-muted/50">
            <div className="min-h-[80px] max-h-[120px] overflow-y-auto">
              {finalTranscript && (
                <div className="text-sm text-foreground mb-2">
                  <strong>Final:</strong> {finalTranscript}
                </div>
              )}
              {interimTranscript && (
                <div className="text-sm text-muted-foreground italic">
                  <strong>Interim:</strong> {interimTranscript}
                </div>
              )}
              {!finalTranscript && !interimTranscript && isListening && (
                <div className="text-sm text-muted-foreground italic">
                  Start speaking...
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Audio Level Bars */}
        {isListening && (
          <div className="flex items-center gap-1">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 bg-primary/30 rounded-full transition-all duration-150",
                  audioLevel * 12 > i ? 'h-8 bg-primary' : 'h-2'
                )}
              />
            ))}
          </div>
        )}

        {/* Instructions */}
        {!isListening && (
          <div className="text-center text-sm text-muted-foreground max-w-md">
            <p className="mb-2">
              {pushToTalk 
                ? "Press and hold the microphone to speak" 
                : "Click the microphone to start a fluid conversation"}
            </p>
            <p className="text-xs opacity-70">
              Voice input will be processed automatically after you stop speaking
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedContinuousVoice;