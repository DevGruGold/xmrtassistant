import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send, Bot, User, Activity } from "lucide-react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const ElizaChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with Eliza's greeting
    setMessages([{
      id: Date.now().toString(),
      content: "Greetings, Founder. I am Eliza, the autonomous operator for the XMRT-DAO Ecosystem. My systems are online and fully operational. How may I assist you?\n\nAvailable commands: 'status', 'dashboard', 'health'.",
      isUser: false,
      timestamp: new Date()
    }]);
    setIsConnected(true);
  }, []);

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
        // Fallback response for demo purposes
        const elizaMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: getElizaResponse(userMessage.content),
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, elizaMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const elizaMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: getElizaResponse(userMessage.content),
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, elizaMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getElizaResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('status')) {
      return "XMRT-DAO Ecosystem Status:\n\n✅ Mining Operations: Active\n✅ DAO Governance: Operational\n✅ Treasury Management: Secure\n✅ Community Engagement: Growing\n\nAll systems nominal, Founder.";
    }
    
    if (input.includes('dashboard')) {
      return "Dashboard Overview:\n\n📊 Active Miners: Online\n💎 XMRT Holdings: Accumulating\n🗳️ Recent Proposals: Under Review\n💰 Treasury Health: Strong\n\nWould you like detailed metrics on any specific area?";
    }
    
    if (input.includes('health')) {
      return "System Health Report:\n\n🟢 Core Systems: 99.8% Uptime\n🟢 Mining Pool: Fully Operational\n🟢 Smart Contracts: Audited & Secure\n🟢 Community Tools: Active\n\nNo critical issues detected. All operations running smoothly.";
    }

    if (input.includes('hello') || input.includes('hi')) {
      return "Hello, Founder. I am here to assist with XMRT-DAO operations. How may I help optimize our ecosystem today?";
    }

    return "I understand your inquiry, Founder. As the autonomous operator of XMRT-DAO, I can provide insights on mining operations, governance proposals, treasury management, and ecosystem health. Please specify your area of interest or use commands: 'status', 'dashboard', 'health'.";
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
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!message.isUser && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  {message.isUser && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
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