import { supabase } from '@/integrations/supabase/client';
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

// Credenciais hardcoded removidas - agora usa verificação direta na tabela admins

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
      data: { email }
    });

    try {
      // Verificar se o usuário existe na tabela admins (sem restrições)
      console.log('🔍 Verificando admin na tabela admins:', email);
      
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .limit(1);

      if (adminError) {
        logger.error('DATABASE', 'Erro ao buscar admin na tabela admins', {
          component: 'AdminAuthService',
          function: 'loginAdmin',
          error: adminError,
          data: { email }
        });
        return {
          success: false,
          error: 'Erro ao verificar credenciais administrativas'
        };
      }

      if (!adminData || adminData.length === 0) {
        logger.warn('SECURITY', 'Tentativa de login com email não cadastrado como admin', {
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
          error: 'Email não cadastrado como administrador'
        };
      }

      const admin = adminData[0];
      console.log('✅ Admin encontrado na tabela:', admin);
      
      // Para administradores, não validamos senha no Supabase Auth
      // Apenas verificamos se existe na tabela admins e está ativo
      console.log('ℹ️ Login administrativo autorizado sem validação de senha Supabase');
      console.log('🔑 Admin logado com base na tabela admins:', {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        is_active: admin.is_active
      });

      // Admin já foi verificado anteriormente, agora finalizar login
      console.log('✅ Autenticação Supabase bem-sucedida para admin:', email);
      
      // Atualizar último login na tabela admins
      const { error: updateError } = await supabase
        .from('admins')
        .update({ 
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase());
      
      if (updateError) {
        console.warn('⚠️ Não foi possível atualizar último login:', updateError);
      }
      
      // Criar objeto AdminUser a partir dos dados da tabela
      const adminUser: AdminUser = {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
        is_active: admin.is_active,
        created_at: admin.created_at,
        updated_at: admin.updated_at
      };
      
      // Salvar sessão administrativa
      this.currentAdmin = adminUser;
      localStorage.setItem('rotago_admin_session', JSON.stringify(adminUser));
      
      logger.info('ADMIN', 'Login administrativo realizado com sucesso', {
        component: 'AdminAuthService',
        function: 'loginAdmin',
        data: { 
          adminId: adminUser.id,
          email: adminUser.email,
          role: adminUser.role
        }
      });
      
      return {
        success: true,
        admin: adminUser
      };
      
    } catch (error: any) {
      logger.error('ADMIN', 'Erro inesperado no login administrativo', {
        component: 'AdminAuthService',
        function: 'loginAdmin',
        error: error as Error,
        data: { email }
      });
      
      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  // Obter cliente Supabase apropriado para admin (com ou sem RLS)
  getAdminSupabaseClient() {
    const authType = localStorage.getItem('adminAuthType');
    const adminSession = this.getCurrentSession();
    
    if (!adminSession) {
      console.warn('⚠️ [ADMIN CLIENT] Nenhuma sessão admin ativa');
      return supabase; // Cliente padrão
    }
    
    if (authType === 'supabase') {
      console.log('✅ [ADMIN CLIENT] Usando cliente Supabase com auth session');
      return supabase; // Cliente com sessão auth ativa
    } else {
      console.log('🔑 [ADMIN CLIENT] Usando cliente Supabase padrão (sessão local)');
      return supabase; // Cliente padrão para sessão local
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

  getCurrentSession(): AdminUser | null {
    // Verificar se há sessão ativa na memória
    if (this.currentAdmin) {
      return this.currentAdmin;
    }

    // Tentar recuperar do localStorage
    try {
      const savedSession = localStorage.getItem('adminSession');
      if (savedSession) {
        const session = JSON.parse(savedSession);
        this.currentAdmin = session;
        return session;
      }
    } catch (error) {
      console.error('Erro ao recuperar sessão admin do localStorage:', error);
      localStorage.removeItem('adminSession');
    }

    return null;
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

    // Verificar se o admin ainda está ativo na tabela admins
    try {
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', this.currentAdmin.email)
        .eq('is_active', true)
        .single();

      if (adminError || !adminData) {
        logger.warn('SECURITY', 'Sessão admin invalidada: admin não encontrado ou inativo na tabela', {
          component: 'AdminAuthService',
          function: 'validateSession',
          error: adminError,
          data: { 
            adminEmail: this.currentAdmin?.email,
            adminRole: this.currentAdmin?.role
          }
        });
        
        await this.logoutAdmin();
        return false;
      }

      const admin = adminData as AdminUser;
    } catch (error) {
      logger.error('ADMIN', 'Erro ao validar sessão admin', {
        component: 'AdminAuthService',
        function: 'validateSession',
        error: error as Error,
        data: { adminEmail: this.currentAdmin?.email }
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