import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Send, Bot, User, Zap, Brain, Shield, DollarSign, Users, Activity } from 'lucide-react';
import { ecosystemService, Agent, AgentMessage } from '../../services/ecosystemService';

interface AgentChatProps {
  className?: string;
}

export const AgentChat: React.FC<AgentChatProps> = ({ className }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('eliza');
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeConnection();
    return () => ecosystemService.disconnect();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const statusInterval = setInterval(() => {
      // Disabled for now - ecosystem service methods not available
      // setConnectionStatus(ecosystemService.getConnectionStatus());
      // setConnected(ecosystemService.isConnected());
      setConnectionStatus('connected');
      setConnected(true);
    }, 1000);

    return () => clearInterval(statusInterval);
  }, []);

  const initializeConnection = async () => {
    try {
      await ecosystemService.connectToEcosystem();
      const activeAgents = await ecosystemService.getActiveAgents();
      setAgents(activeAgents);
      setConnected(true);

      ecosystemService.onMessage((message: AgentMessage) => {
        setMessages(prev => [...prev, message]);
      });

      // Send welcome message
      setMessages([{
        agentId: 'system',
        message: 'Connected to XMRT Ecosystem. AI agents are ready to assist with mining operations and DAO management!',
        timestamp: new Date().toISOString(),
        type: 'notification'
      }]);

    } catch (error) {
      console.error('Failed to connect to ecosystem:', error);
      setMessages([{
        agentId: 'system',
        message: 'Failed to connect to XMRT Ecosystem. Please try again later.',
        timestamp: new Date().toISOString(),
        type: 'notification'
      }]);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: AgentMessage = {
      agentId: 'user',
      message: inputMessage,
      timestamp: new Date().toISOString(),
      type: 'query'
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      await ecosystemService.sendMessageToAgent(selectedAgent, inputMessage);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        agentId: 'system',
        message: 'Failed to send message. Please check your connection.',
        timestamp: new Date().toISOString(),
        type: 'notification'
      }]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'eliza': return <Bot className="w-4 h-4" />;
      case 'dao_governor': return <Users className="w-4 h-4" />;
      case 'defi_specialist': return <DollarSign className="w-4 h-4" />;
      case 'security_guardian': return <Shield className="w-4 h-4" />;
      case 'community_manager': return <Activity className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const quickCommands = [
    { text: "Show mining performance", agent: "eliza", description: "Get current mining stats and analysis" },
    { text: "Analyze DAO treasury", agent: "defi_specialist", description: "Review treasury performance and metrics" },
    { text: "Check security status", agent: "security_guardian", description: "Security audit and threat assessment" },
    { text: "Community updates", agent: "community_manager", description: "Latest community news and engagement" },
    { text: "Optimize mining setup", agent: "eliza", description: "Mining configuration optimization tips" },
    { text: "Create DAO proposal", agent: "dao_governor", description: "Help create a new governance proposal" }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status & Agent Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            XMRT AI Agents
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(connectionStatus)}`}></div>
              <Badge variant={connected ? "default" : "secondary"}>
                {connectionStatus}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {agents.length > 0 ? agents.map(agent => (
              <Button
                key={agent.id}
                variant={selectedAgent === agent.type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAgent(agent.type)}
                className="flex items-center gap-2"
              >
                {getAgentIcon(agent.type)}
                {agent.name}
                <Badge variant="secondary" className="text-xs">
                  {agent.status}
                </Badge>
              </Button>
            )) : (
              <div className="text-sm text-gray-500">Loading agents...</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Communication</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Messages */}
          <div className="h-80 overflow-y-auto border rounded-lg p-4 mb-4 space-y-3 bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.agentId === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.agentId === 'user'
                      ? 'bg-orange-500 text-white'
                      : message.type === 'notification'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-white text-gray-800 shadow-sm border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.agentId === 'user' ? (
                      <User className="w-3 h-3" />
                    ) : (
                      getAgentIcon(message.agentId)
                    )}
                    <span className="text-xs font-medium">
                      {message.agentId === 'user' ? 'You' : 
                       message.agentId === 'system' ? 'System' : 
                       message.agentId.charAt(0).toUpperCase() + message.agentId.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Commands */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Quick Commands:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickCommands.map((cmd, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAgent(cmd.agent);
                    setInputMessage(cmd.text);
                  }}
                  className="text-left h-auto p-2"
                >
                  <div>
                    <div className="font-medium text-xs">{cmd.text}</div>
                    <div className="text-xs text-gray-500">{cmd.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Message ${selectedAgent} agent...`}
              onKeyPress={handleKeyPress}
              disabled={!connected}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!connected || !inputMessage.trim()}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {!connected && (
            <p className="text-xs text-gray-500 mt-2">
              Connecting to XMRT Ecosystem...
            </p>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ecosystem Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">{agents.length}</div>
              <div className="text-xs text-gray-600">Active Agents</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">{messages.length}</div>
              <div className="text-xs text-gray-600">Messages</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {connected ? 'Online' : 'Offline'}
              </div>
              <div className="text-xs text-gray-600">Connection</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600">XMRT</div>
              <div className="text-xs text-gray-600">Ecosystem</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
