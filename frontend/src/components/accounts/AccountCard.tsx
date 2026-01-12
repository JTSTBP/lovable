import { useState } from 'react';
import { Mail, MoreVertical, CheckCircle2, XCircle, Flame, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AccountCardProps {
  email: string;
  provider: 'google' | 'outlook';
  dailyLimit: number;
  isConnected: boolean;
  warmupEnabled?: boolean;
  warmupCurrentLimit?: number;
  warmupTargetLimit?: number;
  warmupCompleted?: boolean;
  onDisconnect: () => void;
  onEdit: () => void;
  onWarmupSettings: () => void;
}

export function AccountCard({
  email,
  provider,
  dailyLimit,
  isConnected,
  warmupEnabled = false,
  warmupCurrentLimit = 5,
  warmupTargetLimit = 50,
  warmupCompleted = false,
  onDisconnect,
  onEdit,
  onWarmupSettings,
}: AccountCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const warmupProgress = warmupEnabled
    ? Math.min((warmupCurrentLimit / warmupTargetLimit) * 100, 100)
    : 0;

  const effectiveLimit = warmupEnabled && !warmupCompleted ? warmupCurrentLimit : dailyLimit;

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-6 transition-all duration-200 hover:shadow-md animate-fade-in group">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                provider === 'google' ? 'bg-red-100' : 'bg-blue-100'
              )}
            >
              <Mail
                className={cn(
                  'w-6 h-6',
                  provider === 'google' ? 'text-red-600' : 'text-blue-600'
                )}
              />
            </div>
            <div>
              <p className="font-medium text-foreground">{email}</p>
              <p className="text-sm text-muted-foreground capitalize">{provider}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={onWarmupSettings}>
                <Flame className="w-4 h-4 mr-2 text-orange-500" />
                Warmup Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Warmup Status */}
        {warmupEnabled && !warmupCompleted && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                  Warming up
                </span>
              </div>
              <span className="text-xs text-orange-600 dark:text-orange-400">
                {warmupCurrentLimit}/{warmupTargetLimit} emails/day
              </span>
            </div>
            <Progress value={warmupProgress} className="h-1.5" />
          </div>
        )}

        {warmupCompleted && (
          <div className="mt-4 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Warmup complete
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
            <span className={cn('text-sm', isConnected ? 'text-success' : 'text-destructive')}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{effectiveLimit}</span> emails/day
            {warmupEnabled && !warmupCompleted && (
              <span className="text-orange-500 text-xs ml-1">(warmup)</span>
            )}
          </p>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <b>{email}</b>? This will remove the account and all associated campaigns and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDisconnect();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
