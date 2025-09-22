import axios from 'axios';
import { io, Socket } from 'socket.io-client';

export interface Agent {
  id: string;
  name: string;
  type: 'coordinator' | 'researcher' | 'analyst' | 'coder' | 'optimizer' | 'monitor' | 'dao-governor' | 'defi-specialist' | 'security-guardian' | 'community-manager';
  status: 'active' | 'idle' | 'busy';
  capabilities: string[];
}

export interface AgentMessage {
  agentId: string;
  message: string;
  timestamp: string;
  type: 'query' | 'response' | 'notification';
  metadata?: {
    taskType?: string;
    priority?: 'low' | 'medium' | 'high';
    userId?: string;
  };
}

export interface SystemStatus {
  agents: Agent[];
  uptime: number;
  health: 'healthy' | 'degraded' | 'critical';
  metrics: {
    requestsPerMinute: number;
    responseTime: number;
    successRate: number;
  };
}

const ECOSYSTEM_API = import.meta.env.VITE_XMRT_ECOSYSTEM_API || 'https://xmrt-ecosystem-1-20k6.onrender.com/api';
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'wss://xmrt-ecosystem-1-20k6.onrender.com';

class EcosystemService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: AgentMessage) => void)[] = [];
  private statusHandlers: ((status: SystemStatus) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connectToEcosystem(): Promise<void> {
    if (this.socket?.connected) {
      console.log('Already connected to XMRT Ecosystem');
      return;
    }

    try {
      this.socket = io(WEBSOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('🔗 Connected to XMRT Ecosystem');
        this.reconnectAttempts = 0;

        // Send initial handshake
        this.socket?.emit('client_connected', {
          clientType: 'xmrt-assistant',
          version: '2.0.0',
          timestamp: new Date().toISOString()
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from XMRT Ecosystem:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        this.reconnectAttempts++;
      });

      this.socket.on('agent_task_response', (data: AgentMessage) => {
        this.messageHandlers.forEach(handler => handler(data));
      });

      this.socket.on('system_status', (data: SystemStatus) => {
        this.statusHandlers.forEach(handler => handler(data));
      });

      this.socket.on('analytics_update', (data: any) => {
        console.log('📊 Analytics update:', data);
      });

      this.socket.on('anomaly_detected', (data: any) => {
        console.warn('⚠️ System anomaly detected:', data);
      });

    } catch (error) {
      console.error('Failed to connect to XMRT Ecosystem:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('👋 Disconnected from XMRT Ecosystem');
    }
  }

  async getActiveAgents(): Promise<Agent[]> {
    try {
      const response = await axios.get(`${ECOSYSTEM_API}/agents`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'XMRT-Assistant/2.0.0'
        }
      });
      return response.data.agents || [];
    } catch (error) {
      console.error('Failed to fetch active agents:', error);
      return this.getDefaultAgents();
    }
  }

  async sendMessageToAgent(agentType: string, message: string, metadata?: any): Promise<void> {
    if (!this.socket?.connected) {
      await this.connectToEcosystem();
    }

    const messageData = {
      agent_type: agentType,
      task: message,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'xmrt-assistant',
        ...metadata
      }
    };

    this.socket?.emit('agent_task_request', messageData);
  }

  onMessage(handler: (message: AgentMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  onStatusUpdate(handler: (status: SystemStatus) => void): void {
    this.statusHandlers.push(handler);
  }

  async getSystemStatus(): Promise<SystemStatus | null> {
    try {
      const response = await axios.get(`${ECOSYSTEM_API}/status`, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      return null;
    }
  }

  async queryMemory(query: string, limit = 10): Promise<any> {
    try {
      const response = await axios.post(`${ECOSYSTEM_API}/memory/query`, {
        query,
        limit
      }, {
        timeout: 15000
      });
      return response.data;
    } catch (error) {
      console.error('Failed to query memory:', error);
      return null;
    }
  }

  async triggerLearning(): Promise<boolean> {
    try {
      await axios.post(`${ECOSYSTEM_API}/learning/trigger`, {}, {
        timeout: 30000
      });
      return true;
    } catch (error) {
      console.error('Failed to trigger learning:', error);
      return false;
    }
  }

  async analyzeRepository(repoUrl: string): Promise<any> {
    try {
      const response = await axios.post(`${ECOSYSTEM_API}/github/analyze`, {
        repo_url: repoUrl
      }, {
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('Failed to analyze repository:', error);
      return null;
    }
  }

  async getMiningInsights(): Promise<any> {
    try {
      const response = await axios.get(`${ECOSYSTEM_API}/mining/insights`, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch mining insights:', error);
      return null;
    }
  }

  private getDefaultAgents(): Agent[] {
    return [
      {
        id: 'eliza-001',
        name: 'Eliza',
        type: 'coordinator',
        status: 'active',
        capabilities: ['coordination', 'repository-management', 'task-delegation']
      },
      {
        id: 'dao-gov-001',
        name: 'DAO Governor',
        type: 'dao-governor',
        status: 'active',
        capabilities: ['governance', 'proposal-management', 'voting-coordination']
      },
      {
        id: 'defi-spec-001',
        name: 'DeFi Specialist',
        type: 'defi-specialist',
        status: 'active',
        capabilities: ['defi-analysis', 'financial-operations', 'yield-optimization']
      },
      {
        id: 'security-001',
        name: 'Security Guardian',
        type: 'security-guardian',
        status: 'active',
        capabilities: ['security-monitoring', 'threat-detection', 'vulnerability-analysis']
      },
      {
        id: 'community-001',
        name: 'Community Manager',
        type: 'community-manager',
        status: 'active',
        capabilities: ['community-engagement', 'content-creation', 'user-support']
      }
    ];
  }

  // Real-time communication methods
  async sendRealTimeQuery(query: string): Promise<void> {
    if (!this.socket?.connected) {
      await this.connectToEcosystem();
    }

    this.socket?.emit('real_time_query', {
      query,
      timestamp: new Date().toISOString(),
      source: 'xmrt-assistant'
    });
  }

  async provideLearningFeedback(feedback: any): Promise<void> {
    if (!this.socket?.connected) {
      await this.connectToEcosystem();
    }

    this.socket?.emit('learning_feedback', {
      ...feedback,
      timestamp: new Date().toISOString(),
      source: 'xmrt-assistant'
    });
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${ECOSYSTEM_API}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

export const ecosystemService = new EcosystemService();
