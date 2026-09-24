import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import {
  X, Check, Mail, Phone, MapPin, Calendar, Briefcase, 
  Shield, Building2, FileText, Hospital, Users, Package,
  Sparkles, Target, Lightbulb, Clipboard, MessageSquare, Send, ChevronDown, ChevronUp,
  Percent, Clock, AlertCircle, Network, Brain
} from 'lucide-react';
import { AIEmailGenerator } from '@/app/components/ai/AIEmailGenerator';
import { AILeadScoring } from '@/app/components/ai/AILeadScoring';
import { AISmartRecommendations } from '@/app/components/ai/AISmartRecommendations';
import { ClientOrgTreePanel } from '@/app/components/ClientOrgTreePanel';
import { ClientIntelligencePanel } from '@/app/components/ClientIntelligencePanel';
import { ClientCommunicationsPanel } from '@/app/components/ClientCommunicationsPanel';

import type { Client } from '@/types/client';

interface ClientDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onEdit: () => void;
}

export function ClientDetailDialog({ open, onOpenChange, client, onEdit }: ClientDetailDialogProps) {
  const [showEmailGenerator, setShowEmailGenerator] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    informasiDasar: true,  // Default open
    profilingTeknis: false,
    pengambilKeputusan: false,
    produkLangganan: false,
    discountNegotiation: false,
    dokumentasiLegal: false,
    orgTree: false,
    customerIntelligence: false,
    aiTools: false
  });
  const [discountValue, setDiscountValue] = useState(0);
  const [discountStatus, setDiscountStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  const handleRequestApproval = () => {
    if (discountValue <= 0) {
      toast.error('Masukkan nilai diskon yang valid');
      return;
    }
    setDiscountStatus('pending');
    toast.info(`Permintaan persetujuan diskon ${discountValue}% untuk ${client?.nama_entitas} telah dikirim ke Manager.`);
    
    // Simulate approval after 5 seconds
    setTimeout(() => {
      setDiscountStatus('approved');
      toast.success(`Diskon ${discountValue}% untuk ${client?.nama_entitas} telah DISETUJUI oleh atasan!`);
    }, 5000);
  };
  if (!client) return null;

  const leadData = {
    name: client.nama_pic || 'Contact Person',
    organization: client.nama_entitas,
    kategoriClient: client.kategori_client,
    vendorSebelumnya: client.vendor_sebelumnya,
    budgetStatus: client.status_kontrak,
    lastContactDate: client.tanggal_mulai_langganan,
    interactionCount: 3,
    hasMetDecisionMaker: !!client.nama_pic,
    statusHubungan: client.status_hubungan,
    paketAktif: client.paket_aktif
  };

  return (
    <>
      <AIEmailGenerator 
        open={showEmailGenerator}
        onClose={() => setShowEmailGenerator(false)}
        recipientName={client.nama_pic}
        recipientOrg={client.nama_entitas}
        context={`Client type: ${client.kategori_client}, Package: ${client.paket_aktif}, Status: ${client.status_hubungan}`}
      />

      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[1100px] w-full max-h-[calc(100%-2rem)] overflow-hidden p-0 flex flex-col [&>button]:hidden">
          {/* Hidden Accessibility Headers */}
          <DialogHeader className="sr-only">
            <DialogTitle>{client.nama_entitas} - Detail Client</DialogTitle>
            <DialogDescription>
              Informasi lengkap client termasuk data entitas, profiling teknis, decision maker, subscription, dan legal
            </DialogDescription>
          </DialogHeader>

          {/* Gradient Header */}
          <div className="relative bg-[#013E37] px-5 py-3 text-white flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-xl bg-white shadow-lg flex items-center justify-center">
                    <span className="text-2xl font-bold bg-gradient-to-br from-[#013E37] to-[#025C52] bg-clip-text text-transparent">
                      {client.nama_entitas?.charAt(0) || 'C'}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="text-white">
                  <h2 className="text-xl font-bold mb-0.5">{client.nama_entitas}</h2>
                  <p className="text-white/70 text-sm mb-2">{client.kategori_client}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs">
                      {client.paket_aktif || 'No Package'}
                    </Badge>
                    <Badge className={`${client.status_kontrak === 'Active' ? 'bg-green-500/90' : client.status_kontrak === 'Expired' ? 'bg-red-500/90' : 'bg-yellow-500/90'} text-white border-0 text-xs`}>
                      {client.status_kontrak || 'No Status'}
                    </Badge>
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs">
                      {client.status_hubungan || 'No Relation'}
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-5 overflow-y-auto flex-1">
            {/* Quick Info Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br bg-[#EEF7F5] rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Clipboard className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">ID Client</p>
                    <p className="font-bold text-gray-900 truncate">{client.id_customer || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-[#EEF7F5] rounded-lg p-4 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Nomor Telepon</p>
                    <p className="font-bold text-gray-900 truncate">{client.nomor_telepon || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#EEF7F5] to-pink-50 rounded-lg p-4 border border-[#DFF0EC]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#013E37] flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Vendor Sebelumnya</p>
                    <p className="font-bold text-gray-900 truncate">{client.vendor_sebelumnya || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Informasi Dasar */}
            <div className="bg-gradient-to-br from-emerald-50 to-[#EEF7F5] rounded-xl p-6 border border-emerald-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-none">Informasi Dasar</h3>
                  <p className="text-[10px] text-emerald-700 mt-1 uppercase tracking-wider font-semibold opacity-70">IDENTITAS & DATA KONTAK UTAMA</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clipboard className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">ID Client</p>
                      <p className="font-semibold text-gray-900">{client.id_customer || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Hospital className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Kategori Client</p>
                      <p className="font-semibold text-gray-900">{client.kategori_client}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Nama Entitas</p>
                      <p className="font-semibold text-gray-900">{client.nama_entitas}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Pemilik</p>
                      <p className="font-semibold text-gray-900">{client.owner || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Email Resmi</p>
                      <p className="font-semibold text-gray-900 break-all">{client.email_resmi || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Hospital className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Sektor Kepemilikan</p>
                      <p className="font-semibold text-gray-900">{(client as any).sektor_client || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Alamat Penagihan (Billing)</p>
                      <p className="font-semibold text-gray-900">
                        {(client as any).alamat_penagihan || client.alamat_lengkap || '-'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Alamat Kunjungan / Pengiriman</p>
                      <p className="font-semibold text-gray-900">
                        {(client as any).alamat_pengiriman || client.alamat_lengkap || '-'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Koordinat GPS</p>
                      <p className="font-semibold text-gray-900">{client.koordinat_gps || '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Nomor Telepon</p>
                      <p className="font-semibold text-gray-900">{client.nomor_telepon || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Riwayat Pengadaan (renamed from "Profiling Teknis & Regulasi" --
                Fase 1 item 5, unify Client data model, 23 Sep 2026: the
                healthcare/BPJS-only fields this section showed (ID
                SatuSehat, ID Faskes BPJS, Status Akreditasi, Volume
                Pasien, Jumlah Tempat Tidur) were removed -- no Onduline
                equivalent. Only vendor_sebelumnya (renamed from
                sistem_lama) survives, since it's a real, generic signal
                (who supplied this client before Onduline) that also now
                feeds AILeadScoring's competition-level factor. */}
            <div className="bg-gradient-to-br from-blue-50 to-[#EEF7F5] rounded-xl border border-blue-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections(prev => ({ ...prev, profilingTeknis: !prev.profilingTeknis }))}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-blue-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900 leading-none">Riwayat Pengadaan</h3>
                    <p className="text-[10px] text-blue-700 mt-1 uppercase tracking-wider font-semibold opacity-70">VENDOR / DISTRIBUTOR SEBELUMNYA</p>
                  </div>
                </div>
                {expandedSections.profilingTeknis ? (
                  <ChevronUp className="h-5 w-5 text-blue-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-blue-600" />
                )}
              </button>
              
              {expandedSections.profilingTeknis && (
                <div className="px-6 pb-6 pt-2">
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Briefcase className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Vendor/Distributor Sebelumnya</p>
                        <p className="font-semibold text-gray-900">{client.vendor_sebelumnya || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Data Pengambil Keputusan */}
            <div className="bg-gradient-to-br from-[#EEF7F5] to-pink-50 rounded-xl border border-[#DFF0EC] overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections(prev => ({ ...prev, pengambilKeputusan: !prev.pengambilKeputusan }))}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#DFF0EC]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#013E37] flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900 leading-none">Data Pengambil Keputusan</h3>
                    <p className="text-[10px] text-[#013E37] mt-1 uppercase tracking-wider font-semibold opacity-70">PROFIL PIC & STATUS RELASI BISNIS</p>
                  </div>
                </div>
                {expandedSections.pengambilKeputusan ? (
                  <ChevronUp className="h-5 w-5 text-[#013E37]" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-[#013E37]" />
                )}
              </button>
              
              {expandedSections.pengambilKeputusan && (
                <div className="px-6 pb-6 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-[#013E37] mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Nama PIC</p>
                          <p className="font-semibold text-gray-900">{client.nama_pic || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Briefcase className="h-5 w-5 text-[#013E37] mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Jabatan PIC</p>
                          <p className="font-semibold text-gray-900">{client.jabatan_pic || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-[#013E37] mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">WhatsApp PIC</p>
                          <p className="font-semibold text-gray-900">{client.whatsapp_pic || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-[#013E37] mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Status Hubungan</p>
                          <Badge variant={client.status_hubungan === 'Hot' ? 'default' : 'secondary'} className="mt-1">
                            {client.status_hubungan || '-'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Organisation Tree / Influence Map -- Bab 16.5 (24 Sep 2026) */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections(prev => ({ ...prev, orgTree: !prev.orgTree }))}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-indigo-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Network className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900 leading-none">Organisation Tree & Influence Map</h3>
                    <p className="text-[10px] text-indigo-700 mt-1 uppercase tracking-wider font-semibold opacity-70">STRUKTUR, PERAN, DAN KEDEKATAN HUBUNGAN</p>
                  </div>
                </div>
                {expandedSections.orgTree ? (
                  <ChevronUp className="h-5 w-5 text-indigo-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-indigo-600" />
                )}
              </button>

              {expandedSections.orgTree && client && (
                <div className="px-6 pb-6 pt-2">
                  <ClientOrgTreePanel clientId={client.id} />
                </div>
              )}
            </div>

            {/* Customer Intelligence -- Bab 16.5 (24 Sep 2026) */}
            <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl border border-cyan-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections(prev => ({ ...prev, customerIntelligence: !prev.customerIntelligence }))}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-cyan-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-cyan-700 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900 leading-none">Customer Intelligence</h3>
                    <p className="text-[10px] text-cyan-700 mt-1 uppercase tracking-wider font-semibold opacity-70">INFORMASI INTERNAL & EKSTERNAL CALON CUSTOMER</p>
                  </div>
                </div>
                {expandedSections.customerIntelligence ? (
                  <ChevronUp className="h-5 w-5 text-cyan-700" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-cyan-700" />
                )}
              </button>

              {expandedSections.customerIntelligence && client && (
                <div className="px-6 pb-6 pt-2">
                  <ClientIntelligencePanel clientId={client.id} client={client} />
                </div>
              )}
            </div>

            {/* Status Produk & Langganan */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections(prev => ({ ...prev, produkLangganan: !prev.produkLangganan }))}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-orange-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-600 flex items-center justify-center">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900 leading-none">Status Produk & Langganan</h3>
                    <p className="text-[10px] text-orange-700 mt-1 uppercase tracking-wider font-semibold opacity-70">DETAIL PAKET & KONTRAK LANGGANAN</p>
                  </div>
                </div>
                {expandedSections.produkLangganan ? (
                  <ChevronUp className="h-5 w-5 text-orange-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-orange-600" />
                )}
              </button>
              
              {expandedSections.produkLangganan && (
                <div className="px-6 pb-6 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Package className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Paket Aktif</p>
                          <p className="font-semibold text-gray-900">{client.paket_aktif || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Briefcase className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Modul Tambahan</p>
                          <p className="font-semibold text-gray-900">{client.modul_tambahan || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Status Subscription</p>
                          <Badge variant="outline" className="mt-1">
                            {client.status_subscription || '-'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Status Kontrak</p>
                          <Badge variant={client.status_kontrak === 'Active' ? 'default' : 'secondary'} className="mt-1">
                            {client.status_kontrak || '-'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Total Nilai Kontrak (ACV)</p>
                          <p className="font-semibold text-gray-900">{client.total_nilai_kontrak || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Tanggal Mulai Langganan</p>
                          <p className="font-semibold text-gray-900">{client.tanggal_mulai_langganan || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Tanggal Habis Kontrak</p>
                          <p className="font-semibold text-gray-900">{client.tanggal_habis_kontrak || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Discount & Negotiation Mechanism */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections(prev => ({ ...prev, discountNegotiation: !prev.discountNegotiation }))}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-amber-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-600 flex items-center justify-center shadow-lg shadow-amber-200">
                    <Percent className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900 leading-none">Discount & Negotiation</h3>
                    <p className="text-[10px] text-amber-700 mt-1 uppercase tracking-wider font-semibold opacity-70">MEKANISME PERSETUJUAN DISKON BERJENJANG</p>
                  </div>
                </div>
                {expandedSections.discountNegotiation ? (
                  <ChevronUp className="h-5 w-5 text-amber-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-amber-600" />
                )}
              </button>
              
              {expandedSections.discountNegotiation && (
                <div className="px-6 pb-6 pt-2">
                  <div className="bg-white rounded-xl p-5 border border-amber-100 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="w-full md:w-1/3 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Persentase Diskon yang Diajukan (%)</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={discountValue}
                              onChange={(e) => setDiscountValue(Number(e.target.value))}
                              disabled={discountStatus === 'pending' || discountStatus === 'approved'}
                              className="pl-4 pr-10 py-2 border-2 border-amber-200 focus:ring-amber-500 focus:border-amber-500 transition-all disabled:bg-gray-100 disabled:text-gray-500"
                              placeholder="0"
                              min="0"
                              max="100"
                            />
                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-500 italic">Diskon ini akan berlaku pada periode perpanjangan berikutnya atau revisi kontrak negosiasi.</p>
                        </div>
                        
                        <Button
                          onClick={handleRequestApproval}
                          disabled={discountStatus === 'pending' || discountStatus === 'approved' || discountValue <= 0}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-11"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Minta Persetujuan Atasan
                        </Button>
                      </div>

                      <div className="flex-1 w-full bg-gray-50 rounded-xl p-5 border border-dashed border-gray-300">
                        <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-500" />
                          Status Persetujuan Negosiasi
                        </h4>
                        
                        {!discountStatus ? (
                          <div className="flex flex-col items-center justify-center py-4 text-gray-400 text-center">
                            <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
                            <p className="text-sm italic">Belum ada pengajuan diskon untuk negosiasi ini</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                              discountStatus === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                              discountStatus === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                              'bg-red-50 border-red-200 text-red-800'
                            }`}>
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                discountStatus === 'pending' ? 'bg-amber-100' :
                                discountStatus === 'approved' ? 'bg-emerald-100' :
                                'bg-red-100'
                              }`}>
                                {discountStatus === 'pending' ? <Clock className="h-5 w-5 text-amber-600 animate-spin" /> :
                                 discountStatus === 'approved' ? <Check className="h-5 w-5 text-emerald-600" /> :
                                 <X className="h-5 w-5 text-red-600" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold capitalize">Diskon {discountValue}% - {discountStatus === 'pending' ? 'Menunggu Review' : discountStatus}</p>
                                <p className="text-xs opacity-80">
                                  {discountStatus === 'pending' ? 'Menunggu persetujuan dari Manager/Director via Internal System...' :
                                   discountStatus === 'approved' ? 'Negosiasi disetujui. Silakan update draf kontrak.' :
                                   'Pengajuan ditolak oleh atasan'}
                                </p>
                              </div>
                            </div>

                            <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-500">
                              <p className="font-semibold mb-1">Log Negosiasi:</p>
                              <ul className="space-y-1">
                                <li className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                  Diajukan oleh Account Manager • Baru saja
                                </li>
                                {discountStatus === 'approved' && (
                                  <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Disetujui oleh Director System • Just now
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dokumentasi Legal & Compliance */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections(prev => ({ ...prev, dokumentasiLegal: !prev.dokumentasiLegal }))}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-red-100/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900 leading-none">Dokumentasi Legal & Compliance</h3>
                    <p className="text-[10px] text-red-700 mt-1 uppercase tracking-wider font-semibold opacity-70">VERIFIKASI NPWP & ADMINISTRASI KONTRAK</p>
                  </div>
                </div>
                {expandedSections.dokumentasiLegal ? (
                  <ChevronUp className="h-5 w-5 text-red-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-red-600" />
                )}
              </button>
              
              {expandedSections.dokumentasiLegal && (
                <div className="px-6 pb-6 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">File Kontrak Digital</p>
                          <p className="font-semibold text-gray-900 break-all">{client.file_kontrak_digital || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Status E-Sign</p>
                          <Badge variant={client.status_esign === 'Verified' ? 'default' : 'secondary'} className="mt-1">
                            {client.status_esign || '-'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 mb-1">NPWP</p>
                          <p className="font-semibold text-gray-900">{client.npwp || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Komunikasi -- Bab 16.5 lanjutan (24 Sep 2026): diekstrak ke ClientCommunicationsPanel */}
            <ClientCommunicationsPanel clientId={client.id} />

            {/* AI Tools */}
            <div className="bg-gradient-to-br from-[#EEF7F5] to-[#EEF7F5] rounded-xl border-2 border-[#013E37] overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections(prev => ({ ...prev, aiTools: !prev.aiTools }))}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#d1e7e5] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#013E37] flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-bold text-gray-900">AI Sales Assistant</h3>
                    <p className="text-sm text-gray-600 mt-0.5">Powered by Machine Learning & Predictive Analytics</p>
                  </div>
                </div>
                {expandedSections.aiTools ? (
                  <ChevronUp className="h-5 w-5 text-[#013E37]" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-[#013E37]" />
                )}
              </button>
              
              {expandedSections.aiTools && (
                <div className="px-6 pb-6 pt-2">
                  <Tabs defaultValue="lead-scoring" className="space-y-4">
                    <TabsList className="h-14 bg-gray-100/50 p-1 flex overflow-x-auto no-scrollbar justify-start w-full">
                      <TabsTrigger value="lead-scoring" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 flex-1">
                        <div className="flex items-center gap-1.5 justify-center">
                          <Target className="h-4 w-4" />
                          <span className="font-bold text-sm">Lead Scoring</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">SKOR PROSPEK</span>
                      </TabsTrigger>
                      <TabsTrigger value="recommendations" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 flex-1">
                        <div className="flex items-center gap-1.5 justify-center">
                          <Lightbulb className="h-4 w-4" />
                          <span className="font-bold text-sm">Recommendations</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">SARAN CERDAS</span>
                      </TabsTrigger>
                      <TabsTrigger value="actions" className="flex flex-col gap-0.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 flex-1">
                        <div className="flex items-center gap-1.5 justify-center">
                          <Sparkles className="h-4 w-4" />
                          <span className="font-bold text-sm">Quick Actions</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">TINDAKAN CEPAT</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="lead-scoring" className="space-y-4">
                      <AILeadScoring leadData={leadData} />
                    </TabsContent>
                    
                    <TabsContent value="recommendations" className="space-y-4">
                      <AISmartRecommendations leadData={leadData} />
                    </TabsContent>
                    
                    <TabsContent value="actions" className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => setShowEmailGenerator(true)}
                          className="bg-[#013E37] hover:bg-[#025C52] h-auto py-4 flex-col items-start text-left"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-5 w-5" />
                            <span className="font-bold">AI Email Generator</span>
                          </div>
                          <span className="text-xs text-white/80">Generate personalized emails in seconds</span>
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="border-[#013E37] text-[#013E37] hover:bg-[#EEF7F5] h-auto py-4 flex-col items-start text-left"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Phone className="h-5 w-5" />
                            <span className="font-bold">Schedule Follow-up</span>
                          </div>
                          <span className="text-xs text-gray-600">Set reminder for next contact</span>
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="border-[#013E37] text-[#013E37] hover:bg-[#EEF7F5] h-auto py-4 flex-col items-start text-left"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-5 w-5" />
                            <span className="font-bold">Book Demo</span>
                          </div>
                          <span className="text-xs text-gray-600">Schedule product demonstration</span>
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="border-[#013E37] text-[#013E37] hover:bg-[#EEF7F5] h-auto py-4 flex-col items-start text-left"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-5 w-5" />
                            <span className="font-bold">Generate Proposal</span>
                          </div>
                          <span className="text-xs text-gray-600">Create customized proposal</span>
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="border-[#013E37] text-[#013E37] hover:bg-[#EEF7F5] h-auto py-4 flex-col items-start text-left"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Clipboard className="h-5 w-5" />
                            <span className="font-bold">Copy Data</span>
                          </div>
                          <span className="text-xs text-gray-600">Copy client data to clipboard</span>
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2.5 px-6 py-3 border-t bg-white flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="min-w-20 h-8 text-sm font-medium border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={onEdit}
              className="min-w-28 h-8 text-sm font-semibold bg-[#013E37] hover:bg-[#025C52] text-white shadow-md transition-colors"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Edit Data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}