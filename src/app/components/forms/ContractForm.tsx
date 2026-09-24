import React, { useState, useEffect } from 'react';
import { X, Save, ChevronDown, ChevronUp, FileText, User, Calendar, DollarSign, Building2, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { Contract as ContractType } from '@/app/data/dummyData';
import { contractsRepository } from '@/services/contractsRepository';

interface ContractFormProps {
  contract: ContractType | null;
  onClose: () => void;
  onSuccess: (contract: ContractType) => void;
}

export function ContractFormModal({ contract, onClose, onSuccess }: ContractFormProps) {
  const [loading, setLoading] = useState(false);
  
  // State for collapsible sections - default: only basicInfo is open
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    clientInfo: false,
    contractDetails: false,
    timeline: false,
  });

  const [formData, setFormData] = useState({
    contractNumber: '',
    clientName: '',
    company: '',
    product: '',
    value: 0,
    startDate: '',
    endDate: '',
    status: 'draft' as ContractType['status'],
    signedBy: '',
    salesPerson: '',
  });

  useEffect(() => {
    if (contract) {
      setFormData({
        contractNumber: contract.contractNumber || '',
        clientName: contract.clientName || '',
        company: contract.company || '',
        product: contract.product || '',
        value: contract.value || 0,
        startDate: contract.startDate ? contract.startDate.toISOString().split('T')[0] : '',
        endDate: contract.endDate ? contract.endDate.toISOString().split('T')[0] : '',
        status: contract.status || 'draft',
        signedBy: contract.signedBy || '',
        salesPerson: contract.salesPerson || '',
      });
    }
  }, [contract]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contractNumber || !formData.clientName || !formData.company) {
      toast.error('Harap isi semua field yang wajib!');
      return;
    }
    // Bab 30 lanjutan: startDate/endDate wajib diisi di backend (lihat
    // api/handler.ts's handleContracts) -- divalidasi juga di sini supaya
    // pesan errornya jelas alih-alih 400 generik dari server.
    if (!formData.startDate || !formData.endDate) {
      toast.error('Tanggal mulai dan tanggal berakhir kontrak wajib diisi!');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        contractNumber: formData.contractNumber,
        clientName: formData.clientName,
        company: formData.company,
        product: formData.product,
        value: Number(formData.value),
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
        signedBy: formData.signedBy,
        salesPerson: formData.salesPerson,
      };

      // Bab 30 lanjutan (24 Sep 2026, hasil deep review + smoke test grup
      // Sales Pipeline): form ini dulu fetch langsung ke
      // https://mock-project-id.supabase.co/... yang tidak pernah ada --
      // setiap submit diam-diam gagal (network error tertangkap catch,
      // cuma tampil toast error generik). Sekarang lewat backend
      // sungguhan (contractsRepository -> /api/contracts).
      const result = contract
        ? await contractsRepository.update(contract.id, payload)
        : await contractsRepository.create(payload);

      if (result.success && result.data) {
        const contractData: ContractType = result.data;
        toast.success(contract ? 'Kontrak berhasil diupdate!' : 'Kontrak berhasil ditambahkan!');
        onSuccess(contractData);
      } else {
        toast.error(result.error || 'Gagal menyimpan data');
      }
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('Terjadi kesalahan saat menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500 text-emerald-900 hover:bg-emerald-600';
      case 'pending':
        return 'bg-amber-500 text-amber-900 hover:bg-amber-600';
      case 'draft':
        return 'bg-gray-500 text-gray-900 hover:bg-gray-600';
      case 'expired':
        return 'bg-red-500 text-red-900 hover:bg-red-600';
      case 'terminated':
        return 'bg-red-600 text-red-100 hover:bg-red-700';
      default:
        return 'bg-gray-500 text-gray-900';
    }
  };

  const getDaysDifference = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diffTime = new Date(end).getTime() - new Date(start).getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="!max-w-[950px] w-full max-h-[calc(100%-2rem)] overflow-hidden p-0 gap-0 bg-white [&>button]:hidden flex flex-col">
        {/* HEADER */}
        <DialogHeader className="relative bg-[#013E37] text-white px-6 py-5 space-y-0 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="space-y-3">
            {/* Icon & Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold leading-tight">
                  {formData.contractNumber || (contract ? 'Edit Kontrak' : 'Buat Kontrak Baru')}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-1 leading-tight">
                  {formData.company || 'Contract Management System'}
                </DialogDescription>
              </div>
            </div>

            {/* Status Badges */}
            {contract && (
              <div className="flex gap-2 flex-wrap">
                <Badge className={getStatusColor(formData.status)}>
                  {formData.status.toUpperCase()}
                </Badge>
                {formData.product && (
                  <Badge className="bg-blue-500 text-blue-900 hover:bg-blue-600">
                    {formData.product}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* QUICK INFO CARDS */}
        {contract && (
          <div className="bg-gradient-to-br bg-[#EEF7F5] px-6 py-4 grid grid-cols-3 gap-4 border-b border-[#DFF0EC]">
            <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#DFF0EC] flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#013E37]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Nilai Kontrak</p>
                <p className="font-semibold text-gray-900 text-sm">Rp {(formData.value / 1000000).toFixed(0)}Jt</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#DFF0EC] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#013E37]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Durasi</p>
                <p className="font-semibold text-gray-900 text-sm">{getDaysDifference(formData.startDate, formData.endDate)} hari</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                <User className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Sales Person</p>
                <p className="font-semibold text-gray-900 text-sm">{formData.salesPerson || '-'}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* CONTENT - Scrollable area */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            
            {/* SECTION 1: Informasi Dasar */}
            <div className="bg-gradient-to-br bg-[#EEF7F5] rounded-xl border border-[#DFF0EC] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('basicInfo')}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-[#DFF0EC]/50 hover:bg-[#DFF0EC] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#013E37] flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-[#012D29]">Informasi Dasar Kontrak</h3>
                </div>
                {expandedSections.basicInfo ? (
                  <ChevronUp className="w-5 h-5 text-[#013E37]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#013E37]" />
                )}
              </button>
              
              {expandedSections.basicInfo && (
                <div className="p-5 pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Nomor Kontrak <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="contractNumber"
                      value={formData.contractNumber}
                      onChange={handleChange}
                      required
                      placeholder="CTR-2026-001"
                      className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0">
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Produk/Layanan</Label>
                    <Input
                      name="product"
                      value={formData.product}
                      onChange={handleChange}
                      placeholder="Nama produk atau layanan"
                      className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: Informasi Client */}
            <div className="bg-gradient-to-br from-blue-50 to-[#EEF7F5] rounded-xl border border-blue-100 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('clientInfo')}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-blue-100/50 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-blue-900">Informasi Client</h3>
                </div>
                {expandedSections.clientInfo ? (
                  <ChevronUp className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-blue-600" />
                )}
              </button>
              
              {expandedSections.clientInfo && (
                <div className="p-5 pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Nama Client <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleChange}
                      required
                      placeholder="Nama lengkap client"
                      className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Nama Perusahaan <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      required
                      placeholder="PT Nama Perusahaan"
                      className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: Detail Kontrak & Finansial */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('contractDetails')}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-green-100/50 hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-green-900">Detail Kontrak & Finansial</h3>
                </div>
                {expandedSections.contractDetails ? (
                  <ChevronUp className="w-5 h-5 text-green-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-green-600" />
                )}
              </button>
              
              {expandedSections.contractDetails && (
                <div className="p-5 pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Nilai Kontrak (Rp)</Label>
                    <Input
                      name="value"
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                      placeholder="350000000"
                      className="bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Sales Person</Label>
                    <Input
                      name="salesPerson"
                      value={formData.salesPerson}
                      onChange={handleChange}
                      placeholder="Nama sales yang menangani"
                      className="bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label className="text-sm font-semibold text-gray-700">Ditandatangani Oleh</Label>
                    <Input
                      name="signedBy"
                      value={formData.signedBy}
                      onChange={handleChange}
                      placeholder="Jabatan atau nama penandatangan"
                      className="bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: Timeline & Periode */}
            <div className="bg-gradient-to-br from-[#EEF7F5] to-pink-50 rounded-xl border border-[#DFF0EC] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('timeline')}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-[#DFF0EC]/50 hover:bg-[#DFF0EC] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#013E37] flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-[#012D29]">Timeline & Periode Kontrak</h3>
                </div>
                {expandedSections.timeline ? (
                  <ChevronUp className="w-5 h-5 text-[#013E37]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#013E37]" />
                )}
              </button>
              
              {expandedSections.timeline && (
                <div className="p-5 pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Tanggal Mulai</Label>
                    <Input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Tanggal Berakhir</Label>
                    <Input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                    />
                  </div>

                  {formData.startDate && formData.endDate && (
                    <div className="col-span-2 bg-[#EEF7F5] border border-[#C3DDD9] rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-[#012D29]">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">
                          Durasi Kontrak: {getDaysDifference(formData.startDate, formData.endDate)} hari
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* FOOTER - Action Buttons */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="min-w-[100px]"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#013E37] to-[#013E37] hover:from-[#013E37] hover:to-[#013E37] text-white min-w-[100px]"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Menyimpan...' : (contract ? 'Update Kontrak' : 'Buat Kontrak')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}