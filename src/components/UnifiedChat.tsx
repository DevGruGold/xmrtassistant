import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { AdaptiveAvatar } from './AdaptiveAvatar';
import { EnhancedContinuousVoice } from './EnhancedContinuousVoice';
import { MobileVoiceEnhancer } from './MobileVoiceEnhancer';
import { Send, Volume2, VolumeX } from 'lucide-react';

// Services
import { UnifiedElizaService } from '@/services/unifiedElizaService';
import { ElevenLabsService } from '@/services/elevenlabsService';
import { unifiedDataService, type MiningStats, type UserContext } from '@/services/unifiedDataService';

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

// MiningStats imported from unifiedDataService

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

  // Input mode state - streamlined to 2 modes
  type InputMode = 'text' | 'voice';
  const [inputMode, setInputMode] = useState<InputMode>('voice'); // Default to voice for fluid experience
  const [currentEmotion, setCurrentEmotion] = useState<string>('');
  const [emotionConfidence, setEmotionConfidence] = useState<number>(0);

  // XMRT context state - using unified service
  const [miningStats, setMiningStats] = useState<MiningStats | null>(externalMiningStats || null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [lastElizaMessage, setLastElizaMessage] = useState<string>("");

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

  // Initialize unified data service
  useEffect(() => {
    const initialize = async () => {
      try {
        const [userCtx, miningData] = await Promise.all([
          unifiedDataService.getUserContext(),
          externalMiningStats || unifiedDataService.getMiningStats()
        ]);
        
        setUserContext(userCtx);
        if (!externalMiningStats) {
          setMiningStats(miningData);
        }

        // Set up periodic refresh for mining stats only if not provided externally
        if (!externalMiningStats) {
          const interval = setInterval(async () => {
            const freshStats = await unifiedDataService.getMiningStats();
            setMiningStats(freshStats);
          }, 30000);
          return () => clearInterval(interval);
        }
      } catch (error) {
        console.error('Failed to initialize unified data:', error);
      }
    };
    
    initialize();
  }, []);

  // Initialize greeting when user context is available
  useEffect(() => {
    if (userContext && messages.length === 0) {
      const modeDescription = {
        text: 'Text mode active - unified XMRT knowledge system for consistent responses.',
        voice: 'Voice mode active - ElevenLabs TTS ready for speech synthesis.'
      };

      const philosophicalGreeting = userContext.isFounder 
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
  }, [userContext, inputMode]);

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
      // Keep using unified service for consistency
    }
  };

  // Remove old IP function - using unified service
  // const fetchUserIP = async () => { ... removed ... };

  // Helper functions using unified service
  const isFounder = () => {
    return userContext?.isFounder || false;
  };

  const formatHashrate = (hashrate: number): string => {
    return unifiedDataService.formatMiningStats({ hash: hashrate } as MiningStats).split('\n')[1] || `${hashrate} H/s`;
  };

  // Streamlined mode management
  const getModeIcon = (mode: InputMode) => {
    switch (mode) {
      case 'text': return '💬';
      case 'voice': return '🎤';
      default: return '💬';
    }
  };

  const getModeLabel = (mode: InputMode) => {
    switch (mode) {
      case 'text': return 'Text';
      case 'voice': return 'Voice';
      default: return 'Text';
    }
  };

  // Unified response display with intelligent TTS control
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

    // Use TTS if requested and voice service is available
    // Add a small delay in voice mode to reduce overlap with speech recognition
    if (shouldSpeak && elevenLabsService && voiceEnabled) {
      try {
        setIsSpeaking(true);
        
        // Add small delay in voice mode to let speech recognition settle
        if (inputMode === 'voice') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await elevenLabsService.speakText(responseText);
      } catch (error) {
        console.error('ElevenLabs TTS error:', error);
      } finally {
        setIsSpeaking(false);
      }
    }
  };

  // Voice input handler - WITH smart TTS timing
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
        userContext,
        inputMode: 'voice',
        shouldSpeak: true // Enable TTS with smart timing
      });
      
      // Display WITH voice synthesis - the delay is handled in displayResponse
      await displayResponse(response, true);
      
    } catch (error) {
      console.error('Failed to process voice input:', error);
      await displayResponse(
        'I apologize, but I\'m having trouble processing your voice input right now.',
        true // Still provide voice feedback for errors
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
        userContext,
        inputMode: 'text',
        shouldSpeak: voiceEnabled // Allow TTS in text mode if voice is enabled
      });
      
      // Use unified display function with TTS for text mode if voice is enabled
      await displayResponse(response, voiceEnabled);
      
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
    <>
      <MobileVoiceEnhancer />
      <Card className={`bg-gradient-to-br from-card to-secondary border-border flex flex-col h-[600px] sm:h-[700px] ${className}`}>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border">
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
              {/* Input Mode Selector - Streamlined to 2 modes */}
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                {(['text', 'voice'] as const).map((mode) => (
                  <Button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    variant={inputMode === mode ? "default" : "ghost"}
                    size="sm"
                    className="text-xs gap-1 min-w-[70px]"
                  >
                    <span>{getModeIcon(mode)}</span>
                    {getModeLabel(mode)}
                  </Button>
                ))}
              </div>

              {/* Voice Controls - show when voice mode is active */}
              {voiceEnabled && inputMode === 'voice' && (
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

        {/* Messages - Improved scrolling */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 sm:p-4">
              <div className="space-y-3 sm:space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] p-2 sm:p-3 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground ml-4 sm:ml-12'
                          : 'bg-muted text-muted-foreground mr-4 sm:mr-12'
                      }`}
                    >
                      <div className="text-xs sm:text-sm whitespace-pre-wrap">{message.content}</div>
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
                    <div className="bg-muted text-muted-foreground p-2 sm:p-3 rounded-lg mr-4 sm:mr-12">
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse text-xs sm:text-sm">Eliza is thinking...</div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Input Area - Mobile optimized */}
        <div className="border-t border-border">
          {inputMode === 'voice' ? (
            <EnhancedContinuousVoice
              onTranscript={handleVoiceInput}
              isProcessing={isProcessing}
              isSpeaking={isSpeaking}
              disabled={!voiceEnabled}
              autoListen={true}
            />
          ) : (
            <div className="p-3 sm:p-4 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="text-sm sm:text-base min-h-[44px] flex-1" // Larger touch target
                  disabled={isProcessing || isSpeaking}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!textInput.trim() || isProcessing || isSpeaking}
                  size="sm"
                  className="px-4 py-2 min-h-[44px] min-w-[44px]" // Larger touch target for mobile
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
    </>
  );
};

// External wrapper - no longer needs Hume provider
export const UnifiedChat: React.FC<UnifiedChatProps> = (props) => {
  return <UnifiedChatInner {...props} />;
};

export default UnifiedChat;