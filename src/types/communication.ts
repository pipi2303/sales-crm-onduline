// A logged client interaction (call, email, meeting, WhatsApp, visit).
//
// Bab 16.5 lanjutan (24 Sep 2026): sebelumnya ini cuma bentuk data lokal
// (AddCommunicationDialog.tsx membangunnya, ClientDetailDialog.tsx
// menyimpannya di useState -- tidak pernah benar-benar tersimpan).
// Sekarang persisten lewat ClientCommunication (prisma/schema.prisma) +
// clientCommunicationsRepository.ts. `timestamp` tetap ada sebagai
// string tampilan (diformat dari `occurred_at` oleh repository) supaya
// kode render yang sudah ada tidak perlu berubah.
export type CommunicationType = 'Telepon' | 'Email' | 'Meeting' | 'WhatsApp' | 'Visit';

export interface Communication {
  id: string;
  type: CommunicationType;
  title: string;
  description: string;
  timestamp: string; // string tampilan siap pakai, diturunkan dari occurred_at
  // Termasuk label tipe sebagai elemen pertama (mis. ['Telepon', 'Hot
  // Lead']) -- kompatibel dengan render lama yang menampilkan semuanya
  // sebagai badge tanpa bedakan mana yang "tipe" vs "tag bebas".
  categories: string[];
  client_id: string;
  contact_id: string; // '' kalau tidak dikaitkan ke kontak tertentu
  occurred_at: string; // ISO datetime kapan komunikasi ini TERJADI
}

// Dipakai AddCommunicationDialog.tsx saat submit -- belum punya id
// (dibuat backend) dan `categories` di sini cuma tag bebas tambahan,
// BUKAN termasuk label tipe (repository yang menambahkan/membuang label
// tipe saat baca/tulis, lihat clientCommunicationsRepository.ts).
export interface NewCommunicationInput {
  type: CommunicationType;
  title: string;
  description: string;
  occurred_at: string;
  categories: string[];
  contact_id?: string;
}
