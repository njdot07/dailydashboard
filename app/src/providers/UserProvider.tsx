import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AuthError,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/types';

// This provider is only mounted when supabase is configured (App enforces it).
const client = supabase as SupabaseClient;

interface AuthResult {
  error: AuthError | Error | null;
  needsEmailConfirmation?: boolean;
}

interface UserContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<AuthResult>;
}

const UserContext = createContext<UserContextValue | null>(null);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('Failed to load profile', error);
    return null;
  }
  return data as UserProfile | null;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) {
        fetchProfile(data.session.user.id).then((p) => {
          if (!cancelled) setProfile(p);
        });
      }
      setLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) {
        fetchProfile(next.user.id).then((p) => setProfile(p));
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback<UserContextValue['signIn']>(
    async (email, password) => {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },
    [],
  );

  const signUp = useCallback<UserContextValue['signUp']>(
    async (email, password, displayName) => {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      // If email confirmation is enabled in Supabase, signUp returns a user
      // but no session — the user must click a link before they can log in.
      const needsEmailConfirmation = Boolean(data.user && !data.session);
      return { error, needsEmailConfirmation };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await client.auth.signOut();
  }, []);

  const updateProfile = useCallback<UserContextValue['updateProfile']>(
    async (patch) => {
      if (!session) {
        return { error: new Error('Not authenticated') };
      }
      const { data, error } = await client
        .from('user_profiles')
        .update(patch)
        .eq('id', session.user.id)
        .select()
        .single();
      if (!error && data) {
        setProfile(data as UserProfile);
      }
      return { error };
    },
    [session],
  );

  const value = useMemo<UserContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }),
    [session, profile, loading, signIn, signUp, signOut, updateProfile],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used inside <UserProvider>');
  }
  return ctx;
}
