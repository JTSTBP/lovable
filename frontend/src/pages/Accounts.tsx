import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccountCard } from '@/components/accounts/AccountCard';
import { ConnectAccountDialog } from '@/components/accounts/ConnectAccountDialog';
import { WarmupSettingsDialog } from '@/components/accounts/WarmupSettingsDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Account {
  id: string;
  email: string;
  provider: 'google' | 'outlook';
  daily_limit: number;
  is_connected: boolean;
  warmup_enabled: boolean;
  warmup_start_date: string | null;
  warmup_current_limit: number;
  warmup_target_limit: number;
  warmup_increment: number;
  warmup_completed: boolean;
}

export default function Accounts() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [warmupDialogAccount, setWarmupDialogAccount] = useState<Account | null>(null);

  useEffect(() => {
    // Handle OAuth callback results
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      toast.success('Gmail account connected successfully!');
      setSearchParams({});
      fetchAccounts();
    } else if (error) {
      const errorMessages: Record<string, string> = {
        missing_params: 'OAuth callback missing required parameters',
        invalid_state: 'Invalid OAuth state',
        state_expired: 'OAuth session expired, please try again',
        server_config: 'Server configuration error',
        no_email: 'Could not retrieve email from Google',
        db_error: 'Failed to save account',
        unexpected: 'An unexpected error occurred',
      };
      toast.error(errorMessages[error] || `OAuth error: ${error}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchAccounts();
    console.log(user, "ggg")
  }, [user]);

  async function fetchAccounts() {
    // if (!user) return; // Auth check disabled for MVP

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/accounts?userId=${user?.id || ''}`);
      if (!response.ok) throw new Error('Failed to fetch accounts');

      const data = await response.json();

      // Map Prisma to Frontend interface if needed (snake_case vs camelCase)
      // Check schema: 
      // Account model: userId, email, provider, dailyLimit (@map daily_limit), isConnected (@map is_connected)
      // Prisma output will have camelCase properties like dailyLimit, isConnected unless we specifically select raw or map manually.
      // Frontend Interface 'Account' expects: daily_limit, is_connected.
      // We need to map them.

      const mappedAccounts = data.map((acc: any) => ({
        ...acc,
        daily_limit: acc.dailyLimit,
        is_connected: acc.isConnected,
        warmup_enabled: acc.warmupEnabled,
        warmup_start_date: acc.warmupStartDate,
        warmup_current_limit: acc.warmupCurrentLimit,
        warmup_target_limit: acc.warmupTargetLimit,
        warmup_increment: acc.warmupIncrement,
        warmup_completed: acc.warmupCompleted,
      }));

      setAccounts(mappedAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error("Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisconnect(id: string) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/accounts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete account');

      toast.success('Account disconnected');
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect account');
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Email Accounts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your connected email accounts
            </p>
          </div>

          <div className="flex gap-2">
            {user ? (
              <>
                <Button asChild variant="outline" className="gap-2">
                  <a href={`${import.meta.env.VITE_API_URL}/api/auth/outlook?userId=${user.id}`}>
                    <img src="/microsoft-logo.svg" alt="Microsoft" className="w-4 h-4" onError={(e) => e.currentTarget.style.display = 'none'} />
                    <span className="hidden sm:inline">Connect Outlook</span>
                    <span className="sm:hidden">Outlook</span>
                  </a>
                </Button>
                <Button asChild className="gap-2">
                  <a href={`${import.meta.env.VITE_API_URL}/api/auth/google?userId=${user.id}`}>
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Connect Google</span>
                    <span className="sm:hidden">Google</span>
                  </a>
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Loading user...</div>
            )}
          </div>
        </div>


        <ConnectAccountDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={fetchAccounts}
        />

        {warmupDialogAccount && (
          <WarmupSettingsDialog
            open={!!warmupDialogAccount}
            onOpenChange={(open) => !open && setWarmupDialogAccount(null)}
            accountId={warmupDialogAccount.id}
            accountEmail={warmupDialogAccount.email}
            currentSettings={{
              warmup_enabled: warmupDialogAccount.warmup_enabled,
              warmup_start_date: warmupDialogAccount.warmup_start_date,
              warmup_current_limit: warmupDialogAccount.warmup_current_limit,
              warmup_target_limit: warmupDialogAccount.warmup_target_limit,
              warmup_increment: warmupDialogAccount.warmup_increment,
              warmup_completed: warmupDialogAccount.warmup_completed,
            }}
            onUpdate={fetchAccounts}
          />
        )}

        {/* Accounts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-card rounded-xl border border-border animate-pulse"
              />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No accounts connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your first email account to start sending campaigns
            </p>
            <Button asChild>
              <a href={`${import.meta.env.VITE_API_URL}/api/auth/google?userId=${user?.id}`}>
                <Plus className="w-4 h-4 mr-2" />
                Connect Google Account
              </a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                email={account.email}
                provider={account.provider}
                dailyLimit={account.daily_limit}
                isConnected={account.is_connected}
                warmupEnabled={account.warmup_enabled}
                warmupCurrentLimit={account.warmup_current_limit}
                warmupTargetLimit={account.warmup_target_limit}
                warmupCompleted={account.warmup_completed}
                onDisconnect={() => handleDisconnect(account.id)}
                onEdit={() => { }}
                onWarmupSettings={() => setWarmupDialogAccount(account)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
