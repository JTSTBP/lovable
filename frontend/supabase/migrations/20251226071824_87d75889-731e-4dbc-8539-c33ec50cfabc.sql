-- Create table for A/B test variants
CREATE TABLE public.ab_test_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.campaign_steps(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL DEFAULT 'A',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ab_test_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies (based on campaign ownership through campaign_steps)
CREATE POLICY "Users can view variants of their campaign steps"
ON public.ab_test_variants
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM campaign_steps cs
  JOIN campaigns c ON c.id = cs.campaign_id
  WHERE cs.id = ab_test_variants.step_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can insert variants to their campaign steps"
ON public.ab_test_variants
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM campaign_steps cs
  JOIN campaigns c ON c.id = cs.campaign_id
  WHERE cs.id = ab_test_variants.step_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can update variants of their campaign steps"
ON public.ab_test_variants
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM campaign_steps cs
  JOIN campaigns c ON c.id = cs.campaign_id
  WHERE cs.id = ab_test_variants.step_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can delete variants of their campaign steps"
ON public.ab_test_variants
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM campaign_steps cs
  JOIN campaigns c ON c.id = cs.campaign_id
  WHERE cs.id = ab_test_variants.step_id AND c.user_id = auth.uid()
));

-- Add variant_id to leads table to track which variant was sent
ALTER TABLE public.leads ADD COLUMN variant_id UUID REFERENCES public.ab_test_variants(id) ON DELETE SET NULL;

-- Add variant_id to email_events for tracking performance per variant
ALTER TABLE public.email_events ADD COLUMN variant_id UUID REFERENCES public.ab_test_variants(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_ab_test_variants_step_id ON public.ab_test_variants(step_id);
CREATE INDEX idx_leads_variant_id ON public.leads(variant_id);
CREATE INDEX idx_email_events_variant_id ON public.email_events(variant_id);

-- Add updated_at trigger
CREATE TRIGGER update_ab_test_variants_updated_at
BEFORE UPDATE ON public.ab_test_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();