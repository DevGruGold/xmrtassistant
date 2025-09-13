import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { AdaptiveAvatar } from './AdaptiveAvatar';
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
  sender: 'user' | 'assistant';
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
  const [conversationSummaries, setConversationSummaries] = useState<Array<{ summaryText: string; messageCount: number; createdAt: Date }>>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [totalMessageCount, setTotalMessageCount] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // Always connected for text/TTS mode

  // Voice/TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [geminiTTSService, setGeminiTTSService] = useState<GeminiTTSService | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // Default to enabled
  const [currentAIMethod, setCurrentAIMethod] = useState<string>('');
  const [currentTTSMethod, setCurrentTTSMethod] = useState<string>('');

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

        // Initialize conversation persistence with optimized loading
        try {
          await conversationPersistence.initializeSession();
          
          // Load conversation context (summaries + recent messages only)
          const context = await conversationPersistence.getConversationContext(10);
          
          if (context.recentMessages.length > 0 || context.summaries.length > 0) {
            const convertedMessages: UnifiedMessage[] = context.recentMessages.map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender,
              timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
              ...msg.metadata
            }));
            
            setMessages(convertedMessages);
            setConversationSummaries(context.summaries);
            setHasMoreMessages(context.hasMoreMessages);
            setTotalMessageCount(context.totalMessageCount);
            
            console.log(`Loaded ${convertedMessages.length} recent messages, ${context.summaries.length} summaries. Total: ${context.totalMessageCount} messages.`);
          }
        } catch (error) {
          console.log('Conversation persistence temporarily disabled:', error);
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
    if (userContext && messages.length === 0 && conversationSummaries.length === 0) {
      generateAIGreeting();
    }
  }, [userContext, messages.length, conversationSummaries.length]);

  const generateAIGreeting = async () => {
    setIsProcessing(true);
    try {
      const greetingPrompt = userContext?.isFounder 
        ? "Generate a personalized greeting for the founder of XMRT-DAO"
        : "Generate a welcoming introduction to XMRT-DAO for a new user";
        
        const responseText = await UnifiedElizaService.generateResponse(greetingPrompt, {
        miningStats: miningStats,
        userContext: userContext
      });
      
      const greeting: UnifiedMessage = {
        id: 'greeting',
        content: responseText,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages([greeting]);
      setLastElizaMessage(responseText);
      
        // Store greeting in persistent storage
        try {
          await conversationPersistence.storeMessage(responseText, 'assistant', {
            type: 'greeting'
          });
        } catch (error) {
          console.log('Conversation persistence error:', error);
        }
    } catch (error) {
      console.error('Failed to generate AI greeting:', error);
      // Minimal fallback only if AI completely fails
      const fallback: UnifiedMessage = {
        id: 'greeting',
        content: "Hello! I'm Eliza, your XMRT-DAO AI assistant. How can I help you today?",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages([fallback]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load more messages for pagination
  const loadMoreMessages = async () => {
    if (loadingMoreMessages || !hasMoreMessages) return;
    
    setLoadingMoreMessages(true);
    try {
      const moreMessages = await conversationPersistence.loadMoreMessages(messages.length, 20);
      if (moreMessages.length > 0) {
        const convertedMessages: UnifiedMessage[] = moreMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
          ...msg.metadata
        }));
        
        // Prepend older messages to the beginning
        setMessages(prev => [...convertedMessages, ...prev]);
      }
      
      // Check if there are more messages
      const currentTotal = messages.length + moreMessages.length;
      setHasMoreMessages(currentTotal < totalMessageCount);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMoreMessages(false);
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
        hashRate: data.hash || 0,
        validShares: data.validShares || 0,
        totalHashes: data.totalHashes || 0,
        amountDue: (data.amtDue || 0) / 1000000000000,
        amountPaid: (data.amtPaid || 0) / 1000000000000,
        isOnline: data.lastHash > (Date.now() / 1000) - 300,
        lastUpdate: new Date()
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
    return unifiedDataService.formatMiningStats({ hashRate: hashrate } as MiningStats).split('\n')[1] || `${hashrate} H/s`;
  };

  // Unified response display with intelligent TTS control
  const displayResponse = async (responseText: string, shouldSpeak: boolean = false) => {
    const elizaMessage: UnifiedMessage = {
      id: `eliza-${Date.now()}`,
      content: responseText,
      sender: 'assistant',
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
    try {
      await conversationPersistence.storeMessage(transcript, 'user', {
        emotion: currentEmotion,
        confidence: emotionConfidence,
        inputType: 'voice'
      });
    } catch (error) {
      console.log('Conversation persistence error:', error);
    }

    try {
      // Store voice messages
      await conversationPersistence.storeMessage(
        transcript,
        'user'
      );
      
      const response = await UnifiedElizaService.generateResponse(transcript, {
        miningStats,
        userContext,
        inputMode: 'voice',
        shouldSpeak: true,
        enableBrowsing: true
      });
      
      await conversationPersistence.storeMessage(
        response,
        'assistant'
      );

      const elizaMessage: UnifiedMessage = {
        id: `eliza-${Date.now()}`,
        content: response,
        sender: 'assistant',
        timestamp: new Date(),
        confidence: 0.95
      };

      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(response);
      
      // Store Eliza's response
      try {
        await conversationPersistence.storeMessage(response, 'assistant', {
          confidence: 0.95,
          method: 'Gemini AI',
          inputType: 'voice'
        });
      } catch (error) {
        console.log('Conversation persistence error:', error);
      }

      // Speak response using Gemini TTS directly
      if (voiceEnabled && geminiTTSService) {
        try {
          setIsSpeaking(true);
          
          // Add small delay in voice mode to let speech recognition settle
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await geminiTTSService.speakText({ text: response });
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
        sender: 'assistant',
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
    try {
      await conversationPersistence.storeMessage(userMessage.content, 'user', {
        inputType: 'text'
      });
    } catch (error) {
      console.log('Conversation persistence error:', error);
    }

    try {
      // Store messages
      await conversationPersistence.storeMessage(
        textInput.trim(),
        'user'
      );
      
      const response = await UnifiedElizaService.generateResponse(textInput.trim(), {
        miningStats,
        userContext,
        inputMode: 'text',
        shouldSpeak: false,
        enableBrowsing: true
      });
      
      await conversationPersistence.storeMessage(
        response,
        'assistant'
      );

      const elizaMessage: UnifiedMessage = {
        id: `eliza-${Date.now()}`,
        content: response,
        sender: 'assistant',
        timestamp: new Date(),
        confidence: 0.95
      };

      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(response);
      
      // Store Eliza's response
      try {
        await conversationPersistence.storeMessage(response, 'assistant', {
          confidence: 0.95,
          method: 'Gemini AI',
          inputType: 'text'
        });
      } catch (error) {
        console.log('Conversation persistence error:', error);
      }

      // Speak response if voice is enabled using Gemini TTS directly
      if (voiceEnabled && geminiTTSService) {
        try {
          setIsSpeaking(true);
          await geminiTTSService.speakText({ text: response });
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
        sender: 'assistant',
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
            {/* Load More Messages Button */}
            {hasMoreMessages && (
              <div className="flex justify-center">
                <Button
                  onClick={loadMoreMessages}
                  disabled={loadingMoreMessages}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {loadingMoreMessages ? 'Loading...' : `Load More (${totalMessageCount - messages.length} older messages)`}
                </Button>
              </div>
            )}
            
            {/* Conversation Summary Display */}
            {conversationSummaries.length > 0 && messages.length > 0 && (
              <div className="bg-muted/30 border border-border/30 rounded-lg p-3 mb-4">
                <div className="text-xs text-muted-foreground mb-2">Previous conversation summary:</div>
                <div className="text-xs leading-relaxed">
                  {conversationSummaries[conversationSummaries.length - 1]?.summaryText}
                </div>
              </div>
            )}
            
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
                    {message.timestamp instanceof Date 
                      ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
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

      {/* Text Input Area */}
      <div className="border-t border-border/50 bg-background/50">
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
      </div>
    </Card>
  );
};

// External wrapper - no longer needs Hume provider
export const UnifiedChat: React.FC<UnifiedChatProps> = (props) => {
  return <UnifiedChatInner {...props} />;
};

export default UnifiedChat;