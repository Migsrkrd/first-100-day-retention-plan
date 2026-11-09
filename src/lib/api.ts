// Platform-owned: do not edit. Call the app's backend from the browser:
//   const notes = await apiFetch<Note[]>('notes');
//   await apiFetch('notes', { method: 'POST', json: { body } });
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestInit extends RequestInit {
  /** Sent as a JSON body with the matching Content-Type. */
  json?: unknown;
}

function apiUrl(path: string): string {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
  const route = path.replace(/^\/+/, '').replace(/^api\//, '');
  return `${base.replace(/\/+$/, '')}/api/${route}`;
}

export async function apiFetch<T = unknown>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (json !== undefined) headers.set('Content-Type', 'application/json');
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  headers.set('x-clarity-api', '1');

  const response = await fetch(apiUrl(path), {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: 'same-origin',
  });

  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
  const body: unknown =
    response.status === 204 ? undefined : isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, body);
  }
  return body as T;
}

// The app's accounts. Components use useAuth() from ./auth, which wraps these
// so every screen shares one signed-in person. Failures throw ApiError.
export interface AppUser {
  id: string;
  email: string;
  name: string | null;
}

/** The person signed in to this app, or null. */
export async function getCurrentUser(): Promise<AppUser | null> {
  return (await apiFetch<{ user: AppUser | null }>('auth/me')).user;
}

export async function signUp(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AppUser> {
  return (await apiFetch<{ user: AppUser }>('auth/signup', { method: 'POST', json: input })).user;
}

export async function signIn(input: { email: string; password: string }): Promise<AppUser> {
  return (await apiFetch<{ user: AppUser }>('auth/signin', { method: 'POST', json: input })).user;
}

export async function signOut(): Promise<void> {
  await apiFetch('auth/signout', { method: 'POST' });
}
