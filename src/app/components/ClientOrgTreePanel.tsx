// Bab 16.5 -- Organisation Tree / Influence Map (24 Sep 2026).
//
// Komponen terpisah (bukan di-inline ke ClientDetailDialog.tsx yang sudah
// ~1000 baris) supaya fetch data kontak + form add/edit tetap terisolasi.
// Dipasang sebagai satu collapsible section baru di ClientDetailDialog,
// persis di bawah "Data Pengambil Keputusan" yang sudah ada (nama_pic
// tunggal) -- section itu TETAP ADA sebagai ringkasan cepat, panel ini
// untuk pemetaan lengkap (banyak kontak + hierarki + influence role).
//
// Update 24 Sep 2026 (follow-up "peningkatan natural" setelah user tanya
// next steps): daftar kartu flat diganti jadi pohon hierarki sungguhan
// (mengikuti reports_to_id, garis penghubung ala file-tree) supaya
// "Organisation Tree" beneran kelihatan strukturnya sekali lihat, bukan
// cuma grid kartu. Juga ditambah 2 banner peringatan ringan (belum ada
// Decision Maker teridentifikasi / ada hubungan Negative) -- data untuk
// ini sudah ada, cuma belum ditonjolkan ke user.

import React, { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MessagesSquare, Loader2, CalendarPlus, AlertTriangle } from 'lucide-react';
import { clientContactsRepository } from '@/services/clientContactsRepository';
import { LogMeetingDialog } from '@/app/components/LogMeetingDialog';
import type { ClientContact, InfluenceRole, RelationshipStatus, RelationshipCloseness } from '@/types/clientContact';
import { INFLUENCE_ROLE_LABELS, RELATIONSHIP_STATUS_LABELS, RELATIONSHIP_CLOSENESS_LABELS } from '@/types/clientContact';

interface ClientOrgTreePanelProps {
  clientId: string;
}

const RELATIONSHIP_DOT: Record<RelationshipStatus, string> = {
  positive: 'bg-green-500',
  neutral: 'bg-gray-400',
  negative: 'bg-red-500',
};

interface FormState {
  id: string | null;
  nama: string;
  jabatan: string;
  email: string;
  telepon: string;
  whatsapp: string;
  influence_role: InfluenceRole;
  relationship_status: RelationshipStatus;
  closeness: RelationshipCloseness;
  reports_to_id: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  nama: '',
  jabatan: '',
  email: '',
  telepon: '',
  whatsapp: '',
  influence_role: 'influencer',
  relationship_status: 'neutral',
  closeness: 'baru-kenal',
  reports_to_id: '',
  notes: '',
};

// --- Kartu satu kontak -- dipakai baik untuk node di pohon maupun sudah
// cukup mandiri kalau nanti perlu dipakai di tempat lain. ---
interface ContactCardProps {
  contact: ClientContact;
  nameById: Map<string, string>;
  onLogMeeting: (contact: ClientContact) => void;
  onEdit: (contact: ClientContact) => void;
  onDelete: (contact: ClientContact) => void;
}

function ContactCard({ contact, nameById, onLogMeeting, onEdit, onDelete }: ContactCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${RELATIONSHIP_DOT[contact.relationship_status]}`}
              title={RELATIONSHIP_STATUS_LABELS[contact.relationship_status]}
            />
            <p className="font-semibold text-gray-900">{contact.nama}</p>
          </div>
          <p className="text-sm text-gray-500">{contact.jabatan || '-'}</p>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-indigo-600 hover:text-indigo-700"
            title="Catat Pertemuan"
            onClick={() => onLogMeeting(contact)}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(contact)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-red-600 hover:text-red-700"
            onClick={() => onDelete(contact)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        <Badge variant="secondary">{INFLUENCE_ROLE_LABELS[contact.influence_role]}</Badge>
        <Badge variant="outline">{RELATIONSHIP_CLOSENESS_LABELS[contact.closeness]}</Badge>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <MessagesSquare className="h-3.5 w-3.5" /> {contact.meeting_count} pertemuan tercatat
        </span>
        {contact.reports_to_id && (
          <span>
            Lapor ke: <span className="font-medium text-gray-700">{nameById.get(contact.reports_to_id) ?? '-'}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// --- Node pohon -- render kartu + rekursif anak-anaknya lewat garis
// penghubung ala file-tree. `ancestorIds` cuma jaga-jaga kalau suatu saat
// ada siklus di data (backend sekarang cuma cegah "lapor ke diri
// sendiri", bukan siklus lebih panjang A->B->A) supaya tidak infinite
// loop/crash render -- bukan validasi utama, cuma pengaman tampilan. ---
interface ContactNodeProps {
  contact: ClientContact;
  childrenByParent: Map<string, ClientContact[]>;
  nameById: Map<string, string>;
  ancestorIds: Set<string>;
  onLogMeeting: (contact: ClientContact) => void;
  onEdit: (contact: ClientContact) => void;
  onDelete: (contact: ClientContact) => void;
}

function ContactNode({ contact, childrenByParent, nameById, ancestorIds, onLogMeeting, onEdit, onDelete }: ContactNodeProps) {
  const children = (childrenByParent.get(contact.id) ?? []).filter((c) => !ancestorIds.has(c.id));
  const nextAncestors = new Set(ancestorIds);
  nextAncestors.add(contact.id);

  return (
    <div>
      <ContactCard contact={contact} nameById={nameById} onLogMeeting={onLogMeeting} onEdit={onEdit} onDelete={onDelete} />
      {children.length > 0 && (
        <div className="ml-6 mt-2 pl-4 border-l-2 border-indigo-100 space-y-2">
          {children.map((child) => (
            <ContactNode
              key={child.id}
              contact={child}
              childrenByParent={childrenByParent}
              nameById={nameById}
              ancestorIds={nextAncestors}
              onLogMeeting={onLogMeeting}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientOrgTreePanel({ clientId }: ClientOrgTreePanelProps) {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loggingContact, setLoggingContact] = useState<ClientContact | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await clientContactsRepository.getByClientId(clientId);
    if (res.success && res.data) {
      setContacts(res.data);
    } else if (!res.success) {
      toast.error(res.error ?? 'Gagal memuat data kontak');
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

  // Root = kontak tanpa reports_to_id, ATAU yang atasannya sudah tidak
  // ada di daftar ini (mis. baru dihapus) -- supaya tidak ada kontak yang
  // "hilang" dari tampilan pohon kalau data sempat tidak konsisten.
  const validIds = new Set(contacts.map((c) => c.id));
  const childrenByParent = new Map<string, ClientContact[]>();
  const roots: ClientContact[] = [];
  for (const c of contacts) {
    if (c.reports_to_id && validIds.has(c.reports_to_id)) {
      if (!childrenByParent.has(c.reports_to_id)) childrenByParent.set(c.reports_to_id, []);
      childrenByParent.get(c.reports_to_id)!.push(c);
    } else {
      roots.push(c);
    }
  }

  const hasDecisionMaker = contacts.some((c) => c.influence_role === 'decision-maker');
  const negativeContacts = contacts.filter((c) => c.relationship_status === 'negative');

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const startEdit = (contact: ClientContact) => {
    setForm({
      id: contact.id,
      nama: contact.nama,
      jabatan: contact.jabatan,
      email: contact.email,
      telepon: contact.telepon,
      whatsapp: contact.whatsapp,
      influence_role: contact.influence_role,
      relationship_status: contact.relationship_status,
      closeness: contact.closeness,
      reports_to_id: contact.reports_to_id,
      notes: contact.notes,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nama.trim()) {
      toast.error('Nama kontak wajib diisi');
      return;
    }
    setSaving(true);
    const payload = {
      nama: form.nama,
      jabatan: form.jabatan,
      email: form.email,
      telepon: form.telepon,
      whatsapp: form.whatsapp,
      influence_role: form.influence_role,
      relationship_status: form.relationship_status,
      closeness: form.closeness,
      reports_to_id: form.reports_to_id,
      notes: form.notes,
    };
    const res = form.id
      ? await clientContactsRepository.update(form.id, payload)
      : await clientContactsRepository.create({ ...payload, client_id: clientId });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error ?? 'Gagal menyimpan kontak');
      return;
    }
    toast.success(form.id ? 'Kontak diperbarui' : 'Kontak ditambahkan');
    resetForm();
    load();
  };

  const handleDelete = async (contact: ClientContact) => {
    if (!window.confirm(`Hapus kontak "${contact.nama}"?`)) return;
    const res = await clientContactsRepository.remove(contact.id);
    if (!res.success) {
      toast.error(res.error ?? 'Gagal menghapus kontak');
      return;
    }
    toast.success('Kontak dihapus');
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat data kontak...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contacts.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 py-4 text-center">
          Belum ada kontak di organisasi client ini. Tambahkan untuk mulai memetakan struktur pengambil keputusan.
        </p>
      )}

      {contacts.length > 0 && !hasDecisionMaker && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Belum ada kontak dengan peran <strong>Decision Maker</strong> yang teridentifikasi di organisasi ini —
            risiko deal &quot;single-threaded&quot; kalau kontak utama Anda ternyata bukan pengambil keputusan akhir.
          </span>
        </div>
      )}

      {negativeContacts.length > 0 && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Hubungan renggang (Negative) dengan: <strong>{negativeContacts.map((c) => c.nama).join(', ')}</strong> —
            perlu perhatian ekstra sebelum lanjut ke tahap berikutnya.
          </span>
        </div>
      )}

      {roots.length > 0 && (
        <div className="space-y-4">
          {roots.map((root) => (
            <ContactNode
              key={root.id}
              contact={root}
              childrenByParent={childrenByParent}
              nameById={nameById}
              ancestorIds={new Set([root.id])}
              onLogMeeting={setLoggingContact}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {!showForm ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
          className="border-[#013E37] text-[#013E37] hover:bg-[#EEF7F5]"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Kontak
        </Button>
      ) : (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <p className="font-semibold text-gray-900 text-sm">{form.id ? 'Edit Kontak' : 'Kontak Baru'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nama *</Label>
              <Input value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Jabatan</Label>
              <Input value={form.jabatan} onChange={(e) => setForm((f) => ({ ...f, jabatan: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Influence Role *</Label>
              <Select
                value={form.influence_role}
                onValueChange={(v) => setForm((f) => ({ ...f, influence_role: v as InfluenceRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(INFLUENCE_ROLE_LABELS) as InfluenceRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {INFLUENCE_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Relationship</Label>
              <Select
                value={form.relationship_status}
                onValueChange={(v) => setForm((f) => ({ ...f, relationship_status: v as RelationshipStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RELATIONSHIP_STATUS_LABELS) as RelationshipStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {RELATIONSHIP_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Kedekatan</Label>
              <Select
                value={form.closeness}
                onValueChange={(v) => setForm((f) => ({ ...f, closeness: v as RelationshipCloseness }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RELATIONSHIP_CLOSENESS_LABELS) as RelationshipCloseness[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {RELATIONSHIP_CLOSENESS_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Lapor ke</Label>
              <Select
                value={form.reports_to_id || 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, reports_to_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">- Tidak ada -</SelectItem>
                  {contacts
                    .filter((c) => c.id !== form.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nama}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Catatan</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={resetForm}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#013E37] hover:bg-[#025C52] text-white">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      )}
      {loggingContact && (
        <LogMeetingDialog
          open={!!loggingContact}
          onOpenChange={(v) => {
            if (!v) setLoggingContact(null);
          }}
          clientId={clientId}
          contact={loggingContact}
          onLogged={load}
        />
      )}
    </div>
  );
}
