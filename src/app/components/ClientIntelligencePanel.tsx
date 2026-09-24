// Bab 16.5 -- Customer Intelligence MVP (24 Sep 2026).
//
// Kombinasi "informasi eksternal" (field manual di bawah -- diisi sales/
// manager dari riset sendiri, TIDAK ada integrasi API/scraping pihak
// ketiga di MVP ini, lihat catatan biaya/legal di schema.prisma) dan
// "informasi internal" (data yang sudah ada di app ini: jumlah
// opportunity, status kontrak, dsb -- ditampilkan sebagai ringkasan lewat
// prop `client`, bukan fetch ulang).

import React, { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { clientIntelligenceRepository } from '@/services/clientIntelligenceRepository';
import type { Client } from '@/types/client';

interface ClientIntelligencePanelProps {
  clientId: string;
  client: Client;
}

interface FormState {
  profil_bisnis: string;
  proyek_berjalan: string;
  kompetitor_eksisting: string;
  sumber_informasi: string;
  catatan_tambahan: string;
}

const EMPTY_FORM: FormState = {
  profil_bisnis: '',
  proyek_berjalan: '',
  kompetitor_eksisting: '',
  sumber_informasi: '',
  catatan_tambahan: '',
};

export function ClientIntelligencePanel({ clientId, client }: ClientIntelligencePanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await clientIntelligenceRepository.getByClientId(clientId);
      if (cancelled) return;
      if (res.success) {
        if (res.data) {
          setForm({
            profil_bisnis: res.data.profil_bisnis,
            proyek_berjalan: res.data.proyek_berjalan,
            kompetitor_eksisting: res.data.kompetitor_eksisting,
            sumber_informasi: res.data.sumber_informasi,
            catatan_tambahan: res.data.catatan_tambahan,
          });
          setLastUpdated(res.data.updated_at);
        } else {
          setForm(EMPTY_FORM);
          setLastUpdated('');
        }
      } else {
        toast.error(res.error ?? 'Gagal memuat customer intelligence');
      }
      setLoading(false);
    }
    if (clientId) load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const handleSave = async () => {
    setSaving(true);
    const res = await clientIntelligenceRepository.save(clientId, form);
    setSaving(false);
    if (!res.success || !res.data) {
      toast.error(res.error ?? 'Gagal menyimpan customer intelligence');
      return;
    }
    setLastUpdated(res.data.updated_at);
    toast.success('Customer intelligence tersimpan');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat customer intelligence...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informasi internal -- diambil dari data yang sudah ada di app ini,
          bukan input manual baru. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Kategori Client</p>
          <p className="font-semibold text-gray-900 text-sm">{client.kategori_client || '-'}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Status Kontrak</p>
          <p className="font-semibold text-gray-900 text-sm">{client.status_kontrak || '-'}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Paket Aktif</p>
          <p className="font-semibold text-gray-900 text-sm">{client.paket_aktif || '-'}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-xs text-gray-500">Vendor Sebelumnya</p>
          <p className="font-semibold text-gray-900 text-sm">{client.vendor_sebelumnya || '-'}</p>
        </div>
      </div>

      {/* Informasi eksternal -- manual, hasil riset sales/manager. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Profil Bisnis</Label>
          <Textarea
            value={form.profil_bisnis}
            onChange={(e) => setForm((f) => ({ ...f, profil_bisnis: e.target.value }))}
            rows={3}
            placeholder="Skala usaha, jumlah proyek per tahun, area operasi, dsb."
          />
        </div>
        <div>
          <Label className="text-xs">Proyek yang Sedang Berjalan</Label>
          <Textarea
            value={form.proyek_berjalan}
            onChange={(e) => setForm((f) => ({ ...f, proyek_berjalan: e.target.value }))}
            rows={3}
            placeholder="Proyek konstruksi/renovasi yang diketahui sedang berjalan"
          />
        </div>
        <div>
          <Label className="text-xs">Kompetitor Eksisting</Label>
          <Textarea
            value={form.kompetitor_eksisting}
            onChange={(e) => setForm((f) => ({ ...f, kompetitor_eksisting: e.target.value }))}
            rows={3}
            placeholder="Vendor/brand atap lain yang sudah/pernah dipakai"
          />
        </div>
        <div>
          <Label className="text-xs">Sumber Informasi</Label>
          <Textarea
            value={form.sumber_informasi}
            onChange={(e) => setForm((f) => ({ ...f, sumber_informasi: e.target.value }))}
            rows={3}
            placeholder="Dari mana info ini didapat -- referral, situs resmi, obrolan lapangan, dsb."
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Catatan Tambahan</Label>
        <Textarea
          value={form.catatan_tambahan}
          onChange={(e) => setForm((f) => ({ ...f, catatan_tambahan: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {lastUpdated ? `Terakhir diperbarui: ${new Date(lastUpdated).toLocaleString('id-ID')}` : 'Belum pernah diisi'}
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#013E37] hover:bg-[#025C52] text-white">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </div>
  );
}
