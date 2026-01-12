import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ConnectAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ConnectAccountDialog({ open, onOpenChange, onSuccess }: ConnectAccountDialogProps) {
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const { user } = useAuth();

  // Import useAuth at top

  async function handleGoogleConnect() {
    if (!user) {
      toast.error('You must be logged in to connect an account');
      return;
    }

    setIsConnectingGoogle(true);
    // Redirect to backend OAuth flow with userId
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google?userId=${user.id}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Email Account</DialogTitle>
          <DialogDescription>
            Connect your email account to start sending campaigns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Google/Gmail */}
          <Button
            variant="outline"
            className="w-full h-14 justify-start gap-4"
            onClick={handleGoogleConnect}
            disabled={isConnectingGoogle}
          >
            {isConnectingGoogle ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <div className="text-left">
              <div className="font-medium">Connect Gmail</div>
              <div className="text-xs text-muted-foreground">Use Google OAuth</div>
            </div>
          </Button>

          {/* Outlook - Coming Soon */}
          <Button
            variant="outline"
            className="w-full h-14 justify-start gap-4 opacity-50 cursor-not-allowed"
            disabled
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#0078D4"
                d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.354.228-.587.228h-8.55v-6.108l1.297.915c.097.065.209.097.336.097.128 0 .24-.032.336-.097l7.168-5.089h.238zm-9.375 6.108H4.5V4.43c0-.23.08-.424.238-.576.158-.152.354-.228.587-.228h8.55v9.869h.75zm8.55-9.062l-7.8 5.542-1.05-.743V1.125c0-.312.11-.578.33-.797.22-.22.485-.328.795-.328h7.725v4.433z"
              />
              <path
                fill="#0078D4"
                d="M9 7.5L0 12.75v-9C0 3.098.352 2.578.938 2.25L9 7.5z"
              />
              <path
                fill="#28A8EA"
                d="M9 7.5v10.125c0 .375-.127.697-.38.966-.255.27-.565.409-.932.409H0V12.75L9 7.5z"
              />
            </svg>
            <div className="text-left">
              <div className="font-medium">Connect Outlook</div>
              <div className="text-xs text-muted-foreground">Coming soon</div>
            </div>
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            We'll request permission to send emails on your behalf.
            Your credentials are encrypted and stored securely.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
