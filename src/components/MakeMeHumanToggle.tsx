import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Brain, Mic2 } from 'lucide-react';
import { humanizedTTS } from '@/services/humanizedTTSService';
import { useToast } from '@/hooks/use-toast';

interface MakeMeHumanToggleProps {
  onModeChange?: (isHumanized: boolean) => void;
}

export const MakeMeHumanToggle: React.FC<MakeMeHumanToggleProps> = ({ onModeChange }) => {
  const [isHumanized, setIsHumanized] = useState(false);
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
      setIsLoading(true);
      
      try {
        const success = await humanizedTTS.enableHumanizedMode();
        
        if (success) {
          setIsHumanized(true);
          onModeChange?.(true);
          toast({
            title: "🎭 Hume-an Mode Activated",
            description: "Using Hume AI Empathic Voice Interface"
          });
        } else {
          toast({
            title: "Connection Failed",
            description: "Could not connect to Hume AI. Check server configuration.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Toggle error:', error);
        toast({
          title: "Error",
          description: "Failed to activate Hume-an mode",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
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

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-500/20">
      <div className="flex items-center gap-2 flex-1">
        <Sparkles className={`h-4 w-4 ${isHumanized ? 'text-purple-500' : 'text-muted-foreground'}`} />
        <span className="text-sm font-medium">Make Me Hume-an</span>
        {isHumanized && (
          <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-600 border-purple-500/30">
            EVI
          </Badge>
        )}
        {isLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">Connecting...</span>
        )}
      </div>
      
      <Switch
        checked={isHumanized}
        onCheckedChange={handleToggle}
        disabled={isLoading}
        className="data-[state=checked]:bg-purple-500"
      />
      
      {isHumanized && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Brain className="h-3 w-3 text-purple-500" />
          <Mic2 className="h-3 w-3 text-pink-500" />
        </div>
      )}
    </div>
  );
};
