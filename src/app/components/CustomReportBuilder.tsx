import React, { useState } from 'react';
import { 
  Plus, 
  Filter,
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  BarChart3, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon, 
  Calendar, 
  FileText, 
  Settings2, 
  Search, 
  ChevronRight, 
  Clock, 
  Share2,
  Database,
  Layers,
  Layout,
  Table as TableIcon,
  Target,
  Sparkles,
  ArrowRight,
  Save,
  X
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { formatDate } from '@/utils/formatters';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { CHART_PRIMARY, CHART_GRID, AREA_GRADIENT_STOPS, BAR_RADIUS_UP } from '@/styles/chartTheme';

interface Report {
  id: string;
  name: string;
  type: string;
  frequency: string;
  lastRun: string;
  format: string;
  recipients: number;
  status: 'Active' | 'Draft';
}

export function CustomReportBuilder() {
  const [activeTab, setActiveTab] = useState('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState<Report[]>([
    { id: '1', name: 'Weekly Sales Summary', type: 'scheduled', frequency: 'Weekly', lastRun: '2024-02-19', format: 'PDF', recipients: 5, status: 'Active' },
    { id: '2', name: 'Monthly Performance Dashboard', type: 'scheduled', frequency: 'Monthly', lastRun: '2024-02-01', format: 'Excel', recipients: 8, status: 'Active' },
    { id: '3', name: 'Custom Territory Analysis', type: 'custom', frequency: 'On-demand', lastRun: '2024-02-18', format: 'PDF', recipients: 3, status: 'Draft' },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [formData, setFormData] = useState<Partial<Report>>({
    name: '',
    type: 'scheduled',
    frequency: 'Weekly',
    format: 'PDF',
    status: 'Active',
    recipients: 1
  });

  const handleOpenCreate = () => {
    setEditingReport(null);
    setFormData({
      name: '',
      type: 'scheduled',
      frequency: 'Weekly',
      format: 'PDF',
      status: 'Active',
      recipients: 1
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (report: Report) => {
    setEditingReport(report);
    setFormData({ ...report });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    toast.success('Laporan berhasil dihapus');
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error('Nama laporan harus diisi');
      return;
    }

    if (editingReport) {
      setReports(prev => prev.map(r => r.id === editingReport.id ? { ...r, ...formData } as Report : r));
      toast.success('Laporan berhasil diperbarui');
    } else {
      const newReport: Report = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name || 'Untitled Report',
        type: formData.type || 'custom',
        frequency: formData.frequency || 'Weekly',
        lastRun: new Date().toISOString().split('T')[0],
        format: formData.format || 'PDF',
        recipients: formData.recipients || 0,
        status: (formData.status as any) || 'Active',
      };
      setReports(prev => [newReport, ...prev]);
      toast.success('Laporan baru berhasil dibuat');
    }
    setIsDialogOpen(false);
  };

  const filteredReports = reports.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const dummyChartData = [
    { name: 'Mon', sales: 4000, revenue: 2400 },
    { name: 'Tue', sales: 3000, revenue: 1398 },
    { name: 'Wed', sales: 2000, revenue: 9800 },
    { name: 'Thu', sales: 2780, revenue: 3908 },
    { name: 'Fri', sales: 1890, revenue: 4800 },
    { name: 'Sat', sales: 2390, revenue: 3800 },
    { name: 'Sun', sales: 3490, revenue: 4300 },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">
            Report Builder
          </h1>
          <p className="text-gray-500 font-medium flex items-center gap-2 mt-2">
            <Sparkles className="h-4 w-4 text-[#013E37]" />
            Desain laporan kustom, penjadwalan otomatis, dan ekspor multi-format.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Cari laporan..." 
              className="pl-9 w-64 bg-white border-gray-200 focus:ring-[#013E37]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleOpenCreate} className="bg-[#013E37] hover:bg-[#028076] text-white font-bold uppercase tracking-wider text-xs px-6 shadow-lg shadow-[#013E37]/20">
            <Plus className="h-4 w-4 mr-2" /> New Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: 'Total Laporan', value: reports.length, sub: 'Laporan tersimpan', icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Terjadwal', value: reports.filter(r => r.type === 'scheduled').length, sub: 'Otomatisasi aktif', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Penerima', value: reports.reduce((acc, r) => acc + r.recipients, 0), sub: 'Total langganan', icon: Share2, color: 'text-[#013E37]', bg: 'bg-[#EEF7F5]' },
          { label: 'Exported', value: '1.2k', sub: 'Bulan ini', icon: Download, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="border-none shadow-sm hover:shadow-md transition-all bg-white group overflow-hidden relative">
              <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform ${stat.color}`}>
                <stat.icon size={64} />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-tighter">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-3">
          <TabsTrigger 
            value="reports" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Laporan Saya</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Akses & Kelola</span>
          </TabsTrigger>
          <TabsTrigger 
            value="builder" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Report Designer</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Kustomisasi Visual</span>
          </TabsTrigger>
          <TabsTrigger 
            value="templates" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-bold text-sm uppercase tracking-tight">Katalog Template</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Siap Pakai</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
             <div className="flex items-center gap-4 flex-1">
               <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Saved Reports</h3>
               <div className="h-1 w-1 rounded-full bg-gray-300" />
               <p className="text-xs font-bold text-gray-400 uppercase">{filteredReports.length} Items</p>
             </div>
             <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" className="h-9 px-4 font-bold text-[10px] uppercase tracking-widest border-gray-200">
                 <Filter className="h-3 w-3 mr-2" /> Filter
               </Button>
               <Button onClick={handleOpenCreate} size="sm" className="h-9 px-4 bg-[#013E37] hover:bg-[#028076] font-bold text-[10px] uppercase tracking-widest">
                 <Plus className="h-3 w-3 mr-2" /> Create New
               </Button>
             </div>
          </div>

          <div className="grid gap-4">
            {filteredReports.map((report, idx) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="group hover:border-[#013E37]/50 hover:shadow-xl transition-all duration-300 overflow-hidden bg-white border-gray-100">
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row items-stretch">
                      <div className="p-6 flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={report.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}>
                                <span className={`h-1.5 w-1.5 rounded-full mr-2 ${report.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{report.status}</span>
                              </Badge>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{report.type}</span>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 group-hover:text-[#013E37] transition-colors uppercase tracking-tight">
                              {report.name}
                            </h3>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Run</p>
                            <div className="flex items-center gap-1.5 text-gray-700 font-bold text-sm">
                              <Clock className="h-3 w-3 text-[#013E37]" />
                              {formatDate(report.lastRun)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-2">
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            <Calendar className="h-3 w-3 text-[#013E37]" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{report.frequency}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            <FileText className="h-3 w-3 text-blue-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{report.format}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                            <Share2 className="h-3 w-3 text-[#EEF7F5]0" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{report.recipients} Recipients</span>
                          </div>
                        </div>
                      </div>

                      <div className="lg:w-48 bg-gray-50 flex lg:flex-col items-center justify-center p-4 gap-2 border-t lg:border-t-0 lg:border-l border-gray-100">
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 w-full">
                          <Button variant="outline" size="sm" className="font-bold text-[10px] uppercase tracking-widest border-gray-200 hover:bg-white w-full">
                            <Eye className="h-3 w-3 mr-2" /> View
                          </Button>
                          <Button variant="outline" size="sm" className="font-bold text-[10px] uppercase tracking-widest border-gray-200 hover:bg-white w-full">
                            <Download className="h-3 w-3 mr-2" /> Export
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 w-full mt-2 lg:mt-0">
                          <Button onClick={() => handleOpenEdit(report)} variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest text-[#013E37] hover:bg-[#EEF7F5] w-full">
                            <Edit className="h-3 w-3 mr-2" /> Edit
                          </Button>
                          <Button onClick={() => handleDelete(report.id)} variant="ghost" size="sm" className="font-bold text-[10px] uppercase tracking-widest text-rose-600 hover:bg-rose-50 w-full">
                            <Trash2 className="h-3 w-3 mr-2" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {filteredReports.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <Search className="h-12 w-12 text-gray-200 mx-auto" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No reports found matching your criteria</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="builder" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Design Sidebar */}
            <div className="space-y-6">
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Report Properties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Report Name</Label>
                    <Input placeholder="Enter title..." className="bg-gray-50/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Data Source</Label>
                    <Select defaultValue="sales">
                      <SelectTrigger className="bg-gray-50/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales Transactions</SelectItem>
                        <SelectItem value="leads">Lead Pipeline</SelectItem>
                        <SelectItem value="territory">Territory Distribution</SelectItem>
                        <SelectItem value="financial">Financial Forecast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Export Frequency</Label>
                    <Select defaultValue="manual">
                      <SelectTrigger className="bg-gray-50/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">On-demand</SelectItem>
                        <SelectItem value="daily">Daily Auto</SelectItem>
                        <SelectItem value="weekly">Weekly Summary</SelectItem>
                        <SelectItem value="monthly">Monthly Audit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Visual Modules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { icon: BarChart3, label: 'Bar Chart', type: 'Comparison' },
                    { icon: PieChartIcon, label: 'Donut Chart', type: 'Distribution' },
                    { icon: LineChartIcon, label: 'Trend Line', type: 'History' },
                    { icon: TableIcon, label: 'Data Table', type: 'Details' },
                  ].map((module) => (
                    <div 
                      key={module.label} 
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-[#013E37]/30 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-[#013E37] transition-colors">
                        <module.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-gray-900">{module.label}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{module.type}</p>
                      </div>
                      <Plus className="h-3 w-3 text-gray-300 group-hover:text-[#013E37]" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Design Canvas */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-gray-100 shadow-xl overflow-hidden bg-gray-50/30">
                <CardHeader className="bg-white border-b border-gray-100 flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-[#013E37]">Designer Canvas</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-tighter">Preview real-time dari desain laporan Anda</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest">
                      <Layout className="h-3 w-3 mr-2" /> Grid
                    </Button>
                    <Button size="sm" className="h-8 bg-[#013E37] text-[10px] font-black uppercase tracking-widest">
                      <Download className="h-3 w-3 mr-2" /> Live Preview
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-8 bg-white p-8 rounded-2xl border border-gray-100 shadow-2xl min-h-[600px] relative">
                    {/* Watermark/Grid Background */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#013E37 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                    <div className="flex justify-between items-start border-b border-gray-100 pb-6 relative z-10">
                      <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">SALES ANALYTICS REPORT</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generated on {formatDate(new Date().toISOString())}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-[#013E37] uppercase tracking-[0.2em]">Enterprise Division</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 relative z-10">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue Growth</h4>
                        <div className="h-[200px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dummyChartData}>
                              <defs>
                                <linearGradient id="colorRevBuilder" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.from}/>
                                  <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.to}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                              <Tooltip />
                              <Area type="monotone" dataKey="revenue" stroke={CHART_PRIMARY} fillOpacity={1} fill="url(#colorRevBuilder)" strokeWidth={3} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sales Volume</h4>
                        <div className="h-[200px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dummyChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                              <Tooltip />
                              <Bar dataKey="sales" fill={CHART_PRIMARY} radius={BAR_RADIUS_UP} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="p-10 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 relative z-10 bg-gray-50/50">
                      <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Plus className="h-6 w-6 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Drop Visual Module Here</p>
                        <p className="text-[10px] font-bold text-gray-300 uppercase">Tambah komponen visual laporan kustom Anda</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-12 font-black uppercase tracking-widest border-gray-200 hover:bg-[#EEF7F5] hover:text-[#013E37] transition-colors">
                  Discard Draft
                </Button>
                <Button onClick={() => toast.success('Laporan berhasil dipublikasikan')} className="flex-1 h-12 bg-[#013E37] hover:bg-[#028076] text-white font-black uppercase tracking-widest shadow-xl shadow-[#013E37]/20">
                  Save & Publish Report
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: BarChart3, name: 'Sales Performance', desc: 'Metrik performa penjualan komprehensif dan KPI tim.', color: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: PieChartIcon, name: 'Revenue Breakdown', desc: 'Analisis pendapatan berdasarkan produk dan wilayah geografis.', color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { icon: LineChartIcon, name: 'Trend Analysis', desc: 'Tren penjualan dan performa operasional dari waktu ke waktu.', color: 'text-amber-500', bg: 'bg-amber-50' },
              { icon: Database, name: 'Data Integrity Audit', desc: 'Laporan kesehatan data dan kepatuhan sistem CRM.', color: 'text-[#EEF7F5]0', bg: 'bg-[#EEF7F5]' },
              { icon: Target, name: 'KPI Tracker', desc: 'Pemantauan real-time terhadap target individu dan tim.', color: 'text-rose-500', bg: 'bg-rose-50' },
              { icon: TableIcon, name: 'Raw Data Export', desc: 'Ekspor data mentah terstruktur untuk analisis eksternal.', color: 'text-slate-500', bg: 'bg-slate-50' },
            ].map((template, i) => (
              <motion.div
                key={template.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group hover:border-[#013E37]/50 hover:shadow-2xl transition-all duration-500 cursor-pointer h-full flex flex-col bg-white border-gray-100 overflow-hidden relative">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                     <template.icon size={100} />
                   </div>
                   <CardHeader>
                     <div className={`h-14 w-14 rounded-2xl ${template.bg} ${template.color} flex items-center justify-center mb-4 shadow-sm border border-white group-hover:scale-110 transition-transform duration-500`}>
                       <template.icon className="h-7 w-7" />
                     </div>
                     <CardTitle className="text-lg font-black uppercase tracking-tight text-gray-900 group-hover:text-[#013E37] transition-colors">{template.name}</CardTitle>
                     <CardDescription className="text-xs font-medium text-gray-500 leading-relaxed pt-1">
                       {template.desc}
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="mt-auto pt-4 flex flex-col gap-3">
                     <div className="h-px bg-gray-50 w-full mb-2" />
                     <Button variant="ghost" className="w-full text-[#013E37] hover:bg-[#EEF7F5] font-black text-[10px] uppercase tracking-[0.2em] group/btn">
                       Use This Template <ArrowRight className="h-3 w-3 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                     </Button>
                   </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* CRUD Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg border-none shadow-2xl">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-[#013E37]">
              {editingReport ? 'Edit Laporan' : 'Laporan Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Konfigurasi parameter laporan kustom Anda
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Report Name</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Quarterly Sales Audit" 
                className="h-12 border-gray-200 focus:ring-[#013E37] font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Report Type</Label>
                <Select 
                  value={formData.type}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
                >
                  <SelectTrigger className="h-12 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Frequency</Label>
                <Select 
                  value={formData.frequency}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, frequency: val }))}
                >
                  <SelectTrigger className="h-12 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="On-demand">On-demand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Export Format</Label>
                <Select 
                  value={formData.format}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, format: val }))}
                >
                  <SelectTrigger className="h-12 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF Document</SelectItem>
                    <SelectItem value="Excel">Excel Sheet</SelectItem>
                    <SelectItem value="CSV">CSV Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Recipients</Label>
                <Input 
                  type="number"
                  value={formData.recipients}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipients: parseInt(e.target.value) }))}
                  className="h-12 border-gray-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Status</Label>
              <Select 
                value={formData.status}
                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val as any }))}
              >
                <SelectTrigger className="h-12 border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-bold uppercase tracking-widest text-[10px]">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[#013E37] hover:bg-[#028076] text-white font-bold uppercase tracking-widest text-[10px] px-8">
              <Save className="h-3 w-3 mr-2" /> {editingReport ? 'Update Report' : 'Create Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
