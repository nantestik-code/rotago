import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { adminAuthService, AdminUser } from '@/services/adminAuthService';
import { supabase } from '@/integrations/supabase/client';
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

  useEffect(() => {
    const initializeAdminSession = async () => {
      try {
        setIsLoading(true);

        const currentAdmin = adminAuthService.getCurrentAdmin();
        if (!currentAdmin) {
          setAdmin(null);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.email || session.user.email.toLowerCase() !== currentAdmin.email.toLowerCase()) {
          logger.warn('ADMIN', 'Sessao local de admin sem sessao Supabase correspondente; limpando sessao', {
            component: 'AdminAuthProvider',
            function: 'initializeAdminSession',
            adminEmail: currentAdmin.email,
            sessionEmail: session?.user?.email,
          });

          await adminAuthService.logoutAdmin();
          setAdmin(null);
          return;
        }

        setAdmin(currentAdmin);
      } catch (error) {
        logger.error('ADMIN', 'Erro ao inicializar sessao administrativa', {
          component: 'AdminAuthProvider',
          function: 'initializeAdminSession',
          error: error as Error,
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
      const result = await adminAuthService.loginAdmin(email, password);

      if (!result.success || !result.admin) {
        return {
          success: false,
          error: result.error || 'Erro no login',
        };
      }

      setAdmin(result.admin);
      return { success: true };
    } catch (error) {
      logger.error('ADMIN', 'Erro interno no login administrativo', {
        component: 'AdminAuthProvider',
        function: 'loginAdmin',
        error: error as Error,
        data: { email },
      });

      return {
        success: false,
        error: 'Erro interno do servidor',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    try {
      setIsLoading(true);
      await adminAuthService.logoutAdmin();
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasPermission = useCallback((role: 'admin' | 'super_admin' | 'moderator') => {
    return adminAuthService.hasPermission(role);
  }, [admin]);

  const validateSession = useCallback(async () => {
    try {
      const isValid = await adminAuthService.validateSession();
      if (!isValid) {
        setAdmin(null);
        return false;
      }

      setAdmin(adminAuthService.getCurrentAdmin());
      return true;
    } catch {
      setAdmin(null);
      return false;
    }
  }, []);

  const value: AdminAuthContextType = {
    admin,
    isLoading,
    isAdminLoggedIn: admin !== null,
    loginAdmin,
    logoutAdmin,
    hasPermission,
    validateSession,
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

export function useIsAdmin() {
  const { isAdminLoggedIn, hasPermission } = useAdminAuth();

  return {
    isAdmin: isAdminLoggedIn,
    isSuperAdmin: hasPermission('super_admin'),
    isModeratorOrAbove: hasPermission('moderator'),
  };
}
