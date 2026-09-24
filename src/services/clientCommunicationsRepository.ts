// ClientCommunication repository -- Bab 16.5 lanjutan (24 Sep 2026).
// Menggantikan tab "Komunikasi" yang sebelumnya cuma useState lokal di
// ClientDetailDialog (tidak pernah tersimpan). Sama adapter pattern
// dengan clientContactsRepository.ts.
//
// `categories` di backend cuma tag bebas tambahan (Hot Lead, Report,
// dst) -- TIDAK termasuk label tipe komunikasi. Di sini, saat baca,
// label tipe (mis. "Telepon") ditambahkan lagi sebagai elemen pertama
// supaya tampilan badge di ClientCommunicationsPanel/ClientDetailDialog
// lama tidak berubah. Saat tulis, category yang sama persis dengan label
// tipe dibuang dulu (AddCommunicationDialog tetap kirim array lengkap
// seperti sebelumnya, biar formnya sendiri tidak perlu tahu soal ini).

import type { Communication, CommunicationType, NewCommunicationInput } from '@/types/communication';
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
    console.error(`clientCommunicationsRepository: request failed (${path}):`, error);
    return { success: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.' };
  }
}

const TYPE_OUT: Record<CommunicationType, string> = {
  Telepon: 'TELEPON',
  Email: 'EMAIL',
  Meeting: 'MEETING',
  WhatsApp: 'WHATSAPP',
  Visit: 'VISIT',
};
const TYPE_IN: Record<string, CommunicationType> = {
  TELEPON: 'Telepon',
  EMAIL: 'Email',
  MEETING: 'Meeting',
  WHATSAPP: 'WhatsApp',
  VISIT: 'Visit',
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fromApiCommunication(row: any): Communication {
  const type = TYPE_IN[row.type] ?? 'Meeting';
  const extraCategories: string[] = Array.isArray(row.categories) ? row.categories : [];
  return {
    id: row.id,
    type,
    title: row.title ?? '',
    description: row.description ?? '',
    occurred_at: row.occurredAt ?? '',
    timestamp: row.occurredAt ? formatTimestamp(row.occurredAt) : '',
    categories: [type, ...extraCategories],
    client_id: row.clientId ?? '',
    contact_id: row.contactId ?? '',
  };
}

export const clientCommunicationsRepository = {
  async getByClientId(clientId: string): Promise<Result<Communication[]>> {
    const res = await apiFetch<any[]>(`/api/client-communications?clientId=${encodeURIComponent(clientId)}`);
    if (!res.success || !res.data) return res as Result<Communication[]>;
    return { success: true, data: res.data.map(fromApiCommunication) };
  },

  async create(clientId: string, input: NewCommunicationInput): Promise<Result<Communication>> {
    // Buang category yang sama persis dengan label tipe -- lihat catatan
    // di atas file ini kenapa itu tidak disimpan dobel.
    const extraCategories = input.categories.filter((c) => c !== input.type);
    const res = await apiFetch<any>('/api/client-communications', {
      method: 'POST',
      body: JSON.stringify({
        clientId,
        type: TYPE_OUT[input.type],
        title: input.title,
        description: input.description,
        occurredAt: input.occurred_at,
        categories: extraCategories.length > 0 ? extraCategories : undefined,
        contactId: input.contact_id || null,
      }),
    });
    if (!res.success || !res.data) return res as Result<Communication>;
    return { success: true, data: fromApiCommunication(res.data) };
  },

  async remove(id: string): Promise<Result<void>> {
    return apiFetch<void>(`/api/client-communications/${id}`, { method: 'DELETE' });
  },
};
