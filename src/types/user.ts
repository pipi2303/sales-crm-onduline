// AdminSystem's User -- distinct from AuthContext.tsx's AuthUser (session
// identity) and from @/app/data/dummyData's User (the old 100%-mock
// shape AdminSystem.tsx used to import). This is the real Prisma User
// model's shape, as returned by /api/users (never includes passwordHash).
//
// Bab 10 gap #4 (23 Sep 2026): role is the real backend Role enum value
// (SUPER_ADMIN/SALES_MANAGER/SALES_REPRESENTATIVE/SALES_EXECUTIVE/
// MASTER_DATA_ADMIN), not the human-readable "Super Admin" label
// AuthContext.tsx's ROLE_LABELS produces for display -- AdminSystem.tsx
// translates at the UI boundary the same way ROLE_LABELS does.
export type UserRole = 'SUPER_ADMIN' | 'SALES_MANAGER' | 'SALES_REPRESENTATIVE' | 'SALES_EXECUTIVE' | 'MASTER_DATA_ADMIN';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// password is required on create (this is the only account-creation path
// in the whole app -- no self-service registration) and optional on
// update (only sent when an admin explicitly resets it).
export interface NewAppUser {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}

export type UpdateAppUser = Partial<Pick<AppUser, 'name' | 'role' | 'isActive'>> & { password?: string };
