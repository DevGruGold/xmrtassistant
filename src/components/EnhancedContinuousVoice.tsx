import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, Square, Play, AlertCircle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrowserCompatibilityService } from '@/utils/browserCompatibility';

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
  const [browserSupported, setBrowserSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userInteracted, setUserInteracted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs for cleanup
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Browser compatibility check and logging
  useEffect(() => {
    console.group('🎤 Voice Component Initialization');
    BrowserCompatibilityService.logCapabilities();
    
    const capabilities = BrowserCompatibilityService.detectCapabilities();
    setBrowserSupported(capabilities.speechRecognition);
    
    if (!capabilities.speechRecognition) {
      const recommendations = BrowserCompatibilityService.getRecommendations();
      setErrorMessage(`Voice not supported. Try: ${recommendations.join(', ')}`);
      console.error('❌ Speech Recognition not available');
    } else {
      console.log('✅ Voice features initialized');
    }
    console.groupEnd();
  }, []);

  // Speech recognition setup
  useEffect(() => {
    if (!browserSupported) {
      console.warn('⚠️ Skipping speech recognition setup - not supported');
      return;
    }

    console.log('🔧 Setting up Speech Recognition...');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      console.log('🎯 Speech recognition result:', event.results.length, 'results');
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        console.log(`📝 Result ${i}:`, transcript, `(confidence: ${confidence})`);
        
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        console.log('✅ Final transcript:', final);
        setFinalTranscript(prev => prev + final);
        onTranscript(final, true);
        resetSilenceTimer();
        setRetryCount(0); // Reset retry count on success
      } else if (interim) {
        console.log('⏳ Interim transcript:', interim);
        resetSilenceTimer();
      }
    };

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error, event);
      
      switch (event.error) {
        case 'not-allowed':
          setHasPermission(false);
          setErrorMessage('Microphone permission denied. Please allow access.');
          break;
        case 'no-speech':
          console.log('ℹ️ No speech detected');
          break;
        case 'audio-capture':
          setErrorMessage('Audio capture failed. Check microphone connection.');
          break;
        case 'network':
          setErrorMessage('Network error. Check internet connection.');
          break;
        default:
          setErrorMessage(`Voice error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('🔄 Speech recognition ended');
      
      if (isListening && !isSpeaking && hasPermission && retryCount < 3) {
        // Restart recognition if we're still supposed to be listening
        try {
          console.log('🔄 Restarting speech recognition...');
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              recognition.start();
              setRetryCount(prev => prev + 1);
            }
          }, 100);
        } catch (error) {
          console.error('❌ Failed to restart recognition:', error);
          setRetryCount(prev => prev + 1);
          if (retryCount >= 2) {
            setErrorMessage('Voice recognition failed multiple times. Try refreshing.');
          }
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isListening, isSpeaking, hasPermission, retryCount, onTranscript]);

  // Silence detection
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    silenceTimerRef.current = setTimeout(() => {
      if (finalTranscript.trim()) {
        console.log('⏰ Processing transcript after silence:', finalTranscript.trim());
        // Process accumulated transcript after silence
        onTranscript(finalTranscript.trim(), true);
        setFinalTranscript('');
        setInterimTranscript('');
      }
    }, 1000); // Reduced to 1 second for better responsiveness
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

  // User gesture handler
  const handleUserGesture = useCallback(() => {
    setUserInteracted(true);
    console.log('👆 User interaction detected');
  }, []);

  // Start listening with enhanced logging and error handling
  const startListening = async () => {
    if (!browserSupported) {
      console.warn('❌ Cannot start - browser not supported');
      setErrorMessage('Speech recognition not supported in this browser');
      return;
    }

    if (!userInteracted && BrowserCompatibilityService.detectCapabilities().userGestureRequired) {
      console.warn('⚠️ User gesture required before starting voice');
      setErrorMessage('Click the microphone to enable voice features');
      return;
    }

    console.log('🚀 Starting voice capture...');
    
    try {
      setErrorMessage(''); // Clear previous errors
      
      // Request microphone access
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('✅ Microphone access granted');
      streamRef.current = stream;
      setHasPermission(true);

      // Set up audio analysis
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Handle suspended audio context (common on mobile)
      if (audioContext.state === 'suspended') {
        console.log('🔄 Resuming audio context...');
        await audioContext.resume();
      }
      
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start audio level monitoring
      updateAudioLevel();

      // Start speech recognition with better error handling
      if (recognitionRef.current) {
        console.log('🎯 Starting speech recognition...');
        try {
          recognitionRef.current.start();
          console.log('✅ Speech recognition started successfully');
        } catch (error) {
          console.error('❌ Failed to start speech recognition:', error);
          if (error.name === 'InvalidStateError') {
            console.log('ℹ️ Recognition already active, continuing...');
          } else {
            throw error;
          }
        }
      } else {
        console.error('❌ No speech recognition instance available');
        throw new Error('Speech recognition not available');
      }

      setIsListening(true);
      setRetryCount(0);
      console.log('✅ Voice capture started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      
      if (error.name === 'NotAllowedError') {
        setHasPermission(false);
        setErrorMessage('Microphone access denied. Please allow microphone permissions.');
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('No microphone found. Please connect a microphone.');
      } else {
        setErrorMessage(`Failed to start voice: ${error.message}`);
      }
    }
  };

  // Stop listening with enhanced logging
  const stopListening = () => {
    console.log('🛑 Stopping voice capture...');
    setIsListening(false);

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('✅ Speech recognition stopped');
      } catch (error) {
        console.error('⚠️ Error stopping recognition:', error);
      }
    }

    // Process any remaining transcript
    if (finalTranscript.trim()) {
      console.log('📝 Processing final transcript:', finalTranscript.trim());
      onTranscript(finalTranscript.trim(), true);
      setFinalTranscript('');
    }
    setInterimTranscript('');

    // Clean up audio resources
    cleanup();
    console.log('✅ Voice capture stopped and cleaned up');
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

  // Auto-listen effect - Fixed to actually start listening
  useEffect(() => {
    console.log('🔄 Auto-listen effect triggered:', { autoListen, disabled, isListening, browserSupported, hasPermission });
    
    if (autoListen && !disabled && !isListening && browserSupported) {
      console.log('🚀 Auto-starting voice capture...');
      startListening();
    }

    return () => {
      cleanup();
    };
  }, [autoListen, disabled, browserSupported]); // Removed isListening from deps to prevent loop

  // Sync with external listening state - Fixed logic
  useEffect(() => {
    console.log('🔗 External listening state sync:', { externalListening, isListening, disabled });
    
    if (externalListening !== undefined) {
      if (externalListening && !isListening && !disabled && browserSupported) {
        console.log('📡 Starting listening from external state...');
        startListening();
      } else if (!externalListening && isListening) {
        console.log('📡 Stopping listening from external state...');
        stopListening();
      }
    }
  }, [externalListening, disabled, browserSupported]); // Removed isListening from deps

  // Toggle listening with user gesture handling - Enhanced logging
  const toggleListening = () => {
    console.log('🎯 Toggle listening clicked:', { isListening, browserSupported, hasPermission });
    handleUserGesture(); // Mark user interaction
    
    if (isListening) {
      console.log('🛑 User requested stop listening');
      stopListening();
    } else {
      console.log('🚀 User requested start listening');
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

  const capabilities = BrowserCompatibilityService.detectCapabilities();

  return (
    <div className={cn(
      "p-3 sm:p-6 bg-gradient-to-b from-background to-secondary/20", 
      capabilities.isMobile ? "min-h-[200px]" : "min-h-[280px]", // Reduced mobile height
      className
    )}>
      {/* Error Display */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{errorMessage}</span>
        </div>
      )}

      {/* Browser Support Warning */}
      {!browserSupported && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-600">Voice Not Supported</span>
          </div>
          <div className="text-xs text-yellow-600/80 space-y-1">
            {BrowserCompatibilityService.getRecommendations().map((rec, i) => (
              <div key={i}>• {rec}</div>
            ))}
          </div>
        </div>
      )}

      {/* Status Header - Compact for mobile */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full ${getStatusColor()} ${
            isListening ? 'animate-pulse' : ''
          }`} />
          <Badge variant="outline" className="text-xs sm:text-sm">
            {getStatusText()}
          </Badge>
          {capabilities.isMobile && (
            <Badge variant="secondary" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" />
              Mobile
            </Badge>
          )}
        </div>

        {!hasPermission && browserSupported && (
          <Badge variant="destructive" className="text-xs">
            Microphone Required
          </Badge>
        )}
      </div>

      {/* Main Voice Interface - Responsive sizing */}
      <div className="flex flex-col items-center space-y-3 sm:space-y-6">
        {/* Central Microphone Button - Smaller on mobile */}
        <div className="relative">
          <Button
            onClick={toggleListening}
            disabled={disabled || !browserSupported}
            size={capabilities.isMobile ? "default" : "lg"}
            variant={isListening ? "default" : "outline"}
            className={cn(
              "rounded-full p-0 transition-all duration-300",
              capabilities.isMobile ? "h-14 w-14" : "h-20 w-20", // Responsive sizing
              isListening && "scale-110 shadow-lg shadow-primary/50",
              isSpeaking && "animate-pulse",
              !browserSupported && "opacity-50 cursor-not-allowed"
            )}
          >
            {isListening ? (
              <Square className={capabilities.isMobile ? "h-6 w-6" : "h-8 w-8"} />
            ) : (
              <Mic className={capabilities.isMobile ? "h-6 w-6" : "h-8 w-8"} />
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

        {/* Live Transcript Display - Compact for mobile */}
        {(isListening || finalTranscript || interimTranscript) && (
          <Card className="w-full max-w-2xl p-2 sm:p-4 bg-muted/50">
            <div className={cn(
              "overflow-y-auto",
              capabilities.isMobile ? "min-h-[50px] max-h-[80px]" : "min-h-[80px] max-h-[120px]"
            )}>
              {finalTranscript && (
                <div className="text-xs sm:text-sm text-foreground mb-1 sm:mb-2">
                  <strong>Final:</strong> {finalTranscript}
                </div>
              )}
              {interimTranscript && (
                <div className="text-xs sm:text-sm text-muted-foreground italic">
                  <strong>Interim:</strong> {interimTranscript}
                </div>
              )}
              {!finalTranscript && !interimTranscript && isListening && (
                <div className="text-xs sm:text-sm text-muted-foreground italic">
                  Start speaking...
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Audio Level Bars - Responsive sizing */}
        {isListening && (
          <div className="flex items-center gap-1">
            {[...Array(capabilities.isMobile ? 8 : 12)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "bg-primary/30 rounded-full transition-all duration-150",
                  capabilities.isMobile ? "w-0.5" : "w-1",
                  audioLevel * (capabilities.isMobile ? 8 : 12) > i 
                    ? capabilities.isMobile ? 'h-4 bg-primary' : 'h-8 bg-primary' 
                    : 'h-1 sm:h-2'
                )}
              />
            ))}
          </div>
        )}

        {/* Instructions - Responsive text */}
        {!isListening && (
          <div className="text-center text-xs sm:text-sm text-muted-foreground max-w-md px-4">
            {!browserSupported ? (
              <div className="space-y-2">
                <p className="font-medium text-yellow-600">Voice features not available</p>
                <p className="text-xs">Use Chrome, Safari, or Edge for voice support</p>
              </div>
            ) : !userInteracted && capabilities.userGestureRequired ? (
              <div className="space-y-2">
                <p className="font-medium">Click to enable voice</p>
                <p className="text-xs opacity-70">User interaction required for microphone access</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className={capabilities.isMobile ? "text-xs" : "text-sm"}>
                  {pushToTalk 
                    ? "Press and hold the microphone to speak" 
                    : "Click the microphone to start voice conversation"}
                </p>
                <p className="text-xs opacity-70">
                  {capabilities.isMobile 
                    ? "Voice processed after you stop speaking" 
                    : "Voice input will be processed automatically after you stop speaking"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedContinuousVoice;