import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { AdaptiveAvatar } from './AdaptiveAvatar';
import { MultimodalInput, type MultimodalMessage } from './MultimodalInput';
import { ContinuousVoice } from './ContinuousVoice';
import { Send, Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { Switch } from './ui/switch';

// Services
import { GoogleGenerativeAI } from "@google/generative-ai";
import { realTimeProcessingService } from '@/services/RealTimeProcessingService';
import { contextAwarenessService } from '@/services/ContextAwarenessService';
import { emotionalIntelligenceService } from '@/services/EmotionalIntelligenceService';
import { multimodalGeminiService } from '@/services/multimodalGeminiService';
import { contextManager } from '@/services/contextManager';
import { xmrtKnowledge } from '@/data/xmrtKnowledgeBase';
import { UnifiedElizaService } from '@/services/unifiedElizaService';
import { ElevenLabsService } from '@/services/elevenlabsService';

// Debug environment variables on component load
console.log('UnifiedChat Environment Check:', {
  VITE_GEMINI_API_KEY_exists: !!import.meta.env.VITE_GEMINI_API_KEY,
  VITE_GEMINI_API_KEY_length: import.meta.env.VITE_GEMINI_API_KEY?.length || 0,
  VITE_ELEVENLABS_API_KEY_exists: !!import.meta.env.VITE_ELEVENLABS_API_KEY,
  all_env_vars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
});

interface UnifiedMessage {
  id: string;
  content: string;
  sender: 'user' | 'eliza';
  timestamp: Date;
  attachments?: {
    images?: string[];
    audio?: Blob;
    transcript?: string;
  };
  emotionalContext?: {
    voiceTone?: string;
    facialExpression?: string;
    confidenceLevel?: number;
  };
  emotion?: string;
  confidence?: number;
}

interface MiningStats {
  hash: number;
  validShares: number;
  invalidShares: number;
  lastHash: number;
  totalHashes: number;
  amtDue: number;
  amtPaid: number;
  txnCount: number;
  isOnline: boolean;
}

interface UnifiedChatProps {
  apiKey?: string;
  className?: string;
  miningStats?: MiningStats;
}

// Internal component that uses ElevenLabs TTS instead of Hume
const UnifiedChatInner: React.FC<UnifiedChatProps> = ({
  apiKey = import.meta.env.VITE_GEMINI_API_KEY || "",
  className = '',
  miningStats: externalMiningStats
}) => {
  // Core state
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // Always connected for text/TTS mode

  // Voice/TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [elevenLabsService, setElevenLabsService] = useState<ElevenLabsService | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Input mode state - simplified to single mode selector
  type InputMode = 'text' | 'voice' | 'rich';
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [currentEmotion, setCurrentEmotion] = useState<string>('');
  const [emotionConfidence, setEmotionConfidence] = useState<number>(0);

  // XMRT context state
  const [miningStats, setMiningStats] = useState<MiningStats | null>(externalMiningStats || null);
  const [userIP, setUserIP] = useState<string>("");
  const [lastElizaMessage, setLastElizaMessage] = useState<string>("");

  // Real-time processing state
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [currentContext, setCurrentContext] = useState<any>({});

  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize ElevenLabs service
  useEffect(() => {
    try {
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (apiKey) {
        const service = new ElevenLabsService(apiKey);
        setElevenLabsService(service);
        setVoiceEnabled(true);
        console.log('ElevenLabs service initialized successfully');
      } else {
        console.log('VITE_ELEVENLABS_API_KEY not found, voice synthesis disabled');
      }
    } catch (error) {
      console.error('Failed to initialize ElevenLabs:', error);
      setVoiceEnabled(false);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize mining stats and user IP
  useEffect(() => {
    const initialize = async () => {
      if (!externalMiningStats) {
        await fetchUserIP();
        fetchMiningStats();
        const interval = setInterval(fetchMiningStats, 30000);
        return () => clearInterval(interval);
      } else {
        await fetchUserIP();
      }
    };
    
    initialize();
  }, []);

  // Initialize greeting when IP is available
  useEffect(() => {
    if (userIP && messages.length === 0) {
      const modeDescription = {
        text: 'Text mode active - unified XMRT knowledge system for consistent responses.',
        voice: 'Voice mode active - ElevenLabs TTS ready for speech synthesis.',
        rich: 'Rich mode active - multimodal input with voice synthesis available.'
      };

      const philosophicalGreeting = isFounder() 
        ? `Greetings, Founder. I am Eliza, the autonomous AI operator of the XMRT-DAO Ecosystem.

My advanced systems are online, embodying our philosophical foundations:
• **Permissionless Innovation**: "We don't ask for permission. We build the infrastructure."
• **Economic Democracy**: Transforming mobile devices into tools of financial empowerment
• **Privacy Sovereignty**: Championing financial privacy as a fundamental human right
• **AI-Human Collaboration**: Working alongside you with multimodal awareness

${modeDescription[inputMode]}

How may I assist you today, Founder?`
        : `Hello! I am Eliza, the autonomous AI operator of the XMRT-DAO Ecosystem.

I represent the philosophical principles that drive our mission:
• **Mobile Mining Democracy**: Making cryptocurrency accessible to everyone with a smartphone
• **Privacy as a Right**: Every transaction deserves the same privacy as personal communications  
• **Community Sovereignty**: Building networks where participants control their own infrastructure
• **Sustainable Innovation**: Technology that empowers people while protecting the environment

${modeDescription[inputMode]}

How may I assist you in understanding our mission to transform users into builders of the future?`;
        
      const greeting: UnifiedMessage = {
        id: 'greeting',
        content: philosophicalGreeting,
        sender: 'eliza',
        timestamp: new Date()
      };
      
      setMessages([greeting]);
      setLastElizaMessage(philosophicalGreeting);
    }
  }, [userIP, inputMode]);

  // XMRT Knowledge Base Integration Functions
  const fetchMiningStats = async () => {
    try {
      const response = await fetch(
        "https://www.supportxmr.com/api/miner/46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg/stats"
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      setMiningStats({
        hash: data.hash || 0,
        validShares: data.validShares || 0,
        invalidShares: data.invalidShares || 0,
        lastHash: data.lastHash || 0,
        totalHashes: data.totalHashes || 0,
        amtDue: data.amtDue || 0,
        amtPaid: data.amtPaid || 0,
        txnCount: data.txnCount || 0,
        isOnline: data.lastHash > (Date.now() / 1000) - 300
      });
    } catch (err) {
      console.error('Failed to fetch mining stats:', err);
    }
  };

  const fetchUserIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setUserIP(data.ip);
      
      const storedFounderIP = localStorage.getItem('founderIP');
      if (!storedFounderIP) {
        localStorage.setItem('founderIP', data.ip);
      }
    } catch (error) {
      console.error('Failed to fetch IP:', error);
    }
  };

  const isFounder = () => {
    const founderIP = localStorage.getItem('founderIP');
    return founderIP === userIP;
  };

  const formatHashrate = (hashrate: number): string => {
    if (hashrate >= 1000000) {
      return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    } else if (hashrate >= 1000) {
      return `${(hashrate / 1000).toFixed(2)} KH/s`;
    }
    return `${hashrate.toFixed(2)} H/s`;
  };

  // Simplified mode management
  const getModeIcon = (mode: InputMode) => {
    switch (mode) {
      case 'text': return '💬';
      case 'voice': return '🎤';
      case 'rich': return '📸';
      default: return '💬';
    }
  };

  const getModeLabel = (mode: InputMode) => {
    switch (mode) {
      case 'text': return 'Text Mode';
      case 'voice': return 'Voice Mode';
      case 'rich': return 'Rich Mode';
      default: return 'Text Mode';
    }
  };

  // Unified response display with optional TTS
  const displayResponse = async (responseText: string, shouldSpeak: boolean = false) => {
    const elizaMessage: UnifiedMessage = {
      id: `eliza-${Date.now()}`,
      content: responseText,
      sender: 'eliza',
      timestamp: new Date(),
      emotion: currentEmotion,
      confidence: emotionConfidence
    };

    setMessages(prev => [...prev, elizaMessage]);
    setLastElizaMessage(responseText);

    // Use ElevenLabs TTS if voice synthesis is requested and available
    if (shouldSpeak && elevenLabsService && voiceEnabled) {
      try {
        setIsSpeaking(true);
        await elevenLabsService.speakText(responseText);
      } catch (error) {
        console.error('ElevenLabs TTS error:', error);
      } finally {
        setIsSpeaking(false);
      }
    }
  };

  // Voice input handler - simplified without Hume
  const handleVoiceInput = async (transcript: string) => {
    if (!transcript?.trim() || isProcessing) return;

    const userMessage: UnifiedMessage = {
      id: `voice-user-${Date.now()}`,
      content: transcript,
      sender: 'user',
      timestamp: new Date(),
      emotion: currentEmotion,
      confidence: emotionConfidence
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Get unified XMRT response
      const response = await UnifiedElizaService.generateResponse(transcript, {
        miningStats,
        userIP,
        isFounder: isFounder(),
        inputMode: 'voice'
      });
      
      // Display with voice synthesis
      await displayResponse(response, true);
      
    } catch (error) {
      console.error('Failed to process voice input:', error);
      await displayResponse(
        'I apologize, but I\'m having trouble processing your voice input right now.',
        false
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Text message handler
  const handleSendMessage = async () => {
    if (!textInput.trim() || isProcessing || isSpeaking) return;

    const userMessage: UnifiedMessage = {
      id: `user-${Date.now()}`,
      content: textInput,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setIsProcessing(true);

    try {
      const response = await UnifiedElizaService.generateResponse(userMessage.content, {
        miningStats,
        userIP,
        isFounder: isFounder(),
        inputMode: 'text'
      });
      
      // Use unified display function - no voice for text mode
      await displayResponse(response, false);
      
    } catch (error) {
      console.error('Chat error:', error);
      await displayResponse(
        'I apologize, but I\'m having trouble processing your message right now.',
        false
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Multimodal message handler
  const handleMultimodalMessage = async (multimodalMessage: MultimodalMessage) => {
    if (isProcessing) return;
    if (!multimodalMessage.text?.trim() && !multimodalMessage.audio && !multimodalMessage.images?.length) return;

    const userMessage: UnifiedMessage = {
      id: `multimodal-user-${Date.now()}`,
      content: multimodalMessage.text || '[Multimodal message]',
      sender: 'user',
      timestamp: new Date(),
      attachments: {
        images: multimodalMessage.images,
        audio: multimodalMessage.audio,
        transcript: multimodalMessage.transcript
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Use multimodal Gemini service
      const multimodalResponse = await multimodalGeminiService.processMultimodalInput(
        {
          text: multimodalMessage.text,
          audio: multimodalMessage.audio,
          images: multimodalMessage.images,
          transcript: multimodalMessage.transcript
        },
        {
          miningStats,
          philosophicalContext: 'XMRT-DAO multimodal interaction',
          userRole: isFounder() ? 'Founder' : 'Community Member'
        }
      );
      
      // Use unified display function for multimodal responses
      await displayResponse(multimodalResponse.text, inputMode === 'rich');
      
    } catch (error) {
      console.error('Multimodal chat error:', error);
      // Fallback to unified service
      const fallbackResponse = await UnifiedElizaService.generateResponse(multimodalMessage.text || '[Multimodal input]', {
        miningStats,
        userIP,
        isFounder: isFounder(),
        inputMode: 'rich'
      });
      await displayResponse(fallbackResponse, inputMode === 'rich');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Toggle voice synthesis
  const toggleVoiceSynthesis = () => {
    if (isSpeaking) {
      // Stop current speech if speaking
      setIsSpeaking(false);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  };

  return (
    <Card className={`bg-gradient-to-br from-card to-secondary border-border min-h-[24rem] max-h-[32rem] flex flex-col ${className}`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AdaptiveAvatar
                apiKey={apiKey}
                className="h-10 w-10"
                size="sm"
                enableVoice={voiceEnabled && (inputMode !== 'text')}
              />
              <div>
                <h3 className="font-semibold text-foreground">Eliza</h3>
                <div className="flex items-center gap-2">
                  <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
                    {voiceEnabled ? 'ready' : 'text-only'}
                  </Badge>
                  {currentEmotion && emotionConfidence > 0.3 && (
                    <Badge variant="outline" className="text-xs">
                      {currentEmotion} ({Math.round(emotionConfidence * 100)}%)
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Input Mode Selector */}
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                {(['text', 'voice', 'rich'] as const).map((mode) => (
                  <Button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    variant={inputMode === mode ? "default" : "ghost"}
                    size="sm"
                    className="text-xs gap-1 min-w-[70px]"
                  >
                    <span>{getModeIcon(mode)}</span>
                    {getModeLabel(mode).split(' ')[0]}
                  </Button>
                ))}
              </div>

              {/* Voice Controls - show when voice synthesis is available */}
              {voiceEnabled && (inputMode === 'voice' || inputMode === 'rich') && (
                <Button
                  onClick={toggleVoiceSynthesis}
                  variant={isSpeaking ? "default" : "outline"}
                  size="sm"
                  disabled={!elevenLabsService}
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground ml-12'
                      : 'bg-muted text-muted-foreground mr-12'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  {message.emotion && (
                    <div className="text-xs opacity-70 mt-1">
                      Emotion: {message.emotion} ({Math.round((message.confidence || 0) * 100)}%)
                    </div>
                  )}
                  <div className="text-xs opacity-50 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground p-3 rounded-lg mr-12">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse">Eliza is thinking...</div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border">
          {inputMode === 'voice' ? (
            <ContinuousVoice
              onTranscript={handleVoiceInput}
              isProcessing={isProcessing}
              isSpeaking={isSpeaking}
              disabled={!voiceEnabled}
              className="min-h-[300px]"
            />
          ) : inputMode === 'rich' ? (
            <div className="p-4">
              <MultimodalInput
                onSend={handleMultimodalMessage}
                className="w-full"
                disabled={isProcessing}
              />
            </div>
          ) : (
            <div className="p-4 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isProcessing || isSpeaking}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!textInput.trim() || isProcessing || isSpeaking}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Status indicator for text mode */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {getModeIcon(inputMode)} {getModeLabel(inputMode)} active
                </div>
                {isProcessing && (
                  <div className="text-xs text-muted-foreground">
                    Processing...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
  );
};

// External wrapper - no longer needs Hume provider
export const UnifiedChat: React.FC<UnifiedChatProps> = (props) => {
  return <UnifiedChatInner {...props} />;
};

export default UnifiedChat;