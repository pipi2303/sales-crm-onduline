// Production HTTP server for running this app outside Vercel (VPS via
// Portainer). api/handler.ts is one Vercel-style serverless function
// (signature (req, res) => Promise<void>, reads req.query.resource/id,
// calls res.status(code).json(body)); here it's mounted on a long-running
// Express process instead via two generic routes that mirror vercel.json's
// rewrites (see below). This file is NOT used by `vercel dev`/`vercel
// build` (those hit api/handler.ts directly through Vercel's own
// rewrite-based routing) -- it only runs inside the Docker image built
// for the VPS.
//
// Why this works with zero changes to api/handler.ts: Express puts a
// route's :params into req.params, Vercel puts rewritten query params
// into req.query -- toHandler() below merges params into query so
// getParam(req, 'resource')/getParam(req, 'id') see the same shape
// either way.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// 23 Sep 2026: sampai kemarin file ini import 14 file per-route
// (api/auth/login.ts, api/leads/index.ts, dst.) yang SUDAH DIHAPUS oleh
// refactor api/*.ts -> satu api/handler.ts (lihat commit
// 5e2f239d/97d12a33/e2676dae, semuanya 22 Sep) -- server.ts luput
// diupdate, jadi sejak saat itu container ini crash langsung di baris
// import paling atas setiap kali di-deploy (tidak pernah ketahuan karena
// tidak ada tsconfig.json/tsc yang pernah jalan terhadap file ini, dan
// `npm run build` di Dockerfile cuma vite build, tidak pernah benar-benar
// import server.ts). Sekarang diganti ke satu handler yang sama seperti
// yang dipakai Vercel.
import handler from './api/handler.js';
import { LOCAL_UPLOAD_DIR } from './lib/blob.js';

type VercelStyleHandler = (req: any, res: any) => Promise<void> | void;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');

// Check-in photos arrive as base64 data URLs inside JSON bodies (see
// lib/blob.ts's 5MB decoded-size cap) — base64 inflates size by ~1.37x,
// so 8mb of headroom comfortably covers a 5MB photo plus the rest of the
// task payload.
app.use(express.json({ limit: '8mb' }));

function toHandler(fn: VercelStyleHandler) {
  return (req: express.Request, res: express.Response) => {
    (req as any).query = { ...req.query, ...req.params };
    Promise.resolve(fn(req, res)).catch((err) => {
      console.error('Unhandled API error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    });
  };
}

// Mirrors vercel.json's rewrites exactly:
//   /api/:resource/:id -> /api/handler?resource=:resource&id=:id
//   /api/:resource     -> /api/handler?resource=:resource
// so this Express server and Vercel's serverless routing hit the exact
// same single handler with the exact same req.query shape -- one
// consolidated api/handler.ts, two transport layers. This also means
// every resource api/handler.ts knows about (including ones added after
// this file was first written -- clients, sales-reps, commissions,
// discount-approvals, ai-chat, dst.) works here automatically, instead
// of needing a matching app.all() line added by hand every time.
app.all('/api/:resource/:id', toHandler(handler));
app.all('/api/:resource', toHandler(handler));

// Bab 8 gap 2 check-in photos, when lib/blob.ts's local-disk backend is
// active (no BLOB_READ_WRITE_TOKEN set — the default for this VPS
// deployment). Mounted on the exact directory lib/blob.ts writes to, so
// a photo saved there is immediately servable at the URL it returned.
// The `checkin_photos` volume in docker-compose.yml is what makes this
// survive container recreation/redeploys.
app.use('/uploads/checkin-photos', express.static(LOCAL_UPLOAD_DIR));

// Everything else: the built Vite frontend (dist/), with an SPA fallback
// so client-side-routed URLs (if any are added later) don't 404 on
// refresh. Static files (js/css/images) are served as-is; anything that
// doesn't match a file on disk falls through to index.html.
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Sales CRM Onduline server listening on port ${port}`);
});
