// Disabled service - dependencies not available
export class ConversationSummarizationService {
  async createSummary(sessionId: string, messages: any[], options?: any): Promise<any> {
    console.log('Conversation summarization disabled');
    return {
      id: 'mock-summary',
      sessionId,
      summaryText: 'Summary unavailable',
      messageCount: messages.length,
      startMessageId: 'mock-start',
      endMessageId: 'mock-end',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {}
    };
  }
  async getSummariesForSession(sessionId: string): Promise<any[]> {
    return [];
  }
  async regenerateSummary(summaryId: string, messages: any[]): Promise<any> {
    return null;
  }
  async deleteSummary(summaryId: string): Promise<void> {
    console.log('Summary deletion disabled');
  }
  async getConversationContext(sessionId: string, options?: any): Promise<string> {
    return 'Conversation context unavailable';
  }
}
export const conversationSummarizationService = new ConversationSummarizationService();