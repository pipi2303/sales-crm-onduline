import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, FileText, Download, Send, Eye, Edit, Copy, 
  CheckCircle, Clock, XCircle, DollarSign, Calendar, User, 
  Package, Percent, Mail, Phone, Filter, MoreHorizontal,
  ArrowUpRight, TrendingUp, ChevronRight, Hash, Settings,
  BarChart3, Building2, Sun
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { exportToCSV, exportToPDF } from '@/utils/exportUtils';
import { quotationsRepository, type Quotation, type QuotationStatus } from '@/services/quotationsRepository';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area
} from 'recharts';
import { CHART_PRIMARY, CHART_GRID, AREA_GRADIENT_STOPS, CHART_TOOLTIP_STYLE, CHART_STATUS } from '@/styles/chartTheme';

// Bab 30 lanjutan (24 Sep 2026, hasil deep review + smoke test grup menu
// Sales Pipeline): dulu QUOTATIONS di sini adalah array module-level yang
// di-hardcode (bukan useState, selalu tepat 3 baris ini) -- sama sekali
// tidak sadar akan ConfigurePriceQuote.tsx (fitur "quotation" lain yang
// terpisah). Sekarang backend sungguhan (quotationsRepository, dipakai
// bersama oleh CPQ dan menu ini) -- lihat fetchQuotations() di bawah.

const PRICING_STRATEGY_DISCOUNT: Record<string, number> = {
  standard: 0,
  priority: 10,
  government: 0,
};

export function QuotationManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  // Bab 30 lanjutan: dialog "New Quotation" dulu tidak punya state/onChange
  // sama sekali (semua Input tidak terkontrol, tanpa `name`) -- "Generate
  // Quotation" tidak pernah mengumpulkan apa pun. Dipakai juga untuk edit
  // (editingQuoteId != null) supaya row "Edit" / "Edit Content" tidak perlu
  // form terpisah.
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    contactPerson: '',
    company: '',
    clientEmail: '',
    pricingStrategy: 'standard',
    validUntil: '',
    estimatedAmount: '',
  });

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const result = await quotationsRepository.getAll();
      if (result.success && result.data) {
        setQuotations(result.data);
      } else {
        toast.error(result.error || 'Gagal memuat data quotation');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetQuoteForm = () => {
    setEditingQuoteId(null);
    setQuoteForm({ contactPerson: '', company: '', clientEmail: '', pricingStrategy: 'standard', validUntil: '', estimatedAmount: '' });
  };

  const openEditQuote = (quote: Quotation) => {
    setEditingQuoteId(quote.id);
    setQuoteForm({
      contactPerson: quote.clientName,
      company: quote.clientCompany ?? '',
      clientEmail: quote.clientEmail ?? '',
      pricingStrategy: 'standard',
      validUntil: quote.validUntil ? quote.validUntil.toISOString().split('T')[0] : '',
      estimatedAmount: String(quote.subtotal || quote.totalAmount || ''),
    });
    setShowNewQuoteDialog(true);
  };

  const handleGenerateQuotation = async () => {
    if (!quoteForm.contactPerson.trim() || !quoteForm.company.trim()) {
      toast.error('Contact Person dan Nama Perusahaan wajib diisi');
      return;
    }
    const additionalDiscountPercent = PRICING_STRATEGY_DISCOUNT[quoteForm.pricingStrategy] ?? 0;
    const amount = Number(quoteForm.estimatedAmount) || 0;
    const payload = {
      clientName: quoteForm.contactPerson,
      clientCompany: quoteForm.company,
      clientEmail: quoteForm.clientEmail || undefined,
      additionalDiscountPercent,
      validUntil: quoteForm.validUntil || null,
      // Belum ada UI pemilihan produk per baris di dialog ini (beda dengan
      // menu CPQ yang punya product picker sendiri) -- "Estimasi Total"
      // dikirim sebagai satu line item generik supaya totalAmount yang
      // dihitung server tetap benar-benar mencerminkan angka yang
      // dimasukkan user, bukan Rp 0 yang menyesatkan.
      items: amount > 0 ? [{ productName: 'Estimasi Awal (detail menyusul)', quantity: 1, unitPrice: amount, discountPercent: 0 }] : [],
    };

    const result = editingQuoteId
      ? await quotationsRepository.update(editingQuoteId, payload)
      : await quotationsRepository.create(payload);

    if (result.success && result.data) {
      setQuotations((prev) =>
        editingQuoteId ? prev.map((q) => (q.id === result.data!.id ? result.data! : q)) : [result.data!, ...prev],
      );
      toast.success(editingQuoteId ? 'Quotation berhasil diupdate!' : 'Quotation berhasil dibuat!');
      setShowNewQuoteDialog(false);
      resetQuoteForm();
    } else {
      toast.error(result.error || 'Gagal menyimpan quotation');
    }
  };

  const updateQuoteStatus = async (id: string, status: QuotationStatus, successMessage: string) => {
    const result = await quotationsRepository.update(id, { status });
    if (result.success && result.data) {
      setQuotations((prev) => prev.map((q) => (q.id === id ? result.data! : q)));
      setSelectedQuote((prev) => (prev && prev.id === id ? result.data! : prev));
      toast.success(successMessage);
    } else {
      toast.error(result.error || 'Gagal mengubah status quotation');
    }
  };

  const handleDuplicateQuote = async (quote: Quotation) => {
    const result = await quotationsRepository.duplicate(quote);
    if (result.success && result.data) {
      setQuotations((prev) => [result.data!, ...prev]);
      toast.success('Quotation berhasil diduplikasi!');
    } else {
      toast.error(result.error || 'Gagal menduplikasi quotation');
    }
  };

  const handleDownloadPdf = (quote: Quotation) => {
    exportToPDF(
      quote.items.map((it) => ({
        product: it.productName,
        quantity: it.quantity,
        unitPrice: formatCurrency(it.unitPrice),
        lineTotal: formatCurrency(it.lineTotal),
      })),
      `${quote.quoteNumber}.pdf`,
      `Quotation ${quote.quoteNumber} - ${quote.clientName}`,
      ['product', 'quantity', 'unitPrice', 'lineTotal'],
    );
  };

  const handleExportReport = () => {
    exportToCSV(
      quotations.map((q) => ({
        quoteNumber: q.quoteNumber,
        clientName: q.clientName,
        clientCompany: q.clientCompany ?? '',
        totalAmount: q.totalAmount,
        status: q.status,
        createdAt: q.createdAt.toISOString().split('T')[0],
        validUntil: q.validUntil ? q.validUntil.toISOString().split('T')[0] : '',
      })),
      'quotation_report.csv',
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 font-bold px-3 py-1">APPROVED</Badge>;
      case 'sent':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 font-bold px-3 py-1">SENT</Badge>;
      case 'rejected':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200 font-bold px-3 py-1">REJECTED</Badge>;
      case 'expired':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200 font-bold px-3 py-1">EXPIRED</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-200 text-gray-600 font-bold px-3 py-1 uppercase tracking-tight">CANCELLED</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 font-bold px-3 py-1 uppercase tracking-tight">Draft</Badge>;
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    const term = searchTerm.toLowerCase();
    return (
      q.quoteNumber.toLowerCase().includes(term) ||
      q.clientName.toLowerCase().includes(term) ||
      (q.clientCompany ?? '').toLowerCase().includes(term)
    );
  });

  // Bab 30 lanjutan: KPI card di bawah dulu angka statis ('156', 'Rp 2.4B',
  // '24', '68%') yang tidak diturunkan dari QUOTATIONS sama sekali.
  const kpiStats = {
    total: quotations.length,
    approvedValue: quotations.filter((q) => q.status === 'approved').reduce((sum, q) => sum + q.totalAmount, 0),
    pendingApproval: quotations.filter((q) => q.status === 'sent').length,
    conversionRate: quotations.length > 0
      ? Math.round((quotations.filter((q) => q.status === 'approved').length / quotations.length) * 100)
      : 0,
  };

  const statusDistribution = (['approved', 'sent', 'expired', 'draft', 'rejected', 'cancelled'] as const)
    .map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: quotations.filter((q) => q.status === status).length,
      color: status === 'approved' ? CHART_STATUS.good : status === 'expired' || status === 'rejected' ? CHART_STATUS.critical : status === 'sent' ? CHART_STATUS.warning : 'var(--muted-foreground)',
    }))
    .filter((entry) => entry.value > 0);

  // Bab 46: Revenue Trend (tab Analytics) dulu pakai ANALYTICS_DATA
  // hardcode, sekarang dihitung dari quotations asli -- 6 bulan
  // terakhir (termasuk bulan kosong, supaya sumbu-x tetap 6 titik),
  // dijumlah dari totalAmount tiap quotation sesuai bulan createdAt-nya.
  const revenueTrendData = (() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString('id-ID', { month: 'short' }), value: 0 };
    });
    const byKey = new Map(months.map((m) => [m.key, m]));
    quotations.forEach((q) => {
      const key = `${q.createdAt.getFullYear()}-${q.createdAt.getMonth()}`;
      const bucket = byKey.get(key);
      if (bucket) bucket.value += q.totalAmount;
    });
    return months.map(({ month, value }) => ({ month, value }));
  })();

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37] flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Quotation Management
          </h1>
          <p className="text-gray-500 mt-1 font-medium italic">Premium Enterprise Sales Solution</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-gray-200 font-bold h-11 px-6 shadow-sm" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
          <Button 
            className="bg-[#013E37] hover:bg-[#02665c] text-white font-bold h-11 px-8 shadow-lg shadow-emerald-900/10"
            onClick={() => { resetQuoteForm(); setShowNewQuoteDialog(true); }}
          >
            <Plus className="mr-2 h-5 w-5" /> New Quotation
          </Button>
        </div>
      </div>

      {/* Advanced Analytics Styled Tabs */}
      <Tabs defaultValue="list" className="space-y-8">
        <TabsList className="w-full h-auto p-1.5 bg-gray-100/80 backdrop-blur-md rounded-2xl border border-gray-200 grid grid-cols-4 gap-1.5">
          <TabsTrigger 
            value="list" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-black text-xs uppercase tracking-tight">Quotations</span>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest group-data-[state=active]:text-white/70">Daftar Penawaran</span>
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-black text-xs uppercase tracking-tight">Analytics</span>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Metrik Performa</span>
          </TabsTrigger>
          <TabsTrigger 
            value="templates" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-black text-xs uppercase tracking-tight">Templates</span>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Master Dokumen</span>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl py-3 flex flex-col gap-0.5 transition-all duration-300"
          >
            <span className="font-black text-xs uppercase tracking-tight">Settings</span>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Konfigurasi</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          {/* Quick Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Quotations', value: String(kpiStats.total), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Approved Value', value: formatCurrency(kpiStats.approvedValue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Pending Approval', value: String(kpiStats.pendingApproval), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Conversion Rate', value: `${kpiStats.conversionRate}%`, icon: Percent, color: 'text-[#013E37]', bg: 'bg-[#EEF7F5]' },
            ].map((stat, i) => (
              <Card key={i} className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
                      <span className="text-2xl font-black text-gray-900 mt-1">{stat.value}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-none shadow-xl shadow-gray-200/50 bg-white overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search by quote number, client or company..." 
                    className="pl-10 h-11 bg-gray-50/50 border-gray-200 focus:ring-[#013E37]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-11 w-11 border-gray-200">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 border-b border-gray-100">
                    <th className="px-6 py-4">Quote Info</th>
                    <th className="px-6 py-4">Client / Entity</th>
                    <th className="px-6 py-4 text-right">Total Amount</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Expiry Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading && (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400 font-bold">Memuat data...</td></tr>
                  )}
                  {!loading && filteredQuotations.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400 font-bold">Belum ada quotation.</td></tr>
                  )}
                  {filteredQuotations.map((quote) => (
                    <tr key={quote.id} className="group hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 group-hover:text-[#013E37] transition-colors">{quote.quoteNumber}</span>
                          <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">CREATED: {formatDate(quote.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#013E37]/10 flex items-center justify-center text-[#013E37] font-black text-xs">
                            {quote.clientName.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">{quote.clientName}</span>
                            <span className="text-xs text-gray-500">{quote.clientCompany}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-black text-gray-900">
                        {formatCurrency(quote.totalAmount)}
                        <span className="block text-[10px] font-bold text-gray-400 uppercase mt-0.5">{quote.items.length} ITEMS</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {getStatusBadge(quote.status)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                          <Calendar className="h-4 w-4 opacity-50" />
                          {quote.validUntil ? formatDate(quote.validUntil) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-[#013E37] hover:bg-[#013E37]/10" onClick={() => {
                            setSelectedQuote(quote);
                            setShowDetailDialog(true);
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 hover:bg-blue-50" onClick={() => openEditQuote(quote)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-[#013E37] hover:bg-[#EEF7F5]" onClick={() => updateQuoteStatus(quote.id, 'sent', 'Quotation dikirim ke client!')} title="Send">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-100">
                <CardTitle className="text-lg font-black text-[#013E37] uppercase tracking-tight">Revenue Trend</CardTitle>
                <CardDescription>Performa nilai penawaran dalam 6 bulan terakhir</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueTrendData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.from}/>
                          <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.to}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} tickFormatter={(value) => `Rp${value/1000000}jt`} />
                      <Tooltip 
                        contentStyle={CHART_TOOLTIP_STYLE} 
                        formatter={(value: any) => [formatCurrency(value), 'Value']}
                      />
                      <Area type="monotone" dataKey="value" stroke={CHART_PRIMARY} strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-gray-100">
                <CardTitle className="text-lg font-black text-[#013E37] uppercase tracking-tight">Status Distribution</CardTitle>
                <CardDescription>Proporsi status penawaran saat ini</CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex items-center justify-center">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {[
               { title: 'Toko & Distributor', desc: 'Untuk pemesanan stok reguler atap & aksesoris toko bangunan.', icon: Package },
               { title: 'Proyek Kontraktor', desc: 'Untuk proyek atap & waterproofing skala besar dengan kontraktor.', icon: Building2 },
               { title: 'Premium & Solar', desc: 'Untuk klien premium (resort/hotel) dengan atap hijau & panel surya.', icon: Sun },
             ].map((tpl, i) => (
               <Card key={i} className="hover:border-[#013E37] transition-colors cursor-pointer group">
                 <CardHeader>
                   <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-[#013E37] group-hover:text-white transition-colors">
                     <tpl.icon className="h-6 w-6" />
                   </div>
                   <CardTitle className="text-lg font-black uppercase tracking-tight">{tpl.title}</CardTitle>
                   <CardDescription className="font-medium text-gray-500">{tpl.desc}</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <Button variant="outline" className="w-full font-bold group-hover:bg-[#013E37] group-hover:text-white transition-colors">Use Template</Button>
                 </CardContent>
               </Card>
             ))}
           </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="max-w-2xl border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-[#013E37]">
                <Settings className="h-6 w-6" /> General Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Default Currency</Label>
                 <Select defaultValue="idr">
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idr">IDR - Indonesian Rupiah</SelectItem>
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Default Tax Rate (%)</Label>
                 <Input type="number" defaultValue="11" className="h-12" />
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Masa Berlaku Penawaran (hari)</Label>
                 <Input type="number" defaultValue="30" className="h-12" />
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Prefix Nomor Penawaran</Label>
                 <Input type="text" defaultValue="QTN" className="h-12" />
               </div>
               <div className="pt-4">
                 <Button className="bg-[#013E37] text-white font-bold h-12 px-8">Save Configuration</Button>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Quotation Dialog */}
      <Dialog open={showNewQuoteDialog} onOpenChange={(open) => { setShowNewQuoteDialog(open); if (!open) resetQuoteForm(); }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <VisuallyHidden>
            <DialogTitle>{editingQuoteId ? 'Edit Quotation' : 'Create New Quotation'}</DialogTitle>
            <DialogDescription>Form to generate a new professional sales quotation</DialogDescription>
          </VisuallyHidden>

          <div className="bg-[#013E37] p-8 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white/20 px-3 py-1 rounded-full">{editingQuoteId ? 'Edit' : 'New Submission'}</span>
                <h2 className="text-2xl font-black mt-4 uppercase tracking-tighter">{editingQuoteId ? 'Edit Quotation' : 'Draft Quotation'}</h2>
                <p className="text-white/70 text-sm mt-1">Lengkapi detail untuk {editingQuoteId ? 'mengubah' : 'membuat'} penawaran harga.</p>
              </div>
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <FileText className="h-10 w-10" />
              </div>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white max-h-[60vh] overflow-y-auto">
             <div className="space-y-6">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Client Email</Label>
                 <Input
                   placeholder="client@company.com"
                   className="h-12"
                   value={quoteForm.clientEmail}
                   onChange={(e) => setQuoteForm((prev) => ({ ...prev, clientEmail: e.target.value }))}
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Contact Person *</Label>
                   <Input
                     placeholder="Name"
                     className="h-12"
                     value={quoteForm.contactPerson}
                     onChange={(e) => setQuoteForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nama Perusahaan/Client *</Label>
                   <Input
                     placeholder="Company Name"
                     className="h-12"
                     value={quoteForm.company}
                     onChange={(e) => setQuoteForm((prev) => ({ ...prev, company: e.target.value }))}
                   />
                 </div>
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Estimasi Total (Rp)</Label>
                 <Input
                   type="number"
                   min="0"
                   placeholder="0"
                   className="h-12"
                   value={quoteForm.estimatedAmount}
                   onChange={(e) => setQuoteForm((prev) => ({ ...prev, estimatedAmount: e.target.value }))}
                 />
               </div>
             </div>
             
             <div className="space-y-6">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pricing Strategy</Label>
                 <Select value={quoteForm.pricingStrategy} onValueChange={(value) => setQuoteForm((prev) => ({ ...prev, pricingStrategy: value }))}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select Pricing Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Enterprise</SelectItem>
                      <SelectItem value="priority">Priority Partner (10% Disc)</SelectItem>
                      <SelectItem value="government">Government/Public Sector</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Valid Until</Label>
                 <Input
                   type="date"
                   className="h-12"
                   value={quoteForm.validUntil}
                   onChange={(e) => setQuoteForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                 />
               </div>
             </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setShowNewQuoteDialog(false); resetQuoteForm(); }} className="h-12 px-8 font-bold">Cancel</Button>
            <Button className="bg-[#013E37] hover:bg-[#02665c] text-white h-12 px-10 font-bold shadow-lg shadow-emerald-900/20" onClick={handleGenerateQuotation}>
              {editingQuoteId ? 'Update Quotation' : 'Generate Quotation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          {selectedQuote && (
            <>
              <VisuallyHidden>
                <DialogTitle>Detail - {selectedQuote.quoteNumber}</DialogTitle>
                <DialogDescription>Full view of the quotation document</DialogDescription>
              </VisuallyHidden>
              
              <div className="flex flex-col md:flex-row h-[85vh]">
                {/* Left Side: Document Preview */}
                <div className="flex-1 bg-gray-100 p-8 overflow-y-auto">
                   <div className="bg-white shadow-2xl rounded-sm p-12 min-h-full mx-auto max-w-2xl border border-gray-200">
                      <div className="flex justify-between items-start mb-12">
                        <div className="h-12 w-48 bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-200 text-[10px] font-black text-gray-300 uppercase italic">
                          Company Logo Here
                        </div>
                        <div className="text-right">
                          <h3 className="text-2xl font-black text-[#013E37] uppercase">Quotation</h3>
                          <p className="text-xs font-bold text-gray-400 mt-1">{selectedQuote.quoteNumber}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-12 mb-12">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Quotation For:</p>
                          <p className="text-sm font-black text-gray-900">{selectedQuote.clientName}</p>
                          <p className="text-xs text-gray-500 mt-1">{selectedQuote.clientCompany}</p>
                          <p className="text-xs text-gray-500">{selectedQuote.clientEmail}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Details:</p>
                          <p className="text-xs text-gray-500">Date: <span className="font-bold text-gray-900">{formatDate(selectedQuote.createdAt)}</span></p>
                          <p className="text-xs text-gray-500">Valid: <span className="font-bold text-gray-900">{selectedQuote.validUntil ? formatDate(selectedQuote.validUntil) : '-'}</span></p>
                        </div>
                      </div>

                      <div className="border-y-2 border-gray-900 py-2 mb-8 flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-900">
                        <span>Description</span>
                        <span>Total</span>
                      </div>

                      <div className="space-y-4 mb-12">
                        {selectedQuote.items.length === 0 && (
                          <p className="text-xs text-gray-400 italic">Belum ada item produk pada quotation ini.</p>
                        )}
                        {selectedQuote.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center text-sm">
                            <span className="font-bold text-gray-900">{item.productName} × {item.quantity}</span>
                            <span className="font-bold">{formatCurrency(item.lineTotal)}</span>
                          </div>
                        ))}
                        {selectedQuote.notes && (
                          <p className="text-xs text-gray-500 leading-relaxed italic">{selectedQuote.notes}</p>
                        )}
                      </div>

                      <div className="border-t-2 border-gray-100 pt-8 flex flex-col items-end">
                        <div className="flex justify-between w-48 mb-2">
                          <span className="text-xs font-bold text-gray-400 uppercase">Subtotal</span>
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(selectedQuote.subtotal)}</span>
                        </div>
                        {selectedQuote.additionalDiscountPercent > 0 && (
                          <div className="flex justify-between w-48 mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase">Additional Disc.</span>
                            <span className="text-sm font-bold text-emerald-600">-{selectedQuote.additionalDiscountPercent}%</span>
                          </div>
                        )}
                        <div className="flex justify-between w-48 pt-4 border-t-2 border-gray-900">
                          <span className="text-xs font-black text-gray-900 uppercase">Grand Total</span>
                          <span className="text-lg font-black text-[#013E37]">{formatCurrency(selectedQuote.totalAmount)}</span>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Right Side: Quick Actions & Status */}
                <div className="w-full md:w-80 bg-white border-l border-gray-100 p-8 space-y-8 overflow-y-auto">
                   <div>
                     <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Current Status</Label>
                     <div className="mt-2">{getStatusBadge(selectedQuote.status)}</div>
                   </div>

                   <Separator />

                   <div className="space-y-4">
                     <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Main Actions</Label>
                     <Button
                       className="w-full bg-[#013E37] text-white font-bold h-12 gap-2 shadow-lg shadow-emerald-900/10"
                       onClick={() => updateQuoteStatus(selectedQuote.id, 'sent', 'Quotation dikirim ke client!')}
                     >
                       <Send className="h-4 w-4" /> Send to Client
                     </Button>
                     <Button variant="outline" className="w-full font-bold h-12 gap-2 border-gray-200" onClick={() => handleDownloadPdf(selectedQuote)}>
                       <Download className="h-4 w-4" /> Download PDF
                     </Button>
                   </div>

                   <div className="space-y-4">
                     <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Internal</Label>
                     <Button
                       variant="ghost"
                       className="w-full justify-start font-bold text-blue-600 hover:bg-blue-50 h-11 gap-3"
                       onClick={() => { setShowDetailDialog(false); openEditQuote(selectedQuote); }}
                     >
                       <Edit className="h-4 w-4" /> Edit Content
                     </Button>
                     <Button
                       variant="ghost"
                       className="w-full justify-start font-bold text-[#013E37] hover:bg-[#EEF7F5] h-11 gap-3"
                       onClick={() => handleDuplicateQuote(selectedQuote)}
                     >
                       <Copy className="h-4 w-4" /> Duplicate
                     </Button>
                     <Button
                       variant="ghost"
                       className="w-full justify-start font-bold text-rose-600 hover:bg-rose-50 h-11 gap-3"
                       onClick={() => updateQuoteStatus(selectedQuote.id, 'cancelled', 'Quotation dibatalkan.')}
                     >
                       <XCircle className="h-4 w-4" /> Cancel Quote
                     </Button>
                   </div>

                   <div className="pt-8 mt-auto">
                     <Button variant="ghost" className="w-full font-black uppercase tracking-widest text-[10px] text-gray-400" onClick={() => setShowDetailDialog(false)}>
                       Close Preview
                     </Button>
                   </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
