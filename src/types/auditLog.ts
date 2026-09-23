// Audit log entry -- the real shape written by api/handler.ts's
// logAudit() helper (Bab 10 #3, 23 Sep 2026), read back through
// GET /api/audit-logs. Deliberately thin: this app captures no
// per-request IP address and no free-text "details" column, so this
// type does NOT pretend those exist (AdminSystem.tsx's previous dummy
// array had both, fabricated) -- only actorId/actor, action,
// entityType/entityId, and the before/after JSON snapshots that
// logAudit() actually stores.
export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actor: { name: string; email: string } | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  createdAt: string;
}
