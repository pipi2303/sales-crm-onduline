import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Target, DollarSign, Calendar, FileText, Award, Activity, RefreshCw, CheckCircle2, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  CHART_COLORS, CHART_PRIMARY, CHART_GRID, CHART_MUTED_TEXT,
  CHART_TOOLTIP_STYLE, BAR_RADIUS_UP, AREA_GRADIENT_STOPS,
} from '@/styles/chartTheme';
import { salesData, leadSourceData, performanceData } from '@/app/data/dummyData';
import { demosApi, contractsApi, salesTeamApi } from '@/services/api';
import { leadsRepository } from '@/services/leadsRepository';
import { opportunitiesRepository } from '@/services/opportunitiesRepository';
import { tasksRepository } from '@/services/tasksRepository';
import { toast } from 'sonner';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { initializeDemosData } from '@/utils/initializeDemos';

export function Home() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    activeLeads: 0,
    demosScheduled: 0,
    conversionRate: 0,
    totalRevenue: 0,
    pipelineValue: 0,
    upside: 0,
    strongUpside: 0,
    forecast: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [bab13Loading, setBab13Loading] = useState(true);
  const [bab13, setBab13] = useState({
    revenueMTD: 0,
    revenueYTD: 0,
    winRate: 0,
    wonCount: 0,
    lostCount: 0,
    visitCompliance: 0,
    visitCompliantCount: 0,
    visitDueCount: 0,
  });

  useEffect(() => {
    // Initialize demo data on app load
    initializeDemosData();
    fetchDashboardData();
    fetchBab13Stats();
  }, []);

  // Bab 13 -- Revenue MTD/YTD, Win Rate, Kepatuhan Visit Toko. Dihitung
  // langsung dari data Opportunity/Task nyata (Fase A/B seed data,
  // prisma/seed.ts), bukan dari PerformanceTarget.actual (field itu
  // diisi manual lewat form Territory, bukan hasil agregasi -- lihat
  // MEMORY.md bagian Fase A). Fetch & loading state terpisah dari
  // fetchDashboardData (berbasis Lead) supaya kegagalan salah satu
  // tidak menjatuhkan yang lain.
  const fetchBab13Stats = async () => {
    try {
      setBab13Loading(true);
      const [oppsResult, tasksResult] = await Promise.all([
        opportunitiesRepository.getAll(),
        tasksRepository.getAll(),
      ]);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let revenueMTD = 0;
      let revenueYTD = 0;
      let wonCount = 0;
      let lostCount = 0;

      if (oppsResult.success && oppsResult.data) {
        for (const opp of oppsResult.data) {
          if (opp.status === 'won') wonCount += 1;
          if (opp.status === 'lost') lostCount += 1;

          if (opp.status === 'won' && opp.actualCloseDate) {
            const closed = new Date(opp.actualCloseDate);
            if (closed.getFullYear() === currentYear) {
              revenueYTD += opp.totalValue || 0;
              if (closed.getMonth() === currentMonth) {
                revenueMTD += opp.totalValue || 0;
              }
            }
          }
        }
      }
      const winRate = wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

      let visitCompliantCount = 0;
      let visitDueCount = 0;
      if (tasksResult.success && tasksResult.data) {
        for (const task of tasksResult.data) {
          if (task.type !== 'visit') continue;
          if (!task.dueDate || new Date(task.dueDate) > now) continue; // belum jatuh tempo, jangan dihitung
          visitDueCount += 1;
          if (task.checkInAt) visitCompliantCount += 1;
        }
      }
      const visitCompliance = visitDueCount > 0 ? (visitCompliantCount / visitDueCount) * 100 : 0;

      setBab13({
        revenueMTD,
        revenueYTD,
        winRate,
        wonCount,
        lostCount,
        visitCompliance,
        visitCompliantCount,
        visitDueCount,
      });
    } catch (error: any) {
      console.error('Error fetching Bab 13 stats:', error);
    } finally {
      setBab13Loading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [leadsResult, demosResult, contractsResult, teamResult] = await Promise.all([
        leadsRepository.getAll(),
        demosApi.getAll(),
        contractsApi.getAll(),
        salesTeamApi.getAll(),
      ]);

      if (leadsResult.success && leadsResult.data) {
        const leads = leadsResult.data;
        const activeLeads = leads.filter((l: any) => 
          ['new', 'contacted', 'qualified', 'proposal', 'negotiation'].includes(l.status)
        ).length;

        const wonLeads = leads.filter((l: any) => l.status === 'won');
        const totalSales = wonLeads.reduce((sum: number, l: any) => sum + (l.value || 0), 0);
        
        const conversionRate = leads.length > 0 
          ? ((wonLeads.length / leads.length) * 100).toFixed(0)
          : 0;

        // Calculate pipeline metrics
        const pipelineLeads = leads.filter((l: any) => 
          ['qualified', 'proposal', 'negotiation'].includes(l.status)
        );
        const pipelineValue = pipelineLeads.reduce((sum: number, l: any) => sum + (l.value || 0), 0);
        
        // Mock upside and forecast calculations
        const upside = pipelineValue * 0.62; // 62% of pipeline
        const strongUpside = pipelineValue * 0.35; // 35% of pipeline (high confidence)
        const forecast = totalSales + (pipelineValue * 0.75); // Revenue + 75% of pipeline
        const totalRevenue = totalSales * 1.15; // Mock total revenue (sales + recurring)

        setStats(prev => ({
          ...prev,
          activeLeads,
          totalSales,
          conversionRate: Number(conversionRate),
          totalRevenue,
          pipelineValue,
          upside,
          strongUpside,
          forecast,
        }));

        // Generate recent activities from leads
        const activities = leads.slice(0, 4).map((lead: any) => ({
          user: lead.assignedTo || 'System',
          action: `Updated lead - ${lead.name} (${lead.status})`,
          time: getTimeAgo(lead.updatedAt || lead.createdAt),
          value: lead.value ? formatCurrency(lead.value) : '',
        }));
        setRecentActivities(activities);
      }

      if (demosResult.success && demosResult.data) {
        const demos = demosResult.data;
        const upcomingDemos = demos.filter((d: any) => 
          d.status === 'scheduled' || d.status === 'confirmed'
        ).length;
        
        setStats(prev => ({ ...prev, demosScheduled: upcomingDemos }));
      }

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'baru saja';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} menit lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  };

  const statsDisplay = [
    {
      title: 'Total Sales',
      value: formatCurrency(stats.totalSales),
      change: '+23.5%',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Active Leads',
      value: formatNumber(stats.activeLeads),
      change: '+12 new',
      icon: Users,
      color: 'from-blue-500 to-[#013E37]',
      textColor: 'text-blue-600'
    },
    {
      title: 'Demos Scheduled',
      value: formatNumber(stats.demosScheduled),
      change: '5 this week',
      icon: Calendar,
      color: 'from-green-500 to-emerald-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: '+18.2%',
      icon: DollarSign,
      color: 'from-emerald-500 to-[#013E37]',
      textColor: 'text-emerald-600'
    },
    // Row 2 starts here
    {
      title: 'Pipeline Value',
      value: formatCurrency(stats.pipelineValue),
      change: 'Strong pipeline',
      icon: TrendingUp,
      color: 'from-[#EEF7F5]0 to-[#EEF7F5]0',
      textColor: 'text-[#013E37]'
    },
    {
      title: 'Upside',
      value: formatCurrency(stats.upside),
      change: 'Potential growth',
      icon: TrendingUp,
      color: 'from-[#013E37] to-blue-500',
      textColor: 'text-cyan-600'
    },
    {
      title: 'Strong Upside',
      value: formatCurrency(stats.strongUpside),
      change: 'High confidence',
      icon: TrendingUp,
      color: 'from-[#EEF7F5]0 to-pink-500',
      textColor: 'text-[#013E37]'
    },
    {
      title: 'Forecast',
      value: formatCurrency(stats.forecast),
      change: 'Predicted revenue',
      icon: Target,
      color: 'from-[#013E37] to-emerald-500',
      textColor: 'text-[#013E37]'
    },
  ];

  const COLORS = CHART_COLORS;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">
            Dashboard Sales Monitoring
          </h1>
          <p className="text-gray-600 mt-1">Selamat datang kembali! Berikut ringkasan aktivitas sales Anda hari ini.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchDashboardData}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid - 2 Rows: 4 cards + 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsDisplay.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  {/* No truncate here - uppercase + tracking-wide labels like "Total Revenue"
                      need to wrap to 2 lines rather than get cut off ("TOTAL REV..."). */}
                  <p className="text-xs text-gray-500 uppercase tracking-wide leading-snug">{stat.title}</p>
                  <p className="text-xl font-bold mt-1 truncate">{stat.value}</p>
                  <p className={`text-xs ${stat.textColor} mt-0.5 truncate`}>{stat.change}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bab 13 -- Revenue MTD/YTD, Win Rate, Kepatuhan Visit Toko (data nyata dari Opportunity/Task) */}
      <Card className="hover:shadow-lg transition-shadow border-[#013E37]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-[#013E37]" />
            Ringkasan Bab 13
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bab13Loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#013E37]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-[#013E37] flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide leading-snug">Revenue MTD</p>
                  <p className="text-xl font-bold mt-1 truncate">{formatCurrency(bab13.revenueMTD)}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">Bulan berjalan, deal WON</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#013E37] to-emerald-500 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide leading-snug">Revenue YTD</p>
                  <p className="text-xl font-bold mt-1 truncate">{formatCurrency(bab13.revenueYTD)}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">Tahun berjalan, deal WON</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-[#013E37] flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide leading-snug">Win Rate</p>
                  <p className="text-xl font-bold mt-1 truncate">{bab13.winRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{bab13.wonCount} won / {bab13.lostCount} lost</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-[#013E37] flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide leading-snug">Kepatuhan Visit Toko</p>
                  <p className="text-xl font-bold mt-1 truncate">{bab13.visitCompliance.toFixed(1)}%</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{bab13.visitCompliantCount} check-in / {bab13.visitDueCount} jadwal</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#013E37]" />
              Trend Penjualan (Juta Rupiah)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.from} />
                    <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.to} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="month" stroke={CHART_MUTED_TEXT} tick={{ fontSize: 12, fill: CHART_MUTED_TEXT }} axisLine={false} tickLine={false} />
                <YAxis stroke={CHART_MUTED_TEXT} tick={{ fontSize: 12, fill: CHART_MUTED_TEXT }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="value" stroke={CHART_PRIMARY} strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#013E37]" />
              Sumber Lead
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#013E37]" />
            Performance Tim Sales (Juta Rupiah)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="name" stroke={CHART_MUTED_TEXT} tick={{ fontSize: 12, fill: CHART_MUTED_TEXT }} axisLine={false} tickLine={false} />
              <YAxis stroke={CHART_MUTED_TEXT} tick={{ fontSize: 12, fill: CHART_MUTED_TEXT }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
              <Legend />
              <Bar dataKey="target" fill="var(--border)" name="Target" radius={BAR_RADIUS_UP} />
              <Bar dataKey="achievement" fill={CHART_PRIMARY} name="Achievement" radius={BAR_RADIUS_UP} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#013E37]" />
            Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 hover:bg-[#EEF7F5] transition-colors cursor-pointer">
                <div className="h-10 w-10 rounded-full bg-[#013E37] flex items-center justify-center text-white font-semibold">
                  {activity.user.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.user}</p>
                  <p className="text-sm text-gray-600">{activity.action}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
                {activity.value && (
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{activity.value}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}