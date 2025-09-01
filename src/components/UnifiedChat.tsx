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
import { UnifiedElizaService } from '@/services/unifiedElizaService';

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

  // Voice synchronization state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [responseQueue, setResponseQueue] = useState<string[]>([]);

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

// Hume EVI integration - Full conversational AI
  const {
    status,
    isMuted,
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
            // NOTE: Replace 'your-evi-config-id' with actual EVI configuration ID from Hume dashboard
            // This is a placeholder - you need to create an EVI agent configuration in Hume dashboard
            await connect({
              configId: 'your-evi-config-id', // This needs to be created in Hume dashboard
              auth: {
                type: 'apiKey',
                value: 'IFxseVy6DWSyPXXyA217HBG8ADY50DHRj0avVq5p0LDxSFaA'
              }
            });
          } catch (error) {
            console.error('Failed to connect to Hume EVI:', error);
            console.warn('Connection timeout - you need to create an EVI configuration in the Hume dashboard and replace the placeholder configId');
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
        text: 'Text mode active - unified XMRT knowledge system for consistent responses.',
        voice: 'Voice mode active - need to create EVI configuration in Hume dashboard.',
        rich: 'Rich mode active - multimodal input with unified knowledge integration.'
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

  // Process Hume messages for both transcripts and AI responses
  useEffect(() => {
    if (humeMessages.length > 0) {
      const latestMessage = humeMessages[humeMessages.length - 1];
      
      // Handle user voice transcripts
      if (latestMessage.type === 'user_message') {
        // Handle emotion detection
        if ((latestMessage as any).models?.prosody) {
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

        // Handle transcript updates - only from user messages
        if ((latestMessage as any).message?.content) {
          const transcript = (latestMessage as any).message.content;
          if (transcript && transcript.trim() && !isProcessing) {
            const userMessage: UnifiedMessage = {
              id: `user-voice-${Date.now()}`,
              content: transcript,
              sender: 'user',
              timestamp: new Date(),
              emotion: currentEmotion,
              confidence: emotionConfidence
            };
            setMessages(prev => [...prev, userMessage]);
          }
        }
      }
      
      // Handle AI responses from Hume EVI
      if (latestMessage.type === 'assistant_message') {
        const response = (latestMessage as any).message?.content;
        if (response && response.trim()) {
          const elizaMessage: UnifiedMessage = {
            id: `eliza-hume-${Date.now()}`,
            content: response,
            sender: 'eliza',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, elizaMessage]);
          setLastElizaMessage(response);
        }
      }
    }
  }, [humeMessages, isProcessing, currentEmotion, emotionConfidence]);

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

  // Enhanced AI response generation using unified service
  const getElizaResponse = async (userInput: string, isVoice = false): Promise<string> => {
    try {
      // Use the unified Eliza service for consistent responses across all modes
      const response = await UnifiedElizaService.generateResponse(userInput, {
        miningStats,
        userIP,
        isFounder: isFounder(),
        inputMode
      });
      
      return response;
    } catch (error) {
      console.error('Unified Eliza service error:', error);
      return `I apologize, but I'm experiencing technical difficulties. However, as the autonomous AI operator of XMRT-DAO, I remain committed to our philosophical principles of permissionless innovation and decentralized sovereignty. Please try your question again.`;
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

  // Process response queue to prevent overlapping speech
  useEffect(() => {
    const processQueue = async () => {
      if (responseQueue.length > 0 && !isSpeaking) {
        const nextResponse = responseQueue[0];
        setResponseQueue(prev => prev.slice(1));
        await speakResponse(nextResponse);
      }
    };
    
    processQueue();
  }, [responseQueue, isSpeaking]);

  // TTS function using Web Speech API for Gemini responses
  const speakResponse = async (text: string): Promise<void> => {
    try {
      if ('speechSynthesis' in window) {
        // Set speaking state
        setIsSpeaking(true);
        
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        // Create new speech synthesis utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice settings for optimal quality
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        // Try to use a high-quality English voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.lang.includes('en') && 
          (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Samantha'))
        ) || voices.find(voice => voice.lang.includes('en'));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        console.log('Speaking Gemini response via Web Speech API:', text.substring(0, 50) + '...');
        
        return new Promise<void>((resolve) => {
          utterance.onend = () => {
            setIsSpeaking(false);
            resolve();
          };
          utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            setIsSpeaking(false);
            resolve();
          };
          
          // Speak the response
          window.speechSynthesis.speak(utterance);
        });
      } else {
        console.warn('Speech synthesis not supported in this browser');
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Failed to synthesize speech:', error);
      setIsSpeaking(false);
    }
  };

  // Unified response display function
  const displayResponse = async (response: string, isVoice: boolean = false) => {
    const elizaMessage: UnifiedMessage = {
      id: `eliza-${Date.now()}`,
      content: response,
      sender: 'eliza',
      timestamp: new Date()
    };

    // Display text immediately
    setMessages(prev => [...prev, elizaMessage]);
    setLastElizaMessage(response);
    
    // Queue voice response if in voice mode
    if (isVoice && (inputMode === 'voice' || inputMode === 'rich')) {
      setResponseQueue(prev => [...prev, response]);
    }
  };

  const handleVoiceTranscript = async (transcript: string, confidence: number) => {
    if (!transcript.trim() || isProcessing || isSpeaking) return;

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
      // Get Gemini-powered response with all XMRT context
      const response = await getElizaResponse(transcript, true);
      
      // Use unified display function for synchronized text and voice
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
      const response = await getElizaResponse(userMessage.content);
      
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
      // Fallback to text-only processing
      const fallbackResponse = await getElizaResponse(multimodalMessage.text || '[Multimodal input]');
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
                <div className={`h-2 w-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {isSpeaking ? 'AI Speaking' : 'Listening'}
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