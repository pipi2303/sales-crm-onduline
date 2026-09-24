import React, { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Users, DollarSign, Target,
  ArrowUpRight, ArrowDownRight, Download, Filter, RefreshCw,
  ShoppingBag, Layers, Activity, Award, Zap, Globe, Calendar,
  ChevronUp, ChevronDown, Eye, BarChart2, PieChart as PieChartIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ComposedChart, Scatter, ScatterChart, ZAxis,
  Treemap,
} from 'recharts';
import { CHART_COLORS, CHART_PRIMARY, CHART_GRID, CHART_STATUS } from '@/styles/chartTheme';

// ─── Color Palette ────────────────────────────────────────────────
const BRAND = CHART_PRIMARY;
const BRAND_LIGHT = 'var(--muted)';
const COLORS = CHART_COLORS;

// ─── Mock Data ────────────────────────────────────────────────────
const monthlyData = [
  { month: 'Jan', revenue: 845, target: 900, deals: 32, leads: 145, conversion: 22, expenses: 310 },
  { month: 'Feb', revenue: 920, target: 900, deals: 38, leads: 162, conversion: 23, expenses: 280 },
  { month: 'Mar', revenue: 880, target: 950, deals: 35, leads: 155, conversion: 23, expenses: 295 },
  { month: 'Apr', revenue: 1050, target: 950, deals: 45, leads: 188, conversion: 24, expenses: 340 },
  { month: 'Mei', revenue: 980, target: 1000, deals: 41, leads: 172, conversion: 24, expenses: 320 },
  { month: 'Jun', revenue: 1150, target: 1000, deals: 52, leads: 210, conversion: 25, expenses: 365 },
  { month: 'Jul', revenue: 1090, target: 1050, deals: 48, leads: 198, conversion: 24, expenses: 350 },
  { month: 'Agu', revenue: 1240, target: 1050, deals: 58, leads: 225, conversion: 26, expenses: 390 },
  { month: 'Sep', revenue: 1180, target: 1100, deals: 54, leads: 215, conversion: 25, expenses: 375 },
  { month: 'Okt', revenue: 1320, target: 1100, deals: 62, leads: 240, conversion: 26, expenses: 410 },
  { month: 'Nov', revenue: 1280, target: 1150, deals: 59, leads: 232, conversion: 25, expenses: 400 },
  { month: 'Des', revenue: 1450, target: 1150, deals: 68, leads: 265, conversion: 26, expenses: 445 },
];

const quarterlyData = [
  { quarter: 'Q1 2024', revenue: 2645, target: 2750, growth: 12.4 },
  { quarter: 'Q2 2024', revenue: 3180, target: 2950, growth: 20.2 },
  { quarter: 'Q3 2024', revenue: 3510, target: 3200, growth: 10.4 },
  { quarter: 'Q4 2024', revenue: 4050, target: 3400, growth: 15.4 },
];

const teamPerformance = [
  { name: 'Ahmad S.', closed: 68, inProgress: 22, lost: 8, revenue: 820, quota: 750, region: 'Jakarta' },
  { name: 'Budi P.', closed: 75, inProgress: 18, lost: 5, revenue: 940, quota: 850, region: 'Surabaya' },
  { name: 'Citra R.', closed: 55, inProgress: 28, lost: 12, revenue: 680, quota: 700, region: 'Bandung' },
  { name: 'Diana M.', closed: 82, inProgress: 15, lost: 4, revenue: 1050, quota: 900, region: 'Jakarta' },
  { name: 'Eko W.', closed: 48, inProgress: 35, lost: 15, revenue: 590, quota: 650, region: 'Medan' },
  { name: 'Fani A.', closed: 63, inProgress: 25, lost: 10, revenue: 760, quota: 720, region: 'Bali' },
];

const leadSources = [
  { name: 'Website', value: 34, leads: 482, color: COLORS[0] },
  { name: 'Referral', value: 26, leads: 368, color: COLORS[1] },
  { name: 'Social Media', value: 19, leads: 270, color: COLORS[2] },
  { name: 'Email Campaign', value: 13, leads: 184, color: COLORS[3] },
  { name: 'Cold Outreach', value: 5, leads: 71, color: COLORS[4] },
  { name: 'Lainnya', value: 3, leads: 43, color: COLORS[5] },
];

const conversionFunnel = [
  { stage: 'Total Leads', count: 1418, pct: 100, color: CHART_COLORS[0] },
  { stage: 'Qualified', count: 892, pct: 63, color: CHART_COLORS[1] },
  { stage: 'Proposal Sent', count: 534, pct: 38, color: CHART_COLORS[2] },
  { stage: 'Negotiation', count: 298, pct: 21, color: CHART_COLORS[3] },
  { stage: 'Closed Won', count: 391, pct: 28, color: CHART_COLORS[4] },
];

const productData = [
  { product: 'Enterprise Suite', revenue: 3850, units: 42, growth: 18.5, margin: 72 },
  { product: 'Professional Plan', revenue: 2640, units: 138, growth: 12.3, margin: 68 },
  { product: 'Starter Pack', revenue: 980, units: 312, growth: 5.8, margin: 55 },
  { product: 'Add-on Modules', revenue: 1240, units: 215, growth: 22.1, margin: 81 },
  { product: 'Training & Support', revenue: 760, units: 89, growth: 8.9, margin: 78 },
  { product: 'Custom Dev', revenue: 1850, units: 18, growth: 30.2, margin: 45 },
];

const radarData = [
  { metric: 'Revenue', Ahmad: 85, Budi: 95, Citra: 70, Diana: 105, Eko: 62 },
  { metric: 'Deals', Ahmad: 78, Budi: 82, Citra: 65, Diana: 90, Eko: 58 },
  { metric: 'Leads', Ahmad: 88, Budi: 75, Citra: 80, Diana: 92, Eko: 70 },
  { metric: 'Quota', Ahmad: 109, Budi: 111, Citra: 97, Diana: 117, Eko: 91 },
  { metric: 'Retention', Ahmad: 92, Budi: 88, Citra: 85, Diana: 95, Eko: 78 },
];

const regionData = [
  { region: 'Jakarta', revenue: 1850, deals: 185, growth: 15.2 },
  { region: 'Surabaya', revenue: 1240, deals: 124, growth: 12.8 },
  { region: 'Bandung', revenue: 820, deals: 82, growth: 8.5 },
  { region: 'Medan', revenue: 680, deals: 68, growth: 10.1 },
  { region: 'Bali', revenue: 590, deals: 59, growth: 18.9 },
  { region: 'Makassar', revenue: 420, deals: 42, growth: 22.3 },
];

const forecastData = [
  { month: 'Okt', actual: 1320, forecast: null, lower: null, upper: null },
  { month: 'Nov', actual: 1280, forecast: null, lower: null, upper: null },
  { month: 'Des', actual: 1450, forecast: null, lower: null, upper: null },
  { month: 'Jan', actual: null, forecast: 1540, lower: 1420, upper: 1660 },
  { month: 'Feb', actual: null, forecast: 1620, lower: 1470, upper: 1770 },
  { month: 'Mar', actual: null, forecast: 1700, lower: 1520, upper: 1880 },
];

const activityTimeline = [
  { day: 'Sen', calls: 48, emails: 120, meetings: 18, demos: 8 },
  { day: 'Sel', calls: 55, emails: 138, meetings: 22, demos: 10 },
  { day: 'Rab', calls: 62, emails: 145, meetings: 25, demos: 12 },
  { day: 'Kam', calls: 58, emails: 132, meetings: 20, demos: 9 },
  { day: 'Jum', calls: 45, emails: 110, meetings: 16, demos: 7 },
  { day: 'Sab', calls: 20, emails: 55, meetings: 8, demos: 3 },
  { day: 'Min', calls: 10, emails: 28, meetings: 4, demos: 1 },
];

// ─── Helpers ──────────────────────────────────────────────────────
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}M` : `${n}jt`;
const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

// ─── Sub Components ───────────────────────────────────────────────
const KPICard = ({
  title, value, sub, delta, icon: Icon, color, prefix = '', suffix = ''
}: {
  title: string; value: string | number; sub?: string; delta?: number;
  icon: React.ElementType; color: string; prefix?: string; suffix?: string;
}) => (
  <Card className="hover:shadow-md transition-shadow duration-200 border border-gray-100">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1.5">{prefix}{value}{suffix}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          {delta !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {delta >= 0
                ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
              <span className={`text-xs font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {fmtPct(delta)}
              </span>
              <span className="text-xs text-gray-400">vs periode lalu</span>
            </div>
          )}
        </div>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3`}
          style={{ backgroundColor: `${color}18` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-4">
    <h3 className="font-bold text-gray-800">{title}</h3>
    {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-xs">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex gap-2">
          <span>{p.name}:</span><span className="font-semibold">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────
export function AdvancedAnalytics() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  const totalRevenue = monthlyData.reduce((a, c) => a + c.revenue, 0);
  const totalDeals = monthlyData.reduce((a, c) => a + c.deals, 0);
  const totalLeads = monthlyData.reduce((a, c) => a + c.leads, 0);
  const avgConversion = (monthlyData.reduce((a, c) => a + c.conversion, 0) / monthlyData.length).toFixed(1);

  const lastMonth = monthlyData[monthlyData.length - 1];
  const prevMonth = monthlyData[monthlyData.length - 2];
  const revGrowth = ((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100;
  const dealsGrowth = ((lastMonth.deals - prevMonth.deals) / prevMonth.deals) * 100;
  const leadsGrowth = ((lastMonth.leads - prevMonth.leads) / prevMonth.leads) * 100;

  const quotaAttainment = useMemo(() => {
    return teamPerformance.map(m => ({
      ...m,
      attainment: Math.round((m.revenue / m.quota) * 100),
    }));
  }, []);

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37] flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND }}>
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            Analytics
          </h1>
          <p className="text-xs text-gray-500 mt-1">Dashboard analitik performa penjualan enterprise</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
            {(['week', 'month', 'quarter', 'year'] as const).map((r) => (
              <button key={r} onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${timeRange === r
                  ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                style={timeRange === r ? { backgroundColor: BRAND } : {}}>
                {r === 'week' ? 'Minggu' : r === 'month' ? 'Bulan' : r === 'quarter' ? 'Kuartal' : 'Tahun'}
              </button>
            ))}
          </div>
          {/* Region Filter */}
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#013E37]/20">
            <option value="all">Semua Region</option>
            <option value="jakarta">Jakarta</option>
            <option value="surabaya">Surabaya</option>
            <option value="bandung">Bandung</option>
            <option value="medan">Medan</option>
          </select>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg bg-white shadow-sm text-gray-700 hover:bg-gray-50">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg bg-white shadow-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" value={`Rp ${fmt(totalRevenue)}`} sub="Tahun berjalan"
          delta={revGrowth} icon={DollarSign} color="#013E37" />
        <KPICard title="Total Deals Won" value={totalDeals} sub={`${lastMonth.deals} bulan ini`}
          delta={dealsGrowth} icon={Award} color="#3B82F6" />
        <KPICard title="Total Leads" value={totalLeads.toLocaleString()} sub={`${lastMonth.leads} bulan ini`}
          delta={leadsGrowth} icon={Users} color="#8B5CF6" />
        <KPICard title="Avg Conversion" value={`${avgConversion}%`} sub="Lead → Deal"
          delta={1.8} icon={Target} color="#F59E0B" />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full h-auto p-1 bg-gray-100 rounded-xl border border-gray-200 grid grid-cols-3 lg:grid-cols-6 gap-0.5">
          {[
            { value: 'overview', label: 'Overview', icon: Eye },
            { value: 'revenue', label: 'Revenue', icon: DollarSign },
            { value: 'performance', label: 'Performance', icon: Award },
            { value: 'pipeline', label: 'Pipeline', icon: Layers },
            { value: 'leads', label: 'Leads', icon: Activity },
            { value: 'products', label: 'Produk', icon: ShoppingBag },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}
              className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-2 flex items-center gap-1.5 transition-all text-xs font-semibold">
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-5 space-y-5">
          {/* Row 1: Revenue + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Area Chart */}
            <Card className="lg:col-span-2 border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Revenue vs Target — 12 Bulan</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BRAND} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradTarget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="revenue" stroke={BRAND} strokeWidth={2}
                      fill="url(#gradRevenue)" name="Revenue (jt)" />
                    <Area type="monotone" dataKey="target" stroke={COLORS[2]} strokeWidth={2}
                      fill="url(#gradTarget)" name="Target (jt)" strokeDasharray="5 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Leads by Source Pie */}
            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Sumber Leads</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={leadSources} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={3}>
                      {leadSources.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2 px-2">
                  {leadSources.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-gray-600">{s.name}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{s.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Top Reps + Region Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Sales Reps */}
            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Top Sales Representatives</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="space-y-3">
                  {teamPerformance
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((rep, i) => (
                      <div key={rep.name} className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#CD7C2F' : BRAND }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-gray-800">{rep.name}</span>
                            <span className="text-xs text-gray-500">Rp {rep.revenue}jt</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all duration-700"
                              style={{ width: `${(rep.revenue / 1050) * 100}%`, backgroundColor: BRAND }} />
                          </div>
                        </div>
                        <div className={`text-xs font-bold px-1.5 py-0.5 rounded ${(rep.revenue / rep.quota) >= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {Math.round((rep.revenue / rep.quota) * 100)}%
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Regional Performance */}
            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Performa per Wilayah</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={regionData} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="region" type="category" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" fill={BRAND} radius={[0, 4, 4, 0]} name="Revenue (jt)">
                      {regionData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Activity */}
          <Card className="border border-gray-100">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-bold text-gray-800">Aktivitas Mingguan Tim Sales</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={activityTimeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="calls" fill={COLORS[2]} name="Calls" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="emails" fill={COLORS[5]} name="Emails" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="meetings" fill={BRAND} name="Meetings" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="demos" stroke={COLORS[3]} strokeWidth={2} dot={{ fill: COLORS[3], r: 4 }} name="Demos" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── REVENUE ──────────────────────────────────────────── */}
        <TabsContent value="revenue" className="mt-5 space-y-5">
          {/* Revenue KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Revenue Bulan Ini" value="Rp 1.45M" delta={13.3} icon={DollarSign} color={BRAND} />
            <KPICard title="Rata-rata Deal Size" value="Rp 21.3jt" delta={5.8} icon={BarChart2} color="#3B82F6" />
            <KPICard title="Revenue Forecast Q1" value="Rp 4.86M" delta={20.1} icon={TrendingUp} color="#10B981" />
            <KPICard title="Gross Profit Margin" value="68.5%" delta={2.4} icon={Zap} color="#F59E0B" />
          </div>

          {/* Revenue vs Target quarterly */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Revenue vs Target per Kuartal</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={quarterlyData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" fill={BRAND} radius={[4, 4, 0, 0]} name="Revenue (jt)" />
                    <Bar dataKey="target" fill="var(--border)" radius={[4, 4, 0, 0]} name="Target (jt)" />
                    <Line type="monotone" dataKey="growth" stroke={COLORS[3]} strokeWidth={2}
                      yAxisId={undefined} name="Growth %" dot={{ r: 5, fill: COLORS[3] }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Forecast */}
            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Revenue Forecast 3 Bulan ke Depan</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={forecastData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[1200, 2000]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="actual" stroke={BRAND} strokeWidth={2.5}
                      dot={{ fill: BRAND, r: 4 }} name="Aktual (jt)" connectNulls />
                    <Area type="monotone" dataKey="upper" fill="url(#gradForecast)"
                      stroke="transparent" name="Upper Bound" />
                    <Line type="monotone" dataKey="forecast" stroke={COLORS[2]} strokeWidth={2.5}
                      strokeDasharray="6 3" dot={{ fill: COLORS[2], r: 4 }} name="Forecast (jt)" connectNulls />
                    <Line type="monotone" dataKey="lower" stroke="var(--muted-foreground)" strokeWidth={1}
                      strokeDasharray="3 3" dot={false} name="Lower Bound" connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-700 font-semibold">AI Insight: Proyeksi Q1 2025 meningkat 20% berdasarkan tren historis dan pipeline aktif saat ini.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown Table */}
          <Card className="border border-gray-100">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-bold text-gray-800">Breakdown Revenue Bulanan</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {['Bulan', 'Revenue (jt)', 'Target (jt)', 'Achievement', 'Deals', 'Leads', 'Conv.', 'Expenses (jt)'].map(h => (
                        <th key={h} className="text-left py-2.5 px-2 text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {monthlyData.map((row, i) => {
                      const ach = Math.round((row.revenue / row.target) * 100);
                      return (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 px-2 font-semibold text-gray-800">{row.month}</td>
                          <td className="py-2.5 px-2 text-gray-700">Rp {row.revenue.toLocaleString()}</td>
                          <td className="py-2.5 px-2 text-gray-500">Rp {row.target.toLocaleString()}</td>
                          <td className="py-2.5 px-2">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${ach >= 100 ? 'bg-emerald-100 text-emerald-700' : ach >= 90 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                              {ach}%
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-gray-700">{row.deals}</td>
                          <td className="py-2.5 px-2 text-gray-700">{row.leads}</td>
                          <td className="py-2.5 px-2 text-gray-700">{row.conversion}%</td>
                          <td className="py-2.5 px-2 text-gray-500">Rp {row.expenses}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td className="py-2.5 px-2 font-bold text-gray-900">Total</td>
                      <td className="py-2.5 px-2 font-bold text-[#013E37]">Rp {monthlyData.reduce((a,c)=>a+c.revenue,0).toLocaleString()}</td>
                      <td className="py-2.5 px-2 font-bold text-gray-600">Rp {monthlyData.reduce((a,c)=>a+c.target,0).toLocaleString()}</td>
                      <td className="py-2.5 px-2 font-bold text-emerald-700">
                        {Math.round((monthlyData.reduce((a,c)=>a+c.revenue,0)/monthlyData.reduce((a,c)=>a+c.target,0))*100)}%
                      </td>
                      <td className="py-2.5 px-2 font-bold text-gray-700">{totalDeals}</td>
                      <td className="py-2.5 px-2 font-bold text-gray-700">{totalLeads}</td>
                      <td className="py-2.5 px-2 font-bold text-gray-700">{avgConversion}%</td>
                      <td className="py-2.5 px-2 font-bold text-gray-500">Rp {monthlyData.reduce((a,c)=>a+c.expenses,0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PERFORMANCE ──────────────────────────────────────── */}
        <TabsContent value="performance" className="mt-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Top Performer" value="Diana M." sub="Rp 1.05M revenue" icon={Award} color="#F59E0B" />
            <KPICard title="Avg Quota Attain." value="103%" delta={5.2} icon={Target} color={BRAND} />
            <KPICard title="Win Rate Tim" value="72.4%" delta={3.8} icon={TrendingUp} color="#10B981" />
            <KPICard title="Avg Deal Cycle" value="28 Hari" delta={-8.5} icon={Calendar} color="#3B82F6" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stacked Bar: Deals by Rep */}
            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Deal Status per Sales Rep</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={teamPerformance} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="closed" stackId="a" fill={CHART_STATUS.good} name="Closed Won" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="inProgress" stackId="a" fill={CHART_STATUS.warning} name="In Progress" />
                    <Bar dataKey="lost" stackId="a" fill={CHART_STATUS.critical} name="Lost" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar Chart: Skills Comparison */}
            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Perbandingan Performa Tim (Radar)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={CHART_GRID} />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 120]} tick={{ fontSize: 9 }} />
                    <Radar name="Ahmad" dataKey="Ahmad" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.15} />
                    <Radar name="Diana" dataKey="Diana" stroke={COLORS[3]} fill={COLORS[3]} fillOpacity={0.15} />
                    <Radar name="Budi" dataKey="Budi" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.15} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Quota Attainment Table */}
          <Card className="border border-gray-100">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-bold text-gray-800">Quota Attainment Detail</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="space-y-3">
                {quotaAttainment.sort((a, b) => b.attainment - a.attainment).map((rep, i) => (
                  <div key={rep.name} className="flex items-center gap-4">
                    <div className="w-24 text-xs font-semibold text-gray-700 truncate">{rep.name}</div>
                    <div className="text-xs text-gray-400 w-16">{rep.region}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Rp {rep.revenue}jt / {rep.quota}jt</span>
                        <span className={`font-bold ${rep.attainment >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {rep.attainment}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(rep.attainment, 100)}%`,
                            backgroundColor: rep.attainment >= 100 ? '#10B981' : rep.attainment >= 85 ? '#F59E0B' : '#EF4444'
                          }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {rep.attainment >= 100
                        ? <ChevronUp className="h-4 w-4 text-emerald-500" />
                        : <ChevronDown className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PIPELINE ─────────────────────────────────────────── */}
        <TabsContent value="pipeline" className="mt-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Pipeline Value" value="Rp 8.4M" delta={18.5} icon={Layers} color={BRAND} />
            <KPICard title="Avg Deal Size" value="Rp 21.3jt" delta={5.8} icon={DollarSign} color="#3B82F6" />
            <KPICard title="Deals in Pipeline" value="298" delta={12.1} icon={Target} color="#8B5CF6" />
            <KPICard title="Avg Sales Cycle" value="28 hr" delta={-8.5} icon={Calendar} color="#10B981" />
          </div>

          {/* Funnel + Pipeline Velocity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Sales Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="space-y-3 mt-2">
                  {conversionFunnel.map((stage, i) => (
                    <div key={stage.stage}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                          <span className="font-semibold text-gray-700">{stage.stage}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{stage.count.toLocaleString()} deals</span>
                          <span className="font-bold text-gray-800" style={{ color: stage.color }}>{stage.pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-7 overflow-hidden">
                        <div className="h-full rounded-full flex items-center px-3 transition-all duration-700"
                          style={{ width: `${stage.pct}%`, backgroundColor: stage.color }}>
                          <span className="text-white font-bold text-xs">{stage.count}</span>
                        </div>
                      </div>
                      {i < conversionFunnel.length - 1 && (
                        <div className="flex justify-end text-xs text-red-400 font-medium mt-1">
                          -{(100 - (conversionFunnel[i + 1].pct / stage.pct * 100)).toFixed(0)}% drop
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Pipeline by Stage (Bar)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={conversionFunnel} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="stage" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Jumlah Deals" radius={[4, 4, 0, 0]}>
                      {conversionFunnel.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Health Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: 'Hot Deals (>75%)', count: 47, value: 'Rp 2.1M', color: '#EF4444', icon: Zap },
              { label: 'Warm Deals (50-75%)', count: 89, value: 'Rp 3.8M', color: '#F59E0B', icon: Activity },
              { label: 'Cold Deals (<50%)', count: 162, value: 'Rp 2.5M', color: '#3B82F6', icon: Globe },
            ].map((item, i) => (
              <Card key={i} className="border border-gray-100 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                      <item.icon className="h-4.5 w-4.5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                      <p className="text-xl font-bold text-gray-900">{item.count} <span className="text-xs text-gray-500 font-normal">deals</span></p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500">Total Pipeline Value</p>
                    <p className="font-bold text-gray-800 mt-0.5" style={{ color: item.color }}>{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── LEADS ────────────────────────────────────────────── */}
        <TabsContent value="leads" className="mt-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Total Leads YTD" value={totalLeads.toLocaleString()} delta={leadsGrowth} icon={Users} color={BRAND} />
            <KPICard title="Leads Bulan Ini" value="265" delta={14.2} icon={Activity} color="#3B82F6" />
            <KPICard title="Lead Quality Score" value="7.8/10" delta={0.5} icon={Zap} color="#F59E0B" />
            <KPICard title="Cost Per Lead" value="Rp 485rb" delta={-8.2} icon={DollarSign} color="#10B981" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Lead Sources Donut */}
            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Distribusi Sumber Leads</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <div className="flex gap-4">
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie data={leadSources} dataKey="value" innerRadius={55} outerRadius={90} paddingAngle={3}>
                        {leadSources.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2 flex flex-col justify-center">
                    {leadSources.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-xs text-gray-600">{s.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-800">{s.leads}</p>
                          <p className="text-xs text-gray-400">{s.value}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lead Trend */}
            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Tren Leads & Konversi Bulanan</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={monthlyData} margin={{ top: 5, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[20, 30]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="leads" fill={COLORS[2]} radius={[3, 3, 0, 0]} name="Leads" opacity={0.8} />
                    <Line yAxisId="right" type="monotone" dataKey="conversion" stroke={COLORS[3]}
                      strokeWidth={2} dot={{ r: 3 }} name="Conv. %" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Lead Source Performance Table */}
          <Card className="border border-gray-100">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-bold text-gray-800">Performa per Sumber Lead</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Sumber', 'Total Leads', 'Share', 'Qualified', 'Closed', 'Conv. Rate', 'Avg Deal (jt)', 'Revenue (jt)'].map(h => (
                      <th key={h} className="text-left py-2.5 px-2 text-gray-500 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { src: 'Website', leads: 482, qual: 321, closed: 96, conv: '20%', deal: 22.4, rev: 2150 },
                    { src: 'Referral', leads: 368, qual: 294, closed: 102, conv: '28%', deal: 31.2, rev: 3182 },
                    { src: 'Social Media', leads: 270, qual: 162, closed: 38, conv: '14%', deal: 15.8, rev: 600 },
                    { src: 'Email Campaign', leads: 184, qual: 101, closed: 28, conv: '15%', deal: 18.5, rev: 518 },
                    { src: 'Cold Outreach', leads: 71, qual: 35, closed: 8, conv: '11%', deal: 28.0, rev: 224 },
                    { src: 'Lainnya', leads: 43, qual: 21, closed: 5, conv: '12%', deal: 12.0, rev: 60 },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2.5 px-2 font-semibold text-gray-800">{row.src}</td>
                      <td className="py-2.5 px-2 text-gray-700">{row.leads}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${(row.leads / 1418) * 100}%`, backgroundColor: COLORS[i] }} />
                          </div>
                          <span className="text-gray-500">{((row.leads / 1418) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-gray-700">{row.qual}</td>
                      <td className="py-2.5 px-2 text-gray-700">{row.closed}</td>
                      <td className="py-2.5 px-2 font-semibold" style={{ color: BRAND }}>{row.conv}</td>
                      <td className="py-2.5 px-2 text-gray-700">{row.deal}</td>
                      <td className="py-2.5 px-2 font-bold text-gray-800">{row.rev.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PRODUCTS ─────────────────────────────────────────── */}
        <TabsContent value="products" className="mt-5 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Best Seller" value="Referral" sub="Rp 3.18M revenue" icon={Award} color="#F59E0B" />
            <KPICard title="Avg Margin" value="66.5%" delta={3.2} icon={Zap} color={BRAND} />
            <KPICard title="Total SKU Terjual" value="814" delta={18.5} icon={ShoppingBag} color="#3B82F6" />
            <KPICard title="Fastest Growing" value="Custom Dev" sub="+30.2% growth" icon={TrendingUp} color="#10B981" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Revenue per Produk</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={productData} layout="vertical" margin={{ top: 0, right: 50, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="product" type="category" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="Revenue (jt)" radius={[0, 4, 4, 0]}>
                      {productData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border border-gray-100">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold text-gray-800">Growth vs Margin per Produk</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={250}>
                  <ScatterChart margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis dataKey="growth" name="Growth %" tick={{ fontSize: 10 }} label={{ value: 'Growth %', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                    <YAxis dataKey="margin" name="Margin %" tick={{ fontSize: 10 }} label={{ value: 'Margin %', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                    <ZAxis dataKey="revenue" range={[60, 400]} name="Revenue" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-xs">
                            <p className="font-bold text-gray-800 mb-1">{d?.product}</p>
                            <p className="text-gray-600">Growth: <strong>{d?.growth}%</strong></p>
                            <p className="text-gray-600">Margin: <strong>{d?.margin}%</strong></p>
                            <p className="text-gray-600">Revenue: <strong>Rp {d?.revenue}jt</strong></p>
                          </div>
                        );
                      }} />
                    <Scatter data={productData} fill={BRAND}>
                      {productData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Product Detail Table */}
          <Card className="border border-gray-100">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-bold text-gray-800">Detail Performa Produk</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Produk', 'Revenue (jt)', 'Units', 'Growth', 'Margin', 'Status'].map(h => (
                      <th key={h} className="text-left py-2.5 px-2 text-gray-500 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {productData.sort((a, b) => b.revenue - a.revenue).map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2.5 px-2 font-semibold text-gray-800">{p.product}</td>
                      <td className="py-2.5 px-2 text-gray-700">Rp {p.revenue.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-gray-700">{p.units}</td>
                      <td className="py-2.5 px-2">
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <ArrowUpRight className="h-3.5 w-3.5" />+{p.growth}%
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${p.margin}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                          <span className="font-semibold text-gray-700">{p.margin}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${p.growth >= 20 ? 'bg-emerald-100 text-emerald-700' : p.growth >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {p.growth >= 20 ? 'Hot' : p.growth >= 10 ? 'Growing' : 'Stable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
