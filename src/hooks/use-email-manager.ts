import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string;
  email_type: 'welcome' | 'admin_notification' | 'password_reset' | 'custom';
  status: 'sent' | 'failed' | 'pending' | 'bounced' | 'delivered' | 'opened' | 'clicked';
  message_id?: string;
  error_message?: string;
  template_used: string;
  sent_by: string;
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounce_reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EmailStatistics {
  total_sent: number;
  total_failed: number;
  total_delivered: number;
  total_opened: number;
  by_type: Record<string, number>;
  recent_activity: EmailLog[];
}

export interface SendEmailRequest {
  to: string;
  name: string;
  template: 'welcome' | 'admin_notification' | 'password_reset';
  data?: Record<string, any>;
  from?: string;
  subject?: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export function useEmailManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState<EmailStatistics | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Função para enviar email
  const sendEmail = useCallback(async (emailData: SendEmailRequest): Promise<SendEmailResponse> => {
    setIsLoading(true);
    
    try {
      // Validações básicas
      if (!emailData.to || !emailData.name || !emailData.template) {
        throw new Error('Campos obrigatórios: destinatário, nome e template');
      }

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailData.to)) {
        throw new Error('Formato de email inválido');
      }

      // Obter token de autenticação
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Usuário não autenticado');
      }

      // Chamar Edge Function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao enviar email');
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha no envio do email');
      }

      toast.success('Email enviado com sucesso!');
      
      // Recarregar estatísticas e logs após envio
      await Promise.all([
        loadStatistics(),
        loadEmailLogs()
      ]);

      return data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao enviar email: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Função para carregar estatísticas
  const loadStatistics = useCallback(async (startDate?: string, endDate?: string) => {
    setIsLoadingStats(true);
    
    try {
      const { data, error } = await supabase.rpc('get_email_statistics', {
        start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: endDate || new Date().toISOString()
      });

      if (error) {
        throw new Error(error.message);
      }

      setStatistics(data);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar estatísticas';
      toast.error(errorMessage);
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Função para carregar logs de email
  const loadEmailLogs = useCallback(async (filters?: {
    email_type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    setIsLoadingLogs(true);
    
    try {
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false });

      // Aplicar filtros
      if (filters?.email_type && filters.email_type !== 'all') {
        query = query.eq('email_type', filters.email_type);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        query = query.or(`recipient_email.ilike.%${filters.search}%,recipient_name.ilike.%${filters.search}%`);
      }

      // Paginação
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      setEmailLogs(data || []);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar logs';
      toast.error(errorMessage);
      console.error('Erro ao carregar logs de email:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  // Função para enviar email de teste
  const sendTestEmail = useCallback(async (template: 'welcome' | 'admin_notification', testEmail?: string) => {
    try {
      // Obter dados do usuário atual para o teste
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Erro ao obter dados do perfil');
      }

      const emailData: SendEmailRequest = {
        to: testEmail || user.email || '',
        name: profile?.full_name || 'Usuário Teste',
        template,
        data: {
          loginUrl: `${window.location.origin}/login`,
          adminPanelUrl: `${window.location.origin}/admin`,
          userCpf: '000.000.000-00',
          registrationDate: new Date().toISOString(),
          subscriptionPlan: 'trial'
        }
      };

      return await sendEmail(emailData);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar email de teste';
      toast.error(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [sendEmail]);

  // Função para reenviar email
  const resendEmail = useCallback(async (logId: string) => {
    try {
      // Buscar dados do log original
      const { data: log, error: logError } = await supabase
        .from('email_logs')
        .select('*')
        .eq('id', logId)
        .single();

      if (logError || !log) {
        throw new Error('Log de email não encontrado');
      }

      // Reenviar com os mesmos dados
      const emailData: SendEmailRequest = {
        to: log.recipient_email,
        name: log.recipient_name,
        template: log.email_type as any,
        data: log.metadata || {}
      };

      return await sendEmail(emailData);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao reenviar email';
      toast.error(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [sendEmail]);

  // Função para obter templates disponíveis
  const getAvailableTemplates = useCallback(() => {
    return [
      {
        id: 'welcome',
        name: 'Boas-vindas',
        description: 'Email de boas-vindas para novos usuários',
        category: 'user'
      },
      {
        id: 'admin_notification',
        name: 'Notificação Admin',
        description: 'Notificação para administradores sobre novos cadastros',
        category: 'admin'
      },
      {
        id: 'password_reset',
        name: 'Redefinir Senha',
        description: 'Email para redefinição de senha',
        category: 'security'
      }
    ];
  }, []);

  return {
    // Estados
    isLoading,
    isLoadingStats,
    isLoadingLogs,
    statistics,
    emailLogs,
    
    // Funções
    sendEmail,
    sendTestEmail,
    resendEmail,
    loadStatistics,
    loadEmailLogs,
    getAvailableTemplates
  };
}

export default useEmailManager;