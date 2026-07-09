import { useEffect, useState } from "react";
import {
  useGetDashboardStats,
  useGetMonthlyCampaigns,
  useGetTopPriorityCompanies,
  useListActivities
} from "@workspace/api-client-react";
import {
  Building2,
  Megaphone,
  Mail,
  Reply,
  Percent,
  BrainCircuit,
  Users,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { getGmailStatus, type GmailStatus } from "@/lib/gmail-api";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: monthlyCampaigns, isLoading: monthlyLoading } = useGetMonthlyCampaigns();
  const { data: topCompanies, isLoading: topLoading } = useGetTopPriorityCompanies();
  const { data: recentActivities, isLoading: activitiesLoading } = useListActivities({ limit: 5 });

  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);

  useEffect(() => {
    getGmailStatus()
      .then(setGmailStatus)
      .catch(() => setGmailStatus({ connected: false, email: null }));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground">Overview of your outreach performance and pipeline.</p>
        </div>

        {/* Gmail status chip */}
        {gmailStatus !== null && (
          gmailStatus.connected ? (
            <Link href="/settings">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm cursor-pointer hover:bg-emerald-500/15 transition-colors">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-[200px]">
                  {gmailStatus.email}
                </span>
              </div>
            </Link>
          ) : (
            <Link href="/settings">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-dashed text-sm cursor-pointer hover:bg-muted transition-colors">
                <XCircle size={14} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Gmail not connected</span>
              </div>
            </Link>
          )
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Companies"
          value={stats?.totalCompanies}
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatCard
          title="Active Campaigns"
          value={stats?.totalCampaigns}
          icon={<Megaphone className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatCard
          title="Emails Sent"
          value={stats?.totalEmailsSent}
          icon={<Mail className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatCard
          title="Total Replies"
          value={stats?.totalReplies}
          icon={<Reply className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatCard
          title="Avg Open Rate"
          value={stats?.avgOpenRate ? `${stats.avgOpenRate}%` : undefined}
          icon={<Percent className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatCard
          title="Avg Reply Rate"
          value={stats?.avgReplyRate ? `${stats.avgReplyRate}%` : undefined}
          icon={<Percent className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatCard
          title="Avg AI Score"
          value={stats?.avgAiScore}
          icon={<BrainCircuit className="h-4 w-4 text-primary" />}
          loading={statsLoading}
        />
        <StatCard
          title="Hiring Companies"
          value={stats?.hiringCompanies}
          icon={<Users className="h-4 w-4 text-emerald-500" />}
          loading={statsLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {monthlyLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyCampaigns || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Top Priority Companies</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {topLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : topCompanies && topCompanies.length > 0 ? (
              <div className="space-y-4">
                {topCompanies.map(company => (
                  <Link key={company.id} href={`/companies/${company.id}`} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div>
                      <div className="font-semibold group-hover:text-primary transition-colors">{company.name}</div>
                      <div className="text-xs text-muted-foreground">{company.industry || 'Unknown Industry'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Score: {company.aiLeadScore || 0}</Badge>
                      {company.hiringNow && <span className="text-[10px] text-emerald-500 font-medium">Hiring</span>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">No priority companies found.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentActivities && recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center gap-4 text-sm border-b border-border/50 last:border-0 pb-4 last:pb-0">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                  <div className="flex-1 text-muted-foreground">
                    <span className="text-foreground font-medium mr-2">{activity.type}</span>
                    {activity.description}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">No recent activity.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon, loading }: { title: string, value?: number | string, icon: React.ReactNode, loading: boolean }) {
  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value !== undefined ? value : 0}</div>
        )}
      </CardContent>
    </Card>
  );
}
