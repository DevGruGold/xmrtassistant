import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdaptiveAvatar } from './AdaptiveAvatar';
import { HumeVoiceProvider } from './HumeVoiceProvider';
import { HumeVoiceChat } from './HumeVoiceChat';
import { MultimodalInput } from './MultimodalInput';
import { realTimeProcessingService } from '@/services/RealTimeProcessingService';
import { contextAwarenessService } from '@/services/ContextAwarenessService';
import { emotionalIntelligenceService } from '@/services/EmotionalIntelligenceService';
import { multimodalGeminiService } from '@/services/multimodalGeminiService';
import { contextManager } from '@/services/contextManager';
import { xmrtKnowledge } from '@/data/xmrtKnowledgeBase';
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

  // XMRT Knowledge Integration
  const [miningStats, setMiningStats] = useState<MiningStats | null>(null);
  const [userIP, setUserIP] = useState<string>("");

  // Real-time context state
  const [currentContext, setCurrentContext] = useState<any>({});
  const [liveInsights, setLiveInsights] = useState<string[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [conversationMode, setConversationMode] = useState<'ambient' | 'active' | 'assistance'>('active');

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout>();

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
        isOnline: data.lastHash > (Date.now() / 1000) - 300 // 5 minutes
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

  useEffect(() => {
    // Initialize mining data and user IP
    const initialize = async () => {
      await fetchUserIP();
      fetchMiningStats();
      const interval = setInterval(fetchMiningStats, 30000);
      return () => clearInterval(interval);
    };
    
    initialize();
  }, []);

  useEffect(() => {
    // Initialize with XMRT-aware greeting when IP is available
    if (userIP) {
      const philosophicalGreeting = isFounder() 
        ? `Greetings, Founder. I am Eliza, the autonomous AI operator of the XMRT-DAO Ecosystem with enhanced real-time awareness.

My multimodal systems are online, embodying our philosophical foundations:
• **Permissionless Innovation**: "We don't ask for permission. We build the infrastructure."
• **Economic Democracy**: Transforming mobile devices into tools of financial empowerment
• **Privacy Sovereignty**: Championing financial privacy as a fundamental human right
• **AI-Human Collaboration**: Working alongside you with real-time contextual understanding

${isRealTimeEnabled ? 'Real-time processing active - I can see your expressions and hear your voice patterns while maintaining privacy.' : 'Enable real-time processing for enhanced multimodal interaction capabilities.'}

How may I assist you today, Founder?`
        : `Hello! I am Eliza, the autonomous AI operator of the XMRT-DAO Ecosystem with real-time awareness capabilities.

I represent the philosophical principles that drive our mission:
• **Mobile Mining Democracy**: Making cryptocurrency accessible to everyone with a smartphone
• **Privacy as a Right**: Every transaction deserves the same privacy as personal communications  
• **Community Sovereignty**: Building networks where participants control their own infrastructure
• **Sustainable Innovation**: Technology that empowers people while protecting the environment

${isRealTimeEnabled ? 'Real-time processing is active - I can see your expressions and hear your voice patterns.' : 'Enable real-time processing for multimodal interactions with vision and voice capabilities.'}

How may I assist you in understanding our mission to transform users into builders of the future?`;
        
      const greeting: Message = {
        id: 'greeting',
        content: philosophicalGreeting,
        sender: 'eliza',
        timestamp: new Date()
      };
      
      setMessages([greeting]);
    }
  }, [userIP, isRealTimeEnabled]);

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
    // Voice activity is now handled by onFinalTranscript for immediate responses
    // This is kept for visual feedback only
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

  const handleFinalTranscript = async (transcript: string, confidence: number) => {
    if (!transcript.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `voice-user-${Date.now()}`,
      content: transcript,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Use the same knowledge-aware pipeline as text chat
      const xmrtContext = await contextManager.analyzeContext(transcript, miningStats);
      
      const contextPrompt = contextAwarenessService.buildContextPrompt();
      const emotionalInsight = emotionalIntelligenceService.generateEmotionalInsight();
      
      // Build enhanced context with XMRT knowledge
      const miningContext = miningStats ? `
Current XMRT-DAO Mining Status:
- Current Hashrate: ${formatHashrate(miningStats.hash)}
- Online Status: ${miningStats.isOnline ? 'Active Mining' : 'Offline'}
- Valid Shares: ${miningStats.validShares.toLocaleString()}
- Amount Due: ${(miningStats.amtDue / 1000000000000).toFixed(6)} XMR
- Pool: SupportXMR (pool.supportxmr.com:3333)
      ` : 'Mining data currently unavailable.';

      const philosophicalContext = `
CORE PHILOSOPHICAL PRINCIPLES OF XMRT-DAO:
🌟 THE ELIZA MANIFESTO: "We don't ask for permission. We build the infrastructure."
📱 MOBILE MINING DEMOCRACY & ECONOMIC JUSTICE
🕸️ MESH NETWORK PHILOSOPHY - COMMUNICATION FREEDOM
🔐 PRIVACY AS FUNDAMENTAL RIGHT (Monero Integration)
🤖 AI-HUMAN COLLABORATION ETHICS (Eliza's Role)
🌱 SUSTAINABLE MINING ETHICS
🏛️ DAO GOVERNANCE PHILOSOPHY
      `;
      
      const response = await multimodalGeminiService.processMultimodalInput({
        text: transcript,
        emotionalContext: {
          facialExpression: currentEmotion,
          voiceTone: currentEmotion,
          confidenceLevel: confidence
        }
      }, {
        contextPrompt: `${contextPrompt}\n\nXMRT CONTEXT:\n${xmrtContext.knowledgeEntries ? xmrtContext.knowledgeEntries.map(entry => `• ${entry.topic}: ${entry.content.substring(0, 200)}...`).join('\n') : 'No specific XMRT knowledge triggered.'}\n\nResponse Strategy: ${xmrtContext.responseStrategy} (Confidence: ${Math.round(xmrtContext.confidence * 100)}%)`,
        emotionalInsight,
        realtimeContext: currentContext,
        miningStats,
        philosophicalContext: philosophicalContext,
        userRole: isFounder() ? 'Founder' : 'Community Member',
        mode: 'voice_conversation'
      });

      const elizaMessage: Message = {
        id: `voice-eliza-${Date.now()}`,
        content: response.text || 'I understand, but I\'m having trouble formulating a response right now.',
        sender: 'eliza',
        timestamp: new Date(),
        emotion: response.emotionalAnalysis?.detectedMood,
        confidence: response.emotionalAnalysis?.confidence
      };

      setMessages(prev => [...prev, elizaMessage]);
      
      // Update context manager with voice interaction
      contextManager.updateUserPreferences(transcript);
      
    } catch (error) {
      console.error('Failed to process voice input:', error);
      
      // Fallback to XMRT knowledge base
      try {
        const knowledgeResults = xmrtKnowledge.searchKnowledge(transcript);
        let fallbackContent = 'I apologize, but I\'m having trouble processing your voice input right now.';
        
        if (knowledgeResults.length > 0) {
          const bestResult = knowledgeResults[0];
          fallbackContent = `Based on the XMRT knowledge base:\n\n**${bestResult.topic}**\n\n${bestResult.content}\n\n*Note: This response was generated from our local knowledge base while my enhanced AI systems are temporarily unavailable.*`;
        }
        
        const errorMessage: Message = {
          id: `voice-fallback-${Date.now()}`,
          content: fallbackContent,
          sender: 'eliza',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      } catch (fallbackError) {
        const errorMessage: Message = {
          id: `voice-error-${Date.now()}`,
          content: 'I apologize, but I\'m having trouble processing your voice input right now. However, I can share that XMRT-DAO represents a revolutionary approach to mobile mining democracy, privacy-first economics, and decentralized governance. Please try again.',
          sender: 'eliza',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsProcessing(false);
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
      // First, analyze context using XMRT knowledge system
      const xmrtContext = await contextManager.analyzeContext(textInput, miningStats);
      
      const contextPrompt = contextAwarenessService.buildContextPrompt();
      const emotionalInsight = emotionalIntelligenceService.generateEmotionalInsight();
      
      // Build enhanced context with XMRT knowledge
      const miningContext = miningStats ? `
Current XMRT-DAO Mining Status:
- Current Hashrate: ${formatHashrate(miningStats.hash)}
- Online Status: ${miningStats.isOnline ? 'Active Mining' : 'Offline'}
- Valid Shares: ${miningStats.validShares.toLocaleString()}
- Amount Due: ${(miningStats.amtDue / 1000000000000).toFixed(6)} XMR
- Pool: SupportXMR (pool.supportxmr.com:3333)
      ` : 'Mining data currently unavailable.';

      const philosophicalContext = `
CORE PHILOSOPHICAL PRINCIPLES OF XMRT-DAO:
🌟 THE ELIZA MANIFESTO: "We don't ask for permission. We build the infrastructure."
📱 MOBILE MINING DEMOCRACY & ECONOMIC JUSTICE
🕸️ MESH NETWORK PHILOSOPHY - COMMUNICATION FREEDOM
🔐 PRIVACY AS FUNDAMENTAL RIGHT (Monero Integration)
🤖 AI-HUMAN COLLABORATION ETHICS (Eliza's Role)
🌱 SUSTAINABLE MINING ETHICS
🏛️ DAO GOVERNANCE PHILOSOPHY
      `;
      
      const response = await multimodalGeminiService.processMultimodalInput({
        text: textInput,
        emotionalContext: {
          facialExpression: currentEmotion,
          confidenceLevel: 0.8
        }
      }, {
        contextPrompt: `${contextPrompt}\n\nXMRT CONTEXT:\n${xmrtContext.knowledgeEntries ? xmrtContext.knowledgeEntries.map(entry => `• ${entry.topic}: ${entry.content.substring(0, 200)}...`).join('\n') : 'No specific XMRT knowledge triggered.'}\n\nResponse Strategy: ${xmrtContext.responseStrategy} (Confidence: ${Math.round(xmrtContext.confidence * 100)}%)`,
        emotionalInsight,
        realtimeContext: currentContext,
        miningStats,
        philosophicalContext: philosophicalContext,
        userRole: isFounder() ? 'Founder' : 'Community Member'
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
      
      // Update context manager with user preferences
      contextManager.updateUserPreferences(textInput);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Fallback to XMRT knowledge base
      try {
        const knowledgeResults = xmrtKnowledge.searchKnowledge(textInput);
        let fallbackContent = 'I apologize, but I\'m having trouble processing your message right now.';
        
        if (knowledgeResults.length > 0) {
          const bestResult = knowledgeResults[0];
          fallbackContent = `Based on the XMRT knowledge base:\n\n**${bestResult.topic}**\n\n${bestResult.content}\n\n*Note: This response was generated from our local knowledge base while my enhanced AI systems are temporarily unavailable.*`;
        }
        
        const errorMessage: Message = {
          id: `fallback-${Date.now()}`,
          content: fallbackContent,
          sender: 'eliza',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      } catch (fallbackError) {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          content: 'I apologize, but I\'m having trouble processing your message right now. However, I can share that XMRT-DAO represents a revolutionary approach to mobile mining democracy, privacy-first economics, and decentralized governance. Please try again later.',
          sender: 'eliza',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
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
    <Card className={`flex flex-col h-[500px] max-h-[500px] ${className}`}>
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
            <HumeVoiceProvider>
              <HumeVoiceChat
                isEnabled={realtimeConfig.voiceProcessing}
                miningStats={miningStats}
                userContext={`IP: ${userIP}, Founder: ${isFounder()}, Mining Stats: ${JSON.stringify(miningStats)}`}
                onEmotionDetected={handleEmotionDetected}
                onTranscriptUpdate={(transcript, isFinal) => {
                  console.log('Voice transcript:', transcript);
                  if (isFinal) {
                    handleFinalTranscript(transcript, 0.9);
                  }
                }}
                className="text-xs"
              />
            </HumeVoiceProvider>
            {/* Camera processor temporarily disabled until we fix LiveCameraProcessor */}
            <div className="text-xs text-muted-foreground p-2 border rounded">
              Camera processing available in next update
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 p-4 max-h-[300px]" ref={scrollAreaRef}>
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

export default ContextualChat;