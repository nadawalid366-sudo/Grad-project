import * as SecureStore from "expo-secure-store";

export type AuthRole = "patient" | "professional";

export type AuthUser = {
  email: string;
  role: AuthRole;
  fullName: string;
};

const TOKEN_KEY = "vc_auth_token";
const USER_KEY = "vc_auth_user";

// In-memory cache so callers (e.g. the API client) can read the token
// synchronously on every request.
let cachedToken: string | null = null;
let cachedUser: AuthUser | null = null;
let initialized = false;

// Load any persisted session into memory. Call once at app startup.
export async function initAuth(): Promise<void> {
  try {
    const [token, userJson] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    cachedToken = token || null;
    cachedUser = userJson ? (JSON.parse(userJson) as AuthUser) : null;
  } catch {
    cachedToken = null;
    cachedUser = null;
  } finally {
    initialized = true;
  }
}

export function isAuthInitialized(): boolean {
  return initialized;
}

export function getToken(): string | null {
  return cachedToken;
}

export function getUser(): AuthUser | null {
  return cachedUser;
}

export function isLoggedIn(): boolean {
  return Boolean(cachedToken);
}

// Persist a new session (after login/register) and update the cache.
export async function signIn(token: string, user: AuthUser): Promise<void> {
  cachedToken = token;
  cachedUser = user;
  try {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
  } catch {
    // Non-fatal: session still works in-memory for this run.
  }
}

// Clear the session everywhere (logout / expired token).
export async function signOut(): Promise<void> {
  cachedToken = null;
  cachedUser = null;
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  } catch {
    // Ignore storage errors on clear.
  }
}
