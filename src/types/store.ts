// src/types/store.ts — Bab 8/9: toko master data + approval workflow
// (prisma/schema.prisma's Store model). A Store optionally rolls up to a
// Distributor (Bab 5 hierarchy); `distributor` is only present when the
// API included the relation (api/stores GET does).

import type { ApprovalStatus, SalesRepRef } from './distributor';

export type { ApprovalStatus, SalesRepRef };

export interface StoreDistributorRef {
  id: string;
  code: string;
  name: string;
}

export interface Store {
  id: string;
  code: string;
  name: string;
  distributorId: string | null;
  distributor: StoreDistributorRef | null;
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
