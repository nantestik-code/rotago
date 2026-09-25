import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin-client';
import { logger } from '@/utils/logger';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ADMIN_SESSION_KEY = 'rotago_admin_session';
const ADMIN_AUTH_TYPE_KEY = 'adminAuthType';
const ADMIN_ROLES: ReadonlyArray<AdminUser['role']> = ['admin', 'super_admin', 'moderator'];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class AdminAuthService {
  private static instance: AdminAuthService;
  private currentAdmin: AdminUser | null = null;

  private constructor() {
    const savedAdmin = localStorage.getItem(ADMIN_SESSION_KEY);

    if (!savedAdmin) {
      return;
    }

    try {
      this.currentAdmin = JSON.parse(savedAdmin) as AdminUser;
    } catch (error) {
      logger.error('ADMIN', 'Falha ao restaurar sessao admin do localStorage', {
        component: 'AdminAuthService',
        function: 'constructor',
        error: error as Error,
      });

      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_AUTH_TYPE_KEY);
    }
  }

  static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }

    return AdminAuthService.instance;
  }

  async loginAdmin(email: string, password: string): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
    const normalizedEmail = normalizeEmail(email);

    logger.info('ADMIN', 'Tentativa de login admin iniciada', {
      component: 'AdminAuthService',
      function: 'loginAdmin',
      data: { email: normalizedEmail },
    });

    try {
      // A senha e verificada primeiro. So depois de autenticado o banco
      // aceita ler `profiles`, ja que o RLS agora exige sessao.
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession?.user?.email?.toLowerCase() !== normalizedEmail) {
        await supabase.auth.signOut();
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError || !authData.user) {
        logger.warn('AUTH', 'Falha na autenticacao do admin no Supabase Auth', {
          component: 'AdminAuthService',
          function: 'loginAdmin',
          data: {
            email: normalizedEmail,
            message: authError?.message,
            status: authError?.status,
          },
        });

        return {
          success: false,
          error: 'Email ou senha incorretos',
        };
      }

      // Permissao vem de profiles.role, protegido pelo trigger
      // profiles_prevent_role_escalation. A tabela `admins` nao existe.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at, updated_at')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        logger.error('DATABASE', 'Erro ao consultar perfil administrativo', {
          component: 'AdminAuthService',
          function: 'loginAdmin',
          error: profileError,
          data: { email: normalizedEmail },
        });

        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Erro ao verificar credenciais administrativas',
        };
      }

      const role = profileData?.role as AdminUser['role'] | undefined;

      if (!role || !ADMIN_ROLES.includes(role)) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Esta conta nao tem permissao administrativa',
        };
      }

      const adminUser: AdminUser = {
        id: profileData.id,
        email: normalizedEmail,
        full_name: profileData.full_name ?? normalizedEmail,
        role,
        is_active: true,
        created_at: profileData.created_at ?? new Date().toISOString(),
        updated_at: profileData.updated_at ?? new Date().toISOString(),
      };

      this.currentAdmin = adminUser;
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminUser));
      localStorage.setItem(ADMIN_AUTH_TYPE_KEY, 'supabase');

      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', adminUser.id);

      logger.info('ADMIN', 'Login administrativo concluido', {
        component: 'AdminAuthService',
        function: 'loginAdmin',
        data: { email: adminUser.email, role: adminUser.role },
      });

      return {
        success: true,
        admin: adminUser,
      };
    } catch (error) {
      logger.error('ADMIN', 'Erro inesperado no login admin', {
        component: 'AdminAuthService',
        function: 'loginAdmin',
        error: error as Error,
        data: { email: normalizedEmail },
      });

      return {
        success: false,
        error: 'Erro interno do servidor',
      };
    }
  }

  getAdminSupabaseClient() {
    return this.getCurrentSession() ? supabaseAdmin : supabase;
  }

  async logoutAdmin(): Promise<void> {
    const adminEmail = this.currentAdmin?.email;

    if (this.currentAdmin) {
      await this.logAdminAction('logout', `Admin ${this.currentAdmin.email} fez logout`);
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      logger.warn('AUTH', 'Falha ao encerrar sessao auth no logout admin', {
        component: 'AdminAuthService',
        function: 'logoutAdmin',
        error: error as Error,
        data: { adminEmail },
      });
    }

    this.currentAdmin = null;
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_AUTH_TYPE_KEY);
  }

  getCurrentAdmin(): AdminUser | null {
    return this.currentAdmin;
  }

  getCurrentSession(): AdminUser | null {
    if (this.currentAdmin) {
      return this.currentAdmin;
    }

    const savedSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!savedSession) {
      return null;
    }

    try {
      const session = JSON.parse(savedSession) as AdminUser;
      this.currentAdmin = session;
      return session;
    } catch (error) {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      localStorage.removeItem(ADMIN_AUTH_TYPE_KEY);
      logger.error('ADMIN', 'Falha ao restaurar sessao admin salva', {
        component: 'AdminAuthService',
        function: 'getCurrentSession',
        error: error as Error,
      });
      return null;
    }
  }

  isAdminLoggedIn(): boolean {
    return Boolean(this.currentAdmin?.is_active);
  }

  hasPermission(requiredRole: 'admin' | 'super_admin' | 'moderator'): boolean {
    if (!this.currentAdmin) {
      return false;
    }

    const roleHierarchy = {
      moderator: 1,
      admin: 2,
      super_admin: 3,
    } as const;

    return roleHierarchy[this.currentAdmin.role] >= roleHierarchy[requiredRole];
  }

  private async logAdminAction(action: string, description: string): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        user_id: this.currentAdmin?.id || 'system',
        action,
        description,
        metadata: {
          admin_email: this.currentAdmin?.email,
          admin_role: this.currentAdmin?.role,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.warn('ADMIN', 'Falha ao registrar acao de auditoria', {
        component: 'AdminAuthService',
        function: 'logAdminAction',
        error: error as Error,
        data: { action },
      });
    }
  }

  async ensureSupabaseAuth(adminEmail: string): Promise<void> {
    const normalizedEmail = normalizeEmail(adminEmail);
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session?.user?.email || session.user.email.toLowerCase() !== normalizedEmail) {
      throw new Error('Sessao administrativa do Supabase ausente ou divergente. Faca login novamente.');
    }
  }

  async validateSession(): Promise<boolean> {
    if (!this.currentAdmin) {
      return false;
    }

    try {
      await this.ensureSupabaseAuth(this.currentAdmin.email);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        await this.logoutAdmin();
        return false;
      }

      // Rele o role direto do banco. O que esta no localStorage e so cache de
      // UI: quem decide e o RLS, entao uma sessao forjada nao passa daqui.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at, updated_at')
        .eq('id', user.id)
        .maybeSingle();

      const role = profileData?.role as AdminUser['role'] | undefined;

      if (profileError || !role || !ADMIN_ROLES.includes(role)) {
        await this.logoutAdmin();
        return false;
      }

      this.currentAdmin = {
        id: profileData.id,
        email: user.email ?? this.currentAdmin.email,
        full_name: profileData.full_name ?? user.email ?? '',
        role,
        is_active: true,
        created_at: profileData.created_at ?? this.currentAdmin.created_at,
        updated_at: profileData.updated_at ?? this.currentAdmin.updated_at,
      };

      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(this.currentAdmin));
      return true;
    } catch (error) {
      logger.warn('ADMIN', 'Sessao administrativa invalidada', {
        component: 'AdminAuthService',
        function: 'validateSession',
        error: error as Error,
        data: { email: this.currentAdmin?.email },
      });

      await this.logoutAdmin();
      return false;
    }
  }

  /**
   * Promove um usuario ja cadastrado a um papel administrativo.
   *
   * A promocao acontece na RPC `promote_user_to_role`, que valida do lado do
   * servidor se quem chama e super_admin. Antes esta funcao era um esqueleto
   * que nao criava nada.
   */
  async addAdmin(adminData: {
    email: string;
    role: 'admin' | 'moderator' | 'super_admin';
  }): Promise<{ success: boolean; error?: string }> {
    const normalizedEmail = normalizeEmail(adminData.email);

    const { error } = await supabase.rpc('promote_user_to_role', {
      target_email: normalizedEmail,
      new_role: adminData.role,
    });

    if (error) {
      logger.error('ADMIN', 'Falha ao promover usuario a admin', {
        component: 'AdminAuthService',
        function: 'addAdmin',
        error,
        data: { email: normalizedEmail, role: adminData.role },
      });

      return { success: false, error: error.message };
    }

    await this.logAdminAction(
      'add_admin',
      `Usuario ${normalizedEmail} promovido a ${adminData.role}`,
    );

    return { success: true };
  }
}

export const adminAuthService = AdminAuthService.getInstance();
