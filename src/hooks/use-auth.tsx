import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { smartToast } from '@/hooks/use-smart-toast';

// Interface para o perfil do usuário com todas as propriedades necessárias
interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  is_early_adopter?: boolean;
  subscription_status?: string;
  updated_at?: string;
  created_at?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const tokenRefreshTimerRef = useRef<number | null>(null);
  const attemptedProfileFetch = useRef<Set<string>>(new Set());

  const refreshToken = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        return false;
      }
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        return true;
      }
    } catch (error) {
      return false;
    }
    return false;
  }, []);

  const setupTokenRefresh = useCallback(() => {
    if (tokenRefreshTimerRef.current) {
      window.clearInterval(tokenRefreshTimerRef.current);
    }
    tokenRefreshTimerRef.current = window.setInterval(async () => {
      await refreshToken();
    }, 30 * 60 * 1000); // 30 minutos
  }, [refreshToken]);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      if (attemptedProfileFetch.current.has(userId)) {
        setProfile({ id: userId });
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        attemptedProfileFetch.current.add(userId);
        setProfile({ id: userId, full_name: 'Usuário' });
        return;
      }
      setProfile(data);
    } catch (error) {
      setProfile({ id: userId });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        smartToast({
          title: 'Erro ao sair',
          description: error.message || 'Não foi possível fazer logout.',
          variant: 'destructive',
        });
        return;
      }
      setSession(null);
      setUser(null);
      setProfile(null);
      if (tokenRefreshTimerRef.current) {
        window.clearInterval(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
      navigate('/login', { replace: true });
      smartToast({
        title: 'Você saiu!',
        description: 'Sessão encerrada com sucesso.',
      });
    } catch (error) {
      smartToast({
        title: 'Erro inesperado',
        description: 'Ocorreu um problema ao tentar sair.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Timeout de segurança para nunca travar o loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('Timeout de carregamento atingido pelo useAuth!');
        setIsLoading(false);
      }
    }, 5000);

    const setupAuth = async () => {
      const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setIsLoading(false);
        return;
      }
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        await fetchProfile(initialSession.user.id);
        setupTokenRefresh();
      }
      setIsLoading(false);
    };

    setupAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[use-auth] Evento onAuthStateChange:', event, newSession);

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          await fetchProfile(newSession.user.id);
          setupTokenRefresh();
          smartToast({ title: 'Login realizado com sucesso', description: 'Bem-vindo de volta!' });
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          if (tokenRefreshTimerRef.current) {
            window.clearInterval(tokenRefreshTimerRef.current);
          }
          // Removido o navigate('/login', { replace: true });
        }

        if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession);
          setUser(newSession.user);
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      authListener?.subscription.unsubscribe();
      if (tokenRefreshTimerRef.current) {
        window.clearInterval(tokenRefreshTimerRef.current);
      }
    };
  }, [fetchProfile, navigate, setupTokenRefresh, isLoading]);

  const value = {
    session,
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshProfile,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
