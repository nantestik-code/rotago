import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { smartToast } from '@/hooks/use-smart-toast';

export type RouteAction = 
  | 'create'           // Criação de rota
  | 'optimize'         // Otimização de rota
  | 'update'           // Atualização de rota
  | 'complete'         // Conclusão de rota
  | 'delete'           // Exclusão de rota
  | 'status_change'    // Mudança de status de entrega
  | 'login'            // Login no sistema
  | 'logout'           // Logout do sistema
  | 'signup';          // Cadastro no sistema

export interface RouteHistoryDetails {
  message?: string;
  route_name?: string;
  delivery_count?: number;
  delivery_id?: string;
  previous_status?: string;
  new_status?: string;
  distance?: number;
  duration?: number;
  [key: string]: any;
}

export interface PendingAction {
  user_id: string;
  route_id: string | null;
  action: RouteAction;
  details: RouteHistoryDetails | null;
  created_at: string;
  synced: boolean;
  error?: string;
}

export const useRouteHistory = () => {
  const { user } = useAuth();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Carregar ações pendentes do localStorage
  useEffect(() => {
    try {
      const pendingActionsString = localStorage.getItem('pendingRouteActions');
      if (pendingActionsString) {
        const actions = JSON.parse(pendingActionsString);
        if (user) {
          // Filtrar apenas ações deste usuário
          const userActions = actions.filter((action: any) => action.user_id === user.id);
          setPendingActions(userActions);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar ações pendentes:', err);
    }
  }, [user]);

  /**
   * Registra uma ação no histórico de rotas
   */
  const logRouteAction = useCallback(async (
    action: RouteAction,
    routeId: string | null,
    details: RouteHistoryDetails = {}
  ) => {
    if (!user) {
      console.warn('Tentativa de registrar ação sem usuário autenticado');
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log(`Registrando ação: ${action}`, details);
      
      const historyItem = {
        user_id: user.id,
        route_id: routeId,
        action,
        details,
        created_at: new Date().toISOString()
      };
      
      // Tentar inserir no Supabase
      let result;
      try {
        result = await supabase
          .from('route_history')
          .insert(historyItem);
      } catch (error) {
        console.error('Erro ao inserir no Supabase:', error);
        result = { error };
      }
      
      if (result?.error) {
        console.warn('Erro ao registrar ação no servidor, salvando localmente:', result.error);
        
        // Salvar ação localmente para sincronização posterior
        const pendingActionsString = localStorage.getItem('pendingRouteActions');
        const existingPendingActions = pendingActionsString ? JSON.parse(pendingActionsString) : [];
        
        const newPendingAction = {
          ...historyItem,
          synced: false,
          error: result.error.message
        };
        
        existingPendingActions.push(newPendingAction);
        
        // Atualizar localStorage
        localStorage.setItem('pendingRouteActions', JSON.stringify(existingPendingActions));
        
        // Atualizar estado do React
        setPendingActions(prev => [...prev, newPendingAction]);
        
        setError('Erro de conexão. Ação salva localmente para sincronização posterior.');
        setIsLoading(false);
        
        return { 
          success: true, 
          message: 'Ação salva localmente para sincronização posterior',
          localOnly: true 
        };
      }
      
      setIsLoading(false);
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao registrar ação:', error);
      setError(error.message || 'Erro desconhecido ao registrar ação');
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  }, [user]);

  /**
   * Busca o histórico de rotas do usuário atual
   */
  const getUserRouteHistory = useCallback(async (limit = 50, page = 0) => {
    if (!user) {
      console.warn('Tentativa de buscar histórico sem usuário autenticado');
      return { data: null, error: 'Usuário não autenticado' };
    }

    try {
      console.log(`Buscando histórico do usuário ${user.id}, página ${page}, limite ${limit}`);
      setIsLoading(true);
      
      // Implementar retry para lidar com falhas de conexão
      let retries = 0;
      const maxRetries = 3;
      let data = null;
      let error = null;
      
      while (retries < maxRetries && !data) {
        try {
          const result = await supabase
            .from('route_history')
            .select(`
              *,
              routes:route_id (
                id,
                name,
                status,
                total_distance,
                estimated_duration
              )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(page * limit, (page + 1) * limit - 1);
            
          data = result.data;
          error = result.error;
          
          if (error) {
            console.error(`Tentativa ${retries + 1} falhou:`, error);
            retries++;
            
            if (retries < maxRetries) {
              console.log(`Aguardando antes da tentativa ${retries + 1}...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }
          }
        } catch (connectionError) {
          console.error(`Erro de conexão na tentativa ${retries + 1}:`, connectionError);
          retries++;
          
          if (retries < maxRetries) {
            console.log(`Aguardando antes da tentativa ${retries + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          } else {
            error = connectionError;
          }
        }
      }
      
      setIsLoading(false);
      
      if (error) {
        setError('Erro ao carregar histórico. Verifique sua conexão.');
        console.error('Todas as tentativas falharam:', error);
        smartToast({
          title: 'Erro ao carregar histórico',
          description: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
          variant: 'destructive'
        });
        return { data: null, error: error.message || 'Erro ao conectar com o servidor' };
      }

      if (!data || data.length === 0) {
        console.log('Nenhum registro de histórico encontrado');
      } else {
        console.log(`Histórico carregado com sucesso: ${data.length} registros`);
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Erro não tratado ao buscar histórico do usuário:', error);
      setIsLoading(false);
      setError('Erro ao carregar histórico.');
      smartToast({
        title: 'Erro ao carregar histórico',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive'
      });
      return { data: null, error: error.message || 'Erro desconhecido' };
    }
  }, [user]);

  /**
   * Busca o histórico de rotas de todos os usuários (apenas para admins)
   */
  const getAllRouteHistory = useCallback(async (limit = 50, page = 0) => {
    if (!user) {
      console.warn('Tentativa de buscar histórico sem usuário autenticado');
      return { data: null, error: 'Usuário não autenticado' };
    }

    try {
      console.log(`Buscando histórico de todos os usuários, página ${page}, limite ${limit}`);
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('route_history')
        .select(`
          *,
          routes:route_id (
            id,
            name,
            status,
            total_distance,
            estimated_duration
          ),
          profiles:user_id (
            id,
            full_name,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);
      
      setIsLoading(false);
      
      if (error) {
        console.error('Erro ao buscar histórico de todos os usuários:', error);
        setError('Erro ao carregar histórico de todos os usuários.');
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Erro ao buscar histórico de todos os usuários:', error);
      setIsLoading(false);
      setError('Erro ao carregar histórico de todos os usuários.');
      return { data: null, error: error.message };
    }
  }, [user]);

  /**
   * Busca o histórico de uma rota específica
   */
  const getRouteHistory = useCallback(async (routeId: string, limit = 50, page = 0) => {
    if (!user) return { data: null, error: 'Usuário não autenticado' };

    try {
      console.log(`Buscando histórico da rota ${routeId}, página ${page}, limite ${limit}`);
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('route_history')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            role
          )
        `)
        .eq('route_id', routeId)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);
      
      setIsLoading(false);

      if (error) {
        console.error('Erro ao buscar histórico da rota:', error);
        setError('Erro ao carregar histórico da rota.');
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Erro ao buscar histórico da rota:', error);
      setIsLoading(false);
      setError('Erro ao carregar histórico da rota.');
      return { data: null, error: error.message };
    }
  }, [user]);

  // Função para sincronizar ações pendentes
  const syncPendingActions = useCallback(async () => {
    if (!user || !supabase) {
      return { success: false, error: 'Usuário não autenticado ou Supabase não disponível' };
    }
    
    try {
      setIsLoading(true);
      const pendingActionsString = localStorage.getItem('pendingRouteActions');
      if (!pendingActionsString) {
        setIsLoading(false);
        return { success: true, message: 'Nenhuma ação pendente para sincronizar' };
      }
      
      const pendingActions = JSON.parse(pendingActionsString);
      if (!pendingActions || pendingActions.length === 0) {
        setIsLoading(false);
        return { success: true, message: 'Nenhuma ação pendente para sincronizar' };
      }
      
      console.log(`Tentando sincronizar ${pendingActions.length} ações pendentes`);
      
      // Filtrar apenas ações deste usuário
      const userActions = pendingActions.filter(action => action.user_id === user.id);
      if (userActions.length === 0) {
        setIsLoading(false);
        return { success: true, message: 'Nenhuma ação pendente para este usuário' };
      }
      
      // Processar em lotes para evitar problemas
      const batchSize = 5;
      let syncedCount = 0;
      
      for (let i = 0; i < userActions.length; i += batchSize) {
        const batch = userActions.slice(i, i + batchSize);
        const actionsToInsert = batch.map(action => ({
          user_id: action.user_id,
          route_id: action.route_id,
          action: action.action,
          details: action.details,
          created_at: action.created_at
        }));
        
        const { error } = await supabase
          .from('route_history')
          .insert(actionsToInsert);
          
        if (error) {
          console.error('Erro ao sincronizar lote de ações:', error);
          continue;
        }
        
        syncedCount += batch.length;
      }
      
      if (syncedCount > 0) {
        console.log(`${syncedCount} ações sincronizadas com sucesso`);
        
        // Remover ações sincronizadas
        const remainingActions = pendingActions.filter(action => 
          action.user_id !== user.id || action.synced
        );
        
        localStorage.setItem('pendingRouteActions', JSON.stringify(remainingActions));
        
        // Atualizar estado
        setPendingActions(prev => prev.filter(action => action.user_id !== user.id));
        
        smartToast({
          title: 'Sincronização concluída',
          description: `${syncedCount} ações de rota sincronizadas com sucesso`,
          variant: 'default'
        });
        
        setIsLoading(false);
        return { success: true, message: `${syncedCount} ações sincronizadas com sucesso` };
      }
      
      setIsLoading(false);
      return { success: true, message: 'Nenhuma ação foi sincronizada' };
    } catch (error: any) {
      console.error('Erro ao sincronizar ações pendentes:', error);
      setIsLoading(false);
      setError('Erro ao sincronizar ações pendentes.');
      return { success: false, error: error.message || 'Erro desconhecido' };
    }
  }, [user]);
  
  // Tentar sincronizar ações pendentes quando o usuário estiver autenticado
  useEffect(() => {
    if (user) {
      // Pequeno atraso para garantir que a autenticação esteja completa
      const timer = setTimeout(() => {
        syncPendingActions();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [user, syncPendingActions]);

  return {
    logRouteAction,
    getUserRouteHistory,
    getAllRouteHistory,
    getRouteHistory,
    syncPendingActions,
    pendingActions,
    isLoading,
    error
  };
};
