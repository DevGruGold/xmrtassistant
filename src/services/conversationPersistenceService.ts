import { supabase } from '@/integrations/supabase/client';

export interface ConversationMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConversationSession {
  id: string;
  sessionKey: string;
  title?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export class ConversationPersistenceService {
  private static instance: ConversationPersistenceService;
  private currentSessionId: string | null = null;
  private userIP: string | null = null;

  public static getInstance(): ConversationPersistenceService {
    if (!ConversationPersistenceService.instance) {
      ConversationPersistenceService.instance = new ConversationPersistenceService();
    }
    return ConversationPersistenceService.instance;
  }

  // Get user's IP address
  private async getUserIP(): Promise<string> {
    if (this.userIP) return this.userIP;
    
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.userIP = data.ip;
      return this.userIP;
    } catch (error) {
      console.warn('Failed to get IP, using fallback:', error);
      this.userIP = `local-${Date.now()}`;
      return this.userIP;
    }
  }

  // Initialize or resume session for current IP
  public async initializeSession(): Promise<string> {
    const userIP = await this.getUserIP();
    const sessionKey = `ip-${userIP}`;

    try {
      // Look for existing active session
      const { data: existingSessions, error: fetchError } = await supabase
        .from('conversation_sessions')
        .select('*')
        .eq('session_key', sessionKey)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching session:', fetchError);
        throw fetchError;
      }

      if (existingSessions && existingSessions.length > 0) {
        // Resume existing session
        this.currentSessionId = existingSessions[0].id;
        console.log(`Resumed session ${this.currentSessionId} for IP ${userIP}`);
        return this.currentSessionId;
      }

      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from('conversation_sessions')
        .insert({
          session_key: sessionKey,
          title: `Conversation - ${new Date().toLocaleDateString()}`,
          is_active: true,
          metadata: { 
            userIP,
            startedAt: new Date().toISOString(),
            platform: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
          }
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating session:', createError);
        throw createError;
      }

      this.currentSessionId = newSession.id;
      console.log(`Created new session ${this.currentSessionId} for IP ${userIP}`);
      return this.currentSessionId;

    } catch (error) {
      console.error('Failed to initialize session:', error);
      // Fallback to local session ID
      this.currentSessionId = `local-${userIP}-${Date.now()}`;
      return this.currentSessionId;
    }
  }

  // Store a message in the conversation
  public async storeMessage(
    content: string,
    sender: 'user' | 'assistant',
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.currentSessionId) {
      await this.initializeSession();
    }

    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          session_id: this.currentSessionId,
          content,
          message_type: sender,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        });

      if (error) {
        console.error('Error storing message:', error);
        return;
      }

      // Update session timestamp
      await supabase
        .from('conversation_sessions')
        .update({ 
          updated_at: new Date().toISOString(),
          metadata: {
            lastActivity: new Date().toISOString(),
            messageCount: await this.getMessageCount()
          }
        })
        .eq('id', this.currentSessionId);

    } catch (error) {
      console.error('Failed to store message:', error);
    }
  }

  // Get conversation history for current session
  public async getConversationHistory(limit: number = 50): Promise<ConversationMessage[]> {
    if (!this.currentSessionId) {
      return [];
    }

    try {
      const { data: messages, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', this.currentSessionId)
        .order('timestamp', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching conversation history:', error);
        return [];
      }

      return messages?.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.message_type as 'user' | 'assistant',
        timestamp: new Date(msg.timestamp),
        metadata: (msg.metadata as Record<string, any>) || {}
      })) || [];

    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  // Get message count for current session
  private async getMessageCount(): Promise<number> {
    if (!this.currentSessionId) return 0;

    try {
      const { count, error } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', this.currentSessionId);

      if (error) {
        console.error('Error getting message count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get message count:', error);
      return 0;
    }
  }

  // Store interaction patterns for learning
  public async storeInteractionPattern(
    patternName: string,
    patternData: Record<string, any>,
    confidenceScore: number = 0.5
  ): Promise<void> {
    try {
      const userIP = await this.getUserIP();
      const sessionKey = `ip-${userIP}`;

      // Check if pattern exists
      const { data: existing, error: fetchError } = await supabase
        .from('interaction_patterns')
        .select('*')
        .eq('session_key', sessionKey)
        .eq('pattern_name', patternName)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing pattern:', fetchError);
        return;
      }

      if (existing) {
        // Update existing pattern
        await supabase
          .from('interaction_patterns')
          .update({
            pattern_data: patternData,
            frequency: existing.frequency + 1,
            last_occurrence: new Date().toISOString(),
            confidence_score: Math.min(existing.confidence_score + 0.1, 1.0)
          })
          .eq('id', existing.id);
      } else {
        // Create new pattern
        await supabase
          .from('interaction_patterns')
          .insert({
            session_key: sessionKey,
            pattern_name: patternName,
            pattern_data: patternData,
            frequency: 1,
            confidence_score: confidenceScore,
            metadata: {
              firstSeen: new Date().toISOString(),
              userIP
            }
          });
      }
    } catch (error) {
      console.error('Failed to store interaction pattern:', error);
    }
  }

  // Get user preferences
  public async getUserPreferences(): Promise<Record<string, any>> {
    try {
      const userIP = await this.getUserIP();
      const sessionKey = `ip-${userIP}`;

      const { data: preferences, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('session_key', sessionKey);

      if (error) {
        console.error('Error fetching preferences:', error);
        return {};
      }

      return preferences?.reduce((acc, pref) => {
        acc[pref.preference_key] = pref.preference_value;
        return acc;
      }, {} as Record<string, any>) || {};

    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return {};
    }
  }

  // Update user preference
  public async updateUserPreference(key: string, value: any): Promise<void> {
    try {
      const userIP = await this.getUserIP();
      const sessionKey = `ip-${userIP}`;

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          session_key: sessionKey,
          preference_key: key,
          preference_value: value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'session_key,preference_key'
        });

      if (error) {
        console.error('Error updating preference:', error);
      }
    } catch (error) {
      console.error('Failed to update user preference:', error);
    }
  }

  // Close current session
  public async closeSession(): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      await supabase
        .from('conversation_sessions')
        .update({ 
          is_active: false,
          metadata: {
            closedAt: new Date().toISOString()
          }
        })
        .eq('id', this.currentSessionId);

      this.currentSessionId = null;
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  }
}

export const conversationPersistence = ConversationPersistenceService.getInstance();