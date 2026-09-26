import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  User, 
  TrendingDown, 
  Calendar, 
  Filter, 
  Download, 
  Eye, 
  MessageSquare, 
  ChevronRight,
  ShieldCheck,
  Zap,
  History,
  ArrowUpRight,
  Target,
  FileText,
  BadgeCheck,
  MoreVertical,
  Mail,
  ArrowRight,
  TrendingUp,
  LineChart as LineChartIcon,
  Percent,
  MapPin,
  Globe,
  Info,
  CheckSquare
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Legend, AreaChart, Area, ComposedChart, Line } from 'recharts';
import { CHART_PRIMARY, CHART_GRID, CHART_STATUS, CHART_TOOLTIP_STYLE, CHART_TOOLTIP_CURSOR, AREA_GRADIENT_STOPS } from '@/styles/chartTheme';
import { motion, AnimatePresence } from 'motion/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { discountApprovalsRepository } from '@/services/discountApprovalsRepository';
import type { DiscountRequest, ApprovalStep } from '@/types/discountApproval';

// DiscountRequest/ApprovalStep moved to src/types/discountApproval.ts
// (Bab 10 gap #3) so the repository can share the same shape -- see that
// file's header comment for why the fields stay identical to what was
// hardcoded here before.
interface ApprovalPolicy {
  id: string;
  level: number;
  roleName: string;
  minDiscount: number;
  maxDiscount: number;
  approvers: string[];
  slaHours: number;
}

export function DiscountApprovalSystem() {
  const [activeTab, setActiveTab] = useState('requests');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DiscountRequest | null>(null);
  const [isCounterOfferOpen, setIsCounterOfferOpen] = useState(false);
  const [counterPercent, setCounterPercent] = useState<string>('');
  const [counterComment, setCounterComment] = useState<string>('');
  
  // Conditional Approval State
  const [isConditionalOpen, setIsConditionalOpen] = useState(false);
  const [conditionNote, setConditionNote] = useState('');

  // New Request Form State
  const [newRequestData, setNewRequestData] = useState({
    productId: 'prod1',
    clientName: '',
    basePrice: 75000000,
    discountPercent: 15,
    reason: '',
    region: 'DKI Jakarta',
    attachments: [] as File[],
  });

  const productCatalog = {
    prod1: { name: 'Onduline Classic (Atap Bitumen Bergelombang)', hpp: 45000000, defaultPrice: 75000000 },
    prod2: { name: 'Onduline Easyfix (Sistem Atap Cepat Pasang)', hpp: 80000000, defaultPrice: 130000000 },
    prod3: { name: 'Onduvilla (Genteng Bitumen Premium)', hpp: 60000000, defaultPrice: 100000000 },
    prod4: { name: 'Paket Aksesoris & Talang Onduline', hpp: 15000000, defaultPrice: 25000000 },
  };

  const calculatedMargin = useMemo(() => {
    const product = productCatalog[newRequestData.productId as keyof typeof productCatalog];
    const discountAmount = newRequestData.basePrice * (newRequestData.discountPercent / 100);
    const finalPrice = newRequestData.basePrice - discountAmount;
    const margin = ((finalPrice - product.hpp) / finalPrice) * 100;
    const originalMargin = ((newRequestData.basePrice - product.hpp) / newRequestData.basePrice) * 100;
    
    return {
      current: Math.round(margin * 10) / 10,
      original: Math.round(originalMargin * 10) / 10,
      impact: Math.round((margin - originalMargin) * 10) / 10,
      level: newRequestData.discountPercent <= 10 ? 1 : newRequestData.discountPercent <= 20 ? 2 : newRequestData.discountPercent <= 30 ? 3 : 4
    };
  }, [newRequestData.productId, newRequestData.basePrice, newRequestData.discountPercent]);

  const [discountRequests, setDiscountRequests] = useState<DiscountRequest[]>([]);
  const [discountLoading, setDiscountLoading] = useState(true);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Bab 10 gap #3: requests used to be a hardcoded array that never
  // persisted a single decision. Now loaded from
  // discountApprovalsRepository (real DB-backed API).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDiscountLoading(true);
      const res = await discountApprovalsRepository.getAll();
      if (cancelled) return;
      if (res.success && res.data) {
        setDiscountRequests(res.data);
      } else {
        toast.error(res.success ? 'Gagal memuat data discount approval' : res.error);
      }
      setDiscountLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const approvalPolicies = [
    { id: '1', level: 1, roleName: 'Sales Executive', minDiscount: 0, maxDiscount: 10, slaHours: 24 },
    { id: '2', level: 2, roleName: 'Sales Manager', minDiscount: 10, maxDiscount: 20, slaHours: 48 },
    { id: '3', level: 3, roleName: 'Sales Director', minDiscount: 20, maxDiscount: 30, slaHours: 72 },
    { id: '4', level: 4, roleName: 'C-Level', minDiscount: 30, maxDiscount: 50, slaHours: 120 }
  ];

  const regions = ['all', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Sumatera', 'Sulawesi'];

  const marginData = useMemo(() => {
    const baseData = [
      { category: 'SaaS Enterprise', original: 65, proposed: 48, discount: 15, region: 'Jawa Barat' },
      { category: 'Professional Services', original: 40, proposed: 32, discount: 8, region: 'DKI Jakarta' },
      { category: 'Custom Dev', original: 55, proposed: 30, discount: 25, region: 'Jawa Timur' },
      { category: 'Starter Pack', original: 30, proposed: 25, discount: 5, region: 'Sumatera' },
      { category: 'Hardware Bundle', original: 25, proposed: 15, discount: 10, region: 'DKI Jakarta' },
    ];
    
    if (selectedRegion === 'all') return baseData;
    return baseData.filter(d => d.region === selectedRegion);
  }, [selectedRegion]);

  const filteredRequests = discountRequests.filter(r => 
    (r.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || r.requestNumber.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (filterStatus === 'all' || r.status === filterStatus)
  );

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'counter-offer': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const handleApprove = async (req: DiscountRequest) => {
    const conditionsAdded = isConditionalOpen ? conditionNote.trim() : undefined;
    if (isConditionalOpen && !conditionsAdded) {
      toast.error('Syarat khusus wajib diisi');
      return;
    }
    const res = await discountApprovalsRepository.decide(req.id, {
      action: 'approve',
      ...(conditionsAdded && { conditionsAdded, conditions: conditionsAdded }),
    });
    if (!res.success || !res.data) {
      toast.error(res.success ? 'Gagal menyetujui pengajuan' : res.error);
      return;
    }
    const updated = res.data;
    setDiscountRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRequest(updated);
    if (conditionsAdded) {
      toast.success(`Pengajuan ${req.requestNumber} disetujui dengan syarat!`, {
        description: `Syarat: ${conditionsAdded}`,
        icon: <CheckSquare className="h-4 w-4 text-emerald-500" />
      });
    } else if (updated.status === 'approved') {
      toast.success(`Pengajuan ${req.requestNumber} disetujui sepenuhnya.`);
    } else {
      toast.info('Menunggu approver level berikutnya', {
        description: `Menunggu persetujuan Level ${updated.approvalLevel} (${updated.currentApprover}) untuk ${req.requestNumber}`,
        icon: <Mail className="h-4 w-4" />
      });
      toast.success(`Pengajuan ${req.requestNumber} disetujui untuk level saat ini.`);
    }
    setIsConditionalOpen(false);
    setConditionNote('');
  };

  const handleReject = async (req: DiscountRequest) => {
    if (!rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    const res = await discountApprovalsRepository.decide(req.id, {
      action: 'reject',
      comment: rejectReason.trim(),
    });
    if (!res.success || !res.data) {
      toast.error(res.success ? 'Gagal menolak pengajuan' : res.error);
      return;
    }
    setDiscountRequests((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
    setSelectedRequest(res.data);
    toast.success(`Pengajuan ${req.requestNumber} ditolak.`);
    setIsRejectOpen(false);
    setRejectReason('');
  };

  const handleCounterOffer = async () => {
    if (!counterPercent || !selectedRequest) return;

    const newPercent = parseFloat(counterPercent);
    if (Number.isNaN(newPercent)) {
      toast.error('Diskon baru harus berupa angka');
      return;
    }

    const res = await discountApprovalsRepository.decide(selectedRequest.id, {
      action: 'counter-offer',
      counterOfferPercent: newPercent,
      comment: counterComment.trim() || undefined,
    });
    if (!res.success || !res.data) {
      toast.error(res.success ? 'Gagal mengirim counter-offer' : res.error);
      return;
    }
    setDiscountRequests((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
    setSelectedRequest(res.data);
    toast.info(`Counter-offer ${newPercent}% diajukan`, {
      description: `Tersimpan untuk ${selectedRequest.requestedBy}, menunggu tindak lanjut.`,
      icon: <Zap className="h-4 w-4 text-blue-500 animate-pulse" />,
      duration: 5000
    });

    setIsCounterOfferOpen(false);
    setCounterPercent('');
    setCounterComment('');
  };

  const handleCreateRequest = async () => {
    if (!newRequestData.clientName.trim()) {
      toast.error('Nama klien wajib diisi');
      return;
    }
    if (!newRequestData.reason.trim()) {
      toast.error('Justifikasi bisnis wajib diisi');
      return;
    }
    // Bab 30 (24 Sep 2026, hasil deep review + smoke test): dulu tidak ada
    // validasi rentang sama sekali -- diskon negatif bisa lolos jadi
    // "self-approved" (padahal itu kenaikan harga), backend sekarang juga
    // menolak ini (lihat api/handler.ts), tapi dicek di sini dulu supaya
    // user dapat pesan yang jelas tanpa perlu round-trip ke server.
    if (!Number.isFinite(newRequestData.discountPercent) || newRequestData.discountPercent < 0 || newRequestData.discountPercent > 100) {
      toast.error('Discount % harus di antara 0 dan 100');
      return;
    }
    if (!Number.isFinite(newRequestData.basePrice) || newRequestData.basePrice <= 0) {
      toast.error('Base Price harus lebih besar dari 0');
      return;
    }
    const product = productCatalog[newRequestData.productId as keyof typeof productCatalog];
    setCreatingRequest(true);
    try {
      const res = await discountApprovalsRepository.create({
        clientName: newRequestData.clientName.trim(),
        productName: product.name,
        originalPrice: newRequestData.basePrice,
        discountPercent: newRequestData.discountPercent,
        reason: newRequestData.reason.trim(),
        region: newRequestData.region,
        originalMargin: calculatedMargin.original,
        proposedMargin: calculatedMargin.current,
      });
      if (!res.success || !res.data) {
        toast.error(res.success ? 'Gagal mengajukan diskon' : res.error);
        return;
      }
      setDiscountRequests((prev) => [res.data!, ...prev]);
      toast.success(
        res.data.status === 'approved'
          ? `Pengajuan ${res.data.requestNumber} otomatis disetujui (dalam kewenangan self-approval).`
          : `Pengajuan ${res.data.requestNumber} berhasil diajukan, menunggu Level ${res.data.approvalLevel}.`
      );
      setShowRequestDialog(false);
      setNewRequestData({
        productId: 'prod1',
        clientName: '',
        basePrice: productCatalog.prod1.defaultPrice,
        discountPercent: 15,
        reason: '',
        region: 'DKI Jakarta',
        attachments: [],
      });
    } finally {
      setCreatingRequest(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">
            Discount Approval
          </h1>
          <p className="text-gray-500 font-medium flex items-center gap-2 mt-2">
            <ShieldCheck className="h-4 w-4 text-[#013E37]" />
            Sistem persetujuan diskon berjenjang dengan tata kelola & kepatuhan otomatis.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-xs px-4">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={() => setShowRequestDialog(true)} className="bg-[#013E37] hover:bg-[#028076] text-white font-bold uppercase tracking-wider text-xs px-6 shadow-lg shadow-[#013E37]/20">
            <Plus className="h-4 w-4 mr-2" /> New Request
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full h-auto p-1 bg-gray-100/50 backdrop-blur-sm rounded-xl border border-gray-200 grid grid-cols-3">
          <TabsTrigger value="requests" className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Antrean Pengajuan</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Daftar Aktif</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Kebijakan & Matriks</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Aturan Berjenjang</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-[#013E37] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-3 flex flex-col gap-0.5">
            <span className="font-bold text-sm uppercase tracking-tight">Insight Performa</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Tren & Analitik</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Cari pengajuan atau klien..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px] bg-gray-50 font-bold text-xs uppercase tracking-wider">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="approved">Disetujui</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                  <SelectItem value="counter-offer">Counter-Offer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredRequests.map((request, idx) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className="group hover:border-[#013E37]/50 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border-gray-100"
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowDetailDialog(true);
                  }}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row items-stretch">
                      <div className="p-6 flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-[#013E37] uppercase tracking-widest bg-[#EEF7F5] px-2 py-0.5 rounded">
                                {request.requestNumber}
                              </span>
                              <Badge variant="outline" className={`px-2 py-0 border ${getStatusStyle(request.status)}`}>
                                <span className="text-[10px] font-bold uppercase tracking-widest">{request.status}</span>
                              </Badge>
                              <Badge variant="ghost" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {request.region}
                              </Badge>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 group-hover:text-[#013E37] transition-colors">
                              {request.clientName}
                            </h3>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Value</p>
                            <p className="text-lg font-black text-emerald-600">{formatCurrency(request.finalPrice)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produk</p>
                            <p className="text-xs font-bold text-gray-700 truncate">{request.productName}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Diajukan Oleh</p>
                            <p className="text-xs font-bold text-gray-700">{request.requestedBy}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Diskon</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-rose-600">{request.discountPercent}%</span>
                              <span className="text-[10px] text-gray-400 line-through">{formatCurrency(request.originalPrice)}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Margin Saat Ini</p>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className={`h-3 w-3 ${request.proposedMargin > 30 ? 'text-emerald-500' : 'text-amber-500'}`} />
                              <span className="text-xs font-bold text-gray-700">{request.proposedMargin}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="lg:w-48 bg-gray-50 flex lg:flex-col items-center justify-center p-4 gap-3 border-t lg:border-t-0 lg:border-l border-gray-100">
                        <Button variant="ghost" className="w-full text-[#013E37] hover:bg-white font-bold text-xs">
                          <Eye className="h-4 w-4 mr-2" /> Detail
                        </Button>
                        <Button className="w-full bg-[#013E37] hover:bg-[#028076] text-white font-bold text-xs shadow-md">
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#013E37] rounded-2xl p-8 text-white relative overflow-hidden shadow-xl mb-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black uppercase tracking-tight">Sistem Notifikasi Real-Time</h2>
                  <p className="text-white/70 font-medium max-w-md">Sales Executive akan menerima notifikasi instan saat Counter-Offer diajukan atau pengajuan disetujui dengan syarat.</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex items-center space-x-2 bg-emerald-400/20 px-4 py-2 rounded-xl border border-emerald-400/30">
                      <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase text-emerald-400">Notif Sync ON</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              {approvalPolicies.map((policy, idx) => (
                <div key={policy.id} className="relative group">
                  <Card className="relative z-10 border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#013E37] to-[#028076] flex items-center justify-center text-white font-black text-xl shadow-lg border-4 border-white">
                          L{policy.level}
                        </div>
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">{policy.roleName}</h3>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <Info className="h-3 w-3 text-[#013E37]" /> Persetujuan Bersyarat Diaktifkan
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Authority Range</p>
                              <p className="text-2xl font-black text-[#013E37]">{policy.minDiscount}% - {policy.maxDiscount}%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Filter Analitik</h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Sesuaikan visualisasi data berdasarkan wilayah operasional</p>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Wilayah:</Label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-[200px] bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Semua Wilayah" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(r => (
                    <SelectItem key={r} value={r} className="text-xs font-bold uppercase">{r === 'all' ? 'Semua Wilayah' : r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-gray-100 overflow-hidden shadow-sm">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                   <Globe className="h-4 w-4 text-[#013E37]" />
                   Margin vs Diskon Per Wilayah
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[400px] p-6">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={selectedRegion}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={marginData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                        <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} unit="%" />
                        <Tooltip 
                          cursor={CHART_TOOLTIP_CURSOR}
                          contentStyle={CHART_TOOLTIP_STYLE}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                        <Bar name="Original Margin" dataKey="original" fill="var(--border)" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar name="Proposed Margin" dataKey="proposed" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} barSize={30} />
                        <Line name="Discount %" type="monotone" dataKey="discount" stroke={CHART_STATUS.critical} strokeWidth={3} dot={{ r: 4, fill: CHART_STATUS.critical, strokeWidth: 2, stroke: '#fff' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>

            <Card className="border-gray-100 overflow-hidden shadow-sm">
               <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                   <TrendingUp className="h-4 w-4 text-[#013E37]" />
                   Dampak Revenue {selectedRegion !== 'all' ? `- ${selectedRegion}` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[400px] p-6 flex flex-col items-center justify-center">
                {marginData.length === 0 ? (
                  <div className="text-center space-y-2">
                    <AlertCircle className="h-12 w-12 text-gray-200 mx-auto" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tidak ada data untuk wilayah ini</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { name: 'W1', revenue: 400 + (Math.random() * 200), saved: 40 + (Math.random() * 20) },
                      { name: 'W2', revenue: 600 + (Math.random() * 200), saved: 80 + (Math.random() * 20) },
                      { name: 'W3', revenue: 500 + (Math.random() * 200), saved: 120 + (Math.random() * 20) },
                      { name: 'W4', revenue: 800 + (Math.random() * 200), saved: 150 + (Math.random() * 20) },
                    ]}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.from}/>
                          <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={AREA_GRADIENT_STOPS.to}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="revenue" stroke={CHART_PRIMARY} fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                      <Area type="monotone" dataKey="saved" stroke={CHART_STATUS.critical} fill={CHART_STATUS.critical} fillOpacity={0.05} strokeWidth={2} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none rounded-2xl shadow-2xl bg-white">
          <VisuallyHidden>
            <DialogTitle>New Discount Request</DialogTitle>
            <DialogDescription>Submit a new discount approval request for a client opportunity</DialogDescription>
          </VisuallyHidden>

          <div className="bg-[#013E37] p-8 text-white relative shrink-0">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-2xl" />
            <div className="relative z-10 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white/20 px-3 py-1 rounded-full text-white">New Submission</span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-4">Draft Request</h2>
              <p className="text-white/70 text-sm font-medium italic">Sistem akan otomatis menentukan Level Persetujuan berdasarkan besaran diskon.</p>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nama Klien / Toko</Label>
                <Input
                  placeholder="Contoh: Toko Bangunan Makmur Jaya"
                  className="h-12 border-gray-200"
                  value={newRequestData.clientName}
                  onChange={(e) => setNewRequestData({ ...newRequestData, clientName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Region</Label>
                <Select
                  value={newRequestData.region}
                  onValueChange={(val) => setNewRequestData({ ...newRequestData, region: val })}
                >
                  <SelectTrigger className="h-12 border-gray-200">
                    <SelectValue placeholder="Pilih Region..." />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.filter((r) => r !== 'all').map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Product Line</Label>
                <Select 
                  value={newRequestData.productId} 
                  onValueChange={(val) => setNewRequestData({
                    ...newRequestData, 
                    productId: val, 
                    basePrice: productCatalog[val as keyof typeof productCatalog].defaultPrice
                  })}
                >
                  <SelectTrigger className="h-12 border-gray-200">
                    <SelectValue placeholder="Pilih Produk..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(productCatalog).map(([id, p]) => (
                      <SelectItem key={id} value={id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Base Price (IDR)</Label>
                  <Input 
                    type="number" 
                    placeholder="Original Price" 
                    className="h-12 border-gray-200" 
                    value={newRequestData.basePrice}
                    onChange={(e) => setNewRequestData({...newRequestData, basePrice: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Discount %</Label>
                  <Input 
                    type="number" 
                    min={0}
                    max={100}
                    step={1}
                    placeholder="%" 
                    className="h-12 border-gray-200" 
                    value={newRequestData.discountPercent}
                    onChange={(e) => setNewRequestData({...newRequestData, discountPercent: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Supporting Documents (Competitor Price, etc.)</Label>
                <div className="border-2 border-dashed border-gray-100 rounded-xl p-6 text-center space-y-3 hover:border-[#013E37]/30 transition-colors cursor-pointer relative group">
                  <input 
                    type="file" 
                    multiple 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => {
                      if (e.target.files) {
                        setNewRequestData({...newRequestData, attachments: [...newRequestData.attachments, ...Array.from(e.target.files)]});
                        toast.success(`${e.target.files.length} file(s) attached`);
                      }
                    }}
                  />
                  <div className="mx-auto h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#013E37]/10 group-hover:text-[#013E37] transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Click to upload or drag files</p>
                </div>
                {newRequestData.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newRequestData.attachments.map((file, i) => (
                      <Badge key={i} variant="secondary" className="gap-2 px-3 py-1 bg-gray-100 border-none text-[10px] font-bold uppercase tracking-widest">
                        <FileText className="h-3 w-3" /> {file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-[#f8fafc] rounded-2xl border border-gray-100 space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-[#013E37]">Discount Requested (%)</Label>
                  <span className="text-2xl font-black text-rose-600">{newRequestData.discountPercent}%</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
                    <span>Proposed Margin</span>
                    <span className={`font-black ${calculatedMargin.current < 25 ? 'text-rose-600' : calculatedMargin.current < 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {calculatedMargin.current}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${calculatedMargin.current < 25 ? 'bg-rose-500' : calculatedMargin.current < 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.max(0, Math.min(100, calculatedMargin.current))}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <span>Impact: {calculatedMargin.impact}%</span>
                    <span>Original: {calculatedMargin.original}%</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Required Level</p>
                    <p className="text-sm font-black text-[#013E37]">
                      Level {calculatedMargin.level}: {approvalPolicies.find(p => p.level === calculatedMargin.level)?.roleName}
                    </p>
                  </div>
                  <Badge className="bg-[#013E37] text-white px-3 py-1 font-bold">AUTO-ROUTING</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Business Justification</Label>
                <Textarea
                  placeholder="Berikan alasan mendetail mengapa diskon ini diperlukan..."
                  className="min-h-[100px] border-gray-200 text-gray-900"
                  value={newRequestData.reason}
                  onChange={(e) => setNewRequestData({ ...newRequestData, reason: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={() => setShowRequestDialog(false)} className="h-12 px-8 font-bold border-gray-200 uppercase tracking-widest text-xs">Cancel</Button>
            <Button 
              className="bg-[#013E37] hover:bg-[#028076] text-white h-12 px-10 font-bold shadow-lg shadow-emerald-900/20 uppercase tracking-widest text-xs"
              onClick={handleCreateRequest}
              disabled={creatingRequest}
            >
              {creatingRequest ? 'Mengirim...' : 'Submit Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none rounded-2xl shadow-2xl">
          {selectedRequest && (
            <div className="flex flex-col h-full max-h-[95vh]">
              <DialogHeader className="sr-only">
                <DialogTitle>Approval Request - {selectedRequest.clientName}</DialogTitle>
                <DialogDescription>
                  Detailed discount approval request information for {selectedRequest.clientName}
                </DialogDescription>
              </DialogHeader>
              <div className="bg-[#013E37] p-8 text-white relative shrink-0">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-2xl" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black uppercase tracking-[0.2em] bg-white/20 px-3 py-1 rounded-full">{selectedRequest.requestNumber}</span>
                      <Badge variant="outline" className={`border-white/30 text-white ${getStatusStyle(selectedRequest.status)} bg-white/10 px-4 py-1`}>
                        {selectedRequest.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">{selectedRequest.region}</span>
                    </div>
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight leading-none">{selectedRequest.clientName}</h2>
                </div>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Value</p>
                    <p className="text-lg font-black text-[#013E37]">{formatCurrency(selectedRequest.finalPrice)}</p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 space-y-1">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Diskon (%)</p>
                    <p className="text-lg font-black text-rose-600">{selectedRequest.discountPercent}%</p>
                  </div>
                   <div className="p-4 bg-[#EEF7F5] rounded-xl border border-[#DFF0EC] space-y-1">
                    <p className="text-[10px] font-black text-[#038E7D] uppercase tracking-widest">Original Margin</p>
                    <p className="text-lg font-black text-[#013E37]">{selectedRequest.originalMargin}%</p>
                  </div>
                   <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Proposed Margin</p>
                    <p className="text-lg font-black text-emerald-600">{selectedRequest.proposedMargin}%</p>
                  </div>
                </div>

                <AnimatePresence>
                  {isCounterOfferOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                       <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-blue-600" />
                          <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">Kirim Real-Time Counter-Offer</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-blue-700 tracking-widest">Diskon Baru (%)</Label>
                            <Input 
                              type="number" 
                              placeholder="Contoh: 12" 
                              className="bg-white border-blue-200"
                              value={counterPercent}
                              onChange={(e) => setCounterPercent(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-blue-700 tracking-widest">Justifikasi</Label>
                            <Input 
                              placeholder="Komentar untuk Sales..." 
                              className="bg-white border-blue-200"
                              value={counterComment}
                              onChange={(e) => setCounterComment(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setIsCounterOfferOpen(false)} className="text-blue-700 font-bold uppercase text-[10px] tracking-widest">Batal</Button>
                          <Button size="sm" onClick={handleCounterOffer} className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-blue-200">Kirim & Notif Sales</Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {isConditionalOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                       <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                          <h4 className="text-sm font-black text-emerald-900 uppercase tracking-tight">Setujui Dengan Syarat (Conditional)</h4>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-emerald-700 tracking-widest">Syarat Khusus</Label>
                          <Textarea 
                            placeholder="Contoh: Kontrak harus diperpanjang minimal 2 tahun atau pembayaran dimuka 50%." 
                            className="bg-white border-emerald-200"
                            value={conditionNote}
                            onChange={(e) => setConditionNote(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setIsConditionalOpen(false)} className="text-emerald-700 font-bold uppercase text-[10px] tracking-widest">Batal</Button>
                          <Button size="sm" onClick={() => handleApprove(selectedRequest)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-200">Simpan & Setujui</Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {isRejectOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                       <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="h-4 w-4 text-rose-600" />
                          <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">Tolak Pengajuan</h4>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-rose-700 tracking-widest">Alasan Penolakan</Label>
                          <Textarea 
                            placeholder="Jelaskan alasan penolakan pengajuan diskon ini..." 
                            className="bg-white border-rose-200"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setIsRejectOpen(false)} className="text-rose-700 font-bold uppercase text-[10px] tracking-widest">Batal</Button>
                          <Button size="sm" onClick={() => handleReject(selectedRequest)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-rose-200">Konfirmasi Tolak</Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#013E37]" /> Alasan Pengajuan
                  </h4>
                  <div className="p-5 bg-gray-50 rounded-xl border border-gray-100 italic text-gray-700 leading-relaxed shadow-inner">
                    "{selectedRequest.reason}"
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <History className="h-4 w-4 text-[#013E37]" /> Riwayat Persetujuan
                  </h4>
                  <div className="space-y-4 relative">
                    {selectedRequest.approvalHistory.map((step, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 ${step.action === 'approved' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {step.action === 'approved' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </div>
                          {idx < selectedRequest.approvalHistory.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-100 -mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4 border-b border-gray-50 last:border-0">
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <p className="text-sm font-black text-gray-900">{step.approverName}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{step.approverRole}</p>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">{step.date ? formatDate(step.date) : 'In Progress'}</span>
                          </div>
                          {step.comment && (
                            <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">{step.comment}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4 shrink-0">
                <Button variant="outline" className="font-bold text-xs uppercase tracking-widest border-gray-200 h-11" onClick={() => setShowDetailDialog(false)}>
                  Kembali
                </Button>
                <div className="flex gap-3">
                  {!isCounterOfferOpen && !isConditionalOpen && !isRejectOpen && selectedRequest.status === 'pending' && (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCounterOfferOpen(true)}
                        className="text-blue-600 hover:bg-blue-50 border-blue-200 font-black text-xs uppercase tracking-widest px-6 h-11"
                      >
                        Counter-Offer
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsConditionalOpen(true)}
                        className="text-emerald-600 hover:bg-emerald-50 border-emerald-200 font-black text-xs uppercase tracking-widest px-6 h-11"
                      >
                        Conditional Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsRejectOpen(true)}
                        className="text-rose-600 hover:bg-rose-50 border-rose-200 font-black text-xs uppercase tracking-widest px-6 h-11"
                      >
                        Tolak
                      </Button>
                    </>
                  )}
                  {!isCounterOfferOpen && !isConditionalOpen && !isRejectOpen && selectedRequest.status === 'pending' && (
                    <Button 
                      className="bg-[#013E37] hover:bg-[#028076] text-white font-black text-xs uppercase tracking-widest px-8 h-11 shadow-lg shadow-[#013E37]/20"
                      onClick={() => handleApprove(selectedRequest)}
                    >
                      Setujui Level {selectedRequest.approvalLevel}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
