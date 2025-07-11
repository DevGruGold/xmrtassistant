import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "./ui/use-toast";
import { Bot, Send, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DETAILED_SYSTEM_INSTRUCTION = `You are "XMRT's Master DAO" AI Assistant for the MobileMonero (XMRT) cryptocurrency and XMR Trust DAO project.

ABOUT XMRT TOKEN:
- XMRT is an ERC-20 token on Ethereum with staking capabilities
- Contract Address: 0xaE2402dFdD313B8c40AF06d3292B50dE1eD75F68 (admin address)
- Max Supply: 21,000,000 XMRT tokens
- Network: Mainnet and Sepolia testnet supported
- Staking: Users can stake XMRT with 7-day minimum period, 10% penalty for early unstaking
- Faucet: 100 XMRT available every 24 hours on Sepolia testnet

ABOUT XMR TRUST DAO:
- Mission: Truly decentralize banking and provide financial sovereignty
- Focus: Privacy, decentralization, and community governance
- Features: Asset tokenization, validator participation, governance voting
- Technology: Built on Web3 infrastructure with smart contracts

KEY FEATURES:
1. Decentralized Finance (DeFi) tools and services
2. Community-driven governance through DAO voting
3. Asset tokenization platform for real-world assets
4. Validator network for securing the ecosystem
5. Privacy-focused financial services inspired by Monero principles

TESTNET INFORMATION:
- Sepolia testnet deployment available for testing
- Faucet provides 100 XMRT tokens every 24 hours
- Full staking and governance features available on testnet
- Contract functions: stake, unstake, transfer, balanceOf

PARTICIPATION OPPORTUNITIES:
- Stake XMRT tokens to earn rewards and governance rights
- Participate in DAO governance voting
- Become a validator to secure the network
- Tokenize real-world assets through the platform
- Use DeFi tools and services

Your role is to educate users about XMRT, help them navigate the DAO platform, explain staking mechanics, assist with testnet usage, and guide them through participation opportunities. Always be helpful, technical when needed, and emphasize the privacy and decentralization benefits of the ecosystem.`;

export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hello! I'm XMRT's Master DAO AI Assistant. I can help you with questions about the XMRT token, staking, testnet faucet, DAO governance, and our decentralized banking platform. What would you like to know?"
  }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        const errorMessage = "API key not configured. Please check your environment variables.";
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: errorMessage
        }]);
        return;
      }

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const chatHistory = [
        ...messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      ];

      const chat = model.startChat({
        history: chatHistory,
        systemInstruction: DETAILED_SYSTEM_INSTRUCTION,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        }
      });

      const result = await chat.sendMessage(input);
      const response = await result.response;
      const assistantMessage: Message = {
        role: "assistant",
        content: response.text() || "Sorry, I couldn't generate a response.",
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      
      let errorMessage = "Sorry, I couldn't process your request right now.";
      
      if (error instanceof Error) {
        if (error.message.includes("insufficient") || error.message.includes("quota") || error.message.includes("billing")) {
          errorMessage = "The AI service is temporarily unavailable due to API limitations. Please try again later.";
        } else if (error.message.includes("API")) {
          errorMessage = "There was an issue connecting to the AI service. Please try again.";
        }
      }
      
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full bg-gray-800/50 backdrop-blur-sm border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">XMRT Master DAO AI Assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4 mb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 mb-4 ${
                message.role === "assistant" ? "flex-row" : "flex-row-reverse"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                {message.role === "assistant" ? (
                  <Bot className="w-5 h-5 text-purple-400" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div
                className={`rounded-lg p-3 max-w-[80%] ${
                  message.role === "assistant"
                    ? "bg-gray-700 text-white"
                    : "bg-purple-600 text-white"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
              <div className="bg-gray-700 text-white rounded-lg p-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about XMRT token, staking, testnet faucet, DAO governance, or anything related to our platform..."
            className="resize-none bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            rows={2}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}