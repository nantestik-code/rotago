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
  const [plansLoading, setPlansLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  // useEffect separado para planos (executa apenas uma vez)
  useEffect(() => {
    if (plans.length === 0) {
      fetchPlans();
    }
  }, []);

  // useEffect para assinatura do usuário
  useEffect(() => {
    if (user) {
      fetchUserSubscription();
      return;
    }

    setSubscription(null);
    setSubscriptionLoading(false);
  }, [user?.id]);

  // useEffect para verificar expiração (executa apenas quando subscription muda)
  // FIX #7: adicionar .catch() para evitar unhandled promise rejection quando offline
  useEffect(() => {
    if (!subscription) return;

    const now = new Date(currentTime);

    // Atualiza status para 'expired' se trial expirou
    if (
      subscription.is_trial &&
      subscription.trial_ends_at &&
      new Date(subscription.trial_ends_at) < now &&
      subscription.status !== 'expired'
    ) {
      updateSubscriptionStatus('expired').catch(e =>
        console.error('Falha ao expirar trial (offline?):', e)
      );
    }

    // Atualiza status para 'expired' se pagamento pendente e período expirou
    if (
      subscription.status === 'pending_payment' &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) < now
    ) {
      updateSubscriptionStatus('expired').catch(e =>
        console.error('Falha ao expirar pending_payment (offline?):', e)
      );
    }

    // Atualiza status para 'expired' se assinatura paga e período expirou
    if (
      subscription.status === 'active' &&
      subscription.is_active &&
      !subscription.is_trial &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) < now
    ) {
      updateSubscriptionStatus('expired').catch(e =>
        console.error('Falha ao expirar assinatura paga (offline?):', e)
      );
    }
  }, [currentTime, subscription?.id, subscription?.status, subscription?.trial_ends_at, subscription?.current_period_end]);

  // Timeout apenas para planos se necessário (sem forçar fim do loading)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (plansLoading && plans.length === 0) {
        console.warn('Timeout para planos - usando mock');
        setPlans(getMockPlans());
        setPlansLoading(false);
      }
    }, 15000); // 15 segundos apenas para planos

    return () => clearTimeout(timeout);
  }, [plansLoading, plans.length]);

  // Removido fallback rápido para dados mock - agora usando trial automático do banco
  // FIX #3: segundo useEffect de fetchPlans() removido — era duplicado do de linha 50
  // e causava race condition (ambos disparavam antes do setState atualizar plans.length)

  const fetchUserSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setSubscriptionLoading(false);
      return;
    }

    setSubscriptionLoading(true);

    try {
      const { data: rows, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar assinatura:', error);
        setSubscription(null);
        return;
      }

      const now = Date.now();
      const list = rows ?? [];
      const pick = list.find((row) => {
        if (row.is_trial && row.trial_ends_at && new Date(row.trial_ends_at).getTime() > now) return true;
        if (row.status === 'active' && row.is_active) {
          if (!row.current_period_end) return true;
          return new Date(row.current_period_end).getTime() > now;
        }
        return false;
      }) ?? list.find((row) => {
        if (row.status !== 'pending_payment') return false;
        const created = new Date(row.created_at || row.updated_at || 0).getTime();
        return now - created < 15 * 60 * 1000;
      }) ?? null;

      setSubscription(pick);
    } catch (err) {
      console.error('Erro ao buscar assinatura:', err);
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const fetchPlans = async () => {
    // Não buscar se já temos planos carregados
    if (plans.length > 0) {
      setPlansLoading(false);
      return;
    }

    setPlansLoading(true);
    
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
      setPlansLoading(false);
    }
  };

  const isTrialActive = () => {
    if (!subscription?.is_trial || !subscription?.trial_ends_at) return false;
    return new Date(subscription.trial_ends_at).getTime() > currentTime;
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.is_trial || !subscription?.trial_ends_at) return 0;
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date(currentTime);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getTrialTimeRemainingMs = () => {
    if (!subscription?.is_trial || !subscription?.trial_ends_at) return 0;
    return Math.max(0, new Date(subscription.trial_ends_at).getTime() - currentTime);
  };

  const getTrialTimeRemainingLabel = () => {
    const remainingMs = getTrialTimeRemainingMs();
    if (remainingMs <= 0) return 'expirado';

    const totalMinutes = Math.ceil(remainingMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];

    if (days > 0) parts.push(`${days}d`);
    if (days > 0 || hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}min`);

    return parts.join(' ');
  };

  const isSubscriptionActive = () => {
    if (!subscription) return false;

    const now = new Date(currentTime);

    if (subscription.is_trial) {
      if (subscription.trial_ends_at) {
        return new Date(subscription.trial_ends_at) > now;
      }
      return Boolean(subscription.is_active);
    }

    if ((subscription.status === 'active' || subscription.status === 'trial') && subscription.is_active) {
      if (subscription.status === 'trial' && subscription.trial_ends_at) {
        return new Date(subscription.trial_ends_at) > now;
      }
      if (!subscription.current_period_end) return true;
      return new Date(subscription.current_period_end) > now;
    }

    return false;
  };

  const isPendingConfirmation = () => {
    if (!subscription || isSubscriptionActive()) return false;
    if (subscription.status !== 'pending_payment') return false;
    const created = new Date(subscription.created_at || subscription.updated_at || 0).getTime();
    return Date.now() - created < 15 * 60 * 1000;
  };

  const canAccessFeatures = () => {
    return isSubscriptionActive();
  };

  const getCurrentPlan = () => {
    if (!subscription) return null;

    return subscription.plan || plans.find(plan => plan.id === subscription.plan_id) || null;
  };



  /**
   * Ativa o periodo de teste.
   *
   * A criacao acontece na funcao `activate_trial` do banco. Antes o navegador
   * inseria a linha direto, escolhendo a propria data de expiracao, e a regra
   * de "um trial por usuario" era so no cliente. Agora o servidor decide.
   */
  const activateTrial = async (planId?: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    trackSubscriptionCreation('USESUBSCRIPTION.TS - activateTrial', {
      user_id: user.id,
      plan_id: planId,
    });

    const { data, error } = await supabase.rpc('activate_trial', {
      target_plan_id: planId ?? null,
    });

    if (error) throw error;

    await fetchUserSubscription();
    return data;
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
      const isActiveStatus = status === 'active' || status === 'trialing';

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status,
          is_active: isActiveStatus,
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
        id: 'mensal',
        name: 'Mensal',
        description: 'Plano mensal básico',
        price: '29.90',
        frequency: 1,
        frequency_type: 'month',
        discount: 0,
        total: '29.90',
        is_active: true,
        mercadopago_plan_id: '2c9380849788f4e40197a261c7eb08c9'
      },
      {
        id: 'trimestral',
        name: 'Trimestral',
        description: 'Plano trimestral com desconto',
        price: '24.90',
        frequency: 3,
        frequency_type: 'month',
        discount: 15,
        total: '74.70',
        is_active: true,
        mercadopago_plan_id: '2c9380849788f4e40197a2f0374c090d'
      },
      {
        id: 'semestral',
        name: 'Semestral',
        description: 'Plano semestral com maior desconto',
        price: '22.90',
        frequency: 6,
        frequency_type: 'month',
        discount: 25,
        total: '137.40',
        is_active: true,
        mercadopago_plan_id: '2c9380849788f4e40197a2f29a4c090e'
      },
      {
        id: 'anual',
        name: 'Anual',
        description: 'Plano anual com máximo desconto',
        price: '19.90',
        frequency: 12,
        frequency_type: 'month',
        discount: 35,
        total: '238.80',
        is_active: true,
        mercadopago_plan_id: '2c938084979341770197a2f36199055c'
      }
    ];
  };

  const loading = plansLoading || subscriptionLoading;

  return {
    subscription,
    plans,
    loading,
    plansLoading,
    subscriptionLoading,
    error,
    isTrialActive: isTrialActive(),
    trialDaysRemaining: getTrialDaysRemaining(),
    trialTimeRemainingMs: getTrialTimeRemainingMs(),
    trialTimeRemainingLabel: getTrialTimeRemainingLabel(),
    isSubscriptionActive: isSubscriptionActive(),
    isPendingConfirmation: isPendingConfirmation(),
    canAccessFeatures: canAccessFeatures(),
    currentPlan: getCurrentPlan(),
    createSubscription,
    activateTrial,
    updateSubscriptionStatus,
    cancelSubscription,
    refetch: fetchUserSubscription,
  };
};
