// POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me — combined
// into one dynamic route (api/auth/[action].ts) so the three tiny auth
// endpoints count as a single Vercel serverless function instead of three,
// which matters on the Hobby plan's 12-function limit. Each branch below
// is the unchanged body of the former api/auth/login.ts, logout.ts and
// me.ts files; the request URLs (/api/auth/login, /api/auth/logout,
// /api/auth/me) are unaffected since [action].ts still matches the same
// paths.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { prisma } from '../../lib/prisma.js';
import {
  verifyPassword,
  createSession,
  revokeSession,
  getUserFromToken,
  extractBearerToken,
} from '../../lib/auth.js';

interface ApiRequest extends IncomingMessage {
  method?: string;
  headers: IncomingMessage['headers'];
  body?: unknown;
  query?: Record<string, string | string[]>;
}
interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

function getAction(req: ApiRequest): string | undefined {
  const raw = req.query?.action;
  return Array.isArray(raw) ? raw[0] : raw;
}

// POST /api/auth/login — { email, password } -> { token, user }
//
// This is the real counterpart to the demo-account login in
// src/app/components/Login.tsx (which still authenticates client-side
// only — that cleanup is tracked separately as Fase 0). Once the frontend
// is wired to call this endpoint, Login.tsx's checks become a UI-only
// redirect; the actual credential check happens here, server-side.
async function handleLogin(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email dan password wajib diisi' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Same response whether the email doesn't exist or the password is
  // wrong — don't tell an attacker which half failed.
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ success: false, error: 'Email atau password salah' });
    return;
  }

  const { token, expiresAt } = await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  res.status(200).json({
    success: true,
    data: {
      token,
      expiresAt,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
  });
}

// POST /api/auth/logout — revokes the session behind the bearer token.
// Because sessions are opaque backend rows (not JWTs), this is a real,
// immediate revoke rather than "the client just forgets the token."
async function handleLogout(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  const token = extractBearerToken(req.headers.authorization);
  if (token) await revokeSession(token);
  res.status(200).json({ success: true });
}

// GET /api/auth/me — resolves the current bearer token to a user, or 401.
// This replaces AuthContext.tsx's current "read the user object back out
// of localStorage" restore-on-load with an actual backend-validated check.
async function handleMe(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  const user = await getUserFromToken(extractBearerToken(req.headers.authorization));
  if (!user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  res.status(200).json({ success: true, data: user });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const action = getAction(req);
  switch (action) {
    case 'login':
      await handleLogin(req, res);
      return;
    case 'logout':
      await handleLogout(req, res);
      return;
    case 'me':
      await handleMe(req, res);
      return;
    default:
      res.status(404).json({ success: false, error: 'Not found' });
  }
}
