-- Add 'unsubscribed' to lead_status enum
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'unsubscribed';

-- Add unsubscribe_token column to leads for secure unsubscribe links
ALTER TABLE public.leads 
ADD COLUMN unsubscribe_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Create index for efficient token lookups
CREATE INDEX idx_leads_unsubscribe_token ON public.leads(unsubscribe_token);