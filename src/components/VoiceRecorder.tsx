import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onAudioCapture: (audioBlob: Blob, transcript?: string) => void;
  isRecording?: boolean;
  className?: string;
}

export const VoiceRecorder = ({ onAudioCapture, isRecording: externalRecording, className }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      speechRecognitionRef.current = new SpeechRecognition();
      speechRecognitionRef.current.continuous = true;
      speechRecognitionRef.current.interimResults = true;
      speechRecognitionRef.current.lang = 'en-US';
      
      speechRecognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const updateAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average / 255);
    
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      updateAudioLevel();
      
      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: Blob[] = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        onAudioCapture(audioBlob, transcript);
        setTranscript('');
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start speech recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.start();
      }
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
      
      // Stop speech recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      
      // Clean up
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      setIsRecording(false);
      setAudioLevel(0);
      setRecordingTime(0);
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const recording = externalRecording ?? isRecording;

  return (
    <div className={cn("flex flex-col items-center space-y-3", className)}>
      <div className="flex items-center space-x-3">
        <Button
          onClick={recording ? stopRecording : startRecording}
          disabled={isProcessing}
          variant={recording ? "destructive" : "default"}
          size="lg"
          className={cn(
            "relative overflow-hidden transition-all duration-300",
            recording && "animate-pulse"
          )}
        >
          {recording ? (
            <Square className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
          {recording ? 'Stop Recording' : 'Start Recording'}
          
          {/* Audio level indicator */}
          {recording && (
            <div 
              className="absolute bottom-0 left-0 bg-white/30 transition-all duration-100"
              style={{ 
                width: `${audioLevel * 100}%`,
                height: '2px'
              }}
            />
          )}
        </Button>
        
        {recording && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>
      
      {/* Audio level visualization */}
      {recording && (
        <div className="flex space-x-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1 bg-primary rounded-full transition-all duration-100",
                audioLevel * 20 > i ? 'h-6' : 'h-2'
              )}
            />
          ))}
        </div>
      )}
      
      {/* Live transcript */}
      {transcript && recording && (
        <div className="max-w-sm p-2 bg-secondary rounded-lg text-sm text-center">
          <div className="text-xs text-muted-foreground mb-1">Live Transcript:</div>
          <div className="italic">{transcript}</div>
        </div>
      )}
    </div>
  );
};