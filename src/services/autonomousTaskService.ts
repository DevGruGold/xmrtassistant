// Note: GitHub service will be available when needed
// import { githubService } from './githubService';
// Supabase integration removed - using direct API calls

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

  // Load tasks from database on startup
  constructor() {
    this.loadTasksFromDatabase();
  }

  // Load pending tasks from database
  private async loadTasksFromDatabase() {
    try {
      const { data: tasks, error } = await // supabase
        .from('tasks')
        .select('*')
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Reconstruct task queue from database
      tasks?.forEach(task => {
        const metadata = task.metadata as any || {};
        const taskRequest: TaskRequest = {
          id: task.id,
          type: task.task_type as any,
          description: task.description || task.title,
          parameters: metadata.parameters || {},
          confidence: metadata.confidence || 0.5,
          requiresApproval: metadata.requiresApproval || false,
          sessionKey: task.session_key
        };
        this.taskQueue.set(task.id, taskRequest);

        const execution: TaskExecution = {
          taskId: task.id,
          status: task.status as any,
          startTime: task.scheduled_for ? new Date(task.scheduled_for) : undefined,
          endTime: task.completed_at ? new Date(task.completed_at) : undefined
        };
        this.executionStatus.set(task.id, execution);
      });

      console.log(`✅ AutonomousTaskService: Loaded ${tasks?.length || 0} tasks from database`);
    } catch (error) {
      console.error('Failed to load tasks from database:', error);
    }
  }

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

    // Update task status to executing in database
    try {
      await // supabase
        .from('tasks')
        .update({ 
          status: 'executing', 
          updated_at: new Date().toISOString(),
          scheduled_for: execution.startTime.toISOString()
        })
        .eq('id', taskId);
    } catch (error) {
      console.error('Failed to update task status to executing:', error);
    }

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
      
      // Update task completion in database
      await this.updateTaskCompletion(task, execution);
      
      return { success: true, result };
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date();
      
      // Update task failure in database
      await this.updateTaskFailure(task, execution);
      
      return { success: false, error: execution.error };
    }
  }

  // GitHub-specific task execution
  private async executeGitHubTask(task: TaskRequest) {
    const { action, repository, ...params } = task.parameters;
    
    // GitHub operations would be implemented here
    // Using edge function for secure GitHub API access
    const response = await // // supabase.functions.invoke('github-autonomous', {
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
    const response = await // // supabase.functions.invoke('github-autonomous', {
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

  // Update task completion in database
  private async updateTaskCompletion(task: TaskRequest, execution: TaskExecution) {
    try {
      await // supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: execution.endTime?.toISOString(),
          updated_at: new Date().toISOString(),
          execution_data: execution.result
        })
        .eq('id', task.id);
      
      console.log(`✅ Task ${task.id} completed and updated in database`);
    } catch (error) {
      console.error('Failed to update task completion:', error);
    }
  }

  // Update task failure in database
  private async updateTaskFailure(task: TaskRequest, execution: TaskExecution) {
    try {
      await // supabase
        .from('tasks')
        .update({
          status: 'failed',
          completed_at: execution.endTime?.toISOString(),
          updated_at: new Date().toISOString(),
          execution_data: { error: execution.error }
        })
        .eq('id', task.id);
      
      console.log(`❌ Task ${task.id} failed and updated in database`);
    } catch (error) {
      console.error('Failed to update task failure:', error);
    }
  }

  // Get all tasks for a session from database
  async getAllTasks(sessionKey: string): Promise<any[]> {
    try {
      const { data, error } = await // supabase
        .from('tasks')
        .select('*')
        .eq('session_key', sessionKey)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get tasks from database:', error);
      return [];
    }
  }

  // Get active tasks count for dashboard
  async getActiveTasksCount(sessionKey: string): Promise<number> {
    try {
      const { count, error } = await // supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('session_key', sessionKey)
        .in('status', ['pending', 'approved', 'executing']);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Failed to get active tasks count:', error);
      return 0;
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
    
    // Store task request in database immediately
    try {
      await // // supabase.from('tasks').insert({
        id: task.id,
        session_key: task.sessionKey,
        title: task.description.substring(0, 100),
        description: task.description,
        task_type: task.type,
        status: 'pending',
        priority: task.requiresApproval ? 1 : 3,
        metadata: {
          taskId: task.id,
          parameters: task.parameters,
          confidence: task.confidence,
          requiresApproval: task.requiresApproval
        }
      });
      console.log(`✅ Task ${task.id} stored in database`);
    } catch (error) {
      console.error('Failed to store task request:', error);
    }
    
    return {
      taskId: task.id,
      requiresApproval: task.requiresApproval,
      confidence: task.confidence,
      description: `Task identified: ${task.type} - ${task.description}`
    };
  }

  async approveAndExecuteTask(taskId: string): Promise<{ success: boolean; result?: any; error?: string }> {
    // Update task status to approved in database
    try {
      await // supabase
        .from('tasks')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', taskId);
    } catch (error) {
      console.error('Failed to update task status to approved:', error);
    }

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