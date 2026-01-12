-- Add scheduled_at column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient querying of scheduled campaigns
CREATE INDEX idx_campaigns_scheduled_at ON public.campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;