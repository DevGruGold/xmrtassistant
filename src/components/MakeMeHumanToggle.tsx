import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sparkles, Brain, Mic2, Check } from 'lucide-react';
import { humanizedTTS } from '@/services/humanizedTTSService';
import { useToast } from '@/hooks/use-toast';

interface MakeMeHumanToggleProps {
  onModeChange?: (isHumanized: boolean) => void;
}

export const MakeMeHumanToggle: React.FC<MakeMeHumanToggleProps> = ({ onModeChange }) => {
  const [isHumanized, setIsHumanized] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [humeApiKey, setHumeApiKey] = useState('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const restoreMode = async () => {
      await humanizedTTS.restoreMode();
      setIsHumanized(humanizedTTS.isHumanized());
    };
    restoreMode();
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const savedHumeKey = localStorage.getItem('hume_api_key');
      const savedElevenLabsKey = localStorage.getItem('elevenlabs_api_key');
      
      if (savedHumeKey && savedElevenLabsKey) {
        const success = await humanizedTTS.enableHumanizedMode(savedHumeKey, savedElevenLabsKey);
        if (success) {
          setIsHumanized(true);
          onModeChange?.(true);
          toast({
            title: "🎭 Humanized Mode Activated",
            description: "Using Hume AI emotion analysis + ElevenLabs premium voices"
          });
        }
      } else {
        setShowSetup(true);
      }
    } else {
      humanizedTTS.disableHumanizedMode();
      setIsHumanized(false);
      onModeChange?.(false);
      toast({
        title: "Browser Mode Active",
        description: "Using free Web Speech API"
      });
    }
  };

  const handleSetupSubmit = async () => {
    if (!humeApiKey || !elevenLabsApiKey) {
      toast({
        title: "Missing API Keys",
        description: "Please provide both Hume AI and ElevenLabs API keys",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const success = await humanizedTTS.enableHumanizedMode(humeApiKey, elevenLabsApiKey);
    setIsLoading(false);

    if (success) {
      setIsHumanized(true);
      setShowSetup(false);
      onModeChange?.(true);
      toast({
        title: "🎭 Humanized Mode Activated!",
        description: "Eliza now speaks with emotional intelligence and ultra-realistic voices"
      });
    } else {
      toast({
        title: "Setup Failed",
        description: "Please check your API keys and try again",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-500/20">
        <div className="flex items-center gap-2 flex-1">
          <Sparkles className={`h-4 w-4 ${isHumanized ? 'text-purple-500' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium">Make me Human</span>
          {isHumanized && (
            <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-600 border-purple-500/30">
              Premium
            </Badge>
          )}
        </div>
        
        <Switch
          checked={isHumanized}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-purple-500"
        />
        
        {isHumanized && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Brain className="h-3 w-3 text-purple-500" />
            <Mic2 className="h-3 w-3 text-pink-500" />
          </div>
        )}
      </div>

      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Enable Humanized Intelligence
            </DialogTitle>
            <DialogDescription>
              Unlock emotional AI and ultra-realistic voices with Hume AI + ElevenLabs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="p-4 bg-purple-500/5 border-purple-500/20">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Emotional intelligence via Hume AI</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Ultra-realistic voices via ElevenLabs</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Context-aware tone adaptation</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Multilingual dialectical nuance</span>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Hume AI API Key</label>
                <Input
                  type="password"
                  placeholder="hume_xxxxxxxxxxxxx"
                  value={humeApiKey}
                  onChange={(e) => setHumeApiKey(e.target.value)}
                />
                <a 
                  href="https://platform.hume.ai/settings/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary mt-1 inline-block"
                >
                  Get your Hume AI key →
                </a>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">ElevenLabs API Key</label>
                <Input
                  type="password"
                  placeholder="sk_xxxxxxxxxxxxx"
                  value={elevenLabsApiKey}
                  onChange={(e) => setElevenLabsApiKey(e.target.value)}
                />
                <a 
                  href="https://elevenlabs.io/app/settings/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary mt-1 inline-block"
                >
                  Get your ElevenLabs key →
                </a>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSetupSubmit}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                {isLoading ? 'Activating...' : 'Activate Humanized Mode'}
              </Button>
              <Button
                onClick={() => setShowSetup(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
