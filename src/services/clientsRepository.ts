// Clients repository — same adapter pattern as leadsRepository.ts.
//
// Fase 1 item 2, Client module (23 Sep 2026). Replaces
// src/services/api.ts's clientsApi (which only ever read/wrote
// localStorage) with real calls to GET/POST/PUT/DELETE /api/clients
// (prisma/schema.prisma's Client model, which already existed but had no
// route until now). The only shape gap is naming: the frontend Client
// type (src/types/client.ts) uses snake_case field names inherited from
// the original form fields, while the Prisma model/API use camelCase —
// toApiPayload/fromApiClient translate between the two so the rest of the
// app (ClientForm.tsx, SalesTeam.tsx, OpportunityFormNew.tsx) doesn't
// have to change.

import type { Client } from '@/types/client';
import type { Result } from '@/types/result';

function getAuthToken(): string | undefined {
  try {
    const raw = localStorage.getItem('salesMonitorUser');
    if (!raw) return undefined;
    return JSON.parse(raw)?.accessToken;
  } catch {
    return undefined;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<Result<T>> {
  try {
    const token = getAuthToken();
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const body = res.status === 204 ? { success: true } : await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, error: 'Sesi login tidak valid atau sudah berakhir. Silakan logout dan login kembali.' };
      }
      return { success: false, error: body.error ?? 'Terjadi kesalahan pada server' };
    }
    return body as Result<T>;
  } catch (error) {
    console.error(`clientsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

// snake_case (frontend Client type) <-> camelCase (Prisma Client model)
const FIELD_MAP: Record<keyof Client, string> = {
  id: 'id',
  id_customer: 'idCustomer',
  nama_entitas: 'namaEntitas',
  kategori_client: 'kategoriClient',
  owner: 'owner',
  alamat_lengkap: 'alamatLengkap',
  koordinat_gps: 'koordinatGps',
  nomor_telepon: 'nomorTelepon',
  email_resmi: 'emailResmi',
  nama_pic: 'namaPic',
  jabatan_pic: 'jabatanPic',
  whatsapp_pic: 'whatsappPic',
  status_hubungan: 'statusHubungan',
  paket_aktif: 'paketAktif',
  modul_tambahan: 'modulTambahan',
  status_kontrak: 'statusKontrak',
  status_subscription: 'statusSubscription',
  tanggal_mulai_langganan: 'tanggalMulaiLangganan',
  tanggal_habis_kontrak: 'tanggalHabisKontrak',
  total_nilai_kontrak: 'totalNilaiKontrak',
  file_kontrak_digital: 'fileKontrakDigital',
  status_esign: 'statusEsign',
  npwp: 'npwp',
  vendor_sebelumnya: 'vendorSebelumnya',
  distributor_id: 'distributorId',
  store_id: 'storeId',
  status: 'status',
  submitted_by_id: 'submittedById',
  submitted_at: 'submittedAt',
  decided_by_id: 'decidedById',
  decided_at: 'decidedAt',
  rejection_note: 'rejectionNote',
};

// ApprovalStatus is SCREAMING_SNAKE_CASE server-side, lower-case client-side
// -- same convention as distributorsRepository.ts/storesRepository.ts.
const STATUS_OUT: Record<Client['status'], string> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
};
const STATUS_IN: Record<string, Client['status']> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

function toApiPayload(input: Partial<Client>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [snakeKey, camelKey] of Object.entries(FIELD_MAP)) {
    const value = (input as Record<string, unknown>)[snakeKey];
    if (value !== undefined && snakeKey !== 'id') {
      payload[camelKey] = value;
    }
  }
  if (input.status !== undefined) payload.status = STATUS_OUT[input.status];
  return payload;
}

function fromApiClient(row: any): Client {
  const client: Record<string, unknown> = {};
  for (const [snakeKey, camelKey] of Object.entries(FIELD_MAP)) {
    client[snakeKey] = row[camelKey] ?? (snakeKey === 'id' ? row.id : '');
  }
  client.status = STATUS_IN[row.status] ?? 'approved';
  return client as unknown as Client;
}

export const clientsRepository = {
  async getAll(): Promise<Result<Client[]>> {
    const res = await apiFetch<any[]>('/api/clients');
    if (!res.success || !res.data) return res as Result<Client[]>;
    return { success: true, data: res.data.map(fromApiClient) };
  },

  async getById(id: string): Promise<Result<Client>> {
    const res = await apiFetch<any>(`/api/clients/${id}`);
    if (!res.success || !res.data) return res as Result<Client>;
    return { success: true, data: fromApiClient(res.data) };
  },

  async create(input: Partial<Client>): Promise<Result<Client>> {
    const res = await apiFetch<any>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(toApiPayload(input)),
    });
    if (!res.success || !res.data) return res as Result<Client>;
    return { success: true, data: fromApiClient(res.data) };
  },

  async update(id: string, updates: Partial<Client>): Promise<Result<Client>> {
    const res = await apiFetch<any>(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toApiPayload(updates)),
    });
    if (!res.success || !res.data) return res as Result<Client>;
    return { success: true, data: fromApiClient(res.data) };
  },

  async decide(id: string, status: 'approved' | 'rejected', rejectionNote?: string): Promise<Result<Client>> {
    return this.update(id, { status, ...(rejectionNote ? { rejection_note: rejectionNote } : {}) });
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/clients/${id}`, { method: 'DELETE' });
  },
};
