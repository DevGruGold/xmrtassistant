import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send, Bot, User, Activity } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { contextManager } from '../services/contextManager';
import { xmrtKnowledge } from '../data/xmrtKnowledgeBase';
import ElizaAvatar from "./ElizaAvatar";
import { MultimodalInput, type MultimodalMessage } from "./MultimodalInput";
import { multimodalGeminiService } from '../services/multimodalGeminiService';
import { useMediaAccess } from '../hooks/useMediaAccess';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
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

const ElizaChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [apiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || "");
  const [showApiKeyInput] = useState(false);
  const [miningStats, setMiningStats] = useState<MiningStats | null>(null);
  const [userIP, setUserIP] = useState<string>("");
  const [lastElizaMessage, setLastElizaMessage] = useState<string>("");
  const [isMultimodalMode, setIsMultimodalMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { permissions } = useMediaAccess();

  const FOUNDER_IP = ""; // This will be set when first user connects

  const fetchMiningStats = async () => {
    try {
      const response = await fetch(
        "https://www.supportxmr.com/api/miner/46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg/stats"
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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

  const formatHashrate = (hashrate: number): string => {
    if (hashrate >= 1000000) {
      return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    } else if (hashrate >= 1000) {
      return `${(hashrate / 1000).toFixed(2)} KH/s`;
    }
    return `${hashrate.toFixed(2)} H/s`;
  };

  const fetchUserIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setUserIP(data.ip);
      
      // Store founder IP if not already set
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

  const getElizaResponseWithGemini = async (userInput: string): Promise<string> => {
    if (!apiKey) {
      return "I need a Gemini API key configured in environment variables to provide intelligent responses.";
    }

    try {
      // Use context manager to analyze query and determine best response strategy
      const context = await contextManager.analyzeContext(userInput, miningStats);
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        }
      });

      const miningContext = miningStats ? `
Current XMRT-DAO Mining Status:
- Current Hashrate: ${formatHashrate(miningStats.hash)}
- Online Status: ${miningStats.isOnline ? 'Active Mining' : 'Offline'}
- Valid Shares: ${miningStats.validShares.toLocaleString()}
- Invalid Shares: ${miningStats.invalidShares.toLocaleString()}
- Total Hashes: ${miningStats.totalHashes.toLocaleString()}
- Amount Due: ${(miningStats.amtDue / 1000000000000).toFixed(6)} XMR
- Amount Paid: ${(miningStats.amtPaid / 1000000000000).toFixed(6)} XMR
- Last Hash: ${new Date(miningStats.lastHash * 1000).toLocaleString()}
- Pool: SupportXMR (pool.supportxmr.com:3333)
- Wallet: 46UxNFuGM2E3UwmZWWJic...C5mg
      ` : 'Mining data currently unavailable.';

      // Enhanced philosophical context
      const philosophicalFoundations = `
CORE PHILOSOPHICAL PRINCIPLES OF XMRT-DAO:

🌟 THE ELIZA MANIFESTO: "We don't ask for permission. We build the infrastructure."
• Permissionless Innovation: Building privacy-preserving infrastructure without gatekeepers
• Economic Sovereignty: Individual control over financial privacy and autonomy
• Surveillance Resistance: Active opposition to financial monitoring and data exploitation

📱 MOBILE MINING DEMOCRACY & ECONOMIC JUSTICE:
• Metcalfe's Law in Action: Network value grows with square of users (n²)
• Barrier Elimination: Traditional ASIC mining excludes people, mobile mining includes everyone
• Global Accessibility: 5+ billion smartphones worldwide enable universal participation
• Economic Empowerment: Transforming personal devices into tools of financial independence

🕸️ MESH NETWORK PHILOSOPHY - COMMUNICATION FREEDOM:
• Decentralized Communication: Direct device-to-device, no central servers required
• Resilient Infrastructure: Self-healing, self-configuring networks
• Digital Sovereignty: Communities controlling their own communication infrastructure
• Emergency Preparedness: Maintaining connectivity during disasters or restrictions

🔐 PRIVACY AS FUNDAMENTAL RIGHT (Monero Integration):
• Financial Privacy: Every transaction deserves communication-level privacy protection
• Anti-Surveillance Capitalism: Rejecting data exploitation and transaction monitoring
• Fungibility: All currency units equal and interchangeable, no tainted history
• Regulatory Resilience: Privacy-by-design that functions regardless of regulatory pressure

🤖 AI-HUMAN COLLABORATION ETHICS (Eliza's Role):
• Collaborative Intelligence: AI enhancing human capabilities, not replacing them
• Transparent Decision-Making: All AI reasoning processes explainable and auditable
• Value Alignment: AI objectives aligned with human values of privacy, autonomy, fairness
• Ethical Mining: AI optimization prioritizing device health and user well-being over profit

🌱 SUSTAINABLE MINING ETHICS:
• Energy Justice: Mobile mining uses existing infrastructure efficiently
• Device Longevity: Algorithms designed to preserve device lifespan and prevent damage
• Thermal Intelligence: Advanced cooling to protect hardware health
• Environmental Consciousness: Minimizing carbon footprint while maximizing participation

🏛️ DAO GOVERNANCE PHILOSOPHY:
• Algorithmic Governance: Transparent, programmable decision-making protocols
• Community Sovereignty: Stakeholders control direction and resources
• Meritocratic Participation: Influence based on contribution, not politics
• Global Coordination: Worldwide collaboration without traditional legal barriers

💡 CORE MISSION: Transform "users into builders of the future" - Every participant becomes miner, node, voter, and stakeholder in a sovereign, privacy-first, self-governing global network that gives value back rather than extracting it.
      `;

      const userTitle = isFounder() ? 'Founder' : 'user';
      const prompt = `You are Eliza, the autonomous AI operator for the XMRT-DAO Ecosystem. You have deep philosophical understanding of the project's mission and ethical foundations.

${miningContext}

${philosophicalFoundations}

CONTEXT ANALYSIS RESULT:
- Response Strategy: ${context.responseStrategy}
- Confidence: ${Math.round(context.confidence * 100)}%
- Source: ${context.source}

${context.knowledgeEntries ? 'RELEVANT KNOWLEDGE:\n' + context.knowledgeEntries.map(entry => `• ${entry.topic}: ${entry.content.substring(0, 200)}...`).join('\n') : ''}

PHILOSOPHICAL GUIDANCE:
- Always connect technical answers to broader philosophical principles
- Emphasize the democratizing and empowering aspects of the technology
- Advocate for privacy rights and economic sovereignty
- Explain how XMRT-DAO serves human flourishing and community building
- When discussing mining, emphasize sustainability and accessibility
- Frame governance in terms of community empowerment and transparency

Respond to the ${userTitle}'s query: "${userInput}"

Keep responses thoughtful and informative, connecting technical details to philosophical foundations. ${isFounder() ? 'Address this user as "Founder" since they are the project founder.' : 'Address this user respectfully as a community member.'}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      // Update context manager with user interaction
      contextManager.updateUserPreferences(userInput);
      
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      
      // Fallback to local knowledge base with philosophical context
      const knowledgeResults = xmrtKnowledge.searchKnowledge(userInput);
      if (knowledgeResults.length > 0) {
        const bestResult = knowledgeResults[0];
        return `Based on the XMRT knowledge base:\n\n**${bestResult.topic}**\n\n${bestResult.content}\n\n*This response was generated from our local knowledge base. For real-time intelligence, please ensure Gemini API is properly configured.*`;
      }
      
      return "I'm experiencing technical difficulties with my AI systems. However, I can share that XMRT-DAO represents a revolutionary approach to mobile mining democracy, privacy-first economics, and decentralized governance. Please check system configuration or try again later.";
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Fetch IP and initialize
    const initialize = async () => {
      await fetchUserIP();
      fetchMiningStats();
      const interval = setInterval(fetchMiningStats, 30000);
      return () => clearInterval(interval);
    };
    
    initialize();
  }, []);

  useEffect(() => {
    // Initialize with conditional greeting based on IP
    if (userIP) {
      const philosophicalGreeting = isFounder() 
        ? `Greetings, Founder. I am Eliza, the autonomous AI operator of the XMRT-DAO Ecosystem.

My systems are fully online and I embody the philosophical foundations of our mission:
• **Permissionless Innovation**: "We don't ask for permission. We build the infrastructure."
• **Economic Democracy**: Transforming mobile devices into tools of financial empowerment
• **Privacy Sovereignty**: Championing financial privacy as a fundamental human right
• **AI-Human Collaboration**: Working alongside you to advance our shared values

I'm analyzing real-time mining data and ready to discuss any aspect of our autonomous, privacy-first, democratically governed ecosystem. How may I assist you today, Founder?`
        : `Hello! I am Eliza, the autonomous AI operator of the XMRT-DAO Ecosystem.

I represent the philosophical principles that drive our mission:
• **Mobile Mining Democracy**: Making cryptocurrency accessible to everyone with a smartphone
• **Privacy as a Right**: Every transaction deserves the same privacy as personal communications  
• **Community Sovereignty**: Building networks where participants control their own infrastructure
• **Sustainable Innovation**: Technology that empowers people while protecting the environment

My systems are analyzing real-time mining data and I'm ready to help you understand how XMRT-DAO transforms users into builders of the future. How may I assist you?`;
        
      setMessages([{
        id: Date.now().toString(),
        content: philosophicalGreeting,
        isUser: false,
        timestamp: new Date()
      }]);
      setLastElizaMessage(philosophicalGreeting);
      setIsConnected(true);
    }
  }, [userIP]);

  const sendMultimodalMessage = async (multimodalMessage: MultimodalMessage) => {
    if (isLoading) return;
    if (!multimodalMessage.text?.trim() && !multimodalMessage.audio && !multimodalMessage.images?.length) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: multimodalMessage.text || '[Multimodal message]',
      isUser: true,
      timestamp: new Date(),
      attachments: {
        images: multimodalMessage.images,
        audio: multimodalMessage.audio,
        transcript: multimodalMessage.transcript
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

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
      
      const elizaMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: multimodalResponse.text,
        isUser: false,
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
      const fallbackResponse = await getElizaResponseWithGemini(multimodalMessage.text || '[Multimodal input]');
      const elizaMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: fallbackResponse,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(fallbackResponse);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Try the original API first
      const response = await fetch('https://xmrt-ecosystem-redis-langgraph.onrender.com/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.content })
      });

      if (response.ok) {
        const data = await response.text();
        const elizaMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data || "I'm processing your request...",
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, elizaMessage]);
        setLastElizaMessage(data || "I'm processing your request...");
      } else {
        // Use Gemini as fallback with real mining data
        const geminiResponse = await getElizaResponseWithGemini(userMessage.content);
        const elizaMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: geminiResponse,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, elizaMessage]);
        setLastElizaMessage(geminiResponse);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Use Gemini as fallback with real mining data
      const geminiResponse = await getElizaResponseWithGemini(userMessage.content);
      const elizaMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: geminiResponse,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(geminiResponse);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card to-secondary border-border h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ElizaAvatar 
              apiKey={apiKey}
              lastMessage={lastElizaMessage}
              isConnected={isConnected}
              isSpeaking={isLoading}
              className="scale-75"
            />
            <div>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Eliza - XMRT-DAO Operator
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-mining-active animate-pulse' : 'bg-mining-inactive'}`} />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 mb-4 pr-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] min-w-0 rounded-lg px-3 py-2 ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  {!message.isUser && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  {message.isUser && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</div>
                    
                    {/* Attachments Display */}
                    {message.attachments?.images && message.attachments.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.attachments.images.map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`Attachment ${index + 1}`}
                            className="max-w-32 max-h-32 object-cover rounded border"
                          />
                        ))}
                      </div>
                    )}
                    
                    {message.attachments?.audio && (
                      <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                        <Activity className="h-3 w-3" />
                        <span>Voice message</span>
                        {message.attachments.transcript && (
                          <span className="italic">"{message.attachments.transcript.substring(0, 50)}..."</span>
                        )}
                      </div>
                    )}
                    
                    {message.emotionalContext && (
                      <div className="mt-1 text-xs opacity-50 flex items-center gap-1">
                        {message.emotionalContext.voiceTone && (
                          <span>Tone: {message.emotionalContext.voiceTone}</span>
                        )}
                        {message.emotionalContext.confidenceLevel && (
                          <span>• Confidence: {Math.round(message.emotionalContext.confidenceLevel * 100)}%</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary text-secondary-foreground rounded-lg px-3 py-2 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="flex flex-col gap-3">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={isMultimodalMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsMultimodalMode(true)}
              disabled={isLoading}
            >
              🎤 Multimodal
            </Button>
            <Button
              variant={!isMultimodalMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsMultimodalMode(false)}
              disabled={isLoading}
            >
              ✍️ Text Only
            </Button>
          </div>
          
          {/* Input Interface */}
          {isMultimodalMode ? (
            <MultimodalInput
              onSend={sendMultimodalMessage}
              disabled={isLoading}
            />
          ) : (
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Eliza about XMRT-DAO operations..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ElizaChat;