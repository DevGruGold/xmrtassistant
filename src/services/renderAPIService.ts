import { supabase } from '@/integrations/supabase/client';

export interface RenderServiceInfo {
  id: string;
  name: string;
  type: string;
  repo: string;
  autoDeploy: string;
  branch: string;
  createdAt: string;
  updatedAt: string;
  suspended: string;
  serviceDetails: {
    url: string;
    buildCommand: string;
    startCommand: string;
    plan: string;
    region: string;
    env: string;
  };
}

export interface RenderDeployInfo {
  id: string;
  commit: {
    id: string;
    message: string;
    createdAt: string;
  };
  status: string;
  finishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface XMRTSystemVersion {
  version: string;
  deploymentId: string;
  commitHash: string;
  commitMessage: string;
  deployedAt: string;
  status: string;
  serviceUrl: string;
}

export class RenderAPIService {
  private static FLASK_SERVICE_URL = 'https://xmrt-ecosystem-iofw.onrender.com';
  
  /**
   * Get current system version from Flask deployment
   */
  public static async getSystemVersion(): Promise<XMRTSystemVersion | null> {
    try {
      // Try to get version info from Flask /version endpoint
      const versionResponse = await fetch(`${this.FLASK_SERVICE_URL}/version`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (versionResponse.ok) {
        const versionData = await versionResponse.json();
        return {
          version: versionData.version || 'unknown',
          deploymentId: versionData.deployment_id || 'unknown',
          commitHash: versionData.commit_hash || 'unknown',
          commitMessage: versionData.commit_message || 'No commit message',
          deployedAt: versionData.deployed_at || new Date().toISOString(),
          status: 'active',
          serviceUrl: this.FLASK_SERVICE_URL
        };
      }
      
      // Fallback: get info from Render API via edge function
      const { data, error } = await supabase.functions.invoke('render-api', {
        body: { action: 'get_deployment_info' }
      });
      
      if (error) {
        console.error('Error fetching from Render API:', error);
        return null;
      }
      
      return data?.systemVersion || null;
    } catch (error) {
      console.error('Error getting system version:', error);
      return null;
    }
  }
  
  /**
   * Check if Flask service is healthy
   */
  public static async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.FLASK_SERVICE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Service health check failed:', error);
      return false;
    }
  }
  
  /**
   * Get service status from Render API via edge function
   */
  public static async getServiceStatus(): Promise<RenderServiceInfo | null> {
    try {
      const { data, error } = await supabase.functions.invoke('render-api', {
        body: { action: 'get_service_status' }
      });
      
      if (error) {
        console.error('Error fetching service status:', error);
        return null;
      }
      
      return data?.service || null;
    } catch (error) {
      console.error('Error getting service status:', error);
      return null;
    }
  }
  
  /**
   * Get recent deployments
   */
  public static async getRecentDeployments(limit: number = 5): Promise<RenderDeployInfo[]> {
    try {
      const { data, error } = await supabase.functions.invoke('render-api', {
        body: { 
          action: 'get_deployments',
          limit 
        }
      });
      
      if (error) {
        console.error('Error fetching deployments:', error);
        return [];
      }
      
      return data?.deployments || [];
    } catch (error) {
      console.error('Error getting deployments:', error);
      return [];
    }
  }
  
  /**
   * Format system version for display
   */
  public static formatSystemVersion(version: XMRTSystemVersion): string {
    return `🚀 **XMRT Ecosystem Status**
📦 Version: ${version.version}
🔗 Deployment ID: ${version.deploymentId}
💾 Commit: ${version.commitHash.substring(0, 7)}
📝 Message: "${version.commitMessage}"
⏰ Deployed: ${new Date(version.deployedAt).toLocaleString()}
✅ Status: ${version.status}
🌐 URL: ${version.serviceUrl}`;
  }
}

export const renderAPIService = RenderAPIService;
