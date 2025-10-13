import { useAPIKeyHealth } from "@/services/credentialManager";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const EXECUTIVES = [
  { name: 'Lovable AI', service: 'lovable_ai', role: 'CSO' },
  { name: 'DeepSeek', service: 'deepseek', role: 'CTO' },
  { name: 'Gemini', service: 'gemini', role: 'CPO' },
  { name: 'OpenAI', service: 'openai', role: 'CAO' }
];

export const ExecutiveStatusIndicator = () => {
  const { health, loading } = useAPIKeyHealth();

  const getStatus = (serviceName: string) => {
    const service = health.find(h => h.service_name === serviceName);
    
    if (!service) return 'unknown';
    if (service.is_healthy && !service.expiry_warning) return 'healthy';
    if (service.is_healthy && service.expiry_warning) return 'warning';
    return 'error';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-mining-active';
      case 'warning': return 'bg-mining-warning';
      case 'error': return 'bg-mining-error';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string, exec: typeof EXECUTIVES[0]) => {
    const service = health.find(h => h.service_name === exec.service);
    
    switch (status) {
      case 'healthy': 
        return `${exec.name} (${exec.role}) - Ready`;
      case 'warning': 
        return `${exec.name} (${exec.role}) - Expiring soon`;
      case 'error': 
        return `${exec.name} (${exec.role}) - ${service?.error_message || 'Unavailable'}`;
      default: 
        return `${exec.name} (${exec.role}) - Status unknown`;
    }
  };

  if (loading) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 justify-center">
        <span className="text-xs text-muted-foreground font-medium">AI Executives:</span>
        <div className="flex items-center gap-1.5">
          {EXECUTIVES.map((exec) => {
            const status = getStatus(exec.service);
            return (
              <Tooltip key={exec.service}>
                <TooltipTrigger asChild>
                  <div 
                    className={`w-2 h-2 rounded-full ${getStatusColor(status)} transition-colors cursor-help`}
                    role="status"
                    aria-label={getStatusLabel(status, exec)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">{getStatusLabel(status, exec)}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
