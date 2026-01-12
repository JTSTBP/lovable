import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, AlertCircle, CalendarIcon, Clock, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  email: string;
  provider: string;
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

interface SettingsStepProps {
  settings: CampaignSettings;
  onSettingsChange: (settings: CampaignSettings) => void;
}

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
];

const hours = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i === 0 ? 12 : i > 12 ? i - 12 : i}:00 ${i < 12 ? 'AM' : 'PM'}`,
}));

export function SettingsStep({ settings, onSettingsChange }: SettingsStepProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [enableScheduling, setEnableScheduling] = useState(!!settings.scheduledAt);
  const [scheduledTime, setScheduledTime] = useState(
    settings.scheduledAt ? format(settings.scheduledAt, 'HH:mm') : '09:00'
  );

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);


  const fetchAccounts = async () => {
    try {
      if (!user?.id) return;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/accounts?userId=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch accounts');

      const data = await response.json();

      // Filter for connected accounts and map if necessary
      const connectedAccounts = data.filter((acc: any) => acc.isConnected || acc.is_connected);
      setAccounts(connectedAccounts);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };


  const updateSetting = <K extends keyof CampaignSettings>(
    key: K,
    value: CampaignSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleScheduleToggle = (enabled: boolean) => {
    setEnableScheduling(enabled);
    if (enabled) {
      // Disable start immediately when scheduling is enabled
      onSettingsChange({ ...settings, startImmediately: false });
    }
    if (!enabled) {
      updateSetting('scheduledAt', null);
    } else if (!settings.scheduledAt) {
      // Set default to tomorrow at 9am
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      updateSetting('scheduledAt', tomorrow);
    }
  };

  const handleStartImmediately = () => {
    setEnableScheduling(false);
    onSettingsChange({
      ...settings,
      startImmediately: true,
      scheduledAt: null
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    updateSetting('scheduledAt', date);
  };

  const handleTimeChange = (time: string) => {
    setScheduledTime(time);
    if (settings.scheduledAt) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(settings.scheduledAt);
      newDate.setHours(hours, minutes, 0, 0);
      updateSetting('scheduledAt', newDate);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Campaign Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure sending limits and schedule
        </p>
      </div>

      <div className="grid gap-6 max-w-md">
        {/* Email Account */}
        <div className="space-y-2">
          <Label>Send From</Label>
          {loadingAccounts ? (
            <div className="h-10 bg-muted animate-pulse rounded-md" />
          ) : accounts.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>No email accounts connected. Please connect an account first.</span>
            </div>
          ) : (
            <Select
              value={settings.accountId}
              onValueChange={(value) => updateSetting('accountId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select email account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{account.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Campaign Name */}
        <div className="space-y-2">
          <Label>Campaign Name</Label>
          <Input
            value={settings.name}
            onChange={(e) => updateSetting('name', e.target.value)}
            placeholder="e.g., Q1 Outreach - Tech Leads"
          />
        </div>

        {/* Daily Limit */}
        <div className="space-y-2">
          <Label>Daily Send Limit</Label>
          <Input
            type="number"
            min="1"
            max="200"
            value={settings.dailyLimit}
            onChange={(e) =>
              updateSetting('dailyLimit', parseInt(e.target.value) || 50)
            }
          />
          <p className="text-xs text-muted-foreground">
            Maximum emails to send per day (recommended: 30-50)
          </p>
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          <Label>Sending Schedule</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Start Time</Label>
              <Select
                value={settings.scheduleStartHour.toString()}
                onValueChange={(value) =>
                  updateSetting('scheduleStartHour', parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value.toString()}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">End Time</Label>
              <Select
                value={settings.scheduleEndHour.toString()}
                onValueChange={(value) =>
                  updateSetting('scheduleEndHour', parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value.toString()}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select
            value={settings.timezone}
            onValueChange={(value) => updateSetting('timezone', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start Campaign Options */}
        <div className="space-y-4 pt-4 border-t border-border">
          <Label>Launch Options</Label>

          {/* Start Now Button */}
          <Button
            type="button"
            variant={settings.startImmediately ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={handleStartImmediately}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Now
            {settings.startImmediately && (
              <span className="ml-auto text-xs bg-primary-foreground/20 px-2 py-0.5 rounded">
                Selected
              </span>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Campaign will start immediately after creation
          </p>

          {/* Schedule Campaign */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <Label>Schedule for Later</Label>
              <p className="text-xs text-muted-foreground">
                Start the campaign at a specific date and time
              </p>
            </div>
            <Switch
              checked={enableScheduling}
              onCheckedChange={(checked) => {
                handleScheduleToggle(checked);
                if (checked) {
                  onSettingsChange({ ...settings, startImmediately: false });
                }
              }}
            />
          </div>

          {enableScheduling && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !settings.scheduledAt && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {settings.scheduledAt
                        ? format(settings.scheduledAt, 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={settings.scheduledAt || undefined}
                      onSelect={handleDateChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
