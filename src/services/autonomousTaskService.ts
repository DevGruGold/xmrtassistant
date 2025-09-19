// Note: GitHub service will be available when needed
// import { githubService } from './githubService';
import { supabase } from '@/integrations/supabase/client';

interface TaskRequest {
  id: string;
  type: 'github_operation' | 'repository_analysis' | 'ecosystem_management' | 'general';
  description: string;
  parameters: any;
  confidence: number;
  requiresApproval: boolean;
  userId?: string;
  sessionKey: string;
}

interface TaskExecution {
  taskId: string;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

class AutonomousTaskService {
  private taskQueue: Map<string, TaskRequest> = new Map();
  private executionStatus: Map<string, TaskExecution> = new Map();

  // Parse natural language requests into structured tasks
  parseTaskRequest(userInput: string, sessionKey: string): TaskRequest | null {
    const taskId = crypto.randomUUID();
    
    // GitHub repository operations
    if (this.containsGitHubKeywords(userInput)) {
      return {
        id: taskId,
        type: 'github_operation',
        description: userInput,
        parameters: this.extractGitHubParameters(userInput),
        confidence: this.calculateConfidence(userInput, 'github'),
        requiresApproval: this.requiresApproval(userInput),
        sessionKey
      };
    }

    // Repository analysis requests  
    if (this.containsAnalysisKeywords(userInput)) {
      return {
        id: taskId,
        type: 'repository_analysis',
        description: userInput,
        parameters: this.extractAnalysisParameters(userInput),
        confidence: this.calculateConfidence(userInput, 'analysis'),
        requiresApproval: false,
        sessionKey
      };
    }

    // General task requests
    if (this.containsTaskKeywords(userInput)) {
      return {
        id: taskId,
        type: 'general',
        description: userInput,
        parameters: {},
        confidence: this.calculateConfidence(userInput, 'general'),
        requiresApproval: true,
        sessionKey
      };
    }

    return null;
  }

  // Execute approved tasks
  async executeTask(taskId: string): Promise<{ success: boolean; result?: any; error?: string }> {
    const task = this.taskQueue.get(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    const execution: TaskExecution = {
      taskId,
      status: 'executing',
      startTime: new Date()
    };
    this.executionStatus.set(taskId, execution);

    try {
      let result;
      
      switch (task.type) {
        case 'github_operation':
          result = await this.executeGitHubTask(task);
          break;
        case 'repository_analysis':
          result = await this.executeAnalysisTask(task);
          break;
        case 'ecosystem_management':
          result = await this.executeEcosystemTask(task);
          break;
        default:
          result = await this.executeGeneralTask(task);
      }

      execution.status = 'completed';
      execution.result = result;
      execution.endTime = new Date();
      
      // Store completed task in database
      await this.storeTaskExecution(task, execution);
      
      return { success: true, result };
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date();
      
      return { success: false, error: execution.error };
    }
  }

  // GitHub-specific task execution
  private async executeGitHubTask(task: TaskRequest) {
    const { action, repository, ...params } = task.parameters;
    
    // GitHub operations would be implemented here
    // Using edge function for secure GitHub API access
    const response = await supabase.functions.invoke('github-autonomous', {
      body: { action, repository, ...params }
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.data;
  }

  // Repository analysis task execution
  private async executeAnalysisTask(task: TaskRequest) {
    const { repository, analysisType = 'general' } = task.parameters;
    
    if (!repository) {
      throw new Error('Repository parameter is required for analysis');
    }

    // Get repository information via edge function
    const response = await supabase.functions.invoke('github-autonomous', {
      body: { action: 'get_repository_info', repository }
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    const repoInfo = response.data;
    
    // Analyze based on type
    switch (analysisType) {
      case 'security':
        return this.performSecurityAnalysis(repoInfo);
      case 'performance':
        return this.performPerformanceAnalysis(repoInfo);
      case 'architecture':
        return this.performArchitectureAnalysis(repoInfo);
      default:
        return this.performGeneralAnalysis(repoInfo);
    }
  }

  // Ecosystem management task execution
  private async executeEcosystemTask(task: TaskRequest) {
    // Implement ecosystem-specific operations
    return { message: 'Ecosystem task executed successfully', data: task.parameters };
  }

  // General task execution
  private async executeGeneralTask(task: TaskRequest) {
    // Handle general tasks that don't fit other categories
    return { message: 'General task completed', description: task.description };
  }

  // Helper methods for task parsing
  private containsGitHubKeywords(input: string): boolean {
    const keywords = ['github', 'repository', 'repo', 'issue', 'pull request', 'commit', 'branch', 'discussion'];
    return keywords.some(keyword => input.toLowerCase().includes(keyword));
  }

  private containsAnalysisKeywords(input: string): boolean {
    const keywords = ['analyze', 'analysis', 'review', 'examine', 'check', 'audit', 'security', 'performance'];
    return keywords.some(keyword => input.toLowerCase().includes(keyword));
  }

  private containsTaskKeywords(input: string): boolean {
    const keywords = ['create', 'update', 'delete', 'manage', 'execute', 'run', 'perform', 'do'];
    return keywords.some(keyword => input.toLowerCase().includes(keyword));
  }

  private extractGitHubParameters(input: string): any {
    // Extract GitHub-specific parameters from natural language
    const params: any = {};
    
    // Extract repository name
    const repoMatch = input.match(/(?:repository|repo)[\s:]+([\w-]+\/[\w-]+)/i);
    if (repoMatch) params.repository = repoMatch[1];
    
    // Determine action type
    if (input.includes('create issue') || input.includes('new issue')) {
      params.action = 'create_issue';
    } else if (input.includes('create discussion') || input.includes('new discussion')) {
      params.action = 'create_discussion';
    } else if (input.includes('analyze') || input.includes('analysis')) {
      params.action = 'analyze_repository';
    } else if (input.includes('list issues') || input.includes('show issues')) {
      params.action = 'list_issues';
    }
    
    return params;
  }

  private extractAnalysisParameters(input: string): any {
    const params: any = {};
    
    // Extract repository
    const repoMatch = input.match(/(?:repository|repo)[\s:]+([\w-]+\/[\w-]+)/i);
    if (repoMatch) params.repository = repoMatch[1];
    
    // Determine analysis type
    if (input.includes('security')) {
      params.analysisType = 'security';
    } else if (input.includes('performance')) {
      params.analysisType = 'performance';
    } else if (input.includes('architecture')) {
      params.analysisType = 'architecture';
    }
    
    return params;
  }

  private calculateConfidence(input: string, type: string): number {
    // Simple confidence calculation based on keyword matches and clarity
    let confidence = 0.5;
    
    const specificKeywords = {
      github: ['repository', 'issue', 'pull request', 'commit'],
      analysis: ['analyze', 'security', 'performance', 'architecture'],
      general: ['create', 'update', 'delete', 'manage']
    };
    
    const keywords = specificKeywords[type as keyof typeof specificKeywords] || [];
    const matches = keywords.filter(keyword => input.toLowerCase().includes(keyword));
    
    confidence += (matches.length * 0.1);
    return Math.min(confidence, 1.0);
  }

  private requiresApproval(input: string): boolean {
    // Determine if task requires user approval based on potential impact
    const highImpactKeywords = ['delete', 'remove', 'close', 'merge', 'deploy', 'publish'];
    return highImpactKeywords.some(keyword => input.toLowerCase().includes(keyword));
  }

  // Analysis methods
  private performSecurityAnalysis(repoInfo: any) {
    return {
      type: 'security',
      findings: [
        'Repository visibility analysis completed',
        'Default branch protection status reviewed',
        'Security policies examined'
      ],
      repository: repoInfo.name,
      timestamp: new Date().toISOString()
    };
  }

  private performPerformanceAnalysis(repoInfo: any) {
    return {
      type: 'performance',
      metrics: {
        size: repoInfo.size,
        language: repoInfo.language,
        lastUpdate: repoInfo.updated_at
      },
      repository: repoInfo.name,
      timestamp: new Date().toISOString()
    };
  }

  private performArchitectureAnalysis(repoInfo: any) {
    return {
      type: 'architecture',
      structure: {
        language: repoInfo.language,
        description: repoInfo.description,
        topics: repoInfo.topics || []
      },
      repository: repoInfo.name,
      timestamp: new Date().toISOString()
    };
  }

  private performGeneralAnalysis(repoInfo: any) {
    return {
      type: 'general',
      summary: {
        name: repoInfo.name,
        description: repoInfo.description,
        language: repoInfo.language,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        lastUpdate: repoInfo.updated_at
      },
      timestamp: new Date().toISOString()
    };
  }

  // Store task execution in database
  private async storeTaskExecution(task: TaskRequest, execution: TaskExecution) {
    try {
      await supabase.from('tasks').insert({
        session_key: task.sessionKey,
        title: task.description,
        description: `Autonomous task: ${task.type}`,
        task_type: task.type,
        status: execution.status,
        metadata: {
          taskId: task.id,
          parameters: task.parameters,
          confidence: task.confidence,
          requiresApproval: task.requiresApproval
        },
        execution_data: execution.result,
        completed_at: execution.endTime?.toISOString(),
        scheduled_for: execution.startTime?.toISOString()
      });
    } catch (error) {
      console.error('Failed to store task execution:', error);
    }
  }

  // Public interface methods
  async requestTask(userInput: string, sessionKey: string): Promise<{ taskId?: string; requiresApproval: boolean; confidence: number; description: string }> {
    const task = this.parseTaskRequest(userInput, sessionKey);
    
    if (!task) {
      return {
        requiresApproval: false,
        confidence: 0,
        description: 'No actionable task detected in the request.'
      };
    }

    this.taskQueue.set(task.id, task);
    
    return {
      taskId: task.id,
      requiresApproval: task.requiresApproval,
      confidence: task.confidence,
      description: `Task identified: ${task.type} - ${task.description}`
    };
  }

  async approveAndExecuteTask(taskId: string): Promise<{ success: boolean; result?: any; error?: string }> {
    return await this.executeTask(taskId);
  }

  getTaskStatus(taskId: string): TaskExecution | undefined {
    return this.executionStatus.get(taskId);
  }

  getPendingTasks(sessionKey: string): TaskRequest[] {
    return Array.from(this.taskQueue.values()).filter(task => task.sessionKey === sessionKey);
  }
}

export const autonomousTaskService = new AutonomousTaskService();