-- Create email_events table for detailed tracking
CREATE TABLE public.email_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('sent', 'opened', 'replied', 'bounced', 'clicked')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Create policies (access through campaign ownership)
CREATE POLICY "Users can view events for their campaigns"
ON public.email_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM campaigns
  WHERE campaigns.id = email_events.campaign_id
  AND campaigns.user_id = auth.uid()
));

CREATE POLICY "Users can insert events for their campaigns"
ON public.email_events
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM campaigns
  WHERE campaigns.id = email_events.campaign_id
  AND campaigns.user_id = auth.uid()
));

-- Create indexes for efficient querying
CREATE INDEX idx_email_events_campaign_id ON public.email_events(campaign_id);
CREATE INDEX idx_email_events_created_at ON public.email_events(created_at);
CREATE INDEX idx_email_events_type ON public.email_events(event_type);