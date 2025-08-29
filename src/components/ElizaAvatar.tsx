import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

const ElizaAvatar = ({ 
  apiKey, 
  lastMessage, 
  isConnected, 
  isSpeaking = false,
  className 
}: ElizaAvatarProps) => {
  const [currentAvatar, setCurrentAvatar] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [mood, setMood] = useState<MoodState>({ 
    emotion: "professional", 
    intensity: 0.5, 
    context: "neutral" 
  });
  const [pendingText, setPendingText] = useState<string>("");
  
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastMessageRef = useRef<string>("");

  // Generate avatar with Gemini Flash (Nano Banana)
  const generateAvatar = async (moodContext: string) => {
    if (!apiKey || isGenerating) return;

    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const prompt = `Create a professional AI avatar for "Eliza", an autonomous XMRT-DAO ecosystem operator. Style: Modern, sleek digital assistant with a warm but professional appearance. ${moodContext}. High quality, clean background, centered portrait, futuristic but approachable aesthetic. Digital art style.`;

      const result = await model.generateContent([prompt]);
      
      // Note: This is a placeholder - actual image generation would need the Imagen API
      // For now, we'll use a generated avatar placeholder
      const avatarData = result.response.text();
      
      // In production, this would be the actual generated image URL from Nano Banana
      setCurrentAvatar(`data:image/svg+xml,${encodeURIComponent(`
        <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:hsl(271 81% 56%);stop-opacity:1" />
              <stop offset="100%" style="stop-color:hsl(199 89% 48%);stop-opacity:1" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#avatarGradient)" />
          <circle cx="50" cy="50" r="35" fill="hsl(240 10% 3.9%)" opacity="0.8" />
          <text x="50" y="58" text-anchor="middle" font-family="monospace" font-size="16" fill="hsl(0 0% 98%)">E</text>
          <circle cx="50" cy="50" r="20" fill="none" stroke="hsl(271 81% 56%)" stroke-width="2" opacity="${isConnected ? '1' : '0.3'}">
            ${isConnected ? '<animate attributeName="r" values="20;25;20" dur="2s" repeatCount="indefinite" />' : ''}
          </circle>
        </svg>
      `)}`);
    } catch (error) {
      console.error('Avatar generation error:', error);
      // Fallback to default avatar
      setCurrentAvatar("");
    } finally {
      setIsGenerating(false);
    }
  };

  // Analyze mood from conversation context
  const analyzeMood = (message: string): MoodState => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('error') || lowerMessage.includes('problem')) {
      return { emotion: "concerned", intensity: 0.7, context: "addressing issues" };
    }
    if (lowerMessage.includes('mining') || lowerMessage.includes('hashrate')) {
      return { emotion: "focused", intensity: 0.8, context: "analyzing mining data" };
    }
    if (lowerMessage.includes('greetings') || lowerMessage.includes('hello')) {
      return { emotion: "welcoming", intensity: 0.6, context: "greeting user" };
    }
    if (lowerMessage.includes('founder')) {
      return { emotion: "respectful", intensity: 0.9, context: "addressing founder" };
    }
    
    return { emotion: "professional", intensity: 0.5, context: "standard operation" };
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
          "h-16 w-16 border-2 transition-all duration-300",
          isConnected ? "border-primary shadow-glow" : "border-muted",
          isSpeaking ? "animate-pulse-glow" : "",
          isGenerating ? "animate-pulse" : ""
        )}>
          {currentAvatar ? (
            <AvatarImage src={currentAvatar} alt="Eliza Avatar" />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-primary to-mining-info text-primary-foreground font-bold">
              E
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

      {/* Mood indicator */}
      <div className="text-xs text-muted-foreground text-center">
        <div className="capitalize">{mood.emotion}</div>
        <div className="text-[10px] opacity-60">{mood.context}</div>
      </div>
    </div>
  );
};

export default ElizaAvatar;