import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardSteps } from './wizard/WizardSteps';
import { LeadsStep } from './wizard/LeadsStep';
import { SequencesStep, EmailStep } from './wizard/SequencesStep';
import { SettingsStep } from './wizard/SettingsStep';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ABVariant } from './ABTestEditor';

interface Lead {
  id?: string;
  email: string;
  leadName?: string;
  fullName?: string;
  company: string;
  linkedinUrl?: string;
  industry?: string;
}

interface CampaignSettings {
  name: string;
  accountId: string;
  dailyLimit: number;
  scheduleStartHour: number;
  scheduleEndHour: number;
  timezone: string;
  scheduledAt: Date | null;
  startImmediately: boolean;
}

const wizardSteps = [
  { id: 1, title: 'Leads', description: 'Import contacts' },
  { id: 2, title: 'Sequences', description: 'Email steps' },
  { id: 3, title: 'Settings', description: 'Configure' },
];

interface CampaignWizardProps {
  campaignId?: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function CampaignWizard({ campaignId, onComplete, onCancel }: CampaignWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!campaignId);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [emailSteps, setEmailSteps] = useState<EmailStep[]>([
    { id: crypto.randomUUID(), delayDays: 0, subject: '', body: '', abTestEnabled: false, abVariants: [] },
  ]);
  const [settings, setSettings] = useState<CampaignSettings>({
    name: '',
    accountId: '',
    dailyLimit: 50,
    scheduleStartHour: 9,
    scheduleEndHour: 17,
    timezone: 'UTC',
    scheduledAt: null,
    startImmediately: false,
  });

  const isEditMode = !!campaignId;

  useEffect(() => {
    if (campaignId && user) {
      loadCampaignData();
    }
  }, [campaignId, user]);


  const loadCampaignData = async () => {
    if (!campaignId) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/campaigns/${campaignId}`);
      if (!response.ok) throw new Error('Failed to load campaign');

      const data = await response.json();

      // Populate state
      setSettings({
        name: data.name,
        accountId: data.accountId || '',
        dailyLimit: data.dailyLimit || 50,
        scheduleStartHour: data.scheduleStartHour || 9,
        scheduleEndHour: data.scheduleEndHour || 17,
        timezone: data.timezone || 'UTC',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        startImmediately: !data.scheduledAt
      });

      if (data.steps && data.steps.length > 0) {
        setEmailSteps(data.steps.map((s: any) => ({
          id: s.id,
          delayDays: s.delayDays,
          subject: s.subject,
          body: s.body,
          backgroundImage: s.backgroundImage || '',
          attachments: s.attachments || [],
          abTestEnabled: s.variants && s.variants.length > 0,
          abVariants: s.variants ? s.variants.map((v: any) => ({
            id: v.id,
            variantName: v.variantName,
            subject: v.subject,
            body: v.body,
            backgroundImage: v.backgroundImage || '',
            attachments: v.attachments || []
          })) : []
        })));
      }

      // Note: We might not want to load ALL leads into the wizard if there are thousands.
      // For now, we'll leave leads empty or just show count? 
      // The wizard is mostly for *adding* leads or creating the structure. 
      // Let's leave leads empty to avoid overwriting existing leads logic in server unless user adds new ones.

    } catch (error: any) {
      console.error('Error loading campaign:', error);
      toast.error(error.message || 'Failed to load campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // In edit mode, allow proceeding even if no NEW leads added (assume existing leads remain)
        return isEditMode ? true : leads.length > 0;
      case 2:
        return emailSteps.every((step) => step.subject && step.body);
      case 3:
        return settings.name.trim() !== '' && settings.accountId !== '';
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // if (!user) return; 

    setIsSubmitting(true);
    try {
      if (isEditMode && campaignId) {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/campaigns/${campaignId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: settings.name,
            accountId: settings.accountId,
            scheduledAt: settings.scheduledAt,
            steps: emailSteps,
            leads: leads, // Only new leads added here
            userId: user?.id
          })
        });

        if (!response.ok) throw new Error('Failed to update campaign');
        toast.success("Campaign updated successfully!");

      } else {
        console.log("Creating campaign...");

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: settings.name,
            accountId: settings.accountId,
            scheduledAt: settings.scheduledAt,
            steps: emailSteps,
            leads: leads, // Send leads to be linked
            userId: user?.id
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create campaign on server');
        }

        const newCampaign = await response.json();
        toast.success("Campaign created successfully!");
      }

      onComplete();
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      toast.error(error.message || 'Failed to save campaign');
    } finally {
      setIsSubmitting(false);
    }
  };




  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading campaign...</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border bg-muted/30">
        <WizardSteps steps={wizardSteps} currentStep={currentStep} />
      </div>

      {/* Content */}
      <div className="p-6 min-h-[400px]">
        {currentStep === 1 && (
          <LeadsStep leads={leads} onLeadsChange={setLeads} />
        )}
        {currentStep === 2 && (
          <SequencesStep steps={emailSteps} onStepsChange={setEmailSteps} userId={user?.id} />
        )}
        {currentStep === 3 && (
          <SettingsStep settings={settings} onSettingsChange={setSettings} />
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {currentStep < 3 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                isEditMode ? 'Saving...' : 'Creating...'
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Save Changes' : 'Create Campaign'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
