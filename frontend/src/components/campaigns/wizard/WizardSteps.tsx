import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardStep {
  id: number;
  title: string;
  description: string;
}

interface WizardStepsProps {
  steps: WizardStep[];
  currentStep: number;
}

export function WizardSteps({ steps, currentStep }: WizardStepsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'wizard-step-indicator',
                  isCompleted && 'completed',
                  isActive && 'active',
                  !isActive && !isCompleted && 'pending'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>
              <div className="hidden sm:block">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-16 h-0.5 mx-4',
                  currentStep > step.id ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
