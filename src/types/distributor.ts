// src/types/distributor.ts — Bab 8/9: distributor master data + approval
// workflow (prisma/schema.prisma's Distributor model). Same shape
// conventions as src/types/lead.ts / task.ts.

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Bab 12 follow-up (insight #7, distribusi beban per sales rep, 23 Sep
// 2026): PIC yang menangani akun ini sehari-hari. Menunjuk ke User (lihat
// komentar sepadan di prisma/schema.prisma), bukan model SalesRep terpisah
// yang cuma dipakai untuk KPI/commission.
export interface SalesRepRef {
  id: string;
  name: string;
  email: string;
}

export interface Distributor {
  id: string;
  code: string;
  name: string;
  address: string;
  gpsLat: number | null;
  gpsLng: number | null;
  status: ApprovalStatus;
  submittedById: string | null;
  submittedAt: Date | null;
  decidedById: string | null;
  decidedAt: Date | null;
  rejectionNote: string;
  salesRepId: string | null;
  salesRep: SalesRepRef | null;
  createdAt: Date;
  updatedAt: Date;
}
