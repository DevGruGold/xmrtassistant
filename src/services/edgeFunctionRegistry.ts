import { supabase } from '@/integrations/supabase/client';

export interface EdgeFunctionCapability {
  name: string;
  url: string;
  description: string;
  capabilities: string[];
  category: 'ai' | 'mining' | 'web' | 'speech' | 'faucet' | 'ecosystem' | 'deployment';
  example_use: string;
}

export const EDGE_FUNCTIONS_REGISTRY: EdgeFunctionCapability[] = [
  {
    name: 'gemini-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/gemini-chat',
    description: 'Primary AI chat using Google Gemini via Lovable AI Gateway',
    capabilities: ['AI conversation', 'Context-aware responses', 'Memory integration'],
    category: 'ai',
    example_use: 'Main conversational AI for complex reasoning and contextual understanding'
  },
  {
    name: 'openai-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/openai-chat',
    description: 'Alternative AI chat using OpenAI GPT models',
    capabilities: ['AI conversation', 'OpenAI GPT-4/GPT-5', 'Fallback AI'],
    category: 'ai',
    example_use: 'Alternative AI when Gemini is unavailable or specific GPT features needed'
  },
  {
    name: 'wan-ai-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/wan-ai-chat',
    description: 'WAN AI chat integration',
    capabilities: ['Alternative AI service', 'Specialized AI tasks'],
    category: 'ai',
    example_use: 'Specialized AI tasks or WAN-specific features'
  },
  {
    name: 'ai-chat',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/ai-chat',
    description: 'General AI chat endpoint',
    capabilities: ['General AI conversation', 'Multi-model support'],
    category: 'ai',
    example_use: 'General purpose AI chat interface'
  },
  {
    name: 'playwright-browse',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/playwright-browse',
    description: 'Web browsing and scraping using Playwright automation',
    capabilities: ['Web browsing', 'Page scraping', 'Dynamic content extraction', 'JavaScript rendering'],
    category: 'web',
    example_use: 'Browse websites, extract data, interact with web pages, research real-time information'
  },
  {
    name: 'mining-proxy',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/mining-proxy',
    description: 'Mining statistics and pool data proxy',
    capabilities: ['Mining stats', 'Hash rate monitoring', 'Share tracking', 'XMR balance'],
    category: 'mining',
    example_use: 'Get current mining performance, shares, and earnings'
  },
  {
    name: 'supportxmr-proxy',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/supportxmr-proxy',
    description: 'Direct SupportXMR pool API proxy',
    capabilities: ['Pool statistics', 'Worker status', 'Payment history'],
    category: 'mining',
    example_use: 'Access detailed pool information and worker statistics'
  },
  {
    name: 'speech-to-text',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/speech-to-text',
    description: 'Convert speech audio to text',
    capabilities: ['Audio transcription', 'Voice input processing', 'Speech recognition'],
    category: 'speech',
    example_use: 'Process voice input from users for voice-based interactions'
  },
  {
    name: 'text-to-speech',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/text-to-speech',
    description: 'Convert text to speech audio',
    capabilities: ['Voice synthesis', 'Audio generation', 'TTS output'],
    category: 'speech',
    example_use: 'Generate voice responses for users'
  },
  {
    name: 'openai-tts',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/openai-tts',
    description: 'OpenAI high-quality text-to-speech',
    capabilities: ['Premium voice synthesis', 'Multiple voice models', 'High quality audio'],
    category: 'speech',
    example_use: 'Generate high-quality voice responses using OpenAI voices'
  },
  {
    name: 'check-faucet-eligibility',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/check-faucet-eligibility',
    description: 'Check if user is eligible for XMRT faucet claim',
    capabilities: ['Eligibility verification', 'Cooldown checking', 'User validation'],
    category: 'faucet',
    example_use: 'Verify if user can claim XMRT tokens from faucet'
  },
  {
    name: 'claim-faucet-tokens',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/claim-faucet-tokens',
    description: 'Process XMRT token faucet claims',
    capabilities: ['Token distribution', 'Claim processing', 'Transaction creation'],
    category: 'faucet',
    example_use: 'Help users claim free XMRT tokens from the faucet'
  },
  {
    name: 'get-faucet-stats',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/get-faucet-stats',
    description: 'Get XMRT faucet statistics and status',
    capabilities: ['Faucet statistics', 'Distribution data', 'Claim history'],
    category: 'faucet',
    example_use: 'Display faucet usage statistics and availability'
  },
  {
    name: 'ecosystem-webhook',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/ecosystem-webhook',
    description: 'Handle ecosystem events and webhooks',
    capabilities: ['Event processing', 'Webhook handling', 'System notifications'],
    category: 'ecosystem',
    example_use: 'Process ecosystem events and integrate with external services'
  },
  {
    name: 'conversation-access',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/conversation-access',
    description: 'Manage conversation persistence and history',
    capabilities: ['Session management', 'Message storage', 'Conversation retrieval'],
    category: 'ecosystem',
    example_use: 'Store and retrieve conversation history for perfect memory'
  },
  {
    name: 'render-api',
    url: 'https://vawouugtzwmejxqkeqqj.supabase.co/functions/v1/render-api',
    description: 'Interface with Render deployment API',
    capabilities: ['Deployment status', 'System version tracking', 'Service monitoring'],
    category: 'deployment',
    example_use: 'Track XMRT Ecosystem deployment versions and status'
  }
];

export class EdgeFunctionService {
  /**
   * Get all available edge functions
   */
  public static getAllFunctions(): EdgeFunctionCapability[] {
    return EDGE_FUNCTIONS_REGISTRY;
  }
  
  /**
   * Get functions by category
   */
  public static getFunctionsByCategory(category: string): EdgeFunctionCapability[] {
    return EDGE_FUNCTIONS_REGISTRY.filter(f => f.category === category);
  }
  
  /**
   * Find function by name
   */
  public static findFunction(name: string): EdgeFunctionCapability | undefined {
    return EDGE_FUNCTIONS_REGISTRY.find(f => f.name === name);
  }
  
  /**
   * Search functions by capability
   */
  public static searchByCapability(query: string): EdgeFunctionCapability[] {
    const lowerQuery = query.toLowerCase();
    return EDGE_FUNCTIONS_REGISTRY.filter(f => 
      f.capabilities.some(cap => cap.toLowerCase().includes(lowerQuery)) ||
      f.description.toLowerCase().includes(lowerQuery)
    );
  }
  
  /**
   * Invoke an edge function
   */
  public static async invoke(functionName: string, body?: any): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: body || {}
      });
      
      if (error) {
        console.error(`Error invoking ${functionName}:`, error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Failed to invoke ${functionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Format edge function capabilities for AI context
   */
  public static formatCapabilitiesForAI(): string {
    const categories = ['ai', 'web', 'speech', 'mining', 'faucet', 'deployment', 'ecosystem'];
    
    let output = '🔧 **AVAILABLE EDGE FUNCTIONS & CAPABILITIES**\n\n';
    
    for (const category of categories) {
      const functions = this.getFunctionsByCategory(category);
      if (functions.length === 0) continue;
      
      output += `**${category.toUpperCase()} SERVICES:**\n`;
      functions.forEach(func => {
        output += `• **${func.name}**: ${func.description}\n`;
        output += `  Capabilities: ${func.capabilities.join(', ')}\n`;
        output += `  Use: ${func.example_use}\n`;
      });
      output += '\n';
    }
    
    return output;
  }
}

export const edgeFunctionService = EdgeFunctionService;
