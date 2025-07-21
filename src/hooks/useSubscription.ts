import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { trackSubscriptionCreation } from '@/utils/subscription-tracker';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  frequency: number;
  frequency_type: string;
  discount: number;
  total: string;
  is_active: boolean;
  mercadopago_plan_id: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  subscription_id: string | null;
  external_id: string | null;
  plan_id: string;
  status: string;
  is_active: boolean;
  is_trial: boolean;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: any;
  email: string | null;
  plan?: SubscriptionPlan;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Log apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 useSubscription:', {
      hasUser: !!user,
      hasSubscription: !!subscription,
      plansCount: plans.length,
      loading
    });
  }

  // useEffect separado para planos (executa apenas uma vez)
  useEffect(() => {
    if (plans.length === 0) {
      console.log('📊 [useSubscription] Carregando planos iniciais...');
      fetchPlans();
    }
  }, []);

  // useEffect para assinatura do usuário
  useEffect(() => {
    // 🔍 LOGS DETALHADOS PARA RASTREAR DUPLICAÇÃO
    const timestamp = new Date().toISOString();
    const stackTrace = new Error().stack;
    
    console.log('🔥 =================================');
    console.log('🔥 [USESUBSCRIPTION.TS] useEffect EXECUTADO');
    console.log('🔥 =================================');
    console.log('🔍 [useSubscription] Timestamp:', timestamp);
    console.log('🔍 [useSubscription] user?.id:', user?.id);
    console.log('🔍 [useSubscription] subscription:', subscription);
    console.log('🔍 [useSubscription] Condição (user && !subscription):', !!(user && !subscription));
    console.log('🔍 [useSubscription] Stack Trace:', stackTrace);
    console.log('🔥 =================================');
    
    if (user && !subscription) {
      console.log('🔍 [useSubscription] Carregando assinatura do usuário...');
      setLoading(true);
      fetchUserSubscription();
    }
  }, [user?.id]);

  // useEffect para verificar expiração (executa apenas quando subscription muda)
  useEffect(() => {
    if (!subscription) return;

    // Atualiza status para 'expired' se trial expirou
    if (
      subscription.is_trial &&
      subscription.trial_ends_at &&
      new Date(subscription.trial_ends_at) < new Date() &&
      subscription.status !== 'expired'
    ) {
      console.log('⏰ [useSubscription] Trial expirado, atualizando status...');
      updateSubscriptionStatus('expired');
    }

    // Atualiza status para 'expired' se pagamento pendente há mais de 3 dias
    if (
      subscription.status === 'pending_payment' &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    ) {
      console.log('💳 [useSubscription] Pagamento pendente expirado, atualizando status...');
      updateSubscriptionStatus('expired');
    }
  }, [subscription?.id, subscription?.status]);

  // Timeout apenas para planos se necessário (sem forçar fim do loading)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && plans.length === 0) {
        console.warn('⏰ [useSubscription] Timeout para planos - usando mock');
        setPlans(getMockPlans());
        console.log('📋 [useSubscription] Planos mock carregados por timeout');
      }
    }, 15000); // 15 segundos apenas para planos

    return () => clearTimeout(timeout);
  }, [loading, plans.length]);

  // Removido fallback rápido para dados mock - agora usando trial automático do banco

  // Buscar planos na inicialização (independente de autenticação)
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchUserSubscription = async () => {
    if (!user) return;

    // 🔍 LOGS DETALHADOS PARA RASTREAR DUPLICAÇÃO
    const timestamp = new Date().toISOString();
    const stackTrace = new Error().stack;
    
    console.log('🔥 =================================');
    console.log('🔥 [USESUBSCRIPTION.TS] fetchUserSubscription CHAMADO');
    console.log('🔥 =================================');
    console.log('🔍 fetchUserSubscription: Timestamp:', timestamp);
    console.log('🔍 fetchUserSubscription: Buscando assinatura para usuário:', user.id);
    console.log('🔍 fetchUserSubscription: Stack Trace:', stackTrace);
    console.log('🔥 =================================');

    try {
      console.log('🔍 Consultando user_subscriptions para user_id:', user.id);
      
      let { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('trial_ends_at', 'is', null) // ✅ PRIORIZAR ASSINATURAS COM TRIAL_ENDS_AT VÁLIDO
        .order('created_at', { ascending: false }) // Pegar a mais recente primeiro
        .maybeSingle(); // Usar maybeSingle() ao invés de single()

      console.log('📊 fetchUserSubscription - Resposta:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ fetchUserSubscription - Erro:', error);
        // Não definir erro para problemas de RLS - deixar subscription null
        // O sistema vai funcionar normalmente com trial/sem assinatura
        setSubscription(null);
        return;
      }

      if (data) {
        console.log('✅ fetchUserSubscription: Assinatura válida encontrada:', data);
        console.log('📊 [fetchUserSubscription] Detalhes da assinatura:', {
          id: data.id,
          status: data.status,
          is_trial: data.is_trial,
          is_active: data.is_active,
          trial_ends_at: data.trial_ends_at,
          created_at: data.created_at
        });
      } else {
        console.log('🆕 fetchUserSubscription: Nenhuma assinatura válida encontrada');
        
        // 🧹 LIMPEZA PRÉVIA: Remover TODAS as assinaturas inválidas ANTES do fallback
        console.log('🧹 Executando limpeza prévia de assinaturas inválidas...');
        try {
          const { error: cleanupError } = await supabase
            .from('user_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('is_trial', true)
            .is('trial_ends_at', null);
            
          if (cleanupError) {
            console.error('⚠️ Erro na limpeza prévia:', cleanupError);
          } else {
            console.log('✅ Limpeza prévia concluída - assinaturas inválidas removidas');
          }
        } catch (cleanupErr) {
          console.error('⚠️ Erro na limpeza prévia:', cleanupErr);
        }
        
        // 🔄 FALLBACK: Buscar novamente após limpeza (deve encontrar apenas assinaturas válidas)
        console.log('🔄 Tentando fallback após limpeza...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            plan:subscription_plans(*)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }) // Mais recente primeiro
          .maybeSingle();
          
        if (fallbackData) {
          console.log('✅ fetchUserSubscription: Assinatura encontrada após limpeza:', fallbackData);
          data = fallbackData;
        } else {
          console.log('🆕 fetchUserSubscription: Nenhuma assinatura encontrada (nem após limpeza)');
        }
      }
      
      setSubscription(data);
      setLoading(false); // Definir loading como false após buscar
    } catch (err) {
      console.error('❌ Erro ao buscar assinatura:', err);
      // Não definir erro - deixar sistema funcionar normalmente
      setSubscription(null);
      setLoading(false); // Definir loading como false em caso de erro
    }
  };

  const fetchPlans = async () => {
    // Não buscar se já temos planos carregados
    if (plans.length > 0) {
      console.log('📋 fetchPlans: Planos já carregados, pulando...');
      return;
    }
    
    console.log('📋 fetchPlans: Iniciando busca de planos...');
    
    try {
      // Buscar planos sem autenticação (dados públicos)
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      console.log('📊 fetchPlans - Resposta do Supabase:', { data, error });

      if (error) {
        console.error('❌ Erro ao buscar planos:', error);
        // Se der erro 401, criar planos mock para desenvolvimento
        if (error.code === '401' || error.message?.includes('401')) {
          console.log('🔄 Usando planos mock devido ao erro de autenticação');
          const mockPlans = getMockPlans();
          console.log('📦 Planos mock criados:', mockPlans);
          setPlans(mockPlans);
        } else {
          throw error;
        }
      } else {
        console.log('✅ Planos carregados do Supabase:', data?.length || 0, 'planos');
        setPlans(data || []);
      }
    } catch (err) {
      console.error('❌ Erro crítico ao buscar planos:', err);
      // Fallback para planos mock
      const mockPlans = getMockPlans();
      console.log('🔄 Fallback: usando planos mock:', mockPlans);
      setPlans(mockPlans);
      setError('Usando dados de exemplo - configure o Supabase RLS');
    } finally {
      // Sempre definir loading como false após carregar planos
      console.log('⏹️ fetchPlans: Finalizando (loading = false)');
      setLoading(false);
    }
  };

  const isTrialActive = () => {
    if (!subscription?.is_trial || !subscription?.trial_ends_at) return false;
    return new Date(subscription.trial_ends_at) > new Date();
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.is_trial || !subscription?.trial_ends_at) return 0;
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isSubscriptionActive = () => {
    if (!subscription) return false;
    if (subscription.is_trial && isTrialActive()) return true;
    return subscription.status === 'active' && subscription.is_active;
  };

  const canAccessFeatures = () => {
    return isSubscriptionActive();
  };

  const getCurrentPlan = () => {
    return subscription?.plan || null;
  };



  const createSubscription = async (planId: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // 🔍 LOGS DETALHADOS PARA RASTREAR DUPLICAÇÃO
      const timestamp = new Date().toISOString();
      const stackTrace = new Error().stack;
      
      console.log('🔥 =================================');
      console.log('🔥 [USESUBSCRIPTION.TS] CRIANDO ASSINATURA PAGA');
      console.log('🔥 =================================');
      console.log('💳 [createSubscription] Timestamp:', timestamp);
      console.log('💳 [createSubscription] Usuário ID:', user.id);
      console.log('💳 [createSubscription] Plano ID:', planId);
      console.log('💳 [createSubscription] Stack Trace:', stackTrace);
      console.log('🔥 =================================');
      
      // 🔍 RASTREAMENTO GLOBAL
      const subscriptionData = {
        user_id: user.id,
        plan_id: planId,
        status: 'pending_payment',
        is_active: false,
        is_trial: false,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias para assinatura paga
      };
      
      trackSubscriptionCreation('USESUBSCRIPTION.TS - createSubscription', subscriptionData);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) throw error;

      await fetchUserSubscription();
      return data;
    } catch (err) {
      console.error('Erro ao criar assinatura:', err);
      throw err;
    }
  };

  const updateSubscriptionStatus = async (status: string, metadata?: any) => {
    if (!subscription) throw new Error('Nenhuma assinatura encontrada');

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status,
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (error) throw error;

      await fetchUserSubscription();
    } catch (err) {
      console.error('Erro ao atualizar status da assinatura:', err);
      throw err;
    }
  };

  const cancelSubscription = async () => {
    if (!subscription) throw new Error('Nenhuma assinatura encontrada');

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: true,
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (error) throw error;

      await fetchUserSubscription();
    } catch (err) {
      console.error('Erro ao cancelar assinatura:', err);
      throw err;
    }
  };

  // Função para fornecer planos mock em caso de erro de autenticação
  const getMockPlans = (): SubscriptionPlan[] => {
    return [
      {
        id: 'monthly',
        name: 'Mensal',
        description: 'Plano mensal básico',
        price: '29.90',
        frequency: 1,
        frequency_type: 'month',
        discount: 0,
        total: '29.90',
        is_active: true,
        mercadopago_plan_id: 'monthly_plan_id'
      },
      {
        id: 'quarterly',
        name: 'Trimestral',
        description: 'Plano trimestral com desconto',
        price: '24.90',
        frequency: 3,
        frequency_type: 'month',
        discount: 15,
        total: '74.70',
        is_active: true,
        mercadopago_plan_id: 'quarterly_plan_id'
      },
      {
        id: 'semiannual',
        name: 'Semestral',
        description: 'Plano semestral com maior desconto',
        price: '22.90',
        frequency: 6,
        frequency_type: 'month',
        discount: 25,
        total: '137.40',
        is_active: true,
        mercadopago_plan_id: 'semiannual_plan_id'
      },
      {
        id: 'annual',
        name: 'Anual',
        description: 'Plano anual com máximo desconto',
        price: '19.90',
        frequency: 12,
        frequency_type: 'month',
        discount: 35,
        total: '238.80',
        is_active: true,
        mercadopago_plan_id: 'annual_plan_id'
      }
    ];
  };

  return {
    subscription,
    plans,
    loading,
    error,
    isTrialActive: isTrialActive(),
    trialDaysRemaining: getTrialDaysRemaining(),
    isSubscriptionActive: isSubscriptionActive(),
    canAccessFeatures: canAccessFeatures(),
    currentPlan: getCurrentPlan(),
    createSubscription,

    updateSubscriptionStatus,
    cancelSubscription,
    refetch: fetchUserSubscription,
  };
};
