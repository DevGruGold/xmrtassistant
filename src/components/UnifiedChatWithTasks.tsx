import React, { useState } from 'react';
import { UnifiedChat } from '@/components/UnifiedChat';
import { TaskDashboard } from '@/components/TaskDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Activity, Settings } from 'lucide-react';

interface UnifiedChatWithTasksProps {
  sessionKey?: string;
  language?: 'en' | 'es';
}

export function UnifiedChatWithTasks({ sessionKey = 'default', language = 'en' }: UnifiedChatWithTasksProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'system'>('chat');

  const labels = {
    en: {
      chat: 'Chat',
      tasks: 'Tasks',
      system: 'System',
      title: 'AI Assistant & Task Manager'
    },
    es: {
      chat: 'Chat',
      tasks: 'Tareas', 
      system: 'Sistema',
      title: 'Asistente IA y Gestor de Tareas'
    }
  };

  const t = labels[language];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t.chat}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {t.tasks}
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t.system}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <UnifiedChat />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <TaskDashboard sessionKey={sessionKey} />
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <TaskDashboard sessionKey={sessionKey} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}