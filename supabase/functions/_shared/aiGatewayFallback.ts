/**
 * Backend AI Gateway Fallback
 * Provides Lovable AI Gateway access for all edge functions
 * Auto-fallback when service-specific keys fail
 */

export interface AIGatewayOptions {
  model?: 'google/gemini-2.5-flash' | 'google/gemini-2.5-pro' | 'openai/gpt-5-mini';
  temperature?: number;
  max_tokens?: number;
  systemPrompt?: string;
}

export async function callLovableAIGateway(
  messages: Array<{ role: string; content: string }>,
  options: AIGatewayOptions = {}
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured in Supabase secrets');
  }

  console.log('🌐 Calling Lovable AI Gateway...');
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'google/gemini-2.5-flash',
      messages: options.systemPrompt 
        ? [{ role: 'system', content: options.systemPrompt }, ...messages]
        : messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Lovable AI Gateway error:', response.status, errorText);
    throw new Error(`Lovable AI Gateway error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function generateEmbedding(text: string): Promise<number[]> {
  // Try Gemini first if available
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (GEMINI_API_KEY) {
    console.log('🧠 Attempting Gemini embedding generation...');
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text }] }
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Gemini embedding generated');
        return data.embedding.values;
      }
      
      const errorText = await response.text();
      console.warn('⚠️ Gemini embedding failed:', errorText);
    } catch (error) {
      console.warn('⚠️ Gemini embedding error:', error.message);
    }
  }
  
  // Lovable AI Gateway doesn't support embeddings directly
  // This would require implementing semantic hashing as a workaround
  throw new Error('Embedding generation requires GEMINI_API_KEY - Lovable AI Gateway does not support embeddings');
}
