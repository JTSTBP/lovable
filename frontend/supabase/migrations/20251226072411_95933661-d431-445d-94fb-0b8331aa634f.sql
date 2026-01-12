-- Add warmup columns to accounts table
ALTER TABLE public.accounts 
ADD COLUMN warmup_enabled BOOLEAN DEFAULT false,
ADD COLUMN warmup_start_date DATE,
ADD COLUMN warmup_current_limit INTEGER DEFAULT 5,
ADD COLUMN warmup_target_limit INTEGER DEFAULT 50,
ADD COLUMN warmup_increment INTEGER DEFAULT 5,
ADD COLUMN warmup_completed BOOLEAN DEFAULT false;

-- Create warmup_logs table to track daily sending during warmup
CREATE TABLE public.warmup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, log_date)
);

-- Enable RLS
ALTER TABLE public.warmup_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for warmup_logs
CREATE POLICY "Users can view their own warmup logs"
ON public.warmup_logs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM accounts
  WHERE accounts.id = warmup_logs.account_id AND accounts.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own warmup logs"
ON public.warmup_logs
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM accounts
  WHERE accounts.id = warmup_logs.account_id AND accounts.user_id = auth.uid()
));

CREATE POLICY "Users can update their own warmup logs"
ON public.warmup_logs
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM accounts
  WHERE accounts.id = warmup_logs.account_id AND accounts.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own warmup logs"
ON public.warmup_logs
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM accounts
  WHERE accounts.id = warmup_logs.account_id AND accounts.user_id = auth.uid()
));

-- Create index
CREATE INDEX idx_warmup_logs_account_date ON public.warmup_logs(account_id, log_date);

-- Add trigger for updated_at
CREATE TRIGGER update_warmup_logs_updated_at
BEFORE UPDATE ON public.warmup_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();