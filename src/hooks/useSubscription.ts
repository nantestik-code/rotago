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



  // useEffect separado para planos (executa apenas uma vez)
  useEffect(() => {
    if (plans.length === 0) {
      fetchPlans();
    }
  }, []);

  // useEffect para assinatura do usuário
  useEffect(() => {
    if (user && !subscription) {
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
      updateSubscriptionStatus('expired');
    }

    // Atualiza status para 'expired' se pagamento pendente há mais de 3 dias
    if (
      subscription.status === 'pending_payment' &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    ) {
      updateSubscriptionStatus('expired');
    }
  }, [subscription?.id, subscription?.status]);

  // Timeout apenas para planos se necessário (sem forçar fim do loading)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && plans.length === 0) {
        console.warn('Timeout para planos - usando mock');
        setPlans(getMockPlans());
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

    try {
      // 🔍 BUSCA PRINCIPAL: Buscar assinatura ativa (trial ou paga)
      let { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar assinatura:', error);
        setSubscription(null);
        setLoading(false);
        return;
      }

      // Se encontrou uma assinatura, validar se ainda está válida
      if (data) {
        const now = new Date();
        let isValid = false;

        // Verificar se é trial ativo
        if (data.is_trial && data.trial_ends_at) {
          isValid = new Date(data.trial_ends_at) > now;
        }
        
        // Verificar se é assinatura paga ativa
        if (data.status === 'active' && !data.is_trial) {
          // Para assinaturas pagas, verificar se não expirou
          if (data.current_period_end) {
            isValid = new Date(data.current_period_end) > now;
          } else {
            // Se não tem data de fim, considerar válida (assinatura manual)
            isValid = true;
          }
        }

        // Se a assinatura não é mais válida, desativá-la
        if (!isValid && (data.status !== 'expired' || data.is_active)) {
          try {
            await supabase
              .from('user_subscriptions')
              .update({
                status: 'expired',
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', data.id);
            
            // Buscar novamente após atualização
            const { data: updatedData } = await supabase
              .from('user_subscriptions')
              .select(`
                *,
                plan:subscription_plans(*)
              `)
              .eq('user_id', user.id)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .maybeSingle();
              
            setSubscription(updatedData);
          } catch (updateError) {
            console.error('Erro ao atualizar status da assinatura:', updateError);
            setSubscription(data); // Manter dados originais em caso de erro
          }
        } else {
          setSubscription(data);
        }
      } else {
        setSubscription(null);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar assinatura:', err);
      setSubscription(null);
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    // Não buscar se já temos planos carregados
    if (plans.length > 0) {
      return;
    }
    
    try {
      // Buscar planos sem autenticação (dados públicos)
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        console.error('Erro ao buscar planos:', error);
        // Se der erro 401, criar planos mock para desenvolvimento
        if (error.code === '401' || error.message?.includes('401')) {
          const mockPlans = getMockPlans();
          setPlans(mockPlans);
        } else {
          throw error;
        }
      } else {
        setPlans(data || []);
      }
    } catch (err) {
      console.error('Erro crítico ao buscar planos:', err);
      // Fallback para planos mock
      const mockPlans = getMockPlans();
      setPlans(mockPlans);
      setError('Usando dados de exemplo - configure o Supabase RLS');
    } finally {
      // Sempre definir loading como false após carregar planos
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
    
    const now = new Date();
    
    // Verificar trial ativo
    if (subscription.is_trial && subscription.trial_ends_at) {
      return new Date(subscription.trial_ends_at) > now;
    }
    
    // Verificar assinatura paga ativa
    if (subscription.status === 'active' && subscription.is_active) {
      // Se não tem data de fim, considerar válida (ativação manual)
      if (!subscription.current_period_end) return true;
      
      // Verificar se não expirou
      return new Date(subscription.current_period_end) > now;
    }
    
    return false;
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
