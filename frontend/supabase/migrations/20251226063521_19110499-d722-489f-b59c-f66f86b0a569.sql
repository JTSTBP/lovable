-- Add account_id column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_campaigns_account_id ON public.campaigns(account_id);