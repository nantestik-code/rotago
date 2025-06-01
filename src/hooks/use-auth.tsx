import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { smartToast } from '@/hooks/use-smart-toast';

// Interface simplificada para o perfil do usuário
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

  // Referência para o timer de renovação de token
  const tokenRefreshTimerRef = useRef<number | null>(null);
  
  // Controle para evitar tentativas repetidas de buscar perfis inexistentes
  const attemptedProfileFetch = useRef<Set<string>>(new Set());

  // Função para renovar o token
  const refreshToken = useCallback(async () => {
    console.log('Tentando renovar o token...');
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Erro ao renovar token:', error);
        return false;
      }
      
      if (data.session) {
        console.log('Token renovado com sucesso');
        setSession(data.session);
        setUser(data.session.user);
        return true;
      }
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      return false;
    }
    return false;
  }, []);

  // Configurar timer para renovar o token periodicamente
  const setupTokenRefresh = useCallback(() => {
    // Limpar timer existente se houver
    if (tokenRefreshTimerRef.current) {
      window.clearInterval(tokenRefreshTimerRef.current);
    }
    
    // Renovar token a cada 30 minutos para garantir que nunca expire
    tokenRefreshTimerRef.current = window.setInterval(async () => {
      console.log('Timer de renovação de token acionado');
      await refreshToken();
    }, 30 * 60 * 1000); // 30 minutos
    
    console.log('Timer de renovação de token configurado');
  }, [refreshToken]);
  
  // Função para buscar o perfil do usuário
  const fetchProfile = async (userId: string) => {
    try {
      console.log('Buscando perfil para usuário:', userId);
      
      // Verificar ambiente de desenvolvimento
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      // Evitar tentativas repetidas para o mesmo usuário
      if (attemptedProfileFetch.current.has(userId)) {
        console.log('Usando perfil mínimo para usuário já tentado');
        setProfile({ id: userId });
        return;
      }
      
      // Em desenvolvimento, criar perfil se não existir
      if (isDevelopment) {
        try {
          const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
            
          if (checkError || !existingProfile) {
            console.log('Criando perfil em ambiente de desenvolvimento');
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                full_name: 'Usuário de Teste',
                role: 'user',
                is_early_adopter: true,
                subscription_status: 'free',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (insertError) {
              console.error('Erro ao criar perfil:', insertError);
            } else {
              console.log('Perfil criado com sucesso');
            }
          }
        } catch (devError) {
          console.error('Erro ao verificar/criar perfil:', devError);
        }
      }

      // Buscar perfil do usuário
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, is_early_adopter, subscription_status, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        // Marcar para não tentar novamente
        attemptedProfileFetch.current.add(userId);
        
        if (error.code !== 'PGRST116') {
          console.error('Erro ao buscar perfil:', error);
        }
        
        setProfile({ id: userId });
        return;
      }
      
      // Definir perfil
      setProfile({
        id: userId,
        full_name: data?.full_name,
        avatar_url: data?.avatar_url,
        role: data?.role,
        is_early_adopter: data?.is_early_adopter,
        subscription_status: data?.subscription_status,
        created_at: data?.created_at,
        updated_at: data?.updated_at
      });
    } catch (error) {
      console.error('Erro em fetchProfile:', error);
      setProfile({ id: userId });
    }
  };

  // Função para atualizar o perfil
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };
  
  // Função para fazer logout
  const signOut = async () => {
    // Limpar timer de renovação de token
    if (tokenRefreshTimerRef.current) {
      window.clearInterval(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
    
    await supabase.auth.signOut();
  };

  // Efeito para configurar a autenticação
  useEffect(() => {
    // Timeout de segurança para evitar loading infinito
    const authTimeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('Timeout de autenticação atingido, forçando estado não-carregando');
        setIsLoading(false);
      }
    }, 10000); // 10 segundos de timeout

    let authSubscription: { unsubscribe: () => void } | null = null;

    const setupAuth = async () => {
      setIsLoading(true);
      
      try {
        // Configurar listener para mudanças de estado de autenticação
        const { data } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth state changed:', event, newSession?.user?.email);
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (newSession?.user) {
              // Buscar perfil do usuário
              try {
                await fetchProfile(newSession.user.id);
              } catch (profileError) {
                console.error('Erro ao buscar perfil após mudança de estado:', profileError);
                // Definir perfil mínimo para evitar problemas
                setProfile({ id: newSession.user.id });
              }
            } else {
              setProfile(null);
            }
            
            // Notificações para eventos de login/logout
            if (event === 'SIGNED_IN') {
              smartToast({
                title: 'Login realizado com sucesso',
                description: 'Bem-vindo ao RotaFacil',
                duration: 3000,
              });
              
              // Atualizar timestamp no perfil
              try {
                if (newSession?.user) {
                  await supabase
                    .from('profiles')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', newSession.user.id);
                  
                  console.log('Perfil atualizado após login:', newSession.user.id);
                }
              } catch (err) {
                console.error('Erro ao atualizar perfil após login:', err);
              }
            } else if (event === 'SIGNED_OUT') {
              smartToast({
                title: 'Logout realizado',
                description: 'Você saiu do RotaFacil',
                duration: 3000,
              });
              navigate('/');
            }
          }
        );
        
        // Armazenar a subscription para cleanup
        authSubscription = data.subscription;
        
        // Obter sessão atual
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError);
          throw sessionError;
        }
        
        // Se temos uma sessão ativa
        if (initialSession) {
          console.log('Sessão ativa encontrada');
          setSession(initialSession);
          setUser(initialSession.user);
          
          if (initialSession.user) {
            try {
              await fetchProfile(initialSession.user.id);
              // Configurar renovação automática de token
              setupTokenRefresh();
            } catch (profileError) {
              console.error('Erro ao buscar perfil inicial:', profileError);
              // Definir perfil mínimo para evitar problemas
              setProfile({ id: initialSession.user.id });
            }
          }
        } else {
          console.log('Nenhuma sessão ativa encontrada');
        }
      } catch (setupError) {
        console.error('Erro fatal na configuração de autenticação:', setupError);
        // Forçar redirecionamento para login em caso de erro grave
        smartToast({
          title: 'Erro de autenticação',
          description: 'Ocorreu um erro ao verificar sua sessão. Por favor, faça login novamente.',
          variant: 'destructive',
          duration: 5000
        });
      } finally {
        // Garantir que o estado de carregamento seja desativado
        setIsLoading(false);
        // Limpar o timeout de segurança
        clearTimeout(authTimeoutId);
      }
    };
    
    setupAuth();
    
    // Cleanup
    return () => {
      clearTimeout(authTimeoutId);
      
      try {
        if (authSubscription) {
          authSubscription.unsubscribe();
        }
        
        if (tokenRefreshTimerRef.current) {
          window.clearInterval(tokenRefreshTimerRef.current);
          tokenRefreshTimerRef.current = null;
        }
      } catch (cleanupError) {
        console.error('Erro durante cleanup de autenticação:', cleanupError);
      }
    };
  }, [navigate, setupTokenRefresh]);

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
