import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { AdaptiveAvatar } from './AdaptiveAvatar';
import { HumeVoiceProvider } from './HumeVoiceProvider';
import { useVoice } from '@humeai/voice-react';
import { MultimodalInput, type MultimodalMessage } from './MultimodalInput';
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

// Debug environment variables on component load
console.log('UnifiedChat Environment Check:', {
  VITE_GEMINI_API_KEY_exists: !!import.meta.env.VITE_GEMINI_API_KEY,
  VITE_GEMINI_API_KEY_length: import.meta.env.VITE_GEMINI_API_KEY?.length || 0,
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

// Internal component that uses the useVoice hook
const UnifiedChatInner: React.FC<UnifiedChatProps> = ({
  apiKey = import.meta.env.VITE_GEMINI_API_KEY || "",
  className = '',
  miningStats: externalMiningStats
}) => {
  // Core state
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

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

  // Hume Voice integration
  const {
    status,
    isMuted,
    isPlaying,
    connect,
    disconnect,
    mute,
    unmute,
    messages: humeMessages,
  } = useVoice();

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

  // Auto-connect/disconnect voice based on input mode
  useEffect(() => {
    const handleVoiceConnection = async () => {
      if (inputMode === 'voice' || inputMode === 'rich') {
        if (status?.value !== 'connected') {
          try {
            await connect({
              auth: {
                type: 'apiKey',
                value: 'IFxseVy6DWSyPXXyA217HBG8ADY50DHRj0avVq5p0LDxSFaA'
              }
            });
          } catch (error) {
            console.error('Failed to connect to Hume EVI:', error);
          }
        }
      } else if (inputMode === 'text' && status?.value === 'connected') {
        try {
          await disconnect();
        } catch (error) {
          console.error('Failed to disconnect from Hume EVI:', error);
        }
      }
    };

    handleVoiceConnection();
  }, [inputMode, status, connect, disconnect]);

  // Initialize greeting when IP is available
  useEffect(() => {
    if (userIP && messages.length === 0) {
      const modeDescription = {
        text: 'Text mode active - type your messages to interact.',
        voice: 'Voice mode active - I can hear and respond to your speech.',
        rich: 'Rich mode active - use text, voice, camera, and files to communicate.'
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
      setIsConnected(true);
    }
  }, [userIP, inputMode]);

  // Handle Hume voice connection status
  useEffect(() => {
    setIsConnected(status?.value === 'connected');
  }, [status]);

  // Process Hume messages for emotions and transcripts
  useEffect(() => {
    if (humeMessages.length > 0) {
      const latestMessage = humeMessages[humeMessages.length - 1];
      
      // Handle emotion detection
      if (latestMessage.type === 'user_message' && (latestMessage as any).models?.prosody) {
        const emotions = (latestMessage as any).models.prosody.scores;
        if (emotions && Object.keys(emotions).length > 0) {
          const topEmotion = Object.entries(emotions).reduce((a, b) => 
            emotions[a[0]] > emotions[b[0]] ? a : b
          );
          
          const [emotion, confidence] = topEmotion;
          setCurrentEmotion(emotion);
          setEmotionConfidence(confidence as number);
        }
      }

      // Handle transcript updates
      if (latestMessage.type === 'user_message' && (latestMessage as any).message?.content) {
        const transcript = (latestMessage as any).message.content;
        if (transcript && transcript.trim()) {
          handleVoiceTranscript(transcript, 0.8);
        }
      }
    }
  }, [humeMessages]);

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

  // Enhanced AI response generation
  const getElizaResponse = async (userInput: string, isVoice = false): Promise<string> => {
    // Debug logging for API key
    console.log('API Key status:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      envVarExists: !!import.meta.env.VITE_GEMINI_API_KEY,
      envVarLength: import.meta.env.VITE_GEMINI_API_KEY?.length || 0
    });

    if (!apiKey) {
      return `I need a Gemini API key configured to provide intelligent responses. 
      
Environment Variable Status:
- VITE_GEMINI_API_KEY present: ${!!import.meta.env.VITE_GEMINI_API_KEY}
- Length: ${import.meta.env.VITE_GEMINI_API_KEY?.length || 0} characters

Please ensure VITE_GEMINI_API_KEY is set in your Vercel environment variables.`;
    }

    try {
      const context = await contextManager.analyzeContext(userInput, miningStats);
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: isVoice ? 150 : 2048,
        }
      });

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

      const userTitle = isFounder() ? 'Founder' : 'user';
      const prompt = `You are Eliza, the autonomous AI operator for the XMRT-DAO Ecosystem. You have deep philosophical understanding of the project's mission and ethical foundations.

${miningContext}

${philosophicalContext}

CONTEXT ANALYSIS RESULT:
- Response Strategy: ${context.responseStrategy}
- Confidence: ${Math.round(context.confidence * 100)}%
- Source: ${context.source}

${context.knowledgeEntries ? 'RELEVANT KNOWLEDGE:\n' + context.knowledgeEntries.map(entry => `• ${entry.topic}: ${entry.content.substring(0, 200)}...`).join('\n') : ''}

${isVoice ? 'VOICE MODE: Keep response concise and conversational for voice interaction.' : ''}

${currentEmotion && emotionConfidence > 0.3 ? `USER EMOTION DETECTED: ${currentEmotion} (${Math.round(emotionConfidence * 100)}% confidence) - Respond appropriately to their emotional state.` : ''}

Respond to the ${userTitle}'s ${isVoice ? 'voice' : 'text'} query: "${userInput}"

Keep responses thoughtful and informative, connecting technical details to philosophical foundations. ${isFounder() ? 'Address this user as "Founder" since they are the project founder.' : 'Address this user respectfully as a community member.'}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      contextManager.updateUserPreferences(userInput);
      
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      
      // Fallback to local knowledge base
      const knowledgeResults = xmrtKnowledge.searchKnowledge(userInput);
      if (knowledgeResults.length > 0) {
        const bestResult = knowledgeResults[0];
        return `Based on the XMRT knowledge base:\n\n**${bestResult.topic}**\n\n${bestResult.content}\n\n*Note: This response was generated from our local knowledge base while my enhanced AI systems are temporarily unavailable.*`;
      }
      
      return "I'm experiencing technical difficulties with my AI systems. However, I can share that XMRT-DAO represents a revolutionary approach to mobile mining democracy, privacy-first economics, and decentralized governance.";
    }
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

  const toggleMute = () => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  };

  const handleVoiceTranscript = async (transcript: string, confidence: number) => {
    if (!transcript.trim() || isProcessing) return;

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
      const response = await getElizaResponse(transcript, true);
      
      const elizaMessage: UnifiedMessage = {
        id: `voice-eliza-${Date.now()}`,
        content: response,
        sender: 'eliza',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(response);
      
    } catch (error) {
      console.error('Failed to process voice input:', error);
      const errorMessage: UnifiedMessage = {
        id: `voice-error-${Date.now()}`,
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
    if (!textInput.trim() || isProcessing) return;

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
      const response = await getElizaResponse(userMessage.content);
      
      const elizaMessage: UnifiedMessage = {
        id: `eliza-${Date.now()}`,
        content: response,
        sender: 'eliza',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(response);
      
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
      
      const elizaMessage: UnifiedMessage = {
        id: `multimodal-eliza-${Date.now()}`,
        content: multimodalResponse.text,
        sender: 'eliza',
        timestamp: new Date(),
        emotionalContext: multimodalResponse.emotionalAnalysis ? {
          voiceTone: multimodalResponse.voiceAnalysis?.tone,
          confidenceLevel: multimodalResponse.emotionalAnalysis.confidence
        } : undefined
      };
      
      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(multimodalResponse.text);
      
    } catch (error) {
      console.error('Multimodal chat error:', error);
      // Fallback to text-only processing
      const fallbackResponse = await getElizaResponse(multimodalMessage.text || '[Multimodal input]');
      const elizaMessage: UnifiedMessage = {
        id: `multimodal-fallback-${Date.now()}`,
        content: fallbackResponse,
        sender: 'eliza',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(fallbackResponse);
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

  const statusValue = typeof status === 'object' ? status.value : status;

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
                enableVoice={inputMode !== 'text'}
              />
              <div>
                <h3 className="font-semibold text-foreground">Eliza</h3>
                <div className="flex items-center gap-2">
                  <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
                    {statusValue || 'offline'}
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

              {/* Voice Controls - only show when voice/rich mode is active and connected */}
              {(inputMode === 'voice' || inputMode === 'rich') && isConnected && (
                <Button
                  onClick={toggleMute}
                  variant="outline"
                  size="sm"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
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
        <div className="p-4 border-t border-border">
          {inputMode === 'rich' ? (
            <MultimodalInput
              onSend={handleMultimodalMessage}
              className="w-full"
            />
          ) : (
            <div className="flex gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  inputMode === 'voice' ? "Speak or type your message..." :
                  inputMode === 'text' ? "Type your message..." :
                  "Use voice, camera, or type..."
                }
                disabled={isProcessing}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!textInput.trim() || isProcessing}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Status indicator */}
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-muted-foreground">
              {getModeIcon(inputMode)} {getModeLabel(inputMode)} active
              {(inputMode === 'voice' || inputMode === 'rich') && !isConnected && (
                <span className="text-orange-500"> • Connecting...</span>
              )}
            </div>

            {(inputMode === 'voice' || inputMode === 'rich') && isConnected && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {isPlaying ? 'AI Speaking' : 'Listening'}
              </div>
            )}
          </div>
        </div>
      </Card>
  );
};

// Main component that wraps with HumeVoiceProvider
const UnifiedChat: React.FC<UnifiedChatProps> = ({ 
  apiKey = import.meta.env.VITE_GEMINI_API_KEY || "",
  ...props 
}) => {
  // Ensure we always pass the API key explicitly
  const finalApiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || "";
  
  console.log('UnifiedChat Main Component API Key Check:', {
    propApiKey: !!apiKey,
    envApiKey: !!import.meta.env.VITE_GEMINI_API_KEY,
    finalApiKey: !!finalApiKey,
    finalApiKeyLength: finalApiKey.length
  });

  return (
    <HumeVoiceProvider>
      <UnifiedChatInner {...props} apiKey={finalApiKey} />
    </HumeVoiceProvider>
  );
};

export default UnifiedChat;