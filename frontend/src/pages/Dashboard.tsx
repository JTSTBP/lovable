import { useEffect, useState } from 'react';
import { Send, Eye, MessageSquare, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalSent: number;
  totalOpened: number;
  totalReplied: number;
  totalLeads: number;
}

interface DashboardActivity {
  id: string;
  type: 'lead' | 'campaign';
  action: string;
  message: string;
  campaignName?: string;
  timestamp: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSent: 0,
    totalOpened: 0,
    totalReplied: 0,
    totalLeads: 0,
  });
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/stats?userId=${user?.id || ''}`),
          fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/activity?userId=${user?.id || ''}`)
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setActivities(activityData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  const openRate =
    stats.totalSent > 0
      ? ((stats.totalOpened / stats.totalSent) * 100).toFixed(1)
      : '0';
  const replyRate =
    stats.totalSent > 0
      ? ((stats.totalReplied / stats.totalSent) * 100).toFixed(1)
      : '0';

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your email outreach performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Sent"
            value={stats.totalSent.toLocaleString()}
            subtitle="All time"
            icon={<Send className="w-6 h-6" />}
          />
          <StatCard
            title="Open Rate"
            value={`${openRate}%`}
            subtitle={`${stats.totalOpened.toLocaleString()} opened`}
            icon={<Eye className="w-6 h-6" />}
          />
          <StatCard
            title="Reply Rate"
            value={`${replyRate}%`}
            subtitle={`${stats.totalReplied.toLocaleString()} replies`}
            icon={<MessageSquare className="w-6 h-6" />}
          />
          <StatCard
            title="Total Leads"
            value={stats.totalLeads.toLocaleString()}
            subtitle="In database"
            icon={<Users className="w-6 h-6" />}
          />
        </div>

        {/* Placeholder for charts/activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.type === 'campaign' ? 'bg-primary/10' : 'bg-success/10'
                      }`}>
                      {activity.type === 'campaign' ? (
                        <Send className="w-5 h-5 text-primary" />
                      ) : (
                        <Users className="w-5 h-5 text-success" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {activity.message}
                      </p>
                      {activity.campaignName && (
                        <p className="text-xs text-muted-foreground">
                          Campaign: {activity.campaignName}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <a
                href="/campaigns"
                className="p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-center"
              >
                <Send className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">New Campaign</p>
              </a>
              <a
                href="/accounts"
                className="p-4 rounded-lg bg-success/10 hover:bg-success/20 transition-colors text-center"
              >
                <Users className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Add Account</p>
              </a>
              <a
                href="/leads"
                className="p-4 rounded-lg bg-warning/10 hover:bg-warning/20 transition-colors text-center"
              >
                <MessageSquare className="w-8 h-8 text-warning mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">View Leads</p>
              </a>
              <a
                href="/campaigns"
                className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-center"
              >
                <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Analytics</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
