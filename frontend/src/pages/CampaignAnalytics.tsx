import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Users, MessageSquare, TrendingUp, Calendar, FlaskConical, Trophy, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_sent: number;
  total_opened: number;
  total_replied: number;
  created_at: string;
}

interface EmailEvent {
  id: string;
  event_type: string;
  created_at: string;
  variant_id: string | null;
}

interface DailyStats {
  date: string;
  sent: number;
  opened: number;
  replied: number;
  clicked: number;
}

interface VariantStats {
  variant_id: string;
  variant_name: string;
  subject: string;
  sent: number;
  opened: number;
  replied: number;
  clicked: number;
  openRate: number;
  replyRate: number;
  clickRate: number;
}

interface ABTestVariant {
  id: string;
  variant_name: string;
  subject: string;
  step_id: string;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

export default function CampaignAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [variantStats, setVariantStats] = useState<VariantStats[]>([]);
  const [totalClicked, setTotalClicked] = useState(0);
  const [hasABTest, setHasABTest] = useState(false);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (id) {
      fetchCampaignData();
    }
  }, [id]);



  const fetchCampaignData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/campaigns/${id}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setCampaign(data.campaign);

      // Process events into daily stats (if provided directly or rebuild from events if needed)
      // The API returns 'dailyStats' which are the days WITH activity. 
      // We want to show a 30-day trend, so we'll merge this with a 30-day timeline.

      const last30Days = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date(),
      });

      const statsMap = new Map<string, DailyStats>();

      // Initialize with zeros
      last30Days.forEach((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        statsMap.set(dateKey, {
          date: format(day, 'MMM dd'),
          sent: 0,
          opened: 0,
          replied: 0,
          clicked: 0,
        });
      });

      // Merge API data
      if (data.dailyStats) {
        data.dailyStats.forEach((stat: any) => {
          // keys in API are YYYY-MM-DD
          if (statsMap.has(stat.date)) {
            const existing = statsMap.get(stat.date)!;
            statsMap.set(stat.date, { ...existing, ...stat, date: existing.date });
          }
        });
      }

      setDailyStats(Array.from(statsMap.values()));
      setEvents(data.events || []);
      setVariantStats(data.variantStats || []);
      setHasABTest((data.variantStats || []).length > 0);

      // totalClicked can be derived or passed. For now, sum it up.
      const totalClicks = (data.dailyStats || []).reduce((acc: number, curr: any) => acc + (curr.clicked || 0), 0);
      setTotalClicked(totalClicks);

    } catch (error) {
      console.error('Error fetching campaign data:', error);
    } finally {
      setLoading(false);
    }
  };


  const getWinningVariant = () => {
    if (variantStats.length < 2) return null;
    const sorted = [...variantStats].sort((a, b) => b.openRate - a.openRate);
    if (sorted[0].sent < 10) return null; // Need at least 10 sends to determine winner
    return sorted[0];
  };


  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-xl font-semibold text-foreground">Campaign not found</div>
          <Button onClick={() => navigate('/campaigns')}>Back to Campaigns</Button>
        </div>
      </DashboardLayout>
    );
  }


  const openRate = campaign.total_sent > 0
    ? ((campaign.total_opened / campaign.total_sent) * 100).toFixed(1)
    : '0';
  const replyRate = campaign.total_sent > 0
    ? ((campaign.total_replied / campaign.total_sent) * 100).toFixed(1)
    : '0';
  const clickRate = campaign.total_sent > 0
    ? ((totalClicked / campaign.total_sent) * 100).toFixed(1)
    : '0';

  const winningVariant = getWinningVariant();

  // Prepare pie chart data for variant distribution
  const variantPieData = variantStats.map((v, index) => ({
    name: v.variant_name,
    value: v.sent,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{campaign.name}</h1>
            <p className="text-muted-foreground">Campaign Analytics</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.total_sent}</div>
              <p className="text-xs text-muted-foreground">emails delivered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opened</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.total_opened}</div>
              <p className="text-xs text-muted-foreground">{openRate}% open rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clicked</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClicked}</div>
              <p className="text-xs text-muted-foreground">{clickRate}% click rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Replied</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign.total_replied}</div>
              <p className="text-xs text-muted-foreground">{replyRate}% reply rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Started</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {format(new Date(campaign.created_at), 'MMM dd')}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(campaign.created_at), 'yyyy')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* A/B Test Results Section */}
        {hasABTest && variantStats.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5" />
                  A/B Test Results
                  {winningVariant && (
                    <Badge variant="default" className="ml-2 gap-1">
                      <Trophy className="w-3 h-3" />
                      Winner: Variant {winningVariant.variant_name}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Performance comparison between email variants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {variantStats.map((variant, index) => (
                    <Card key={variant.variant_id} className={`border-2 ${winningVariant?.variant_id === variant.variant_id ? 'border-primary' : 'border-muted'}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            Variant {variant.variant_name}
                          </CardTitle>
                          {winningVariant?.variant_id === variant.variant_id && (
                            <Trophy className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <CardDescription className="text-xs truncate" title={variant.subject}>
                          Subject: {variant.subject}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <div className="text-lg font-bold">{variant.sent}</div>
                            <div className="text-xs text-muted-foreground">Sent</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{variant.opened}</div>
                            <div className="text-xs text-muted-foreground">Opened</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{variant.clicked}</div>
                            <div className="text-xs text-muted-foreground">Clicked</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">{variant.replied}</div>
                            <div className="text-xs text-muted-foreground">Replied</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Open Rate</span>
                            <span className="font-medium">{variant.openRate.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(variant.openRate, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Click Rate</span>
                            <span className="font-medium">{variant.clickRate.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-warning h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(variant.clickRate, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Reply Rate</span>
                            <span className="font-medium">{variant.replyRate.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-success h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(variant.replyRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Variant Comparison Chart */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Open Rate Comparison</CardTitle>
                  <CardDescription>Open rates by variant</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={variantStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" domain={[0, 100]} unit="%" />
                        <YAxis
                          type="category"
                          dataKey="variant_name"
                          width={80}
                          tickFormatter={(value) => `Variant ${value}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Open Rate']}
                        />
                        <Bar
                          dataKey="openRate"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                          name="Open Rate"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Send Distribution</CardTitle>
                  <CardDescription>Emails sent per variant</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={variantPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {variantPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Activity Over Time
            </CardTitle>
            <CardDescription>Email activity for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sent"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Sent"
                  />
                  <Line
                    type="monotone"
                    dataKey="opened"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={false}
                    name="Opened"
                  />
                  <Line
                    type="monotone"
                    dataKey="clicked"
                    stroke="hsl(var(--warning))"
                    strokeWidth={2}
                    dot={false}
                    name="Clicked"
                  />
                  <Line
                    type="monotone"
                    dataKey="replied"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={false}
                    name="Replied"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
            <CardDescription>Emails sent, opened, and replied per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="opened" fill="hsl(var(--success))" name="Opened" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicked" fill="hsl(var(--warning))" name="Clicked" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="replied" fill="hsl(var(--destructive))" name="Replied" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
