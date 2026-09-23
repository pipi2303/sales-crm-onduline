// Fase 1 item 4: "Terapkan role-based access control di DUA level: UI dan
// backend/API (bukan UI-only, karena mudah dilewati dari DevTools)." Every
// API handler that gates an action by role calls requireRole() instead of
// trusting a role the client sends — the UI-level check (hiding a button)
// stays useful for UX but is never the actual security boundary.
import type { Role } from '@prisma/client';
import type { AuthedUser } from './auth.js';

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export function requireRole(user: AuthedUser | null, allowed: Role[]): asserts user is AuthedUser {
  if (!user) throw new UnauthorizedError();
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError(`Role ${user.role} is not permitted to perform this action`);
  }
}

export function requireAuth(user: AuthedUser | null): asserts user is AuthedUser {
  if (!user) throw new UnauthorizedError();
}

// Bab 10 gap #5 (Rencana Insight doc): PUT on Task/Opportunity previously
// only checked requireAuth(), so any authenticated user -- any role, not
// just the assigned owner -- could edit someone else's task or deal,
// including fields tied to already-recorded history (check-in results,
// closed deal value/stage). This adds the missing ownership boundary
// without a schema change: the record's own ownerId, or an elevated role,
// is required to modify it.
//
// ownerId is nullable on both Task and Opportunity (legacy/seeded rows
// created before Fase 1's ownerId default, or genuinely unassigned
// records). For those, this intentionally falls back to the old
// behaviour (any authenticated user may edit) rather than locking
// everyone out of orphaned data -- the boundary only applies once a
// record actually has a recorded owner.
export function requireOwnerOrRole(
  user: AuthedUser | null,
  ownerId: string | null | undefined,
  allowed: Role[]
): asserts user is AuthedUser {
  if (!user) throw new UnauthorizedError();
  if (ownerId && user.id === ownerId) return;
  if (allowed.includes(user.role)) return;
  if (!ownerId) return;
  throw new ForbiddenError(`Hanya pemilik record atau role ${allowed.join('/')} yang boleh mengubah data ini`);
}
