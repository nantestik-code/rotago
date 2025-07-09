import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';

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

  console.log('🔄 useSubscription - Estado atual:', {
    user: user ? { id: user.id, email: user.email } : null,
    subscription,
    plansCount: plans.length,
    loading,
    error
  });

  useEffect(() => {
    // Buscar planos sempre (dados públicos)
    fetchPlans();
    
    // Buscar assinatura do usuário apenas se estiver logado
    if (user) {
      fetchUserSubscription();
    }
  }, [user]);

  // Timeout para forçar fim do loading se necessário
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('⏰ Timeout: forçando loading = false e usando dados mock');
        setLoading(false);
        setError('Timeout - usando dados de exemplo');
        const mockPlans = getMockPlans();
        setPlans(mockPlans);
      }
    }, 5000); // 5 segundos

    return () => clearTimeout(timeout);
  }, [loading]);

  // Fallback rápido para dados mock
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (loading && plans.length === 0) {
        console.log('🔄 Ativando modo mock por timeout rápido');
        const mockPlans = getMockPlans();
        setPlans(mockPlans);
        setLoading(false);
        setError('Usando dados de exemplo - problemas de conectividade');
      }
    }, 3000); // 3 segundos

    return () => clearTimeout(fallbackTimeout);
  }, [loading, plans.length]);

  // Buscar planos na inicialização (independente de autenticação)
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchUserSubscription = async () => {
    if (!user) {
      console.log('🚫 fetchUserSubscription: Usuário não logado');
      return;
    }

    console.log('🔍 fetchUserSubscription: Buscando assinatura para usuário:', user.id);

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      console.log('📊 fetchUserSubscription - Resposta:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ fetchUserSubscription - Erro:', error);
        throw error;
      }

      if (data) {
        console.log('✅ fetchUserSubscription: Assinatura encontrada:', data);
      } else {
        console.log('🆕 fetchUserSubscription: Nenhuma assinatura encontrada');
      }

      setSubscription(data);
    } catch (err) {
      console.error('❌ Erro ao buscar assinatura:', err);
      setError('Erro ao carregar assinatura');
    }
  };

  const fetchPlans = async () => {
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

  const createTrialSubscription = async () => {
    if (!user) {
      console.log('❌ createTrialSubscription: Usuário não autenticado');
      throw new Error('Usuário não autenticado');
    }

    console.log('🎁 createTrialSubscription: Criando trial para usuário:', user.id);

    try {
      // Usar o primeiro plano disponível para o trial
      const trialPlanId = plans.length > 0 ? plans[0].id : 'monthly';
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: trialPlanId,
          status: 'trial',
          is_active: true,
          is_trial: true,
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar trial:', error);
        throw error;
      }

      console.log('✅ Trial criado com sucesso:', data);
      await fetchUserSubscription();
      return data;
    } catch (err) {
      console.error('❌ Erro ao criar trial:', err);
      throw err;
    }
  };

  const createSubscription = async (planId: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'pending_payment',
          is_active: true,
          is_trial: true,
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
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
    createTrialSubscription,
    updateSubscriptionStatus,
    cancelSubscription,
    refetch: fetchUserSubscription,
  };
};
