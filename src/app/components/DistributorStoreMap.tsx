// Peta Distributor & Toko (Bab 11, Menu Dashboard Manajemen).
//
// Fase 1: peta GIS nyata (Leaflet + OpenStreetMap tiles) menampilkan
// seluruh Distributor & Toko dari distributorsRepository/storesRepository
// (gpsLat/gpsLng, prisma/schema.prisma) — menggantikan pendekatan lama di
// TerritoryMap.tsx (SVG statis dengan beberapa titik contoh, bukan peta
// GIS nyata). Tidak mengubah TerritoryMap.tsx sama sekali; menu itu tetap
// ada terpisah.
//
// Fase 2: layer "Kunjungan Toko" — recency-of-visit & status kepatuhan,
// dari data check-in Task yang sudah ada (Bab 8 gap 2: checkInAt,
// checkInPhotoUrl, storeId). Toggle "Mode Peta" memilih pewarnaan marker
// Toko: status approval (Fase 1, default) atau recency kunjungan. Marker
// Distributor selalu pakai warna status approval -- Task tidak punya
// relasi ke Distributor, hanya ke Store.
//
// Layer lain dari insight doc (heatmap performa/coverage gap terhadap
// Territory, penetrasi kategori produk) sengaja DITUNDA -- butuh
// agregasi lintas-tabel (Territory, Opportunity/Product) yang lebih
// berat daripada menampilkan titik GPS + check-in yang sudah ada.
//
// Default tampilan hanya menampilkan titik berstatus "approved" (perilaku
// operasional yang sebenarnya). Untuk role approver (Super Admin/Sales
// Manager/Master Data Admin) tersedia toggle untuk menampilkan titik
// "pending" juga, sehingga peta ini sekaligus jadi satu tempat untuk
// melihat antrean approval secara spasial.

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Store as StoreIcon, Truck, Clock, CheckCircle2, XCircle, Camera, CameraOff, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/AuthContext';
import { distributorsRepository } from '@/services/distributorsRepository';
import { storesRepository } from '@/services/storesRepository';
import { tasksRepository } from '@/services/tasksRepository';
import { formatDate } from '@/utils/formatters';
import type { Distributor } from '@/types/distributor';
import type { Store } from '@/types/store';
import type { ApprovalStatus } from '@/types/distributor';
import type { Task } from '@/types/task';

const APPROVER_ROLES = new Set(['Super Admin', 'Sales Manager', 'Master Data Admin']);

// Default center: kira-kira tengah Indonesia, dipakai kalau belum ada titik
// dengan koordinat valid untuk dihitung rata-ratanya.
const DEFAULT_CENTER: [number, number] = [-2.5, 118];
const DEFAULT_ZOOM = 5;

const STATUS_COLOR: Record<ApprovalStatus, string> = {
  approved: '#10b981', // emerald-500
  pending: '#f59e0b', // amber-500
  rejected: '#ef4444', // red-500
};

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
};

// Fase 2: ambang recency kunjungan (SLA sederhana, bisa disesuaikan nanti).
const RECENT_DAYS = 7;
const DUE_DAYS = 30;

type VisitBucket = 'recent' | 'due' | 'overdue' | 'never';

const VISIT_COLOR: Record<VisitBucket, string> = {
  recent: '#10b981', // emerald-500 -- dikunjungi <=7 hari
  due: '#f59e0b', // amber-500 -- 8-30 hari, perlu kunjungan ulang
  overdue: '#ef4444', // red-500 -- >30 hari, terlambat
  never: '#6b7280', // gray-500 -- belum pernah check-in
};

const VISIT_LABEL: Record<VisitBucket, string> = {
  recent: 'Baru Dikunjungi',
  due: 'Perlu Kunjungan Ulang',
  overdue: 'Terlambat Kunjungan',
  never: 'Belum Pernah Dikunjungi',
};

interface StoreVisitInfo {
  lastCheckInAt: Date | null;
  hasPhoto: boolean;
  daysSince: number | null;
  bucket: VisitBucket;
}

function toVisitBucket(daysSince: number | null): VisitBucket {
  if (daysSince === null) return 'never';
  if (daysSince <= RECENT_DAYS) return 'recent';
  if (daysSince <= DUE_DAYS) return 'due';
  return 'overdue';
}

// Task.storeId + checkInAt sudah ada dari Bab 8 gap 2 (GPS check-in & foto
// toko bertanggal) -- ambil check-in terakhir per toko dari seluruh Task,
// tanpa perlu endpoint baru.
function computeStoreVisits(tasks: Task[]): Map<string, StoreVisitInfo> {
  const latestByStore = new Map<string, Task>();
  for (const t of tasks) {
    const storeId = t.storeId;
    if (!storeId || !t.checkInAt) continue;
    const existing = latestByStore.get(storeId);
    if (!existing || !existing.checkInAt || new Date(t.checkInAt) > new Date(existing.checkInAt)) {
      latestByStore.set(storeId, t);
    }
  }

  const now = Date.now();
  const result = new Map<string, StoreVisitInfo>();
  for (const [storeId, t] of latestByStore) {
    const lastCheckInAt = new Date(t.checkInAt as string);
    const daysSince = Math.floor((now - lastCheckInAt.getTime()) / (1000 * 60 * 60 * 24));
    result.set(storeId, {
      lastCheckInAt,
      hasPhoto: !!t.checkInPhotoUrl,
      daysSince,
      bucket: toVisitBucket(daysSince),
    });
  }
  return result;
}

type MapMode = 'approval' | 'visit';
type PointKind = 'distributor' | 'store';

interface MapPoint {
  kind: PointKind;
  id: string;
  code: string;
  name: string;
  address: string;
  status: ApprovalStatus;
  lat: number;
  lng: number;
  distributorName: string | null; // only meaningful for stores
  submittedAt: Date | null;
  decidedAt: Date | null;
  rejectionNote: string;
}

function divIcon(kind: PointKind, color: string): L.DivIcon {
  const size = kind === 'distributor' ? 26 : 20;
  const shape =
    kind === 'distributor'
      ? `border-radius:6px;` // square-ish = distributor
      : `border-radius:50%;`; // circle = toko
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};${shape}border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function toPoints(distributors: Distributor[], stores: Store[]): MapPoint[] {
  const distributorPoints: MapPoint[] = distributors
    .filter((d) => d.gpsLat !== null && d.gpsLng !== null)
    .map((d) => ({
      kind: 'distributor',
      id: d.id,
      code: d.code,
      name: d.name,
      address: d.address,
      status: d.status,
      lat: d.gpsLat as number,
      lng: d.gpsLng as number,
      distributorName: null,
      submittedAt: d.submittedAt,
      decidedAt: d.decidedAt,
      rejectionNote: d.rejectionNote,
    }));

  const storePoints: MapPoint[] = stores
    .filter((s) => s.gpsLat !== null && s.gpsLng !== null)
    .map((s) => ({
      kind: 'store',
      id: s.id,
      code: s.code,
      name: s.name,
      address: s.address,
      status: s.status,
      lat: s.gpsLat as number,
      lng: s.gpsLng as number,
      distributorName: s.distributor?.name ?? null,
      submittedAt: s.submittedAt,
      decidedAt: s.decidedAt,
      rejectionNote: s.rejectionNote,
    }));

  return [...distributorPoints, ...storePoints];
}

export function DistributorStoreMap() {
  const { user } = useAuth();
  const isApprover = !!user?.role && APPROVER_ROLES.has(user.role);

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<'all' | PointKind>('all');
  const [searchText, setSearchText] = useState('');
  const [showPending, setShowPending] = useState(false); // approver-only, default off
  const [mapMode, setMapMode] = useState<MapMode>('approval');

  // Bab 9: form pengajuan Distributor/Toko baru (siapa saja yang login
  // bisa mengajukan -- lihat handleDistributors/handleStores POST di
  // api/handler.ts, requireAuth saja, bukan requireRole). GPS lat/lng
  // dibuat wajib di form ini (berbeda dari API yang mengizinkan null)
  // karena halaman ini satu-satunya tempat Distributor/Toko ditampilkan --
  // tanpa koordinat, titik itu tidak akan pernah muncul di mana pun.
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<PointKind>('distributor');
  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    address: '',
    gpsLat: '',
    gpsLng: '',
    distributorId: '',
  });
  const [creating, setCreating] = useState(false);

  // Bab 9: antrean approve/reject -- menyambungkan tombol UI ke
  // distributorsRepository/storesRepository.decide() yang sebelumnya
  // sudah ada di repository tapi tidak pernah dipanggil dari mana pun.
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ kind: PointKind; id: string; name: string } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [distRes, storeRes, taskRes] = await Promise.all([
        distributorsRepository.getAll(),
        storesRepository.getAll(),
        tasksRepository.getAll(),
      ]);
      if (cancelled) return;
      if (distRes.success && distRes.data) {
        setDistributors(distRes.data);
      } else {
        toast.error(distRes.success ? 'Gagal memuat data distributor' : distRes.error);
      }
      if (storeRes.success && storeRes.data) {
        setStores(storeRes.data);
      } else {
        toast.error(storeRes.success ? 'Gagal memuat data toko' : storeRes.error);
      }
      if (taskRes.success && taskRes.data) {
        setTasks(taskRes.data);
      } else {
        // Non-fatal: layer kunjungan (Fase 2) tetap bisa dilewati kalau ini gagal,
        // peta tetap jalan dengan mode "Status Approval" saja.
        console.warn('DistributorStoreMap: gagal memuat data task untuk layer kunjungan', taskRes.success ? undefined : taskRes.error);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allPoints = useMemo(() => toPoints(distributors, stores), [distributors, stores]);

  const storeVisits = useMemo(() => computeStoreVisits(tasks), [tasks]);

  const visiblePoints = useMemo(() => {
    return allPoints.filter((p) => {
      if (p.status === 'rejected') return false;
      if (p.status === 'pending' && !(isApprover && showPending)) return false;
      if (typeFilter !== 'all' && p.kind !== typeFilter) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const haystack = `${p.name} ${p.code} ${p.address}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allPoints, isApprover, showPending, typeFilter, searchText]);

  const mapCenter = useMemo((): [number, number] => {
    if (allPoints.length === 0) return DEFAULT_CENTER;
    const sum = allPoints.reduce(
      (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
      { lat: 0, lng: 0 }
    );
    return [sum.lat / allPoints.length, sum.lng / allPoints.length];
  }, [allPoints]);

  const summary = useMemo(() => {
    const totalDistributor = distributors.length;
    const totalStore = stores.length;
    const pendingCount = allPoints.filter((p) => p.status === 'pending').length;
    const approvedCount = allPoints.filter((p) => p.status === 'approved').length;

    // Fase 2: dihitung dari toko yang approved saja (sesuai dengan yang
    // tampil di peta secara default) -- toko tanpa data GPS tidak dihitung
    // karena memang tidak muncul di peta ini sama sekali.
    const approvedStoreIds = stores.filter((s) => s.status === 'approved' && s.gpsLat !== null && s.gpsLng !== null).map((s) => s.id);
    let neverVisited = 0;
    let overdue = 0;
    let noPhotoRecent = 0; // dikunjungi, tapi check-in terakhir tanpa foto
    for (const id of approvedStoreIds) {
      const visit = storeVisits.get(id);
      if (!visit) {
        neverVisited += 1;
      } else {
        if (visit.bucket === 'overdue') overdue += 1;
        if (!visit.hasPhoto) noPhotoRecent += 1;
      }
    }

    return { totalDistributor, totalStore, pendingCount, approvedCount, neverVisited, overdue, noPhotoRecent };
  }, [distributors, stores, allPoints, storeVisits]);

  function colorFor(p: MapPoint): string {
    if (mapMode === 'visit' && p.kind === 'store') {
      const visit = storeVisits.get(p.id);
      return VISIT_COLOR[visit ? visit.bucket : 'never'];
    }
    return STATUS_COLOR[p.status];
  }

  function openCreate(kind: PointKind) {
    setCreateKind(kind);
    setCreateForm({ code: '', name: '', address: '', gpsLat: '', gpsLng: '', distributorId: '' });
    setCreateOpen(true);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = createForm.code.trim();
    const name = createForm.name.trim();
    if (!code || !name) {
      toast.error('Kode dan nama wajib diisi');
      return;
    }
    const latStr = createForm.gpsLat.trim();
    const lngStr = createForm.gpsLng.trim();
    if (!latStr || !lngStr) {
      toast.error('Koordinat GPS (latitude & longitude) wajib diisi');
      return;
    }
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error('Koordinat GPS harus berupa angka');
      return;
    }

    setCreating(true);
    try {
      if (createKind === 'distributor') {
        const res = await distributorsRepository.create({
          code,
          name,
          address: createForm.address.trim(),
          gpsLat: lat,
          gpsLng: lng,
        });
        if (res.success && res.data) {
          setDistributors((prev) => [res.data as Distributor, ...prev]);
          toast.success('Distributor baru diajukan, menunggu approval');
          setCreateOpen(false);
        } else {
          toast.error(res.success ? 'Gagal menambah distributor' : res.error);
        }
      } else {
        const res = await storesRepository.create({
          code,
          name,
          address: createForm.address.trim(),
          gpsLat: lat,
          gpsLng: lng,
          distributorId: createForm.distributorId || null,
        });
        if (res.success && res.data) {
          setStores((prev) => [res.data as Store, ...prev]);
          toast.success('Toko baru diajukan, menunggu approval');
          setCreateOpen(false);
        } else {
          toast.error(res.success ? 'Gagal menambah toko' : res.error);
        }
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleApprove(kind: PointKind, id: string) {
    setDecidingId(id);
    try {
      if (kind === 'distributor') {
        const res = await distributorsRepository.decide(id, 'approved');
        if (res.success && res.data) {
          setDistributors((prev) => prev.map((d) => (d.id === id ? (res.data as Distributor) : d)));
          toast.success('Disetujui');
        } else {
          toast.error(res.success ? 'Gagal menyetujui' : res.error);
        }
      } else {
        const res = await storesRepository.decide(id, 'approved');
        if (res.success && res.data) {
          setStores((prev) => prev.map((s) => (s.id === id ? (res.data as Store) : s)));
          toast.success('Disetujui');
        } else {
          toast.error(res.success ? 'Gagal menyetujui' : res.error);
        }
      }
    } finally {
      setDecidingId(null);
    }
  }

  function openReject(kind: PointKind, id: string, name: string) {
    setRejectTarget({ kind, id, name });
    setRejectNote('');
  }

  async function handleRejectSubmit() {
    if (!rejectTarget) return;
    if (!rejectNote.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    setRejecting(true);
    try {
      if (rejectTarget.kind === 'distributor') {
        const res = await distributorsRepository.decide(rejectTarget.id, 'rejected', rejectNote.trim());
        if (res.success && res.data) {
          setDistributors((prev) => prev.map((d) => (d.id === rejectTarget.id ? (res.data as Distributor) : d)));
          toast.success('Ditolak');
          setRejectTarget(null);
        } else {
          toast.error(res.success ? 'Gagal menolak' : res.error);
        }
      } else {
        const res = await storesRepository.decide(rejectTarget.id, 'rejected', rejectNote.trim());
        if (res.success && res.data) {
          setStores((prev) => prev.map((s) => (s.id === rejectTarget.id ? (res.data as Store) : s)));
          toast.success('Ditolak');
          setRejectTarget(null);
        } else {
          toast.error(res.success ? 'Gagal menolak' : res.error);
        }
      }
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#013E37]">Peta Distributor & Toko</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sebaran lokasi Distributor dan Toko berdasarkan koordinat GPS, beserta status approval (Bab 9) dan riwayat kunjungan (Bab 8).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate('distributor')}>
            <Plus className="w-4 h-4 mr-2" />
            Distributor Baru
          </Button>
          <Button variant="outline" onClick={() => openCreate('store')}>
            <Plus className="w-4 h-4 mr-2" />
            Toko Baru
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#013E37]/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-[#013E37]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalDistributor}</p>
                <p className="text-xs text-muted-foreground">Total Distributor</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#013E37]/10 flex items-center justify-center">
                <StoreIcon className="w-5 h-5 text-[#013E37]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalStore}</p>
                <p className="text-xs text-muted-foreground">Total Toko</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.approvedCount}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={summary.pendingCount > 0 ? 'border-amber-300 bg-amber-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.pendingCount}</p>
                <p className="text-xs text-muted-foreground">Antrean Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className={summary.neverVisited > 0 ? 'border-gray-300 bg-gray-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.neverVisited}</p>
                <p className="text-xs text-muted-foreground">Toko Belum Pernah Dikunjungi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={summary.overdue > 0 ? 'border-red-300 bg-red-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.overdue}</p>
                <p className="text-xs text-muted-foreground">Terlambat Kunjungan (&gt;{DUE_DAYS} hari)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#013E37]/10 flex items-center justify-center">
                <CameraOff className="w-5 h-5 text-[#013E37]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.noPhotoRecent}</p>
                <p className="text-xs text-muted-foreground">Kunjungan Terakhir Tanpa Foto</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isApprover && (
        <Card className={summary.pendingCount > 0 ? 'border-amber-300' : ''}>
          <CardHeader>
            <CardTitle className="text-base">Antrean Approval ({summary.pendingCount})</CardTitle>
            <CardDescription>
              Distributor & Toko yang menunggu persetujuan Anda. (Hanya menampilkan pengajuan yang sudah
              punya koordinat GPS -- lihat catatan di kode.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allPoints.filter((p) => p.status === 'pending').length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada antrean approval saat ini.</p>
            ) : (
              <div className="space-y-2">
                {allPoints
                  .filter((p) => p.status === 'pending')
                  .map((p) => (
                    <div
                      key={`${p.kind}-${p.id}`}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50/50"
                    >
                      <div className="flex items-center gap-2">
                        {p.kind === 'distributor' ? (
                          <Truck className="w-4 h-4 text-[#013E37]" />
                        ) : (
                          <StoreIcon className="w-4 h-4 text-[#013E37]" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {p.name} <span className="text-xs text-muted-foreground">({p.code})</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.kind === 'distributor' ? 'Distributor' : 'Toko'}
                            {p.distributorName ? ` · ${p.distributorName}` : ''}
                            {p.submittedAt ? ` · Diajukan ${formatDate(p.submittedAt)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={decidingId === p.id}
                          onClick={() => handleApprove(p.kind, p.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          disabled={decidingId === p.id}
                          onClick={() => openReject(p.kind, p.id, p.name)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Tolak
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-base">Peta Sebaran</CardTitle>
              <CardDescription>
                Kotak = Distributor, lingkaran = Toko.{' '}
                {mapMode === 'approval'
                  ? 'Hijau = approved, kuning = pending.'
                  : 'Warna Toko mengikuti kapan terakhir dikunjungi (hijau = baru, kuning = perlu kunjungan ulang, merah = terlambat, abu-abu = belum pernah). Distributor tetap warna status approval.'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={mapMode} onValueChange={(v) => setMapMode(v as MapMode)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Mode Peta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approval">Mode: Status Approval</SelectItem>
                  <SelectItem value="visit">Mode: Kunjungan Toko</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Cari nama, kode, atau alamat..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-56"
              />
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | PointKind)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="store">Toko</SelectItem>
                </SelectContent>
              </Select>
              {isApprover && (
                <div className="flex items-center gap-2">
                  <Switch id="show-pending" checked={showPending} onCheckedChange={setShowPending} />
                  <Label htmlFor="show-pending" className="text-sm whitespace-nowrap">
                    Tampilkan Pending
                  </Label>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[520px] flex items-center justify-center text-muted-foreground text-sm">
              Memuat data peta...
            </div>
          ) : (
            <div className="h-[520px] rounded-xl overflow-hidden border border-gray-100">
              <MapContainer center={mapCenter} zoom={DEFAULT_ZOOM} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {visiblePoints.map((p) => {
                  const visit = p.kind === 'store' ? storeVisits.get(p.id) : undefined;
                  return (
                    <Marker key={`${p.kind}-${p.id}`} position={[p.lat, p.lng]} icon={divIcon(p.kind, colorFor(p))}>
                      <Popup>
                        <div className="space-y-1 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            {p.kind === 'distributor' ? (
                              <Truck className="w-4 h-4 text-[#013E37]" />
                            ) : (
                              <StoreIcon className="w-4 h-4 text-[#013E37]" />
                            )}
                            <span className="font-semibold">{p.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Kode: {p.code}</p>
                          {p.address && <p className="text-xs text-muted-foreground">{p.address}</p>}
                          {p.distributorName && (
                            <p className="text-xs text-muted-foreground">Distributor: {p.distributorName}</p>
                          )}
                          <div className="flex items-center gap-1 pt-1">
                            {p.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {p.status === 'pending' && <Clock className="w-3 h-3 text-amber-600" />}
                            {p.status === 'rejected' && <XCircle className="w-3 h-3 text-red-600" />}
                            <Badge
                              variant="outline"
                              className={
                                p.status === 'approved'
                                  ? 'text-emerald-700 border-emerald-300'
                                  : p.status === 'pending'
                                  ? 'text-amber-700 border-amber-300'
                                  : 'text-red-700 border-red-300'
                              }
                            >
                              {STATUS_LABEL[p.status]}
                            </Badge>
                          </div>
                          {p.status === 'pending' && p.submittedAt && (
                            <p className="text-xs text-muted-foreground">Diajukan: {formatDate(p.submittedAt)}</p>
                          )}
                          {p.status === 'rejected' && p.rejectionNote && (
                            <p className="text-xs text-red-600">Alasan ditolak: {p.rejectionNote}</p>
                          )}
                          {p.kind === 'store' && (
                            <div className="pt-1 border-t border-gray-100 mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" style={{ color: VISIT_COLOR[visit ? visit.bucket : 'never'] }} />
                                <span className="text-xs">
                                  {visit
                                    ? `${VISIT_LABEL[visit.bucket]} (${visit.daysSince} hari lalu)`
                                    : VISIT_LABEL.never}
                                </span>
                              </div>
                              {visit?.lastCheckInAt && (
                                <p className="text-xs text-muted-foreground">
                                  Check-in terakhir: {formatDate(visit.lastCheckInAt)}
                                </p>
                              )}
                              {visit && (
                                <div className="flex items-center gap-1">
                                  {visit.hasPhoto ? (
                                    <Camera className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <CameraOff className="w-3 h-3 text-red-600" />
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {visit.hasPhoto ? 'Ada foto display toko' : 'Tanpa foto display toko'}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && allPoints.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          Belum ada Distributor/Toko dengan koordinat GPS.
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createKind === 'distributor' ? 'Distributor Baru' : 'Toko Baru'}</DialogTitle>
            <DialogDescription>
              Data akan berstatus "Pending" sampai disetujui oleh Super Admin, Sales Manager, atau Master Data
              Admin (Bab 9).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dist-code">Kode *</Label>
                <Input
                  id="dist-code"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  placeholder={createKind === 'distributor' ? 'DIST-001' : 'TOKO-001'}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dist-name">Nama *</Label>
                <Input
                  id="dist-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder={createKind === 'distributor' ? 'PT Distributor Makmur' : 'Toko Bangunan Jaya'}
                  required
                />
              </div>
            </div>
            {createKind === 'store' && (
              <div className="space-y-2">
                <Label htmlFor="dist-parent">Distributor Induk (opsional)</Label>
                <Select
                  value={createForm.distributorId || undefined}
                  onValueChange={(v) => setCreateForm({ ...createForm, distributorId: v })}
                >
                  <SelectTrigger id="dist-parent">
                    <SelectValue placeholder="Pilih distributor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {distributors
                      .filter((d) => d.status === 'approved')
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="dist-address">Alamat</Label>
              <Textarea
                id="dist-address"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dist-lat">Latitude *</Label>
                <Input
                  id="dist-lat"
                  type="number"
                  step="any"
                  value={createForm.gpsLat}
                  onChange={(e) => setCreateForm({ ...createForm, gpsLat: e.target.value })}
                  placeholder="-6.200000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dist-lng">Longitude *</Label>
                <Input
                  id="dist-lng"
                  type="number"
                  step="any"
                  value={createForm.gpsLng}
                  onChange={(e) => setCreateForm({ ...createForm, gpsLng: e.target.value })}
                  placeholder="106.816666"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              * Koordinat GPS wajib diisi agar titik ini muncul di peta setelah disetujui.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Menyimpan...' : 'Ajukan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pengajuan</DialogTitle>
            <DialogDescription>
              {rejectTarget && `Berikan alasan penolakan untuk "${rejectTarget.name}". Alasan ini akan terlihat oleh pengaju.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Alasan Penolakan *</Label>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              placeholder="Contoh: Koordinat GPS tidak valid / duplikat dengan toko lain"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              disabled={rejecting}
              onClick={handleRejectSubmit}
            >
              {rejecting ? 'Menolak...' : 'Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
