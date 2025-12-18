import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Profile } from '@/types';

const MASTER_EMAIL = 'guilherme_xd@live.com';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isBackofficeOrAdmin: boolean;
  isAdmin: boolean;
  // Impersonation
  isMasterUser: boolean;
  impersonatedProfile: Profile | null;
  impersonatedRoles: AppRole[];
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
  isImpersonating: boolean;
  effectiveProfile: Profile | null;
  effectiveRoles: AppRole[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Impersonation state
  const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
  const [impersonatedRoles, setImpersonatedRoles] = useState<AppRole[]>([]);

  const isMasterUser = user?.email === MASTER_EMAIL;
  const isImpersonating = isMasterUser && impersonatedProfile !== null;

  // Effective profile/roles (impersonated or real)
  const effectiveProfile = isImpersonating ? impersonatedProfile : profile;
  const effectiveRoles = isImpersonating ? impersonatedRoles : roles;

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setImpersonatedProfile(null);
          setImpersonatedRoles([]);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesData) {
        setRoles(rolesData.map((r) => r.role as AppRole));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const impersonateUser = async (userId: string) => {
    if (!isMasterUser) {
      console.error('Only master user can impersonate');
      return;
    }

    try {
      // Fetch target user's profile
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (targetProfile) {
        setImpersonatedProfile(targetProfile as Profile);
      }

      // Fetch target user's roles
      const { data: targetRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (targetRoles) {
        setImpersonatedRoles(targetRoles.map((r) => r.role as AppRole));
      }
    } catch (error) {
      console.error('Error impersonating user:', error);
    }
  };

  const stopImpersonation = () => {
    setImpersonatedProfile(null);
    setImpersonatedRoles([]);
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Email ou senha inválidos' };
      }
      return { error: error.message };
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: string | null }> => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        return { error: 'Este email já está cadastrado' };
      }
      return { error: error.message };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setImpersonatedProfile(null);
    setImpersonatedRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isBackofficeOrAdmin = hasRole('backoffice') || hasRole('admin');
  const isAdmin = hasRole('admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        signIn,
        signUp,
        signOut,
        hasRole,
        isBackofficeOrAdmin,
        isAdmin,
        // Impersonation
        isMasterUser,
        impersonatedProfile,
        impersonatedRoles,
        impersonateUser,
        stopImpersonation,
        isImpersonating,
        effectiveProfile,
        effectiveRoles,
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
