
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  is_early_adopter?: boolean;
  subscription_status?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const setupAuth = async () => {
      setIsLoading(true);
      
      // Primeiro configuramos o listener de mudança de estado de autenticação
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          if (newSession?.user) {
            // Usamos setTimeout(0) para evitar deadlocks
            setTimeout(() => {
              fetchProfile(newSession.user.id);
            }, 0);
          } else {
            setProfile(null);
          }
          
          // Apenas mostra notificação em eventos reais de login/logout, não em recargas de página
          if (event === 'SIGNED_IN' && !initialSession) {
            // Só mostra a notificação se for um novo login, não uma reconexão
            toast({
              title: 'Login realizado com sucesso',
              description: 'Bem-vindo ao RotaFacil',
            });
          } else if (event === 'SIGNED_OUT') {
            toast({
              title: 'Logout realizado',
              description: 'Você saiu do RotaFacil',
            });
            navigate('/');
          }
        }
      );
      
      // Depois pegamos a sessão atual
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        await fetchProfile(initialSession.user.id);
      }
      
      setIsLoading(false);
      
      // Cleanup subscription
      return () => {
        subscription.unsubscribe();
      };
    };
    
    setupAuth();
  }, [navigate]);
  
  const fetchProfile = async (userId: string) => {
    try {
      // Usamos tipagem explícita para evitar os erros de TypeScript
      type ProfileType = {
        id: string;
        full_name?: string;
        avatar_url?: string;
        is_early_adopter?: boolean;
        subscription_status?: string;
      };

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single<ProfileType>();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      if (data) {
        setProfile({
          id: userId,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          is_early_adopter: data.is_early_adopter,
          subscription_status: data.subscription_status,
        });
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };
  
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };
  
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshProfile,
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
