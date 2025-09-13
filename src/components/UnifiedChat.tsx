import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { AdaptiveAvatar } from './AdaptiveAvatar';
import { MobileVoiceInterface } from './MobileVoiceInterface';
import { mobilePermissionService } from '@/services/mobilePermissionService';
import { Send, Volume2, VolumeX } from 'lucide-react';

// Services
import { UnifiedElizaService } from '@/services/unifiedElizaService';
import { GeminiTTSService } from '@/services/geminiTTSService';
import { unifiedDataService, type MiningStats, type UserContext } from '@/services/unifiedDataService';
import { unifiedFallbackService } from '@/services/unifiedFallbackService';
import { conversationPersistence } from '@/services/conversationPersistenceService';

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
  const [geminiTTSService, setGeminiTTSService] = useState<GeminiTTSService | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // Default to enabled
  const [currentAIMethod, setCurrentAIMethod] = useState<string>('');
  const [currentTTSMethod, setCurrentTTSMethod] = useState<string>('');

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

  // Initialize Gemini TTS service
  useEffect(() => {
    try {
      const service = new GeminiTTSService('AIzaSyB3jfxdMQzPpIb5MNfT8DtP5MOvT_Sp7qk');
      setGeminiTTSService(service);
      console.log('Gemini TTS service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini TTS:', error);
      setVoiceEnabled(false);
    }
  }, []);

  // Auto-scroll to bottom only when messages are actually added
  useEffect(() => {
    // Only scroll if there are messages and not just loading
    if (messages.length > 0 && !isProcessing) {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing]);

  // Initialize unified data service and conversation persistence
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

        // Initialize conversation persistence
        await conversationPersistence.initializeSession();
        
        // Load conversation history
        const history = await conversationPersistence.getConversationHistory();
        if (history.length > 0) {
          const convertedMessages: UnifiedMessage[] = history.map(msg => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender,
            timestamp: msg.timestamp,
            ...msg.metadata
          }));
          setMessages(convertedMessages);
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

  // Generate AI-powered greeting when user context is available (only if no history)
  useEffect(() => {
    if (userContext && messages.length === 0) {
      generateAIGreeting();
    }
  }, [userContext, inputMode]);

  const generateAIGreeting = async () => {
    setIsProcessing(true);
    try {
      const greetingPrompt = userContext?.isFounder 
        ? "Generate a personalized greeting for the founder of XMRT-DAO"
        : "Generate a welcoming introduction to XMRT-DAO for a new user";
        
        const responseText = await UnifiedElizaService.generateResponse(greetingPrompt, {
        miningStats: miningStats,
        userContext: userContext,
        inputMode: inputMode
      });
      
      const greeting: UnifiedMessage = {
        id: 'greeting',
        content: responseText,
        sender: 'eliza',
        timestamp: new Date()
      };
      
      setMessages([greeting]);
      setLastElizaMessage(responseText);
      
      // Store greeting in persistent storage
      await conversationPersistence.storeMessage(responseText, 'eliza', {
        type: 'greeting',
        inputMode: inputMode
      });
    } catch (error) {
      console.error('Failed to generate AI greeting:', error);
      // Minimal fallback only if AI completely fails
      const fallback: UnifiedMessage = {
        id: 'greeting',
        content: "Hello! I'm Eliza, your XMRT-DAO AI assistant. How can I help you today?",
        sender: 'eliza',
        timestamp: new Date()
      };
      setMessages([fallback]);
    } finally {
      setIsProcessing(false);
    }
  };

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
    if (shouldSpeak && geminiTTSService && voiceEnabled) {
      try {
        setIsSpeaking(true);
        
        // Add small delay in voice mode to let speech recognition settle
        if (inputMode === 'voice') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await geminiTTSService.speakText({ text: responseText });
      } catch (error) {
        console.error('Gemini TTS error:', error);
      } finally {
        setIsSpeaking(false);
      }
    }
  };

  // Voice input handler - WITH smart TTS timing and speech recognition pausing
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

    // Store user message
    await conversationPersistence.storeMessage(transcript, 'user', {
      emotion: currentEmotion,
      confidence: emotionConfidence,
      inputType: 'voice'
    });

    try {
      // Use UnifiedElizaService directly for Gemini AI response
      const aiResponseText = await UnifiedElizaService.generateResponse(transcript, {
        miningStats: miningStats || undefined,
        userContext: userContext || undefined,
        inputMode: inputMode
      });

      setCurrentAIMethod('Gemini AI');

      const elizaMessage: UnifiedMessage = {
        id: `eliza-${Date.now()}`,
        content: aiResponseText,
        sender: 'eliza',
        timestamp: new Date(),
        confidence: 0.95
      };

      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(aiResponseText);
      
      // Store Eliza's response
      await conversationPersistence.storeMessage(aiResponseText, 'eliza', {
        confidence: 0.95,
        method: 'Gemini AI',
        inputType: 'voice'
      });

      // Speak response using Gemini TTS directly
      if (voiceEnabled && geminiTTSService) {
        try {
          setIsSpeaking(true);
          
          // Add small delay in voice mode to let speech recognition settle
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await geminiTTSService.speakText({ text: aiResponseText });
          setCurrentTTSMethod('Gemini TTS');
        } catch (error) {
          console.error('Gemini TTS failed:', error);
          setCurrentTTSMethod('failed');
        } finally {
          setIsSpeaking(false);
        }
      }
      
    } catch (error) {
      console.error('Failed to process voice input:', error);
      const errorMessage: UnifiedMessage = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I\'m having trouble processing your voice input right now.',
        sender: 'eliza',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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

    // Store user message
    await conversationPersistence.storeMessage(userMessage.content, 'user', {
      inputType: 'text'
    });

    try {
      // Use UnifiedElizaService directly for Gemini AI response
      const aiResponseText = await UnifiedElizaService.generateResponse(userMessage.content, {
        miningStats: miningStats || undefined,
        userContext: userContext || undefined,
        inputMode: inputMode
      });

      setCurrentAIMethod('Gemini AI');

      const elizaMessage: UnifiedMessage = {
        id: `eliza-${Date.now()}`,
        content: aiResponseText,
        sender: 'eliza',
        timestamp: new Date(),
        confidence: 0.95
      };

      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(aiResponseText);
      
      // Store Eliza's response
      await conversationPersistence.storeMessage(aiResponseText, 'eliza', {
        confidence: 0.95,
        method: 'Gemini AI',
        inputType: 'text'
      });

      // Speak response if voice is enabled using Gemini TTS directly
      if (voiceEnabled && geminiTTSService) {
        try {
          setIsSpeaking(true);
          await geminiTTSService.speakText({ text: aiResponseText });
          setCurrentTTSMethod('Gemini TTS');
        } catch (error) {
          console.error('Gemini TTS failed:', error);
          setCurrentTTSMethod('failed');
        } finally {
          setIsSpeaking(false);
        }
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: UnifiedMessage = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I\'m having trouble processing your message right now.',
        sender: 'eliza',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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
    <Card className={`bg-card/50 backdrop-blur-sm border border-border/50 flex flex-col h-[500px] sm:h-[600px] ${className}`}>
      {/* Simplified Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AdaptiveAvatar
              apiKey={apiKey}
              className="h-8 w-8 sm:h-10 sm:w-10"
              size="sm"
              enableVoice={voiceEnabled}
            />
            <div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Eliza AI</h3>
              <p className="text-xs text-muted-foreground">Your XMRT Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Simplified Mode Toggle */}
            <Button
              onClick={() => setInputMode(inputMode === 'text' ? 'voice' : 'text')}
              variant="ghost"
              size="sm"
              className="text-xs gap-2"
            >
              {inputMode === 'text' ? '🎤' : '💬'}
              {inputMode === 'text' ? 'Voice' : 'Text'}
            </Button>

            {/* Voice Toggle */}
            <Button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              variant="ghost"
              size="sm"
              className={voiceEnabled ? 'text-primary' : 'text-muted-foreground'}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Clean Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[75%] p-3 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted/50 text-foreground rounded-bl-md'
                  }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-60 mt-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-muted/50 text-foreground p-3 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Streamlined Input Area */}
      <div className="border-t border-border/50 bg-background/50">
        {inputMode === 'voice' ? (
          <div className="p-4">
            <MobileVoiceInterface
              onTranscript={handleVoiceInput}
              isProcessing={isProcessing}
              disabled={!voiceEnabled}
            />
          </div>
        ) : (
          <div className="p-4">
            <div className="flex gap-3">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Eliza anything..."
                className="flex-1 rounded-full border-border/50 bg-background/50 min-h-[48px] text-sm px-4"
                disabled={isProcessing || isSpeaking}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!textInput.trim() || isProcessing || isSpeaking}
                size="sm"
                className="rounded-full min-h-[48px] min-w-[48px] hover-scale"
              >
                <Send className="h-4 w-4" />
              </Button>
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