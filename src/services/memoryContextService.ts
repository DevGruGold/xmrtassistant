import { supabase } from '@/integrations/supabase/client';

export interface MemoryContext {
  id: string;
  userId: string;
  sessionId: string;
  content: string;
  contextType: string;
  importanceScore: number;
  timestamp: Date;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export class MemoryContextService {
  private static instance: MemoryContextService;

  public static getInstance(): MemoryContextService {
    if (!MemoryContextService.instance) {
      MemoryContextService.instance = new MemoryContextService();
    }
    return MemoryContextService.instance;
  }

  // Store important context from conversations
  public async storeContext(
    userId: string,
    sessionId: string,
    content: string,
    contextType: string,
    importanceScore: number = 0.5,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('memory_contexts')
        .insert({
          user_id: userId,
          session_id: sessionId,
          content,
          context_type: contextType,
          importance_score: importanceScore,
          metadata: metadata || {}
        });

      if (error) {
        console.error('Error storing memory context:', error);
      }
    } catch (error) {
      console.error('Failed to store memory context:', error);
    }
  }

  // Retrieve relevant contexts for current conversation
  public async getRelevantContexts(
    userId: string,
    limit: number = 100
  ): Promise<MemoryContext[]> {
    try {
      const { data, error } = await supabase
        .from('memory_contexts')
        .select('*')
        .eq('user_id', userId)
        .order('importance_score', { ascending: false })
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching memory contexts:', error);
        return [];
      }

      return data?.map(ctx => ({
        id: ctx.id,
        userId: ctx.user_id,
        sessionId: ctx.session_id,
        content: ctx.content,
        contextType: ctx.context_type,
        importanceScore: ctx.importance_score,
        timestamp: new Date(ctx.timestamp),
        embedding: ctx.embedding,
        metadata: ctx.metadata as Record<string, any>
      })) || [];
    } catch (error) {
      console.error('Failed to get memory contexts:', error);
      return [];
    }
  }

  // Get contexts by type
  public async getContextsByType(
    userId: string,
    contextType: string,
    limit: number = 50
  ): Promise<MemoryContext[]> {
    try {
      const { data, error } = await supabase
        .from('memory_contexts')
        .select('*')
        .eq('user_id', userId)
        .eq('context_type', contextType)
        .order('importance_score', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching contexts by type:', error);
        return [];
      }

      return data?.map(ctx => ({
        id: ctx.id,
        userId: ctx.user_id,
        sessionId: ctx.session_id,
        content: ctx.content,
        contextType: ctx.context_type,
        importanceScore: ctx.importance_score,
        timestamp: new Date(ctx.timestamp),
        metadata: ctx.metadata as Record<string, any>
      })) || [];
    } catch (error) {
      console.error('Failed to get contexts by type:', error);
      return [];
    }
  }
}

export const memoryContextService = MemoryContextService.getInstance();
