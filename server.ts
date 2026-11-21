import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const PORT = Number(process.env.PORT) || 3000;
const STORES_DIR = path.resolve(process.cwd(), 'data', 'stores');
const DIST_DIR = path.resolve(process.cwd(), 'dist');

// Ephemeral fallback secret if SESSION_SECRET is not provided in environment
const SIGNING_KEY = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface StoredAdminSecurity {
  passwordHash?: string;
  isDefaultPassword?: boolean;
  protectAdminPanel?: boolean;
  requireLoginOnStart?: boolean;
  passwordUpdatedAt?: string;
}

interface StoreFilePayload {
  revision: number;
  updatedAt: string;
  state: Record<string, unknown> & {
    adminSecurity?: StoredAdminSecurity;
  };
}

function ensureStoresDir(): void {
  if (!fs.existsSync(STORES_DIR)) {
    fs.mkdirSync(STORES_DIR, { recursive: true });
  }
}

function sanitizeSlug(rawSlug: unknown): string {
  const str = typeof rawSlug === 'string' ? rawSlug.trim().toLowerCase() : '';
  const cleaned = str.replace(/[^a-z0-9-]/g, '');
  return cleaned || 'default';
}

function resolveStorePath(rawSlug: unknown): string | null {
  ensureStoresDir();
  const slug = sanitizeSlug(rawSlug);
  const resolved = path.resolve(STORES_DIR, `${slug}.json`);
  if (!resolved.startsWith(STORES_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

function readStoreFile(filePath: string): StoreFilePayload | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as StoreFilePayload;
    if (parsed && typeof parsed === 'object' && parsed.state && typeof parsed.state === 'object') {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function writeStoreFileAtomic(filePath: string, payload: StoreFilePayload): void {
  ensureStoresDir();
  const tmpPath = `${filePath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(payload), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPasswordAgainstHash(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  }
  if (storedHash.startsWith('sha256_')) {
    const expectedHex = storedHash.slice('sha256_'.length);
    const digest = crypto.createHash('sha256').update(password, 'utf8').digest('hex');
    const a = Buffer.from(digest, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  return false;
}

function signAdminToken(slug: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ slug, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SIGNING_KEY).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string | undefined, expectedSlug: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto.createHmac('sha256', SIGNING_KEY).update(payloadB64).digest('base64url');
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      slug?: string;
      exp?: number;
    };
    if (typeof decoded.exp !== 'number' || decoded.exp < Date.now()) return false;
    if (decoded.slug && decoded.slug !== expectedSlug) return false;
    return true;
  } catch {
    return false;
  }
}

function extractBearerToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return undefined;
}

function sanitizeStateForClient(state: Record<string, unknown> & { adminSecurity?: StoredAdminSecurity }) {
  const cloned = { ...state };
  const sec = state.adminSecurity;
  const envPasscodeSet = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim());
  cloned.adminSecurity = {
    isDefaultPassword: sec?.isDefaultPassword ?? !envPasscodeSet,
    protectAdminPanel: sec?.protectAdminPanel ?? false,
    requireLoginOnStart: sec?.requireLoginOnStart ?? false,
    passwordUpdatedAt: sec?.passwordUpdatedAt ?? '',
    hasPassword: Boolean(sec?.passwordHash) || envPasscodeSet,
    envOverrideActive: envPasscodeSet,
  } as unknown as StoredAdminSecurity;
  return cloned;
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  const handleGetStore = (req: Request, res: Response) => {
    const slug = sanitizeSlug(req.params.slug || req.query.slug || 'default');
    const filePath = resolveStorePath(slug);
    if (!filePath) {
      res.status(400).json({ error: 'Invalid store identifier.' });
      return;
    }

    const stored = readStoreFile(filePath);
    if (!stored) {
      res.json({ exists: false, revision: 0, slug });
      return;
    }

    res.json({
      exists: true,
      slug,
      revision: stored.revision,
      updatedAt: stored.updatedAt,
      state: sanitizeStateForClient(stored.state),
    });
  };

  app.get('/api/store', handleGetStore);
  app.get('/api/stores/:slug', handleGetStore);

  const handlePutStore = (req: Request, res: Response) => {
    const slug = sanitizeSlug(req.params.slug || req.query.slug || 'default');
    const filePath = resolveStorePath(slug);
    if (!filePath) {
      res.status(400).json({ error: 'Invalid store identifier.' });
      return;
    }

    const incoming = req.body as { state?: Record<string, unknown> & { adminSecurity?: StoredAdminSecurity } };
    if (
      !incoming ||
      typeof incoming !== 'object' ||
      !incoming.state ||
      typeof incoming.state !== 'object' ||
      !Array.isArray(incoming.state.products) ||
      !incoming.state.settings ||
      typeof incoming.state.settings !== 'object'
    ) {
      res.status(400).json({ error: 'Invalid store state payload.' });
      return;
    }

    const existing = readStoreFile(filePath);
    const existingSec = existing?.state?.adminSecurity;
    const incomingSec = incoming.state.adminSecurity;

    // Never allow client sync to overwrite or erase server-stored passwordHash directly
    const mergedSecurity: StoredAdminSecurity = {
      passwordHash: existingSec?.passwordHash,
      isDefaultPassword: existingSec?.isDefaultPassword ?? incomingSec?.isDefaultPassword ?? true,
      protectAdminPanel: incomingSec?.protectAdminPanel ?? existingSec?.protectAdminPanel ?? false,
      requireLoginOnStart:
        incomingSec?.requireLoginOnStart ?? existingSec?.requireLoginOnStart ?? false,
      passwordUpdatedAt: existingSec?.passwordUpdatedAt ?? incomingSec?.passwordUpdatedAt ?? '',
    };

    // If admin lock is currently enabled on server, require admin bearer token to disable lock
    if (
      existingSec?.protectAdminPanel &&
      (mergedSecurity.protectAdminPanel === false || mergedSecurity.requireLoginOnStart !== existingSec.requireLoginOnStart)
    ) {
      const token = extractBearerToken(req);
      if (!verifyAdminToken(token, slug)) {
        // Keep server-side lock flags intact when unauthenticated sync runs
        mergedSecurity.protectAdminPanel = existingSec.protectAdminPanel;
        mergedSecurity.requireLoginOnStart = existingSec.requireLoginOnStart;
      }
    }

    const nextRevision = (existing?.revision ?? 0) + 1;
    const updatedAt = new Date().toISOString();

    const nextState: Record<string, unknown> & { adminSecurity?: StoredAdminSecurity } = {
      ...incoming.state,
      adminSecurity: mergedSecurity,
    };

    writeStoreFileAtomic(filePath, {
      revision: nextRevision,
      updatedAt,
      state: nextState,
    });

    res.json({
      ok: true,
      slug,
      revision: nextRevision,
      updatedAt,
    });
  };

  app.put('/api/store', handlePutStore);
  app.put('/api/stores/:slug', handlePutStore);

  app.post('/api/admin/verify', (req: Request, res: Response) => {
    const slug = sanitizeSlug(req.body?.slug || 'default');
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const filePath = resolveStorePath(slug);
    if (!filePath) {
      res.status(400).json({ error: 'Invalid store identifier.' });
      return;
    }

    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      const a = Buffer.from(password, 'utf8');
      const b = Buffer.from(envPasscode, 'utf8');
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        res.json({ ok: true, token: signAdminToken(slug) });
        return;
      }
      res.status(401).json({ error: 'Incorrect administrator passcode.' });
      return;
    }

    const stored = readStoreFile(filePath);
    const storedHash = stored?.state?.adminSecurity?.passwordHash;
    if (!storedHash) {
      res.status(409).json({
        error: 'No administrator passcode has been configured yet. Use initial setup.',
        needsClaim: true,
      });
      return;
    }

    if (verifyPasswordAgainstHash(password, storedHash)) {
      // Upgrade legacy sha256 hash to scrypt transparently
      if (storedHash.startsWith('sha256_') && stored) {
        stored.state.adminSecurity = {
          ...stored.state.adminSecurity,
          passwordHash: hashPasswordScrypt(password),
        };
        stored.revision += 1;
        stored.updatedAt = new Date().toISOString();
        writeStoreFileAtomic(filePath, stored);
      }
      res.json({ ok: true, token: signAdminToken(slug) });
      return;
    }

    res.status(401).json({ error: 'Incorrect administrator password.' });
  });

  app.post('/api/admin/password', (req: Request, res: Response) => {
    const slug = sanitizeSlug(req.body?.slug || 'default');
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const filePath = resolveStorePath(slug);
    if (!filePath) {
      res.status(400).json({ error: 'Invalid store identifier.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    if (process.env.ADMIN_PASSCODE?.trim()) {
      res.status(400).json({ error: 'Passcode is managed via server environment configuration.' });
      return;
    }

    const stored = readStoreFile(filePath);
    if (!stored) {
      res.status(404).json({ error: 'Store record not initialized yet.' });
      return;
    }

    const existingHash = stored.state.adminSecurity?.passwordHash;
    const token = extractBearerToken(req);
    const hasValidToken = verifyAdminToken(token, slug);

    if (existingHash && !hasValidToken && !verifyPasswordAgainstHash(currentPassword, existingHash)) {
      res.status(401).json({ error: 'Current password verification failed.' });
      return;
    }

    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    stored.state.adminSecurity = {
      ...stored.state.adminSecurity,
      passwordHash: hashPasswordScrypt(newPassword),
      isDefaultPassword: false,
      passwordUpdatedAt: nowStr,
    };
    stored.revision += 1;
    stored.updatedAt = new Date().toISOString();
    writeStoreFileAtomic(filePath, stored);

    res.json({
      ok: true,
      token: signAdminToken(slug),
      passwordUpdatedAt: nowStr,
      revision: stored.revision,
    });
  });

  // Error handler for malformed JSON bodies
  app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
    if (err && 'status' in err && (err as { status?: number }).status === 400) {
      res.status(400).json({ error: 'Malformed JSON request body.' });
      return;
    }
    next(err);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`InnoWear BMS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start InnoWear BMS server:', err);
  process.exit(1);
});
