// Platform-owned: do not edit. Who is signed in to this app, shared by every
// component. Wrap the app once, in src/App.tsx:
//   export default function App() { return <AuthProvider><AppContent /></AuthProvider>; }
// then call useAuth() in any component below it. Every caller sees the same person, so
// signing in on one screen updates all of them.
//
// Company OIDC (Test/Production) uses Clarity's managed runtime session cookie.
// Email/password and Preview demo buttons use this app's /api/auth session.
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getCurrentUser,
  signIn as requestSignIn,
  signOut as requestSignOut,
  signUp as requestSignUp,
  type AppUser,
} from './api';

export type { AppUser } from './api';

export type RuntimeAuthEnvironment = 'preview' | 'test' | 'production';

type ClarityWindow = Window & {
  __CLARITY_PROJECT_ID__?: string;
  __CLARITY_PLATFORM_ORIGIN__?: string;
  __CLARITY_ENV__?: string;
};

function resolveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  const clarityWindow = window as ClarityWindow;
  const fromWindow =
    typeof clarityWindow.__CLARITY_PROJECT_ID__ === 'string'
      ? clarityWindow.__CLARITY_PROJECT_ID__.trim()
      : '';
  if (fromWindow) return fromWindow;
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (
    (segments[0] === 'preview' || segments[0] === 'test' || segments[0] === 'projects') &&
    segments[1]
  ) {
    return segments[1];
  }
  return null;
}

function resolveRuntimeAuthEnvironment(): RuntimeAuthEnvironment {
  if (typeof window === 'undefined') return 'preview';
  // Deployed Test/Production HTML injects this via runtime-branding — prefer it
  // over path heuristics (Test CloudFront apps are served at /).
  const injected = (window as ClarityWindow).__CLARITY_ENV__?.trim().toLowerCase();
  if (injected === 'preview' || injected === 'test' || injected === 'production') {
    return injected;
  }
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments[0] === 'test' || (segments[0] === 'projects' && segments[2] === 'test')) {
    return 'test';
  }
  if (window.location.search.includes('clarity_env=production')) return 'production';
  if (window.location.search.includes('clarity_env=test')) return 'test';
  if (segments[0] === 'preview') return 'preview';
  if (segments[0] === 'projects' && segments[2] === 'production') return 'production';
  return 'production';
}

/** Platform origin when injected (Deploy); otherwise the current page origin. */
function resolvePlatformOrigin(): string {
  if (typeof window === 'undefined') return '';
  const injected = (window as ClarityWindow).__CLARITY_PLATFORM_ORIGIN__;
  if (typeof injected === 'string' && injected.trim()) {
    return injected.trim().replace(/\/+$/, '');
  }
  return window.location.origin;
}

/** True when the app is running inside Clarity Preview (not Test/Production). */
export function isPreviewAuthSurface(): boolean {
  return resolveRuntimeAuthEnvironment() === 'preview';
}

function mapManagedRuntimeUser(user: {
  id?: unknown;
  email?: unknown;
  name?: unknown;
} | null): AppUser | null {
  if (!user || typeof user.id !== 'string' || typeof user.email !== 'string') {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    name: typeof user.name === 'string' ? user.name : null,
  };
}

/**
 * Reads Clarity's managed runtime session (company OIDC / managed accounts).
 * Prefer this over the app's local app_session after Test/Production SSO.
 */
async function fetchManagedRuntimeSession(): Promise<AppUser | null> {
  const projectId = resolveProjectId();
  if (!projectId || typeof window === 'undefined') return null;
  const environment = resolveRuntimeAuthEnvironment();
  if (environment === 'preview') return null;
  const url = new URL(
    `/api/projects/${encodeURIComponent(projectId)}/database/runtime-auth/session`,
    resolvePlatformOrigin(),
  );
  url.searchParams.set('environment', environment);
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = (await response.json().catch(() => null)) as {
      user?: { id?: unknown; email?: unknown; name?: unknown } | null;
    } | null;
    return mapManagedRuntimeUser(body?.user ?? null);
  } catch {
    return null;
  }
}

async function clearManagedRuntimeSession(): Promise<void> {
  const projectId = resolveProjectId();
  if (!projectId || typeof window === 'undefined') return;
  const environment = resolveRuntimeAuthEnvironment();
  if (environment === 'preview') return;
  try {
    await fetch(
      new URL(
        `/api/projects/${encodeURIComponent(projectId)}/database/runtime-auth/logout`,
        resolvePlatformOrigin(),
      ).toString(),
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ environment }),
      },
    );
  } catch {
    /* best-effort */
  }
}

export type CompanySignInProviderInfo = {
  providerType: string;
  providerLabel: string | null;
  ssoEnabled: boolean;
};

/** Public company IdP metadata for the SignInGate button label/icon. */
export async function fetchCompanySignInProvider(): Promise<CompanySignInProviderInfo | null> {
  const projectId = resolveProjectId();
  if (!projectId || typeof window === 'undefined') return null;
  const environment = resolveRuntimeAuthEnvironment();
  const url = new URL(
    `/api/projects/${encodeURIComponent(projectId)}/database/runtime-auth/config`,
    resolvePlatformOrigin(),
  );
  url.searchParams.set('environment', environment === 'preview' ? 'test' : environment);
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = (await response.json().catch(() => null)) as {
      authMode?: unknown;
      internalConfig?: {
        providerType?: unknown;
        providerLabel?: unknown;
        ssoEnabled?: unknown;
      } | null;
    } | null;
    if (body?.authMode !== 'internal' || !body.internalConfig) return null;
    const providerType =
      typeof body.internalConfig.providerType === 'string'
        ? body.internalConfig.providerType.trim().toLowerCase()
        : '';
    if (!providerType) return null;
    return {
      providerType,
      providerLabel:
        typeof body.internalConfig.providerLabel === 'string'
          ? body.internalConfig.providerLabel.trim() || null
          : null,
      ssoEnabled: body.internalConfig.ssoEnabled === true,
    };
  } catch {
    return null;
  }
}

/**
 * Real company OIDC (Google / Microsoft / …). Test and Production only —
 * Preview rejects this and should use the demo provider buttons instead.
 */
export function startCompanySignIn(returnTo?: string | null): void {
  if (typeof window === 'undefined') return;
  const projectId = resolveProjectId();
  if (!projectId) {
    throw new Error('Company sign-in needs a Clarity project id in the URL or window.');
  }
  const environment = resolveRuntimeAuthEnvironment();
  if (environment === 'preview') {
    throw new Error(
      'Real company sign-in works in Test and Production. In Preview, use a demo provider button.',
    );
  }
  const url = new URL(
    `/api/projects/${encodeURIComponent(projectId)}/database/runtime-auth/internal/start`,
    resolvePlatformOrigin(),
  );
  url.searchParams.set('environment', environment);
  const fallbackReturnTo =
    returnTo ||
    (window.location.origin === resolvePlatformOrigin()
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : window.location.href);
  url.searchParams.set('returnTo', fallbackReturnTo);
  const target = window.top && window.top !== window ? window.top : window;
  target.location.assign(url.toString());
}

export interface AuthState {
  /** The signed-in person, or null. */
  user: AppUser | null;
  /** True until the first check of who is signed in finishes. */
  loading: boolean;
  /** Each throws ApiError with a message to show the person. */
  signIn(input: { email: string; password: string }): Promise<AppUser>;
  signUp(input: { email: string; password: string; name?: string }): Promise<AppUser>;
  /** Real company OIDC — Test and Production only. */
  startCompanySignIn(returnTo?: string | null): void;
  signOut(): Promise<void>;
  /** Re-reads the session, e.g. after an API call answered 401. */
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // Company OIDC sets clarity_runtime_session_* — read that before app_session.
      const managed = await fetchManagedRuntimeSession();
      if (managed) {
        setUser(managed);
        return;
      }
      setUser(await getCurrentUser());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      refresh,
      signIn: async (input) => {
        const next = await requestSignIn(input);
        setUser(next);
        return next;
      },
      signUp: async (input) => {
        const next = await requestSignUp(input);
        setUser(next);
        return next;
      },
      startCompanySignIn,
      signOut: async () => {
        await Promise.allSettled([clearManagedRuntimeSession(), requestSignOut()]);
        setUser(null);
      },
    }),
    [user, loading, refresh],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error(
      'useAuth() needs <AuthProvider> around the app: wrap it in the default export of src/App.tsx.',
    );
  }
  return auth;
}
