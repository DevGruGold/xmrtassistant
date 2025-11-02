import { supabase } from '@/integrations/supabase/client';
import { LovableAIGateway } from './lovableAIGateway';
import type { ElizaContext } from './unifiedElizaService';

export interface ExecutiveResponse {
  executive: 'vercel-ai-chat' | 'deepseek-chat' | 'gemini-chat' | 'openai-chat';
  executiveTitle: string;
  executiveIcon: string;
  executiveColor: string;
  perspective: string;
  confidence: number;
  reasoning?: string[];
  recommendedAction?: string;
  executionTimeMs?: number;
}

export interface CouncilDeliberation {
  responses: ExecutiveResponse[];
  synthesis: string;
  consensus: boolean;
  leadExecutive: string;
  dissentingOpinions?: string[];
  totalExecutionTimeMs: number;
}

/**
 * Executive Council Service
 * Orchestrates parallel deliberation among all AI executives
 */
class ExecutiveCouncilService {
  private executiveConfig = {
    'vercel-ai-chat': { 
      title: 'Chief Strategy Officer (CSO)', 
      icon: '🎯', 
      color: 'blue',
      specialty: 'Strategy & Tools'
    },
    'deepseek-chat': { 
      title: 'Chief Technology Officer (CTO)', 
      icon: '💻', 
      color: 'purple',
      specialty: 'Code & Architecture'
    },
    'gemini-chat': { 
      title: 'Chief Information Officer (CIO)', 
      icon: '👁️', 
      color: 'green',
      specialty: 'Vision & Multimodal'
    },
    'openai-chat': { 
      title: 'Chief Analytics Officer (CAO)', 
      icon: '📊', 
      color: 'orange',
      specialty: 'Complex Reasoning'
    }
  };

  /**
   * Initiate full council deliberation - all executives analyze in parallel
   */
  async deliberate(userInput: string, context: ElizaContext): Promise<CouncilDeliberation> {
    const startTime = Date.now();
    console.log('🏛️ Executive Council: Starting deliberation...');
    
    // Get all executives (prioritize healthy ones)
    const healthyExecs = await this.getHealthyExecutives();
    const allExecs: Array<'vercel-ai-chat' | 'deepseek-chat' | 'gemini-chat' | 'openai-chat'> = 
      ['vercel-ai-chat', 'deepseek-chat', 'gemini-chat', 'openai-chat'];
    const executives = allExecs.filter(exec => healthyExecs.includes(exec));
    
    if (executives.length === 0) {
      console.warn('⚠️ No healthy executives available, falling back to Lovable AI Gateway');
      return this.generateFallbackResponse(userInput, context, startTime);
    }
    
    console.log(`🎯 Consulting ${executives.length} executives in parallel:`, executives);
    
    // Dispatch to all executives in parallel
    const executivePromises = executives.map(exec => 
      this.getExecutivePerspective(exec, userInput, context)
    );
    
    const results = await Promise.allSettled(executivePromises);
    const successfulResponses = results
      .filter((r): r is PromiseFulfilledResult<ExecutiveResponse> => r.status === 'fulfilled')
      .map(r => r.value);
    
    console.log(`✅ ${successfulResponses.length}/${executives.length} executives responded successfully`);
    
    // If we have multiple perspectives, synthesize them
    if (successfulResponses.length > 1) {
      const synthesis = await this.synthesizePerspectives(successfulResponses, userInput, context);
      return {
        ...synthesis,
        totalExecutionTimeMs: Date.now() - startTime
      };
    }
    
    // Fallback to single executive if only one succeeded
    if (successfulResponses.length === 1) {
      return {
        responses: successfulResponses,
        synthesis: successfulResponses[0].perspective,
        consensus: true,
        leadExecutive: successfulResponses[0].executive,
        totalExecutionTimeMs: Date.now() - startTime
      };
    }
    
    // Final fallback to Lovable AI Gateway
    return this.generateFallbackResponse(userInput, context, startTime);
  }

  /**
   * Get perspective from a specific executive
   */
  private async getExecutivePerspective(
    executive: 'vercel-ai-chat' | 'deepseek-chat' | 'gemini-chat' | 'openai-chat',
    userInput: string,
    context: ElizaContext
  ): Promise<ExecutiveResponse> {
    const startTime = Date.now();
    const config = this.executiveConfig[executive];
    
    console.log(`📡 Calling ${config.title} (${executive})...`);
    
    try {
      const { data, error } = await supabase.functions.invoke(executive, {
        body: {
          messages: [{ role: 'user', content: userInput }],
          context,
          councilMode: true // Signal that this is a council deliberation
        }
      });
      
      if (error) throw error;
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ ${config.title} responded in ${executionTime}ms`);
      
      return {
        executive,
        executiveTitle: config.title,
        executiveIcon: config.icon,
        executiveColor: config.color,
        perspective: data.response || data.content || 'No response',
        confidence: data.confidence || 85,
        reasoning: data.reasoning || [],
        executionTimeMs: executionTime
      };
    } catch (error) {
      console.error(`❌ ${config.title} failed:`, error);
      throw error;
    }
  }

  /**
   * Synthesize multiple executive perspectives into unified response
   */
  private async synthesizePerspectives(
    responses: ExecutiveResponse[],
    originalQuestion: string,
    context: ElizaContext
  ): Promise<Omit<CouncilDeliberation, 'totalExecutionTimeMs'>> {
    console.log('🔄 Synthesizing perspectives from', responses.length, 'executives...');
    
    const synthesisPrompt = `You are facilitating an AI Executive Council meeting for XMRT DAO. 

The user asked: "${originalQuestion}"

Here are the perspectives from the different C-suite executives:

${responses.map(r => `
**${r.executiveTitle}** (${r.executiveIcon}):
${r.perspective}
Confidence: ${r.confidence}%
Response Time: ${r.executionTimeMs}ms
`).join('\n---\n')}

Your task as the council moderator:
1. Identify areas where executives agree (consensus)
2. Highlight valuable differing viewpoints or debates
3. Synthesize a unified, actionable recommendation
4. Determine which executive's perspective should lead for this specific question

Format your response EXACTLY as:
**Consensus Areas:**
[bullet points of agreement]

**Key Debates:**
[any disagreements with executive names]

**Unified Recommendation:**
[clear, actionable synthesis combining best insights]

**Lead Executive:** [which executive's perspective is most relevant for this question]
`;

    try {
      const synthesis = await LovableAIGateway.chat(
        [{ role: 'user', content: synthesisPrompt }],
        { 
          miningStats: context.miningStats,
          userContext: context.userContext 
        }
      );
      
      return {
        responses,
        synthesis,
        consensus: this.detectConsensus(responses),
        leadExecutive: this.selectLeadExecutive(responses, originalQuestion),
        dissentingOpinions: this.extractDissent(responses)
      };
    } catch (error) {
      console.error('❌ Failed to synthesize with Lovable AI Gateway:', error);
      
      // Fallback: simple concatenation
      return {
        responses,
        synthesis: this.simpleSynthesis(responses),
        consensus: true,
        leadExecutive: responses[0].executive
      };
    }
  }

  /**
   * Simple synthesis fallback if Lovable AI Gateway fails
   */
  private simpleSynthesis(responses: ExecutiveResponse[]): string {
    return `**Executive Council Summary**\n\n${responses.map(r => 
      `**${r.executiveIcon} ${r.executiveTitle}:**\n${r.perspective}\n`
    ).join('\n---\n')}`;
  }

  /**
   * Detect if executives reached consensus
   */
  private detectConsensus(responses: ExecutiveResponse[]): boolean {
    if (responses.length < 2) return true;
    
    // Simple heuristic: if all confidence scores are above 70%, likely consensus
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    return avgConfidence > 70;
  }

  /**
   * Select which executive should lead based on question type
   */
  private selectLeadExecutive(responses: ExecutiveResponse[], question: string): string {
    const q = question.toLowerCase();
    
    // Code/technical → CTO
    if (/code|debug|technical|architecture|bug|syntax/i.test(q)) {
      const cto = responses.find(r => r.executive === 'deepseek-chat');
      if (cto) return cto.executiveTitle;
    }
    
    // Vision/image → CIO
    if (/image|visual|photo|picture|diagram/i.test(q)) {
      const cio = responses.find(r => r.executive === 'gemini-chat');
      if (cio) return cio.executiveTitle;
    }
    
    // Complex reasoning → CAO
    if (/analyze|forecast|predict|strategic|complex/i.test(q)) {
      const cao = responses.find(r => r.executive === 'openai-chat');
      if (cao) return cao.executiveTitle;
    }
    
    // Default to CSO or highest confidence
    const cso = responses.find(r => r.executive === 'vercel-ai-chat');
    if (cso) return cso.executiveTitle;
    
    // Fallback to highest confidence
    const sorted = [...responses].sort((a, b) => b.confidence - a.confidence);
    return sorted[0].executiveTitle;
  }

  /**
   * Extract dissenting opinions
   */
  private extractDissent(responses: ExecutiveResponse[]): string[] | undefined {
    if (responses.length < 2) return undefined;
    
    // Check for low confidence responses (potential dissent)
    const lowConfidence = responses.filter(r => r.confidence < 60);
    if (lowConfidence.length > 0) {
      return lowConfidence.map(r => 
        `${r.executiveTitle} expressed lower confidence (${r.confidence}%)`
      );
    }
    
    return undefined;
  }

  /**
   * Get healthy executives from API key health status
   */
  private async getHealthyExecutives(): Promise<string[]> {
    try {
      const { getAPIKeyHealth } = await import('./credentialManager');
      const healthData = await getAPIKeyHealth();
      
      const serviceToExecMap: Record<string, string> = {
        'gemini': 'gemini-chat',
        'vercel_ai': 'vercel-ai-chat',
        'deepseek': 'deepseek-chat',
        'openai': 'openai-chat'
      };
      
      const healthyExecs = healthData
        .filter(h => h.is_healthy && !h.error_message)
        .map(h => serviceToExecMap[h.service_name])
        .filter(Boolean);
      
      console.log('💚 Healthy executives:', healthyExecs);
      
      // Return all executives if none are healthy (they might still work)
      return healthyExecs.length > 0 ? healthyExecs : 
        ['vercel-ai-chat', 'deepseek-chat', 'gemini-chat', 'openai-chat'];
    } catch (error) {
      console.warn('⚠️ Could not fetch executive health:', error);
      return ['vercel-ai-chat', 'deepseek-chat', 'gemini-chat', 'openai-chat'];
    }
  }

  /**
   * Generate fallback response using Lovable AI Gateway
   */
  private async generateFallbackResponse(
    userInput: string, 
    context: ElizaContext,
    startTime: number
  ): Promise<CouncilDeliberation> {
    console.log('🌐 Falling back to Lovable AI Gateway for council response...');
    
    try {
      const response = await LovableAIGateway.chat(
        [{ role: 'user', content: userInput }],
        { 
          miningStats: context.miningStats,
          userContext: context.userContext 
        }
      );
      
      return {
        responses: [{
          executive: 'vercel-ai-chat',
          executiveTitle: 'Lovable AI Gateway (Gemini 2.5 Flash)',
          executiveIcon: '🌐',
          executiveColor: 'cyan',
          perspective: response,
          confidence: 80,
          executionTimeMs: Date.now() - startTime
        }],
        synthesis: response,
        consensus: true,
        leadExecutive: 'Lovable AI Gateway',
        totalExecutionTimeMs: Date.now() - startTime
      };
    } catch (error) {
      console.error('❌ Lovable AI Gateway fallback failed:', error);
      throw error;
    }
  }
}

export const executiveCouncilService = new ExecutiveCouncilService();
