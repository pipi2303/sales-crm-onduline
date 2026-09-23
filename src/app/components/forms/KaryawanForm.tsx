import React from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/AuthContext';
import { 
  X, UserCog, UserPlus, Sparkles, ChevronUp, ChevronDown, Save 
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Button } from '@/app/components/ui/button';
import { employeesApi } from '@/services/api';

interface KaryawanFormProps {
  karyawan: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function KaryawanFormModal({ karyawan, onClose, onSuccess }: KaryawanFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  
  // State for collapsible sections - default: only pribadi is open
  const [expandedSections, setExpandedSections] = React.useState({
    pribadi: true,
    kepegawaian: false,
    finansial: false,
    keamanan: false,
  });

  const [formData, setFormData] = React.useState({
    // Bagian 1: Informasi Pribadi
    nama_lengkap: '',
    nik: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: '',
    alamat: '',
    nomor_wa: '',
    email_pribadi: '',
    // Bagian 2: Status Kepegawaian
    divisi: '',
    jabatan: '',
    level_jabatan: '',
    status_karyawan: '',
    tanggal_bergabung: '',
    nama_atasan: '',
    // Bagian 3: Finansial
    npwp: '',
    nomor_rekening: '',
    nama_bank: '',
    bpjs_ketenagakerjaan: '',
    bpjs_kesehatan: '',
    // Bagian 4: Keamanan Data
    email_kantor: '',
    nda_signed: false,
    tanggal_nda: '',
    level_akses: '',
    aset_perusahaan: '',
  });

  React.useEffect(() => {
    if (karyawan) {
      setFormData(karyawan);
    }
  }, [karyawan]);

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    handleChange(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi required fields
    if (!formData.nama_lengkap || !formData.nik || !formData.email_kantor) {
      toast.error('Harap isi semua field yang wajib!');
      return;
    }

    try {
      setLoading(true);
      
      let result;
      if (karyawan) {
        result = await employeesApi.update(karyawan.id, formData);
      } else {
        result = await employeesApi.create({ ...formData, id: crypto.randomUUID() });
      }
      
      if (result.success) {
        toast.success(karyawan ? 'Data karyawan berhasil diupdate!' : 'Data karyawan berhasil ditambahkan!');
        onSuccess();
      } else {
        toast.error(result.error || 'Gagal menyimpan data');
      }
    } catch (error) {
      console.error('Error saving karyawan:', error);
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="!max-w-[950px] w-full max-h-[calc(100%-2rem)] overflow-hidden p-0 gap-0 bg-white [&>button]:hidden flex flex-col">
        {/* HEADER */}
        <DialogHeader className="relative bg-[#013E37] text-white px-6 py-4 space-y-0 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {karyawan ? <UserCog className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold leading-tight">
                {karyawan ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </DialogTitle>
              <DialogDescription className="text-white/80 text-sm mt-1 leading-tight">
                {karyawan 
                  ? 'Perbarui informasi karyawan yang sudah terdaftar' 
                  : 'Daftarkan karyawan baru ke dalam sistem'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* CONTENT - Scrollable area */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 text-gray-900">
            
            {/* SECTION 1: Informasi Pribadi */}
            <div className="bg-gradient-to-br from-[#EEF7F5] to-pink-50 rounded-xl border border-[#DFF0EC] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('pribadi')}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-[#DFF0EC]/50 hover:bg-[#DFF0EC] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#013E37] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-[#012D29] leading-none">Informasi Pribadi</h3>
                    <p className="text-[10px] text-[#013E37] mt-1 uppercase tracking-wider font-semibold opacity-70">IDENTITAS & DATA KONTAK PERSONAL</p>
                  </div>
                </div>
                {expandedSections.pribadi ? (
                  <ChevronUp className="w-5 h-5 text-[#013E37]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#013E37]" />
                )}
              </button>
              
              {expandedSections.pribadi && (
                <div className="p-5 pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="nama_lengkap"
                      value={formData.nama_lengkap}
                      onChange={handleInputChange}
                      required
                      placeholder="Nama lengkap sesuai KTP"
                      className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      NIK (KTP) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="nik"
                      value={formData.nik}
                      onChange={handleInputChange}
                      required
                      maxLength={16}
                      placeholder="16 digit NIK"
                      className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Tempat Lahir</Label>
                    <Input
                      name="tempat_lahir"
                      value={formData.tempat_lahir}
                      onChange={handleInputChange}
                      placeholder="Kota tempat lahir"
                      className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Tanggal Lahir</Label>
                    <Input
                      type="date"
                      name="tanggal_lahir"
                      value={formData.tanggal_lahir}
                      onChange={handleInputChange}
                      className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Jenis Kelamin</Label>
                    <Select
                      value={formData.jenis_kelamin}
                      onValueChange={(value) => handleChange('jenis_kelamin', value)}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0">
                        <SelectValue placeholder="Pilih jenis kelamin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Nomor WhatsApp</Label>
                    <Input
                      type="tel"
                      name="nomor_wa"
                      value={formData.nomor_wa}
                      onChange={handleInputChange}
                      placeholder="+62 812-3456-7890"
                      className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Email Pribadi</Label>
                    <Input
                      type="email"
                      name="email_pribadi"
                      value={formData.email_pribadi}
                      onChange={handleInputChange}
                      placeholder="email@gmail.com"
                      className="bg-white border-gray-300 focus:border-[#EEF7F5]0 focus:ring-[#EEF7F5]0"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label className="text-sm font-semibold text-gray-700">Alamat Domisili</Label>
                    <textarea
                      name="alamat"
                      value={formData.alamat}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EEF7F5]0 focus:border-[#EEF7F5]0 text-sm bg-white"
                      placeholder="Alamat lengkap domisili saat ini"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: Status Kepegawaian */}
            <div className="bg-gradient-to-br bg-[#EEF7F5] rounded-xl border border-blue-100 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('kepegawaian')}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-blue-100/50 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-blue-900 leading-none">Status Kepegawaian</h3>
                    <p className="text-[10px] text-blue-700 mt-1 uppercase tracking-wider font-semibold opacity-70">STRUKTUR ORGANISASI & JABATAN</p>
                  </div>
                </div>
                {expandedSections.kepegawaian ? (
                  <ChevronUp className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-blue-600" />
                )}
              </button>
              
              {expandedSections.kepegawaian && (
                <div className="p-5 pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Divisi</Label>
                    <Select
                      value={formData.divisi}
                      onValueChange={(value) => handleChange('divisi', value)}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Pilih divisi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sales & Marketing">Sales & Marketing</SelectItem>
                        <SelectItem value="IT Developer">IT Developer</SelectItem>
                        <SelectItem value="Customer Success">Customer Success</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Legal">Legal</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Jabatan</Label>
                    <Input
                      name="jabatan"
                      value={formData.jabatan}
                      onChange={handleInputChange}
                      placeholder="Contoh: Sales Executive"
                      className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Level Jabatan</Label>
                    <Select
                      value={formData.level_jabatan}
                      onValueChange={(value) => handleChange('level_jabatan', value)}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Pilih level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Staff">Staff</SelectItem>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Director">Director</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Status Karyawan</Label>
                    <Select
                      value={formData.status_karyawan}
                      onValueChange={(value) => handleChange('status_karyawan', value)}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tetap">Tetap</SelectItem>
                        <SelectItem value="Kontrak">Kontrak</SelectItem>
                        <SelectItem value="Probation">Probation</SelectItem>
                        <SelectItem value="Freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Tanggal Bergabung (Join Date)</Label>
                    <Input
                      type="date"
                      name="tanggal_bergabung"
                      value={formData.tanggal_bergabung}
                      onChange={handleInputChange}
                      className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Nama Atasan Langsung</Label>
                    <Input
                      name="nama_atasan"
                      value={formData.nama_atasan}
                      onChange={handleInputChange}
                      placeholder="Nama atasan langsung"
                      className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: Finansial & Administrasi Pajak */}
            <div className="bg-gradient-to-br from-emerald-50 to-[#EEF7F5] rounded-xl border border-emerald-100 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('finansial')}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-emerald-100/50 hover:bg-emerald-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-emerald-900 leading-none">Finansial & Administrasi Pajak</h3>
                    <p className="text-[10px] text-emerald-700 mt-1 uppercase tracking-wider font-semibold opacity-70">PAYROLL & COMPLIANCE DATA</p>
                  </div>
                </div>
                {expandedSections.finansial ? (
                  <ChevronUp className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-emerald-600" />
                )}
              </button>
              
              {expandedSections.finansial && (
                <div className="p-5 pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">NPWP</Label>
                    <Input
                      name="npwp"
                      value={formData.npwp}
                      onChange={handleInputChange}
                      placeholder="00.000.000.0-000.000"
                      className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Nama Bank</Label>
                    <Input
                      name="nama_bank"
                      value={formData.nama_bank}
                      onChange={handleInputChange}
                      placeholder="Contoh: BCA, Mandiri, BNI"
                      className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Nomor Rekening Bank</Label>
                    <Input
                      name="nomor_rekening"
                      value={formData.nomor_rekening}
                      onChange={handleInputChange}
                      placeholder="Nomor rekening"
                      className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Nomor BPJS Ketenagakerjaan</Label>
                    <Input
                      name="bpjs_ketenagakerjaan"
                      value={formData.bpjs_ketenagakerjaan}
                      onChange={handleInputChange}
                      placeholder="Nomor BPJS Ketenagakerjaan"
                      className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Nomor BPJS Kesehatan</Label>
                    <Input
                      name="bpjs_kesehatan"
                      value={formData.bpjs_kesehatan}
                      onChange={handleInputChange}
                      placeholder="Nomor BPJS Kesehatan"
                      className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: Keamanan Data & Akses Sistem */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-100 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('keamanan')}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-red-100/50 hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-red-900 leading-none">Keamanan Data & Akses Sistem</h3>
                    <p className="text-[10px] text-red-700 mt-1 uppercase tracking-wider font-semibold opacity-70">NDA & CREDENTIAL ACCESS</p>
                  </div>
                </div>
                {expandedSections.keamanan ? (
                  <ChevronUp className="w-5 h-5 text-red-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-red-600" />
                )}
              </button>
              
              {expandedSections.keamanan && (
                <div className="p-5 pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Email Kantor (@gmail.com) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      name="email_kantor"
                      value={formData.email_kantor}
                      onChange={handleInputChange}
                      required
                      placeholder="nama@gmail.com"
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Level Akses Database</Label>
                    <Select
                      value={formData.level_akses}
                      onValueChange={(value) => handleChange('level_akses', value)}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500">
                        <SelectValue placeholder="Pilih level akses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No Access">No Access</SelectItem>
                        <SelectItem value="Read Only">Read Only</SelectItem>
                        <SelectItem value="Editor">Editor</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Tanggal Penandatanganan NDA</Label>
                    <Input
                      type="date"
                      name="tanggal_nda"
                      value={formData.tanggal_nda}
                      onChange={handleInputChange}
                      className="bg-white border-gray-300 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2 flex items-end pb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="nda_signed"
                        checked={formData.nda_signed}
                        onCheckedChange={(checked) => handleChange('nda_signed', checked as boolean)}
                      />
                      <label
                        htmlFor="nda_signed"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700"
                      >
                        Sudah Menandatangani NDA
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label className="text-sm font-semibold text-gray-700">Aset Perusahaan yang Diterima</Label>
                    <textarea
                      name="aset_perusahaan"
                      value={formData.aset_perusahaan}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm bg-white"
                      placeholder="Contoh: Laptop MacBook Pro, ID Card, Kendaraan Operasional"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* FOOTER - Sticky */}
          <div className="flex justify-end gap-2.5 px-6 py-3 border-t bg-white flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-w-20 h-8 text-sm font-medium border-gray-300 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-w-28 h-8 text-sm font-semibold bg-[#013E37] hover:bg-[#025C52] text-white shadow-md transition-colors"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {karyawan ? 'Update' : 'Simpan'} Data
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}