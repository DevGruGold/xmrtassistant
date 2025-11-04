-- Create communication_logs table for tracking all external communications
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_name TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'slack', 'discord', 'telegram', 'email', 'twitter', 'linkedin', 'sms', 'whatsapp'
  recipient TEXT NOT NULL,
  message_preview TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  delivery_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for querying by executive and channel
CREATE INDEX IF NOT EXISTS idx_communication_logs_executive_channel 
ON public.communication_logs(executive_name, channel, created_at DESC);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at 
ON public.communication_logs(created_at DESC);

-- Create analytics view
CREATE OR REPLACE VIEW public.communication_analytics AS
SELECT 
  executive_name,
  channel,
  DATE(created_at) as date,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed,
  AVG(delivery_time_ms) as avg_delivery_ms,
  MAX(delivery_time_ms) as max_delivery_ms,
  MIN(delivery_time_ms) as min_delivery_ms
FROM public.communication_logs
GROUP BY executive_name, channel, DATE(created_at);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.communication_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_name TEXT NOT NULL,
  channel TEXT NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT now(),
  window_end TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',
  max_per_window INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(executive_name, channel, window_start)
);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_executive_name TEXT,
  p_channel TEXT,
  p_max_per_hour INTEGER DEFAULT 50
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Get current count in active window
  SELECT COALESCE(messages_sent, 0) INTO current_count
  FROM public.communication_rate_limits
  WHERE executive_name = p_executive_name
    AND channel = p_channel
    AND window_end > now();
  
  -- Return true if under limit
  RETURN COALESCE(current_count, 0) < p_max_per_hour;
END;
$$ LANGUAGE plpgsql;

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_executive_name TEXT,
  p_channel TEXT,
  p_max_per_hour INTEGER DEFAULT 50
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.communication_rate_limits (
    executive_name,
    channel,
    messages_sent,
    window_start,
    window_end,
    max_per_window
  ) VALUES (
    p_executive_name,
    p_channel,
    1,
    date_trunc('hour', now()),
    date_trunc('hour', now()) + INTERVAL '1 hour',
    p_max_per_hour
  )
  ON CONFLICT (executive_name, channel, window_start)
  DO UPDATE SET messages_sent = communication_rate_limits.messages_sent + 1;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies for service role access
CREATE POLICY "Service role can manage communication logs"
  ON public.communication_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage rate limits"
  ON public.communication_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read communications
CREATE POLICY "Users can read communication logs"
  ON public.communication_logs
  FOR SELECT
  TO authenticated
  USING (true);
