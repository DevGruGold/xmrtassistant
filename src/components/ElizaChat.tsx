import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send, Bot, User, Activity } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
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
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [miningStats, setMiningStats] = useState<MiningStats | null>(null);
  const [userIP, setUserIP] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      return "Please provide a Gemini API key to enable intelligent responses.";
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

      const userTitle = isFounder() ? 'Founder' : 'user';
      const prompt = `You are Eliza, the autonomous AI operator for the XMRT-DAO Ecosystem. You are professional, knowledgeable, and helpful. 

${miningContext}

Respond to the ${userTitle}'s query: "${userInput}"

Keep responses concise and informative. Use the real mining data when relevant. ${isFounder() ? 'Address this user as "Founder" since they are the project founder.' : 'Address this user generically without special titles.'}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      return "I'm experiencing technical difficulties connecting to my AI systems. Please check your API key or try again later.";
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
      const greeting = isFounder() 
        ? "Greetings, Founder. I am Eliza, the autonomous AI operator for the XMRT-DAO Ecosystem. My systems are online and analyzing real-time mining data. How may I assist you today?"
        : "Hello! I am Eliza, the autonomous AI operator for the XMRT-DAO Ecosystem. My systems are online and analyzing real-time mining data. How may I assist you?";
        
      setMessages([{
        id: Date.now().toString(),
        content: greeting,
        isUser: false,
        timestamp: new Date()
      }]);
      setIsConnected(true);
    }
  }, [userIP]);

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
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Eliza - XMRT-DAO Operator
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-mining-active animate-pulse' : 'bg-mining-inactive'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </CardTitle>
        {showApiKeyInput && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-muted-foreground">Enter Gemini API key for intelligent responses:</p>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Gemini API key..."
                className="flex-1 text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (apiKey.trim()) {
                    setShowApiKeyInput(false);
                  }
                }}
                disabled={!apiKey.trim()}
              >
                Set
              </Button>
            </div>
          </div>
        )}
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
                  <div className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere min-w-0 flex-1">{message.content}</div>
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
      </CardContent>
    </Card>
  );
};

export default ElizaChat;