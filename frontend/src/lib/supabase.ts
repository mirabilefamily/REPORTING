// Local mock auth client (frontend-only clone).
// Mimics the subset of the supabase-js auth API this app uses, backed by
// localStorage so sessions persist across reloads. No external network calls.
//
// NOTE: This is a MOCKED auth layer for the standalone demo. Any email +
// password (>= 6 chars) will sign you in, and accounts are stored in-browser.

type AuthUser = { id: string; email: string };
export type Session = { user: AuthUser; access_token: string } | null;

type AuthChangeCallback = (event: string, session: Session) => void;

const SESSION_KEY = 'sync_mock_session';
const USERS_KEY = 'sync_mock_users';

const listeners = new Set<AuthChangeCallback>();

function readSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((cb) => cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session));
}

function readUsers(): Record<string, string> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeUsers(users: Record<string, string>) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

const makeSession = (email: string): Session => ({
  user: { id: `mock-${btoa(email).slice(0, 12)}`, email },
  access_token: `mock-token-${Date.now()}`,
});

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const supabase = {
  auth: {
    async getSession() {
      return { data: { session: readSession() }, error: null };
    },

    onAuthStateChange(callback: AuthChangeCallback) {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
            },
          },
        },
      };
    },

    async signUp({ email, password }: { email: string; password: string }) {
      await delay(450);
      const users = readUsers();
      if (users[email.toLowerCase()]) {
        return { data: { session: null }, error: { message: 'An account with this email already exists.' } };
      }
      users[email.toLowerCase()] = password;
      writeUsers(users);
      const session = makeSession(email);
      writeSession(session);
      return { data: { session }, error: null };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      await delay(450);
      const users = readUsers();
      const stored = users[email.toLowerCase()];
      // Demo-friendly: accept any valid-looking credentials even if not
      // previously registered, but block obvious password mismatches.
      if (stored && stored !== password) {
        return { data: { session: null }, error: { message: 'Invalid email or password.' } };
      }
      if (!stored) {
        users[email.toLowerCase()] = password;
        writeUsers(users);
      }
      const session = makeSession(email);
      writeSession(session);
      return { data: { session }, error: null };
    },

    async signOut() {
      await delay(150);
      writeSession(null);
      return { error: null };
    },
  },
};
