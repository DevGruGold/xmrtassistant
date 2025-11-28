import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, Brain, Mic, Volume2, Camera, Layers, 
  Phone, Settings, Loader2 
} from 'lucide-react';
import { humanizedTTS } from '@/services/humanizedTTSService';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export type HumeMode = 'tts' | 'voice' | 'multimodal';

interface MakeMeHumanToggleProps {
  onModeChange?: (mode: HumeMode, enabled: boolean) => void;
  className?: string;
}

interface HumeSettings {
  autoConnect: boolean;
  emotionSensitivity: number;
  showEmotions: boolean;
  captureInterval: number;
}

const DEFAULT_SETTINGS: HumeSettings = {
  autoConnect: false,
  emotionSensitivity: 0.5,
  showEmotions: true,
  captureInterval: 1500,
};

export const MakeMeHumanToggle: React.FC<MakeMeHumanToggleProps> = ({ 
  onModeChange,
  className = ''
}) => {
  const [mode, setMode] = useState<HumeMode>('tts');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [settings, setSettings] = useState<HumeSettings>(DEFAULT_SETTINGS);
  const { toast } = useToast();

  // Restore mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('humeMode') as HumeMode | null;
    const savedEnabled = localStorage.getItem('humeEnabled') === 'true';
    const savedSettings = localStorage.getItem('humeSettings');

    if (savedMode) setMode(savedMode);
    if (savedEnabled) {
      setIsEnabled(true);
      humanizedTTS.restoreMode();
    }
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse Hume settings:', e);
      }
    }
  }, []);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('humeSettings', JSON.stringify(settings));
  }, [settings]);

  const handleModeChange = async (newMode: HumeMode) => {
    setMode(newMode);
    localStorage.setItem('humeMode', newMode);
    
    if (isEnabled) {
      onModeChange?.(newMode, true);
    }
  };

  const handleToggleEnabled = async () => {
    if (isEnabled) {
      // Disable
      setIsEnabled(false);
      localStorage.setItem('humeEnabled', 'false');
      humanizedTTS.disableHumanizedMode();
      onModeChange?.(mode, false);
      toast({
        title: "Hume AI Disabled",
        description: "Reverted to browser-based features"
      });
    } else {
      // Enable
      setIsLoading(true);
      
      try {
        const success = await humanizedTTS.enableHumanizedMode();
        
        if (success) {
          setIsEnabled(true);
          localStorage.setItem('humeEnabled', 'true');
          onModeChange?.(mode, true);
          toast({
            title: getModeTitle(mode),
            description: getModeDescription(mode)
          });
        } else {
          toast({
            title: "Connection Failed",
            description: "Could not connect to Hume AI. Check server configuration.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Enable error:', error);
        toast({
          title: "Error",
          description: "Failed to activate Hume AI",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getModeTitle = (m: HumeMode): string => {
    switch (m) {
      case 'tts': return '🎭 Hume TTS Active';
      case 'voice': return '🎤 Voice Chat Active';
      case 'multimodal': return '🎬 Full Multimodal Active';
    }
  };

  const getModeDescription = (m: HumeMode): string => {
    switch (m) {
      case 'tts': return 'Empathic voice synthesis enabled';
      case 'voice': return 'Real-time voice conversation with emotion analysis';
      case 'multimodal': return 'Voice + video with full emotion tracking';
    }
  };

  const getModeIcon = (m: HumeMode) => {
    switch (m) {
      case 'tts': return <Volume2 className="h-4 w-4" />;
      case 'voice': return <Phone className="h-4 w-4" />;
      case 'multimodal': return <Layers className="h-4 w-4" />;
    }
  };

  const handleTestVoice = async () => {
    setIsTesting(true);
    try {
      const testMessage = isEnabled 
        ? "Hello! Hume AI is active. I can understand and respond with empathy."
        : "Browser voice mode active. Enable Hume for empathic voice.";
      
      await humanizedTTS.speak({ text: testMessage });
      toast({
        title: "Voice Test Complete",
        description: isEnabled ? "Hume AI voice working!" : "Browser voice working!"
      });
    } catch (error) {
      console.error('Voice test failed:', error);
      toast({
        title: "Voice Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className={`flex flex-col gap-2 px-4 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-500/20 ${className}`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className={`h-4 w-4 ${isEnabled ? 'text-purple-500' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium">Make Me Hume-an</span>
          {isEnabled && (
            <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
              {mode === 'multimodal' ? 'Full' : mode === 'voice' ? 'Voice' : 'TTS'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Test button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTestVoice}
            disabled={isTesting || isLoading}
            className="h-7 px-2 text-xs"
          >
            {isTesting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </Button>

          {/* Settings popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Hume AI Settings</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-connect" className="text-xs">Auto-connect</Label>
                    <Switch
                      id="auto-connect"
                      checked={settings.autoConnect}
                      onCheckedChange={(v) => setSettings(s => ({ ...s, autoConnect: v }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-emotions" className="text-xs">Show emotions</Label>
                    <Switch
                      id="show-emotions"
                      checked={settings.showEmotions}
                      onCheckedChange={(v) => setSettings(s => ({ ...s, showEmotions: v }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Emotion sensitivity</Label>
                    <Slider
                      value={[settings.emotionSensitivity * 100]}
                      onValueChange={([v]) => setSettings(s => ({ ...s, emotionSensitivity: v / 100 }))}
                      max={100}
                      step={10}
                    />
                  </div>

                  {mode === 'multimodal' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Video capture interval (ms)</Label>
                      <Slider
                        value={[settings.captureInterval]}
                        onValueChange={([v]) => setSettings(s => ({ ...s, captureInterval: v }))}
                        min={500}
                        max={3000}
                        step={250}
                      />
                      <span className="text-xs text-muted-foreground">{settings.captureInterval}ms</span>
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Enable/Disable button */}
          <Button
            variant={isEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleEnabled}
            disabled={isLoading}
            className={`h-7 px-3 text-xs ${isEnabled ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : isEnabled ? (
              <Brain className="h-3 w-3 mr-1" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1" />
            )}
            {isLoading ? 'Connecting...' : isEnabled ? 'Active' : 'Enable'}
          </Button>
        </div>
      </div>

      {/* Mode selector tabs */}
      <Tabs value={mode} onValueChange={(v) => handleModeChange(v as HumeMode)} className="w-full">
        <TabsList className="w-full h-8 bg-muted/50">
          <TabsTrigger 
            value="tts" 
            className="flex-1 h-7 text-xs data-[state=active]:bg-purple-500/20"
          >
            <Volume2 className="h-3 w-3 mr-1" />
            TTS Only
          </TabsTrigger>
          <TabsTrigger 
            value="voice" 
            className="flex-1 h-7 text-xs data-[state=active]:bg-purple-500/20"
          >
            <Mic className="h-3 w-3 mr-1" />
            Voice Chat
          </TabsTrigger>
          <TabsTrigger 
            value="multimodal" 
            className="flex-1 h-7 text-xs data-[state=active]:bg-purple-500/20"
          >
            <Camera className="h-3 w-3 mr-1" />
            Multimodal
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Mode description */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {getModeIcon(mode)}
        <span>
          {mode === 'tts' && 'Empathic voice synthesis for Eliza responses'}
          {mode === 'voice' && 'Real-time voice conversation with emotion tracking'}
          {mode === 'multimodal' && 'Voice + camera with full emotional intelligence'}
        </span>
      </div>
    </div>
  );
};

export default MakeMeHumanToggle;
