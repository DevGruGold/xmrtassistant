import axios from 'axios';
import { io, Socket } from 'socket.io-client';

export interface Agent {
  id: string;
  name: string;
  type: 'eliza' | 'dao_governor' | 'defi_specialist' | 'security_guardian' | 'community_manager';
  status: 'active' | 'idle' | 'busy';
  capabilities: string[];
}

export interface AgentMessage {
  agentId: string;
  message: string;
  timestamp: string;
  type: 'query' | 'response' | 'notification';
}

export interface SystemStatus {
  uptime: number;
  agents: Agent[];
  performance: {
    responseTime: number;
    successRate: number;
    activeConnections: number;
  };
}

const ECOSYSTEM_API = import.meta.env.VITE_XMRT_ECOSYSTEM_API || 'https://xmrt-ecosystem-1-20k6.onrender.com/api';
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'wss://xmrt-ecosystem-1-20k6.onrender.com';

class EcosystemService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: AgentMessage) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connectToEcosystem(): Promise<void> {
    if (!this.socket) {
      this.socket = io(WEBSOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('Connected to XMRT Ecosystem');
        this.reconnectAttempts = 0;
        this.sendWelcomeMessage();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from XMRT Ecosystem:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.reconnectAttempts++;
      });

      this.socket.on('agent_task_response', (data: AgentMessage) => {
        this.messageHandlers.forEach(handler => handler(data));
      });

      this.socket.on('system_status', (data: any) => {
        console.log('System status update:', data);
      });

      this.socket.on('analytics_update', (data: any) => {
        console.log('Analytics update:', data);
      });

      this.socket.on('anomaly_detected', (data: any) => {
        console.warn('System anomaly detected:', data);
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private sendWelcomeMessage(): void {
    this.socket?.emit('client_connected', {
      client_type: 'xmrt_assistant',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  }

  async getActiveAgents(): Promise<Agent[]> {
    try {
      const response = await axios.get(`${ECOSYSTEM_API}/agents`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'XMRT-Assistant/2.0.0'
        }
      });
      return response.data.agents || [];
    } catch (error) {
      console.error('Failed to fetch active agents:', error);
      return this.getDefaultAgents();
    }
  }

  async sendMessageToAgent(agentType: string, message: string): Promise<void> {
    if (!this.socket) {
      await this.connectToEcosystem();
    }

    this.socket?.emit('agent_task_request', {
      agent_type: agentType,
      task: message,
      timestamp: new Date().toISOString(),
      source: 'xmrt_assistant'
    });
  }

  onMessage(handler: (message: AgentMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler: (message: AgentMessage) => void): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  async getSystemStatus(): Promise<SystemStatus | null> {
    try {
      const response = await axios.get(`${ECOSYSTEM_API}/status`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'XMRT-Assistant/2.0.0'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      return null;
    }
  }

  async queryMemory(query: string): Promise<any> {
    try {
      const response = await axios.post(`${ECOSYSTEM_API}/memory/query`, {
        query,
        limit: 10,
        source: 'xmrt_assistant'
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'XMRT-Assistant/2.0.0'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to query memory:', error);
      return null;
    }
  }

  async triggerLearning(): Promise<void> {
    try {
      await axios.post(`${ECOSYSTEM_API}/learning/trigger`, {
        source: 'xmrt_assistant',
        timestamp: new Date().toISOString()
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'XMRT-Assistant/2.0.0'
        }
      });
    } catch (error) {
      console.error('Failed to trigger learning:', error);
    }
  }

  async analyzeRepository(repoUrl: string): Promise<any> {
    try {
      const response = await axios.post(`${ECOSYSTEM_API}/github/analyze`, {
        repo_url: repoUrl,
        source: 'xmrt_assistant'
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'XMRT-Assistant/2.0.0'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to analyze repository:', error);
      return null;
    }
  }

  async sendRealTimeQuery(query: string): Promise<void> {
    if (!this.socket) {
      await this.connectToEcosystem();
    }

    this.socket?.emit('real_time_query', {
      query,
      timestamp: new Date().toISOString(),
      source: 'xmrt_assistant'
    });
  }

  async provideLearningFeedback(feedback: any): Promise<void> {
    if (!this.socket) {
      await this.connectToEcosystem();
    }

    this.socket?.emit('learning_feedback', {
      feedback,
      timestamp: new Date().toISOString(),
      source: 'xmrt_assistant'
    });
  }

  private getDefaultAgents(): Agent[] {
    return [
      {
        id: 'eliza',
        name: 'Eliza',
        type: 'eliza',
        status: 'active',
        capabilities: ['coordination', 'repository_management', 'system_analysis']
      },
      {
        id: 'dao_governor',
        name: 'DAO Governor',
        type: 'dao_governor',
        status: 'active',
        capabilities: ['governance', 'decision_making', 'policy_implementation']
      },
      {
        id: 'defi_specialist',
        name: 'DeFi Specialist',
        type: 'defi_specialist',
        status: 'active',
        capabilities: ['financial_analysis', 'defi_protocols', 'investment_strategy']
      },
      {
        id: 'security_guardian',
        name: 'Security Guardian',
        type: 'security_guardian',
        status: 'active',
        capabilities: ['security_monitoring', 'threat_detection', 'compliance']
      },
      {
        id: 'community_manager',
        name: 'Community Manager',
        type: 'community_manager',
        status: 'active',
        capabilities: ['community_engagement', 'content_creation', 'user_support']
      }
    ];
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus(): string {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'connecting';
  }
}

export const ecosystemService = new EcosystemService();
