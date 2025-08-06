import { supabase } from '@/utils/supabaseClient';
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

// Lista de administradores autorizados (temporário até implementar tabela)
const AUTHORIZED_ADMINS = [
  {
    email: 'evandromromero@gmail.com',
    password: '933755GiEv**',
    full_name: 'Evandro Romero',
    role: 'super_admin' as const,
    id: 'admin-1',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    supabase_email: 'admin@rotafacil.com' // Email para login no Supabase Auth
  },
  {
    email: 'admin@rotafacil.com',
    password: 'admin123',
    full_name: 'Admin Sistema',
    role: 'admin' as const,
    id: 'admin-2',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    supabase_email: 'admin@rotafacil.com'
  },
  {
    email: 'suporte@rotafacil.com',
    password: 'suporte123',
    full_name: 'Suporte Sistema',
    role: 'moderator' as const,
    id: 'admin-3',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    supabase_email: 'suporte@rotafacil.com'
  }
];

export class AdminAuthService {
  private static instance: AdminAuthService;
  private currentAdmin: AdminUser | null = null;

  private constructor() {
    logger.info('ADMIN', 'Inicializando AdminAuthService', { component: 'AdminAuthService', function: 'constructor' });
    
    // Verificar se há admin logado no localStorage
    const savedAdmin = localStorage.getItem('rotago_admin_session');
    if (savedAdmin) {
      try {
        this.currentAdmin = JSON.parse(savedAdmin);
        logger.info('ADMIN', 'Sessão admin recuperada do localStorage', { 
          component: 'AdminAuthService',
          function: 'constructor',
          data: { adminEmail: this.currentAdmin?.email, role: this.currentAdmin?.role }
        });
      } catch (error) {
        logger.error('ADMIN', 'Erro ao recuperar sessão admin do localStorage', {
          component: 'AdminAuthService',
          function: 'constructor',
          error: error as Error,
          data: { savedAdminData: savedAdmin }
        });
        localStorage.removeItem('rotago_admin_session');
      }
    } else {
      logger.debug('ADMIN', 'Nenhuma sessão admin encontrada no localStorage', {
        component: 'AdminAuthService',
        function: 'constructor'
      });
    }
  }

  static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  async loginAdmin(email: string, password: string): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
    logger.info('ADMIN', 'Tentativa de login admin iniciada', {
      component: 'AdminAuthService',
      function: 'loginAdmin',
      data: { email: email.toLowerCase() }
    });

    try {
      // Verificar credenciais na lista de admins autorizados
      const admin = AUTHORIZED_ADMINS.find(
        a => a.email.toLowerCase() === email.toLowerCase() && a.password === password && a.is_active
      );

      if (!admin) {
        logger.warn('SECURITY', 'Tentativa de login admin com credenciais inválidas', {
          component: 'AdminAuthService',
          function: 'loginAdmin',
          data: { 
            email: email.toLowerCase(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        });
        
        return {
          success: false,
          error: 'Credenciais inválidas ou acesso não autorizado'
        };
      }

      // Fazer login no Supabase Auth para permitir acesso via políticas RLS
      try {
        // Para o Evandro, usar as credenciais reais dele
        let supabaseEmail = admin.email;
        let supabasePassword = 'admin_temp_password_2024';
        
        if (admin.email === 'evandromromero@gmail.com') {
          supabaseEmail = 'evandromromero@gmail.com';
          supabasePassword = '933755GiEv**'; // Senha real do Evandro
        }
        
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: supabaseEmail,
          password: supabasePassword
        });

        if (authError) {
          logger.warn('ADMIN', 'Falha no login Supabase Auth, continuando apenas com sessão local', {
            component: 'AdminAuthService',
            function: 'loginAdmin',
            error: authError,
            data: { supabaseEmail }
          });
        } else {
          logger.info('ADMIN', 'Login Supabase Auth realizado com sucesso', {
            component: 'AdminAuthService',
            function: 'loginAdmin',
            data: { supabaseEmail, supabaseUserId: authData.user?.id }
          });
        }
      } catch (supabaseError) {
        logger.warn('ADMIN', 'Erro no login Supabase Auth, continuando apenas com sessão local', {
          component: 'AdminAuthService',
          function: 'loginAdmin',
          error: supabaseError as Error
        });
      }

      // Criar sessão admin
      const adminSession: AdminUser = {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
        is_active: admin.is_active,
        created_at: admin.created_at,
        updated_at: admin.updated_at
      };

      this.currentAdmin = adminSession;
      
      // Salvar sessão no localStorage
      localStorage.setItem('rotago_admin_session', JSON.stringify(adminSession));

      logger.info('ADMIN', 'Login admin realizado com sucesso', {
        component: 'AdminAuthService',
        function: 'loginAdmin',
        data: { 
          adminEmail: admin.email,
          role: admin.role,
          sessionId: admin.id,
          timestamp: new Date().toISOString()
        }
      });

      // Log de auditoria
      await this.logAdminAction('login', `Admin ${admin.email} fez login`);

      return {
        success: true,
        admin: adminSession
      };

    } catch (error) {
      logger.error('ADMIN', 'Erro interno durante login admin', {
        component: 'AdminAuthService',
        function: 'loginAdmin',
        error: error as Error,
        data: { email: email.toLowerCase() }
      });
      
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  async logoutAdmin(): Promise<void> {
    const adminEmail = this.currentAdmin?.email;
    const adminRole = this.currentAdmin?.role;
    
    logger.info('ADMIN', 'Logout admin iniciado', {
      component: 'AdminAuthService',
      function: 'logoutAdmin',
      data: { adminEmail, adminRole }
    });

    if (this.currentAdmin) {
      await this.logAdminAction('logout', `Admin ${this.currentAdmin.email} fez logout`);
    }
    
    this.currentAdmin = null;
    localStorage.removeItem('rotago_admin_session');
    
    logger.info('ADMIN', 'Logout admin concluído', {
      component: 'AdminAuthService',
      function: 'logoutAdmin',
      data: { adminEmail, adminRole }
    });
  }

  getCurrentAdmin(): AdminUser | null {
    return this.currentAdmin;
  }

  isAdminLoggedIn(): boolean {
    return this.currentAdmin !== null && this.currentAdmin.is_active;
  }

  hasPermission(requiredRole: 'admin' | 'super_admin' | 'moderator'): boolean {
    if (!this.currentAdmin) return false;

    const roleHierarchy = {
      'moderator': 1,
      'admin': 2,
      'super_admin': 3
    };

    const currentLevel = roleHierarchy[this.currentAdmin.role];
    const requiredLevel = roleHierarchy[requiredRole];

    return currentLevel >= requiredLevel;
  }

  private async logAdminAction(action: string, description: string): Promise<void> {
    try {
      // Inserir log na tabela de auditoria (se existir)
      await supabase.from('audit_logs').insert({
        user_id: this.currentAdmin?.id || 'system',
        action,
        description,
        metadata: {
          admin_email: this.currentAdmin?.email,
          admin_role: this.currentAdmin?.role,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
    }
  }

  // Método para garantir autenticação no Supabase Auth
  async ensureSupabaseAuth(adminEmail: string): Promise<void> {
    console.log('🔐 [ADMIN AUTH] Iniciando ensureSupabaseAuth para:', adminEmail);
    
    logger.info('ADMIN', 'Garantindo autenticação no Supabase Auth', {
      component: 'AdminAuthService',
      function: 'ensureSupabaseAuth',
      data: { adminEmail }
    });

    try {
      // Verificar se já há sessão ativa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('🔍 [ADMIN AUTH] Verificando sessão atual:', {
        hasSession: !!session,
        sessionEmail: session?.user?.email,
        targetEmail: adminEmail,
        sessionError
      });
      
      if (session && session.user?.email === adminEmail) {
        console.log('✅ [ADMIN AUTH] Sessão já ativa para o admin');
        logger.debug('ADMIN', 'Sessão Supabase já ativa para o admin', {
          component: 'AdminAuthService',
          function: 'ensureSupabaseAuth',
          data: { adminEmail, userId: session.user.id }
        });
        return;
      }

      // Fazer login no Supabase Auth
      let supabasePassword = 'admin_temp_password_2024';
      
      if (adminEmail === 'evandromromero@gmail.com') {
        supabasePassword = '933755GiEv**'; // Senha real do Evandro
      } else if (adminEmail === 'admin@rotafacil.com') {
        supabasePassword = 'admin123'; // Senha do admin sistema
      }
      
      console.log('🔑 [ADMIN AUTH] Tentando login no Supabase Auth:', {
        email: adminEmail,
        passwordLength: supabasePassword.length
      });
      
      logger.info('ADMIN', 'Tentando login no Supabase Auth', {
        component: 'AdminAuthService',
        function: 'ensureSupabaseAuth',
        data: { adminEmail, passwordLength: supabasePassword.length }
      });
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: supabasePassword
      });

      console.log('📊 [ADMIN AUTH] Resultado do login:', {
        success: !authError,
        hasUser: !!authData?.user,
        userEmail: authData?.user?.email,
        userId: authData?.user?.id,
        error: authError?.message
      });

      if (authError) {
        console.error('❌ [ADMIN AUTH] Erro no login Supabase:', authError);
        logger.warn('ADMIN', 'Falha no login Supabase Auth durante ensureSupabaseAuth', {
          component: 'AdminAuthService',
          function: 'ensureSupabaseAuth',
          error: authError,
          data: { adminEmail }
        });
        throw authError;
      } else {
        console.log('✅ [ADMIN AUTH] Login Supabase realizado com sucesso!');
        logger.info('ADMIN', 'Login Supabase Auth realizado com sucesso durante ensureSupabaseAuth', {
          component: 'AdminAuthService',
          function: 'ensureSupabaseAuth',
          data: { adminEmail, supabaseUserId: authData.user?.id }
        });
      }
    } catch (error) {
      logger.error('ADMIN', 'Erro durante ensureSupabaseAuth', {
        component: 'AdminAuthService',
        function: 'ensureSupabaseAuth',
        error: error as Error,
        data: { adminEmail }
      });
      throw error;
    }
  }

  // Método para validar sessão (verificar se ainda é válida)
  async validateSession(): Promise<boolean> {
    logger.debug('ADMIN', 'Validando sessão admin', {
      component: 'AdminAuthService',
      function: 'validateSession',
      data: { 
        hasCurrentAdmin: !!this.currentAdmin,
        adminEmail: this.currentAdmin?.email 
      }
    });

    if (!this.currentAdmin) {
      logger.warn('ADMIN', 'Validação de sessão falhou: nenhum admin logado', {
        component: 'AdminAuthService',
        function: 'validateSession'
      });
      return false;
    }

    // Verificar se o admin ainda está na lista de autorizados
    const admin = AUTHORIZED_ADMINS.find(
      a => a.email === this.currentAdmin?.email && a.is_active
    );

    if (!admin) {
      logger.warn('SECURITY', 'Sessão admin invalidada: admin não encontrado ou inativo', {
        component: 'AdminAuthService',
        function: 'validateSession',
        data: { 
          adminEmail: this.currentAdmin?.email,
          adminRole: this.currentAdmin?.role
        }
      });
      
      await this.logoutAdmin();
      return false;
    }

    logger.debug('ADMIN', 'Sessão admin validada com sucesso', {
      component: 'AdminAuthService',
      function: 'validateSession',
      data: { 
        adminEmail: admin.email,
        adminRole: admin.role
      }
    });

    return true;
  }

  // Método para adicionar novos admins (apenas super_admin)
  async addAdmin(adminData: {
    email: string;
    password: string;
    full_name: string;
    role: 'admin' | 'moderator';
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.hasPermission('super_admin')) {
      return {
        success: false,
        error: 'Apenas super administradores podem adicionar novos admins'
      };
    }

    // Verificar se email já existe
    const existingAdmin = AUTHORIZED_ADMINS.find(a => a.email === adminData.email);
    if (existingAdmin) {
      return {
        success: false,
        error: 'Email já está em uso'
      };
    }

    // Em uma implementação real, isso seria salvo no banco de dados
    // Por enquanto, apenas logamos a ação
    await this.logAdminAction('add_admin', `Novo admin adicionado: ${adminData.email}`);

    return {
      success: true
    };
  }
}

export const adminAuthService = AdminAuthService.getInstance();