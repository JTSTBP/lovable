import { useState, useEffect } from 'react';
import { Flame, TrendingUp, Calendar, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WarmupSettings {
  warmup_enabled: boolean;
  warmup_start_date: string | null;
  warmup_current_limit: number;
  warmup_target_limit: number;
  warmup_increment: number;
  warmup_completed: boolean;
}

interface WarmupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountEmail: string;
  currentSettings: WarmupSettings;
  onUpdate: () => void;
}

export function WarmupSettingsDialog({
  open,
  onOpenChange,
  accountId,
  accountEmail,
  currentSettings,
  onUpdate,
}: WarmupSettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<WarmupSettings>(currentSettings);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  const handleToggleWarmup = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const updates: Partial<WarmupSettings> = {
        warmup_enabled: enabled,
      };

      if (enabled && !settings.warmup_start_date) {
        updates.warmup_start_date = new Date().toISOString().split('T')[0];
        updates.warmup_current_limit = settings.warmup_increment || 5;
        updates.warmup_completed = false;
      }

      const { error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', accountId);

      if (error) throw error;

      setSettings({ ...settings, ...updates });
      toast.success(enabled ? 'Warmup enabled' : 'Warmup disabled');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update warmup settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          warmup_target_limit: settings.warmup_target_limit,
          warmup_increment: settings.warmup_increment,
        })
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Warmup settings saved');
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!settings.warmup_enabled || settings.warmup_completed) return 100;
    const progress = (settings.warmup_current_limit / settings.warmup_target_limit) * 100;
    return Math.min(progress, 100);
  };

  const calculateDaysRemaining = () => {
    if (!settings.warmup_enabled || settings.warmup_completed) return 0;
    const remaining = settings.warmup_target_limit - settings.warmup_current_limit;
    return Math.ceil(remaining / settings.warmup_increment);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Email Warmup Settings
          </DialogTitle>
          <DialogDescription>
            Configure warmup for {accountEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable/Disable Warmup */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Warmup</Label>
              <p className="text-xs text-muted-foreground">
                Gradually increase sending volume
              </p>
            </div>
            <Switch
              checked={settings.warmup_enabled}
              onCheckedChange={handleToggleWarmup}
              disabled={isLoading}
            />
          </div>

          {settings.warmup_enabled && (
            <>
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Warmup Progress</span>
                  <span className="font-medium">
                    {settings.warmup_current_limit} / {settings.warmup_target_limit} emails/day
                  </span>
                </div>
                <Progress value={calculateProgress()} className="h-2" />
                {!settings.warmup_completed && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    ~{calculateDaysRemaining()} days remaining
                  </p>
                )}
                {settings.warmup_completed && (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Warmup completed!
                  </p>
                )}
              </div>

              {/* Target Limit */}
              <div className="space-y-2">
                <Label htmlFor="targetLimit" className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Target Daily Limit
                </Label>
                <Input
                  id="targetLimit"
                  type="number"
                  min={settings.warmup_current_limit}
                  max={500}
                  value={settings.warmup_target_limit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      warmup_target_limit: parseInt(e.target.value) || 50,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  The maximum emails/day after warmup completes
                </p>
              </div>

              {/* Daily Increment */}
              <div className="space-y-2">
                <Label htmlFor="increment" className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Daily Increment
                </Label>
                <Input
                  id="increment"
                  type="number"
                  min={1}
                  max={20}
                  value={settings.warmup_increment}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      warmup_increment: parseInt(e.target.value) || 5,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  How many more emails to add each day
                </p>
              </div>

              {/* Warmup Schedule Info */}
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Schedule:</strong> Starting at {settings.warmup_increment} emails/day, 
                  increasing by {settings.warmup_increment} daily until reaching {settings.warmup_target_limit}.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings} disabled={isLoading}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}