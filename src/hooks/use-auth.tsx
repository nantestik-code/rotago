import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { supabase, clearSupabaseTokens } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { smartToast } from '@/hooks/use-smart-toast';
import { clearAllAuthData, hasResidualAuthTokens } from '@/utils/authUtils';
import { logger } from '@/utils/logger';

// Interface para o perfil do usuário com todas as propriedades necessárias
interface UserProfile {
  id: string;
  full_name?: string;
  cpf?: string;
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
    logger.info('AUTH', 'Iniciando refresh do token', {
      component: 'useAuth',
      function: 'refreshToken',
      data: { 
        hasSession: !!session,
        userId: user?.id,
        timestamp: new Date().toISOString()
      }
    });

    try {
      console.log('🔄 [refreshToken] Iniciando refresh do token...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.error('AUTH', 'Erro ao renovar token', {
          component: 'useAuth',
          function: 'refreshToken',
          error,
          data: { 
            errorCode: error.message,
            userId: user?.id
          }
        });
        console.error('❌ [refreshToken] Erro ao renovar token:', error);
        return false;
      }
      
      if (data.session) {
        logger.info('AUTH', 'Token renovado com sucesso', {
          component: 'useAuth',
          function: 'refreshToken',
          data: { 
            userId: data.session.user.id,
            expiresAt: data.session.expires_at,
            timestamp: new Date().toISOString()
          }
        });
        console.log('✅ [refreshToken] Token renovado com sucesso');
        setSession(data.session);
        setUser(data.session.user);
        return true;
      }
    } catch (error) {
      logger.critical('AUTH', 'Falha crítica no refresh do token', {
        component: 'useAuth',
        function: 'refreshToken',
        error: error as Error,
        data: { userId: user?.id }
      });
      console.error('❌ [refreshToken] Falha crítica no refresh:', error);
      return false;
    }
    return false;
  }, [session, user]);

  const setupTokenRefresh = useCallback(() => {
    if (tokenRefreshTimerRef.current) {
      window.clearInterval(tokenRefreshTimerRef.current);
    }
    tokenRefreshTimerRef.current = window.setInterval(async () => {
      await refreshToken();
    }, 30 * 60 * 1000); // 30 minutos
  }, [refreshToken]);

  const fetchProfile = useCallback(async (userId: string) => {
    logger.info('AUTH', 'Iniciando busca do perfil', {
      component: 'useAuth',
      function: 'fetchProfile',
      data: { 
        userId,
        alreadyAttempted: attemptedProfileFetch.current.has(userId)
      }
    });

    console.log('🔄 [fetchProfile] Iniciando busca do perfil para userId:', userId);
    
    if (attemptedProfileFetch.current.has(userId)) {
      logger.warn('AUTH', 'Busca de perfil já tentada para este userId', {
        component: 'useAuth',
        function: 'fetchProfile',
        data: { userId }
      });
      console.log('⚠️ [fetchProfile] Busca já tentada para este userId, pulando...');
      return;
    }
    
    attemptedProfileFetch.current.add(userId);
    
    try {
      logger.debug('DATABASE', 'Fazendo requisição para tabela profiles', {
        component: 'useAuth',
        function: 'fetchProfile',
        data: { userId, table: 'profiles' }
      });
      console.log('📡 [fetchProfile] Fazendo requisição para profiles...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('fetchProfile_timeout')), 10000);
      });
      
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (error) {
        logger.error('DATABASE', 'Erro na consulta de perfil', {
          component: 'useAuth',
          function: 'fetchProfile',
          error,
          data: { 
            userId,
            errorCode: error.code,
            errorMessage: error.message
          }
        });
        console.error('❌ [fetchProfile] Erro na consulta:', error);
        setProfile({ id: userId, full_name: 'Usuário' });
        return;
      }
      
      // Quando usamos maybeSingle(), se não houver registro, teremos data === null e error === null
      if (!data) {
        logger.warn('AUTH', 'Perfil não encontrado - usando perfil básico', {
          component: 'useAuth',
          function: 'fetchProfile',
          data: { userId, note: 'maybeSingle retornou null' }
        });
        console.log('ℹ️ [fetchProfile] Perfil não encontrado. Usando perfil básico.');
        setProfile({ id: userId, full_name: 'Usuário' });
        return;
      }
      
      logger.info('AUTH', 'Perfil carregado com sucesso', {
        component: 'useAuth',
        function: 'fetchProfile',
        data: { 
          userId,
          fullName: data.full_name,
          hasProfile: !!data
        }
      });
      console.log('✅ [fetchProfile] Perfil carregado com sucesso:', data.full_name);
      setProfile(data);
    } catch (error: any) {
      if (error.message === 'fetchProfile_timeout') {
        logger.warn('AUTH', 'Timeout na busca de perfil - usando perfil básico', {
          component: 'useAuth',
          function: 'fetchProfile',
          data: { userId, timeout: 10000 }
        });
        console.log('⏰ [fetchProfile] Timeout - usando perfil básico');
      } else {
        logger.error('AUTH', 'Erro inesperado na busca de perfil', {
          component: 'useAuth',
          function: 'fetchProfile',
          error: error as Error,
          data: { userId }
        });
        console.error('❌ [fetchProfile] Erro:', error);
      }
      attemptedProfileFetch.current.add(userId);
      setProfile({ id: userId, full_name: 'Usuário' });
    }
    console.log('✅ [fetchProfile] Finalizado');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const signOut = async () => {
    try {
      console.log('🔐 useAuth: Iniciando processo de logout aprimorado...');
      console.log('📝 Estado antes do logout:', { session, user, profile });
      
      // Verificar se há tokens residuais antes do logout
      const hasTokensBeforeLogout = hasResidualAuthTokens();
      console.log(`🔍 Tokens residuais antes do logout: ${hasTokensBeforeLogout ? 'SIM' : 'NÃO'}`);
      
      // 1. Primeiro, chamar signOut do Supabase com escopo global para invalidar todas as sessões
      console.log('💻 Chamando supabase.auth.signOut com escopo global...');
      await supabase.auth.signOut({ scope: 'global' });
      
      // 2. Limpar todos os dados de autenticação usando nossa função de utilitário
      console.log('🧹 Limpando todos os dados de autenticação...');
      clearAllAuthData();
      
      // 3. Limpar tokens específicos do Supabase (garantia adicional)
      console.log('🗑️ Limpando tokens específicos do Supabase...');
      clearSupabaseTokens();
      
      // 4. Limpar estado React
      console.log('🔄 Limpando estado React...');
      setSession(null);
      setUser(null);
      setProfile(null);
      
      // 4.1. Limpar dados de negócio específicos para evitar vazamento entre usuários
      console.log('🧹 Limpando dados de negócio específicos...');
      localStorage.removeItem('currentRouteDeliveries');
      localStorage.removeItem('currentRouteId');
      localStorage.removeItem('pendingRouteActions');
      localStorage.removeItem('pending_payment');
      localStorage.removeItem('pending_plan_id');
      localStorage.removeItem('pending_payment_time');
      localStorage.removeItem('rotafacil-landing-state');
      console.log('✅ Dados de negócio removidos do localStorage');
      
      // 5. Limpar timer de refresh se existir
      if (tokenRefreshTimerRef.current) {
        console.log('⏰ Limpando timer de refresh...');
        window.clearInterval(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
      
      // 6. Remover qualquer token de autorização dos headers do Supabase
      console.log('💼 Removendo headers de autorização...');
      try {
        // @ts-ignore - Acessando propriedade interna para garantir limpeza completa
        if (supabase.rest && supabase.rest.headers) {
          // @ts-ignore
          delete supabase.rest.headers['Authorization'];
          console.log('✅ Headers de autorização removidos');
        }
      } catch (headerError) {
        console.warn('⚠️ Não foi possível limpar headers:', headerError);
      }
      
      // 7. Verificar se ainda há tokens residuais após o logout
      const hasTokensAfterLogout = hasResidualAuthTokens();
      console.log(`🔍 Tokens residuais após logout: ${hasTokensAfterLogout ? 'SIM' : 'NÃO'}`);
      
      // 8. Se ainda houver tokens residuais, forçar limpeza mais agressiva
      if (hasTokensAfterLogout) {
        console.log('⚠️ Tokens residuais detectados! Aplicando limpeza forçada...');
        localStorage.clear();
        sessionStorage.clear();
        
        // Limpar todos os cookies sem filtro
        document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.trim().split('=');
          if (name) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
          }
        });
      }
      
      console.log('✅ Processo de logout completo!');
      
      // 9. Notificar o usuário
      smartToast({
        title: "Logout realizado",
        description: "Você será redirecionado para a tela de login.",
        variant: "default"
      });
      
      // 10. Forçar reload da página e redirecionamento para login com parâmetros para evitar cache
      console.log('🔄 Redirecionando para login...');
      const timestamp = new Date().getTime();
      
      // Pequeno delay para garantir que o toast seja exibido
      setTimeout(() => {
        window.location.replace(`/login?logout=true&t=${timestamp}&source=useAuth`);
      }, 500);
    } catch (error) {
      console.error('❌ Erro durante logout:', error);
      
      // Mesmo com erro, tentar limpeza e redirecionamento forçado
      try {
        localStorage.clear();
        sessionStorage.clear();
        clearAllAuthData();
      } catch (e) {
        console.error('❌ Erro na limpeza de emergência:', e);
      }
      
      alert('Erro ao fazer logout. Redirecionando para login...');
      const timestamp = new Date().getTime();
      window.location.replace(`/login?error=true&t=${timestamp}&emergency=true`);
    }
  };

  useEffect(() => {
    const setupAuth = async () => {
      console.log('🔄 [useAuth] Iniciando configuração de autenticação...');
      
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('📊 [useAuth] Resposta getSession:', { 
          session: initialSession ? 'presente' : 'null', 
          error: sessionError 
        });
        
        if (sessionError) {
          console.error('❌ [useAuth] Erro ao obter sessão:', sessionError);
          setIsLoading(false);
          return;
        }
        
        if (initialSession) {
          console.log('✅ [useAuth] Sessão inicial encontrada para usuário:', initialSession.user.id);
          setSession(initialSession);
          setUser(initialSession.user);
          console.log('🔄 [useAuth] Iniciando fetchProfile...');
          await fetchProfile(initialSession.user.id);
          console.log('✅ [useAuth] fetchProfile concluído');
          setupTokenRefresh();
        } else {
          console.log('ℹ️ [useAuth] Nenhuma sessão inicial encontrada');
        }
        
        console.log('✅ [useAuth] Configuração de autenticação concluída - definindo isLoading=false');
        setIsLoading(false);
      } catch (error) {
        console.error('❌ [useAuth] Erro crítico na configuração:', error);
        setIsLoading(false);
      }
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
          console.log('🔔 Auth Event: SIGNED_OUT detectado', { pathname: window.location.pathname });
          
          // Limpar dados da sessão
          setProfile(null);
          setSession(null);
          setUser(null);
          
          // Limpar timers
          if (tokenRefreshTimerRef.current) {
            window.clearInterval(tokenRefreshTimerRef.current);
            tokenRefreshTimerRef.current = null;
          }
          
          // Limpar manualmente tokens e cookies
          try {
            console.log('🗑️ Auth Event: Limpando tokens e cookies manualmente');
            localStorage.removeItem('supabase-auth-token');
            localStorage.removeItem('sb-refresh-token');
            localStorage.removeItem('sb-access-token');
            
            document.cookie = 'sb-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'sb-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          } catch (cleanupError) {
            console.error('⚠️ Auth Event: Erro ao limpar tokens:', cleanupError);
          }
          
          // Verificar se o evento foi disparado por um signOut manual ou por expiração de sessão
          // Se não estamos já na página de login, redirecionar
          const isLoginPage = window.location.pathname.includes('/login');
          if (!isLoginPage) {
            console.log('🔄 Auth Event: Redirecionando para /login por sessão encerrada');
            
            // Pequeno delay para garantir que os logs sejam visíveis
            setTimeout(() => {
              window.location.href = '/login?session_expired=true';
            }, 300);
          } else {
            console.log('ℹ️ Auth Event: Já estamos na página de login, não é necessário redirecionar');
          }
        }

        if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession);
          setUser(newSession.user);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
      if (tokenRefreshTimerRef.current) {
        window.clearInterval(tokenRefreshTimerRef.current);
      }
    };
  }, []); // Executar apenas uma vez na montagem

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
