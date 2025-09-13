// HARPA AI Agentic Browsing Service for Multi-step Tasks
export interface HarpaBrowsingResult {
  title: string;
  url: string;
  content: string;
  summary: string;
  relevance: number;
  timestamp: Date;
  source: 'harpa';
}

export interface HarpaBrowsingContext {
  query: string;
  action: 'search' | 'scrape' | 'analyze' | 'summarize';
  category?: 'mining' | 'dao' | 'technical' | 'general' | 'market' | 'news';
  urls?: string[];
  maxResults?: number;
}

export class HarpaAIService {
  private apiKey: string;
  private baseUrl = 'https://api.harpa.ai/api/v1/grid';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Main agentic browsing method
  async browse(context: HarpaBrowsingContext): Promise<HarpaBrowsingResult[]> {
    try {
      console.log('🤖 Harpa AI: Initiating agentic browsing...', context.query);
      
      switch (context.action) {
        case 'search':
          return await this.performWebSearch(context);
        case 'scrape':
          return await this.scrapeUrls(context);
        case 'analyze':
          return await this.analyzeContent(context);
        case 'summarize':
          return await this.summarizeContent(context);
        default:
          return await this.performWebSearch(context);
      }
    } catch (error) {
      console.error('❌ Harpa AI browsing error:', error);
      return [];
    }
  }

  // Perform web search using Harpa AI
  private async performWebSearch(context: HarpaBrowsingContext): Promise<HarpaBrowsingResult[]> {
    try {
      console.log('🔍 Harpa AI: Performing web search for:', context.query);
      
      const payload = {
        action: 'search',
        query: context.query,
        max_results: context.maxResults || 5,
        category: context.category || 'general',
      };
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Harpa AI API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseHarpaResults(data.results || []);
      
    } catch (error) {
      console.error('Harpa search API error:', error);
      return [];
    }
  }

  private async scrapeUrls(context: HarpaBrowsingContext): Promise<HarpaBrowsingResult[]> {
    return []; // Simplified for now
  }

  private async analyzeContent(context: HarpaBrowsingContext): Promise<HarpaBrowsingResult[]> {
    return this.performWebSearch({ ...context, query: `Analyze: ${context.query}` });
  }

  private async summarizeContent(context: HarpaBrowsingContext): Promise<HarpaBrowsingResult[]> {
    return this.performWebSearch({ ...context, query: `Summarize: ${context.query}` });
  }

  private parseHarpaResults(results: any[]): HarpaBrowsingResult[] {
    return results.map(result => ({
      title: result.title || 'No title',
      url: result.url || '',
      content: result.content || result.snippet || '',
      summary: result.summary || result.snippet || '',
      relevance: result.relevance || 0.5,
      timestamp: new Date(),
      source: 'harpa' as const
    }));
  }

  // Static method to format browsing results
  static formatBrowsingResults(results: HarpaBrowsingResult[]): string {
    if (!results.length) return 'No web intelligence available.';
    
    return results.map(result => 
      `${result.title}: ${result.summary}`
    ).join('; ');
  }

  // Check if service is available
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  // Get service status
  getStatus(): { connected: boolean; apiKey: string } {
    return {
      connected: !!this.apiKey,
      apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : 'Not set'
    };
  }
}

// Create and export the service instance  
export const harpaAIService = new HarpaAIService('hrp-kfiR-I62rwkTFqOOMd5WjYy3ZPx2T9Y7ysgrl7nwczjlwyDOPe8MHs2xCpkniT16E7W6hQmeGufOc0LyFetus');