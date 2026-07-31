import { logger } from '@/lib/logger';
import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import type { AppRole, Profile } from '@/types';
import { deriveAuthState } from '@/hooks/auth-state';
import type { AppAccessMap, AppKey, AppRoleLevel } from '@/lib/app-access';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isApproved: boolean;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isBackofficeOrAdmin: boolean;
  isAdmin: boolean;
  isMasterUser: boolean;
  impersonatedProfile: Profile | null;
  impersonatedRoles: AppRole[];
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
  isImpersonating: boolean;
  effectiveProfile: Profile | null;
  effectiveRoles: AppRole[];
  appAccess: AppAccessMap;
  effectiveAppAccess: AppAccessMap;
  hasApp: (app: AppKey) => boolean;
  appRole: (app: AppKey) => AppRoleLevel | undefined;
  canApp: (app: AppKey, minimo: AppRoleLevel) => boolean;
  refreshAppAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAccessMap(rows: { app: string; papel: string }[] | null | undefined): AppAccessMap {
  const map: AppAccessMap = {};
  (rows ?? []).forEach((row) => {
    map[row.app as AppKey] = row.papel as AppRoleLevel;
  });
  return map;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
  const [impersonatedRoles, setImpersonatedRoles] = useState<AppRole[]>([]);
  const [appAccess, setAppAccess] = useState<AppAccessMap>({});
  const [impersonatedAppAccess, setImpersonatedAppAccess] = useState<AppAccessMap>({});

  const requestRef = useRef(0);
  const lastAppliedSessionRef = useRef<string | null>(null);

  const clearUserState = useCallback(() => {
    setProfile(null);
    setRoles([]);
    setAppAccess({});
    setImpersonatedProfile(null);
    setImpersonatedRoles([]);
    setImpersonatedAppAccess({});
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    const requestId = ++requestRef.current;

    try {
      const [profileResult, rolesResult, accessResult] = await Promise.all([
        supabase.rpc('get_my_profile').maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('user_app_access').select('app, papel').eq('user_id', userId),
      ]);

      if (requestId !== requestRef.current) return;

      setProfile((profileResult.data as Profile | null) ?? null);
      setRoles((rolesResult.data?.map((r) => r.role as AppRole)) ?? []);
      setAppAccess(toAccessMap(accessResult.data));
    } catch (error) {
      if (requestId !== requestRef.current) return;
      console.error('Error fetching user data:', error);
      clearUserState();
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [clearUserState]);

  useEffect(() => {
    let isMounted = true;

    const getSessionKey = (nextSession: Session | null) => {
      const userId = nextSession?.user?.id ?? 'anonymous';
      const token = nextSession?.access_token ?? 'no-token';
      return `${userId}:${token}`;
    };

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;

      const nextSessionKey = getSessionKey(nextSession);
      if (lastAppliedSessionRef.current === nextSessionKey) {
        if (import.meta.env.DEV) {
          logger.debug('[auth] sessão duplicada ignorada', nextSessionKey);
        }
        return;
      }

      lastAppliedSessionRef.current = nextSessionKey;
      setSession(nextSession);

      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        if (import.meta.env.DEV) {
          logger.debug('[auth] aplicando sessão para usuário', nextUser.id);
        }
        setLoading(true);
        void fetchUserData(nextUser.id);
      } else {
        if (import.meta.env.DEV) {
          logger.debug('[auth] sessão ausente, limpando estado');
        }
        requestRef.current += 1;
        clearUserState();
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, changedSession) => {
      applySession(changedSession);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        applySession(initialSession);
      })
      .catch((error) => {
        console.error('Error loading initial session:', error);
        clearUserState();
        setLoading(false);
      });

    return () => {
      isMounted = false;
      requestRef.current += 1;
      subscription.unsubscribe();
    };
  }, [clearUserState, fetchUserData]);

  const impersonateUser = async (userId: string) => {
    const { isMasterUser } = deriveAuthState({ profile, roles, impersonatedProfile, impersonatedRoles });
    if (!isMasterUser) {
      console.error('Only master user can impersonate');
      return;
    }

    try {
      const [targetProfileResult, targetRolesResult, targetAccessResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('user_app_access').select('app, papel').eq('user_id', userId),
      ]);

      setImpersonatedProfile((targetProfileResult.data as Profile | null) ?? null);
      setImpersonatedRoles((targetRolesResult.data?.map((r) => r.role as AppRole)) ?? []);
      setImpersonatedAppAccess(toAccessMap(targetAccessResult.data));
    } catch (error) {
      console.error('Error impersonating user:', error);
    }
  };

  const stopImpersonation = () => {
    setImpersonatedProfile(null);
    setImpersonatedRoles([]);
    setImpersonatedAppAccess({});
  };

  const refreshAppAccess = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('user_app_access').select('app, papel').eq('user_id', user.id);
    setAppAccess(toAccessMap(data));
  }, [user]);

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      return { error: result.error instanceof Error ? result.error.message : String(result.error) };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    requestRef.current += 1;
    lastAppliedSessionRef.current = null;
    setUser(null);
    setSession(null);
    clearUserState();
  };

  const {
    isMasterUser,
    isImpersonating,
    isApproved,
    effectiveProfile,
    effectiveRoles,
    effectiveAppAccess,
    hasApp,
    appRole,
    canApp,
  } = deriveAuthState({
    profile,
    roles,
    impersonatedProfile,
    impersonatedRoles,
    appAccess,
    impersonatedAppAccess,
  });

  const hasRole = (role: AppRole) => effectiveRoles.includes(role);
  const isBackofficeOrAdmin =
    canApp('financeiro', 'backoffice') || hasRole('backoffice') || hasRole('admin');
  const isAdmin = hasApp('administracao') || hasRole('admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        isApproved,
        signInWithGoogle,
        signOut,
        hasRole,
        isBackofficeOrAdmin,
        isAdmin,
        isMasterUser,
        impersonatedProfile,
        impersonatedRoles,
        impersonateUser,
        stopImpersonation,
        isImpersonating,
        effectiveProfile,
        effectiveRoles,
        appAccess,
        effectiveAppAccess,
        hasApp,
        appRole,
        canApp,
        refreshAppAccess,
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
