import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { AdaptiveAvatar } from './AdaptiveAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
// 🎤 TTS is now language-aware: English (en) / Spanish (es)
import { GitHubPATInput } from './GitHubPATInput';
import { GitHubTokenStatus } from './GitHubTokenStatus';
import { mobilePermissionService } from '@/services/mobilePermissionService';
import { formatTime } from '@/utils/dateFormatter';
import { Send, Volume2, VolumeX, Trash2, Key, Wifi } from 'lucide-react';
import { enhancedTTS } from '@/services/enhancedTTSService';
import { supabase } from '@/integrations/supabase/client';
// Toast removed for lighter UI
import type { RealtimeChannel } from '@supabase/supabase-js';

// Services
import { realtimeManager } from '@/services/realtimeSubscriptionManager';
import { UnifiedElizaService } from '@/services/unifiedElizaService';
import { unifiedDataService, type MiningStats, type UserContext } from '@/services/unifiedDataService';
import { unifiedFallbackService } from '@/services/unifiedFallbackService';
import { conversationPersistence } from '@/services/conversationPersistenceService';
import { quickGreetingService } from '@/services/quickGreetingService';
import { apiKeyManager } from '@/services/apiKeyManager';
import { memoryContextService } from '@/services/memoryContextService';
import { learningPatternsService } from '@/services/learningPatternsService';
import { knowledgeEntityService } from '@/services/knowledgeEntityService';

// Debug environment variables on component load
console.log('UnifiedChat Environment Check:', {
  VITE_GEMINI_API_KEY_exists: !!import.meta.env.VITE_GEMINI_API_KEY,
  VITE_GEMINI_API_KEY_length: import.meta.env.VITE_GEMINI_API_KEY?.length || 0,
  VITE_ELEVENLABS_API_KEY_exists: !!import.meta.env.VITE_ELEVENLABS_API_KEY,
  all_env_vars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
});

interface UnifiedMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  attachments?: {
    images?: string[];
    audio?: Blob;
    transcript?: string;
  };
  emotionalContext?: {
    voiceTone?: string;
    facialExpression?: string;
    confidenceLevel?: number;
  };
  emotion?: string;
  confidence?: number;
  tool_calls?: Array<{
    id: string;
    function_name: string;
    status: 'pending' | 'success' | 'failed';
    execution_time_ms?: number;
  }>;
}

// MiningStats imported from unifiedDataService

interface UnifiedChatProps {
  apiKey?: string;
  className?: string;
  miningStats?: MiningStats;
}

// Internal component using ElevenLabs and Gemini

const UnifiedChatInner: React.FC<UnifiedChatProps> = ({
  apiKey = import.meta.env.VITE_GEMINI_API_KEY || "",
  className = '',
  miningStats: externalMiningStats
}) => {
  // Core state
  const { language } = useLanguage();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [conversationSummaries, setConversationSummaries] = useState<Array<{ summaryText: string; messageCount: number; createdAt: Date }>>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [totalMessageCount, setTotalMessageCount] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // Always connected for text/TTS mode
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  

  // Voice/TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    // Check if user previously enabled voice
    return localStorage.getItem('audioEnabled') === 'true';
  });
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [currentAIMethod, setCurrentAIMethod] = useState<string>('');
  const [currentTTSMethod, setCurrentTTSMethod] = useState<string>('');

  // Lazy TTS initialization - only when user enables voice
  // Removed auto-initialization to improve page load performance

  // API Key Management state
  const [showAPIKeyInput, setShowAPIKeyInput] = useState(false);
  const [needsAPIKey, setNeedsAPIKey] = useState(false);

  const [currentEmotion, setCurrentEmotion] = useState<string>('');
  const [emotionConfidence, setEmotionConfidence] = useState<number>(0);

  // XMRT context state - using unified service
  const [miningStats, setMiningStats] = useState<MiningStats | null>(externalMiningStats || null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [lastElizaMessage, setLastElizaMessage] = useState<string>("");

  // Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Enable audio after user interaction (required for mobile browsers)
  const handleEnableAudio = async () => {
    try {
      await enhancedTTS.initialize();
      setAudioInitialized(true);
      setVoiceEnabled(true);
      localStorage.setItem('audioEnabled', 'true');
      console.log('✅ Audio enabled by user with fallback TTS');
    } catch (error) {
      console.error('Failed to enable audio:', error);
    }
  };

  // Check if audio was previously enabled
  useEffect(() => {
    const wasEnabled = localStorage.getItem('audioEnabled') === 'true';
    if (wasEnabled) {
      handleEnableAudio();
    }
  }, []);

  // Auto-scroll within chat container only (no page-level scrolling)
  useEffect(() => {
    // Only scroll if there are messages and not just loading
    if (messages.length > 0 && !isProcessing) {
      // Use setTimeout to ensure DOM updates are complete
      setTimeout(() => {
        // Only scroll within the chat container itself
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
        // Removed scrollIntoView to prevent page-level scrolling
        // User stays at their current position on the page
      }, 100);
    }
  }, [messages, isProcessing]);

  // Initialize unified data service and conversation persistence with full Supabase integration
  useEffect(() => {
    const initialize = async () => {
      try {
        const [userCtx, miningData] = await Promise.all([
          unifiedDataService.getUserContext(),
          externalMiningStats || unifiedDataService.getMiningStats()
        ]);
        
        setUserContext(userCtx);
        if (!externalMiningStats) {
          setMiningStats(miningData);
        }

        // Initialize conversation persistence with optimized loading
        try {
          await conversationPersistence.initializeSession();
          
          // Load conversation context (summaries only, no messages for return users)
          const context = await conversationPersistence.getConversationContext(0); // 0 messages = summaries only
          
          if (context.summaries.length > 0 || context.totalMessageCount > 0) {
            // Set context but don't load messages - let AI greeting handle the context
            setConversationSummaries(context.summaries);
            setHasMoreMessages(context.totalMessageCount > 0);
            setTotalMessageCount(context.totalMessageCount);
            
            console.log(`📚 Found ${context.summaries.length} summaries for ${context.totalMessageCount} total messages. Starting with summary-aware greeting.`);
          }

          // Load additional Supabase data for enhanced context
          if (userCtx?.ip) {
            // Load user preferences
            const preferences = await conversationPersistence.getUserPreferences();
            console.log('⚙️ User preferences loaded:', Object.keys(preferences).length, 'items');

            // Load memory contexts for semantic understanding
            const memoryContexts = await memoryContextService.getRelevantContexts(userCtx.ip, 5);
            console.log('🧠 Memory contexts loaded:', memoryContexts.length, 'items');

            // Load learning patterns for improved responses
            const learningPatterns = await learningPatternsService.getHighConfidencePatterns(0.7);
            console.log('📊 Learning patterns loaded:', learningPatterns.length, 'high-confidence patterns');

            // Load knowledge entities for entity recognition
            const miningEntities = await knowledgeEntityService.getEntitiesByType('mining_concept');
            const daoEntities = await knowledgeEntityService.getEntitiesByType('dao_concept');
            console.log('🏷️ Knowledge entities loaded:', miningEntities.length + daoEntities.length, 'entities');
          }
        } catch (error) {
          console.log('Conversation persistence temporarily disabled:', error);
        }

        // Set up periodic refresh for mining stats only if not provided externally
        if (!externalMiningStats) {
          const interval = setInterval(async () => {
            const freshStats = await unifiedDataService.getMiningStats();
            setMiningStats(freshStats);
          }, 30000);
          return () => clearInterval(interval);
        }
      } catch (error) {
        console.error('Failed to initialize unified data:', error);
      }
    };
    
    initialize();
  }, []);

  // Set up realtime subscription for live message updates from autonomous agents
  // Phase 1: Optimized with centralized subscription manager and server-side filters
  useEffect(() => {
    if (!userContext?.ip) {
      console.log('⏸️ Waiting for user context before setting up realtime');
      return;
    }

    console.log('🔴 Setting up optimized realtime subscriptions (Phase 1)');
    
    // Phase 1.2: Use server-side filters to reduce WAL processing
    const unsubscribers: Array<() => void> = [];

    // Subscribe to workflow executions with event filter
    const workflowUnsub = realtimeManager.subscribe(
      'workflow_executions',
      (payload) => {
        console.log('🔄 Workflow update:', payload);
        const workflow = payload.new as Record<string, any>;
        
        if (!workflow || Object.keys(workflow).length === 0) return;
        
        if (workflow.status === 'completed' && workflow.final_result) {
          console.log('🎉 Workflow completed, triggering Eliza synthesis:', workflow.id);
          
          const synthesisPrompt = `A background workflow just completed: "${workflow.name}"\n\nRaw Results:\n${JSON.stringify(workflow.final_result, null, 2)}\n\nPlease synthesize this into a comprehensive, human-readable answer for the user. Include context, insights, and actionable recommendations.`;
          handleSynthesizeWorkflowResult(synthesisPrompt, workflow);
        }
      },
      {
        event: '*',
        schema: 'public'
      }
    );
    unsubscribers.push(workflowUnsub);

    // Subscribe to Python executions with server-side filter
    const pythonUnsub = realtimeManager.subscribe(
      'eliza_python_executions',
      (payload) => {
        console.log('🤖 Auto-fixed code result:', payload);
        const execution = payload.new;
        
        if (execution.exit_code === 0 && execution.output) {
          const message: UnifiedMessage = {
            id: `auto-fix-${execution.id}`,
            content: `✅ **Auto-healed Code Result:**\n\n${execution.output}`,
            sender: 'assistant',
            timestamp: new Date(execution.created_at)
          };
          
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
          });

          if (voiceEnabled && audioInitialized) {
            enhancedTTS.speak('I successfully fixed and executed the code.', { language });
          }
          
          console.info('✅ Code Auto-Healed: Autonomous agent fixed the code successfully');
        }
      },
      {
        event: 'INSERT',
        schema: 'public',
        filter: 'source=eq.python-fixer-agent' // Server-side filter
      }
    );
    unsubscribers.push(pythonUnsub);

    // Subscribe to activity log with server-side filter for specific activity types
    const activityUnsub = realtimeManager.subscribe(
      'eliza_activity_log',
      (payload) => {
        console.log('📊 Activity log update:', payload);
        const activity = payload.new as Record<string, any>;
        
        if (activity.activity_type === 'agent_spawned') {
          console.log('🤖 Agent spawned:', activity.metadata?.agent_id, activity.title);
        } else if (activity.activity_type === 'task_assigned') {
          console.log('📋 Task assigned:', activity.metadata?.task_id, activity.title);
        } else if (activity.activity_type === 'progress_report') {
          console.log('📊 Progress update:', activity.metadata?.agent_id, activity.description);
        } else if (activity.activity_type === 'autonomous_step') {
          console.log('🔄 Autonomous step:', activity.metadata?.action, activity.title);
        } else if (activity.activity_type === 'agent_failure_alert') {
          console.warn('⚠️ AGENT FAILURE ALERT:', activity.title, activity.metadata);
        }
      },
      {
        event: 'INSERT',
        schema: 'public',
        // Phase 1.2: Server-side filter reduces WAL processing by ~70%
        filter: 'activity_type=in.(autonomous_action,agent_failure_alert,autonomous_step,python_fix_success,code_monitoring,agent_spawned,task_assigned,progress_report)'
      }
    );
    unsubscribers.push(activityUnsub);

    setRealtimeConnected(true);
    console.info('✅ Phase 1 Optimizations Active: Shared subscriptions with server-side filters');

    return () => {
      console.log('🔴 Cleaning up realtime subscriptions');
      unsubscribers.forEach(unsub => unsub());
    };
  }, [userContext?.ip, voiceEnabled, audioInitialized]);

  // Generate immediate greeting when user context is available
  useEffect(() => {
    if (userContext && messages.length === 0) {
      generateQuickGreeting();
    }
  }, [userContext, conversationSummaries]);

  const generateQuickGreeting = () => {
    // Show immediate greeting without waiting for AI
    const cachedSummary = quickGreetingService.getCachedConversationSummary();
    
    const quickGreeting = quickGreetingService.generateQuickGreeting({
      isFounder: userContext?.isFounder,
      conversationSummary: cachedSummary?.summary || (conversationSummaries.length > 0 ? conversationSummaries[conversationSummaries.length - 1].summaryText : undefined),
      totalMessageCount: cachedSummary?.messageCount || totalMessageCount,
      miningStats
    });
    
    const greeting: UnifiedMessage = {
      id: 'quick-greeting',
      content: quickGreeting,
      sender: 'assistant',
      timestamp: new Date()
    };
    
    setMessages([greeting]);
    setLastElizaMessage(quickGreeting);
    
    // Store greeting in persistent storage (non-blocking)
    conversationPersistence.storeMessage(quickGreeting, 'assistant', {
      type: 'quick-greeting',
      isReturnUser: conversationSummaries.length > 0,
      totalPreviousMessages: totalMessageCount
    }).catch(error => {
      console.log('Conversation persistence error:', error);
    });
  };

  // Clear conversation history
  const handleSynthesizeWorkflowResult = async (prompt: string, workflow: any) => {
    try {
      console.log('🔄 Synthesizing workflow result with Eliza...');
      
      // Get full conversation context
      const fullContext = await conversationPersistence.getFullConversationContext();
      
      const response = await UnifiedElizaService.generateResponse(prompt, {
        miningStats,
        userContext,
        inputMode: 'text',
        shouldSpeak: false,
        enableBrowsing: false,
        conversationContext: fullContext
      }, language);
      
      // Display Eliza's synthesized answer
      const elizaMessage: UnifiedMessage = {
        id: `workflow-result-${workflow.id}`,
        content: response,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => {
        if (prev.some(m => m.id === elizaMessage.id)) return prev;
        return [...prev, elizaMessage];
      });
      
      console.log('✅ Workflow result synthesized and displayed');
      
      // Store the synthesized result
      try {
        await conversationPersistence.storeMessage(response, 'assistant', {
          confidence: 0.95,
          method: 'Workflow Synthesis',
          workflow_id: workflow.id
        });
      } catch (error) {
        console.log('Failed to store workflow synthesis:', error);
      }
    } catch (error) {
      console.error('❌ Failed to synthesize workflow result:', error);
      // Fallback: show a simple message
      setMessages(prev => [...prev, {
        id: `workflow-fallback-${workflow.id}`,
        content: `✅ Background task "${workflow.name}" completed. Check the Task Visualizer for details.`,
        sender: 'assistant',
        timestamp: new Date()
      }]);
    }
  };

  const handleClearConversation = async () => {
    if (!confirm('Are you sure you want to clear the entire conversation history? This cannot be undone.')) {
      return;
    }

    try {
      await conversationPersistence.clearConversationHistory();
      
      // Reset local state
      setMessages([]);
      setConversationSummaries([]);
      setHasMoreMessages(false);
      setTotalMessageCount(0);
      setLastElizaMessage('');
      
      // Generate new greeting for fresh start
      if (userContext) {
        const greeting: UnifiedMessage = {
          id: 'fresh-greeting',
          content: "Hello! I'm Eliza, your XMRT assistant. How can I help you today?",
          sender: 'assistant',
          timestamp: new Date()
        };
        
        setMessages([greeting]);
        setLastElizaMessage(greeting.content);
        
        // Store new greeting
        await conversationPersistence.storeMessage(greeting.content, 'assistant', {
          type: 'fresh-start-greeting'
        });
      }
      
      console.log('✅ Conversation cleared and reset');
    } catch (error) {
      console.error('Failed to clear conversation:', error);
      // Show error to user
      const errorMessage: UnifiedMessage = {
        id: `error-${Date.now()}`,
        content: 'Failed to clear conversation history. Please try again.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Load more messages for pagination
  const loadMoreMessages = async () => {
    if (loadingMoreMessages || !hasMoreMessages) return;
    
    setLoadingMoreMessages(true);
    try {
      // Load recent messages from the database (this replaces the current empty state)
      const recentMessages = await conversationPersistence.getRecentConversationHistory(20);
      if (recentMessages.length > 0) {
        const convertedMessages: UnifiedMessage[] = recentMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
          ...msg.metadata
        }));
        
        // Replace the greeting with actual conversation history
        setMessages(prev => {
          // Keep the greeting if it exists, then add the history
          const greeting = prev.find(msg => msg.id === 'greeting');
          return greeting ? [greeting, ...convertedMessages] : convertedMessages;
        });
      }
      
      // After loading first batch, enable normal pagination
      setHasMoreMessages(recentMessages.length >= 20 && recentMessages.length < totalMessageCount);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  // XMRT Knowledge Base Integration Functions
  const fetchMiningStats = async () => {
    try {
      const response = await fetch(
        "https://www.supportxmr.com/api/miner/46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg/stats"
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      setMiningStats({
        hashRate: data.hash || 0,
        validShares: data.validShares || 0,
        totalHashes: data.totalHashes || 0,
        amountDue: (data.amtDue || 0) / 1000000000000,
        amountPaid: (data.amtPaid || 0) / 1000000000000,
        isOnline: data.lastHash > (Date.now() / 1000) - 300,
        lastUpdate: new Date()
      });
    } catch (err) {
      console.error('Failed to fetch mining stats:', err);
      // Keep using unified service for consistency
    }
  };

  // Remove old IP function - using unified service
  // const fetchUserIP = async () => { ... removed ... };

  // Helper functions using unified service
  const isFounder = () => {
    return userContext?.isFounder || false;
  };

  const formatHashrate = (hashrate: number): string => {
    return unifiedDataService.formatMiningStats({ hashRate: hashrate } as MiningStats).split('\n')[1] || `${hashrate} H/s`;
  };

  // Unified response display with intelligent TTS control
  // 🔊 ALWAYS use TTS - Eliza ALWAYS speaks her responses in the selected language
  const displayResponse = async (responseText: string, shouldSpeak: boolean = false) => {
    const elizaMessage: UnifiedMessage = {
      id: `eliza-${Date.now()}`,
      content: responseText,
      sender: 'assistant',
      timestamp: new Date(),
      emotion: currentEmotion,
      confidence: emotionConfidence
    };

    setMessages(prev => [...prev, elizaMessage]);
    setLastElizaMessage(responseText);

    // Use TTS if requested and voice is enabled
    if (shouldSpeak && voiceEnabled && audioInitialized) {
      try {
        setIsSpeaking(true);
        await enhancedTTS.speak(responseText, { language });
        setCurrentTTSMethod(enhancedTTS.getLastMethod());
        console.log(`🎵 TTS Method: ${enhancedTTS.getLastMethod()}`);
        setIsSpeaking(false);
      } catch (error) {
        console.error('❌ TTS error:', error, 'Audio unavailable. Check browser permissions.');
        setIsSpeaking(false);
      }
    }
  };

  // Voice input handler - WITH smart TTS timing and speech recognition pausing
  const handleVoiceInput = async (transcript: string) => {
    if (!transcript?.trim() || isProcessing) return;

    // If Eliza is speaking, interrupt her
    if (isSpeaking) {
      enhancedTTS.stop();
      setIsSpeaking(false);
    }

    const userMessage: UnifiedMessage = {
      id: `voice-user-${Date.now()}`,
      content: transcript,
      sender: 'user',
      timestamp: new Date(),
      emotion: currentEmotion,
      confidence: emotionConfidence
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    // Store user message with enhanced data capture
    try {
      await conversationPersistence.storeMessage(transcript, 'user', {
        emotion: currentEmotion,
        confidence: emotionConfidence,
        inputType: 'voice'
      });

      // Extract and store knowledge entities from user input
      await knowledgeEntityService.extractEntities(transcript);

      // Record interaction pattern
      await conversationPersistence.storeInteractionPattern(
        'voice_input',
        { transcript, emotion: currentEmotion },
        emotionConfidence
      );

      // Store important context in memory
      if (userContext?.ip) {
        await memoryContextService.storeContext(
          userContext.ip,
          userContext.ip,
          transcript,
          'user_voice_input',
          0.7,
          { emotion: currentEmotion, confidence: emotionConfidence }
        );
      }
    } catch (error) {
      console.log('Conversation persistence error:', error);
    }

    try {
      const response = await UnifiedElizaService.generateResponse(transcript, {
        miningStats,
        userContext,
        inputMode: 'voice',
        shouldSpeak: true,
        enableBrowsing: true,
        conversationContext: await conversationPersistence.getFullConversationContext()
      });

      const elizaMessage: UnifiedMessage = {
        id: `eliza-${Date.now()}`,
        content: response,
        sender: 'assistant',
        timestamp: new Date(),
        confidence: 0.95
      };

      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(response);
      
      // Store Eliza's response with enhanced data
      try {
        await conversationPersistence.storeMessage(response, 'assistant', {
          confidence: 0.95,
          method: 'OpenAI via Edge Function',
          inputType: 'voice'
        });

        // Extract entities from response
        await knowledgeEntityService.extractEntities(response);

        // Record learning pattern for successful response
        await learningPatternsService.recordPattern(
          'voice_response_success',
          { inputLength: transcript.length, responseLength: response.length },
          0.9
        );

        // Store response context
        if (userContext?.ip) {
          await memoryContextService.storeContext(
            userContext.ip,
            userContext.ip,
            response,
            'assistant_voice_response',
            0.8,
            { method: 'OpenAI', confidence: 0.95 }
          );
        }
      } catch (error) {
        console.log('Conversation persistence error:', error);
      }

      // Speak response using Enhanced TTS with fallbacks
      if (voiceEnabled && audioInitialized) {
        try {
          setIsSpeaking(true);
          
          // Add small delay in voice mode to let speech recognition settle
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await enhancedTTS.speak(response, { language });
          setCurrentTTSMethod(enhancedTTS.getLastMethod());
          setIsSpeaking(false);
        } catch (error) {
          console.error('TTS failed:', error);
          setCurrentTTSMethod('failed');
          setIsSpeaking(false);
        }
      }
      
    } catch (error) {
      console.error('Failed to process voice input:', error);
      const errorMessage: UnifiedMessage = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I\'m having trouble processing your voice input right now.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Text message handler
  const handleSendMessage = async () => {
    if (!textInput.trim() || isProcessing) return;

    // Check if user pasted a Gemini API key (starts with "AIza")
    if (textInput.trim().startsWith('AIza') && textInput.trim().length > 30) {
      setIsProcessing(true);
      try {
        const apiKey = textInput.trim();
        const result = await apiKeyManager.setUserApiKey(apiKey);
        
        if (result.success) {
          // Clear the API key from input and reset services
          setTextInput('');
          UnifiedElizaService.resetOpenAIInstance();
          setNeedsAPIKey(false);
          
          const successMessage: UnifiedMessage = {
            id: `api-success-${Date.now()}`,
            content: '🔑 Perfect! Your Gemini API key has been validated and saved securely. Full AI capabilities have been restored. What would you like to talk about?',
            sender: 'assistant',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, successMessage]);
          setLastElizaMessage(successMessage.content);
        } else {
          const errorMessage: UnifiedMessage = {
            id: `api-error-${Date.now()}`,
            content: `❌ ${result.message}`,
            sender: 'assistant',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, errorMessage]);
          setTextInput('');
        }
      } catch (error) {
        console.error('API key validation error:', error);
        const errorMessage: UnifiedMessage = {
          id: `api-error-${Date.now()}`,
          content: '❌ Failed to validate the API key. Please try again or use the 🔑 button above for the setup form.',
          sender: 'assistant',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setTextInput('');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // If Eliza is speaking, interrupt her when user sends a message
    if (isSpeaking) {
      enhancedTTS.stop();
      setIsSpeaking(false);
    }

    const userMessage: UnifiedMessage = {
      id: `user-${Date.now()}`,
      content: textInput,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setIsProcessing(true);

    // Store user message with comprehensive data capture
    try {
      await conversationPersistence.storeMessage(userMessage.content, 'user', {
        inputType: 'text'
      });

      // Extract and store knowledge entities
      await knowledgeEntityService.extractEntities(userMessage.content);

      // Record text interaction pattern
      await conversationPersistence.storeInteractionPattern(
        'text_input',
        { message: userMessage.content, length: userMessage.content.length },
        0.8
      );

      // Store in memory contexts
      if (userContext?.ip) {
        await memoryContextService.storeContext(
          userContext.ip,
          userContext.ip,
          userMessage.content,
          'user_text_input',
          0.6
        );
      }
    } catch (error) {
      console.log('Conversation persistence error:', error);
    }

    try {
      console.log('💬 Starting message processing:', textInput.trim());
      console.log('🔧 Context:', { miningStats: !!miningStats, userContext: !!userContext });
      
      console.log('💾 User message stored, generating response...');
      
      // Get full conversation context for better AI understanding
      const fullContext = await conversationPersistence.getFullConversationContext();
      
      // Process response using Gemini AI Gateway
      const response = await UnifiedElizaService.generateResponse(textInput.trim(), {
        miningStats,
        userContext,
        inputMode: 'text',
        shouldSpeak: false,
        enableBrowsing: true,
        conversationContext: fullContext
      }, language);
      
      console.log('✅ Response generated:', response.substring(0, 100) + '...');

      // Check if this is a workflow initiation message
      const isWorkflowInitiation = response.includes('🎬') && response.includes('background');

      // Remove tool_use tags from chat display
      const cleanResponse = response.replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '').trim();

      // If it's a workflow initiation, show a brief acknowledgment instead
      const displayContent = isWorkflowInitiation 
        ? '🔄 Processing your request in the background. I\'ll share the results shortly...'
        : cleanResponse;

      const elizaMessage: UnifiedMessage = {
        id: `eliza-${Date.now()}`,
        content: displayContent,
        sender: 'assistant',
        timestamp: new Date(),
        confidence: 0.95
      };

      setMessages(prev => [...prev, elizaMessage]);
      setLastElizaMessage(displayContent);
      
      // Store Eliza's response with full data integration
      try {
        await conversationPersistence.storeMessage(cleanResponse, 'assistant', {
          confidence: 0.95,
          method: 'OpenAI via Edge Function',
          inputType: 'text'
        });

        // Extract entities from response
        await knowledgeEntityService.extractEntities(cleanResponse);

        // Record successful text response pattern
        await learningPatternsService.recordPattern(
          'text_response_success',
          { 
            inputLength: userMessage.content.length, 
            responseLength: cleanResponse.length,
            method: 'OpenAI' 
          },
          0.85
        );

        // Store response in memory
        if (userContext?.ip) {
          await memoryContextService.storeContext(
            userContext.ip,
            userContext.ip,
            cleanResponse,
            'assistant_text_response',
            0.75,
            { method: 'OpenAI', confidence: 0.95 }
          );
        }
      } catch (error) {
        console.log('Conversation persistence error:', error);
      }

      // Speak response if voice is enabled (don't await - let it run in background)
      if (voiceEnabled && audioInitialized && cleanResponse) {
        setIsSpeaking(true);
        enhancedTTS.speak(cleanResponse, { language })
          .then(() => {
            setCurrentTTSMethod(enhancedTTS.getLastMethod());
            setIsSpeaking(false);
          })
          .catch((error) => {
            console.error('❌ TTS failed:', error, 'Check browser audio permissions');
            setCurrentTTSMethod('failed');
            setIsSpeaking(false);
          });
      }
      
    } catch (error) {
      console.error('❌ Chat error:', error);
      console.error('Error details:', error.message, error.stack);
      
      // Provide specific error messages based on the error type
      let errorContent = 'I apologize, but I\'m having trouble processing your message right now.';
      
      if (error.message?.includes('All AI Executives failed')) {
        errorContent = '⚠️ All AI services are currently unavailable:\n\n' +
          '• **Gemini AI**: Credits depleted - please add funds to your Gemini workspace\n' +
          '• **DeepSeek**: Credits depleted - please add funds to your DeepSeek account\n' +
          '• **Gemini**: Credits depleted\n' +
          '• **OpenAI**: Now configured correctly\n\n' +
          'Please add credits to at least one service to continue.';
      } else if (error.message?.includes('402') || error.message?.includes('Payment Required')) {
        errorContent = '💳 **AI Credits Depleted**\n\n' +
          'The AI service is out of credits. Please:\n' +
          '1. Go to Settings → Workspace → Usage\n' +
          '2. Add credits to your Gemini AI workspace\n\n' +
          'Alternatively, configure direct API keys for DeepSeek, Gemini, or OpenAI.';
      } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        errorContent = '⏱️ **Rate Limit Exceeded**\n\nToo many requests in a short time. Please wait a moment and try again.';
      }
      
      const errorMessage: UnifiedMessage = {
        id: `error-${Date.now()}`,
        content: errorContent,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      console.log('🏁 Message processing complete, setting isProcessing to false');
      setIsProcessing(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  // Toggle voice synthesis
  const toggleVoiceSynthesis = async () => {
    if (!voiceEnabled && !audioInitialized) {
      // First time enabling - need to initialize
      await handleEnableAudio();
    } else {
      // Toggle on/off
      const newState = !voiceEnabled;
      setVoiceEnabled(newState);
      localStorage.setItem('audioEnabled', newState.toString());
      
      // If disabling, stop any ongoing speech
      if (!newState) {
        enhancedTTS.stop();
        setIsSpeaking(false);
      }
    }
  };

  const handleAPIKeyValidated = () => {
    console.log('✅ API key validated, resetting Gemini and hiding input');
    
    // Reset Gemini instance to use new API key
    UnifiedElizaService.resetOpenAIInstance();
    
    // Hide the API key input
    setShowAPIKeyInput(false);
    setNeedsAPIKey(false);
    
    // Add a success message to chat
    const successMessage: UnifiedMessage = {
      id: `success-${Date.now()}`,
      content: 'Great! Your API key has been validated and saved. Full AI capabilities have been restored. How can I help you?',
      sender: 'assistant',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, successMessage]);
  };

  return (
    <Card className={`bg-card/50 backdrop-blur-sm border border-border/50 flex flex-col h-[500px] sm:h-[600px] ${className}`}>
      {/* Simplified Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AdaptiveAvatar
              apiKey={apiKey}
              className="h-8 w-8 sm:h-10 sm:w-10"
              size="sm"
              enableVoice={voiceEnabled}
            />
            <div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Eliza AI</h3>
              <p className="text-xs text-muted-foreground">Your XMRT Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Realtime Connection Indicator */}
            {realtimeConnected && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-green-500/10 text-green-600 border-green-500/30">
                <Wifi className="h-3 w-3" />
                <span>Live</span>
              </Badge>
            )}
            
            {/* GitHub Token Status Indicator */}
            <GitHubTokenStatus onRequestPAT={() => setShowAPIKeyInput(true)} />
            
            {/* API Key Button */}
            <Button
              onClick={() => setShowAPIKeyInput(true)}
              variant="ghost"
              size="sm"
              className={needsAPIKey ? 'text-orange-500 animate-pulse' : 'text-muted-foreground'}
              title="Add or update Gemini API key"
            >
              <Key className="h-4 w-4" />
            </Button>
            
            {/* Clear Conversation Button */}
            {totalMessageCount > 0 && (
              <Button
                onClick={handleClearConversation}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                title="Clear conversation history"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            
            {/* Voice Toggle */}
            <Button
              onClick={toggleVoiceSynthesis}
              variant="ghost"
              size="sm"
              className={voiceEnabled ? 'text-primary' : 'text-muted-foreground'}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Clean Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Load Previous Conversation Button */}
            {hasMoreMessages && totalMessageCount > 0 && (
              <div className="flex justify-center">
                <Button
                  onClick={loadMoreMessages}
                  disabled={loadingMoreMessages}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {loadingMoreMessages ? 'Loading...' : `View Previous Conversation (${totalMessageCount} messages)`}
                </Button>
              </div>
            )}
            
            {/* Conversation Summary Context (only show if user hasn't loaded messages) */}
            {conversationSummaries.length > 0 && !messages.some(m => m.id !== 'greeting') && (
              <div className="bg-muted/30 border border-border/30 rounded-lg p-3 mb-2">
                <div className="text-xs text-muted-foreground mb-1">Last conversation context:</div>
                <div className="text-xs leading-relaxed opacity-75">
                  {conversationSummaries[conversationSummaries.length - 1]?.summaryText}
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className="max-w-[80%] sm:max-w-[75%]">
                  <div
                    className={`p-3 rounded-2xl ${
                      message.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted/50 text-foreground rounded-bl-md'
                  }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                    
                    {/* Tool Call Indicators */}
                    {message.tool_calls && message.tool_calls.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.tool_calls.map((tool) => (
                          <div key={tool.id} className="text-xs flex items-center gap-1.5 opacity-70">
                            <span className="text-muted-foreground">🔧</span>
                            <span className="font-medium">{tool.function_name}</span>
                            {tool.status === 'success' && <span className="text-green-600">✓</span>}
                            {tool.status === 'failed' && <span className="text-red-600">✗</span>}
                            {tool.status === 'pending' && <span className="animate-pulse">⋯</span>}
                            {tool.execution_time_ms && (
                              <span className="text-muted-foreground">({tool.execution_time_ms}ms)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs opacity-60 mt-2">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-muted/50 text-foreground p-3 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* API Key Input Dialog - Show automatically when needed or manually requested */}
        {(showAPIKeyInput || needsAPIKey) && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <GitHubPATInput 
              onKeyValidated={() => {
                setShowAPIKeyInput(false);
                setNeedsAPIKey(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Text Input Area */}
      <div className="border-t border-border/50 bg-background/50">
        <div className="p-4">
          <div className="flex gap-3">
            <Input
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                // If user starts typing while Eliza is speaking, interrupt her
                if (isSpeaking && e.target.value.length > 0) {
                  enhancedTTS.stop();
                  setIsSpeaking(false);
                }
              }}
              onKeyPress={handleKeyPress}
              placeholder={
                needsAPIKey 
                  ? "Provide your GitHub PAT using the 🔑 button to post discussions..." 
                  : isSpeaking 
                    ? "Start typing to interrupt..." 
                    : "Ask Eliza anything..."
              }
              className="flex-1 rounded-full border-border/50 bg-background/50 min-h-[48px] text-sm px-4"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!textInput.trim() || isProcessing}
              size="sm"
              className="rounded-full min-h-[48px] min-w-[48px] hover-scale"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// External wrapper
export const UnifiedChat: React.FC<UnifiedChatProps> = (props) => {
  return <UnifiedChatInner {...props} />;
};

export default UnifiedChat;