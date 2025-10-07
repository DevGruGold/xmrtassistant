import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { mobilePermissionService } from '@/services/mobilePermissionService';
import { formatTime } from '@/utils/dateFormatter';
import { Send, Volume2, VolumeX, Trash2, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { VoiceProvider } from '@humeai/voice-react';

// Services
import { UnifiedElizaService } from '@/services/unifiedElizaService';
import { unifiedDataService, type MiningStats, type UserContext } from '@/services/unifiedDataService';
import { conversationPersistence } from '@/services/conversationPersistenceService';
import { quickGreetingService } from '@/services/quickGreetingService';
import { apiKeyManager } from '@/services/apiKeyManager';

interface UnifiedMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  emotion?: string;
  confidence?: number;
}

interface UnifiedChatProps {
  apiKey?: string;
  className?: string;
  miningStats?: MiningStats;
}

// Hume Voice configuration
const HUME_CONFIG = {
  auth: {
    type: 'apiKey' as const,
    value: import.meta.env.VITE_HUME_API_KEY || '',
  },
  voice: {
    voiceId: 'b201d214-914c-4d0a-b8e4-54adfc14a0dd', // Specific voice ID requested
  },
};

// Main component with VoiceProvider
const UnifiedChat: React.FC<UnifiedChatProps> = (props) => {
  return (
    <VoiceProvider {...HUME_CONFIG}>
      <UnifiedChatInner {...props} />
    </VoiceProvider>
  );
};

const UnifiedChatInner: React.FC<UnifiedChatProps> = ({
  apiKey = import.meta.env.VITE_GEMINI_API_KEY || "",
  className = '',
  miningStats: externalMiningStats
}) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  
  // State
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [conversationSummaries, setConversationSummaries] = useState<Array<{ summaryText: string; messageCount: number; createdAt: Date }>>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [totalMessageCount, setTotalMessageCount] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Context
  const [miningStats, setMiningStats] = useState<MiningStats | null>(externalMiningStats || null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [lastElizaMessage, setLastElizaMessage] = useState<string>("");

  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice controls
  const handleEnableVoice = () => {
    setVoiceEnabled(true);
    localStorage.setItem('voiceEnabled', 'true');
    toast({
      title: "Voice Enabled",
      description: "Hume AI voice is now active",
    });
  };

  const handleDisableVoice = () => {
    setVoiceEnabled(false);
    localStorage.setItem('voiceEnabled', 'false');
  };

  useEffect(() => {
    const wasEnabled = localStorage.getItem('voiceEnabled') === 'true';
    if (wasEnabled) {
      setVoiceEnabled(true);
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0 && !isProcessing) {
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
        messagesEndRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "nearest",
          inline: "nearest" 
        });
      }, 100);
    }
  }, [messages, isProcessing]);

  // Initialize
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

        try {
          await conversationPersistence.initializeSession();
          const context = await conversationPersistence.getConversationContext(0);
          
          if (context.summaries.length > 0 || context.totalMessageCount > 0) {
            setConversationSummaries(context.summaries);
            setHasMoreMessages(context.totalMessageCount > 0);
            setTotalMessageCount(context.totalMessageCount);
          }
        } catch (error) {
          console.log('Conversation persistence error:', error);
        }

        if (!externalMiningStats) {
          const interval = setInterval(async () => {
            const freshStats = await unifiedDataService.getMiningStats();
            setMiningStats(freshStats);
          }, 30000);
          return () => clearInterval(interval);
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };
    
    initialize();
  }, []);

  // Realtime subscription
  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      if (!userContext?.ip) return;

      channel = supabase
        .channel('autonomous-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'eliza_python_executions',
            filter: `source=eq.python-fixer-agent`
          },
          (payload) => {
            const execution = payload.new;
            if (execution.exit_code === 0 && execution.output) {
              const message: UnifiedMessage = {
                id: `auto-fix-${execution.id}`,
                content: `✅ **Auto-healed Code Result:**\n\n${execution.output}`,
                sender: 'assistant',
                timestamp: new Date(execution.created_at)
              };
              
              setMessages(prev => {
                if (prev.some(m => m.id === message.id)) return prev;
                return [...prev, message];
              });
            }
          }
        )
        .subscribe((status) => {
          setRealtimeConnected(status === 'SUBSCRIBED');
        });
    };

    setupRealtime();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userContext?.ip]);

  // Generate greeting
  useEffect(() => {
    if (userContext && messages.length === 0) {
      const quickGreeting = quickGreetingService.generateQuickGreeting({
        isFounder: userContext?.isFounder,
        conversationSummary: conversationSummaries.length > 0 ? conversationSummaries[conversationSummaries.length - 1].summaryText : undefined,
        totalMessageCount,
        miningStats
      });
      
      const greeting: UnifiedMessage = {
        id: 'quick-greeting',
        content: quickGreeting,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages([greeting]);
      setLastElizaMessage(quickGreeting);
      
      conversationPersistence.storeMessage(quickGreeting, 'assistant', {
        type: 'quick-greeting',
        isReturnUser: conversationSummaries.length > 0,
        totalPreviousMessages: totalMessageCount
      }).catch(console.error);
    }
  }, [userContext, conversationSummaries]);

  // Clear conversation
  const handleClearConversation = async () => {
    if (!confirm('Clear conversation history?')) return;

    try {
      await conversationPersistence.clearConversationHistory();
      setMessages([]);
      setConversationSummaries([]);
      setHasMoreMessages(false);
      setTotalMessageCount(0);
      setLastElizaMessage('');
      
      if (userContext) {
        const greeting: UnifiedMessage = {
          id: 'fresh-greeting',
          content: "Hello! I'm Eliza.",
          sender: 'assistant',
          timestamp: new Date()
        };
        
        setMessages([greeting]);
        setLastElizaMessage(greeting.content);
        await conversationPersistence.storeMessage(greeting.content, 'assistant', {
          type: 'fresh-start-greeting'
        });
      }
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    const trimmedInput = textInput.trim();
    if (!trimmedInput || isProcessing) return;

    const userMessage: UnifiedMessage = {
      id: `user-${Date.now()}`,
      content: textInput,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setIsProcessing(true);

    await conversationPersistence.storeMessage(trimmedInput, 'user', {
      source: 'text'
    }).catch(console.error);

    try {
      const response = await UnifiedElizaService.generateResponse(trimmedInput, {
        miningStats: miningStats || undefined,
        userContext: userContext || undefined,
        conversationSummary: conversationSummaries.length > 0 
          ? conversationSummaries.map(s => s.summaryText).join('\n---\n')
          : undefined
      });

      const elizaMessage: UnifiedMessage = {
        id: `eliza-${Date.now()}`,
        content: response,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(response);

      await conversationPersistence.storeMessage(response, 'assistant', {
        method: 'Hume AI'
      }).catch(console.error);
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: UnifiedMessage = {
        id: `error-${Date.now()}`,
        content: 'I encountered an error.',
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

  const toggleVoice = () => {
    if (!voiceEnabled) {
      handleEnableVoice();
    } else {
      handleDisableVoice();
    }
  };

  const loadMoreMessages = async () => {
    if (loadingMoreMessages || !hasMoreMessages) return;
    
    setLoadingMoreMessages(true);
    try {
      const recentMessages = await conversationPersistence.getRecentConversationHistory(20);
      if (recentMessages.length > 0) {
        const convertedMessages: UnifiedMessage[] = recentMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
        }));
        
        setMessages(prev => {
          const greeting = prev.find(msg => msg.id === 'greeting');
          return greeting ? [greeting, ...convertedMessages] : convertedMessages;
        });
      }
      
      setHasMoreMessages(recentMessages.length >= 20 && recentMessages.length < totalMessageCount);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  return (
    <Card className={`flex flex-col h-[600px] w-full max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>E</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-foreground">Eliza</h2>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                Online
              </Badge>
              {realtimeConnected && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  Live
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">Hume AI</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVoice}
            className="flex items-center gap-2"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
          </Button>
          
          {hasMoreMessages && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadMoreMessages}
              disabled={loadingMoreMessages}
            >
              {loadingMoreMessages ? 'Loading...' : `History (${totalMessageCount})`}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearConversation}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
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
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {message.content}
                </div>
                <div className="text-xs mt-1 opacity-70">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-muted text-foreground rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/50 bg-background/50">
        <div className="p-4">
          <div className="flex gap-3">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isProcessing}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!textInput.trim() || isProcessing}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UnifiedChat;
