import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface TaskRequest {
  taskId: string;
  requiresApproval: boolean;
  description: string;
  confidence: number;
  type?: string;
  parameters?: any;
}

interface TaskApprovalInterfaceProps {
  taskRequest: TaskRequest;
  onApprove: (taskId: string) => Promise<void>;
  onReject: (taskId: string) => void;
  isExecuting?: boolean;
}

export const TaskApprovalInterface = ({ 
  taskRequest, 
  onApprove, 
  onReject,
  isExecuting = false 
}: TaskApprovalInterfaceProps) => {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(taskRequest.taskId);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTaskIcon = () => {
    if (isExecuting) return <Clock className="h-4 w-4 animate-spin" />;
    if (taskRequest.requiresApproval) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            {getTaskIcon()}
            Task Request
          </CardTitle>
          <Badge 
            className={`${getConfidenceColor(taskRequest.confidence)} text-white text-xs`}
          >
            {Math.round(taskRequest.confidence * 100)}% confident
          </Badge>
        </div>
        <CardDescription className="text-sm">
          {taskRequest.description}
        </CardDescription>
      </CardHeader>
      
      {taskRequest.requiresApproval && !isExecuting && (
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={loading}
              size="sm"
              className="flex-1"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {loading ? 'Executing...' : 'Approve & Execute'}
            </Button>
            <Button
              onClick={() => onReject(taskRequest.taskId)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        </CardContent>
      )}
      
      {isExecuting && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3 animate-spin" />
            Task is being executed...
          </div>
        </CardContent>
      )}
    </Card>
  );
};