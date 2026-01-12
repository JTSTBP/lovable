import { Play, Pause, MoreVertical, Users, Mail, MessageSquare, BarChart3, Copy, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CampaignCardProps {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  totalSent: number;
  totalOpened: number;
  totalReplied: number;
  senderEmail?: string;
  scheduledAt?: string | null;
  onToggleStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const statusConfig = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  active: { label: 'Active', className: 'bg-success/10 text-success' },
  paused: { label: 'Paused', className: 'bg-warning/10 text-warning' },
  completed: { label: 'Completed', className: 'bg-primary/10 text-primary' },
};

export function CampaignCard({
  id,
  name,
  status,
  totalSent,
  totalOpened,
  totalReplied,
  senderEmail,
  scheduledAt,
  onToggleStatus,
  onEdit,
  onDelete,
  onDuplicate,
}: CampaignCardProps) {
  const navigate = useNavigate();
  const config = statusConfig[status];
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
  const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : '0';

  return (
    <div className="bg-card rounded-xl border border-border p-6 transition-all duration-200 hover:shadow-md animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg text-foreground">{name}</h3>
            <Badge variant="secondary" className={cn('text-xs', config.className)}>
              {config.label}
            </Badge>
          </div>
          {senderEmail && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {senderEmail}
            </p>
          )}
          {scheduledAt && status === 'draft' && (
            <p className="text-sm text-primary mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Scheduled for {format(new Date(scheduledAt), 'PPP p')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(status === 'active' || status === 'paused' || status === 'draft') && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleStatus}
            >
              {status === 'active' ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/campaigns/${id}/analytics`)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>Edit Campaign</DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{totalSent}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{openRate}%</p>
            <p className="text-xs text-muted-foreground">Open Rate</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{replyRate}%</p>
            <p className="text-xs text-muted-foreground">Reply Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
