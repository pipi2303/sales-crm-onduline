import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, Target, Download, Calendar, BarChart3, PieChart as PieChartIcon, ChevronDown, ChevronRight, Building2, Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_PRIMARY, CHART_COLORS, CHART_GRID } from '@/styles/chartTheme';
import { salesData, leadSourceData } from '@/app/data/dummyData';
import { salesTeamApi } from '@/services/api';
import { contractsRepository } from '@/services/contractsRepository';
import { leadsRepository } from '@/services/leadsRepository';
import { toast } from 'sonner';
import { SalesKPICards } from '@/app/components/SalesKPICards';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { TeamKPICards } from '@/app/components/TeamKPICards';

// Dialogs
import { SalesExecutiveDialog } from '@/app/components/dialogs/SalesExecutiveDialog';
import { DirectorDetailDialog } from '@/app/components/dialogs/DirectorDetailDialog';
import { AreaManagerDetailDialog } from '@/app/components/dialogs/AreaManagerDetailDialog';
import { SalesManagerDetailDialog } from '@/app/components/dialogs/SalesManagerDetailDialog';
import { RevenueBreakdownDialog } from '@/app/components/dialogs/RevenueBreakdownDialog';
import { AccountManagerDetailDialog } from '@/app/components/dialogs/AccountManagerDetailDialog';

// Data
import { teamHierarchy, monthlyData, productPerformance, regionalData, conversionFunnel } from '@/app/data/teamHierarchyData';
import { TeamMember, Manager, AreaManager, Director, SalesExecutive, Note } from '@/app/components/dialogs/sales-dialog-types';

export function SalesReports() {
  const COLORS = CHART_COLORS;

  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Jan - 26');
  const [expandedManagers, setExpandedManagers] = useState<string[]>([]);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [expandedAreaManagers, setExpandedAreaManagers] = useState<string[]>([]);
  const [expandedSalesManagerTeams, setExpandedSalesManagerTeams] = useState<string[]>([]);
  
  // Selection States
  const [selectedDirector, setSelectedDirector] = useState<Director | null>(null);
  const [selectedAreaManager, setSelectedAreaManager] = useState<AreaManager | null>(null);
  const [selectedSalesManager, setSelectedSalesManager] = useState<Manager | null>(null);
  const [selectedSalesExecutive, setSelectedSalesExecutive] = useState<SalesExecutive | null>(null);
  const [selectedAccountManager, setSelectedAccountManager] = useState<TeamMember | null>(null);
  const [selectedMemberForRevenue, setSelectedMemberForRevenue] = useState<TeamMember | null>(null);
  const [revenueBreakdownTab, setRevenueBreakdownTab] = useState<'projek' | 'retail' | 'distributor'>('projek');

  // Dialog Functional States
  const [dialogAiTab, setDialogAiTab] = useState('insights');
  const [dialogPeriodFilter, setDialogPeriodFilter] = useState('monthly');
  const [dialogSelectedPeriod, setDialogSelectedPeriod] = useState('Jan - 26');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');

  const handleAddNote = () => {
    if (newNote.trim()) {
      const note: Note = {
        id: Date.now().toString(),
        text: newNote,
        timestamp: new Date()
      };
      setNotes([note, ...notes]);
      setNewNote('');
      toast.success('Note added successfully');
    }
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    toast.success('Note deleted');
  };

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalLeads: 0,
    totalContracts: 0,
    avgDealSize: 0,
    pipelineValue: 8500000000,
    upside: 2100000000,
    strongUpside: 1800000000,
    forecast: 3200000000
  });

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [leadsResult, contractsResult, teamResult] = await Promise.all([
        leadsRepository.getAll(),
        contractsRepository.getAll(),
        salesTeamApi.getAll(),
      ]);

      if (contractsResult.success && contractsResult.data) {
        const contractData = contractsResult.data;
        const activeContracts = contractData.filter((c: any) => c.status === 'active');
        const totalRevenue = activeContracts.reduce((sum: number, c: any) => sum + c.value, 0);
        const avgDealSize = contractData.length > 0 
          ? contractData.reduce((sum: number, c: any) => sum + c.value, 0) / contractData.length 
          : 0;

        setStats({
          totalRevenue,
          totalLeads: leadsResult.data?.length || 0,
          totalContracts: activeContracts.length,
          avgDealSize,
          pipelineValue: totalRevenue * 1.85,
          upside: totalRevenue * 0.42,
          strongUpside: totalRevenue * 0.35,
          forecast: totalRevenue * 0.65
        });
      }
    } catch (error: any) {
      console.error('Error fetching reports data:', error);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodOptions = () => {
    const currentYear = 2026;
    if (periodType === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map(month => `${month} - ${currentYear.toString().slice(-2)}`);
    } else if (periodType === 'quarterly') {
      return ['Q1', 'Q2', 'Q3', 'Q4'];
    } else {
      return [currentYear.toString(), (currentYear - 1).toString(), (currentYear - 2).toString()];
    }
  };

  const toggleManagerExpand = (managerId: string) => {
    setExpandedManagers(prev =>
      prev.includes(managerId) ? prev.filter(id => id !== managerId) : [...prev, managerId]
    );
  };

  const toggleAreaManagerExpand = (amId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAreaManagers(prev =>
      prev.includes(amId) ? prev.filter(id => id !== amId) : [...prev, amId]
    );
  };

  const toggleSalesManagerTeam = (mgrId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSalesManagerTeams(prev =>
      prev.includes(mgrId) ? prev.filter(id => id !== mgrId) : [...prev, mgrId]
    );
  };

  const getFilteredTeamMembers = () => {
    if (!selectedManager) {
      const allMembers: TeamMember[] = [];
      teamHierarchy.areaManagers.forEach(am => am.managers.forEach(m => allMembers.push(...m.team)));
      return allMembers;
    }
    let foundManager: Manager | undefined;
    teamHierarchy.areaManagers.forEach(am => {
      const m = am.managers.find(mgr => mgr.id === selectedManager);
      if (m) foundManager = m;
    });
    return foundManager ? foundManager.team : [];
  };

  const getChartData = () => {
    return getFilteredTeamMembers().map(member => ({
      name: member.name,
      target: member.target / 1000000,
      achievement: member.achievement / 1000000
    }));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37]"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">Sales Reports</h1>
          <p className="text-gray-600 mt-1">Analisis lengkap performa sales Anda</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
            <SelectTrigger className="w-40"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{getPeriodOptions().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => toast.success('Exporting PDF...')} className="bg-[#013E37] hover:bg-[#025C52]"><Download className="h-4 w-4 mr-2" />Export PDF</Button>
        </div>
      </div>

      <SalesKPICards stats={stats} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-3 md:grid-cols-5 gap-1">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Overview</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Ringkasan Eksekutif</span>
          </TabsTrigger>
          <TabsTrigger 
            value="sales" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Sales Analysis</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Analisis Pendapatan</span>
          </TabsTrigger>
          <TabsTrigger 
            value="performance" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Team Performance</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Evaluasi Tim Sales</span>
          </TabsTrigger>
          <TabsTrigger 
            value="products" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Product Analysis</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Performa Produk</span>
          </TabsTrigger>
          <TabsTrigger 
            value="regional" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#013E37] data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Regional Analysis</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Sebaran Wilayah</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-[#013E37]" />Revenue Trend (Juta Rupiah)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesData}>
                    <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.35}/><stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0.02}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} /><XAxis dataKey="month" /><YAxis /><Tooltip /><Area type="monotone" dataKey="value" stroke={CHART_PRIMARY} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-[#013E37]" />Lead Sources</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart><Pie data={leadSourceData} cx="50%" cy="50%" outerRadius={100} fill={CHART_PRIMARY} dataKey="value" label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}>{leadSourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Sales Funnel</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversionFunnel.map((stage) => (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex justify-between items-center"><span className="text-sm font-medium">{stage.stage}</span><span className="text-sm text-gray-600">{formatNumber(stage.count)} ({stage.percentage}%)</span></div>
                    <div className="h-8 bg-gray-100 rounded-full overflow-hidden relative"><div className="h-full bg-gradient-to-r from-blue-500 to-[#013E37] flex items-center justify-center text-white text-xs font-semibold" style={{ width: `${stage.percentage}%` }}>{stage.percentage}%</div></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Monthly Sales Metrics</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="leads" stroke={CHART_COLORS[0]} strokeWidth={2} />
                  <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS[1]} strokeWidth={2} />
                  <Line type="monotone" dataKey="forecast" stroke={CHART_COLORS[1]} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#013E37]" />Team Performance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Director */}
              <div className="border-2 border-[#013E37] rounded-lg p-4 bg-gradient-to-r from-[#EEF7F5] to-white cursor-pointer hover:shadow-md" onClick={() => setSelectedDirector(teamHierarchy)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="h-14 w-14 rounded-full bg-[#013E37] flex items-center justify-center text-white font-bold">{teamHierarchy.avatar}</div><div><h3 className="font-bold text-[#013E37]">{teamHierarchy.name}</h3><p className="text-sm text-gray-600">{teamHierarchy.position}</p></div></div>
                  <div className="text-right"><div className="text-2xl font-bold text-green-600">{formatCurrency(teamHierarchy.achievement)}</div><div className="text-sm font-semibold text-[#013E37]">{teamHierarchy.performance.toFixed(1)}% • {teamHierarchy.totalDeals} Deals</div></div>
                </div>
              </div>

              {/* Area Managers */}
              <div className="ml-6 space-y-3">
                {teamHierarchy.areaManagers.map(am => (
                  <div key={am.id}>
                    {/* Area Manager Card */}
                    <div
                      className={`border rounded-lg p-4 bg-white transition-all cursor-pointer ${expandedAreaManagers.includes(am.id) ? 'border-[#013E37] shadow-md' : 'border-gray-300 hover:border-[#013E37]'}`}
                      onClick={() => setSelectedAreaManager(am)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-[#013E37]">{am.avatar}</div>
                          <div>
                            <h4 className="font-bold text-[#013E37]">{am.name}</h4>
                            <p className="text-sm text-gray-600">{am.position}</p>
                            <p className="text-xs text-gray-400">{am.managers.length} Manager • {am.managers.reduce((s, m) => s + m.team.length, 0)} Team</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-600">{formatCurrency(am.achievement)}</div>
                            <div className="text-sm font-semibold text-[#013E37]">{am.performance.toFixed(1)}%</div>
                          </div>
                          <button
                            onClick={(e) => toggleAreaManagerExpand(am.id, e)}
                            className="h-8 w-8 rounded-full bg-[#EEF7F5] hover:bg-[#013E37] hover:text-white flex items-center justify-center text-[#013E37] transition-all"
                          >
                            {expandedAreaManagers.includes(am.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sales Managers under this Area Manager */}
                    {expandedAreaManagers.includes(am.id) && (
                      <div className="ml-8 mt-2 space-y-2 border-l-2 border-[#013E37]/30 pl-4">
                        {am.managers.map(mgr => (
                          <div key={mgr.id}>
                            {/* Sales Manager Card */}
                            <div
                              className={`border rounded-lg p-3 bg-gradient-to-r from-[#f0faf9] to-white transition-all cursor-pointer ${expandedSalesManagerTeams.includes(mgr.id) ? 'border-[#013E37]/60 shadow-sm' : 'border-[#013E37]/20 hover:border-[#013E37]/60'}`}
                              onClick={() => setSelectedSalesManager(mgr)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-[#013E37]/10 flex items-center justify-center font-bold text-[#013E37] text-sm">{mgr.avatar}</div>
                                  <div>
                                    <h5 className="font-semibold text-[#013E37]">{mgr.name}</h5>
                                    <p className="text-xs text-gray-500">{mgr.position}</p>
                                    <p className="text-xs text-gray-400">{mgr.team.length} Sales Executive</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className="text-base font-bold text-green-600">{formatCurrency(mgr.achievement)}</div>
                                    <div className="text-xs font-semibold text-[#013E37]">{mgr.performance.toFixed(1)}%</div>
                                  </div>
                                  <button
                                    onClick={(e) => toggleSalesManagerTeam(mgr.id, e)}
                                    className="h-7 w-7 rounded-full bg-[#013E37]/10 hover:bg-[#013E37] hover:text-white flex items-center justify-center text-[#013E37] transition-all"
                                  >
                                    {expandedSalesManagerTeams.includes(mgr.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  </button>
                                </div>
                              </div>
                              {/* KPI Cards for Sales Manager */}
                              <TeamKPICards member={mgr} size="sm" />
                            </div>

                            {/* Team Members under this Sales Manager */}
                            {expandedSalesManagerTeams.includes(mgr.id) && (
                              <div className="ml-8 mt-1 space-y-2 border-l-2 border-gray-200 pl-3">
                                {mgr.team.map(member => (
                                  <div
                                    key={member.id}
                                    className="border border-gray-100 rounded-lg p-3 bg-white hover:border-[#013E37]/40 hover:bg-[#f9fffe] transition-all cursor-pointer"
                                    onClick={() => setSelectedSalesExecutive(member as SalesExecutive)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${member.performance >= 90 ? 'bg-green-500' : member.performance >= 85 ? 'bg-yellow-500' : 'bg-red-400'}`}>{member.avatar}</div>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-800">{member.name}</p>
                                          <p className="text-xs text-gray-400">{member.position}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-bold text-green-600">{formatCurrency(member.achievement)}</div>
                                        <div className={`text-xs font-semibold ${member.performance >= 90 ? 'text-green-600' : member.performance >= 85 ? 'text-yellow-600' : 'text-red-500'}`}>
                                          {member.performance.toFixed(1)}% • {member.totalDeals} deals
                                        </div>
                                      </div>
                                    </div>
                                    {/* KPI Cards for Sales Executive */}
                                    <TeamKPICards member={member} size="sm" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Account Managers */}
              {teamHierarchy.accountManagers && teamHierarchy.accountManagers.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <Users className="h-5 w-5 text-[#013E37]" />
                    <h3 className="font-bold text-[#012D29]">Account Managers</h3>
                  </div>
                  <div className="ml-6 space-y-4">
                    {teamHierarchy.accountManagers.map(acm => (
                      <div key={acm.id} className="border-2 border-[#5BB5AB] rounded-lg p-4 bg-gradient-to-r from-[#EEF7F5] to-white hover:border-[#EEF7F5]0 transition-all cursor-pointer" onClick={() => setSelectedAccountManager(acm)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#013E37] to-[#025C52] flex items-center justify-center font-bold text-white">{acm.avatar}</div>
                            <div>
                              <h4 className="font-bold text-[#012D29]">{acm.name}</h4>
                              <p className="text-sm text-[#013E37]">{acm.position}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-600">{formatCurrency(acm.achievement)}</div>
                            <div className="text-sm font-semibold text-[#012D29]">{acm.performance.toFixed(1)}% • {acm.totalDeals} Accounts</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Team Performance Comparison</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="target" fill="var(--border)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="achievement" fill={CHART_PRIMARY} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card><CardHeader><CardTitle>Product Performance</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={productPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} /><XAxis type="number" /><YAxis dataKey="name" type="category" width={150} /><Tooltip /><Bar dataKey="revenue" fill={CHART_PRIMARY} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regional">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>Sales by Region</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart><Pie data={regionalData} cx="50%" cy="50%" outerRadius={100} fill={CHART_PRIMARY} dataKey="value" label={({region, percentage}) => `${region} ${percentage}%`}>{regionalData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Regional Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {regionalData.map((r, i) => (
                  <div key={r.region} className="space-y-2">
                    <div className="flex justify-between items-center"><span className="font-medium">{r.region}</span><span className="text-sm text-gray-600">{r.percentage}%</span></div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${r.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}></div></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DirectorDetailDialog 
        selectedDirector={selectedDirector} 
        onClose={() => setSelectedDirector(null)} 
        periodFilter={dialogPeriodFilter} 
        selectedPeriod={dialogSelectedPeriod} 
        onPeriodFilterChange={(filter, period) => {
          setDialogPeriodFilter(filter);
          setDialogSelectedPeriod(period);
        }} 
        aiTab={dialogAiTab} 
        onAiTabChange={setDialogAiTab} 
      />
      
      <AreaManagerDetailDialog 
        selectedAreaManager={selectedAreaManager} 
        onClose={() => setSelectedAreaManager(null)} 
        periodFilter={dialogPeriodFilter} 
        selectedPeriod={dialogSelectedPeriod} 
        onPeriodFilterChange={(filter, period) => {
          setDialogPeriodFilter(filter);
          setDialogSelectedPeriod(period);
        }} 
        notes={notes}
        newNote={newNote}
        onNewNoteChange={setNewNote}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
      />

      <SalesManagerDetailDialog 
        selectedManager={selectedSalesManager} 
        onClose={() => setSelectedSalesManager(null)} 
        periodFilter={dialogPeriodFilter} 
        selectedPeriod={dialogSelectedPeriod} 
        onPeriodFilterChange={(filter, period) => {
          setDialogPeriodFilter(filter);
          setDialogSelectedPeriod(period);
        }} 
        notes={notes}
        newNote={newNote}
        onNewNoteChange={setNewNote}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
      />

      <SalesExecutiveDialog 
        selectedExecutive={selectedSalesExecutive} 
        onClose={() => setSelectedSalesExecutive(null)} 
        periodFilter={dialogPeriodFilter} 
        selectedPeriod={dialogSelectedPeriod} 
        onPeriodFilterChange={(filter, period) => {
          setDialogPeriodFilter(filter);
          setDialogSelectedPeriod(period);
        }} 
        notes={notes}
        newNote={newNote}
        onNewNoteChange={setNewNote}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
      />

      <AccountManagerDetailDialog 
        selectedAccountManager={selectedAccountManager} 
        onClose={() => setSelectedAccountManager(null)} 
        periodFilter={dialogPeriodFilter} 
        selectedPeriod={dialogSelectedPeriod} 
        onPeriodFilterChange={(filter, period) => {
          setDialogPeriodFilter(filter);
          setDialogSelectedPeriod(period);
        }} 
        notes={notes}
        newNote={newNote}
        onNewNoteChange={setNewNote}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        aiTab={dialogAiTab}
        onAiTabChange={setDialogAiTab}
      />

      <RevenueBreakdownDialog 
        selectedMember={selectedMemberForRevenue} 
        onClose={() => setSelectedMemberForRevenue(null)} 
        tab={revenueBreakdownTab} 
        onTabChange={setRevenueBreakdownTab} 
      />
    </div>
  );
}