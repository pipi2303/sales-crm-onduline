import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Eye, Phone, Mail, Building2, RefreshCw, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useConfirm } from '@/app/components/ui/confirm-dialog';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import type { Lead } from '@/types/lead';
import { toast } from 'sonner';
import { leadsRepository } from '@/services/leadsRepository';
import { formatCurrency } from '@/utils/formatters';

interface Company {
  name: string;
  position: string;
  department?: string;
  email?: string;
  phone?: string;
}

interface ExtendedLead extends Lead {
  companies?: Company[];
  position?: string;
}

export function LeadManagement() {
  const confirm = useConfirm();
  const [leads, setLeads] = useState<ExtendedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<ExtendedLead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ExtendedLead>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([{ name: '', position: '' }]);
  const [detailCompanies, setDetailCompanies] = useState<Company[]>([]);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState<Company>({ name: '', position: '', department: '', email: '', phone: '' });

  const statusColors: Record<string, string> = {
    new: 'bg-[#EEF7F5] text-[#013E37]',
    contacted: 'bg-yellow-100 text-yellow-800',
    qualified: 'bg-[#EEF7F5] text-[#013E37]',
    proposal: 'bg-[#EEF7F5] text-[#013E37]',
    negotiation: 'bg-orange-100 text-orange-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800'
  };

  // Fetch leads from Supabase
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const result = await leadsRepository.getAll();
      
      if (result.success && result.data) {
        setLeads(result.data);
      } else {
        toast.error(result.error || 'Failed to load leads');
      }
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast.error('Error loading leads');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddLead = () => {
    // FIX: default status 'new' agar konsisten dgn tampilan Select di form
    // (sebelumnya formData.status kosong sampai user membuka dropdown,
    // menyebabkan badge status lead baru tampil kosong di daftar)
    setFormData({ status: 'new' });
    setSelectedLead(null);
    setCompanies([{ name: '', position: '' }]);
    setIsDialogOpen(true);
  };

  const handleEditLead = (lead: ExtendedLead) => {
    setFormData(lead);
    setSelectedLead(lead);
    // Initialize companies from lead data
    if (lead.companies && lead.companies.length > 0) {
      setCompanies(lead.companies);
    } else {
      // Fallback to single company
      setCompanies([{ name: lead.company || '', position: lead.position || '' }]);
    }
    setIsDialogOpen(true);
  };

  const handleAddCompany = () => {
    setCompanies([...companies, { name: '', position: '' }]);
  };

  const handleRemoveCompany = (index: number) => {
    if (companies.length > 1) {
      setCompanies(companies.filter((_, i) => i !== index));
    }
  };

  const handleCompanyChange = (index: number, field: 'name' | 'position' | 'department' | 'email' | 'phone', value: string) => {
    const updatedCompanies = companies.map((company, i) => 
      i === index ? { ...company, [field]: value } : company
    );
    setCompanies(updatedCompanies);
  };

  const handleSaveLead = async () => {
    if (!formData.name || !formData.email || !formData.company) {
      toast.error('Mohon lengkapi semua field yang diperlukan');
      return;
    }

    try {
      setIsSubmitting(true);

      // Bab 30 (24 Sep 2026, hasil deep review + smoke test grup Sales
      // Pipeline): `companies` (state edited via handleCompanyChange/
      // handleAddCompany/handleRemoveCompany above) was never merged into
      // the submit payload -- only bare `formData` was sent, so anything
      // typed into the "Perusahaan" editor was silently discarded on Save.
      // Filter out fully-empty rows (an untouched extra row added via
      // "+ Tambah Perusahaan" and never filled in) before sending.
      const nonEmptyCompanies = companies.filter((c) => c.name.trim() || c.position.trim());
      const payload = { ...formData, companies: nonEmptyCompanies };

      if (selectedLead) {
        // Update existing lead
        const result = await leadsRepository.update(selectedLead.id, payload);
        
        if (result.success && result.data) {
          setLeads(leads.map(l => l.id === selectedLead.id ? result.data : l));
          toast.success('Lead berhasil diupdate!');
        } else {
          toast.error(result.error || 'Gagal mengupdate lead');
        }
      } else {
        // Create new lead
        // Defensive default: pastikan status tidak pernah kosong walau form belum disentuh
        const result = await leadsRepository.create({ status: 'new', ...payload });
        
        if (result.success && result.data) {
          setLeads([...leads, result.data]);
          toast.success('Lead berhasil ditambahkan!');
        } else {
          toast.error(result.error || 'Gagal menambahkan lead');
        }
      }

      setIsDialogOpen(false);
      setFormData({});
      setSelectedLead(null);
    } catch (error: any) {
      console.error('Error saving lead:', error);
      toast.error('Terjadi kesalahan saat menyimpan lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!(await confirm('Apakah Anda yakin ingin menghapus lead ini?', { variant: 'destructive', confirmText: 'Hapus' }))) {
      return;
    }

    try {
      const result = await leadsRepository.remove(leadId);
      
      if (result.success) {
        setLeads(leads.filter(l => l.id !== leadId));
        toast.success('Lead berhasil dihapus!');
      } else {
        toast.error(result.error || 'Gagal menghapus lead');
      }
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast.error('Terjadi kesalahan saat menghapus lead');
    }
  };

  const handleClearAllLeads = async () => {
    if (!(await confirm('⚠️ PERHATIAN: Apakah Anda yakin ingin menghapus SEMUA lead? Tindakan ini tidak dapat dibatalkan!', { variant: 'destructive', confirmText: 'Hapus Semua', title: 'Hapus Semua Lead' }))) {
      return;
    }

    try {
      const result = await leadsRepository.clearAll();
      
      if (result.success) {
        setLeads([]);
        toast.success('Semua lead berhasil dihapus!');
      } else {
        toast.error(result.error || 'Gagal menghapus semua lead');
      }
    } catch (error: any) {
      console.error('Error clearing all leads:', error);
      toast.error('Terjadi kesalahan saat menghapus semua lead');
    }
  };

  const handleViewDetail = (lead: ExtendedLead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
    if (lead.companies) {
      setDetailCompanies(lead.companies);
    } else {
      setDetailCompanies([{ name: lead.company || '', position: lead.position || '' }]);
    }
  };

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
            Lead Management
          </h1>
          <p className="text-gray-600 mt-1">Kelola leads dengan integrasi Supabase real-time</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchLeads}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          {leads.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleClearAllLeads}
              className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </Button>
          )}
          <Button onClick={handleAddLead} className="bg-[#013E37] hover:bg-[#025C52] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Lead
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cari lead (nama, company, email)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads List View */}
      <div className="space-y-4">
        {filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => (
            <Card 
              key={lead.id} 
              className="hover:shadow-md transition-all border border-gray-200 bg-white cursor-pointer"
              onClick={() => handleViewDetail(lead)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  {/* Left Section - Lead Info */}
                  <div className="flex-1 space-y-3">
                    {/* Name and Status */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">{lead.name}</h3>
                      <Badge className={`${statusColors[lead.status] || 'bg-gray-100 text-gray-800'} px-2.5 py-0.5 text-xs font-medium rounded`}>
                        {lead.status}
                      </Badge>
                    </div>

                    {/* Company */}
                    <p className="text-sm text-gray-500 flex items-center">
                      <Building2 className="w-3.5 h-3.5 mr-1.5" />
                      {lead.company}
                    </p>

                    {/* Contact Info */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-3.5 h-3.5 mr-2 text-gray-400" />
                        <span>{lead.email}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" />
                        <span>{lead.phone}</span>
                      </div>
                    </div>

                    {/* Lead Value */}
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Nilai Lead</p>
                      <p className="text-xl font-bold text-[#013E37]">
                        {formatCurrency(lead.value || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-[#EEF7F5] hover:text-[#013E37] hover:border-[#013E37]" 
                      onClick={() => handleEditLead(lead)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                      onClick={() => handleDeleteLead(lead.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">Tidak ada lead ditemukan</p>
            </CardContent>
          </Card>
        )}
      </div>

      {filteredLeads.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Tidak ada lead ditemukan</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedLead ? 'Edit Lead' : 'Tambah Lead Baru'}
            </DialogTitle>
            <DialogDescription>
              {selectedLead ? 'Perbarui informasi lead Anda' : 'Masukkan detail lead baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Row 1: Nama & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nama *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama lengkap"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@gmail.com"
                  className="h-10"
                />
              </div>
            </div>

            {/* Row 2: Telepon & Perusahaan */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Telepon</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+62..."
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm font-medium text-gray-700">Perusahaan *</Label>
                <Input
                  id="company"
                  value={formData.company || ''}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Nama perusahaan"
                  className="h-10"
                />
              </div>
            </div>

            {/* Row 3: Posisi & Sumber */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position" className="text-sm font-medium text-gray-700">Posisi</Label>
                <Input
                  id="position"
                  value={formData.position || ''}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Posisi di perusahaan"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source" className="text-sm font-medium text-gray-700">Sumber</Label>
                <Select 
                  value={formData.source || ''} 
                  onValueChange={(value) => setFormData({ ...formData, source: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pilih sumber" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="cold-call">Cold Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Status & Nilai Lead */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status</Label>
                <Select 
                  value={formData.status || 'new'} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value" className="text-sm font-medium text-gray-700">Nilai Lead (Rp)</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value || ''}
                  onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="h-10"
                />
              </div>
            </div>

            {/* Row 5: Catatan */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Catatan tambahan..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Companies */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Perusahaan</h3>
              {companies.map((company, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Input
                    value={company.name}
                    onChange={(e) => handleCompanyChange(index, 'name', e.target.value)}
                    placeholder="Nama perusahaan"
                    className="h-10 flex-1"
                  />
                  <Input
                    value={company.position}
                    onChange={(e) => handleCompanyChange(index, 'position', e.target.value)}
                    placeholder="Posisi"
                    className="h-10 flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                    onClick={() => handleRemoveCompany(index)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-[#EEF7F5] hover:text-[#013E37] hover:border-[#013E37]"
                onClick={handleAddCompany}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Tambah Perusahaan
              </Button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)} 
              disabled={isSubmitting}
              className="px-6"
            >
              Batal
            </Button>
            <Button 
              onClick={handleSaveLead} 
              disabled={isSubmitting}
              className="bg-[#013E37] hover:bg-[#025C52] text-white px-6"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="!max-w-[950px] w-full max-h-[calc(100%-2rem)] overflow-hidden flex flex-col p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Detail Lead - {selectedLead?.name}</DialogTitle>
            <DialogDescription>Informasi karyawan dan perusahaan yang di-lead</DialogDescription>
          </DialogHeader>
          
          {/* Visual Header */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detail Lead</h2>
                <p className="text-sm text-gray-500 mt-0.5">Informasi karyawan dan perusahaan yang di-lead</p>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-gray-400 hover:text-gray-600 -mt-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {selectedLead ? (
            <>
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 text-gray-900">
                <div className="space-y-5">
                  {/* Section Perusahaan */}
                  <div className="space-y-3 -mx-6 px-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900 flex items-center">
                        <Building2 className="w-4 h-4 mr-2 text-[#013E37]" />
                        Perusahaan yang di Lead
                      </h3>
                      <Button
                        size="sm"
                        className="bg-[#013E37] text-white hover:bg-[#025C52] h-8 text-xs px-3"
                        onClick={() => setIsAddingCompany(true)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Tambah Perusahaan
                      </Button>
                    </div>

                    {/* Table */}
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr className="border-b border-gray-200">
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">No</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Perusahaan</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Posisi</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Departemen</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Telepon</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {detailCompanies.length > 0 ? (
                            detailCompanies.map((company, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2.5 text-xs text-gray-600">{index + 1}</td>
                                <td className="px-3 py-2.5 text-xs text-gray-900 font-medium">{company.name || '-'}</td>
                                <td className="px-3 py-2.5 text-xs text-gray-700">{company.position || '-'}</td>
                                <td className="px-3 py-2.5 text-xs text-gray-700">{company.department || '-'}</td>
                                <td className="px-3 py-2.5 text-xs text-gray-700">{company.email || '-'}</td>
                                <td className="px-3 py-2.5 text-xs text-gray-700">{company.phone || '-'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-3 py-6 text-center text-gray-500 text-xs">
                                Belum ada data perusahaan
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Form Add Company */}
                    {isAddingCompany && (
                      <div className="mt-3 p-4 border border-[#C3DDD9] rounded-md bg-[#EEF7F5]/30">
                        <h4 className="font-medium text-sm text-gray-900 mb-3">Tambah Perusahaan Baru</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">Nama Perusahaan *</Label>
                            <Input
                              value={newCompany.name}
                              onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                              placeholder="PT. Contoh Perusahaan"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">Posisi *</Label>
                            <Input
                              value={newCompany.position}
                              onChange={(e) => setNewCompany({ ...newCompany, position: e.target.value })}
                              placeholder="Direktur, Manager, dll"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">Departemen</Label>
                            <Input
                              value={newCompany.department || ''}
                              onChange={(e) => setNewCompany({ ...newCompany, department: e.target.value })}
                              placeholder="IT, Sales, HR, dll"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">Email</Label>
                            <Input
                              type="email"
                              value={newCompany.email || ''}
                              onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                              placeholder="email@gmail.com"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5 col-span-2">
                            <Label className="text-xs font-medium text-gray-700">Telepon</Label>
                            <Input
                              value={newCompany.phone || ''}
                              onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                              placeholder="+62..."
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="bg-[#013E37] text-white hover:bg-[#025C52] h-8 text-xs"
                            disabled={isSubmitting}
                            onClick={async () => {
                              if (!newCompany.name || !newCompany.position) {
                                toast.error('Nama perusahaan dan posisi wajib diisi');
                                return;
                              }
                              if (!selectedLead) return;
                              // Bab 30 (24 Sep 2026, hasil deep review + smoke test grup
                              // Sales Pipeline): tombol ini sebelumnya CUMA update state
                              // lokal (setDetailCompanies) + toast sukses -- tidak pernah
                              // ada panggilan API sama sekali, jadi "berhasil ditambahkan"
                              // itu bohong: data hilang begitu dialog/lead dibuka ulang.
                              const updatedCompanies = [...detailCompanies, newCompany];
                              setIsSubmitting(true);
                              try {
                                const result = await leadsRepository.update(selectedLead.id, { companies: updatedCompanies });
                                if (result.success && result.data) {
                                  const updatedLead = result.data;
                                  setDetailCompanies(updatedCompanies);
                                  setSelectedLead(updatedLead);
                                  setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updatedLead : l)));
                                  setNewCompany({ name: '', position: '', department: '', email: '', phone: '' });
                                  setIsAddingCompany(false);
                                  toast.success('Perusahaan berhasil ditambahkan!');
                                } else {
                                  toast.error(result.error || 'Gagal menyimpan perusahaan');
                                }
                              } finally {
                                setIsSubmitting(false);
                              }
                            }}
                          >
                            Simpan
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setIsAddingCompany(false);
                              setNewCompany({ name: '', position: '', department: '', email: '', phone: '' });
                            }}
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <Button 
                  className="flex-1 bg-[#013E37] text-white hover:bg-[#025C52] h-10"
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleEditLead(selectedLead);
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Lead
                </Button>
                <Button 
                  variant="outline"
                  className="px-6 h-10 text-gray-700"
                  onClick={() => setIsDetailOpen(false)}
                >
                  Tutup
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-gray-500">
              Loading detail data...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}