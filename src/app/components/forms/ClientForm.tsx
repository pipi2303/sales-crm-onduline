import React from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/AuthContext';
import { 
  X, FileText, Shield, User, Building2, 
  ChevronUp, ChevronDown, Clipboard, CreditCard, Info, Save, Percent,
  Clock, Send, CheckCircle, CalendarDays, Wallet, Package, Layers, AlertCircle,
  Globe, MapPin, Phone, Mail, Tag, Hash, Link,
  Activity, FileCheck, Monitor,
  UserCircle, Briefcase, MessageSquare, Fingerprint, ExternalLink, FileSignature,
  Database, Server
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/app/components/ui/select';
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from '@/app/components/ui/tooltip';
import { Button } from '@/app/components/ui/button';
import { clientsRepository } from '@/services/clientsRepository';

interface ClientFormProps {
  client: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClientFormModal({ client, onClose, onSuccess }: ClientFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  
  // State for collapsible sections - default: only dasar is open
  const [expandedSections, setExpandedSections] = React.useState({
    dasar: true,
    teknis: false,
    pic: false,
    subscription: false,
    discount: false,
    legal: false,
    komunikasi: false,
  });

  const [formData, setFormData] = React.useState({
    // Informasi Dasar
    id_customer: '', // NEW FIELD - ID Customer
    nama_entitas: '',
    kategori_client: '',
    // FR-05: Sektor kepemilikan client (Type/Sub Type/Sector dari FSD) --
    // klasifikasi terpisah dari kategori_client di atas: ini soal SIAPA
    // pemiliknya (Pemerintah/BUMN/Swasta/TNI-Polri, lihat dropdown "Sektor
    // Kepemilikan" di bawah), bukan APA jenis bisnisnya (kategori_client
    // sudah dimigrasi ke kategori Onduline -- Toko Bangunan/Distributor/
    // Kontraktor/dst, lihat dropdown di atas -- lihat MEMORY.md).
    sektor_client: '',
    owner: '',
    alamat_lengkap: '', // deprecated: dipertahankan untuk kompatibilitas data lama, lihat alamat_penagihan/alamat_pengiriman
    // FR-06: pemisahan alamat penagihan vs alamat kunjungan/pengiriman
    alamat_penagihan: '',
    alamat_pengiriman: '',
    alamat_sama_dengan_penagihan: true,
    koordinat_gps: '',
    nomor_telepon: '',
    email_resmi: '',
    website: '', // NEW FIELD
    // Riwayat Pengadaan (was "Profiling Teknis & Regulasi" -- Fase 1 item
    // 5, unify Client data model, 23 Sep 2026: healthcare/BPJS-only
    // fields removed, this one field kept & renamed from sistem_lama)
    vendor_sebelumnya: '',
    // Decision Maker
    nama_pic: '',
    jabatan_pic: '',
    whatsapp_pic: '',
    status_hubungan: '',
    // Subscription Data
    paket_aktif: '',
    modul_tambahan: '',
    status_kontrak: '',
    status_subscription: '', // NEW FIELD
    discount: 0, // NEW FIELD
    discount_status: '', // NEW FIELD
    discount_approval_status: '', // NEW FIELD
    tanggal_mulai_langganan: '',
    tanggal_habis_kontrak: '',
    total_nilai_kontrak: '',
    // Legal
    file_kontrak_digital: '',
    status_esign: '',
    npwp: '',
  });

  React.useEffect(() => {
    if (client) {
      setFormData({
        // Informasi Dasar
        id_customer: client.id_customer || '', // NEW FIELD - ID Customer
        nama_entitas: client.nama_entitas || '',
        kategori_client: client.kategori_client || '',
        sektor_client: client.sektor_client || '',
        owner: client.owner || '',
        alamat_lengkap: client.alamat_lengkap || '',
        // Migration fallback: data lama hanya punya alamat_lengkap. Kalau alamat_penagihan belum
        // pernah diisi, tampilkan alamat_lengkap di kedua field dan anggap "sama dengan penagihan"
        // dicentang, supaya user tidak kehilangan data lama dan tinggal koreksi kalau memang berbeda.
        alamat_penagihan: client.alamat_penagihan || client.alamat_lengkap || '',
        alamat_pengiriman: client.alamat_pengiriman || client.alamat_lengkap || '',
        alamat_sama_dengan_penagihan:
          client.alamat_penagihan !== undefined
            ? client.alamat_penagihan === client.alamat_pengiriman
            : true,
        koordinat_gps: client.koordinat_gps || '',
        nomor_telepon: client.nomor_telepon || '',
        email_resmi: client.email_resmi || '',
        website: client.website || '', // NEW FIELD
        // Riwayat Pengadaan
        vendor_sebelumnya: client.vendor_sebelumnya || '',
        // Decision Maker
        nama_pic: client.nama_pic || '',
        jabatan_pic: client.jabatan_pic || '',
        whatsapp_pic: client.whatsapp_pic || '',
        status_hubungan: client.status_hubungan || '',
        // Subscription Data
        paket_aktif: client.paket_aktif || '',
        modul_tambahan: client.modul_tambahan || '',
        status_kontrak: client.status_kontrak || '',
        status_subscription: client.status_subscription || '', // NEW FIELD
        discount: client.discount || 0, // NEW FIELD
        discount_status: client.discount_status || '', // NEW FIELD
        tanggal_mulai_langganan: client.tanggal_mulai_langganan || '',
        tanggal_habis_kontrak: client.tanggal_habis_kontrak || '',
        total_nilai_kontrak: client.total_nilai_kontrak || '',
        // Legal
        file_kontrak_digital: client.file_kontrak_digital || '',
        status_esign: client.status_esign || '',
        npwp: client.npwp || '',
      });
    }
  }, [client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nama_entitas || !formData.kategori_client) {
      toast.error('Harap isi semua field yang wajib!');
      return;
    }

    if (formData.discount > 20 && formData.discount_approval_status !== 'approved') {
      toast.error('Diskon di atas 20% memerlukan persetujuan atasan sebelum data dapat disimpan.');
      return;
    }

    try {
      setLoading(true);

      // Keep legacy alamat_lengkap in sync (billing address) so any older code/report still
      // reading that field doesn't silently break after the FR-06 billing/shipping split.
      const payload = {
        ...formData,
        alamat_lengkap: formData.alamat_penagihan,
      };

      const result = client
        ? await clientsRepository.update(client.id, payload)
        : await clientsRepository.create(payload);
      
      if (result.success) {
        toast.success(client ? 'Data client berhasil diupdate!' : 'Data client berhasil ditambahkan!');
        onSuccess();
      } else {
        toast.error(result.error || 'Gagal menyimpan data');
      }
    } catch (error) {
      console.error('Error saving client:', error);
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

  const handleRequestApproval = () => {
    if (formData.discount <= 20) {
      toast.info('Diskon di bawah 20% tidak memerlukan persetujuan khusus.');
      return;
    }
    
    setFormData(prev => ({ ...prev, discount_approval_status: 'pending' }));
    toast.info(`Permintaan persetujuan diskon ${formData.discount}% telah dikirim ke Manager & Director via Email.`);
    
    // Simulate approval after 4 seconds
    setTimeout(() => {
      setFormData(prev => ({ 
        ...prev, 
        discount_approval_status: 'approved',
        discount_status: 'Approved by Director'
      }));
      toast.success(`Diskon ${formData.discount}% telah DISETUJUI oleh Director!`);
    }, 4000);
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
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold leading-tight">
                  {formData.nama_entitas || (client ? 'Edit Data Client' : 'Tambah Client Baru')}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-1 leading-tight">
                  {formData.kategori_client || 'Toko Bangunan'}
                </DialogDescription>
              </div>
            </div>

            {/* Status Badges */}
            {client && (
              <div className="flex gap-2 flex-wrap">
                {formData.paket_aktif && (
                  <Badge className="bg-yellow-500 text-yellow-900 hover:bg-yellow-600">
                    {formData.paket_aktif}
                  </Badge>
                )}
                {formData.status_kontrak && (
                  <Badge className="bg-amber-500 text-amber-900 hover:bg-amber-600">
                    {formData.status_kontrak}
                  </Badge>
                )}
                {formData.status_hubungan && (
                  <Badge className={
                    formData.status_hubungan === 'Active Client' 
                      ? 'bg-emerald-500 text-emerald-900 hover:bg-emerald-600' 
                      : 'bg-blue-500 text-blue-900 hover:bg-blue-600'
                  }>
                    {formData.status_hubungan}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* QUICK INFO CARDS */}
        {client && (
          <div className="bg-gradient-to-br bg-[#EEF7F5] px-6 py-4 grid grid-cols-3 gap-4 border-b border-blue-100">
            <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">ID Customer</p>
                <p className="font-semibold text-gray-900 text-sm">{formData.id_customer || '-'}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Nomor Telepon</p>
                <p className="font-semibold text-gray-900 text-sm">{formData.nomor_telepon || '-'}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#DFF0EC] flex items-center justify-center">
                <User className="w-5 h-5 text-[#013E37]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Vendor Sebelumnya</p>
                <p className="font-semibold text-gray-900 text-sm">{formData.vendor_sebelumnya || '-'}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* CONTENT - Scrollable area */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 text-gray-900">
            
            {/* SECTION 1: Informasi Dasar */}
            <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection('dasar')}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-50 to-[#EEF7F5] hover:from-emerald-100 hover:to-[#EEF7F5] transition-colors border-b border-emerald-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-emerald-900 leading-none">Informasi Dasar</h3>
                    <p className="text-[10px] text-emerald-700 mt-1 uppercase tracking-wider font-semibold opacity-70">IDENTITAS & DATA KONTAK UTAMA</p>
                  </div>
                </div>
                {expandedSections.dasar ? (
                  <ChevronUp className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-emerald-600" />
                )}
              </button>
              
              {expandedSections.dasar && (
                <div className="p-6 space-y-8">
                  {/* Sub-section: Identitas */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Tag className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Identitas Client</h4>
                    </div>
                    
                    <div className="grid grid-cols-6 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Hash className="w-3.5 h-3.5 text-emerald-500" />
                          ID Client
                        </Label>
                        <Input
                          name="id_customer"
                          value={formData.id_customer}
                          onChange={handleChange}
                          placeholder="CUST-2025-001"
                          className="bg-gray-50/50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 h-11 font-mono text-xs"
                        />
                      </div>

                      <div className="col-span-4 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          Nama Entitas <span className="text-red-500 font-black">*</span>
                        </Label>
                        <Input
                          name="nama_entitas"
                          value={formData.nama_entitas}
                          onChange={handleChange}
                          required
                          placeholder="Toko Bangunan Makmur Jaya"
                          className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-11 text-base font-medium"
                        />
                      </div>

                      <div className="col-span-3 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">
                          Kategori Client <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.kategori_client}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, kategori_client: value }))}
                        >
                          <SelectTrigger className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-11">
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Toko Bangunan">🏬 Toko Bangunan</SelectItem>
                            <SelectItem value="Distributor">🚚 Distributor</SelectItem>
                            <SelectItem value="Kontraktor">👷 Kontraktor</SelectItem>
                            <SelectItem value="Developer">🏗️ Developer / Proyek Perumahan</SelectItem>
                            <SelectItem value="Instansi Pemerintah">🏛️ Instansi Pemerintah / BUMN</SelectItem>
                            <SelectItem value="End User">🏠 End User / Individu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-3 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-emerald-500" />
                          Pemilik / Yayasan
                        </Label>
                        <Input
                          name="owner"
                          value={formData.owner}
                          onChange={handleChange}
                          placeholder="Nama pemilik atau yayasan"
                          className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-11"
                        />
                      </div>

                      {/* FR-05: Sektor kepemilikan faskes — draft awal, mohon direview tim Sales/Product Owner */}
                      <div className="col-span-3 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">
                          Sektor Kepemilikan
                        </Label>
                        <Select
                          value={formData.sektor_client}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, sektor_client: value }))}
                        >
                          <SelectTrigger className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-11">
                            <SelectValue placeholder="Pilih sektor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pemerintah">Pemerintah (Pemda/Kemenkes)</SelectItem>
                            <SelectItem value="BUMN/BUMD">BUMN / BUMD</SelectItem>
                            <SelectItem value="Swasta">Swasta</SelectItem>
                            <SelectItem value="TNI/Polri">TNI / Polri</SelectItem>
                            <SelectItem value="Yayasan/Nirlaba">Yayasan / Nirlaba</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Sub-section: Lokasi & Kontak */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lokasi & Kontak</h4>
                    </div>

                    <div className="grid grid-cols-6 gap-4">
                      {/* FR-06: Alamat Penagihan (Billing) vs Alamat Kunjungan/Pengiriman (Shipping) */}
                      <div className="col-span-6 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">Alamat Penagihan (Billing)</Label>
                        <textarea
                          name="alamat_penagihan"
                          value={formData.alamat_penagihan}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              alamat_penagihan: value,
                              alamat_pengiriman: prev.alamat_sama_dengan_penagihan ? value : prev.alamat_pengiriman,
                            }));
                          }}
                          rows={2}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white transition-all"
                          placeholder="Jl. Sudirman Kav. 52, Jakarta Pusat 10210"
                        />
                      </div>

                      <div className="col-span-6 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="alamat_sama_dengan_penagihan"
                          checked={formData.alamat_sama_dengan_penagihan}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              alamat_sama_dengan_penagihan: checked,
                              alamat_pengiriman: checked ? prev.alamat_penagihan : prev.alamat_pengiriman,
                            }));
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <Label htmlFor="alamat_sama_dengan_penagihan" className="text-sm text-gray-600 cursor-pointer">
                          Alamat kunjungan/pengiriman sama dengan alamat penagihan
                        </Label>
                      </div>

                      {!formData.alamat_sama_dengan_penagihan && (
                        <div className="col-span-6 space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Alamat Kunjungan / Pengiriman (Shipping)</Label>
                          <textarea
                            name="alamat_pengiriman"
                            value={formData.alamat_pengiriman}
                            onChange={handleChange}
                            rows={2}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-white transition-all"
                            placeholder="Alamat untuk kunjungan sales / pengiriman, bila berbeda dari alamat penagihan"
                          />
                        </div>
                      )}

                      <div className="col-span-3 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                          Koordinat GPS
                        </Label>
                        <Input
                          name="koordinat_gps"
                          value={formData.koordinat_gps}
                          onChange={handleChange}
                          placeholder="-6.2088, 106.8456"
                          className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-11"
                        />
                      </div>

                      <div className="col-span-3 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          Nomor Telepon
                        </Label>
                        <Input
                          type="tel"
                          name="nomor_telepon"
                          value={formData.nomor_telepon}
                          onChange={handleChange}
                          placeholder="021-5551234"
                          className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-11"
                        />
                      </div>

                      <div className="col-span-3 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-emerald-500" />
                          Email Resmi
                        </Label>
                        <Input
                          type="email"
                          name="email_resmi"
                          value={formData.email_resmi}
                          onChange={handleChange}
                          placeholder="info@rsharapansehat.com"
                          className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-11"
                        />
                      </div>

                      <div className="col-span-3 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-emerald-500" />
                          Website
                        </Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <Link className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <Input
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            placeholder="www.rsharapansehat.com"
                            className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 h-11 pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: Riwayat Pengadaan (renamed from "Profiling Teknis
                & Regulasi" -- Fase 1 item 5, unify Client data model, 23
                Sep 2026: the healthcare/BPJS-only fields this section held
                (ID SatuSehat, ID Faskes BPJS, Status Akreditasi, Volume
                Pasien, Kapasitas Tempat Tidur) were removed -- no Onduline
                equivalent, and Kapasitas Tempat Tidur was silently feeding
                AILeadScoring/AISmartRecommendations' deal-size math (see
                src/utils/clientSegmentTier.ts, now based on kategori_client
                instead). Only the renamed vendor_sebelumnya field survives
                here, and it's now wired into AILeadScoring's
                competition-level factor instead of sitting unused. */}
            <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection('teknis')}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r bg-[#EEF7F5] hover:from-blue-100 hover:to-[#DFF0EC] transition-colors border-b border-blue-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-blue-900 leading-none">Riwayat Pengadaan</h3>
                    <p className="text-[10px] text-blue-700 mt-1 uppercase tracking-wider font-semibold opacity-70">VENDOR / DISTRIBUTOR SEBELUMNYA</p>
                  </div>
                </div>
                {expandedSections.teknis ? (
                  <ChevronUp className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-blue-600" />
                )}
              </button>
              
              {expandedSections.teknis && (
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-blue-500" />
                      Vendor/Distributor Sebelumnya
                    </Label>
                    <Input
                      name="vendor_sebelumnya"
                      value={formData.vendor_sebelumnya}
                      onChange={handleChange}
                      placeholder="Contoh: Distributor Atap Nusantara / Belum ada distributor tetap"
                      className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-11"
                    />
                    <p className="text-xs text-gray-400">Membantu AI Lead Scoring menilai tingkat kompetisi untuk client ini.</p>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: Data Pengambil Keputusan (Decision Maker) */}
            <div className="bg-white rounded-xl border border-[#DFF0EC] overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection('pic')}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#EEF7F5] to-pink-50 hover:from-[#DFF0EC] hover:to-pink-100 transition-colors border-b border-[#DFF0EC]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#013E37] flex items-center justify-center shadow-lg shadow-[#C3DDD9]">
                    <UserCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-[#012D29] leading-none">Data Pengambil Keputusan</h3>
                    <p className="text-[10px] text-[#013E37] mt-1 uppercase tracking-wider font-semibold opacity-70">PROFIL PIC & STATUS RELASI BISNIS</p>
                  </div>
                </div>
                {expandedSections.pic ? (
                  <ChevronUp className="w-5 h-5 text-[#013E37]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#013E37]" />
                )}
              </button>
              
              {expandedSections.pic && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <UserCircle className="w-3.5 h-3.5 text-[#EEF7F5]0" />
                        Nama Lengkap PIC
                      </Label>
                      <Input
                        name="nama_pic"
                        value={formData.nama_pic}
                        onChange={handleChange}
                        placeholder="dr. Ahmad Direktur"
                        className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0 h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-[#EEF7F5]0" />
                        Jabatan Strategis
                      </Label>
                      <Input
                        name="jabatan_pic"
                        value={formData.jabatan_pic}
                        onChange={handleChange}
                        placeholder="Direktur Utama / Owner"
                        className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0 h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-[#EEF7F5]0" />
                        Nomor WhatsApp
                      </Label>
                      <Input
                        type="tel"
                        name="whatsapp_pic"
                        value={formData.whatsapp_pic}
                        onChange={handleChange}
                        placeholder="+62 812-3456-7890"
                        className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0 h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-[#EEF7F5]0" />
                          Status Hubungan
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="inline-flex items-center justify-center">
                                <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top" 
                              className="max-w-[300px] text-[11px] bg-slate-900 text-slate-100 p-3 rounded-xl shadow-2xl border border-slate-700 leading-relaxed"
                            >
                              <div className="space-y-2.5">
                                <div className="pb-1 border-b border-slate-700">
                                  <p className="font-black text-[#038E7D] uppercase tracking-tighter">Klasifikasi Pipeline</p>
                                </div>
                                <div className="flex gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                                  <p><span className="font-bold text-emerald-400">Active Client:</span> Memiliki kontrak berjalan yang aktif.</p>
                                </div>
                                <div className="flex gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
                                  <p><span className="font-bold text-orange-400">Hot:</span> Peluang kuat (Upside & Forecast).</p>
                                </div>
                                <div className="flex gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                                  <p><span className="font-bold text-blue-400">Warm:</span> Pipeline aktif dalam tahap negosiasi.</p>
                                </div>
                                <div className="flex gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 shrink-0" />
                                  <p><span className="font-bold text-slate-400">Cold:</span> Tidak ada peluang baru atau proyek lama.</p>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select
                        value={formData.status_hubungan}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status_hubungan: value }))}
                      >
                        <SelectTrigger className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0 h-11">
                          <SelectValue placeholder="Pilih status relasi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active Client"><span className="flex items-center gap-2">🤝 Active Client</span></SelectItem>
                          <SelectItem value="Hot"><span className="flex items-center gap-2">🔥 Hot Opportunity</span></SelectItem>
                          <SelectItem value="Warm"><span className="flex items-center gap-2">🌤️ Warm Pipeline</span></SelectItem>
                          <SelectItem value="Cold"><span className="flex items-center gap-2">❄️ Cold Leads</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: Status Subscription */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection('subscription')}
                className="w-full flex items-center justify-between px-5 py-4 bg-white/50 hover:bg-white transition-colors border-b border-amber-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-amber-900 leading-none">Status Subscription</h3>
                    <p className="text-[10px] text-amber-700 mt-1 uppercase tracking-wider font-semibold opacity-70">DETAIL PAKET & KONTRAK LANGGANAN</p>
                  </div>
                </div>
                {expandedSections.subscription ? (
                  <ChevronUp className="w-5 h-5 text-amber-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-amber-600" />
                )}
              </button>
              
              {expandedSections.subscription && (
                <div className="p-6 pt-5 grid grid-cols-2 gap-x-6 gap-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-600" />
                      Paket Aktif
                    </Label>
                    <Select
                      value={formData.paket_aktif}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, paket_aktif: value }))}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 h-11">
                        <SelectValue placeholder="Pilih paket" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lite"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-400" /> Lite</span></SelectItem>
                        <SelectItem value="Standard"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400" /> Standard</span></SelectItem>
                        <SelectItem value="Premium"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /> Premium</span></SelectItem>
                        <SelectItem value="Enterprise"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#EEF7F5]0" /> Enterprise</span></SelectItem>
                        <SelectItem value="Custom"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Custom</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        formData.status_subscription === 'Paid' ? 'bg-emerald-500' :
                        formData.status_subscription === 'Trial' ? 'bg-blue-500' :
                        'bg-red-500'
                      } animate-pulse`} />
                      Status Subscription
                    </Label>
                    <Select
                      value={formData.status_subscription}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status_subscription: value }))}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 h-11">
                        <SelectValue placeholder="Pilih status sub" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Trial">Trial Period</SelectItem>
                        <SelectItem value="Paid">Active Subscription</SelectItem>
                        <SelectItem value="Churned">Churned / Lost</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      Status Kontrak
                    </Label>
                    <Select
                      value={formData.status_kontrak}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status_kontrak: value }))}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 h-11">
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active"><span className="flex items-center gap-2">✅ Active</span></SelectItem>
                        <SelectItem value="Grace Period"><span className="flex items-center gap-2">⏳ Grace Period</span></SelectItem>
                        <SelectItem value="Suspended"><span className="flex items-center gap-2">🚫 Suspended</span></SelectItem>
                        <SelectItem value="Terminated"><span className="flex items-center gap-2">💀 Terminated</span></SelectItem>
                        <SelectItem value="Pending Renewal"><span className="flex items-center gap-2">🔄 Pending Renewal</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        Mulai
                      </Label>
                      <Input
                        type="date"
                        name="tanggal_mulai_langganan"
                        value={formData.tanggal_mulai_langganan}
                        onChange={handleChange}
                        className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 h-11 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        Habis
                      </Label>
                      <Input
                        type="date"
                        name="tanggal_habis_kontrak"
                        value={formData.tanggal_habis_kontrak}
                        onChange={handleChange}
                        className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 h-11 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-amber-600" />
                      Total Nilai Kontrak
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Rp</div>
                      <Input
                        type="number"
                        name="total_nilai_kontrak"
                        value={formData.total_nilai_kontrak}
                        onChange={handleChange}
                        placeholder="150000000"
                        className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 h-11 pl-10 font-mono text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      Modul Tambahan
                    </Label>
                    <Input
                      name="modul_tambahan"
                      value={formData.modul_tambahan}
                      onChange={handleChange}
                      placeholder="LIS, RIS, PACS"
                      className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 h-11"
                    />
                  </div>

                  <div className="space-y-2 col-span-2 bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-2xl border-2 border-amber-200/50 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-bold text-amber-900 flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        Diskon Negosiasi Khusus
                      </Label>
                      {formData.discount > 20 && (
                        <Badge variant="outline" className={`${
                          formData.discount_approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          formData.discount_approval_status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-red-100 text-red-700 border-red-200'
                        } text-[10px] px-2 py-0.5 font-bold shadow-sm`}>
                          {formData.discount_approval_status === 'approved' ? 'APPROVED' :
                           formData.discount_approval_status === 'pending' ? 'WAITING APPROVAL' :
                           'REQUIRES APPROVAL'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="relative w-1/4">
                        <Input
                          type="number"
                          name="discount"
                          value={formData.discount}
                          onChange={handleChange}
                          placeholder="0"
                          disabled={formData.discount_approval_status === 'pending' || formData.discount_approval_status === 'approved'}
                          className="bg-white border-gray-300 focus:border-amber-500 focus:ring-amber-500 pr-10 h-12 text-lg font-bold"
                        />
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>
                      
                      {formData.discount > 20 && formData.discount_approval_status !== 'approved' && (
                        <Button
                          type="button"
                          onClick={handleRequestApproval}
                          disabled={formData.discount_approval_status === 'pending'}
                          className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black h-12 text-sm shadow-lg shadow-orange-200 border-none"
                        >
                          {formData.discount_approval_status === 'pending' ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              MENUNGGU PERSETUJUAN...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              MINTA APPROVAL MANAGER
                            </>
                          )}
                        </Button>
                      )}

                      {formData.discount_approval_status === 'approved' && (
                        <div className="flex-1 flex items-center justify-center gap-2 text-emerald-700 font-black text-sm h-12 px-3 bg-emerald-50 rounded-xl border-2 border-emerald-200 shadow-sm animate-in fade-in zoom-in duration-300">
                          <CheckCircle className="w-5 h-5" />
                          DISKON TELAH DISETUJUI
                        </div>
                      )}
                    </div>
                    {formData.discount > 20 && formData.discount_approval_status === '' && (
                      <p className="text-[11px] text-orange-700 mt-3 flex items-center gap-1.5 bg-orange-100/50 p-2 rounded-lg font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Diskon di atas 20% memerlukan validasi sistem sebelum data dapat difinalisasi.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 5: Dokumen & Legal */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
              <button
                type="button"
                onClick={() => toggleSection('legal')}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 transition-colors border-b border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center shadow-lg shadow-slate-200">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-slate-900 leading-none">Dokumen & Legal</h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold opacity-70">VERIFIKASI NPWP & ADMINISTRASI KONTRAK</p>
                  </div>
                </div>
                {expandedSections.legal ? (
                  <ChevronUp className="w-5 h-5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500" />
                )}
              </button>
              
              {expandedSections.legal && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Fingerprint className="w-3.5 h-3.5 text-slate-500" />
                        Nomor NPWP
                      </Label>
                      <Input
                        name="npwp"
                        value={formData.npwp}
                        onChange={handleChange}
                        placeholder="01.234.567.8-012.000"
                        className="bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 h-11 font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FileSignature className="w-3.5 h-3.5 text-slate-500" />
                        Status Aktivasi E-Sign
                      </Label>
                      <Select
                        value={formData.status_esign}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status_esign: value }))}
                      >
                        <SelectTrigger className="bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 h-11">
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sudah Aktif">✅ Sudah Aktif</SelectItem>
                          <SelectItem value="Proses Registrasi">⏳ Proses Registrasi</SelectItem>
                          <SelectItem value="Belum Ada">❌ Belum Ada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        Link Dokumen Kontrak (Digital)
                      </Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Link className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <Input
                          name="file_kontrak_digital"
                          value={formData.file_kontrak_digital}
                          onChange={handleChange}
                          placeholder="https://drive.google.com/file/d/..."
                          className="bg-white border-gray-300 focus:border-slate-500 focus:ring-slate-500 h-11 pl-10 text-xs text-blue-600 underline"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 italic">Pastikan akses file sudah diatur ke 'Anyone with the link' untuk kemudahan review.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="text-xs text-gray-500 italic">
              * Pastikan data yang diinput sudah sesuai dengan dokumen resmi faskes.
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#013E37] hover:bg-[#01443e] text-white px-8 font-bold shadow-lg shadow-emerald-900/20"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Simpan Data Client
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
