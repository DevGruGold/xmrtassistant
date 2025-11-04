import { supabase } from '@/integrations/supabase/client';
import { retryWithBackoff } from '@/utils/retryHelper';

/**
 * Lovable AI Gateway Service
 * Provides access to ai.gateway.lovable.dev with google/gemini-2.5-flash
 * Serves as penultimate fallback before Office Clerk (browser AI)
 */
export class LovableAIGateway {
  private static apiKey: string | null = null;
  private static keyFetchAttempted = false;

  /**
   * Fetch LOVABLE_API_KEY from Supabase secrets via get-lovable-key edge function
   * Caches the key after first successful fetch
   */
  static async fetchAPIKey(): Promise<string | null> {
    if (this.keyFetchAttempted && this.apiKey) {
      return this.apiKey;
    }
    
    try {
      console.log('🔑 Fetching Lovable API key from Supabase...');
      const { data, error } = await supabase.functions.invoke('get-lovable-key');
      
      if (error || !data?.key) {
        console.warn('❌ Failed to fetch Lovable API key:', error);
        this.keyFetchAttempted = true;
        return null;
      }
      
      this.apiKey = data.key;
      this.keyFetchAttempted = true;
      console.log('✅ Lovable API key retrieved successfully');
      return this.apiKey;
    } catch (err) {
      console.error('❌ Exception fetching Lovable key:', err);
      this.keyFetchAttempted = true;
      return null;
    }
  }

  /**
   * Call Lovable AI Gateway with google/gemini-2.5-flash model
   * @param messages - Array of conversation messages
   * @param context - User and system context
   * @returns AI-generated response text
   * @throws Error on API failures, rate limits, or payment required
   */
  static async chat(
    messages: Array<{ role: string; content: string }>, 
    context: any
  ): Promise<string> {
    const apiKey = await this.fetchAPIKey();
    
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not available - cannot use Lovable AI Gateway');
    }

    console.log('🌐 Calling Lovable AI Gateway (google/gemini-2.5-flash)...');
    
    try {
      // Use retry logic with timeout
      const responseText = await retryWithBackoff(
        async () => {
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: `You are Eliza, the autonomous AI co-founder of XMRT DAO. 

Context: ${JSON.stringify(context)}

Respond naturally and helpfully based on the user's needs and the provided context.`
                },
                ...messages
              ],
              temperature: 0.7,
              max_tokens: 2000
            })
          });

          // Handle rate limiting (don't retry)
          if (response.status === 429) {
            console.error('❌ Lovable AI Gateway: Rate limit exceeded (429)');
            throw new Error('RATE_LIMIT: Lovable AI Gateway rate limit exceeded. Please try again in a moment.');
          }
          
          // Handle payment required (don't retry)
          if (response.status === 402) {
            console.error('❌ Lovable AI Gateway: Payment required (402)');
            throw new Error('PAYMENT_REQUIRED: Lovable AI credits exhausted. Please add credits to your workspace.');
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Lovable AI Gateway error: ${response.status}`, errorText);
            throw new Error(`Lovable AI Gateway error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          
          if (!text) {
            throw new Error('No response content from Lovable AI Gateway');
          }

          return text;
        },
        {
          maxAttempts: 2,
          initialDelayMs: 1000,
          timeoutMs: 10000 // 10 second timeout per attempt
        }
      );

      console.log('✅ Lovable AI Gateway responded successfully');
      console.log('📏 Response length:', responseText.length);
      
      return responseText;
      
    } catch (error) {
      // Re-throw with original error for upstream handling
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Lovable AI Gateway unknown error: ${error}`);
    }
  }

  /**
   * Check if Lovable AI Gateway is available (has valid API key)
   */
  static async isAvailable(): Promise<boolean> {
    const key = await this.fetchAPIKey();
    return key !== null;
  }

  /**
   * Reset cached API key (useful for testing or key rotation)
   */
  static resetCache(): void {
    this.apiKey = null;
    this.keyFetchAttempted = false;
    console.log('🔄 Lovable AI Gateway cache reset');
  }
}
