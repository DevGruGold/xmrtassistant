-- Create worker registrations table for IP-to-worker mapping
CREATE TABLE public.worker_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  worker_id TEXT NOT NULL,
  registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  session_key TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.worker_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for worker registrations
CREATE POLICY "Allow all operations on worker_registrations" 
ON public.worker_registrations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_worker_registrations_ip ON public.worker_registrations(ip_address);
CREATE INDEX idx_worker_registrations_worker_id ON public.worker_registrations(worker_id);
CREATE INDEX idx_worker_registrations_session ON public.worker_registrations(session_key);
CREATE INDEX idx_worker_registrations_active ON public.worker_registrations(is_active);

-- Create unique constraint to prevent duplicate IP/worker combinations
CREATE UNIQUE INDEX idx_worker_registrations_unique ON public.worker_registrations(ip_address, worker_id) 
WHERE is_active = true;

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_worker_registrations_updated_at
BEFORE UPDATE ON public.worker_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();