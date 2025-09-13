/**
 * Quick Greeting Service - Provides instant contextual greetings without API calls
 * Used for immediate user feedback while AI processes in background
 */

interface QuickGreetingContext {
  isFounder?: boolean;
  conversationSummary?: string;
  totalMessageCount?: number;
  miningStats?: any;
}

export class QuickGreetingService {
  private static instance: QuickGreetingService;

  public static getInstance(): QuickGreetingService {
    if (!QuickGreetingService.instance) {
      QuickGreetingService.instance = new QuickGreetingService();
    }
    return QuickGreetingService.instance;
  }

  private greetingTemplates = {
    returnUser: [
      "Welcome back! I remember we discussed {summary}. How can I help you continue our conversation or explore something new?",
      "Good to see you again! Last time we talked about {summary}. What would you like to work on today?",
      "Hello again! I recall our conversation about {summary}. How can I assist you further with XMRT-DAO?",
    ],
    newFounder: [
      "Welcome back, founder! How can I assist with XMRT-DAO today?",
      "Hello, founder! Ready to continue building the future of decentralized mining?",
      "Welcome! What aspects of XMRT-DAO shall we work on today?",
    ],
    newUser: [
      "Hello! I'm Eliza, your XMRT-DAO AI assistant. How can I help you get started?",
      "Welcome to XMRT-DAO! I'm here to help you understand our decentralized mining ecosystem.",
      "Hi there! I'm Eliza, ready to assist you with XMRT-DAO. What would you like to know?",
    ]
  };

  /**
   * Generate instant greeting without API calls
   */
  public generateQuickGreeting(context: QuickGreetingContext = {}): string {
    const { isFounder, conversationSummary, totalMessageCount } = context;

    // Return user with conversation history
    if (conversationSummary && totalMessageCount && totalMessageCount > 0) {
      const template = this.getRandomTemplate(this.greetingTemplates.returnUser);
      const shortSummary = this.truncateSummary(conversationSummary, 100);
      return template.replace('{summary}', shortSummary);
    }

    // New founder
    if (isFounder) {
      return this.getRandomTemplate(this.greetingTemplates.newFounder);
    }

    // New user
    return this.getRandomTemplate(this.greetingTemplates.newUser);
  }

  /**
   * Store conversation summary in localStorage for instant access
   */
  public cacheConversationSummary(sessionId: string, summary: string, messageCount: number): void {
    try {
      const cache = {
        summary,
        messageCount,
        timestamp: Date.now(),
        sessionId
      };
      localStorage.setItem('xmrt-last-conversation', JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to cache conversation summary:', error);
    }
  }

  /**
   * Retrieve cached conversation summary for instant greeting
   */
  public getCachedConversationSummary(): { summary: string; messageCount: number } | null {
    try {
      const cached = localStorage.getItem('xmrt-last-conversation');
      if (!cached) return null;

      const cache = JSON.parse(cached);
      
      // Cache expires after 24 hours
      if (Date.now() - cache.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('xmrt-last-conversation');
        return null;
      }

      return {
        summary: cache.summary,
        messageCount: cache.messageCount
      };
    } catch (error) {
      console.warn('Failed to retrieve cached conversation summary:', error);
      return null;
    }
  }

  private getRandomTemplate(templates: string[]): string {
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private truncateSummary(summary: string, maxLength: number): string {
    if (summary.length <= maxLength) return summary;
    return summary.substring(0, maxLength - 3) + '...';
  }
}

// Export singleton instance
export const quickGreetingService = QuickGreetingService.getInstance();