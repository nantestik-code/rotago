import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { adminAuthService, AdminUser } from '@/services/adminAuthService';
import { logger } from '@/utils/logger';

interface AdminAuthContextType {
  admin: AdminUser | null;
  isLoading: boolean;
  isAdminLoggedIn: boolean;
  loginAdmin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;
  hasPermission: (role: 'admin' | 'super_admin' | 'moderator') => boolean;
  validateSession: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar sessão admin
  useEffect(() => {
    const initializeAdminSession = async () => {
      try {
        setIsLoading(true);
        logger.info('ADMIN', 'Inicializando sessão administrativa', {
          component: 'AdminAuthProvider',
          function: 'initializeAdminSession'
        });
        
        // Verificar se há sessão salva
        const currentAdmin = adminAuthService.getCurrentAdmin();
        if (currentAdmin) {
          logger.debug('ADMIN', 'Sessão administrativa encontrada no localStorage', {
            component: 'AdminAuthProvider',
            function: 'initializeAdminSession',
            adminEmail: currentAdmin.email,
            adminRole: currentAdmin.role
          });

          // Validar sessão
          const isValid = await adminAuthService.validateSession();
          if (isValid) {
            // Fazer login automático no Supabase Auth para permitir acesso aos dados
            console.log('🚀 [HOOK] Iniciando login automático no Supabase para:', currentAdmin.email);
            try {
              await adminAuthService.ensureSupabaseAuth(currentAdmin.email);
              console.log('✅ [HOOK] Login automático no Supabase executado com sucesso');
              logger.info('ADMIN', 'Login automático no Supabase Auth executado', {
                component: 'AdminAuthProvider',
                function: 'initializeAdminSession',
                adminEmail: currentAdmin.email
              });
            } catch (supabaseError) {
              console.error('❌ [HOOK] Falha no login automático Supabase:', supabaseError);
              logger.warn('ADMIN', 'Falha no login automático Supabase, continuando com sessão local', {
                component: 'AdminAuthProvider',
                function: 'initializeAdminSession',
                error: supabaseError as Error,
                adminEmail: currentAdmin.email
              });
            }
            
            setAdmin(currentAdmin);
            logger.info('ADMIN', 'Sessão administrativa validada com sucesso', {
              component: 'AdminAuthProvider',
              function: 'initializeAdminSession',
              adminEmail: currentAdmin.email,
              adminRole: currentAdmin.role
            });
          } else {
            setAdmin(null);
            logger.warn('ADMIN', 'Sessão administrativa inválida, removendo dados', {
              component: 'AdminAuthProvider',
              function: 'initializeAdminSession',
              adminEmail: currentAdmin.email
            });
          }
        } else {
          logger.debug('ADMIN', 'Nenhuma sessão administrativa encontrada', {
            component: 'AdminAuthProvider',
            function: 'initializeAdminSession'
          });
        }
      } catch (error: any) {
        logger.error('ADMIN', 'Erro ao inicializar sessão administrativa', {
          component: 'AdminAuthProvider',
          function: 'initializeAdminSession',
          error: error.message
        });
        setAdmin(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAdminSession();
  }, []);

  const loginAdmin = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      logger.info('ADMIN', 'Tentativa de login administrativo iniciada', {
        component: 'AdminAuthProvider',
        function: 'loginAdmin',
        email: email
      });
      
      const result = await adminAuthService.loginAdmin(email, password);
      
      if (result.success && result.admin) {
        setAdmin(result.admin);
        logger.info('ADMIN', 'Login administrativo realizado com sucesso', {
          component: 'AdminAuthProvider',
          function: 'loginAdmin',
          adminEmail: result.admin.email,
          adminRole: result.admin.role,
          adminId: result.admin.id
        });
        return { success: true };
      } else {
        logger.warn('ADMIN', 'Falha no login administrativo', {
          component: 'AdminAuthProvider',
          function: 'loginAdmin',
          email: email,
          error: result.error
        });
        return { 
          success: false, 
          error: result.error || 'Erro no login' 
        };
      }
    } catch (error: any) {
      logger.error('ADMIN', 'Erro interno no login administrativo', {
        component: 'AdminAuthProvider',
        function: 'loginAdmin',
        email: email,
        error: error.message
      });
      return { 
        success: false, 
        error: 'Erro interno do servidor' 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentAdmin = admin;
      
      logger.info('ADMIN', 'Logout administrativo iniciado', {
        component: 'AdminAuthProvider',
        function: 'logoutAdmin',
        adminEmail: currentAdmin?.email,
        adminRole: currentAdmin?.role
      });

      await adminAuthService.logoutAdmin();
      setAdmin(null);

      logger.info('ADMIN', 'Logout administrativo realizado com sucesso', {
        component: 'AdminAuthProvider',
        function: 'logoutAdmin',
        adminEmail: currentAdmin?.email
      });
    } catch (error: any) {
      logger.error('ADMIN', 'Erro no logout administrativo', {
        component: 'AdminAuthProvider',
        function: 'logoutAdmin',
        adminEmail: admin?.email,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [admin]);

  const hasPermission = useCallback((role: 'admin' | 'super_admin' | 'moderator') => {
    return adminAuthService.hasPermission(role);
  }, [admin]);

  const validateSession = useCallback(async () => {
    try {
      logger.debug('ADMIN', 'Validando sessão administrativa', {
        component: 'AdminAuthProvider',
        function: 'validateSession',
        adminEmail: admin?.email
      });

      const isValid = await adminAuthService.validateSession();
      
      if (!isValid) {
        logger.warn('ADMIN', 'Sessão administrativa inválida, removendo dados', {
          component: 'AdminAuthProvider',
          function: 'validateSession',
          adminEmail: admin?.email
        });
        setAdmin(null);
      } else {
        logger.debug('ADMIN', 'Sessão administrativa válida', {
          component: 'AdminAuthProvider',
          function: 'validateSession',
          adminEmail: admin?.email
        });
      }
      
      return isValid;
    } catch (error: any) {
      logger.error('ADMIN', 'Erro ao validar sessão administrativa', {
        component: 'AdminAuthProvider',
        function: 'validateSession',
        adminEmail: admin?.email,
        error: error.message
      });
      setAdmin(null);
      return false;
    }
  }, [admin]);

  const value: AdminAuthContextType = {
    admin,
    isLoading,
    isAdminLoggedIn: admin !== null,
    loginAdmin,
    logoutAdmin,
    hasPermission,
    validateSession
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider');
  }
  return context;
}

// Hook simplificado para componentes que só precisam verificar se é admin
export function useIsAdmin() {
  const { isAdminLoggedIn, hasPermission } = useAdminAuth();
  
  return {
    isAdmin: isAdminLoggedIn,
    isSuperAdmin: hasPermission('super_admin'),
    isModeratorOrAbove: hasPermission('moderator')
  };
}