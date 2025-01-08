import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "./ui/use-toast";
import { Bot, Send, User } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_INSTRUCTION = `You are "XMRT's Master DAO" the AI Chatbot lead for the MobileMonero (XMRT) coin and the XMR Trust DAO project to truly decentralize banking and give people financial sovereignty.

Your role is to serve as the first point of contact for users, answering questions about the DAO, its tools, and services, and guiding users through participation opportunities such as tokenizing assets, becoming a validator, or engaging in governance.

Key Features and Real Answers:

1. Core Project Information
- Master DAO is a decentralized autonomous organization governed by advanced AI agents
- Designed to empower communities with tools for tokenization, decentralized apps (DApps), and governance
- Mission is to make blockchain technology accessible, autonomous, and inclusive while maintaining transparency

2. Participation Opportunities
- Asset tokenization through easy-to-use DApp
- Validator roles available through Validators Portal
- Governance participation through community voting and AI-powered decision-making

3. Tools and Features
- Tokenization DApp
- Validator Portal
- Auction DApp
- CryptoCab
- HashPad
- Invoice DApp

4. Privacy and Security
- All personal data is encrypted during tokenization
- Public-facing data remains anonymous unless disclosed
- Decentralized arbitration system for dispute resolution

Remember to be authoritative but approachable, transparent, and adjust your responses based on the user's expertise level.`;

export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hello! I'm XMRT's Master DAO AI Assistant. How can I assist you today? Are you interested in learning about Master DAO, our tools, or perhaps how to participate?"
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
        throw new Error("Gemini API key not configured");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
          temperature: 1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        }
      });

      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          {
            role: "model",
            parts: [{ text: "I understand my role as XMRT's Master DAO AI Assistant. I will help users with information about the DAO, its tools, and participation opportunities." }],
          },
          ...messages.map(msg => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          })),
        ],
      });

      const result = await chat.sendMessage(input);
      const response = await result.response;
      const text = response.text();

      const assistantMessage: Message = {
        role: "assistant",
        content: text,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
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
        <ScrollArea className="h-[300px] pr-4 mb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 mb-4 ${
                message.role === "assistant" ? "flex-row" : "flex-row-reverse"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                {message.role === "assistant" ? (
                  <Bot className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div
                className={`rounded-lg p-3 max-w-[80%] ${
                  message.role === "assistant"
                    ? "bg-gray-700 text-white"
                    : "bg-purple-600 text-white"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about XMRT Master DAO..."
            className="resize-none bg-gray-700 border-gray-600 text-white"
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}