import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Smartphone, Loader2, AlertCircle, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SimplifiedVoiceService } from '@/services/simplifiedVoiceService';
import { mobilePermissionService } from '@/services/mobilePermissionService';
import { MobileVoiceFallback } from './MobileVoiceFallback';

interface MobilePushToTalkProps {
  onTranscript: (text: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  className?: string;
}

export const MobilePushToTalk: React.FC<MobilePushToTalkProps> = ({
  onTranscript,
  isProcessing = false,
  disabled = false,
  className = ''
}) => {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'requesting'>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [showFallback, setShowFallback] = useState(false);

  // Initialize permission service and check support
  useEffect(() => {
    const status = mobilePermissionService.getStatus();
    if (!status.isSupported || !SimplifiedVoiceService.isSupported()) {
      setShowFallback(true);
      setError('Voice not supported on this device');
    }
  }, []);

  const requestPermissions = async () => {
    setPermissionStatus('requesting');
    setError(null);

    try {
      const result = await SimplifiedVoiceService.initialize();
      
      if (result.success) {
        setPermissionStatus('granted');
        return true;
      } else {
        setPermissionStatus('denied');
        setError(result.error || 'Permission denied');
        setShowFallback(true);
        return false;
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      setPermissionStatus('denied');
      setError('Failed to access microphone');
      setShowFallback(true);
      return false;
    }
  };

  const startRecording = async () => {
    if (isRecording || isProcessing || disabled) return;

    // Request permissions if not granted
    if (permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    setError(null);
    setTranscript('');

    try {
      const result = await SimplifiedVoiceService.startListening(
        (voiceResult) => {
          setTranscript(voiceResult.text);
          
          if (voiceResult.isFinal) {
            onTranscript(voiceResult.text.trim());
            setTranscript('');
            setIsRecording(false);
          }
        },
        (errorMessage) => {
          setError(errorMessage);
          setIsRecording(false);
        }
      );

      if (result.success) {
        setIsRecording(true);
      } else {
        setError(result.error || 'Failed to start recording');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to start voice recording');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    SimplifiedVoiceService.stopListening();
    setIsRecording(false);
  };

  const handleButtonPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getButtonIcon = () => {
    if (permissionStatus === 'requesting') {
      return <Loader2 className="h-6 w-6 animate-spin" />;
    }
    if (isRecording) {
      return <Mic className="h-6 w-6 text-destructive animate-pulse" />;
    }
    if (permissionStatus === 'denied' || error) {
      return <MicOff className="h-6 w-6" />;
    }
    return <Mic className="h-6 w-6" />;
  };

  const getButtonText = () => {
    if (permissionStatus === 'requesting') return 'Setting up...';
    if (isRecording) return 'Release to send';
    if (permissionStatus === 'denied') return 'Permission needed';
    if (permissionStatus === 'unknown') return 'Tap to speak';
    return 'Hold to speak';
  };

  const getStatusBadge = () => {
    const status = mobilePermissionService.getStatus();
    
    if (error) {
      return <Badge variant="destructive" className="text-xs">Error</Badge>;
    }
    if (isRecording) {
      return <Badge variant="default" className="text-xs animate-pulse">Listening</Badge>;
    }
    if (permissionStatus === 'granted') {
      return <Badge variant="default" className="text-xs">Ready</Badge>;
    }
    if (status.isMobile) {
      return <Badge variant="outline" className="text-xs">Mobile</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Tap to enable</Badge>;
  };

  // Show fallback if voice is not supported or permission denied
  if (showFallback) {
    return (
      <MobileVoiceFallback
        onSubmit={onTranscript}
        isProcessing={isProcessing}
        disabled={disabled}
        className={className}
        placeholder="Voice not available - type your message..."
      />
    );
  }

  return (
    <Card className={cn("p-4 bg-card/50 border-primary/20", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Voice Input</span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* Browser instructions */}
      {permissionStatus !== 'granted' && !error && (
        <div className="mb-3 p-2 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            {mobilePermissionService.getBrowserSpecificInstructions().map((instruction, index) => (
              <div key={index}>• {instruction}</div>
            ))}
          </div>
        </div>
      )}

      {/* Main push-to-talk button */}
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={handleButtonPress}
          disabled={disabled || isProcessing || permissionStatus === 'requesting'}
          size="lg"
          className={cn(
            "h-16 w-16 rounded-full transition-all duration-200",
            isRecording 
              ? "bg-destructive hover:bg-destructive/90 animate-pulse" 
              : "bg-primary hover:bg-primary/90"
          )}
        >
          {getButtonIcon()}
        </Button>
        
        <div className="text-center">
          <div className="text-sm font-medium text-foreground">
            {getButtonText()}
          </div>
          {transcript && (
            <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
              "{transcript}"
            </div>
          )}
        </div>
      </div>

      {/* Fallback option */}
      <div className="mt-4 pt-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFallback(true)}
          className="w-full text-xs"
        >
          Use text input instead
        </Button>
      </div>
    </Card>
  );
};

export default MobilePushToTalk;