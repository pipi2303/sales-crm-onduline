// Fase B (Bab 13) follow-up -- 23 Sep 2026: dummy data realistis untuk KPI
// "kepatuhan visit" (visit compliance). Task model sudah sepenuhnya
// dibangun di backend sejak Bab 8 gap 2 (checkInAt/Lat/Lng/PhotoUrl,
// lihat modeling note pada model Task di schema.prisma) tapi 0 Task
// pernah di-seed -- tidak ada data nyata untuk dihitung kepatuhannya,
// sehingga dashboard Bab 13 tidak bisa menampilkan angka yang berarti.
//
// Desain: 2 kunjungan (VISIT task) per toko (19 toko x 2 = 38 task).
// Setiap toko dikunjungi sekali di masa lalu jauh (kunjungan rutin lama,
// SELALU check-in -- merepresentasikan riwayat kunjungan yang sudah
// selesai) dan sekali lagi baru-baru ini (kunjungan rutin terbaru --
// sebagian besar check-in, 7 dari 19 toko SENGAJA tidak check-in untuk
// merepresentasikan kepatuhan visit yang realistis: 31/38 = ~81.6%,
// bukan 100% sempurna dan bukan buruk).
//
// Sales rep pemilik task dirotasi di antara 4 user SALES_REPRESENTATIVE
// yang sudah ada di demoUsers (prisma/seed.ts), deterministik per indeks
// toko -- bukan acak -- supaya seed ini reproducible dan mudah di-review,
// konsisten dengan gaya seedData lain di proyek ini (clientsAndOpportunities.ts,
// productCatalog.ts) yang juga hand-picked/deterministik, bukan Math.random().
//
// checkInLat/Lng memakai koordinat toko itu sendiri (gpsLat/gpsLng dari
// distributorsAndStores.ts) -- merepresentasikan sales rep check-in di
// lokasi toko yang benar.

import { storeSeeds } from './distributorsAndStores.js';

export interface VisitTaskSeed {
  storeCode: string;
  title: string;
  category: string;
  ownerEmail: string;
  assignedTo: string;
  dueDate: string; // ISO datetime
  checkedIn: boolean; // false = kunjungan terlewat, tidak checked-in (non-compliant)
  checkInOffsetHours: number; // jam setelah dueDate saat check-in terjadi (kalau checkedIn true)
  gpsLat: number;
  gpsLng: number;
}

const SALES_REPS = [
  { email: 'pipi@gmail.com', name: 'Pipi' },
  { email: 'sales@salesmonitor.com', name: 'Siti Nurhaliza' },
  { email: 'andiko@gmail.com', name: 'Andiko' },
  { email: 'nikky@gmail.com', name: 'Nikky' },
];

// 7 dari 19 toko yang kunjungan TERBARU-nya sengaja tidak check-in
// (terlewat/non-compliant). Kunjungan lama tetap selalu check-in.
const NON_COMPLIANT_STORE_CODES = new Set([
  'TOKO-SUS01',
  'TOKO-LPG01',
  'TOKO-KLU01',
  'TOKO-SLT01',
  'TOKO-BAL02',
  'TOKO-NTT01',
  'TOKO-PBD01',
]);

function isoDaysAgo(days: number): string {
  const d = new Date('2026-09-23T09:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export const visitTaskSeeds: VisitTaskSeed[] = storeSeeds.flatMap((store, i) => {
  const rep = SALES_REPS[i % SALES_REPS.length];
  const olderDaysAgo = 38 + (i % 7); // 38-44 hari lalu
  const recentDaysAgo = 6 + (i % 12); // 6-17 hari lalu

  const older: VisitTaskSeed = {
    storeCode: store.code,
    title: `Kunjungan rutin ke ${store.name}`,
    category: 'Kunjungan Toko',
    ownerEmail: rep.email,
    assignedTo: rep.name,
    dueDate: isoDaysAgo(olderDaysAgo),
    checkedIn: true,
    checkInOffsetHours: 1,
    gpsLat: store.gpsLat,
    gpsLng: store.gpsLng,
  };

  const recent: VisitTaskSeed = {
    storeCode: store.code,
    title: `Kunjungan rutin ke ${store.name}`,
    category: 'Kunjungan Toko',
    ownerEmail: rep.email,
    assignedTo: rep.name,
    dueDate: isoDaysAgo(recentDaysAgo),
    checkedIn: !NON_COMPLIANT_STORE_CODES.has(store.code),
    checkInOffsetHours: 2,
    gpsLat: store.gpsLat,
    gpsLng: store.gpsLng,
  };

  return [older, recent];
});
