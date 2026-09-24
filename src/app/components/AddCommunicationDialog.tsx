import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { X, Send, Phone, Mail, Users, MessageSquare, Calendar } from 'lucide-react';
import type { CommunicationType, NewCommunicationInput } from '@/types/communication';

interface AddCommunicationDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (input: NewCommunicationInput) => void;
  // Bab 16.5 lanjutan (24 Sep 2026): daftar kontak org tree client ini,
  // untuk "Kontak Terkait" opsional -- boleh kosong (komunikasi lama pun
  // tidak semua terkait ke kontak tertentu), lihat catatan desain di
  // schema.prisma dekat ClientCommunication.
  contacts?: { id: string; nama: string }[];
  saving?: boolean;
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function nowTimeStr(): string {
  return new Date().toTimeString().slice(0, 5);
}

const EMPTY_FORM = {
  type: 'Telepon' as CommunicationType,
  title: '',
  description: '',
  date: todayDateStr(),
  time: nowTimeStr(),
  category1: '',
  category2: '',
  contactId: '',
};

export function AddCommunicationDialog({ open, onClose, onAdd, contacts = [], saving = false }: AddCommunicationDialogProps) {
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Reset ke default (termasuk tanggal/waktu sekarang) tiap kali dialog
  // dibuka, bukan cuma sekali saat mount.
  useEffect(() => {
    if (open) {
      setFormData(EMPTY_FORM);
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description || !formData.date || !formData.time) {
      alert('Mohon lengkapi semua field yang wajib diisi!');
      return;
    }

    const occurredAt = new Date(`${formData.date}T${formData.time}`).toISOString();
    const categories = [formData.category1, formData.category2].filter(Boolean);

    onAdd({
      type: formData.type,
      title: formData.title,
      description: formData.description,
      occurred_at: occurredAt,
      categories,
      contact_id: formData.contactId || undefined,
    });
  };

  const communicationTypes = [
    { value: 'Telepon', label: 'Telepon', icon: Phone },
    { value: 'Email', label: 'Email', icon: Mail },
    { value: 'Meeting', label: 'Meeting', icon: Users },
    { value: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare },
    { value: 'Visit', label: 'Visit', icon: Calendar },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-[650px] w-full p-0 overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="relative bg-[#013E37] px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Tambah Komunikasi Baru</h2>
                <p className="text-sm text-white/80">Record aktivitas komunikasi dengan client</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Hidden Accessibility Headers */}
        <DialogHeader className="sr-only">
          <DialogTitle>Tambah Komunikasi Baru</DialogTitle>
          <DialogDescription>Form untuk menambahkan record komunikasi dengan client</DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              Tipe Komunikasi <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {communicationTypes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, type: value as CommunicationType }))}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    formData.type === value
                      ? 'border-[#013E37] bg-emerald-50'
                      : 'border-gray-200 hover:border-[#013E37]/50 bg-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${formData.type === value ? 'text-[#013E37]' : 'text-gray-500'}`} />
                  <span className={`text-xs font-medium ${formData.type === value ? 'text-[#013E37]' : 'text-gray-700'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
              Judul Komunikasi <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Contoh: Follow-up Call - Contract Discussion"
              className="border-gray-300 focus:border-[#013E37] focus:ring-[#013E37]"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-semibold text-gray-700">
                Tanggal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                className="border-gray-300 focus:border-[#013E37] focus:ring-[#013E37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-semibold text-gray-700">
                Waktu <span className="text-red-500">*</span>
              </Label>
              <Input
                id="time"
                name="time"
                type="time"
                value={formData.time}
                onChange={handleChange}
                className="border-gray-300 focus:border-[#013E37] focus:ring-[#013E37]"
              />
            </div>
          </div>

          {/* Kontak Terkait (opsional) */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">Kontak Terkait (Opsional)</Label>
            <Select
              value={formData.contactId || 'none'}
              onValueChange={(v) => setFormData((prev) => ({ ...prev, contactId: v === 'none' ? '' : v }))}
            >
              <SelectTrigger className="border-gray-300 focus:border-[#013E37] focus:ring-[#013E37]">
                <SelectValue placeholder="- Tidak dikaitkan ke kontak tertentu -" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">- Tidak dikaitkan ke kontak tertentu -</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
              Deskripsi / Catatan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Deskripsikan detail komunikasi, hasil diskusi, action items, dll."
              rows={4}
              className="border-gray-300 focus:border-[#013E37] focus:ring-[#013E37] resize-none"
            />
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category1" className="text-sm font-semibold text-gray-700">
                Kategori 1 (Opsional)
              </Label>
              <Input
                id="category1"
                name="category1"
                value={formData.category1}
                onChange={handleChange}
                placeholder="Contoh: Hot Lead"
                className="border-gray-300 focus:border-[#013E37] focus:ring-[#013E37]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category2" className="text-sm font-semibold text-gray-700">
                Kategori 2 (Opsional)
              </Label>
              <Input
                id="category2"
                name="category2"
                value={formData.category2}
                onChange={handleChange}
                placeholder="Contoh: Follow-up"
                className="border-gray-300 focus:border-[#013E37] focus:ring-[#013E37]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose} className="min-w-24 border-gray-300 hover:bg-gray-100">
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="min-w-32 bg-[#013E37] hover:bg-[#025C52] text-white">
            <Send className="h-4 w-4 mr-2" />
            {saving ? 'Menyimpan...' : 'Tambah Komunikasi'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
