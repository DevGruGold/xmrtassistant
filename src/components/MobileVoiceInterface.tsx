import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Mic, Type, Settings, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SimplifiedVoiceService } from '@/services/simplifiedVoiceService';
import { mobilePermissionService } from '@/services/mobilePermissionService';
import { MobilePushToTalk } from './MobilePushToTalk';
import { MobileVoiceFallback } from './MobileVoiceFallback';

interface MobileVoiceInterfaceProps {
  onTranscript: (text: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  className?: string;
}

type VoiceMode = 'auto' | 'push-to-talk' | 'text-only';

export const MobileVoiceInterface: React.FC<MobileVoiceInterfaceProps> = ({
  onTranscript,
  isProcessing = false,
  disabled = false,
  className = ''
}) => {
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('auto');
  const [permissionStatus, setPermissionStatus] = useState(mobilePermissionService.getStatus());
  const [showSetup, setShowSetup] = useState(false);

  // Update permission status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPermissionStatus(mobilePermissionService.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      SimplifiedVoiceService.cleanup();
    };
  }, []);

  // Auto-determine best mode based on capabilities
  useEffect(() => {
    const status = mobilePermissionService.getStatus();
    const voiceSupported = SimplifiedVoiceService.isSupported();
    
    if (!status.isSupported || !voiceSupported) {
      setVoiceMode('text-only');
    } else if (status.isMobile && status.browserType === 'safari') {
      // Safari iOS works better with push-to-talk
      setVoiceMode('push-to-talk');
    } else if (status.isMobile) {
      // Android Chrome works with both
      setVoiceMode('push-to-talk');
    }
  }, []);

  const getModeIcon = (mode: VoiceMode) => {
    switch (mode) {
      case 'push-to-talk': return <Mic className="h-4 w-4" />;
      case 'text-only': return <Type className="h-4 w-4" />;
      default: return <Smartphone className="h-4 w-4" />;
    }
  };

  const getModeLabel = (mode: VoiceMode) => {
    switch (mode) {
      case 'push-to-talk': return 'Voice';
      case 'text-only': return 'Text';
      default: return 'Auto';
    }
  };

  const getBrowserWarning = () => {
    if (permissionStatus.browserType === 'safari' && permissionStatus.isMobile) {
      return 'Safari iOS has limited voice support. Push-to-talk works best.';
    }
    if (!permissionStatus.isSupported || !SimplifiedVoiceService.isSupported()) {
      return 'Voice features not supported in this browser.';
    }
    return null;
  };

  const renderVoiceInterface = () => {
    switch (voiceMode) {
      case 'push-to-talk':
        return (
          <MobilePushToTalk
            onTranscript={onTranscript}
            isProcessing={isProcessing}
            disabled={disabled}
          />
        );
      
      case 'text-only':
        return (
          <MobileVoiceFallback
            onSubmit={onTranscript}
            isProcessing={isProcessing}
            disabled={disabled}
            placeholder="Type your message..."
          />
        );
      
      default:
        // Auto mode - choose best option
        if (SimplifiedVoiceService.isSupported() && permissionStatus.isSupported) {
          return (
            <MobilePushToTalk
              onTranscript={onTranscript}
              isProcessing={isProcessing}
              disabled={disabled}
            />
          );
        } else {
          return (
            <MobileVoiceFallback
              onSubmit={onTranscript}
              isProcessing={isProcessing}
              disabled={disabled}
              placeholder="Type your message..."
            />
          );
        }
    }
  };

  const browserWarning = getBrowserWarning();

  return (
    <div className={cn("space-y-3", className)}>
      {/* Browser warning */}
      {browserWarning && (
        <Card className="p-3 bg-orange-500/10 border-orange-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-800 dark:text-orange-200">
              {browserWarning}
            </span>
          </div>
        </Card>
      )}

      {/* Mode selector */}
      <Card className="p-3 bg-card/50 border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Input Method</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {permissionStatus.browserType}
            </Badge>
            {permissionStatus.isMobile && (
              <Badge variant="outline" className="text-xs">
                Mobile
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(['push-to-talk', 'text-only'] as const).map((mode) => (
            <Button
              key={mode}
              onClick={() => setVoiceMode(mode)}
              variant={voiceMode === mode ? "default" : "ghost"}
              size="sm"
              className="flex-1 text-xs gap-2"
              disabled={mode === 'push-to-talk' && (!permissionStatus.isSupported || !SimplifiedVoiceService.isSupported())}
            >
              {getModeIcon(mode)}
              {getModeLabel(mode)}
            </Button>
          ))}
        </div>
      </Card>

      {/* Browser info and recommendations */}
      {permissionStatus.isMobile && (
        <Card className="p-3 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <div className="font-medium">Mobile Voice Tips:</div>
              <div className="text-xs space-y-1">
                {mobilePermissionService.getBrowserSpecificInstructions().map((instruction, index) => (
                  <div key={index}>• {instruction}</div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Voice interface */}
      {renderVoiceInterface()}
    </div>
  );
};

export default MobileVoiceInterface;