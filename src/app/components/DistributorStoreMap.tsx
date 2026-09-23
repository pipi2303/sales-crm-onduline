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
// Fase 3 (Bab 12 follow-up, 23 Sep 2026): empat gap terakhir dari insight
// doc ditutup di sini --
//   #1 heatmap performa   : mode peta baru "performance", mewarnai titik
//                            berdasarkan agregat nilai Opportunity yang
//                            terhubung lewat Client.distributorId/storeId.
//   #2 coverage gap        : substring-match Territory.region terhadap
//                            alamat Distributor/Toko (tidak ada data
//                            batas wilayah/polygon sama sekali di schema
//                            ini, jadi ini pendekatan pragmatis, bukan
//                            geo-spatial asli) -- dua arah: Territory
//                            tanpa titik, dan titik tanpa Territory.
//   #6 penetrasi kategori  : agregasi OpportunityProduct -> Product.category
//                            untuk Opportunity yang klien-nya terhubung
//                            ke jaringan distribusi ini.
//   #7 distribusi beban    : field Distributor/Store.salesRepId baru
//                            (menunjuk ke User) + UI penugasan/pelepasan
//                            PIC untuk approver, dan ringkasan beban per
//                            sales rep untuk semua orang.
// Semua agregasi dihitung client-side dari data yang sudah/baru
// diambil di sini -- tidak ada endpoint agregasi baru di backend.
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
import { MapPin, Store as StoreIcon, Truck, Clock, CheckCircle2, XCircle, Camera, CameraOff, Plus, AlertTriangle, Users, Package, MapPinOff, UserCog } from 'lucide-react';
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
import { clientsRepository } from '@/services/clientsRepository';
import { opportunitiesRepository } from '@/services/opportunitiesRepository';
import { productsRepository } from '@/services/productsRepository';
import { territoriesRepository } from '@/services/territoriesRepository';
import { usersApi } from '@/services/api';
import { formatDate, formatCurrency } from '@/utils/formatters';
import type { Distributor } from '@/types/distributor';
import type { Store } from '@/types/store';
import type { ApprovalStatus } from '@/types/distributor';
import type { Task } from '@/types/task';
import type { Client } from '@/types/client';
import type { Opportunity } from '@/types/opportunity';
import type { Product } from '@/types/product';
import type { TerritoryProfile } from '@/types/territory';

const APPROVER_ROLES = new Set(['Super Admin', 'Sales Manager', 'Master Data Admin']);

// Bab 12 follow-up (insight #7): usersApi.getAll() mengembalikan row User
// server-side mentah (serializeUser() di api/handler.ts -- role masih
// SCREAMING_SNAKE_CASE Prisma enum, tidak melalui adapter case-conversion
// manapun karena usersApi bukan repository ber-FIELD_MAP seperti yang
// lain).
interface SalesRepUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  SALES_MANAGER: 'Sales Manager',
  SALES_REPRESENTATIVE: 'Sales Representative',
  SALES_EXECUTIVE: 'Sales Executive',
  MASTER_DATA_ADMIN: 'Master Data Admin',
};

const UNASSIGNED_VALUE = '__unassigned__'; // sentinel -- Radix Select tidak mengizinkan value=""

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

type MapMode = 'approval' | 'visit' | 'performance';

// Insight #1 (heatmap performa): dibucketkan (bukan gradien kontinu)
// supaya konsisten dengan pola warna tetap yang sudah dipakai STATUS_COLOR/
// VISIT_COLOR di file ini -- relatif terhadap titik dengan nilai Opportunity
// tertinggi yang sedang tampil, bukan skala absolut.
type PerformanceBucket = 'none' | 'low' | 'medium' | 'high';

const PERFORMANCE_COLOR: Record<PerformanceBucket, string> = {
  none: '#9ca3af', // gray-400 -- belum ada Opportunity tercatat lewat titik ini
  low: '#93c5fd', // blue-300
  medium: '#3b82f6', // blue-500
  high: '#1d4ed8', // blue-700
};

const PERFORMANCE_LABEL: Record<PerformanceBucket, string> = {
  none: 'Belum Ada Opportunity',
  low: 'Nilai Rendah',
  medium: 'Nilai Sedang',
  high: 'Nilai Tinggi',
};

function performanceBucket(value: number, max: number): PerformanceBucket {
  if (value <= 0 || max <= 0) return 'none';
  const ratio = value / max;
  if (ratio >= 0.66) return 'high';
  if (ratio >= 0.33) return 'medium';
  return 'low';
}
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
  // Bab 12 follow-up (insight #7).
  salesRepId: string | null;
  salesRepName: string | null;
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

// Bab 9 follow-up (business decision confirmed with user): warn the
// approver when a pending Distributor/Toko is geographically close to
// another point, instead of blocking submission outright -- the doc's
// own "duplikat kode/lokasi" concern, previously only half-implemented
// (unique `code` constraint only, no location check at all). Computed
// client-side from data already loaded here; no schema/API change
// needed.
const DUPLICATE_RADIUS_METERS = 200;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius, meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Points closer than DUPLICATE_RADIUS_METERS to `point`, excluding itself
// and anything already rejected (a rejected point being nearby isn't a
// signal of a live duplicate).
function findNearbyPoints(point: MapPoint, allPoints: MapPoint[]): MapPoint[] {
  return allPoints.filter((p) => {
    if (p.kind === point.kind && p.id === point.id) return false;
    if (p.status === 'rejected') return false;
    return haversineMeters(point.lat, point.lng, p.lat, p.lng) <= DUPLICATE_RADIUS_METERS;
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
      salesRepId: d.salesRepId,
      salesRepName: d.salesRep?.name ?? null,
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
      salesRepId: s.salesRepId,
      salesRepName: s.salesRep?.name ?? null,
    }));

  return [...distributorPoints, ...storePoints];
}

interface DistributorStoreMapProps {
  // Bab 12 (unifikasi menu CRM, 23 Sep 2026): saat dipasang sebagai tab
  // "Distributor" atau "Toko" di SalesTeam.tsx, kunci tampilan ke satu
  // jenis saja -- selector Tipe disembunyikan, kartu ringkasan & antrean
  // approval ikut difilter. undefined = perilaku lama (semua tipe
  // sekaligus), dipertahankan untuk kompatibilitas.
  fixedTypeFilter?: PointKind;
}

export function DistributorStoreMap({ fixedTypeFilter }: DistributorStoreMapProps = {}) {
  const { user } = useAuth();
  const isApprover = !!user?.role && APPROVER_ROLES.has(user.role);

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  // Bab 12 follow-up -- data tambahan untuk insight #1/#2/#6/#7. Semua
  // non-fatal kalau gagal dimuat (sama seperti tasks di atas): peta inti
  // (GPS + approval + kunjungan) tetap jalan, hanya kartu insight terkait
  // yang menunjukkan data kosong.
  const [salesReps, setSalesReps] = useState<SalesRepUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [territories, setTerritories] = useState<TerritoryProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<'all' | PointKind>(fixedTypeFilter ?? 'all');
  const effectiveTypeFilter: 'all' | PointKind = fixedTypeFilter ?? typeFilter;
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

  // Bab 12 follow-up (insight #7): penugasan/pelepasan PIC sales rep --
  // hanya approver yang bisa memanggil ini (server menolak yang lain
  // lewat DISTRIBUTOR_APPROVER_ROLES/STORE_APPROVER_ROLES).
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [distRes, storeRes, taskRes, usersRes, clientRes, oppRes, productRes, territoryRes] = await Promise.all([
        distributorsRepository.getAll(),
        storesRepository.getAll(),
        tasksRepository.getAll(),
        usersApi.getAll(user?.accessToken),
        clientsRepository.getAll(),
        opportunitiesRepository.getAll(),
        productsRepository.getAll(),
        territoriesRepository.getAll(),
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
      // Bab 12 follow-up -- keempatnya non-fatal: masing-masing hanya
      // membuat satu kartu insight tampil kosong kalau gagal, tidak
      // menghalangi peta inti (GPS + approval + kunjungan) di atas.
      if (usersRes.success && usersRes.data) {
        setSalesReps((usersRes.data as SalesRepUser[]).filter((u) => u.isActive));
      } else {
        console.warn('DistributorStoreMap: gagal memuat data user untuk penugasan sales rep', usersRes.success ? undefined : usersRes.error);
      }
      if (clientRes.success && clientRes.data) {
        setClients(clientRes.data);
      } else {
        console.warn('DistributorStoreMap: gagal memuat data client untuk heatmap performa', clientRes.success ? undefined : clientRes.error);
      }
      if (oppRes.success && oppRes.data) {
        setOpportunities(oppRes.data);
      } else {
        console.warn('DistributorStoreMap: gagal memuat data opportunity untuk heatmap performa', oppRes.success ? undefined : oppRes.error);
      }
      if (productRes.success && productRes.data) {
        setProducts(productRes.data);
      } else {
        console.warn('DistributorStoreMap: gagal memuat data produk untuk penetrasi kategori', productRes.success ? undefined : productRes.error);
      }
      if (territoryRes.success && territoryRes.data) {
        setTerritories(territoryRes.data);
      } else {
        console.warn('DistributorStoreMap: gagal memuat data territory untuk coverage gap', territoryRes.success ? undefined : territoryRes.error);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.accessToken]);

  const allPoints = useMemo(() => toPoints(distributors, stores), [distributors, stores]);

  const storeVisits = useMemo(() => computeStoreVisits(tasks), [tasks]);

  const visiblePoints = useMemo(() => {
    return allPoints.filter((p) => {
      if (p.status === 'rejected') return false;
      if (p.status === 'pending' && !(isApprover && showPending)) return false;
      if (effectiveTypeFilter !== 'all' && p.kind !== effectiveTypeFilter) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const haystack = `${p.name} ${p.code} ${p.address}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allPoints, isApprover, showPending, effectiveTypeFilter, searchText]);

  const pendingWithNearby = useMemo(() => {
    return allPoints
      .filter((p) => p.status === 'pending')
      .filter((p) => effectiveTypeFilter === 'all' || p.kind === effectiveTypeFilter)
      .map((p) => ({ point: p, nearby: findNearbyPoints(p, allPoints) }));
  }, [allPoints, effectiveTypeFilter]);

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
    const scopedPoints = effectiveTypeFilter === 'all' ? allPoints : allPoints.filter((p) => p.kind === effectiveTypeFilter);
    const pendingCount = scopedPoints.filter((p) => p.status === 'pending').length;
    const approvedCount = scopedPoints.filter((p) => p.status === 'approved').length;

    // Fase 2: dihitung dari toko yang approved saja (sesuai dengan yang
    // tampil di peta secara default) -- toko tanpa data GPS tidak dihitung
    // karena memang tidak muncul di peta ini sama sekali. Dilewati total
    // kalau tab ini dikunci ke Distributor saja (tidak relevan).
    let neverVisited = 0;
    let overdue = 0;
    let noPhotoRecent = 0; // dikunjungi, tapi check-in terakhir tanpa foto
    if (effectiveTypeFilter !== 'distributor') {
      const approvedStoreIds = stores.filter((s) => s.status === 'approved' && s.gpsLat !== null && s.gpsLng !== null).map((s) => s.id);
      for (const id of approvedStoreIds) {
        const visit = storeVisits.get(id);
        if (!visit) {
          neverVisited += 1;
        } else {
          if (visit.bucket === 'overdue') overdue += 1;
          if (!visit.hasPhoto) noPhotoRecent += 1;
        }
      }
    }

    return { totalDistributor, totalStore, pendingCount, approvedCount, neverVisited, overdue, noPhotoRecent };
  }, [distributors, stores, allPoints, storeVisits, effectiveTypeFilter]);

  // Bab 12 follow-up (insight #1/#6): Client.distributorId/storeId ->
  // dipakai untuk menghubungkan Opportunity (lewat clientId) ke titik
  // Distributor/Toko yang benar. Data produksi saat ini punya 0 Client/
  // Opportunity (diverifikasi langsung lewat API produksi) -- kartu
  // insight di bawah akan menunjukkan itu apa adanya, bukan bug.
  const clientLocationMap = useMemo(() => {
    const map = new Map<string, { distributorId: string | null; storeId: string | null }>();
    for (const c of clients) {
      map.set(c.id, { distributorId: c.distributor_id || null, storeId: c.store_id || null });
    }
    return map;
  }, [clients]);

  // Insight #1: total nilai Opportunity (semua stage/status -- ini
  // "potensi tercatat", bukan cuma yang sudah closed-won) per titik,
  // dihubungkan lewat Opportunity.clientId -> Client.distributorId/storeId.
  const pointPerformance = useMemo(() => {
    const byDistributor = new Map<string, number>();
    const byStore = new Map<string, number>();
    for (const opp of opportunities) {
      if (!opp.clientId) continue;
      const loc = clientLocationMap.get(opp.clientId);
      if (!loc) continue;
      if (loc.distributorId) {
        byDistributor.set(loc.distributorId, (byDistributor.get(loc.distributorId) ?? 0) + opp.totalValue);
      }
      if (loc.storeId) {
        byStore.set(loc.storeId, (byStore.get(loc.storeId) ?? 0) + opp.totalValue);
      }
    }
    return { byDistributor, byStore };
  }, [opportunities, clientLocationMap]);

  const maxPerformanceValue = useMemo(() => {
    const values = [...pointPerformance.byDistributor.values(), ...pointPerformance.byStore.values()];
    return values.length > 0 ? Math.max(...values) : 0;
  }, [pointPerformance]);

  // Insight #6: agregasi nilai OpportunityProduct per Product.category,
  // dibatasi ke Opportunity yang klien-nya terhubung ke jaringan
  // distribusi (punya distributorId atau storeId) -- bukan seluruh
  // Opportunity di sistem, supaya angkanya relevan dengan tab
  // Distributor/Toko yang sedang dilihat.
  const categoryPenetration = useMemo(() => {
    const categoryById = new Map(products.map((p) => [p.id, p.category]));
    const totals = new Map<string, { totalValue: number; totalQty: number }>();
    for (const opp of opportunities) {
      if (!opp.clientId) continue;
      const loc = clientLocationMap.get(opp.clientId);
      if (!loc) continue;
      const relevant =
        effectiveTypeFilter === 'distributor'
          ? !!loc.distributorId
          : effectiveTypeFilter === 'store'
          ? !!loc.storeId
          : !!loc.distributorId || !!loc.storeId;
      if (!relevant) continue;
      for (const item of opp.products) {
        const category = (item.productId && categoryById.get(item.productId)) || 'Lainnya';
        const bucket = totals.get(category) ?? { totalValue: 0, totalQty: 0 };
        bucket.totalValue += item.totalPrice;
        bucket.totalQty += item.quantity;
        totals.set(category, bucket);
      }
    }
    return Array.from(totals.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [opportunities, products, clientLocationMap, effectiveTypeFilter]);

  // Insight #2 (coverage gap): Territory tidak punya data batas
  // wilayah/polygon sama sekali (hanya `region` bebas teks) -- pendekatan
  // pragmatis: substring-match case-insensitive antara Territory.region
  // dan alamat Distributor/Toko. Divalidasi terhadap data produksi nyata
  // (bukan dummy) sebelum dipilih -- lihat MEMORY.md. Dua arah dihitung:
  // Territory yang tidak punya titik pendukung, dan titik yang tidak
  // masuk Territory manapun (temuan bonus: jejak distribusi riil jauh
  // lebih luas daripada Territory yang tercatat).
  const coverageGap = useMemo(() => {
    const relevantPoints = allPoints.filter(
      (p) => p.status !== 'rejected' && (effectiveTypeFilter === 'all' || p.kind === effectiveTypeFilter)
    );
    const regions = territories
      .map((t) => ({ territory: t, region: t.region.trim().toLowerCase() }))
      .filter((t) => t.region.length > 0);

    const territoriesWithoutPoints = regions
      .filter(({ region }) => !relevantPoints.some((p) => p.address.toLowerCase().includes(region)))
      .map(({ territory }) => territory);

    const pointsWithoutTerritory = relevantPoints.filter((p) => {
      const addr = p.address.trim().toLowerCase();
      if (!addr) return true;
      return !regions.some(({ region }) => addr.includes(region));
    });

    return { territoriesWithoutPoints, pointsWithoutTerritory, relevantCount: relevantPoints.length };
  }, [territories, allPoints, effectiveTypeFilter]);

  // Insight #7: ringkasan beban (jumlah Distributor + Toko aktif, tidak
  // termasuk yang rejected) per sales rep, termasuk grup "Belum
  // Ditugaskan" -- dihitung dari salesRepId di data Distributor/Store
  // yang sudah dimuat, tidak perlu endpoint agregasi baru.
  const salesRepWorkload = useMemo(() => {
    const buckets = new Map<string, { rep: SalesRepUser | null; distributorCount: number; storeCount: number }>();
    const bucketFor = (repId: string | null) => {
      const key = repId ?? UNASSIGNED_VALUE;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { rep: repId ? salesReps.find((r) => r.id === repId) ?? null : null, distributorCount: 0, storeCount: 0 };
        buckets.set(key, bucket);
      }
      return bucket;
    };
    if (effectiveTypeFilter !== 'store') {
      for (const d of distributors) {
        if (d.status === 'rejected') continue;
        bucketFor(d.salesRepId).distributorCount += 1;
      }
    }
    if (effectiveTypeFilter !== 'distributor') {
      for (const s of stores) {
        if (s.status === 'rejected') continue;
        bucketFor(s.salesRepId).storeCount += 1;
      }
    }
    return Array.from(buckets.values()).sort(
      (a, b) => b.distributorCount + b.storeCount - (a.distributorCount + a.storeCount)
    );
  }, [distributors, stores, salesReps, effectiveTypeFilter]);

  // Daftar titik yang bisa ditugaskan PIC-nya -- semua yang belum
  // rejected, TIDAK mengikuti toggle "Tampilkan Pending" (mengelola beban
  // kerja adalah kebutuhan berbeda dari sekadar melihat peta).
  const assignablePoints = useMemo(() => {
    return allPoints
      .filter((p) => p.status !== 'rejected' && (effectiveTypeFilter === 'all' || p.kind === effectiveTypeFilter))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allPoints, effectiveTypeFilter]);

  function colorFor(p: MapPoint): string {
    if (mapMode === 'performance') {
      const value = p.kind === 'distributor' ? pointPerformance.byDistributor.get(p.id) : pointPerformance.byStore.get(p.id);
      return PERFORMANCE_COLOR[performanceBucket(value ?? 0, maxPerformanceValue)];
    }
    if (mapMode === 'visit' && p.kind === 'store') {
      const visit = storeVisits.get(p.id);
      return VISIT_COLOR[visit ? visit.bucket : 'never'];
    }
    return STATUS_COLOR[p.status];
  }

  // Insight #7: dipanggil dari kartu "Distribusi Beban Sales Rep" di
  // bawah -- server (DISTRIBUTOR_APPROVER_ROLES/STORE_APPROVER_ROLES)
  // yang menegakkan siapa boleh memanggil ini, kontrol di UI hanya untuk
  // kenyamanan (disembunyikan dari non-approver).
  async function handleAssignSalesRep(kind: PointKind, id: string, salesRepId: string | null) {
    setAssigningId(id);
    try {
      if (kind === 'distributor') {
        const res = await distributorsRepository.update(id, { salesRepId } as Partial<Distributor>);
        if (res.success && res.data) {
          setDistributors((prev) => prev.map((d) => (d.id === id ? (res.data as Distributor) : d)));
          toast.success(salesRepId ? 'PIC sales rep ditugaskan' : 'Penugasan PIC dilepas');
        } else {
          toast.error(res.success ? 'Gagal memperbarui PIC' : res.error);
        }
      } else {
        const res = await storesRepository.update(id, { salesRepId } as Partial<Store>);
        if (res.success && res.data) {
          setStores((prev) => prev.map((s) => (s.id === id ? (res.data as Store) : s)));
          toast.success(salesRepId ? 'PIC sales rep ditugaskan' : 'Penugasan PIC dilepas');
        } else {
          toast.error(res.success ? 'Gagal memperbarui PIC' : res.error);
        }
      }
    } finally {
      setAssigningId(null);
    }
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
          <h1 className="text-2xl font-bold text-[#013E37]">
            {fixedTypeFilter === 'distributor' ? 'Distributor' : fixedTypeFilter === 'store' ? 'Toko' : 'Peta Distributor & Toko'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {fixedTypeFilter === 'distributor'
              ? 'Sebaran lokasi Distributor berdasarkan koordinat GPS, beserta status approval (Bab 9).'
              : fixedTypeFilter === 'store'
              ? 'Sebaran lokasi Toko berdasarkan koordinat GPS, beserta status approval (Bab 9) dan riwayat kunjungan (Bab 8).'
              : 'Sebaran lokasi Distributor dan Toko berdasarkan koordinat GPS, beserta status approval (Bab 9) dan riwayat kunjungan (Bab 8).'}
          </p>
        </div>
        <div className="flex gap-2">
          {(!fixedTypeFilter || fixedTypeFilter === 'distributor') && (
            <Button variant="outline" onClick={() => openCreate('distributor')}>
              <Plus className="w-4 h-4 mr-2" />
              Distributor Baru
            </Button>
          )}
          {(!fixedTypeFilter || fixedTypeFilter === 'store') && (
            <Button variant="outline" onClick={() => openCreate('store')}>
              <Plus className="w-4 h-4 mr-2" />
              Toko Baru
            </Button>
          )}
        </div>
      </div>

      <div className={fixedTypeFilter ? "grid grid-cols-1 md:grid-cols-3 gap-4" : "grid grid-cols-2 md:grid-cols-4 gap-4"}>
        {(!fixedTypeFilter || fixedTypeFilter === 'distributor') && (
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
        )}
        {(!fixedTypeFilter || fixedTypeFilter === 'store') && (
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
        )}
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

      {effectiveTypeFilter !== 'distributor' && (
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
      )}

      {isApprover && (
        <Card className={summary.pendingCount > 0 ? 'border-amber-300' : ''}>
          <CardHeader>
            <CardTitle className="text-base">Antrean Approval ({summary.pendingCount})</CardTitle>
            <CardDescription>
              {fixedTypeFilter === 'distributor' ? 'Distributor' : fixedTypeFilter === 'store' ? 'Toko' : 'Distributor & Toko'} yang menunggu persetujuan Anda. (Hanya menampilkan pengajuan yang sudah
              punya koordinat GPS -- lihat catatan di kode.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingWithNearby.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada antrean approval saat ini.</p>
            ) : (
              <div className="space-y-2">
                {pendingWithNearby
                  .map(({ point: p, nearby }) => (
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
                          {nearby.length > 0 && (
                            <p className="text-xs text-amber-700 font-medium mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Berdekatan (&lt;{DUPLICATE_RADIUS_METERS}m) dengan: {nearby.map((n) => n.name).join(', ')}
                            </p>
                          )}
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
                {fixedTypeFilter === 'distributor' && (
                  <>
                    Kotak = Distributor.{' '}
                    {mapMode === 'performance'
                      ? 'Warna mengikuti total nilai Opportunity yang terhubung (biru tua = tertinggi, abu-abu = belum ada).'
                      : 'Hijau = approved, kuning = pending.'}
                  </>
                )}
                {fixedTypeFilter === 'store' && (
                  <>
                    Lingkaran = Toko.{' '}
                    {mapMode === 'approval' &&  'Hijau = approved, kuning = pending.'}
                    {mapMode === 'visit' && 'Warna mengikuti kapan terakhir dikunjungi (hijau = baru, kuning = perlu kunjungan ulang, merah = terlambat, abu-abu = belum pernah).'}
                    {mapMode === 'performance' && 'Warna mengikuti total nilai Opportunity yang terhubung (biru tua = tertinggi, abu-abu = belum ada).'}
                  </>
                )}
                {!fixedTypeFilter && (
                  <>
                    Kotak = Distributor, lingkaran = Toko.{' '}
                    {mapMode === 'approval' && 'Hijau = approved, kuning = pending.'}
                    {mapMode === 'visit' && 'Warna Toko mengikuti kapan terakhir dikunjungi (hijau = baru, kuning = perlu kunjungan ulang, merah = terlambat, abu-abu = belum pernah). Distributor tetap warna status approval.'}
                    {mapMode === 'performance' && 'Warna mengikuti total nilai Opportunity yang terhubung (biru tua = tertinggi, abu-abu = belum ada).'}
                  </>
                )}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={mapMode} onValueChange={(v) => setMapMode(v as MapMode)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Mode Peta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approval">Mode: Status Approval</SelectItem>
                  {effectiveTypeFilter !== 'distributor' && (
                    <SelectItem value="visit">Mode: Kunjungan Toko</SelectItem>
                  )}
                  <SelectItem value="performance">Mode: Performa Opportunity</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Cari nama, kode, atau alamat..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-56"
              />
              {!fixedTypeFilter && (
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
              )}
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
                          <p className="text-xs text-muted-foreground">
                            PIC Sales Rep: {p.salesRepName ?? 'Belum ditugaskan'}
                          </p>
                          {mapMode === 'performance' && (
                            <p className="text-xs text-muted-foreground">
                              Nilai Opportunity: {formatCurrency(
                                (p.kind === 'distributor' ? pointPerformance.byDistributor.get(p.id) : pointPerformance.byStore.get(p.id)) ?? 0
                              )}
                            </p>
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

      {/* Bab 12 follow-up (insight #7): ringkasan + penugasan beban PIC sales rep. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="w-4 h-4 text-[#013E37]" />
            Distribusi Beban Sales Rep
          </CardTitle>
          <CardDescription>
            Jumlah {fixedTypeFilter === 'distributor' ? 'Distributor' : fixedTypeFilter === 'store' ? 'Toko' : 'Distributor & Toko'} yang ditangani tiap sales rep (tidak termasuk yang rejected).
            {isApprover && ' Ubah PIC lewat daftar di bawah.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {salesRepWorkload.map((b) => (
                  <div
                    key={b.rep?.id ?? UNASSIGNED_VALUE}
                    className={
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ' +
                      (b.rep ? 'border-gray-200 bg-gray-50' : 'border-amber-200 bg-amber-50')
                    }
                  >
                    <Users className="w-4 h-4 text-[#013E37]" />
                    <span className="font-medium">{b.rep ? b.rep.name : 'Belum Ditugaskan'}</span>
                    <Badge variant="outline">
                      {b.distributorCount + b.storeCount} titik
                      {effectiveTypeFilter === 'all' ? ` (${b.distributorCount} distributor, ${b.storeCount} toko)` : ''}
                    </Badge>
                  </div>
                ))}
                {salesRepWorkload.length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada data.</p>
                )}
              </div>

              {isApprover && (
                <div className="border-t border-gray-100 pt-4 max-h-72 overflow-y-auto space-y-1">
                  {assignablePoints.map((p) => (
                    <div
                      key={`assign-${p.kind}-${p.id}`}
                      className="flex items-center justify-between gap-3 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {p.kind === 'distributor' ? (
                          <Truck className="w-4 h-4 text-[#013E37] shrink-0" />
                        ) : (
                          <StoreIcon className="w-4 h-4 text-[#013E37] shrink-0" />
                        )}
                        <span className="text-sm truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">({p.code})</span>
                      </div>
                      <Select
                        value={p.salesRepId ?? UNASSIGNED_VALUE}
                        onValueChange={(v) => handleAssignSalesRep(p.kind, p.id, v === UNASSIGNED_VALUE ? null : v)}
                        disabled={assigningId === p.id}
                      >
                        <SelectTrigger className="w-56 h-8 text-xs shrink-0">
                          <SelectValue placeholder="Pilih sales rep..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED_VALUE}>Belum Ditugaskan</SelectItem>
                          {salesReps.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name} · {ROLE_LABEL[r.role] ?? r.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {assignablePoints.length === 0 && (
                    <p className="text-sm text-muted-foreground">Belum ada Distributor/Toko untuk ditugaskan.</p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bab 12 follow-up (insight #2): coverage gap terhadap Territory --
          pendekatan substring-match, lihat komentar di coverageGap useMemo. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPinOff className="w-4 h-4 text-[#013E37]" />
            Coverage Gap Wilayah
          </CardTitle>
          <CardDescription>
            Dihitung dari kecocokan teks antara nama wilayah Territory dan alamat Distributor/Toko -- Territory di
            aplikasi ini belum punya data batas wilayah GIS asli, jadi ini perkiraan, bukan kepastian geografis.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2">
              Territory Tanpa {fixedTypeFilter === 'distributor' ? 'Distributor' : fixedTypeFilter === 'store' ? 'Toko' : 'Distributor/Toko'} Terpetakan ({coverageGap.territoriesWithoutPoints.length}/{territories.length})
            </p>
            {coverageGap.territoriesWithoutPoints.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {territories.length === 0 ? 'Belum ada data Territory.' : 'Semua Territory sudah punya titik pendukung.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {coverageGap.territoriesWithoutPoints.map((t) => (
                  <Badge key={t.id} variant="outline" className="text-amber-700 border-amber-300">
                    {t.name} ({t.region})
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium mb-2">
              {fixedTypeFilter === 'distributor' ? 'Distributor' : fixedTypeFilter === 'store' ? 'Toko' : 'Distributor/Toko'} di Luar Wilayah Territory Manapun ({coverageGap.pointsWithoutTerritory.length}/{coverageGap.relevantCount})
            </p>
            {coverageGap.pointsWithoutTerritory.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {coverageGap.relevantCount === 0 ? 'Belum ada data.' : 'Semua titik sudah tercakup Territory.'}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {coverageGap.pointsWithoutTerritory.slice(0, 8).map((p) => (
                    <Badge key={`${p.kind}-${p.id}`} variant="outline" className="text-gray-700 border-gray-300">
                      {p.name}
                    </Badge>
                  ))}
                </div>
                {coverageGap.pointsWithoutTerritory.length > 8 && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    +{coverageGap.pointsWithoutTerritory.length - 8} lainnya
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bab 12 follow-up (insight #6): penetrasi kategori produk. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-[#013E37]" />
            Penetrasi Kategori Produk
          </CardTitle>
          <CardDescription>
            Total nilai Opportunity per kategori produk, dibatasi ke Opportunity yang klien-nya terhubung ke jaringan
            distribusi {fixedTypeFilter === 'distributor' ? 'Distributor' : fixedTypeFilter === 'store' ? 'Toko' : 'Distributor/Toko'} ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoryPenetration.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada Opportunity yang terhubung ke Client dengan Distributor/Toko tercatat.
            </p>
          ) : (
            <div className="space-y-3">
              {categoryPenetration.map((c) => {
                const maxValue = categoryPenetration[0].totalValue || 1;
                const widthPct = Math.max(4, Math.round((c.totalValue / maxValue) * 100));
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{c.category}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(c.totalValue)} · {c.totalQty} unit
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-[#013E37] rounded-full" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                );
              })}
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
