/**
 * Context Builder - Shared utility for building contextual prompts
 * 
 * This module provides a consistent way to inject context (memory, conversation history,
 * user context, mining stats, system version) into AI prompts across all edge functions.
 */

interface ContextOptions {
  conversationHistory?: {
    summaries?: Array<{ summaryText: string; messageCount: number }>;
    recentMessages?: Array<{ sender: string; content: string }>;
    userPreferences?: Record<string, any>;
    interactionPatterns?: Array<{ patternName: string; frequency: number; confidence: number }>;
    memoryContexts?: Array<{ contextType: string; content: string; importanceScore: number }>;
  };
  userContext?: {
    ip: string;
    isFounder: boolean;
    sessionKey: string;
  };
  miningStats?: {
    hashRate?: number | string;
    hashrate?: number | string;
    validShares?: number;
    amountDue?: number | string;
    amtDue?: number | string;
    amountPaid?: number | string;
    amtPaid?: number | string;
    totalHashes?: number | string;
    isOnline?: boolean;
    workers?: number | string;
  };
  systemVersion?: {
    version: string;
    deploymentId: string;
    commitHash: string;
    commitMessage: string;
    deployedAt: string;
    status: string;
  };
  memoryContexts?: Array<{ contextType: string; content: string; importanceScore: number }>;
}

/**
 * Builds a contextual prompt by appending relevant context to a base prompt
 * 
 * @param basePrompt - The base system prompt (usually from generateElizaSystemPrompt())
 * @param options - Context options to inject
 * @returns Enhanced prompt with all relevant context
 */
export function buildContextualPrompt(
  basePrompt: string,
  options: ContextOptions
): string {
  let prompt = basePrompt;
  
  // Add conversation history summaries
  if (options.conversationHistory?.summaries?.length) {
    prompt += `\n\n📜 PREVIOUS CONVERSATION SUMMARIES:\n`;
    options.conversationHistory.summaries.forEach((summary) => {
      prompt += `• ${summary.summaryText} (${summary.messageCount} messages)\n`;
    });
  }
  
  // Add recent messages
  if (options.conversationHistory?.recentMessages?.length) {
    prompt += `\n\n💬 RECENT MESSAGES:\n`;
    options.conversationHistory.recentMessages.forEach((msg) => {
      prompt += `${msg.sender}: ${msg.content}\n`;
    });
  }
  
  // Add user preferences
  if (options.conversationHistory?.userPreferences && 
      Object.keys(options.conversationHistory.userPreferences).length > 0) {
    prompt += `\n\n⚙️ USER PREFERENCES:\n${JSON.stringify(options.conversationHistory.userPreferences, null, 2)}\n`;
  }
  
  // Add interaction patterns
  if (options.conversationHistory?.interactionPatterns?.length) {
    prompt += `\n\n🎯 INTERACTION PATTERNS:\n`;
    options.conversationHistory.interactionPatterns.forEach((pattern) => {
      prompt += `• ${pattern.patternName}: ${pattern.frequency} times (${(pattern.confidence * 100).toFixed(0)}% confidence)\n`;
    });
  }
  
  // Add memory contexts (prioritize the high-importance ones)
  const memoryContexts = options.memoryContexts || options.conversationHistory?.memoryContexts;
  if (memoryContexts?.length) {
    const sortedMemories = [...memoryContexts]
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 50); // Limit to top 50 memories
    
    prompt += `\n\n📚 MEMORY BANK (Perfect Recall):\n`;
    sortedMemories.forEach((memory) => {
      prompt += `[${memory.contextType}] ${memory.content}\n`;
    });
  }
  
  // Add user context
  if (options.userContext) {
    prompt += `\n\n👤 USER CONTEXT:\n`;
    prompt += `IP: ${options.userContext.ip}\n`;
    if (options.userContext.isFounder) {
      prompt += `🎖️ FOUNDER ACCESS\n`;
    }
    prompt += `Session: ${options.userContext.sessionKey}\n`;
  }
  
  // Add mining stats (normalize field names)
  if (options.miningStats) {
    const stats = options.miningStats;
    prompt += `\n\n⛏️ CURRENT MINING STATS:\n`;
    
    const hashRate = stats.hashRate || stats.hashrate;
    if (hashRate !== undefined) {
      prompt += `Hash Rate: ${hashRate} H/s\n`;
    }
    
    if (stats.validShares !== undefined) {
      prompt += `Valid Shares: ${stats.validShares}\n`;
    }
    
    const amtDue = stats.amountDue || stats.amtDue;
    if (amtDue !== undefined) {
      prompt += `Amount Due: ${amtDue} XMR\n`;
    }
    
    const amtPaid = stats.amountPaid || stats.amtPaid;
    if (amtPaid !== undefined) {
      prompt += `Amount Paid: ${amtPaid} XMR\n`;
    }
    
    if (stats.totalHashes !== undefined) {
      prompt += `Total Hashes: ${stats.totalHashes}\n`;
    }
    
    if (stats.workers !== undefined) {
      prompt += `Workers: ${stats.workers}\n`;
    }
    
    if (stats.isOnline !== undefined) {
      prompt += `Status: ${stats.isOnline ? 'Online' : 'Offline'}\n`;
    }
  }
  
  // Add system version
  if (options.systemVersion) {
    prompt += `\n\n🚀 SYSTEM VERSION:\n`;
    prompt += `Version: ${options.systemVersion.version}\n`;
    prompt += `Deployment ID: ${options.systemVersion.deploymentId}\n`;
    prompt += `Commit: ${options.systemVersion.commitHash}\n`;
    prompt += `Message: ${options.systemVersion.commitMessage}\n`;
    prompt += `Deployed: ${options.systemVersion.deployedAt}\n`;
    prompt += `Status: ${options.systemVersion.status}\n`;
  }
  
  return prompt;
}
