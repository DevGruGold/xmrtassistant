// Disabled service - dependencies not available
export class ConversationPersistenceService {
  async getOrCreateSession(sessionKey: string): Promise<{ id: string; title: string }> {
    console.log('Conversation persistence disabled');
    return { id: 'mock-session', title: 'Mock Session' };
  }
  async saveMessage(sessionId: string, content: string, messageType: 'user' | 'assistant'): Promise<void> {
    console.log('Message saving disabled');
  }
  async updateSessionActivity(sessionId: string, messageCount: number): Promise<void> {
    console.log('Session activity tracking disabled');
  }
  async getRecentSummaries(sessionKey: string, limit: number = 5): Promise<any[]> {
    return [];
  }
  async trackInteractionPattern(sessionKey: string, patternName: string, patternData: Record<string, any>): Promise<void> {
    console.log('Interaction pattern tracking disabled');
  }
  async getUserPreference(sessionKey: string, preferenceKey: string): Promise<any> {
    return null;
  }
  async setUserPreference(sessionKey: string, preferenceKey: string, preferenceValue: any): Promise<void> {
    console.log('User preference setting disabled');
  }
  async getConversationInsights(sessionKey: string): Promise<any> {
    return { summaries: [], patterns: [], preferences: {} };
  }
  async closeSession(sessionKey: string): Promise<void> {
    console.log('Session closing disabled');
  }
}
export const conversationPersistenceService = new ConversationPersistenceService();