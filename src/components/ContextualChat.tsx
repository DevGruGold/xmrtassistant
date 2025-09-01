import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdaptiveAvatar } from './AdaptiveAvatar';
import { LiveVoiceProcessor } from './LiveVoiceProcessor';
import { LiveCameraProcessor } from './LiveCameraProcessor';
import { MultimodalInput } from './MultimodalInput';
import { realTimeProcessingService } from '@/services/RealTimeProcessingService';
import { contextAwarenessService } from '@/services/ContextAwarenessService';
import { emotionalIntelligenceService } from '@/services/EmotionalIntelligenceService';
import { multimodalGeminiService } from '@/services/multimodalGeminiService';
import { Send, Settings, Eye, Mic, Brain, Activity } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'eliza';
  timestamp: Date;
  context?: any;
  emotion?: string;
  confidence?: number;
}

interface ContextualChatProps {
  apiKey?: string;
  className?: string;
}

export const ContextualChat: React.FC<ContextualChatProps> = ({
  apiKey,
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [realtimeConfig, setRealtimeConfig] = useState({
    voiceProcessing: true,
    videoProcessing: true,
    emotionAnalysis: true,
    ambientMode: false
  });

  // Real-time context state
  const [currentContext, setCurrentContext] = useState<any>({});
  const [liveInsights, setLiveInsights] = useState<string[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [conversationMode, setConversationMode] = useState<'ambient' | 'active' | 'assistance'>('active');

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Initialize with greeting message
    const greeting: Message = {
      id: 'greeting',
      content: `Hello! I'm Eliza, your AI assistant with real-time awareness. I can see and hear you continuously when enabled, allowing me to provide more contextual and empathetic responses.

${isRealTimeEnabled ? 'Real-time processing is active - I can see your expressions and hear your voice patterns.' : 'Enable real-time processing to allow me to see and hear you continuously.'}`,
      sender: 'eliza',
      timestamp: new Date()
    };
    
    setMessages([greeting]);
  }, [isRealTimeEnabled]);

  useEffect(() => {
    if (isRealTimeEnabled) {
      initializeRealTimeProcessing();
    } else {
      stopRealTimeProcessing();
    }

    return () => {
      stopRealTimeProcessing();
    };
  }, [isRealTimeEnabled, realtimeConfig]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeRealTimeProcessing = async () => {
    try {
      // Update real-time processing configuration
      realTimeProcessingService.updateConfig(realtimeConfig);
      
      // Start continuous processing
      await realTimeProcessingService.startContinuousProcessing();

      // Subscribe to real-time events
      const unsubscribers = [
        realTimeProcessingService.subscribe('emotion_detected', handleEmotionDetected),
        realTimeProcessingService.subscribe('voice_activity_changed', handleVoiceActivity),
        realTimeProcessingService.subscribe('visual_context_updated', handleVisualContext)
      ];

      // Store unsubscribers for cleanup
      (window as any).realtimeUnsubscribers = unsubscribers;

    } catch (error) {
      console.error('Failed to initialize real-time processing:', error);
    }
  };

  const stopRealTimeProcessing = () => {
    realTimeProcessingService.stopContinuousProcessing();
    
    // Clean up subscriptions
    if ((window as any).realtimeUnsubscribers) {
      (window as any).realtimeUnsubscribers.forEach((unsub: () => void) => unsub());
      delete (window as any).realtimeUnsubscribers;
    }
  };

  const handleEmotionDetected = (data: any) => {
    setCurrentEmotion(data.emotion);
    
    // Generate contextual response based on emotion change
    if (conversationMode === 'ambient' && data.confidence > 0.8) {
      generateAmbientResponse(data);
    }
  };

  const handleVoiceActivity = (data: any) => {
    // Clear previous processing timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    if (data.isActive && data.confidence > 0.7) {
      setIsProcessing(true);
      
      // Auto-respond after voice activity ends
      processingTimeoutRef.current = setTimeout(() => {
        if (conversationMode === 'active') {
          generateVoiceResponse(data);
        }
        setIsProcessing(false);
      }, 2000);
    }
  };

  const handleVisualContext = (data: any) => {
    setCurrentContext(prev => ({ ...prev, visual: data }));
  };

  const handleContextUpdate = (context: any) => {
    setCurrentContext(context);
    
    // Update insights
    const insights = contextAwarenessService.getRecentInsights(3);
    setLiveInsights(insights);
  };

  const generateAmbientResponse = async (emotionData: any) => {
    if (!apiKey) return;

    try {
      const contextPrompt = contextAwarenessService.buildContextPrompt();
      const emotionalInsight = emotionalIntelligenceService.generateEmotionalInsight();
      
      const response = await multimodalGeminiService.processMultimodalInput({
        text: `Ambient emotional state change detected: ${emotionData.emotion} (confidence: ${emotionData.confidence})`,
        emotionalContext: {
          facialExpression: emotionData.emotion,
          confidenceLevel: emotionData.confidence
        }
      }, {
        contextPrompt,
        emotionalInsight,
        mode: 'ambient'
      });

      if (response.text) {
        const ambientMessage: Message = {
          id: `ambient-${Date.now()}`,
          content: response.text,
          sender: 'eliza',
          timestamp: new Date(),
          emotion: emotionData.emotion,
          confidence: emotionData.confidence
        };

        setMessages(prev => [...prev, ambientMessage]);
      }
    } catch (error) {
      console.error('Failed to generate ambient response:', error);
    }
  };

  const generateVoiceResponse = async (voiceData: any) => {
    if (!apiKey) return;

    try {
      const contextPrompt = contextAwarenessService.buildContextPrompt();
      
      const response = await multimodalGeminiService.processMultimodalInput({
        text: 'User voice activity detected - provide contextual response',
        emotionalContext: {
          voiceTone: currentEmotion,
          confidenceLevel: voiceData.confidence
        }
      }, {
        contextPrompt,
        mode: 'voice_responsive'
      });

      if (response.text) {
        const voiceMessage: Message = {
          id: `voice-${Date.now()}`,
          content: response.text,
          sender: 'eliza',
          timestamp: new Date(),
          context: voiceData
        };

        setMessages(prev => [...prev, voiceMessage]);
      }
    } catch (error) {
      console.error('Failed to generate voice response:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!textInput.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: textInput,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setIsProcessing(true);

    try {
      const contextPrompt = contextAwarenessService.buildContextPrompt();
      const emotionalInsight = emotionalIntelligenceService.generateEmotionalInsight();
      
      const response = await multimodalGeminiService.processMultimodalInput({
        text: textInput,
        emotionalContext: {
          facialExpression: currentEmotion,
          confidenceLevel: 0.8
        }
      }, {
        contextPrompt,
        emotionalInsight,
        realtimeContext: currentContext
      });

      const elizaMessage: Message = {
        id: `eliza-${Date.now()}`,
        content: response.text || 'I understand, but I\'m having trouble formulating a response right now.',
        sender: 'eliza',
        timestamp: new Date(),
        emotion: response.emotionalAnalysis?.detectedMood,
        confidence: response.emotionalAnalysis?.confidence
      };

      setMessages(prev => [...prev, elizaMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I\'m having trouble processing your message right now. Please try again.',
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

  return (
    <Card className={`flex flex-col h-[600px] ${className}`}>
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AdaptiveAvatar 
              apiKey={apiKey}
              size="md"
              enableVoice={realtimeConfig.voiceProcessing}
              enableVisualMode={realtimeConfig.videoProcessing}
            />
            <div>
              <h3 className="text-lg font-semibold">Eliza - Real-time AI</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={isRealTimeEnabled ? "default" : "secondary"} className="text-xs">
                  {isRealTimeEnabled ? 'Real-time Active' : 'Text Only'}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {conversationMode}
                </Badge>
                {currentEmotion !== 'neutral' && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {currentEmotion}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Real-time Processing Controls */}
      {isRealTimeEnabled && (
        <div className="px-4 pb-3 border-b">
          <div className="grid grid-cols-2 gap-4">
            <LiveVoiceProcessor
              onTranscriptionUpdate={(transcript) => console.log('Live transcript:', transcript)}
              onEmotionDetected={handleEmotionDetected}
              onVoiceActivityChange={handleVoiceActivity}
              isEnabled={realtimeConfig.voiceProcessing}
              className="text-xs"
            />
            <LiveCameraProcessor
              onEmotionDetected={handleEmotionDetected}
              onVisualContextUpdate={handleVisualContext}
              isEnabled={realtimeConfig.videoProcessing}
              className="text-xs"
            />
          </div>
        </div>
      )}

      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.emotion && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {message.emotion}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-secondary text-secondary-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span className="text-xs text-muted-foreground">Processing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Input Area */}
        <div className="p-4 space-y-3">
          {/* Real-time Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="realtime-mode"
                checked={isRealTimeEnabled}
                onCheckedChange={setIsRealTimeEnabled}
              />
              <Label htmlFor="realtime-mode" className="text-sm">
                Real-time Processing
              </Label>
            </div>
            
            {/* Live Insights */}
            {liveInsights.length > 0 && (
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">
                  {liveInsights.length} insights
                </div>
              </div>
            )}
          </div>

          {/* Text Input */}
          <div className="flex space-x-2">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="min-h-[80px] resize-none"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!textInput.trim() || isProcessing}
              size="sm"
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};