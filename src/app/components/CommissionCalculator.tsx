import React, { useState, useEffect } from 'react';
import { Search, DollarSign, TrendingUp, Award, Calendar, User, Download, Calculator, Eye, CheckCircle, Target, Clock, ChevronRight, BarChart3, PieChart as PieChartIcon, ArrowUpRight, Percent, Zap, Wallet } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { StatCard, type StatCardData } from '@/app/components/ui/stat-card';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { CHART_PRIMARY, CHART_COLORS, CHART_GRID, CHART_TOOLTIP_STYLE, AREA_GRADIENT_STOPS, chartColor } from '@/styles/chartTheme';
import { salesRepsRepository } from '@/services/salesRepsRepository';
import { commissionsRepository } from '@/services/commissionsRepository';
import { performanceTargetsRepository } from '@/services/performanceTargetsRepository';
import { computeAchievementPct } from '@/types/performanceTarget';
import type { PerformanceTarget } from '@/types/performanceTarget';
import type { SalesRep } from '@/types/salesRep';
import type { CommissionRecord as CommissionRecordEntity, CommissionStatus } from '@/types/commission';
import { ExportButton } from '@/app/components/ExportButton';

// Data source: salesRepsRepository (identity) + performanceTargetsRepository
// (target/actual per rep per period, shared with Territory Management and
// the unified Product model) + commissionsRepository (payout bookkeeping
// only — status/baseCommission/bonuses/deals/paymentDate). Replaces the
// previous hardcoded `useState<CommissionRecord[]>([...])`, which never
// persisted anything and stored `achievementRate` as an independent number
// that could drift from totalSales/target. achievementRate is now always
// computeAchievementPct(target, actual) from performanceTargetsRepository —
// never a separately stored figure.

interface CommissionRecordView {
  id: string;
  salesPerson: string;
  period: string;
  totalSales: number;
  baseCommission: number;
  bonuses: number;
  totalCommission: number;
  status: CommissionStatus;
  deals: number;
  achievementRate: number;
  paymentDate?: string;
}

interface CommissionTier {
  id: string;
  minAmount: number;
  maxAmount: number;
  rate: number;
}

interface Bonus {
  id: string;
  name: string;
  type: 'flat' | 'percentage';
  value: number;
  condition: string;
  icon: React.ElementType;
}

// Maps the dropdown value to the ISO date performance_targets/commissions
// store, and to the display label.
//
// Bab 34 fix (24 Sep 2026, review grup menu "Tim Penjualan"): this used to
// be hardcoded to exactly Feb 2024/Jan 2024/Dec 2023 -- the 3 months the
// original sample data happened to use -- so the period actually running
// right now (and any month since) could never be selected here at all,
// no matter how many real commission records existed for it. Now built
// from the current date (MONTHS_BACK rolling months, most recent first)
// with those 3 legacy sample months appended after, deduplicated, so old
// demo data stays reachable too.
const MONTHS_BACK = 12;
const MONTH_LABELS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function buildPeriodOptions(): { value: string; iso: string; label: string }[] {
  const now = new Date();
  const rolling: { value: string; iso: string; label: string }[] = [];
  for (let i = 0; i < MONTHS_BACK; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    rolling.push({
      value: `${mm}-${yyyy}`,
      iso: `${yyyy}-${mm}-01`,
      label: `${MONTH_LABELS_ID[d.getMonth()]} ${yyyy}`,
    });
  }
  const legacy = [
    { value: 'feb-2024', iso: '2024-02-01', label: 'Feb 2024' },
    { value: 'jan-2024', iso: '2024-01-01', label: 'Jan 2024' },
    { value: 'dec-2023', iso: '2023-12-01', label: 'Dec 2023' },
  ];
  const seenIso = new Set(rolling.map((p) => p.iso));
  return [...rolling, ...legacy.filter((p) => !seenIso.has(p.iso))];
}

const PERIOD_OPTIONS = buildPeriodOptions();

// Bab 39 (24 Sep 2026): SEED_REPS/SEED_COMMISSIONS (dan auto-seed yang
// memakainya di loadData di bawah) dipindah ke
// src/utils/loadAllDummyData.ts, dipanggil dari satu tombol "Load Dummy
// Data" gabungan di Home.tsx. Layar ini sekarang murni membaca.

export function CommissionCalculator() {
  const [activeTab, setActiveTab] = useState('commissions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]?.value ?? 'feb-2024');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CommissionRecordView | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulation states
  const [simAmount, setSimAmount] = useState<string>('500000000');
  const [simResults, setSimResults] = useState<{base: number, tier: number} | null>(null);

  // Commission Tiers — rate config, not a target/actual duplication, kept as-is.
  const [tiers] = useState<CommissionTier[]>([
    { id: '1', minAmount: 0, maxAmount: 100000000, rate: 2.5 },
    { id: '2', minAmount: 100000000, maxAmount: 250000000, rate: 3.5 },
    { id: '3', minAmount: 250000000, maxAmount: 500000000, rate: 5.0 },
    { id: '4', minAmount: 500000000, maxAmount: 999999999999, rate: 7.0 },
  ]);

  // Bonuses — rate config, kept as-is.
  const [bonuses] = useState<Bonus[]>([
    { id: '1', name: 'New Client Bonus', type: 'flat', value: 5000000, condition: 'Per perolehan klien baru', icon: User },
    { id: '2', name: 'Target Achievement', type: 'percentage', value: 10, condition: 'Mencapai 100%+ target bulanan', icon: Target },
    { id: '3', name: 'Mega Deal Bonus', type: 'flat', value: 10000000, condition: 'Kesepakatan > Rp 500 Juta', icon: Zap },
    { id: '4', name: 'Quarterly MVP', type: 'percentage', value: 15, condition: 'Performa terbaik dalam satu kuartal', icon: Award },
  ]);

  const [commissions, setCommissions] = useState<CommissionRecordView[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const repsResult = await salesRepsRepository.getAll();
      const reps = repsResult.data || [];
      const repByName: Record<string, SalesRep> = {};
      reps.forEach((r) => { repByName[r.name] = r; });

      const commissionsResult = await commissionsRepository.getAll();
      const commissionRows = commissionsResult.data || [];

      const targetsResult = await performanceTargetsRepository.getAll();
      const targets: PerformanceTarget[] = targetsResult.data || [];

      const merged: CommissionRecordView[] = commissionRows.map((c) => {
        const rep = reps.find((r) => r.id === c.salesRepId);
        const pt = targets.find((t) => (t as any).salesRepId === c.salesRepId && t.period === c.period);
        const target = pt?.target ?? 0;
        const actual = pt?.actual ?? 0;
        const periodOpt = PERIOD_OPTIONS.find((p) => p.iso === c.period);
        return {
          id: c.id,
          salesPerson: rep?.name || 'Unknown',
          period: periodOpt?.label || c.period,
          totalSales: actual,
          baseCommission: c.baseCommission,
          bonuses: c.bonuses,
          totalCommission: c.totalCommission,
          status: c.status,
          deals: c.deals,
          achievementRate: computeAchievementPct({ target, actual }) ?? 0,
          paymentDate: c.paymentDate,
        };
      });

      setCommissions(merged);
    } catch (error: any) {
      console.error('Error loading commissions:', error);
      toast.error(`Gagal memuat data komisi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Bab 34 fix (24 Sep 2026): this used to filter `commissions` (every
  // period, unscoped) instead of `currentPeriodCommissions` (the period
  // the user has selected on screen) -- clicking "Approve All Pending"
  // while viewing Feb 2024 could silently approve pending Jan 2024 or Dec
  // 2023 records too. It also never checked each update's own
  // result.success before declaring success, so a handful of failed
  // updates (network blip, a 403, whatever) would still show "N komisi
  // berhasil disetujui" for the full original count.
  const handleApproveAll = async () => {
    const pending = currentPeriodCommissions.filter(c => c.status === 'pending');
    if (pending.length === 0) {
      toast.info('Tidak ada komisi dengan status pending pada periode ini');
      return;
    }

    let succeeded = 0;
    let failed = 0;
    for (const record of pending) {
      const result = await commissionsRepository.update(record.id, { status: 'approved' });
      if (result.success) succeeded += 1;
      else failed += 1;
    }
    if (succeeded > 0) toast.success(`${succeeded} komisi berhasil disetujui`);
    if (failed > 0) toast.error(`${failed} komisi gagal disetujui, coba lagi`);
    await loadData();
  };

  // Bab 34 fix (24 Sep 2026): "Konfirmasi Pembayaran" used to only be
  // disabled when the record was ALREADY paid, so a still-PENDING record
  // (never approved by anyone) could be marked paid directly -- skipping
  // the APPROVED step entirely, with zero backend validation either (see
  // handleCommissions' PUT in api/handler.ts, also fixed this round).
  const handleConfirmPayment = async () => {
    if (!selectedRecord) return;
    if (selectedRecord.status !== 'approved') {
      toast.error('Komisi ini harus disetujui (approved) terlebih dahulu sebelum bisa dibayarkan');
      return;
    }
    const result = await commissionsRepository.update(selectedRecord.id, {
      status: 'paid',
      paymentDate: new Date().toISOString().slice(0, 10),
    });
    if (result.success) {
      toast.success(`Pembayaran untuk ${selectedRecord.salesPerson} berhasil dikonfirmasi`);
      setShowDetailDialog(false);
      await loadData();
    } else {
      toast.error(result.error || 'Gagal mengonfirmasi pembayaran');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37]"></div>
      </div>
    );
  }

  // Bab 34 fix (24 Sep 2026): matched by fragile string-contains
  // (`selectedPeriod.replace('-', ' ')` against the display label) which
  // broke once PERIOD_OPTIONS' value format changed above -- matches by
  // the option's own label now, the same label loadData() already stamps
  // onto each record's `period` field.
  const selectedPeriodOption = PERIOD_OPTIONS.find((p) => p.value === selectedPeriod);
  const currentPeriodCommissions = commissions.filter(c => c.period === (selectedPeriodOption?.label ?? ''));

  // Bab 34 fix (24 Sep 2026): searchQuery was set on every keystroke but
  // never actually read by any filter -- LIVE-VERIFIED by typing a
  // non-matching string into "Cari tenaga sales..." on production and
  // seeing all records stay visible regardless.
  const visibleCommissions = currentPeriodCommissions.filter((c) =>
    searchQuery.trim() === '' || c.salesPerson.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  
  // Define chart data variables
  const commissionByPersonData = currentPeriodCommissions.map(c => ({
    name: c.salesPerson.split(' ')[0],
    base: c.baseCommission,
    bonus: c.bonuses,
    total: c.totalCommission
  }));

  const statusDistributionData = [
    { name: 'Pending', value: currentPeriodCommissions.filter(c => c.status === 'pending').length },
    { name: 'Approved', value: currentPeriodCommissions.filter(c => c.status === 'approved').length },
    { name: 'Paid', value: commissions.filter(c => c.status === 'paid').length },
  ];

  const stats = {
    totalCommission: currentPeriodCommissions.reduce((sum, c) => sum + c.totalCommission, 0),
    pending: currentPeriodCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.totalCommission, 0),
    approved: currentPeriodCommissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.totalCommission, 0),
    paid: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.totalCommission, 0),
    avgRate: currentPeriodCommissions.length > 0 ? currentPeriodCommissions.reduce((sum, c) => sum + c.achievementRate, 0) / currentPeriodCommissions.length : 0
  };

  const calculateSim = () => {
    const amount = parseFloat(simAmount);
    if (isNaN(amount)) return;
    
    let total = 0;
    let rate = 0;
    for (const tier of tiers) {
      if (amount >= tier.minAmount) {
        const applicable = Math.min(amount, tier.maxAmount) - tier.minAmount;
        total += (applicable * tier.rate) / 100;
        rate = tier.rate;
        if (amount <= tier.maxAmount) break;
      }
    }
    setSimResults({ base: total, tier: rate });
    toast.success('Simulasi kalkulasi selesai');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Awaiting Approval</Badge>;
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Ready to Pay</Badge>;
      case 'paid': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Paid</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">
            Commission Control
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Multi-tiered Incentives & Payout Management
          </p>
        </div>
        <div className="flex gap-3">
          <ExportButton
            data={currentPeriodCommissions}
            filename={`Payroll_Komisi_${selectedPeriodOption?.value ?? selectedPeriod}`}
            title={`Payroll Komisi - ${selectedPeriodOption?.label ?? selectedPeriod}`}
            disabled={currentPeriodCommissions.length === 0}
          />
          <Button 
            className="bg-[#013E37] hover:bg-[#025C52] text-white shadow-lg shadow-emerald-900/20 gap-2"
            onClick={handleApproveAll}
          >
            <ArrowUpRight className="h-4 w-4" /> Approve All Pending
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { label: 'Total Payout', value: formatCurrency(stats.totalCommission), icon: Wallet, color: 'text-[#013E37]', bg: 'bg-emerald-50' },
          { label: 'Pending Approval', value: formatCurrency(stats.pending), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved Ready', value: formatCurrency(stats.approved), icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Avg Achievement', value: `${stats.avgRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-[#013E37]', bg: 'bg-[#EEF7F5]' },
        ] as StatCardData[]).map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="commissions" className="w-full space-y-6" onValueChange={setActiveTab}>
        <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-2 lg:grid-cols-5 gap-1">
          {[
            { id: 'commissions', title: 'Commission Records', sub: 'Histori Pembayaran' },
            { id: 'calculator', title: 'Simulation Tool', sub: 'Kalkulator Insentif' },
            { id: 'tiers', title: 'Structure & Tiers', sub: 'Skema Persentase' },
            { id: 'bonuses', title: 'Performance Bonus', sub: 'Tambahan Bonus' },
            { id: 'analytics', title: 'Payout Analytics', sub: 'Analisis Distribusi' },
          ].map((tab) => (
            <TabsTrigger 
              key={tab.id}
              value={tab.id} 
              className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-2.5 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[72px]"
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className="font-bold text-[10px] sm:text-[11px] uppercase tracking-tight leading-[1.1] mb-1">
                  {tab.title}
                </div>
                <div className="text-[9px] text-gray-400 font-medium uppercase tracking-widest leading-none opacity-80">
                  {tab.sub}
                </div>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Commissions List */}
        <TabsContent value="commissions" className="space-y-4 outline-none">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Cari tenaga sales..." 
                className="pl-10 h-11 border-gray-200 focus:ring-[#013E37]" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full md:w-[200px] h-11 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-none shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sales Person</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Performance</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Base Comm.</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Bonuses</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Total Payout</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibleCommissions.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => { setSelectedRecord(record); setShowDetailDialog(true); }}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#013E37] to-[#02847c] flex items-center justify-center text-white font-bold text-sm">
                            {record.salesPerson.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{record.salesPerson}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{record.deals} Deals Closed</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 max-w-[120px]">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span>{record.achievementRate}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${record.achievementRate >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(record.achievementRate, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-600">{formatCurrency(record.baseCommission)}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">+{formatCurrency(record.bonuses)}</td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">{formatCurrency(record.totalCommission)}</td>
                      <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Simulation Calculator Content */}
        <TabsContent value="calculator" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl text-[#013E37]">Incentive Simulator</CardTitle>
                <CardDescription>Simulasikan estimasi komisi berdasarkan total penjualan pribadi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 pt-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="simAmount" className="text-xs font-bold uppercase tracking-widest text-gray-500">Estimasi Total Penjualan (Rp)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input 
                        id="simAmount" 
                        type="number" 
                        value={simAmount} 
                        onChange={(e) => setSimAmount(e.target.value)}
                        className="pl-10 h-14 text-xl font-bold border-gray-200 focus:ring-[#013E37]" 
                      />
                    </div>
                  </div>
                  <Button className="w-full h-12 bg-[#013E37] hover:bg-[#025C52] text-white gap-2 text-lg font-bold" onClick={calculateSim}>
                    <Calculator className="h-5 w-5" /> Hitung Estimasi
                  </Button>
                </div>

                {simResults && (
                  <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4 animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center border-b border-emerald-100 pb-4">
                      <span className="text-sm font-semibold text-emerald-800">Tier Terapan</span>
                      <Badge className="bg-[#013E37] text-white text-lg px-3 py-1">{simResults.tier}% Rate</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Estimasi Komisi Dasar</p>
                      <p className="text-4xl font-black text-[#013E37]">{formatCurrency(simResults.base)}</p>
                    </div>
                    <p className="text-[11px] text-emerald-700/70 italic">
                      *Estimasi ini belum termasuk bonus performa, pajak, dan insentif khusus lainnya.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Kalkulasi Proyeksi</h3>
              <Card className="border-none shadow-sm overflow-hidden h-[380px]">
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { sales: 0, comm: 0 },
                      { sales: 100000000, comm: 2500000 },
                      { sales: 250000000, comm: 7750000 },
                      { sales: 500000000, comm: 20250000 },
                      { sales: 1000000000, comm: 55250000 },
                    ]}>
                      <defs>
                        <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.from}/>
                          <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.to}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                      <XAxis dataKey="sales" hide />
                      <YAxis hide />
                      <Tooltip 
                        formatter={(val: number) => formatCurrency(val)} 
                        labelFormatter={(label) => `Sales: ${formatCurrency(label)}`}
                        contentStyle={CHART_TOOLTIP_STYLE}
                      />
                      <Area type="monotone" dataKey="comm" stroke={CHART_PRIMARY} strokeWidth={3} fillOpacity={1} fill="url(#colorComm)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="text-center mt-4">
                    <p className="text-xs font-medium text-gray-500 italic">Visualisasi pertumbuhan komisi eksponensial berdasarkan sistem tiering</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tiers Content */}
        <TabsContent value="tiers" className="outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier, idx) => (
              <Card key={tier.id} className="border-none shadow-sm hover:ring-2 hover:ring-[#013E37] transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Percent className="h-16 w-16" />
                </div>
                <CardContent className="p-8">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
                    <span className="text-xl font-black text-[#013E37]">{tier.rate}%</span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Tier {idx + 1}</h4>
                  <div className="space-y-1 mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sales Threshold</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {formatCurrency(tier.minAmount)} {tier.maxAmount < 999999999999 ? ` - ${formatCurrency(tier.maxAmount)}` : '+'}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Komisi dihitung secara progresif untuk setiap segmen penjualan dalam rentang ini.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Bonus Content */}
        <TabsContent value="bonuses" className="outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bonuses.map((bonus) => (
              <Card key={bonus.id} className="border-none shadow-sm group hover:shadow-md transition-all overflow-hidden">
                <CardContent className="p-0 flex flex-col sm:flex-row">
                  <div className="w-full sm:w-[120px] bg-gray-50 flex items-center justify-center p-6 border-b sm:border-b-0 sm:border-r border-gray-100 group-hover:bg-[#013E37] transition-colors">
                    <bonus.icon className="h-10 w-10 text-[#013E37] group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 p-6 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xl font-black text-gray-900">{bonus.name}</h4>
                      <Badge className="bg-emerald-100 text-[#013E37] border-none text-base px-3">
                        {bonus.type === 'flat' ? formatCurrency(bonus.value) : `+${bonus.value}%`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#013E37] font-bold">
                      <Zap className="h-4 w-4" /> Syarat: {bonus.condition}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Bonus ini akan otomatis ditambahkan ke total komisi bulanan jika kriteria performa terpenuhi pada saat penutupan periode.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Content */}
        <TabsContent value="analytics" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Payout Distribution by Sales Rep</CardTitle>
                <CardDescription>Perbandingan antara komisi dasar dan akumulasi bonus</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commissionByPersonData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                    <Tooltip 
                      formatter={(val: number) => formatCurrency(val)}
                      contentStyle={CHART_TOOLTIP_STYLE}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="base" stackId="a" fill={CHART_COLORS[0]} name="Base Commission" radius={[0, 0, 0, 0]} barSize={24} />
                    <Bar dataKey="bonus" stackId="a" fill={CHART_COLORS[1]} name="Total Bonuses" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Payout Status</CardTitle>
                <CardDescription>Distribusi status pembayaran periode berjalan</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistributionData}
                      cx="50%"
                      cy="45%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? chartColor(0) : index === 1 ? chartColor(1) : chartColor(2)} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-4 w-full mt-4">
                  {statusDistributionData.map((s, i) => (
                    <div key={i} className="text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.name}</p>
                      <p className="text-lg font-black" style={{ color: i === 0 ? chartColor(0) : i === 1 ? chartColor(1) : chartColor(2) }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl border-none shadow-2xl">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl text-[#013E37]">Rincian Insentif Payroll</DialogTitle>
            <DialogDescription>Detail kalkulasi komisi dan bonus untuk periode {selectedRecord?.period}</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-8 py-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#013E37] to-[#02847c] flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {selectedRecord.salesPerson.charAt(0)}
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <h2 className="text-2xl font-black text-gray-900">{selectedRecord.salesPerson}</h2>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    <Badge variant="outline" className="border-gray-200">{selectedRecord.deals} Deals Closed</Badge>
                    <Badge className="bg-[#013E37] text-white">Achievement: {selectedRecord.achievementRate}%</Badge>
                  </div>
                </div>
                <div className="sm:ml-auto text-center sm:text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Pembayaran</p>
                  {getStatusBadge(selectedRecord.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Komisi Dasar</p>
                  <p className="text-2xl font-black text-gray-800">{formatCurrency(selectedRecord.baseCommission)}</p>
                </div>
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Bonus Performa</p>
                  <p className="text-2xl font-black text-emerald-600">{formatCurrency(selectedRecord.bonuses)}</p>
                </div>
              </div>

              <div className="p-6 bg-[#013E37] text-white rounded-3xl shadow-xl shadow-emerald-900/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Total Pencairan Komisi</p>
                  <p className="text-4xl font-black">{formatCurrency(selectedRecord.totalCommission)}</p>
                </div>
                <Button
                  className="bg-white text-[#013E37] hover:bg-emerald-50 h-12 px-8 font-bold text-base rounded-xl"
                  onClick={handleConfirmPayment}
                  disabled={selectedRecord.status !== 'approved'}
                >
                  {selectedRecord.status === 'paid'
                    ? 'Sudah Dibayar'
                    : selectedRecord.status === 'pending'
                    ? 'Menunggu Approval'
                    : 'Konfirmasi Pembayaran'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
