// FieldSalesMode.tsx — Bab 17 (24 Sep 2026): "Field Sales Mode", menu baru
// khusus sales lapangan yang buka app ini dari HP.
//
// BUKAN app terpisah / native -- ini komponen React biasa yang didaftarkan
// sebagai satu menu sidebar lagi (lihat menuConfig.ts), pakai login &
// data yang sama persis dengan CRM utama. Yang beda cuma UI-nya: satu
// kolom, kartu besar, tombol besar, dioptimasi buat dipakai sambil
// berdiri di depan toko customer, bukan di meja kantor.
//
// Menggabungkan 3 hal yang sebelumnya sudah ada di tempat terpisah,
// supaya sales lapangan tidak perlu buka 3 menu berbeda di layar kecil:
//   1. Daftar tugas kunjungan (Task, lihat TaskManagement.tsx) milik
//      sales yang sedang login hari ini.
//   2. Check-in GPS + foto (tasksRepository.checkIn) -- logika inti
//      (resize foto, getCurrentPosition, penanganan izin lokasi ditolak)
//      SENGAJA diduplikasi dari TaskManagement.tsx (bukan diekstrak ke
//      hook bersama) supaya perubahan di sini tidak berisiko menyentuh
//      TaskManagement.tsx yang sudah stabil & banyak dipakai.
//   3. "Info client ringkas" + quick-add komunikasi -- Task tidak punya
//      relasi langsung ke Client di schema (Task.storeId -> Store, bukan
//      Client -- lihat prisma/schema.prisma), jadi satu-satunya jalan
//      yang reliable adalah field bebas Task.relatedTo (placeholder-nya
//      sendiri contohnya "OPP-001") dicocokkan ke Opportunity.id -> dari
//      situ dapat clientId/clientName/contactPerson/phone/email
//      (Opportunity sudah expose field-field itu langsung, lihat
//      src/types/opportunity.ts). Kalau relatedTo tidak match Opportunity
//      manapun (mis. "CONTRACT-003" atau kosong), info client tidak bisa
//      ditampilkan -- tugas tetap muncul, cuma tanpa kartu info client &
//      tanpa tombol quick-add komunikasi (butuh clientId yang valid).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  MapPin,
  Navigation,
  Mail,
  User,
  Calendar,
  CheckCircle2,
  Circle,
  MessageSquarePlus,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Building2,
  PhoneCall,
  MessageCircle,
  Map as MapIcon,
  CloudOff,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { useConfirm } from '@/app/components/ui/confirm-dialog';
import { useAuth } from '@/app/contexts/AuthContext';
import { tasksRepository } from '@/services/tasksRepository';
import { opportunitiesRepository } from '@/services/opportunitiesRepository';
import { storesRepository } from '@/services/storesRepository';
import { clientContactsRepository } from '@/services/clientContactsRepository';
import { clientCommunicationsRepository } from '@/services/clientCommunicationsRepository';
import { AddCommunicationDialog } from '@/app/components/AddCommunicationDialog';
import type { Task, TaskType } from '@/types/task';
import type { Opportunity } from '@/types/opportunity';
import type { Store } from '@/types/store';
import type { ClientContact } from '@/types/clientContact';
import type { NewCommunicationInput } from '@/types/communication';
import type { CheckInInput } from '@/services/tasksRepository';

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  visit: 'Kunjungan',
  call: 'Telepon',
  email: 'Email',
  other: 'Lainnya',
};

const PRIORITY_BADGE: Record<Task['priority'], { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'Tinggi', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Sedang', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  low: { label: 'Rendah', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isTodayOrOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  return dueDate.slice(0, 10) <= todayStr();
}

// Duplikasi dari TaskManagement.tsx (resizeImageToDataUrl) -- lihat
// catatan desain di atas file ini kenapa tidak diekstrak ke hook bersama.
async function resizeImageToDataUrl(file: File, maxDimension = 1280, quality = 0.7): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca file foto.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar. Coba foto lain.'));
    img.src = rawDataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale) || 1;
  const height = Math.round(image.height * scale) || 1;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak didukung di perangkat/browser ini.');
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

// Bab 36 (24 Sep 2026): WhatsApp deep link dari nomor telepon Indonesia --
// wa.me butuh kode negara "62" tanpa "+"/"0" di depan.
function toWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withCountryCode = digits.startsWith('0')
    ? `62${digits.slice(1)}`
    : digits.startsWith('62')
    ? digits
    : `62${digits}`;
  return `https://wa.me/${withCountryCode}`;
}

// Bab 36: link arah Google Maps ke koordinat toko tujuan.
function toMapsDirectionsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// Bab 36: haversine distance (meter) -- duplikasi kecil dari pola yang
// sama di DistributorStoreMap.tsx (bukan diimpor; lihat catatan desain
// "deliberate duplication" di atas file ini).
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Jarak maksimum (meter) dari koordinat toko tujuan supaya check-in
// dianggap tervalidasi lokasinya. Dipilih longgar (bukan 200m seperti
// DUPLICATE_RADIUS_METERS di DistributorStoreMap.tsx yang tujuannya beda
// -- deteksi duplikasi pendaftaran, bukan validasi kunjungan) supaya
// toleran terhadap akurasi GPS HP & radius bangunan toko.
const CHECKIN_PROXIMITY_METERS = 500;

// Bab 36: antrean check-in offline. Kalau tasksRepository.checkIn() gagal
// karena masalah koneksi (pesan error tetap, lihat apiFetch di
// tasksRepository.ts), payload check-in -- termasuk foto yang sudah
// di-resize -- disimpan di localStorage alih-alih dibuang, supaya bisa
// dikirim ulang otomatis begitu koneksi pulih.
const OFFLINE_QUEUE_KEY = 'fieldSalesMode.offlineCheckInQueue';
const NETWORK_ERROR_MESSAGE = 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.';

interface QueuedCheckIn {
  taskId: string;
  taskTitle: string;
  input: CheckInInput;
  queuedAt: string;
}

function readOfflineQueue(): QueuedCheckIn[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(queue: QueuedCheckIn[]): void {
  try {
    if (queue.length === 0) localStorage.removeItem(OFFLINE_QUEUE_KEY);
    else localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage penuh/diblokir (mis. private browsing) -- antrean
    // offline jadi tidak tersedia, tapi tidak fatal: check-in yang
    // gagal koneksi akan tetap gagal dengan toast error seperti
    // perilaku sebelum Bab 36, bukan crash.
  }
}

// Info client ringkas -- diturunkan dari Opportunity yang relatedTo-nya
// cocok, bukan dari Client langsung. Lihat catatan desain di atas file.
interface BriefClientInfo {
  clientId?: string;
  clientName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export function FieldSalesMode() {
  const { user } = useAuth();
  const confirm = useConfirm();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(false);

  // Bab 36: antrean check-in offline -- lihat catatan desain di atas file.
  const [offlineQueue, setOfflineQueue] = useState<QueuedCheckIn[]>(() => readOfflineQueue());
  const [flushingQueue, setFlushingQueue] = useState(false);

  // GPS check-in state -- sama pola dengan TaskManagement.tsx.
  const [checkInBusy, setCheckInBusy] = useState(false);
  const [checkInTargetTaskId, setCheckInTargetTaskId] = useState<string | null>(null);
  const checkInFileInputRef = useRef<HTMLInputElement>(null);

  // Quick-add komunikasi state.
  const [commsDialogTask, setCommsDialogTask] = useState<Task | null>(null);
  const [commsContacts, setCommsContacts] = useState<{ id: string; nama: string }[]>([]);
  const [commsSaving, setCommsSaving] = useState(false);

  const loadData = async () => {
    const [taskRes, oppRes, storeRes] = await Promise.all([
      tasksRepository.getAll(),
      opportunitiesRepository.getAll(),
      storesRepository.getAll(),
    ]);
    if (taskRes.success && taskRes.data) setTasks(taskRes.data);
    else toast.error(taskRes.error || 'Gagal memuat daftar tugas');
    if (oppRes.success && oppRes.data) setOpportunities(oppRes.data);
    // Opportunity gagal dimuat bukan blocker -- tugas tetap tampil, cuma
    // tanpa info client ringkas.
    if (storeRes.success && storeRes.data) setStores(storeRes.data);
    // Store gagal dimuat juga bukan blocker -- tugas tetap tampil, cuma
    // tanpa tombol "Buka di Maps" & tanpa validasi proximity check-in.
  };

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, []);

  // Bab 36: kirim ulang antrean check-in offline begitu komponen dibuka
  // (mis. sales buka lagi app-nya setelah dapat sinyal) dan begitu
  // browser melaporkan koneksi pulih (event 'online').
  useEffect(() => {
    flushOfflineQueue();
    window.addEventListener('online', flushOfflineQueue);
    return () => window.removeEventListener('online', flushOfflineQueue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  // Task -> Opportunity -> info client ringkas, lihat catatan desain di
  // atas file. Dicocokkan by ID (case-insensitive, trim) karena Related To
  // adalah free-text ("e.g., OPP-001") -- bukan foreign key sungguhan.
  const opportunityById = useMemo(() => {
    const map = new Map<string, Opportunity>();
    for (const o of opportunities) map.set(o.id.trim().toLowerCase(), o);
    return map;
  }, [opportunities]);

  // Bab 36: Task -> Store (via Task.storeId, foreign key sungguhan --
  // beda dari relatedTo yang free-text) -- dipakai untuk tombol "Buka di
  // Maps" dan validasi proximity check-in.
  const storeById = useMemo(() => {
    const map = new Map<string, Store>();
    for (const s of stores) map.set(s.id, s);
    return map;
  }, [stores]);

  const getTaskStore = (task: Task): Store | null => {
    if (!task.storeId) return null;
    return storeById.get(task.storeId) ?? null;
  };

  const getBriefClientInfo = (task: Task): BriefClientInfo | null => {
    const key = task.relatedTo?.trim().toLowerCase();
    if (!key) return null;
    const opp = opportunityById.get(key);
    if (!opp) return null;
    return {
      clientId: opp.clientId,
      clientName: opp.clientName,
      contactPerson: opp.contactPerson,
      phone: opp.phone,
      email: opp.email,
    };
  };

  // Tugas milik sales yang sedang login, belum selesai. Dicocokkan by
  // nama (Task.assignedTo adalah free text yang isinya nama, sama seperti
  // TaskManagement.tsx men-filter "tugas per anggota tim" -- lihat
  // TASK_ASSIGNEES di sana) karena Task tidak punya kolom userId.
  // Bab 36: dibuat trim + case-insensitive (sebelumnya exact-match string
  // ketat) supaya beda spasi/kapitalisasi kecil antara Task.assignedTo
  // dan nama akun tidak membuat tugas diam-diam hilang dari daftar.
  const myOpenTasks = useMemo(() => {
    const myName = user?.name?.trim().toLowerCase();
    if (!myName) return [];
    return tasks.filter(
      (t) => t.assignedTo?.trim().toLowerCase() === myName && t.status !== 'completed'
    );
  }, [tasks, user?.name]);

  const todayTasks = useMemo(
    () =>
      myOpenTasks
        .filter((t) => isTodayOrOverdue(t.dueDate))
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
    [myOpenTasks]
  );

  const upcomingTasks = useMemo(
    () =>
      myOpenTasks
        .filter((t) => !isTodayOrOverdue(t.dueDate))
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
    [myOpenTasks]
  );

  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  const handleMarkCompleted = async (task: Task) => {
    const ok = await confirm(`Tandai "${task.title}" sebagai selesai?`);
    if (!ok) return;
    const res = await tasksRepository.update(task.id, { status: 'completed' });
    if (res.success && res.data) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? (res.data as Task) : t)));
      toast.success('Tugas ditandai selesai');
    } else {
      toast.error(res.error || 'Gagal memperbarui tugas');
    }
  };

  // --- GPS + foto check-in -- duplikasi alur performCheckIn dari
  // TaskManagement.tsx (lihat catatan desain di atas file). Bab 36
  // menambahkan validasi proximity sungguhan + antrean offline di atas
  // alur dasar ini (submitCheckIn/queueOfflineCheckIn/flushOfflineQueue
  // di bawah). ---
  const performCheckIn = async (taskId: string, photoDataUrl?: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.checkInAt) {
      const overwrite = await confirm(
        'Task ini sudah memiliki data check-in sebelumnya. Timpa dengan data baru?'
      );
      if (!overwrite) return;
    }

    if (!navigator.geolocation) {
      toast.error('Perangkat/browser ini tidak mendukung Geolocation API.');
      return;
    }

    const targetStore = getTaskStore(task);

    setCheckInBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Bab 36: validasi proximity sungguhan -- sebelumnya
        // locationValidated selalu true begitu izin GPS diberikan, tanpa
        // memeriksa apakah lokasi itu benar-benar dekat toko tujuan.
        // Kalau toko tujuan tidak diketahui (task tanpa storeId, atau
        // toko belum punya koordinat GPS tersimpan), tetap dianggap
        // valid seperti perilaku lama -- tidak ada dasar untuk menolak.
        let locationValidated = true;
        let distanceMeters: number | null = null;
        if (targetStore?.gpsLat != null && targetStore?.gpsLng != null) {
          distanceMeters = haversineMeters(latitude, longitude, targetStore.gpsLat, targetStore.gpsLng);
          locationValidated = distanceMeters <= CHECKIN_PROXIMITY_METERS;
        }

        await submitCheckIn(
          task,
          { lat: latitude, lng: longitude, accuracy, locationValidated, photoDataUrl },
          distanceMeters
        );
      },
      async (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Izin lokasi diperlukan untuk validasi kunjungan. Foto tetap disimpan tanpa data lokasi.');
          await submitCheckIn(task, { locationValidated: false, photoDataUrl }, null);
        } else {
          setCheckInBusy(false);
          toast.error('Gagal mengambil lokasi (sinyal lemah / timeout). Coba lagi.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Bab 36: dipisah dari performCheckIn supaya bisa dipakai ulang oleh
  // flushOfflineQueue() saat mengirim ulang antrean tersimpan. Kalau
  // gagal murni karena koneksi (pesan error tetap dari apiFetch, lihat
  // tasksRepository.ts), payload diantrekan offline alih-alih dibuang.
  const submitCheckIn = async (task: Task, input: CheckInInput, distanceMeters: number | null) => {
    try {
      const result = await tasksRepository.checkIn(task.id, input);
      if (result.success && result.data) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? (result.data as Task) : t)));
        if (input.locationValidated === false && distanceMeters != null) {
          toast.warning(
            `Check-in tersimpan, tapi lokasi Anda sekitar ${Math.round(distanceMeters)}m dari toko tujuan.`
          );
        } else if (input.accuracy != null) {
          toast.success(`Check-in berhasil (± ${Math.round(input.accuracy)}m)`);
        } else {
          toast.success('Check-in berhasil');
        }
      } else if (result.error === NETWORK_ERROR_MESSAGE) {
        queueOfflineCheckIn(task, input);
      } else {
        toast.error(result.error || 'Gagal menyimpan data check-in');
      }
    } catch (error) {
      console.error('Failed to save check-in:', error);
      queueOfflineCheckIn(task, input);
    } finally {
      setCheckInBusy(false);
    }
  };

  const queueOfflineCheckIn = (task: Task, input: CheckInInput) => {
    const queue = readOfflineQueue();
    queue.push({ taskId: task.id, taskTitle: task.title, input, queuedAt: new Date().toISOString() });
    writeOfflineQueue(queue);
    setOfflineQueue(queue);
    toast.warning('Koneksi bermasalah -- check-in disimpan di perangkat dan akan dikirim otomatis saat online kembali.');
  };

  // Bab 36: kirim ulang seluruh antrean check-in offline. Dipanggil saat
  // komponen dibuka dan saat event 'online' browser terpicu (lihat
  // useEffect di atas), plus tombol retry manual di banner antrean.
  const flushOfflineQueue = async () => {
    const queue = readOfflineQueue();
    if (queue.length === 0) return;
    setFlushingQueue(true);
    const remaining: QueuedCheckIn[] = [];
    let sent = 0;
    for (const item of queue) {
      try {
        const result = await tasksRepository.checkIn(item.taskId, item.input);
        if (result.success && result.data) {
          setTasks((prev) => prev.map((t) => (t.id === item.taskId ? (result.data as Task) : t)));
          sent += 1;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }
    writeOfflineQueue(remaining);
    setOfflineQueue(remaining);
    setFlushingQueue(false);
    if (sent > 0) {
      toast.success(`${sent} check-in tertunda berhasil dikirim`);
    }
  };

  const handleCheckIn = (taskId: string) => {
    setCheckInTargetTaskId(taskId);
    checkInFileInputRef.current?.click();
  };

  const onCheckInPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const taskId = checkInTargetTaskId;
    setCheckInTargetTaskId(null);
    if (!file || !taskId) return;

    try {
      const photoDataUrl = await resizeImageToDataUrl(file);
      await performCheckIn(taskId, photoDataUrl);
    } catch (error) {
      console.error('Failed to process check-in photo:', error);
      toast.error('Gagal memproses foto. Coba lagi.');
    }
  };

  // --- Quick-add komunikasi ---
  const handleOpenCommsDialog = async (task: Task) => {
    const client = getBriefClientInfo(task);
    if (!client?.clientId) return;
    setCommsDialogTask(task);
    const res = await clientContactsRepository.getByClientId(client.clientId);
    if (res.success && res.data) {
      setCommsContacts(res.data.map((c: ClientContact) => ({ id: c.id, nama: c.nama })));
    } else {
      setCommsContacts([]);
    }
  };

  const handleAddCommunication = async (input: NewCommunicationInput) => {
    if (!commsDialogTask) return;
    const client = getBriefClientInfo(commsDialogTask);
    if (!client?.clientId) return;
    setCommsSaving(true);
    try {
      const res = await clientCommunicationsRepository.create(client.clientId, input);
      if (res.success) {
        toast.success('Komunikasi tercatat');
        setCommsDialogTask(null);
      } else {
        toast.error(res.error || 'Gagal menyimpan komunikasi');
      }
    } finally {
      setCommsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <p className="text-sm">Memuat tugas lapangan...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-3 py-4 space-y-4 pb-24">
      {/* Hidden -- triggered programmatically by handleCheckIn(); sama
          pola dengan TaskManagement.tsx: capture="environment" langsung
          buka kamera belakang di HP. */}
      <input
        ref={checkInFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onCheckInPhotoSelected}
      />

      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur -mx-3 px-3 pt-1 pb-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight">Field Sales Mode</h1>
            <p className="text-sm text-muted-foreground">
              Halo{user?.name ? `, ${user.name.split(' ')[0]}` : ''} — {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing} className="shrink-0">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {offlineQueue.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 text-sm text-amber-800 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <CloudOff className="h-4 w-4 shrink-0" />
              {offlineQueue.length} check-in menunggu koneksi untuk dikirim
            </span>
            <Button size="sm" variant="outline" disabled={flushingQueue} onClick={flushOfflineQueue}>
              {flushingQueue ? 'Mengirim...' : 'Coba Kirim'}
            </Button>
          </CardContent>
        </Card>
      )}

      {!user?.name && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            Tidak bisa mengenali nama akun Anda untuk mencocokkan tugas. Coba logout &amp; login kembali.
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
          Tugas Hari Ini &amp; Terlambat ({todayTasks.length})
        </h2>
        {todayTasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Tidak ada tugas untuk hari ini. 🎉
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                expanded={expandedTaskId === task.id}
                onToggle={() => handleToggleExpand(task.id)}
                onMarkCompleted={() => handleMarkCompleted(task)}
                onCheckIn={() => handleCheckIn(task.id)}
                checkInBusy={checkInBusy}
                clientInfo={getBriefClientInfo(task)}
                store={getTaskStore(task)}
                onQuickAddComms={() => handleOpenCommsDialog(task)}
              />
            ))}
          </div>
        )}
      </div>

      {upcomingTasks.length > 0 && (
        <div>
          <button
            className="w-full flex items-center justify-between text-sm font-semibold text-muted-foreground mb-2 px-1"
            onClick={() => setShowUpcoming((v) => !v)}
          >
            <span>Tugas Mendatang ({upcomingTasks.length})</span>
            {showUpcoming ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showUpcoming && (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  expanded={expandedTaskId === task.id}
                  onToggle={() => handleToggleExpand(task.id)}
                  onMarkCompleted={() => handleMarkCompleted(task)}
                  onCheckIn={() => handleCheckIn(task.id)}
                  checkInBusy={checkInBusy}
                  clientInfo={getBriefClientInfo(task)}
                  store={getTaskStore(task)}
                  onQuickAddComms={() => handleOpenCommsDialog(task)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {commsDialogTask && (
        <AddCommunicationDialog
          open={!!commsDialogTask}
          onClose={() => setCommsDialogTask(null)}
          onAdd={handleAddCommunication}
          contacts={commsContacts}
          saving={commsSaving}
        />
      )}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
  onMarkCompleted: () => void;
  onCheckIn: () => void;
  checkInBusy: boolean;
  clientInfo: BriefClientInfo | null;
  store: Store | null;
  onQuickAddComms: () => void;
}

function TaskCard({
  task,
  expanded,
  onToggle,
  onMarkCompleted,
  onCheckIn,
  checkInBusy,
  clientInfo,
  store,
  onQuickAddComms,
}: TaskCardProps) {
  const priority = PRIORITY_BADGE[task.priority];
  const overdue = task.dueDate && task.dueDate.slice(0, 10) < todayStr();

  return (
    <Card className={overdue ? 'border-red-200' : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-green-600 transition-colors"
            onClick={onMarkCompleted}
            aria-label="Tandai selesai"
          >
            <Circle className="h-5 w-5" />
          </button>
          <button className="flex-1 min-w-0 text-left" onClick={onToggle}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold leading-tight">{task.title}</span>
              <Badge variant="outline" className={priority.className}>{priority.label}</Badge>
              <Badge variant="secondary">{TASK_TYPE_LABEL[task.type]}</Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              <span className={overdue ? 'text-red-600 font-medium' : ''}>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('id-ID') : 'Tanpa tanggal'}
                {overdue ? ' (terlambat)' : ''}
              </span>
              {task.checkInAt && task.locationValidated !== false && (
                <span className="flex items-center gap-1 text-green-700 ml-2">
                  <CheckCircle2 className="h-3 w-3" /> Sudah check-in
                </span>
              )}
              {task.checkInAt && task.locationValidated === false && (
                <span className="flex items-center gap-1 text-amber-700 ml-2">
                  <AlertTriangle className="h-3 w-3" /> Check-in (lokasi tidak tervalidasi)
                </span>
              )}
            </div>
          </button>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}

            {clientInfo ? (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {clientInfo.clientName}
                </div>
                {clientInfo.contactPerson && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> {clientInfo.contactPerson}
                  </div>
                )}
                {clientInfo.phone && (
                  <div className="flex items-center gap-3">
                    <a href={`tel:${clientInfo.phone}`} className="flex items-center gap-2 text-blue-600">
                      <PhoneCall className="h-3.5 w-3.5" /> {clientInfo.phone}
                    </a>
                    <a
                      href={toWhatsAppLink(clientInfo.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-green-600"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </div>
                )}
                {clientInfo.email && (
                  <a href={`mailto:${clientInfo.email}`} className="flex items-center gap-2 text-blue-600">
                    <Mail className="h-3.5 w-3.5" /> {clientInfo.email}
                  </a>
                )}
              </div>
            ) : (
              task.relatedTo && (
                <p className="text-xs text-muted-foreground">Terkait: {task.relatedTo}</p>
              )
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {task.type === 'visit' && task.status !== 'completed' && (
                <Button size="sm" variant="outline" disabled={checkInBusy} onClick={onCheckIn}>
                  <Navigation className="h-3.5 w-3.5 mr-1.5" />
                  {checkInBusy ? 'Menyimpan...' : task.checkInAt ? 'Check In Ulang' : 'Check-in GPS'}
                </Button>
              )}
              {store && store.gpsLat != null && store.gpsLng != null && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    window.open(
                      toMapsDirectionsLink(store.gpsLat as number, store.gpsLng as number),
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  <MapIcon className="h-3.5 w-3.5 mr-1.5" />
                  Buka di Maps
                </Button>
              )}
              {clientInfo?.clientId && (
                <Button size="sm" variant="outline" onClick={onQuickAddComms}>
                  <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />
                  Catat Komunikasi
                </Button>
              )}
              {task.status !== 'completed' && (
                <Button size="sm" onClick={onMarkCompleted}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Selesai
                </Button>
              )}
            </div>

            {task.checkInAt && task.checkInLat != null && task.checkInLng != null && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {task.checkInLat.toFixed(5)}, {task.checkInLng.toFixed(5)}
                {task.checkInAccuracy != null && ` (± ${Math.round(task.checkInAccuracy)}m)`}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
