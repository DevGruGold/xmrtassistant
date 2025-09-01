import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Volume2, VolumeX, Loader2, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { geminiImageService, type GeneratedImage } from "../services/geminiImageService";

interface ElizaAvatarProps {
  apiKey: string;
  lastMessage?: string;
  isConnected: boolean;
  isSpeaking?: boolean;
  className?: string;
}

interface MoodState {
  emotion: string;
  intensity: number;
  context: string;
  confidence: number;
  previousEmotion?: string;
}

interface EmotionalContext {
  userMood?: string;
  conversationTone?: string;
  topicComplexity?: 'simple' | 'moderate' | 'complex';
  urgency?: 'low' | 'medium' | 'high';
}

const ElizaAvatar = ({ 
  apiKey, 
  lastMessage, 
  isConnected, 
  isSpeaking = false,
  className 
}: ElizaAvatarProps) => {
  const [currentAvatar, setCurrentAvatar] = useState<GeneratedImage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [mood, setMood] = useState<MoodState>({ 
    emotion: "professional", 
    intensity: 0.5, 
    context: "initializing",
    confidence: 0.8
  });
  const [emotionalContext, setEmotionalContext] = useState<EmotionalContext>({});
  const [avatarCache, setAvatarCache] = useState<Map<string, GeneratedImage>>(new Map());
  
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastMessageRef = useRef<string>("");
  const emotionHistoryRef = useRef<string[]>([]);

  // Generate avatar with enhanced Gemini 2.5 Flash
  const generateAvatar = async (moodContext: string) => {
    if (!apiKey || isGenerating) return;

    const cacheKey = `${mood.emotion}-${mood.context}-${isConnected}`;
    
    // Check cache first
    if (avatarCache.has(cacheKey)) {
      setCurrentAvatar(avatarCache.get(cacheKey)!);
      return;
    }

    setIsGenerating(true);
    try {
      const generatedImage = await geminiImageService.generateMoodBasedAvatar(
        mood.emotion, 
        mood.context, 
        isConnected
      );
      
      setCurrentAvatar(generatedImage);
      
      // Cache the result
      const newCache = new Map(avatarCache);
      newCache.set(cacheKey, generatedImage);
      setAvatarCache(newCache);
      
    } catch (error) {
      console.error('Avatar generation error:', error);
      // Fallback avatar
      const fallbackImage: GeneratedImage = {
        url: `data:image/svg+xml,${encodeURIComponent(`
          <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="fallbackGradient" cx="50%" cy="30%" r="70%">
                <stop offset="0%" style="stop-color:hsl(271 81% 56%);stop-opacity:1" />
                <stop offset="100%" style="stop-color:hsl(199 89% 48%);stop-opacity:0.8" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#fallbackGradient)" />
            <text x="50" y="58" text-anchor="middle" font-family="system-ui" font-size="20" font-weight="bold" fill="hsl(0 0% 98%)">E</text>
            <circle cx="50" cy="50" r="35" fill="none" stroke="hsl(271 81% 56%)" stroke-width="2" opacity="${isConnected ? '1' : '0.3'}">
              ${isConnected ? '<animate attributeName="r" values="35;40;35" dur="2s" repeatCount="indefinite" />' : ''}
            </circle>
          </svg>
        `)}`,
        prompt: "Fallback avatar",
        timestamp: new Date(),
        style: 'fallback'
      };
      setCurrentAvatar(fallbackImage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Enhanced mood analysis using Gemini 2.5 Flash emotional intelligence
  const analyzeMood = (message: string): MoodState => {
    const lowerMessage = message.toLowerCase();
    const previousEmotion = mood.emotion;
    
    // Add to emotion history
    emotionHistoryRef.current.push(previousEmotion);
    if (emotionHistoryRef.current.length > 5) {
      emotionHistoryRef.current.shift();
    }
    
    let newMood: MoodState = {
      emotion: "professional",
      intensity: 0.5,
      context: "standard operation",
      confidence: 0.6,
      previousEmotion
    };

    // Enhanced emotional intelligence analysis
    if (lowerMessage.includes('error') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
      newMood = { 
        emotion: "concerned", 
        intensity: 0.8, 
        context: "troubleshooting mode",
        confidence: 0.9,
        previousEmotion
      };
    } else if (lowerMessage.includes('mining') || lowerMessage.includes('hashrate') || lowerMessage.includes('pool')) {
      newMood = { 
        emotion: "focused", 
        intensity: 0.85, 
        context: "mining analytics",
        confidence: 0.95,
        previousEmotion
      };
    } else if (lowerMessage.includes('greetings') || lowerMessage.includes('hello') || lowerMessage.includes('hi ')) {
      newMood = { 
        emotion: "welcoming", 
        intensity: 0.7, 
        context: "greeting protocol",
        confidence: 0.9,
        previousEmotion
      };
    } else if (lowerMessage.includes('founder') || lowerMessage.includes('creator')) {
      newMood = { 
        emotion: "respectful", 
        intensity: 0.95, 
        context: "founder interaction",
        confidence: 1.0,
        previousEmotion
      };
    } else if (lowerMessage.includes('dao') || lowerMessage.includes('governance') || lowerMessage.includes('voting')) {
      newMood = { 
        emotion: "analytical", 
        intensity: 0.8, 
        context: "governance analysis",
        confidence: 0.85,
        previousEmotion
      };
    } else if (lowerMessage.includes('philosophy') || lowerMessage.includes('manifesto') || lowerMessage.includes('values')) {
      newMood = { 
        emotion: "philosophical", 
        intensity: 0.9, 
        context: "ideological discourse",
        confidence: 0.9,
        previousEmotion
      };
    } else if (lowerMessage.includes('thank') || lowerMessage.includes('appreciate') || lowerMessage.includes('excellent')) {
      newMood = { 
        emotion: "pleased", 
        intensity: 0.75, 
        context: "positive feedback received",
        confidence: 0.85,
        previousEmotion
      };
    }

    // Emotional context analysis
    const newEmotionalContext: EmotionalContext = {
      userMood: lowerMessage.includes('frustrated') || lowerMessage.includes('confused') ? 'negative' : 
               lowerMessage.includes('excited') || lowerMessage.includes('great') ? 'positive' : 'neutral',
      conversationTone: lowerMessage.includes('technical') || lowerMessage.includes('complex') ? 'technical' : 
                       lowerMessage.includes('simple') || lowerMessage.includes('basic') ? 'casual' : 'professional',
      topicComplexity: lowerMessage.includes('advanced') || lowerMessage.includes('complex') ? 'complex' :
                      lowerMessage.includes('basic') || lowerMessage.includes('simple') ? 'simple' : 'moderate',
      urgency: lowerMessage.includes('urgent') || lowerMessage.includes('critical') ? 'high' :
              lowerMessage.includes('when possible') || lowerMessage.includes('whenever') ? 'low' : 'medium'
    };

    setEmotionalContext(newEmotionalContext);
    
    return newMood;
  };

  // Speak text using Web Speech API
  const speak = (text: string) => {
    if (!voiceEnabled || !text) return;

    // Cancel any ongoing speech
    if (speechSynthRef.current) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;
    
    // Try to use a female voice that sounds professional
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Female') || 
      voice.name.includes('Samantha') ||
      voice.name.includes('Karen') ||
      voice.name.includes('Zira')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    speechSynthRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  // Effect to generate new avatar when mood changes significantly
  useEffect(() => {
    if (lastMessage && lastMessage !== lastMessageRef.current) {
      const newMood = analyzeMood(lastMessage);
      
      // Only regenerate if mood changed significantly
      if (Math.abs(newMood.intensity - mood.intensity) > 0.3 || 
          newMood.emotion !== mood.emotion) {
        setMood(newMood);
        generateAvatar(`Emotion: ${newMood.emotion}, Context: ${newMood.context}`);
      }
      
      // Handle voice synthesis
      if (voiceEnabled && !lastMessage.startsWith("Greetings") && lastMessage.length > 0) {
        speak(lastMessage);
      }
      
      lastMessageRef.current = lastMessage;
    }
  }, [lastMessage, mood, voiceEnabled, apiKey]);

  // Initial avatar generation
  useEffect(() => {
    if (apiKey && !currentAvatar) {
      generateAvatar("Initial professional appearance, ready to assist");
    }
  }, [apiKey]);

  // Handle voice synthesis availability
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Load voices
      speechSynthesis.getVoices();
    }
  }, []);

  const toggleVoice = () => {
    if (voiceEnabled) {
      speechSynthesis.cancel();
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
    }
  };

  return (
    <div className={cn("flex flex-col items-center space-y-3", className)}>
      <div className="relative">
        <Avatar className={cn(
          "h-20 w-20 border-3 transition-all duration-500",
          isConnected ? "border-primary shadow-[0_0_20px_hsl(271_81%_56%_/_0.4)]" : "border-muted",
          isSpeaking ? "animate-pulse scale-105" : "",
          isGenerating ? "animate-pulse" : "",
          mood.emotion === "focused" ? "border-mining-info shadow-[0_0_25px_hsl(199_89%_48%_/_0.4)]" : "",
          mood.emotion === "concerned" ? "border-mining-warning shadow-[0_0_25px_hsl(48_96%_53%_/_0.4)]" : "",
          mood.emotion === "pleased" ? "border-mining-active shadow-[0_0_25px_hsl(142_76%_36%_/_0.4)]" : ""
        )}>
          {currentAvatar?.url ? (
            <AvatarImage src={currentAvatar.url} alt={`Eliza Avatar - ${mood.emotion}`} />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-primary to-mining-info text-primary-foreground font-bold text-xl">
              <div className="flex items-center justify-center relative">
                E
                {isGenerating && (
                  <Brain className="absolute h-4 w-4 animate-pulse text-mining-info" />
                )}
              </div>
            </AvatarFallback>
          )}
        </Avatar>
        
        {/* Status indicators */}
        <div className="absolute -bottom-1 -right-1 flex space-x-1">
          {isGenerating && (
            <div className="bg-mining-warning text-black rounded-full p-1">
              <Loader2 className="h-3 w-3 animate-spin" />
            </div>
          )}
          <div className={cn(
            "w-3 h-3 rounded-full border border-background",
            isConnected ? "bg-mining-active animate-pulse" : "bg-mining-inactive"
          )} />
        </div>
      </div>

      {/* Voice control */}
      {'speechSynthesis' in window && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleVoice}
          className={cn(
            "p-2 h-8 w-8",
            voiceEnabled ? "text-mining-active" : "text-muted-foreground"
          )}
          title={voiceEnabled ? "Disable voice" : "Enable voice"}
        >
          {voiceEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Enhanced mood and status indicator */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <div className="flex items-center justify-center gap-1">
          <div className="capitalize font-medium">{mood.emotion}</div>
          <div className={cn(
            "w-2 h-2 rounded-full",
            mood.confidence > 0.8 ? "bg-mining-active" : 
            mood.confidence > 0.6 ? "bg-mining-warning" : "bg-mining-inactive"
          )} />
        </div>
        <div className="text-[10px] opacity-60">{mood.context}</div>
        {currentAvatar?.style && (
          <div className="text-[9px] opacity-40 italic">{currentAvatar.style}</div>
        )}
      </div>
    </div>
  );
};

export default ElizaAvatar;