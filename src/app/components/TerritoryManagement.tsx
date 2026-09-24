import React, { useState, useEffect } from 'react';
import { MapPin, Users, Target, TrendingUp, Award, Plus, Search, Edit, Eye, ShieldCheck, Briefcase, BarChart3, Map as MapIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { CHART_PRIMARY, CHART_GRID, CHART_TOOLTIP_STYLE, chartColor } from '@/styles/chartTheme';
import { TerritoryMap } from './TerritoryMap';
import { useAuth } from '@/app/contexts/AuthContext';
import { territoriesRepository } from '@/services/territoriesRepository';
import { performanceTargetsRepository } from '@/services/performanceTargetsRepository';
import { computeAchievementPct } from '@/types/performanceTarget';
import type { PerformanceTarget } from '@/types/performanceTarget';
import type { TerritoryWithPerformance } from '@/types/territory';

// Data source: territoriesRepository (profile: name/region/assignedTo/
// coverage) joined with performanceTargetsRepository (target/actual revenue
// per territory per period) — replaces the previous hardcoded
// `useState<Territory[]>([...])` which never persisted anything (a page
// refresh silently reverted every edit). `achievement` is now always
// computeAchievementPct(target, actual), never a separately stored number
// that could drift from the two figures it's derived from.
//
// Bab-follow-up (23 Sep 2026): `leads`/`opportunities` are no longer
// creatable/editable fields — the API now computes them from
// Lead.territoryId/Opportunity.territoryId counts, so they are never sent
// in a create/update payload (see NewTerritoryProfile), only read back.

function getCurrentPeriod(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

// Bab 32/33 (24 Sep 2026): `assignedTo` is a nullable column server-side
// (Territory.assignedTo String?) but the UI always required it on
// create/edit -- so it can only be null via a direct API call bypassing
// this form (Postman, a future caller). `territory.assignedTo.split(' ')`
// with no guard would then throw and crash the whole grid's render (not
// just one card), since it happens inside a top-level .map(). Used at
// every render site instead of inlining the null check three times.
function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  return name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 3).toUpperCase();
}

// Seed data — same 4 territories this screen has always shipped with as
// sample data, now created through territoriesRepository + a matching
// performance_targets row instead of being hardcoded into component state.
const SEED_TERRITORIES = [
  { name: 'Jakarta Pusat', region: 'DKI Jakarta', assignedTo: 'Budi Santoso', coverage: 85, revenue: 350000000, target: 300000000 },
  { name: 'Jakarta Selatan', region: 'DKI Jakarta', assignedTo: 'Ani Wijaya', coverage: 78, revenue: 280000000, target: 300000000 },
  { name: 'Bandung', region: 'Jawa Barat', assignedTo: 'Dewi Kartika', coverage: 92, revenue: 520000000, target: 400000000 },
  { name: 'Surabaya', region: 'Jawa Timur', assignedTo: 'Eko Prasetyo', coverage: 65, revenue: 185000000, target: 250000000 },
];

// Bab 32/33 (24 Sep 2026): mirrors the backend's own requireRole(...,
// ['SUPER_ADMIN', 'SALES_MANAGER', 'MASTER_DATA_ADMIN']) on
// POST/PUT/DELETE /api/territories (see api/handler.ts's handleTerritories)
// -- previously every role saw "Add New Territory"/"Edit Wilayah", so a
// Sales Rep/Executive could open the form only to have it fail with a 403
// on submit. Read access (GET) intentionally stays open to every role, so
// this only gates the mutating buttons, not the whole menu item.
const TERRITORY_MANAGE_ROLES = ['Super Admin', 'Sales Manager', 'Master Data Admin'];

export function TerritoryManagement() {
  const { user } = useAuth();
  const canManageTerritory = !!user?.role && TERRITORY_MANAGE_ROLES.includes(user.role);
  const [activeTab, setActiveTab] = useState('territories');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryWithPerformance | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTerritory, setNewTerritory] = useState<Partial<TerritoryWithPerformance>>({
    name: '',
    region: 'DKI Jakarta',
    assignedTo: '',
    leads: 0,
    opportunities: 0,
    revenue: 0,
    target: 0,
    achievement: 0,
    coverage: 0
  });

  const [territories, setTerritories] = useState<TerritoryWithPerformance[]>([]);
  // Maps territoryId -> its performance_targets record id for the current
  // period, so edits know whether to update an existing target row or
  // create a new one (a territory can exist with no target set yet).
  const [targetRecordIds, setTargetRecordIds] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const profilesResult = await territoriesRepository.getAll();
      const profiles = profilesResult.data || [];

      const targetsResult = await performanceTargetsRepository.getAll();
      const targets: PerformanceTarget[] = targetsResult.data || [];
      const currentPeriod = getCurrentPeriod();

      const idMap: Record<string, string> = {};
      const merged: TerritoryWithPerformance[] = profiles.map((p) => {
        const t = targets.find((x) => (x as any).territoryId === p.id && x.period === currentPeriod);
        if (t) idMap[p.id] = t.id;
        const target = t?.target ?? 0;
        const actual = t?.actual ?? 0;
        return {
          id: p.id,
          name: p.name,
          region: p.region,
          assignedTo: p.assignedTo,
          leads: p.leads,
          opportunities: p.opportunities,
          revenue: actual,
          target,
          achievement: computeAchievementPct({ target, actual }) ?? 0,
          coverage: p.coverage,
        };
      });

      setTargetRecordIds(idMap);
      setTerritories(merged);
    } catch (error: any) {
      console.error('Error loading territories:', error);
      toast.error(`Gagal memuat data wilayah: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Bab 32/33 (24 Sep 2026): this used to run automatically inside
  // loadData() whenever the territories table was empty -- a hidden write
  // side effect inside what looked like a read operation, with three real
  // problems: (1) it fired for every role including ones without write
  // access, failing 403 silently with no toast, no console warning, just
  // an empty "0 territories" dashboard with no explanation; (2) it wasn't
  // gated to any environment, so a genuinely empty production DB would
  // auto-populate demo data the first time anyone opened this page; (3) it
  // was racy -- Territory.name has no unique constraint, so two tabs
  // loading the empty page at the same time could both pass the
  // `profiles.length === 0` check and both insert a full set of 4
  // territories. Converted to an explicit button (same "Load Dummy Data"
  // pattern already used on the CRM Management page), gated to the same
  // roles that can actually write here.
  const handleLoadDummyData = async () => {
    if (!canManageTerritory) return;
    setLoading(true);
    try {
      for (const seed of SEED_TERRITORIES) {
        const created = await territoriesRepository.create({
          name: seed.name, region: seed.region, assignedTo: seed.assignedTo,
          coverage: seed.coverage,
        });
        if (created.success && created.data) {
          await performanceTargetsRepository.create({
            territoryId: created.data.id,
            period: getCurrentPeriod(),
            target: seed.target,
            actual: seed.revenue,
          } as any);
        } else {
          toast.error(created.error || `Gagal membuat wilayah contoh "${seed.name}"`);
        }
      }
      toast.success('Data contoh wilayah berhasil dimuat');
    } catch (error: any) {
      console.error('Error loading dummy territory data:', error);
      toast.error(`Gagal memuat data contoh: ${error.message}`);
    } finally {
      await loadData();
    }
  };

  const handleOpenDetail = (territory: TerritoryWithPerformance) => {
    setSelectedTerritory(territory);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (territory: TerritoryWithPerformance) => {
    setSelectedTerritory(territory);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerritory) return;

    const profileResult = await territoriesRepository.update(selectedTerritory.id, {
      name: selectedTerritory.name,
      region: selectedTerritory.region,
      assignedTo: selectedTerritory.assignedTo,
      coverage: selectedTerritory.coverage,
    });
    if (!profileResult.success) {
      toast.error(profileResult.error || 'Gagal memperbarui wilayah');
      return;
    }

    const existingTargetId = targetRecordIds[selectedTerritory.id];
    const targetResult = existingTargetId
      ? await performanceTargetsRepository.update(existingTargetId, { target: selectedTerritory.target })
      : await performanceTargetsRepository.create({
          territoryId: selectedTerritory.id,
          period: getCurrentPeriod(),
          target: selectedTerritory.target,
          actual: selectedTerritory.revenue,
        } as any);
    if (!targetResult.success) {
      // Bab 32/33 (24 Sep 2026): the profile update above (name/region/
      // assignedTo/coverage) had already succeeded by this point -- closing
      // over stale local state and just showing an error implied nothing
      // was saved, when part of it was. Refresh from the server so the UI
      // reflects what's actually persisted, and say so explicitly.
      toast.error(targetResult.error || 'Profil wilayah tersimpan, tapi target gagal diperbarui');
      await loadData();
      return;
    }

    setIsEditOpen(false);
    toast.success(`Data wilayah ${selectedTerritory.name} berhasil diperbarui`);
    await loadData();
  };

  const handleCreateTerritory = async (e: React.FormEvent) => {
    e.preventDefault();

    const profileResult = await territoriesRepository.create({
      name: newTerritory.name || '',
      region: newTerritory.region || 'DKI Jakarta',
      assignedTo: newTerritory.assignedTo || '',
      coverage: newTerritory.coverage || 0,
    });
    if (!profileResult.success || !profileResult.data) {
      toast.error(profileResult.error || 'Gagal membuat wilayah');
      return;
    }

    const targetResult = await performanceTargetsRepository.create({
      territoryId: profileResult.data.id,
      period: getCurrentPeriod(),
      target: newTerritory.target || 0,
      actual: newTerritory.revenue || 0,
    } as any);
    if (!targetResult.success) {
      // Bab 32/33 (24 Sep 2026): this used to leave the Territory row from
      // above already committed while showing an error and keeping the
      // dialog open -- a user who, reasonably, tried "Create Territory"
      // again ended up with a second orphaned territory of the same name
      // and still no target. Roll back the just-created territory instead
      // of leaving a half-written record behind.
      await territoriesRepository.remove(profileResult.data.id);
      toast.error(targetResult.error || 'Gagal membuat target wilayah — wilayah dibatalkan, silakan coba lagi');
      return;
    }

    setIsAddOpen(false);
    setNewTerritory({
      name: '',
      region: 'DKI Jakarta',
      assignedTo: '',
      leads: 0,
      opportunities: 0,
      revenue: 0,
      target: 0,
      achievement: 0,
      coverage: 0
    });
    toast.success(`Wilayah ${profileResult.data.name} berhasil ditambahkan`);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37]"></div>
      </div>
    );
  }

  const stats = {
    total: territories.length,
    totalRevenue: territories.reduce((sum, t) => sum + t.revenue, 0),
    totalTarget: territories.reduce((sum, t) => sum + t.target, 0),
    avgCoverage: territories.length > 0 ? territories.reduce((sum, t) => sum + t.coverage, 0) / territories.length : 0,
    topPerformer: territories.length > 0
      ? territories.reduce((max, t) => t.achievement > max.achievement ? t : max, territories[0])
      : { id: '', name: '-', region: '', assignedTo: '', leads: 0, opportunities: 0, revenue: 0, target: 0, achievement: 0, coverage: 0 }
  };

  const regionData = Array.from(new Set(territories.map(t => t.region))).map((region, idx) => ({
    name: region,
    value: territories.filter(t => t.region === region).length,
    color: chartColor(idx),
  }));

  // Bab 32/33 (24 Sep 2026): the search box used to set `searchQuery` but
  // nothing ever read it back -- the Wilayah tab always rendered the full
  // `territories` list regardless of what was typed (live-verified: typing
  // a string matching nothing still showed all 4 territories).
  const filteredTerritories = territories.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.region.toLowerCase().includes(q) ||
      (t.assignedTo ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase bg-gradient-to-r from-[#013E37] via-[#028076] to-[#013E37] bg-clip-text text-transparent">
            TERRITORY MANAGEMENT
          </h1>
          <p className="text-gray-500 font-medium flex items-center gap-2 mt-2">
            <MapPin className="h-4 w-4 text-[#013E37]" />
            Penugasan wilayah geografis, pelacakan performa, dan metrik penetrasi pasar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-xs px-4 h-11 transition-all hover:bg-gray-50">
            <TrendingUp className="h-4 w-4 mr-2" /> Penetration Report
          </Button>
          {canManageTerritory && (
            <Button 
              className="bg-[#013E37] hover:bg-[#028076] text-white font-bold uppercase tracking-wider text-xs px-6 h-11 shadow-lg shadow-[#013E37]/20 transition-all active:scale-95"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Add New Territory
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-gray-100 shadow-sm overflow-hidden group hover:border-[#013E37]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Territories</CardTitle>
            <MapPin className="h-4 w-4 text-[#013E37]" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-gray-900">{stats.total}</div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Active regions</p>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm overflow-hidden group hover:border-[#013E37]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#013E37]" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-[#013E37]">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">YTD performance</p>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm overflow-hidden group hover:border-[#013E37]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Achievement</CardTitle>
            <Target className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-emerald-600">
              {stats.totalTarget > 0 ? ((stats.totalRevenue / stats.totalTarget) * 100).toFixed(1) : '0.0'}%
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Average attainment</p>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm overflow-hidden group hover:border-[#013E37]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avg Coverage</CardTitle>
            <MapPin className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-amber-600">{stats.avgCoverage.toFixed(1)}%</div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Market share</p>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm overflow-hidden group hover:border-[#013E37]/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-[#EEF7F5]0" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-black text-[#013E37] truncate">{stats.topPerformer.name}</div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{stats.topPerformer.achievement.toFixed(1)}% Attainment</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-3">
          <TabsTrigger 
            value="territories" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Wilayah</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Territories</span>
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Analitik</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Market Insights</span>
          </TabsTrigger>
          <TabsTrigger 
            value="map" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Visual Map</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Geospatial</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="territories" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Cari wilayah atau penanggung jawab..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
              />
            </div>
          </div>

          {territories.length === 0 && (
            <Card className="border-dashed border-gray-200">
              <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <MapPin className="h-8 w-8 text-gray-300" />
                <p className="text-sm font-bold text-gray-500">Belum ada data wilayah.</p>
                {canManageTerritory ? (
                  <Button
                    variant="outline"
                    className="border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-xs px-4 h-10 hover:bg-gray-50"
                    onClick={handleLoadDummyData}
                  >
                    Load Dummy Data
                  </Button>
                ) : (
                  <p className="text-xs text-gray-400">Hubungi Sales Manager / Master Data Admin untuk menambahkan wilayah.</p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {filteredTerritories.map((territory) => (
              <Card key={territory.id} className="group hover:border-[#013E37]/50 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border-gray-100">
                <CardHeader className="pb-4 bg-gray-50/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl font-black text-gray-900 group-hover:text-[#013E37] transition-colors flex items-center gap-2 uppercase tracking-tight">
                        <MapPin className="h-5 w-5 text-[#013E37]" />
                        {territory.name}
                      </CardTitle>
                      <CardDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">REGION: {territory.region}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 ${territory.achievement >= 100 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#013E37] hover:bg-[#028076]'}`}>
                        {territory.achievement.toFixed(1)}% ATTAINMENT
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="h-10 w-10 rounded-full bg-[#013E37] flex items-center justify-center text-white text-xs font-black">
                      {getInitials(territory.assignedTo)}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Territory Manager</p>
                      <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{territory.assignedTo || 'Belum ditugaskan'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Commercial Metrics</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-gray-900">{territory.leads}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Leads</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-[#013E37]">{territory.opportunities}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Opportunities</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Market Coverage</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-amber-600">{territory.coverage}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${territory.coverage}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue Achievement</p>
                        <p className="text-lg font-black text-[#013E37]">{formatCurrency(territory.revenue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Quota: {formatCurrency(territory.target)}</p>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-100 shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${territory.achievement >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-[#013E37] to-[#028076]'}`} 
                        style={{ width: `${Math.min(territory.achievement, 100)}%` }} 
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 font-black text-[10px] uppercase tracking-widest border-gray-200 h-11 hover:bg-gray-50"
                      onClick={() => handleOpenDetail(territory)}
                    >
                      <Eye className="h-4 w-4 mr-2" /> Detail Data
                    </Button>
                    {canManageTerritory && (
                      <Button 
                        variant="outline" 
                        className="flex-1 font-black text-[10px] uppercase tracking-widest border-gray-200 h-11 hover:bg-gray-50"
                        onClick={() => handleOpenEdit(territory)}
                      >
                        <Edit className="h-4 w-4 mr-2" /> Edit Wilayah
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-100">
                <CardTitle className="text-lg font-black text-[#013E37] uppercase tracking-tight">Revenue vs Target</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-gray-400">Perbandingan performa antar wilayah</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={territories} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} tickFormatter={(value) => `Rp${value/1000000}jt`} />
                      <Tooltip 
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value: any) => [formatCurrency(value), 'Value']}
                      />
                      <Bar dataKey="revenue" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} name="Actual Revenue" />
                      <Bar dataKey="target" fill="var(--border)" radius={[4, 4, 0, 0]} name="Quota Target" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-100">
                <CardTitle className="text-lg font-black text-[#013E37] uppercase tracking-tight">Market Concentration</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-gray-400">Distribusi wilayah berdasarkan regional</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={regionData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60}
                        outerRadius={80} 
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {regionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={CHART_TOOLTIP_STYLE}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="map" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-none shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            <CardHeader className="bg-white border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-[#013E37] uppercase tracking-tight">Geospatial Intelligence</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-gray-400">Visualisasi sebaran wilayah dan kepadatan pasar</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-black uppercase border-gray-200">Live GIS Data</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative">
              <TerritoryMap 
                territories={territories} 
                onSelectTerritory={(territory) => handleOpenDetail(territory)} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl">
          <VisuallyHidden>
            <DialogTitle>Detail Wilayah {selectedTerritory?.name}</DialogTitle>
            <DialogDescription>Rincian performa dan statistik wilayah</DialogDescription>
          </VisuallyHidden>
          
          <div className="bg-[#013E37] p-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-black text-[10px] uppercase tracking-widest mb-4">
                  Territory ID: #{selectedTerritory?.id}
                </Badge>
                <h2 className="text-2xl font-black uppercase tracking-tight leading-none mb-2">
                  {selectedTerritory?.name}
                </h2>
                <p className="text-emerald-100/70 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                  <MapIcon className="h-3 w-3" /> {selectedTerritory?.region}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/50 mb-1">Attainment</p>
                <p className="text-4xl font-black">{selectedTerritory?.achievement.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8 bg-white">
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue Actual</p>
                <p className="text-xl font-black text-[#013E37]">{formatCurrency(selectedTerritory?.revenue || 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Quota</p>
                <p className="text-xl font-black text-gray-900">{formatCurrency(selectedTerritory?.target || 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gap to Target</p>
                <p className={`text-xl font-black ${(selectedTerritory?.target || 0) - (selectedTerritory?.revenue || 0) <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {formatCurrency(Math.max(0, (selectedTerritory?.target || 0) - (selectedTerritory?.revenue || 0)))}
                </p>
              </div>
            </div>

            <Separator className="bg-gray-100" />

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#013E37]" /> Team Assignment
                </h4>
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="h-12 w-12 rounded-full bg-[#013E37] flex items-center justify-center text-white font-black">
                    {getInitials(selectedTerritory?.assignedTo)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{selectedTerritory?.assignedTo || 'Belum ditugaskan'}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Senior Territory Manager</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#013E37]" /> Pipeline Metrics
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Leads</p>
                    <p className="text-lg font-black text-gray-900">{selectedTerritory?.leads}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Opportunities</p>
                    <p className="text-lg font-black text-[#013E37]">{selectedTerritory?.opportunities}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#013E37] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Market Penetration Status
                </h4>
                <Badge className="bg-[#013E37] text-[10px] font-black uppercase">{selectedTerritory?.coverage}% COVERAGE</Badge>
              </div>
              <div className="h-4 bg-white rounded-full overflow-hidden p-1 border border-emerald-200">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${selectedTerritory?.coverage}%` }} />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-gray-50 p-6 border-t border-gray-100">
            <Button variant="outline" className="font-black uppercase tracking-widest text-[10px] h-11 px-8" onClick={() => setIsDetailOpen(false)}>
              Close Detail
            </Button>
            <Button className="bg-[#013E37] hover:bg-[#028076] text-white font-black uppercase tracking-widest text-[10px] h-11 px-8" onClick={() => {
              setIsDetailOpen(false);
              setIsEditOpen(true);
            }}>
              Edit Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
          <VisuallyHidden>
            <DialogTitle>Edit Wilayah {selectedTerritory?.name}</DialogTitle>
            <DialogDescription>Perbarui parameter wilayah dan target</DialogDescription>
          </VisuallyHidden>

          <div className="bg-gray-900 p-8 text-white">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <Edit className="h-6 w-6 text-[#028076]" /> 
              Edit Territory
            </h2>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Update configuration & target metrics</p>
          </div>

          <form onSubmit={handleSaveEdit}>
            <div className="p-8 space-y-6 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Territory Name</Label>
                  <Input 
                    value={selectedTerritory?.name || ''} 
                    onChange={(e) => setSelectedTerritory(prev => prev ? {...prev, name: e.target.value} : null)}
                    className="h-11 font-bold uppercase tracking-tight"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Region</Label>
                  <Select 
                    value={selectedTerritory?.region || ''} 
                    onValueChange={(val) => setSelectedTerritory(prev => prev ? {...prev, region: val} : null)}
                  >
                    <SelectTrigger className="h-11 font-bold uppercase tracking-tight">
                      <SelectValue placeholder="Select Region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DKI Jakarta">DKI Jakarta</SelectItem>
                      <SelectItem value="Jawa Barat">Jawa Barat</SelectItem>
                      <SelectItem value="Jawa Timur">Jawa Timur</SelectItem>
                      <SelectItem value="Jawa Tengah">Jawa Tengah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assigned Manager</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    value={selectedTerritory?.assignedTo || ''} 
                    onChange={(e) => setSelectedTerritory(prev => prev ? {...prev, assignedTo: e.target.value} : null)}
                    className="pl-10 h-11 font-bold uppercase tracking-tight"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quota Target (IDR)</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={selectedTerritory?.target || 0} 
                    onChange={(e) => {
                      // Bab 32/33 (24 Sep 2026): parseInt('') / parseInt of a
                      // non-numeric string is NaN -- JSON.stringify then
                      // serializes NaN as literal `null` (its evil-twin
                      // behavior to dropping `undefined`), which the PUT
                      // handler happily sent to Prisma against a non-nullable
                      // column, crashing with a generic 500. The Add dialog
                      // already guarded this with `|| 0`; this brings Edit
                      // to the same behavior instead of clearing the field.
                      const raw = parseInt(e.target.value);
                      const val = Number.isNaN(raw) ? 0 : Math.max(0, raw);
                      setSelectedTerritory(prev => prev ? {...prev, target: val, achievement: val > 0 ? (prev.revenue / val) * 100 : 0} : null);
                    }}
                    className="h-11 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Market Coverage (%)</Label>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    value={selectedTerritory?.coverage || 0} 
                    onChange={(e) => {
                      // Same NaN guard as Quota Target above, plus clamping
                      // to 0-100: the HTML `max="100"` attribute does not
                      // stop a value typed or pasted directly, so without
                      // this a manually-entered 250 or -30 was persisted
                      // verbatim and corrupted the Avg Coverage KPI.
                      const raw = parseInt(e.target.value);
                      const val = Number.isNaN(raw) ? 0 : Math.min(100, Math.max(0, raw));
                      setSelectedTerritory(prev => prev ? {...prev, coverage: val} : null);
                    }}
                    className="h-11 font-bold"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="bg-gray-50 p-6 border-t border-gray-100 gap-2">
              <Button type="button" variant="outline" className="font-black uppercase tracking-widest text-[10px] h-11 px-6" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#013E37] hover:bg-[#028076] text-white font-black uppercase tracking-widest text-[10px] h-11 px-10 shadow-lg shadow-[#013E37]/20">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add New Territory Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
          <VisuallyHidden>
            <DialogTitle>Tambah Wilayah Baru</DialogTitle>
            <DialogDescription>Masukkan rincian untuk wilayah sales baru</DialogDescription>
          </VisuallyHidden>

          <div className="bg-[#013E37] p-8 text-white">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <Plus className="h-6 w-6 text-emerald-400" /> 
              New Territory
            </h2>
            <p className="text-emerald-100/70 text-xs font-bold uppercase tracking-widest mt-2">Create new geographic sales assignment</p>
          </div>

          <form onSubmit={handleCreateTerritory}>
            <div className="p-8 space-y-6 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Territory Name</Label>
                  <Input 
                    required
                    placeholder="e.g. Tangerang Raya"
                    value={newTerritory.name} 
                    onChange={(e) => setNewTerritory(prev => ({...prev, name: e.target.value}))}
                    className="h-11 font-bold uppercase tracking-tight placeholder:text-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Region</Label>
                  <Select 
                    value={newTerritory.region} 
                    onValueChange={(val) => setNewTerritory(prev => ({...prev, region: val}))}
                  >
                    <SelectTrigger className="h-11 font-bold uppercase tracking-tight">
                      <SelectValue placeholder="Select Region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DKI Jakarta">DKI Jakarta</SelectItem>
                      <SelectItem value="Jawa Barat">Jawa Barat</SelectItem>
                      <SelectItem value="Jawa Timur">Jawa Timur</SelectItem>
                      <SelectItem value="Jawa Tengah">Jawa Tengah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Assigned Manager</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    required
                    placeholder="Nama Lengkap Manajer"
                    value={newTerritory.assignedTo} 
                    onChange={(e) => setNewTerritory(prev => ({...prev, assignedTo: e.target.value}))}
                    className="pl-10 h-11 font-bold uppercase tracking-tight placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Initial Quota (IDR)</Label>
                  <Input 
                    required
                    type="number"
                    placeholder="300000000"
                    value={newTerritory.target || ''} 
                    onChange={(e) => setNewTerritory(prev => ({...prev, target: parseInt(e.target.value)}))}
                    className="h-11 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Coverage Goal (%)</Label>
                  <Input 
                    required
                    type="number"
                    max="100"
                    placeholder="75"
                    value={newTerritory.coverage || ''} 
                    onChange={(e) => setNewTerritory(prev => ({...prev, coverage: parseInt(e.target.value)}))}
                    className="h-11 font-bold"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="bg-gray-50 p-6 border-t border-gray-100 gap-2">
              <Button type="button" variant="outline" className="font-black uppercase tracking-widest text-[10px] h-11 px-6" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#013E37] hover:bg-[#028076] text-white font-black uppercase tracking-widest text-[10px] h-11 px-10 shadow-lg shadow-[#013E37]/20">
                Create Territory
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
