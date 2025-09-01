import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HumeVoiceProvider } from './HumeVoiceProvider';
import { HumeVoiceChat } from './HumeVoiceChat';
import { AdaptiveAvatar } from './AdaptiveAvatar';
import { multimodalGeminiService } from '@/services/multimodalGeminiService';
import { contextManager } from '@/services/contextManager';
import { xmrtKnowledge } from '@/data/xmrtKnowledgeBase';
import { Send, Mic, MicOff, Sparkles, Heart } from 'lucide-react';

interface ConversationMessage {
  id: string;
  content: string;
  sender: 'user' | 'eliza';
  timestamp: Date;
  emotion?: string;
  confidence?: number;
  isVoice?: boolean;
}

interface ConversationalChatProps {
  apiKey?: string;
  className?: string;
  miningStats?: any;
}

export const ConversationalChat: React.FC<ConversationalChatProps> = ({
  apiKey,
  className = '',
  miningStats
}) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [userIP, setUserIP] = useState<string>('');
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcoming message
  useEffect(() => {
    const welcomeMessage: ConversationMessage = {
      id: 'welcome',
      content: "Hi there! I'm Eliza, your AI companion for the XMRT-DAO ecosystem. I can see, hear, and understand context to help you with mobile mining, privacy technology, and decentralized governance. How can I assist you today?",
      sender: 'eliza',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);

    // Auto-focus input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const formatHashrate = (hashrate: number): string => {
    if (hashrate >= 1000000) {
      return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    } else if (hashrate >= 1000) {
      return `${(hashrate / 1000).toFixed(2)} KH/s`;
    }
    return `${hashrate.toFixed(2)} H/s`;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      content: inputText,
      sender: 'user',
      timestamp: new Date(),
      isVoice: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      await processMessage(inputText, false);
    } catch (error) {
      console.error('Failed to process message:', error);
      await addFallbackResponse();
    } finally {
      setIsProcessing(false);
    }
  };

  const processMessage = async (text: string, isVoice: boolean) => {
    try {
      // Analyze context using XMRT knowledge
      const xmrtContext = await contextManager.analyzeContext(text, miningStats);
      
      // Build enhanced context
      const miningContext = miningStats ? `
Current Mining Status:
- Hashrate: ${formatHashrate(miningStats.hash)}
- Status: ${miningStats.isOnline ? 'Active' : 'Offline'}
- Valid Shares: ${miningStats.validShares.toLocaleString()}
- Amount Due: ${(miningStats.amtDue / 1000000000000).toFixed(6)} XMR
      ` : '';

      const contextPrompt = `
You are Eliza, the empathetic AI companion for XMRT-DAO. Keep responses conversational, warm, and helpful.

XMRT-DAO Philosophy:
- Mobile Mining Democracy: Making crypto accessible through smartphones
- Privacy as a Right: Financial privacy for everyone
- AI-Human Collaboration: Working together respectfully
- Sustainable Innovation: Technology that empowers people

${miningContext}

${xmrtContext.knowledgeEntries ? 
  `Relevant XMRT Knowledge:\n${xmrtContext.knowledgeEntries.map(entry => `• ${entry.topic}: ${entry.content.substring(0, 150)}...`).join('\n')}` 
  : ''}

Response Style: ${isVoice ? 'Spoken conversation (natural, flowing)' : 'Text chat (friendly, informative)'}
Keep responses under 150 words unless explaining complex topics.
`;

      const response = await multimodalGeminiService.processMultimodalInput({
        text: text,
        emotionalContext: {
          facialExpression: currentEmotion,
          confidenceLevel: 0.8
        }
      }, {
        contextPrompt,
        mode: isVoice ? 'voice_conversation' : 'text_chat'
      });

      const elizaMessage: ConversationMessage = {
        id: `eliza-${Date.now()}`,
        content: response.text || "I understand what you're asking about. Let me help you with that.",
        sender: 'eliza',
        timestamp: new Date(),
        emotion: response.emotionalAnalysis?.detectedMood,
        confidence: response.emotionalAnalysis?.confidence,
        isVoice: isVoice
      };

      setMessages(prev => [...prev, elizaMessage]);
      
    } catch (error) {
      throw error;
    }
  };

  const addFallbackResponse = async () => {
    const fallbackMessage: ConversationMessage = {
      id: `fallback-${Date.now()}`,
      content: "I'm here to help with XMRT-DAO questions about mobile mining, privacy technology, and our decentralized ecosystem. Could you try rephrasing your question?",
      sender: 'eliza',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, fallbackMessage]);
  };

  const handleVoiceTranscript = async (transcript: string, isFinal: boolean) => {
    if (!isFinal || !transcript.trim() || isProcessing) return;

    const userMessage: ConversationMessage = {
      id: `voice-user-${Date.now()}`,
      content: transcript,
      sender: 'user',
      timestamp: new Date(),
      isVoice: true
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      await processMessage(transcript, true);
    } catch (error) {
      console.error('Failed to process voice input:', error);
      await addFallbackResponse();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmotionDetected = (emotion: string, confidence: number) => {
    setCurrentEmotion(emotion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <HumeVoiceProvider>
      <Card className={`flex flex-col h-[600px] overflow-hidden bg-gradient-to-br from-card/50 to-secondary/30 backdrop-blur-sm border-border/50 ${className}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <AdaptiveAvatar 
                size="md"
                className="ring-2 ring-primary/20"
              />
              {currentEmotion && (
                <div className="absolute -top-1 -right-1">
                  <Heart className="h-3 w-3 text-primary animate-pulse" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Eliza</h3>
              <p className="text-xs text-muted-foreground">Your XMRT-DAO AI Companion</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentEmotion && (
              <Badge variant="secondary" className="text-xs">
                {currentEmotion}
              </Badge>
            )}
            <Button
              variant={isVoiceEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className="gap-2"
            >
              {isVoiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {isVoiceEnabled ? 'Voice On' : 'Voice Off'}
              </span>
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-fade-in ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {message.sender === 'eliza' && (
                  <div className="flex-shrink-0">
                    <AdaptiveAvatar 
                      size="sm"
                      className="ring-1 ring-primary/10"
                    />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-secondary/80 text-secondary-foreground'
                  } ${message.isVoice ? 'relative overflow-hidden' : ''}`}
                >
                  {message.isVoice && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-2 text-xs opacity-70">
                    <span>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.isVoice && (
                      <div className="flex items-center gap-1">
                        <Mic className="h-3 w-3" />
                        <span>voice</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isProcessing && (
              <div className="flex gap-3 animate-fade-in">
                <AdaptiveAvatar size="sm" className="ring-1 ring-primary/10" />
                <div className="bg-secondary/80 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">Eliza is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Voice Chat Integration */}
        {isVoiceEnabled && (
          <div className="px-4 py-2 border-t border-border/50 bg-background/50">
            <HumeVoiceChat
              className="border-0 shadow-none bg-transparent p-0"
              onEmotionDetected={handleEmotionDetected}
              onTranscriptUpdate={handleVoiceTranscript}
              isEnabled={isVoiceEnabled}
              miningStats={miningStats}
            />
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isVoiceEnabled ? "Type or speak your message..." : "Type your message..."}
              className="flex-1 rounded-xl border-border/50 bg-background/50 focus:ring-2 focus:ring-primary/20"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isProcessing}
              size="icon"
              className="rounded-xl shrink-0 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isProcessing ? (
                <Sparkles className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </HumeVoiceProvider>
  );
};