interface EcosystemHealth {
  deployment: string;
  message: string;
  mode: string;
  response_time_ms: number;
  status: string;
  system_health: {
    agents: {
      list: string[];
      operational: number;
      total: number;
    };
    analytics: {
      agent_interactions: number;
      requests_count: number;
      startup_time: number;
      uptime_checks: number;
    };
    memory_optimized: boolean;
  };
  timestamp: string;
  uptime_formatted: string;
  uptime_seconds: number;
  version: string;
}

interface EcosystemResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class EcosystemAPIService {
  private baseUrl = 'https://xmrt-ecosystem-xx5w.onrender.com';

  async getSystemHealth(): Promise<EcosystemResponse<EcosystemHealth>> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const data = await response.json();
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch ecosystem health:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async queryAgent(agentType: 'core_agent' | 'web_agent', query: string): Promise<EcosystemResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents/${agentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Agent query failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`Failed to query ${agentType}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAnalytics(): Promise<EcosystemResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics`);
      
      if (!response.ok) {
        throw new Error(`Analytics fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to fetch ecosystem analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async executeEcosystemCommand(command: string, parameters?: any): Promise<EcosystemResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command, parameters })
      });

      if (!response.ok) {
        throw new Error(`Command execution failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to execute ecosystem command:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  formatHealthReport(health: EcosystemHealth): string {
    return `🚀 XMRT Ecosystem Status Report:
    
Deployment: ${health.deployment} (${health.mode})
Version: ${health.version}
Status: ${health.status}
Uptime: ${health.uptime_formatted}
Response Time: ${health.response_time_ms}ms

Agents Status:
• Total Agents: ${health.system_health.agents.total}
• Operational: ${health.system_health.agents.operational}
• Active: ${health.system_health.agents.list.join(', ')}

Analytics:
• Total Requests: ${health.system_health.analytics.requests_count}
• Agent Interactions: ${health.system_health.analytics.agent_interactions}
• Memory Optimized: ${health.system_health.memory_optimized ? 'Yes' : 'No'}

Last Update: ${new Date(health.timestamp).toLocaleString()}`;
  }
}

export const ecosystemAPI = new EcosystemAPIService();
export type { EcosystemHealth, EcosystemResponse };