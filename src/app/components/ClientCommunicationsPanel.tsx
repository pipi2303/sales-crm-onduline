// Bab 16.5 lanjutan (24 Sep 2026) -- menggantikan tab "Komunikasi" yang
// sebelumnya cuma useState lokal di ClientDetailDialog.tsx (5 item contoh
// hardcoded, tidak pernah tersimpan). Diekstrak jadi komponen sendiri
// (pola sama dengan ClientOrgTreePanel/ClientIntelligencePanel) supaya
// fetch + form + helper warna/ikon per tipe tidak lagi mengotori file
// ClientDetailDialog yang sudah besar.
//
// SENGAJA berdiri sendiri (fetch clientId langsung), tidak menunggu
// ClientOrgTreePanel -- tapi tetap ambil daftar kontaknya sendiri lewat
// clientContactsRepository supaya "Kontak Terkait" di
// AddCommunicationDialog & badge nama kontak di tiap item bisa terisi.

import React, { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Send, ChevronDown, ChevronUp, Phone, Mail, Users, Calendar, Trash2, Loader2 } from 'lucide-react';
import { AddCommunicationDialog } from '@/app/components/AddCommunicationDialog';
import { clientCommunicationsRepository } from '@/services/clientCommunicationsRepository';
import { clientContactsRepository } from '@/services/clientContactsRepository';
import type { Communication, NewCommunicationInput } from '@/types/communication';

interface ClientCommunicationsPanelProps {
  clientId: string;
}

function getIconForType(type: string) {
  switch (type) {
    case 'Telepon':
      return <Phone className="h-4 w-4 text-green-600" />;
    case 'Email':
      return <Mail className="h-4 w-4 text-blue-600" />;
    case 'Meeting':
      return <Users className="h-4 w-4 text-[#013E37]" />;
    case 'WhatsApp':
      return <MessageSquare className="h-4 w-4 text-emerald-600" />;
    case 'Visit':
      return <Calendar className="h-4 w-4 text-amber-600" />;
    default:
      return <MessageSquare className="h-4 w-4 text-gray-600" />;
  }
}

function getBgColorForType(type: string) {
  switch (type) {
    case 'Telepon':
      return 'bg-green-100';
    case 'Email':
      return 'bg-blue-100';
    case 'Meeting':
      return 'bg-[#DFF0EC]';
    case 'WhatsApp':
      return 'bg-emerald-100';
    case 'Visit':
      return 'bg-amber-100';
    default:
      return 'bg-gray-100';
  }
}

function getBadgeColorForCategory(category: string) {
  const colorMap: Record<string, string> = {
    Telepon: 'bg-green-50 text-green-700 border-green-200',
    Email: 'bg-blue-50 text-blue-700 border-blue-200',
    Meeting: 'bg-[#EEF7F5] text-[#013E37] border-[#C3DDD9]',
    WhatsApp: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Visit: 'bg-amber-50 text-amber-700 border-amber-200',
    'Hot Lead': 'bg-blue-50 text-blue-700 border-blue-200',
    Report: 'bg-[#EEF7F5] text-[#013E37] border-[#C3DDD9]',
    Technical: 'bg-orange-50 text-orange-700 border-orange-200',
    Support: 'bg-red-50 text-red-700 border-red-200',
    Training: 'bg-[#EEF7F5] text-[#013E37] border-[#C3DDD9]',
  };
  return colorMap[category] || 'bg-gray-50 text-gray-700 border-gray-200';
}

export function ClientCommunicationsPanel({ clientId }: ClientCommunicationsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [contacts, setContacts] = useState<{ id: string; nama: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [commRes, contactRes] = await Promise.all([
      clientCommunicationsRepository.getByClientId(clientId),
      clientContactsRepository.getByClientId(clientId),
    ]);
    if (commRes.success && commRes.data) {
      setCommunications(commRes.data);
    } else if (!commRes.success) {
      toast.error(commRes.error ?? 'Gagal memuat data komunikasi');
    }
    if (contactRes.success && contactRes.data) {
      setContacts(contactRes.data.map((c) => ({ id: c.id, nama: c.nama })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (clientId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const nameById = new Map(contacts.map((c) => [c.id, c.nama]));

  const handleAdd = async (input: NewCommunicationInput) => {
    setSaving(true);
    const res = await clientCommunicationsRepository.create(clientId, input);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error ?? 'Gagal menyimpan komunikasi');
      return;
    }
    toast.success('Komunikasi tercatat');
    setShowAddDialog(false);
    load();
  };

  const handleDelete = async (comm: Communication) => {
    if (!window.confirm(`Hapus catatan komunikasi "${comm.title}"?`)) return;
    const res = await clientCommunicationsRepository.remove(comm.id);
    if (!res.success) {
      toast.error(res.error ?? 'Gagal menghapus komunikasi');
      return;
    }
    toast.success('Komunikasi dihapus');
    load();
  };

  return (
    <div className="bg-gradient-to-br from-[#EEF7F5] to-blue-50 rounded-xl border border-[#DFF0EC] overflow-hidden">
      <div className="w-full flex items-center justify-between px-6 py-4 bg-white/50">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="h-10 w-10 rounded-lg bg-[#013E37] flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-bold text-gray-900 leading-none">Komunikasi</h3>
            <p className="text-[10px] text-[#013E37] mt-1 uppercase tracking-wider font-semibold opacity-70">
              LOG INTERAKSI & RIWAYAT FOLLOW-UP
            </p>
          </div>
        </button>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-[#013E37] hover:bg-[#013E37] text-white">
            <Send className="h-4 w-4 mr-2" />
            Tambah Komunikasi
          </Button>
          <button type="button" onClick={() => setExpanded((v) => !v)} className="hover:opacity-80 transition-opacity">
            {expanded ? <ChevronUp className="h-5 w-5 text-[#013E37]" /> : <ChevronDown className="h-5 w-5 text-[#013E37]" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-6 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat data komunikasi...
            </div>
          ) : communications.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Belum ada komunikasi tercatat untuk client ini.</p>
          ) : (
            <div className="space-y-3">
              {communications.map((comm) => (
                <div key={comm.id} className="bg-white rounded-lg p-4 border border-[#DFF0EC] hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full ${getBgColorForType(comm.type)} flex items-center justify-center flex-shrink-0`}>
                      {getIconForType(comm.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{comm.title}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-500 whitespace-nowrap">{comm.timestamp}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(comm)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{comm.description}</p>
                      <div className="flex items-center flex-wrap gap-2">
                        {comm.categories.map((cat) => (
                          <Badge key={cat} variant="outline" className={`text-xs ${getBadgeColorForCategory(cat)}`}>
                            {cat}
                          </Badge>
                        ))}
                        {comm.contact_id && nameById.get(comm.contact_id) && (
                          <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                            {nameById.get(comm.contact_id)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AddCommunicationDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAdd}
        contacts={contacts}
        saving={saving}
      />
    </div>
  );
}
