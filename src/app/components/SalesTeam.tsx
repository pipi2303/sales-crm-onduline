import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Eye, Edit, Trash2, Users, Mail, Phone, Calendar, Building2, MapPin, FileText, Check, X, Shield, CreditCard, Briefcase, Target, TrendingUp, Award, Activity, UserPlus, Download, Upload, RefreshCw, MessageSquare, Clock, Star, ChevronRight, User, Sparkles, Handshake, Database } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useConfirm } from '@/app/components/ui/confirm-dialog';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/AuthContext';
import { KaryawanFormModal } from '@/app/components/forms/KaryawanForm';
import { ClientFormModal } from '@/app/components/forms/ClientForm';
import { PartnerFormModal } from '@/app/components/forms/PartnerForm';
import { EmployeeDetailDialog } from '@/app/components/EmployeeDetailDialog';
import type { Karyawan } from '@/types/karyawan';
import { ClientDetailDialog } from '@/app/components/ClientDetailDialog';
import { PartnerDetailDialog } from '@/app/components/PartnerDetailDialog';
import { AIInsightsDashboard } from '@/app/components/ai/AIInsightsDashboard';
import { ExportButton } from '@/app/components/ExportButton';
import { employeesApi, partnersApi, communicationsApi } from '@/services/api';
import { clientsRepository } from '@/services/clientsRepository';
import { populateCRMToLocalStorage } from '@/utils/initializeAllData';

const API_URL = 'https://mock-project-id.supabase.co/functions/v1/make-server-67367fc1'; // Disabled - using localStorage

export function SalesTeam() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('client');
  const [loading, setLoading] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivisi, setFilterDivisi] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Karyawan state
  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [showKaryawanForm, setShowKaryawanForm] = useState(false);
  const [editingKaryawan, setEditingKaryawan] = useState<Karyawan | null>(null);
  const [selectedKaryawan, setSelectedKaryawan] = useState<Karyawan | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Client state
  const [clients, setClients] = useState<any[]>([]);
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [showClientDetailDialog, setShowClientDetailDialog] = useState(false);
  const [filterKategori, setFilterKategori] = useState('');

  // Partner state
  const [partners, setPartners] = useState<any[]>([]);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [showPartnerDetailDialog, setShowPartnerDetailDialog] = useState(false);
  const [filterTipePartner, setFilterTipePartner] = useState('');

  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      toast.error('Silakan login terlebih dahulu untuk mengakses CRM Management');
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'karyawan') {
      fetchKaryawan();
    } else if (activeTab === 'client') {
      fetchClients();
    } else if (activeTab === 'partner') {
      fetchPartners();
    }
  }, [activeTab]);

  // Filtered data
  const filteredKaryawan = karyawan.filter((k) => {
    const matchSearch = searchQuery === '' || 
      k.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.nik?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.email_kantor?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchDivisi = filterDivisi === '' || k.divisi === filterDivisi;
    const matchStatus = filterStatus === '' || k.status_karyawan === filterStatus;
    
    return matchSearch && matchDivisi && matchStatus;
  });

  // Filtered Clients
  const filteredClients = clients.filter((c) => {
    const matchSearch = searchQuery === '' || 
      c.nama_entitas?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nama_pic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email_pic?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchKategori = filterKategori === '' || c.kategori_client === filterKategori;
    const matchStatus = filterStatus === '' || c.status_hubungan === filterStatus;
    
    return matchSearch && matchKategori && matchStatus;
  });

  // Filtered Partners
  const filteredPartners = partners.filter((p) => {
    const matchSearch = searchQuery === '' || 
      p.nama_perusahaan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nama_pic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.spesialisasi?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchTipe = filterTipePartner === '' || p.tipe_partner === filterTipePartner;
    const matchStatus = filterStatus === '' || p.status_kemitraan === filterStatus;
    
    return matchSearch && matchTipe && matchStatus;
  });

  // ===== API CALLS =====
  const fetchKaryawan = async (retryCount = 0) => {
    try {
      setLoading(true);
      console.log('🔄 Fetching karyawan from API...');
      
      const result = await employeesApi.getAll();
      
      if (result.success) {
        setKaryawan(result.data || []);
        console.log(`✅ Loaded ${result.data?.length || 0} karyawan`);
      } else {
        console.error('❌ API Error:', result.error);
        toast.error(result.error || 'Failed to load karyawan');
      }
    } catch (error: any) {
      console.error('❌ Error fetching karyawan:', error);
      toast.error(`Error loading karyawan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKaryawan = async (id: string) => {
    if (!(await confirm('Apakah Anda yakin ingin menghapus data karyawan ini?', { variant: 'destructive', confirmText: 'Hapus' }))) return;
    
    try {
      const result = await employeesApi.delete(id);
      
      if (result.success) {
        toast.success('Karyawan berhasil dihapus');
        fetchKaryawan();
      } else {
        toast.error(result.error || 'Failed to delete karyawan');
      }
    } catch (error) {
      toast.error('Error deleting karyawan');
    }
  };

  // Clients functions
  const fetchClients = async () => {
    try {
      setLoading(true);
      const result = await clientsRepository.getAll();
      
      if (result.success) {
        setClients(result.data || []);
      } else {
        toast.error(result.error || 'Failed to load clients');
      }
    } catch (error: any) {
      toast.error(`Error loading clients: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!(await confirm('Apakah Anda yakin ingin menghapus data client ini?', { variant: 'destructive', confirmText: 'Hapus' }))) return;
    
    try {
      const result = await clientsRepository.remove(id);
      
      if (result.success) {
        toast.success('Client berhasil dihapus');
        fetchClients();
      } else {
        toast.error(result.error || 'Failed to delete client');
      }
    } catch (error) {
      toast.error('Error deleting client');
    }
  };

  // Partners functions
  const fetchPartners = async () => {
    try {
      setLoading(true);
      const result = await partnersApi.getAll();
      
      if (result.success) {
        setPartners(result.data || []);
      } else {
        toast.error(result.error || 'Failed to load partners');
      }
    } catch (error: any) {
      toast.error(`Error loading partners: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!(await confirm('Apakah Anda yakin ingin menghapus data partner ini?', { variant: 'destructive', confirmText: 'Hapus' }))) return;
    
    try {
      const result = await partnersApi.delete(id);
      
      if (result.success) {
        toast.success('Partner berhasil dihapus');
        fetchPartners();
      } else {
        toast.error(result.error || 'Failed to delete partner');
      }
    } catch (error) {
      toast.error('Error deleting partner');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">CRM Management</h1>
          <p className="text-gray-500 mt-1">Kelola data Sales Representative, Client, dan Partner</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => {
              const result = populateCRMToLocalStorage();
              if (result.success) {
                toast.success(`✅ ${result.message}\n📊 ${result.data.employees} Sales Rep, ${result.data.clients} Clients, ${result.data.partners} Partners`);
                // Refresh current tab
                if (activeTab === 'karyawan') fetchKaryawan();
                else if (activeTab === 'client') fetchClients();
                else fetchPartners();
              } else {
                toast.error(`❌ ${result.message}`);
              }
            }}
            variant="outline"
            size="sm"
            className="gap-2 border-[#013E37] text-[#013E37] hover:bg-[#013E37] hover:text-white"
          >
            <Database className="h-4 w-4" />
            Load Dummy Data
          </Button>
          <Button
            onClick={() => {
              if (activeTab === 'karyawan') fetchKaryawan();
              else if (activeTab === 'client') fetchClients();
              else fetchPartners();
            }}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[650px] h-14 bg-gray-100/50 p-1">
          <TabsTrigger value="client" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="font-bold text-sm">Client</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">FASKES & INSTITUSI</span>
          </TabsTrigger>
          <TabsTrigger value="partner" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700">
            <div className="flex items-center gap-2">
              <Handshake className="h-4 w-4" />
              <span className="font-bold text-sm">Partner</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">RESELLER & VENDOR</span>
          </TabsTrigger>
          <TabsTrigger value="ai-insights" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-bold text-sm">AI Insights</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">PREDIKSI & ANALITIK</span>
          </TabsTrigger>
        </TabsList>

        {/* KARYAWAN TAB - Removed, now in separate menu */}
        {/* <TabsContent value="karyawan" className="space-y-4">
          {/* Search & Filter */}
          {/* <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Cari nama, NIK, atau email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EEF7F5]0 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={filterDivisi}
                    onChange={(e) => setFilterDivisi(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EEF7F5]0 focus:border-transparent"
                  >
                    <option value="">Semua Divisi</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="IT Developer">IT Developer</option>
                    <option value="Customer Success">Customer Success</option>
                    <option value="Finance">Finance</option>
                    <option value="Legal">Legal</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EEF7F5]0 focus:border-transparent"
                  >
                    <option value="">Semua Status</option>
                    <option value="Tetap">Tetap</option>
                    <option value="Kontrak">Kontrak</option>
                    <option value="Probation">Probation</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Data Sales Representative ({filteredKaryawan.length})
            </h2>
            <div className="flex gap-2">
              <ExportButton
                data={filteredKaryawan}
                filename="Data_Karyawan"
                title="Daftar Karyawan"
                disabled={filteredKaryawan.length === 0}
              />
              <Button
                onClick={() => {
                  setSelectedKaryawan(null);
                  setShowKaryawanForm(true);
                }}
                className="gap-2 bg-[#013E37] hover:bg-[#025C52]"
              >
                <Plus className="h-4 w-4" />
                Tambah Karyawan
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37]"></div>
            </div>
          ) : filteredKaryawan.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Users className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Belum ada data Sales Representative</p>
                <Button
                  onClick={() => setShowKaryawanForm(true)}
                  className="mt-4 gap-2"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Tim Sales Pertama
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredKaryawan.map((k) => (
                <Card 
                  key={k.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedKaryawan(k);
                    setShowDetailDialog(true);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-[#013E37] flex items-center justify-center text-white font-semibold text-lg">
                            {k.nama_lengkap?.charAt(0) || 'K'}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{k.nama_lengkap}</h3>
                            <p className="text-sm text-gray-500">{k.jabatan} - {k.divisi}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">NIK</p>
                            <p className="font-medium text-gray-900">{k.nik}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Email Kantor</p>
                            <p className="font-medium text-gray-900">{k.email_kantor}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Status</p>
                            <Badge variant={k.status_karyawan === 'Tetap' ? 'default' : 'secondary'}>
                              {k.status_karyawan}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-gray-500">Level</p>
                            <Badge variant="outline">{k.level_jabatan}</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          onClick={() => {
                            setEditingKaryawan(k);
                            setShowKaryawanForm(true);
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteKaryawan(k.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent> */}

        {/* CLIENT TAB */}
        <TabsContent value="client" className="space-y-4">
          {/* Search & Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Cari nama entitas, PIC, atau email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={filterKategori}
                    onChange={(e) => setFilterKategori(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Semua Kategori</option>
                    <option value="Rumah Sakit">Rumah Sakit</option>
                    <option value="Puskesmas">Puskesmas</option>
                    <option value="Klinik">Klinik</option>
                    <option value="Praktek Dokter Pribadi">Praktek Dokter Pribadi</option>
                    <option value="Faskes Lainnya">Faskes Lainnya</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Semua Status</option>
                    <option value="Active Client">Active Client</option>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Data Client ({filteredClients.length})
            </h2>
            <div className="flex gap-2">
              <ExportButton
                data={filteredClients}
                filename="Data_Client"
                title="Daftar Client"
                disabled={filteredClients.length === 0}
              />
              <Button
                onClick={() => {
                  setEditingClient(null);
                  setShowClientForm(true);
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Tambah Client Baru
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Building2 className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Belum ada data client</p>
                <Button
                  onClick={() => setShowClientForm(true)}
                  className="mt-4 gap-2"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Client Pertama
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredClients.map((c) => (
                <Card 
                  key={c.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedClient(c);
                    setShowClientDetailDialog(true);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-500 to-[#025C52] flex items-center justify-center text-white font-semibold text-lg">
                            {c.nama_entitas?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{c.nama_entitas}</h3>
                            <p className="text-sm text-gray-500">{c.kategori_client}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">PIC</p>
                            <p className="font-medium text-gray-900">{c.nama_pic}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Status Hubungan</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-help inline-block">
                                  <Badge 
                                    variant={
                                      c.status_hubungan === 'Active Client' ? 'default' : 
                                      c.status_hubungan === 'Hot' ? 'destructive' : 
                                      'secondary'
                                    }
                                  >
                                    {c.status_hubungan}
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="top" 
                                className="max-w-xs text-xs bg-gray-900 text-white px-3 py-2 rounded-md shadow-lg"
                              >
                                {c.status_hubungan === 'Active Client' && (
                                  <p>Has On-Going Contract with INTRAMEDIKA</p>
                                )}
                                {c.status_hubungan === 'Hot' && (
                                  <p>Strong Opportunity : Upside & Forecast</p>
                                )}
                                {c.status_hubungan === 'Warm' && (
                                  <p>Active Pipeline</p>
                                )}
                                {c.status_hubungan === 'Cold' && (
                                  <p>No Recent Opportunity or ever had Project with INTRAMEDIKA</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div>
                            <p className="text-gray-500">Paket Aktif</p>
                            <p className="font-medium text-gray-900">{c.paket_aktif}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Nilai Kontrak</p>
                            <p className="font-medium text-emerald-600">{c.total_nilai_kontrak}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          onClick={() => {
                            setEditingClient(c);
                            setShowClientForm(true);
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteClient(c.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PARTNER TAB */}
        <TabsContent value="partner" className="space-y-4">
          {/* Search & Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Cari nama perusahaan, PIC, atau spesialisasi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#013E37] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={filterTipePartner}
                    onChange={(e) => setFilterTipePartner(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#013E37] focus:border-transparent"
                  >
                    <option value="">Semua Tipe Partner</option>
                    <option value="Reseller">Reseller</option>
                    <option value="Integrator">Integrator</option>
                    <option value="Consultant">Consultant</option>
                    <option value="Vendor">Vendor</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#013E37] focus:border-transparent"
                  >
                    <option value="">Semua Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Data Partner ({filteredPartners.length})
            </h2>
            <div className="flex gap-2">
              <ExportButton
                data={filteredPartners}
                filename="Data_Partner"
                title="Daftar Partner"
                disabled={filteredPartners.length === 0}
              />
              <Button
                onClick={() => {
                  setEditingPartner(null);
                  setShowPartnerForm(true);
                }}
                className="gap-2 bg-[#013E37] hover:bg-[#025C52]"
              >
                <Plus className="h-4 w-4" />
                Tambah Partner
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013E37]"></div>
            </div>
          ) : filteredPartners.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Handshake className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Belum ada data partner</p>
                <Button
                  onClick={() => setShowPartnerForm(true)}
                  className="mt-4 gap-2"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Partner Pertama
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPartners.map((p) => (
                <Card 
                  key={p.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedPartner(p);
                    setShowPartnerDetailDialog(true);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#EEF7F5]0 to-pink-600 flex items-center justify-center text-white font-semibold text-lg">
                            {p.nama_perusahaan?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{p.nama_perusahaan}</h3>
                            <p className="text-sm text-gray-500">{p.tipe_partner}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Spesialisasi</p>
                            <p className="font-medium text-gray-900">{p.spesialisasi}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Status Kemitraan</p>
                            <Badge variant={p.status_kemitraan === 'Active' ? 'default' : 'secondary'}>
                              {p.status_kemitraan}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-gray-500">Tingkat</p>
                            <Badge 
                              variant={
                                p.tingkat_kemitraan === 'Platinum' ? 'default' : 
                                p.tingkat_kemitraan === 'Gold' ? 'secondary' : 
                                'outline'
                              }
                            >
                              {p.tingkat_kemitraan}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-gray-500">Total Revenue</p>
                            <p className="font-medium text-[#013E37]">{p.total_revenue_contribution}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          onClick={() => {
                            setEditingPartner(p);
                            setShowPartnerForm(true);
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeletePartner(p.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AI INSIGHTS TAB */}
        <TabsContent value="ai-insights" className="space-y-4">
          <AIInsightsDashboard />
        </TabsContent>
      </Tabs>

      {/* Forms will be added in next component */}
      {showKaryawanForm && (
        <KaryawanFormModal
          karyawan={editingKaryawan}
          onClose={() => {
            setShowKaryawanForm(false);
            setEditingKaryawan(null);
          }}
          onSuccess={() => {
            setShowKaryawanForm(false);
            setEditingKaryawan(null);
            fetchKaryawan();
          }}
        />
      )}

      {showClientForm && (
        <ClientFormModal
          client={editingClient}
          onClose={() => {
            setShowClientForm(false);
            setEditingClient(null);
          }}
          onSuccess={() => {
            setShowClientForm(false);
            setEditingClient(null);
            fetchClients();
          }}
        />
      )}

      {showPartnerForm && (
        <PartnerFormModal
          partner={editingPartner}
          onClose={() => {
            setShowPartnerForm(false);
            setEditingPartner(null);
          }}
          onSuccess={() => {
            setShowPartnerForm(false);
            setEditingPartner(null);
            fetchPartners();
          }}
        />
      )}

      {/* Employee Detail Dialog */}
      <EmployeeDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        employee={selectedKaryawan}
        onEdit={() => {
          setShowDetailDialog(false);
          setEditingKaryawan(selectedKaryawan);
          setShowKaryawanForm(true);
        }}
      />

      {/* Client Detail Dialog */}
      <ClientDetailDialog
        open={showClientDetailDialog}
        onOpenChange={setShowClientDetailDialog}
        client={selectedClient}
        onEdit={() => {
          setShowClientDetailDialog(false);
          setEditingClient(selectedClient);
          setShowClientForm(true);
        }}
      />

      {/* Partner Detail Dialog */}
      <PartnerDetailDialog
        open={showPartnerDetailDialog}
        onOpenChange={setShowPartnerDetailDialog}
        partner={selectedPartner}
        onEdit={() => {
          setShowPartnerDetailDialog(false);
          setEditingPartner(selectedPartner);
          setShowPartnerForm(true);
        }}
      />
    </div>
  );
}