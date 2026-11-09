// Platform-owned: do not edit.
// The app's own accounts. req.user is the person signed in to this app, or
// null. Put requireUser on routes that need someone signed in, and scope
// per-person data to req.user.id. Sign-up, sign-in and sign-out are served at
// /api/auth/*; the browser reads them through useAuth() in src/lib/auth.ts.
import crypto from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import {
  Router,
  type CookieOptions,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { appSessions, appUsers } from './db/accounts';
import { db } from './db/client';

export interface RequestUser {
  id: string;
  email: string;
  name: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: RequestUser | null;
    }
  }
}

const SESSION_COOKIE = 'app_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const MAX_FAILED_SIGN_INS = 10;
const FAILED_SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const failedSignIns = new Map<string, { count: number; since: number }>();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function scrypt(password: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, length, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return ['scrypt', salt.toString('base64url'), key.toString('base64url')].join('$');
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scrypt(password, Buffer.from(salt, 'base64url'), expected.length);
  return crypto.timingSafeEqual(key, expected);
}

/** Preview serves the API under a per-project prefix; the cookie stays inside it. */
function cookieOptions(req: Request): CookieOptions {
  const prefix = req.get('x-forwarded-prefix') ?? '';
  const base = /^\/[\w\-/]*$/.test(prefix) ? prefix.replace(/\/+$/, '') : '';
  return {
    path: base + '/api',
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || req.get('x-forwarded-proto') === 'https',
  };
}

function readSessionToken(req: Request): string | null {
  for (const pair of (req.get('cookie') ?? '').split(';')) {
    const index = pair.indexOf('=');
    if (index > 0 && pair.slice(0, index).trim() === SESSION_COOKIE) {
      return pair.slice(index + 1).trim() || null;
    }
  }
  return null;
}

async function startSession(req: Request, res: Response, userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString('base64url');
  await db.insert(appSessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_MS),
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(req), maxAge: SESSION_MS });
}

function readField(body: unknown, name: string): string {
  const value = body && typeof body === 'object' ? (body as Record<string, unknown>)[name] : null;
  return typeof value === 'string' ? value : '';
}

function signInBlocked(email: string): boolean {
  const entry = failedSignIns.get(email);
  if (!entry) return false;
  if (Date.now() - entry.since > FAILED_SIGN_IN_WINDOW_MS) {
    failedSignIns.delete(email);
    return false;
  }
  return entry.count >= MAX_FAILED_SIGN_INS;
}

function recordFailedSignIn(email: string): void {
  const entry = failedSignIns.get(email);
  if (entry && Date.now() - entry.since <= FAILED_SIGN_IN_WINDOW_MS) entry.count += 1;
  else failedSignIns.set(email, { count: 1, since: Date.now() });
}

/** A request that changes data only counts as signed in when the app's own code sent it. */
export const attachRequestUser: RequestHandler = async (req, _res, next) => {
  req.user = null;
  const token = readSessionToken(req);
  if (token && (SAFE_METHODS.has(req.method) || req.get('x-clarity-api') === '1')) {
    const [row] = await db
      .select({ id: appUsers.id, email: appUsers.email, name: appUsers.name })
      .from(appSessions)
      .innerJoin(appUsers, eq(appSessions.userId, appUsers.id))
      .where(and(eq(appSessions.id, hashToken(token)), gt(appSessions.expiresAt, new Date())))
      .limit(1);
    req.user = row ?? null;
  }
  next();
};

export const requireUser: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in required' });
    return;
  }
  next();
};

/**
 * Company provider apps may use local email/password only in Preview (demo
 * seed accounts). Test/Production must use company OIDC — hiding the form is
 * not enough; these routes must refuse.
 */
function localCredentialsAllowed(): boolean {
  const authMode = String(process.env.CLARITY_AUTH_MODE || '')
    .trim()
    .toLowerCase();
  if (authMode !== 'internal') return true;
  const runtimeEnv = String(process.env.CLARITY_RUNTIME_ENV || '')
    .trim()
    .toLowerCase();
  return runtimeEnv === 'preview';
}

export const authRoutes = Router();

authRoutes.post('/signup', async (req, res) => {
  if (!localCredentialsAllowed()) {
    res.status(400).json({
      error: 'Use company-managed sign-in for this app.',
      errorCode: 'OIDC_REQUIRED',
    });
    return;
  }
  const email = readField(req.body, 'email').trim().toLowerCase();
  const password = readField(req.body, 'password');
  const name = readField(req.body, 'name').trim().slice(0, 200) || null;
  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    res.status(400).json({
      error: 'Use a password of ' + MIN_PASSWORD_LENGTH + ' to ' + MAX_PASSWORD_LENGTH + ' characters.',
    });
    return;
  }
  const [user] = await db
    .insert(appUsers)
    .values({ email, name, passwordHash: await hashPassword(password) })
    .onConflictDoNothing({ target: appUsers.email })
    .returning({ id: appUsers.id, email: appUsers.email, name: appUsers.name });
  if (!user) {
    res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
    return;
  }
  await startSession(req, res, user.id);
  res.status(201).json({ user });
});

authRoutes.post('/signin', async (req, res) => {
  if (!localCredentialsAllowed()) {
    res.status(400).json({
      error: 'Use company-managed sign-in for this app.',
      errorCode: 'OIDC_REQUIRED',
    });
    return;
  }
  const email = readField(req.body, 'email').trim().toLowerCase();
  const password = readField(req.body, 'password');
  if (signInBlocked(email)) {
    res.status(429).json({ error: 'Too many sign-in attempts. Try again in a few minutes.' });
    return;
  }
  const [account] = email
    ? await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1)
    : [];
  if (!account || !password || !(await verifyPassword(password, account.passwordHash))) {
    recordFailedSignIn(email);
    res.status(401).json({ error: 'Email or password is incorrect.' });
    return;
  }
  failedSignIns.delete(email);
  await db
    .delete(appSessions)
    .where(and(eq(appSessions.userId, account.id), lt(appSessions.expiresAt, new Date())));
  await startSession(req, res, account.id);
  res.json({ user: { id: account.id, email: account.email, name: account.name } });
});

authRoutes.post('/signout', async (req, res) => {
  if (req.get('x-clarity-api') !== '1') {
    res.status(403).json({ error: 'Missing x-clarity-api header' });
    return;
  }
  const token = readSessionToken(req);
  if (token) await db.delete(appSessions).where(eq(appSessions.id, hashToken(token)));
  res.clearCookie(SESSION_COOKIE, cookieOptions(req));
  res.status(204).end();
});

authRoutes.get('/me', (req, res) => {
  res.json({ user: req.user ?? null });
});
