import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { realTimeProcessingService } from '@/services/RealTimeProcessingService';
import { emotionalIntelligenceService } from '@/services/EmotionalIntelligenceService';
import { contextAwarenessService } from '@/services/ContextAwarenessService';
import { geminiImageService } from '@/services/geminiImageService';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface AdaptiveAvatarProps {
  apiKey?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  enableVoice?: boolean;
  enableVisualMode?: boolean;
}

export const AdaptiveAvatar: React.FC<AdaptiveAvatarProps> = ({
  apiKey,
  className = '',
  size = 'lg',
  enableVoice = true,
  enableVisualMode = true
}) => {
  const [currentAvatar, setCurrentAvatar] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentMood, setCurrentMood] = useState('neutral');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'processing' | 'idle'>('idle');
  const [voiceEnabled, setVoiceEnabled] = useState(enableVoice);
  const [visualModeEnabled, setVisualModeEnabled] = useState(enableVisualMode);
  const [reactivityLevel, setReactivityLevel] = useState<'low' | 'medium' | 'high'>('medium');

  // Avatar size mapping
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const borderClasses = {
    neutral: 'ring-2 ring-primary/20',
    happy: 'ring-2 ring-green-400/60 shadow-lg shadow-green-400/20',
    excited: 'ring-2 ring-yellow-400/60 shadow-lg shadow-yellow-400/20 animate-pulse',
    sad: 'ring-2 ring-blue-400/60 shadow-lg shadow-blue-400/20',
    frustrated: 'ring-2 ring-red-400/60 shadow-lg shadow-red-400/20',
    calm: 'ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-400/20',
    confident: 'ring-2 ring-purple-400/60 shadow-lg shadow-purple-400/20',
    focused: 'ring-2 ring-indigo-400/60 shadow-lg shadow-indigo-400/20'
  };

  useEffect(() => {
    // Generate initial avatar
    generateAdaptiveAvatar('neutral', 'idle');

    // Subscribe to real-time updates
    const unsubscribeEmotion = realTimeProcessingService.subscribe('emotion_detected', (data) => {
      handleEmotionChange(data.emotion, data.confidence);
    });

    const unsubscribeVoice = realTimeProcessingService.subscribe('voice_activity_changed', (data) => {
      handleVoiceActivity(data.isActive, data.confidence);
    });

    const unsubscribeContext = realTimeProcessingService.subscribe('context_updated', (data) => {
      handleContextUpdate(data);
    });

    return () => {
      unsubscribeEmotion();
      unsubscribeVoice();
      unsubscribeContext();
    };
  }, []);

  const handleEmotionChange = async (emotion: string, confidence: number) => {
    if (confidence < 0.5 || emotion === currentMood) return;

    setCurrentMood(emotion);
    setConnectionStatus('processing');

    // Generate new avatar based on emotion with adaptive timing
    const shouldRegenerate = shouldRegenerateAvatar(emotion, confidence);
    if (shouldRegenerate) {
      await generateAdaptiveAvatar(emotion, 'responsive');
    }

    setConnectionStatus('connected');
  };

  const handleVoiceActivity = (isActive: boolean, confidence: number) => {
    if (isActive && confidence > 0.6) {
      setConnectionStatus('processing');
      
      // Quick visual feedback for voice activity
      setTimeout(() => {
        setConnectionStatus('connected');
      }, 300);
    }
  };

  const handleContextUpdate = (context: any) => {
    // Adjust reactivity based on context
    const contextData = contextAwarenessService.getContext();
    
    if (contextData.urgency === 'high') {
      setReactivityLevel('high');
    } else if (contextData.urgency === 'low') {
      setReactivityLevel('low');
    } else {
      setReactivityLevel('medium');
    }
  };

  const shouldRegenerateAvatar = (emotion: string, confidence: number): boolean => {
    switch (reactivityLevel) {
      case 'high':
        return confidence > 0.4; // Very responsive
      case 'medium':
        return confidence > 0.6; // Moderately responsive
      case 'low':
        return confidence > 0.8; // Only respond to very confident emotions
      default:
        return confidence > 0.6;
    }
  };

  const generateAdaptiveAvatar = async (emotion: string, context: string = 'idle') => {
    if (!apiKey || isGenerating) return;

    setIsGenerating(true);

    try {
      // Build context-aware prompt
      const contextData = contextAwarenessService.getContext();
      const emotionalProfile = emotionalIntelligenceService.getEmotionalProfile();
      const insights = contextAwarenessService.getRecentInsights(2);

      const prompt = `
Create a digital avatar of Eliza, an AI assistant, showing ${emotion} emotion with ${context} energy level.

Current context:
- User mood: ${contextData.userMood}
- Conversation tone: ${contextData.conversationTone}
- Emotional stability: ${emotionalProfile.emotionalStability.toFixed(2)}
- Recent insights: ${insights.join(', ')}

Avatar should be:
- Professional yet warm and approachable
- Showing ${emotion} emotion subtly in facial expression
- High quality digital art style
- Suitable for AI assistant representation
- ${context === 'responsive' ? 'More animated and expressive' : 'Calm and composed'}
- Ultra high resolution
      `.trim();

      const params = {
        prompt,
        style: 'digital-art' as const,
        mood: emotion,
        lighting: context === 'responsive' ? 'dynamic lighting' : 'soft professional lighting'
      };
      
      const generatedImage = await geminiImageService.generateImage(params);
      setCurrentAvatar(generatedImage.url);

    } catch (error) {
      console.error('Failed to generate adaptive avatar:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const speak = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Adjust voice based on current mood
    const voices = speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.includes('Female') || voice.name.includes('Samantha') || voice.name.includes('Karen')
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    // Adjust speech parameters based on emotion
    switch (currentMood) {
      case 'excited':
        utterance.rate = 1.1;
        utterance.pitch = 1.2;
        break;
      case 'calm':
        utterance.rate = 0.9;
        utterance.pitch = 0.9;
        break;
      case 'confident':
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        break;
      default:
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
    }

    speechSynthesis.speak(utterance);
  };

  const getCurrentBorderClass = () => {
    const baseClass = borderClasses[currentMood as keyof typeof borderClasses] || borderClasses.neutral;
    
    if (isGenerating) {
      return `${baseClass} animate-spin`;
    }
    
    if (connectionStatus === 'processing') {
      return `${baseClass} animate-pulse`;
    }
    
    return baseClass;
  };

  return (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      {/* Main Avatar */}
      <div className="relative">
        <Avatar className={`${sizeClasses[size]} ${getCurrentBorderClass()} transition-all duration-300`}>
          <AvatarImage 
            src={currentAvatar} 
            alt="Eliza AI Avatar"
            className="object-cover"
          />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary text-primary-foreground font-bold text-xl">
            E
          </AvatarFallback>
        </Avatar>

        {/* Status Indicators */}
        <div className="absolute -bottom-1 -right-1 flex space-x-1">
          {isGenerating && (
            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center animate-spin">
              <Sparkles className="w-2 h-2 text-primary-foreground" />
            </div>
          )}
          
          {connectionStatus === 'processing' && !isGenerating && (
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
          )}
          
          {connectionStatus === 'connected' && !isGenerating && (
            <div className="w-3 h-3 bg-green-400 rounded-full" />
          )}
        </div>
      </div>

      {/* Avatar Controls */}
      {size !== 'sm' && (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="w-8 h-8 p-0"
          >
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisualModeEnabled(!visualModeEnabled)}
            className="w-8 h-8 p-0"
          >
            {visualModeEnabled ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => generateAdaptiveAvatar(currentMood, 'refresh')}
            disabled={isGenerating}
            className="w-8 h-8 p-0"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}

      {/* Mood and Context Display */}
      {size === 'xl' && (
        <div className="text-center space-y-1">
          <div className="text-sm font-medium capitalize">{currentMood}</div>
          <div className="text-xs text-muted-foreground">
            Reactivity: {reactivityLevel}
          </div>
          <div className="text-xs text-muted-foreground">
            {connectionStatus === 'processing' && 'Processing...'}
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'idle' && 'Ready'}
          </div>
        </div>
      )}
    </div>
  );
};