import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  email: string;
  name: string;
  role: string;
  id?: string;
  accessToken?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  session: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fase 1 item 3/4: the backend's Role enum (prisma/schema.prisma) is
// SCREAMING_SNAKE_CASE; the rest of this app's RBAC checks (e.g.
// TaskManagement.tsx, AdminSystem.tsx) compare against the human-readable
// "Super Admin" style strings that the old demo accounts used. This map is
// the one seam between the two so neither side has to change.
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  SALES_MANAGER: 'Sales Manager',
  SALES_REPRESENTATIVE: 'Sales Representative',
  SALES_EXECUTIVE: 'Sales Executive',
  MASTER_DATA_ADMIN: 'Master Data Admin',
};

function toDisplayRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);

  // Load user from localStorage on mount, then confirm the session is
  // still valid server-side (Fase 1 item 3, "session divalidasi backend")
  // rather than trusting whatever's cached locally.
  //
  // Fase 0 (23 Sep 2026): this used to special-case tokens shaped like
  // 'demo-access-token-*' and trust them without a backend check, because
  // AuthContext used to expose a client-only `login(email, role, name)`
  // that minted those tokens for Login.tsx's now-removed Quick Login
  // buttons. That function is gone and nothing mints demo tokens anymore,
  // so any such token left over in a browser's localStorage from before
  // this fix is now just an invalid token like any other -- it fails the
  // /api/auth/me check below and the user is signed out and sent back to
  // the real login form, which is the correct outcome.
  useEffect(() => {
    const savedUser = localStorage.getItem('salesMonitorUser');
    if (!savedUser) return;

    let parsed: AuthUser;
    try {
      parsed = JSON.parse(savedUser);
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
      localStorage.removeItem('salesMonitorUser');
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${parsed.accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body: { data: { id: string; email: string; name: string; role: string } }) => {
        setUser({
          email: body.data.email,
          name: body.data.name,
          role: toDisplayRole(body.data.role),
          id: body.data.id,
          accessToken: parsed.accessToken,
        });
      })
      .catch(() => {
        // Expired/revoked/invalid (including a stale pre-Fase-0 demo
        // token) -- don't leave a dead session sitting in localStorage
        // pretending to still be logged in.
        localStorage.removeItem('salesMonitorUser');
        setUser(null);
      });
  }, []);

  // Real login against the Fase 1 backend (POST /api/auth/login) --
  // server-hashed password check + a backend-issued, revocable session
  // token. Replaces the old client-side loginWithSupabase stub, and (as of
  // the Fase 0 cleanup above) the only way to create a session at all.
  const loginWithCredentials = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        return { success: false, error: body.error ?? 'Email atau password salah' };
      }

      const userData: AuthUser = {
        email: body.data.user.email,
        name: body.data.user.name,
        role: toDisplayRole(body.data.user.role),
        id: body.data.user.id,
        accessToken: body.data.token,
      };
      setUser(userData);
      localStorage.setItem('salesMonitorUser', JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      console.error('loginWithCredentials failed:', error);
      return {
        success: false,
        error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.',
      };
    }
  };

  // Logout -- revokes the session server-side.
  const logout = async () => {
    if (user?.accessToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
      } catch (error) {
        // Best-effort: even if the revoke call fails (offline, etc.), the
        // client still forgets the session below.
        console.error('logout revoke failed:', error);
      }
    }
    setUser(null);
    setSession(null);
    localStorage.removeItem('salesMonitorUser');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loginWithCredentials,
        logout,
        isAuthenticated: !!user,
        session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
