// Bab 16.5 lanjutan (24 Sep 2026) -- menutup gap "jumlah pertemuan selalu
// 0": ClientContact.meeting_count dihitung dari OpportunityActivity yang
// contactId-nya menunjuk ke kontak tsb, tapi sampai sekarang tidak ada UI
// yang membiarkan user membuat activity dengan contactId terisi. Dialog
// ini mengisi gap itu -- log pertemuan dicatat sebagai OpportunityActivity
// baru pada salah satu Opportunity milik client yang sama (skema saat ini
// mewajibkan setiap activity menempel ke satu Opportunity, tidak bisa
// lepas ke Client langsung -- lihat catatan di prisma/schema.prisma).

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { toast } from 'sonner';
import { opportunitiesRepository } from '@/services/opportunitiesRepository';
import type { Opportunity } from '@/types/opportunity';
import type { ClientContact } from '@/types/clientContact';

interface LogMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contact: ClientContact;
  onLogged: () => void;
}

const ACTIVITY_TYPES: { value: string; label: string }[] = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Telepon' },
  { value: 'visit', label: 'Site Visit' },
  { value: 'email', label: 'Email' },
];

export function LogMeetingDialog({ open, onOpenChange, clientId, contact, onLogged }: LogMeetingDialogProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opportunityId, setOpportunityId] = useState('');
  const [type, setType] = useState('meeting');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await opportunitiesRepository.getAll();
      if (cancelled) return;
      if (res.success && res.data) {
        const clientOpps = res.data.filter((o) => o.clientId === clientId);
        setOpportunities(clientOpps);
        setOpportunityId(clientOpps[0]?.id ?? '');
      } else if (!res.success) {
        toast.error(res.error ?? 'Gagal memuat daftar opportunity');
      }
      setLoading(false);
    }
    setDescription('');
    setType('meeting');
    load();
    return () => {
      cancelled = true;
    };
  }, [open, clientId]);

  const handleSubmit = async () => {
    if (!opportunityId) {
      toast.error('Pilih opportunity dulu');
      return;
    }
    if (!description.trim()) {
      toast.error('Deskripsi pertemuan wajib diisi');
      return;
    }
    const opportunity = opportunities.find((o) => o.id === opportunityId);
    if (!opportunity) return;

    setSaving(true);
    const res = await opportunitiesRepository.update(opportunity.id, {
      activities: [
        ...opportunity.activities,
        {
          id: `ACT-${Date.now()}`,
          type,
          description,
          createdAt: new Date().toISOString(),
          contactId: contact.id,
        },
      ],
    });
    setSaving(false);

    if (!res.success) {
      toast.error(res.error ?? 'Gagal mencatat pertemuan');
      return;
    }
    toast.success(`Pertemuan dengan ${contact.nama} tercatat`);
    onOpenChange(false);
    onLogged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Pertemuan — {contact.nama}</DialogTitle>
          <DialogDescription>
            Dicatat sebagai aktivitas pada salah satu Opportunity client ini, supaya jumlah pertemuan kontak ini ikut terhitung.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-gray-500 py-4">Memuat daftar opportunity...</p>
        ) : opportunities.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">
            Client ini belum punya Opportunity. Buat Opportunity dulu di menu Opportunity Management sebelum mencatat pertemuan.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Opportunity</Label>
              <Select value={opportunityId} onValueChange={setOpportunityId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opportunities.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Jenis</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Deskripsi *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ringkasan yang dibahas dalam pertemuan"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving || loading || opportunities.length === 0}
            className="bg-[#013E37] hover:bg-[#025C52] text-white"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
