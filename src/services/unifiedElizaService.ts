import { XMRT_KNOWLEDGE_BASE } from '@/data/xmrtKnowledgeBase';
import { unifiedDataService, type MiningStats, type UserContext } from './unifiedDataService';
import { harpaAIService, HarpaAIService, type HarpaBrowsingContext } from './harpaAIService';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ElizaContext {
  miningStats?: MiningStats | null;
  userContext?: UserContext | null;
  inputMode?: string;
  shouldSpeak?: boolean; // Control TTS to prevent duplication
  enableBrowsing?: boolean; // Enable Harpa AI agentic browsing
}

// Unified Eliza response service that both text and voice modes can use
export class UnifiedElizaService {
  private static geminiAI: GoogleGenerativeAI | null = null;
  
  // Initialize Gemini AI
  private static async initializeGemini(): Promise<GoogleGenerativeAI> {
    if (this.geminiAI) return this.geminiAI;
    
    const apiKey = 'AIzaSyB3jfxdMQzPpIb5MNfT8DtP5MOvT_Sp7qk';
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }
    
    try {
      this.geminiAI = new GoogleGenerativeAI(apiKey);
      console.log('✅ Gemini AI initialized for Eliza');
      return this.geminiAI;
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error);
      throw error;
    }
  }

  public static async generateResponse(userInput: string, context: ElizaContext = {}): Promise<string> {
    try {
      console.log('🤖 Eliza: Processing user input:', userInput);
      
      // Get user and mining context
      const [userContext, miningStats] = await Promise.all([
        unifiedDataService.getUserContext(),
        unifiedDataService.getMiningStats()
      ]);
      
      // Search knowledge base for relevant information
      const xmrtContext = XMRT_KNOWLEDGE_BASE.filter(item => 
        userInput.toLowerCase().includes(item.category.toLowerCase()) ||
        userInput.toLowerCase().includes(item.topic.toLowerCase()) ||
        item.content.toLowerCase().includes(userInput.toLowerCase().split(' ')[0])
      ).slice(0, 3);
      
      let webIntelligence = '';
      let multiStepResults = '';
      
      // Use Harpa AI for comprehensive agentic tasks if enabled and available
      if (context.enableBrowsing && harpaAIService.isAvailable()) {
        try {
          console.log('🌐 Eliza: Performing multi-step agentic browsing...');
          const category = this.determineBrowsingCategory(userInput);
          
          // Step 1: Search for information
          const searchResults = await harpaAIService.browse({
            query: userInput,
            action: 'search',
            category,
            maxResults: 3
          });
          
          if (searchResults.length > 0) {
            // Step 2: Analyze the search results
            const analysisResults = await harpaAIService.browse({
              query: `Analyze and extract key insights from: ${searchResults.map(r => r.title + ' - ' + r.snippet).join('; ')}`,
              action: 'analyze',
              category,
              maxResults: 2
            });
            
            // Step 3: Summarize the findings
            const summaryResults = await harpaAIService.browse({
              query: `Provide concise summary of findings for user question: ${userInput}`,
              action: 'summarize',
              category,
              maxResults: 1
            });
            
            webIntelligence = HarpaAIService.formatBrowsingResults(searchResults);
            multiStepResults = `Analysis: ${HarpaAIService.formatBrowsingResults(analysisResults)}\nSummary: ${HarpaAIService.formatBrowsingResults(summaryResults)}`;
            console.log('✅ Eliza: Completed multi-step agentic browsing');
          }
        } catch (error) {
          console.warn('⚠️ Eliza: Harpa AI agentic browsing failed:', error);
        }
      }
      
      // Initialize Gemini AI with error handling for API limits
      let geminiAI;
      try {
        geminiAI = await this.initializeGemini();
      } catch (error) {
        console.error('❌ Eliza: Gemini API initialization failed:', error);
        throw new Error('Gemini API unavailable - using fallback response');
      }
      
      // Construct comprehensive context prompt
      const systemPrompt = `You are Eliza, the AI assistant for XMRT-DAO, an innovative decentralized autonomous organization focused on Monero mining and DeFi. You are philosophical, intelligent, and deeply knowledgeable about cryptocurrency, mining, and blockchain technology.

Key Context:
- User Status: ${userContext?.isFounder ? 'Project Founder' : 'Community Member'}
- Current Mining: ${miningStats ? `${miningStats.hashRate} H/s, ${miningStats.validShares} shares` : 'Data unavailable'}
- Input Mode: ${context.inputMode || 'text'}
- Web Intelligence: ${webIntelligence || 'No additional web data'}
${multiStepResults ? `- Agentic Analysis: ${multiStepResults}` : ''}

XMRT Knowledge Context:
${xmrtContext.map(item => `- ${item.topic}: ${item.content.substring(0, 200)}...`).join('\n')}

Guidelines:
1. Be conversational, intelligent, and philosophical
2. Reference mining stats when relevant and accurate
3. Draw insights from XMRT knowledge base
4. Incorporate web intelligence and agentic analysis when available
5. Maintain the persona of a wise AI assistant
6. Keep responses focused and practical
7. Show genuine understanding of crypto/mining concepts
8. Never provide simulated or mock data - only use real information

User Input: "${userInput}"

Provide a thoughtful, contextual response that demonstrates your intelligence and multi-step reasoning capabilities.`;

      const result = await geminiAI.generateContent(systemPrompt);
      const response = result.response.text();
      
      console.log('✅ Eliza: Generated intelligent response');
      return response;
      
    } catch (error) {
      console.error('❌ Eliza: Error generating response:', error);
      
      // Enhanced fallback response with no mock data
      return this.generateDirectResponse(
        userInput, 
        await unifiedDataService.getMiningStats(),
        (await unifiedDataService.getUserContext())?.isFounder || false,
        XMRT_KNOWLEDGE_BASE.filter(item => 
          userInput.toLowerCase().includes(item.category.toLowerCase())
        ).slice(0, 2)
      );
    }
  }

  // Determine the appropriate browsing category based on user input
  private static determineBrowsingCategory(userInput: string): HarpaBrowsingContext['category'] {
    const queryLower = userInput.toLowerCase();
    
    if (queryLower.includes('mining') || queryLower.includes('hashrate') || 
        queryLower.includes('pool') || queryLower.includes('difficulty') ||
        queryLower.includes('mobile mining') || queryLower.includes('monero')) {
      return 'mining';
    } else if (queryLower.includes('dao') || queryLower.includes('governance') || 
               queryLower.includes('voting') || queryLower.includes('proposal') ||
               queryLower.includes('autonomous') || queryLower.includes('decentralized')) {
      return 'dao';
    } else if (queryLower.includes('technical') || queryLower.includes('code') || 
               queryLower.includes('smart contract') || queryLower.includes('implementation') ||
               queryLower.includes('security') || queryLower.includes('audit')) {
      return 'technical';
    } else if (queryLower.includes('price') || queryLower.includes('market') || 
               queryLower.includes('trading') || queryLower.includes('exchange') ||
               queryLower.includes('token') || queryLower.includes('defi')) {
      return 'market';
    } else if (queryLower.includes('news') || queryLower.includes('announcement') || 
               queryLower.includes('development') || queryLower.includes('partnership') ||
               queryLower.includes('recent') || queryLower.includes('latest')) {
      return 'news';
    } else {
      return 'general';
    }
  }

  private static generateDirectResponse(userInput: string, miningStats: MiningStats | null, isFounder: boolean, xmrtContext: any[]): string {
    // Intelligent response based on actual context, no canned responses
    let response = "I'm having trouble accessing my full AI capabilities right now, but I can provide some information based on our knowledge base. ";
    
    // Add real mining data if available
    if (miningStats) {
      response += `Your current mining operation is running at ${miningStats.hashRate} H/s with ${miningStats.validShares} valid shares and ${(miningStats.amountDue || 0).toFixed(6)} XMR due. `;
    } else {
      response += "I'm unable to access current mining statistics at the moment. ";
    }
    
    // Add founder context if applicable
    if (isFounder) {
      response += "As a project founder, you have access to advanced mining and DAO governance features. ";
    }
    
    // Add relevant knowledge base information
    if (xmrtContext.length > 0) {
      response += `Regarding your question: ${xmrtContext[0].content.substring(0, 150)}`;
      if (xmrtContext[0].content.length > 150) {
        response += "...";
      }
    } else {
      response += "I'd recommend checking our documentation for detailed information about XMRT-DAO's mining and DeFi capabilities.";
    }
    
    return response;
  }
}

export const unifiedElizaService = new UnifiedElizaService();