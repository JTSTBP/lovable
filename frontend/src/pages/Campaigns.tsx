import { useEffect, useState } from 'react';
import { Plus, Megaphone, Trash2, Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CampaignCard } from '@/components/campaigns/CampaignCard';
import { CampaignWizard } from '@/components/campaigns/CampaignWizard';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  total_sent: number;
  total_opened: number;
  total_replied: number;
  account_id: string | null;
  accounts: { email: string } | null;
  scheduled_at: string | null;
}

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCampaigns();
  }, [user]);

  async function fetchCampaigns() {
    // if (!user) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/campaigns?userId=${user?.id || ''}`);
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error("Failed to connect to backend");
    } finally {
      setIsLoading(false);
    }
  }

  /*
  async function handleToggleStatus(id: string, currentStatus: string) {
    // ... functionality temporarily disabled for backend migration
    toast.error("Status toggle not yet supported");
  }

  async function handleDelete(id: string) {
    toast.error("Delete not yet supported");
  }

  async function handleDuplicate(id: string) {
    toast.error("Duplicate not yet supported");
  }
  
  // Bulk actions disabled
  async function handleBulkPause() {}
  async function handleBulkActivate() {}
  async function handleBulkDelete() {}
  */


  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/campaigns/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'}`);
      fetchCampaigns();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };



  const handleBulkActivate = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`${import.meta.env.VITE_API_URL}/api/campaigns/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'active' })
          })
        )
      );
      toast.success("Campaigns activated");
      fetchCampaigns();
      clearSelection();
    } catch (error) {
      toast.error("Failed to activate campaigns");
    }
  };

  const handleBulkPause = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`${import.meta.env.VITE_API_URL}/api/campaigns/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'paused' })
          })
        )
      );
      toast.success("Campaigns paused");
      fetchCampaigns();
      clearSelection();
    } catch (error) {
      toast.error("Failed to pause campaigns");
    }
  };


  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this campaign? This cannot be undone.")) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/campaigns/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete campaign');

      toast.success("Campaign deleted successfully");
      fetchCampaigns();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete campaign");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} campaigns?`)) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`${import.meta.env.VITE_API_URL}/api/campaigns/${id}`, {
            method: 'DELETE',
          })
        )
      );
      toast.success("Campaigns deleted");
      fetchCampaigns();
      clearSelection();
    } catch (error) {
      toast.error("Failed to delete campaigns");
    }
  };

  const handleDuplicate = async (id?: string) => toast.error("Not supported");





  // Restore UI functions
  const handleEdit = (campaignId: string) => {
    setEditingCampaignId(campaignId);
    setShowWizard(true);
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setEditingCampaignId(null);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === campaigns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(campaigns.map((c) => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  if (showWizard) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {editingCampaignId ? 'Edit Campaign' : 'Create Campaign'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {editingCampaignId
                ? 'Update your campaign settings, sequences, and leads'
                : 'Set up your email sequence and import leads'}
            </p>
          </div>
          <CampaignWizard
            campaignId={editingCampaignId || undefined}
            onComplete={() => {
              handleCloseWizard();
              fetchCampaigns();
            }}
            onCancel={handleCloseWizard}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Manage your email outreach campaigns
            </p>
          </div>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-lg p-4 flex items-center gap-4 animate-fade-in">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} selected
            </span>
            <div className="h-4 w-px bg-border" />
            <Button variant="outline" size="sm" onClick={handleBulkActivate}>
              <Play className="w-4 h-4 mr-2" />
              Activate
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkPause}>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <div className="h-4 w-px bg-border" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearSelection}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Campaigns List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-card rounded-xl border border-border animate-pulse"
              />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first campaign to start reaching out
            </p>
            <Button onClick={() => setShowWizard(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center gap-3 px-2">
              <Checkbox
                checked={selectedIds.size === campaigns.length && campaigns.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select all</span>
            </div>
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-start gap-3">
                <div className="pt-6">
                  <Checkbox
                    checked={selectedIds.has(campaign.id)}
                    onCheckedChange={() => toggleSelection(campaign.id)}
                  />
                </div>
                <div className="flex-1">
                  <CampaignCard
                    id={campaign.id}
                    name={campaign.name}
                    status={campaign.status}
                    totalSent={campaign.total_sent}
                    totalOpened={campaign.total_opened}
                    totalReplied={campaign.total_replied}
                    senderEmail={campaign.accounts?.email}
                    scheduledAt={campaign.scheduled_at}
                    onToggleStatus={() =>
                      handleToggleStatus(campaign.id, campaign.status)
                    }
                    onEdit={() => handleEdit(campaign.id)}
                    onDelete={() => handleDelete(campaign.id)}
                    onDuplicate={() => handleDuplicate(campaign.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
