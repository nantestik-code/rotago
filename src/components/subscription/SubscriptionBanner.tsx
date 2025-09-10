import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Gift,
  ArrowRight
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

const SubscriptionBanner = () => {
  const { user } = useAuth();
  const {
    subscription,
    loading,
    isTrialActive,
    trialDaysRemaining,
    isSubscriptionActive,
    currentPlan,
    error,

  } = useSubscription();

  const navigate = useNavigate();
  const [pendingPayment, setPendingPayment] = useState(false);

  // Verificar pagamento pendente no localStorage
  useEffect(() => {
    const pending = localStorage.getItem('pending_payment');
    const pendingPlanId = localStorage.getItem('pending_plan_id');
    if (pending && pendingPlanId) {
      console.log('💳 Pagamento pendente detectado:', { pending, pendingPlanId });
      setPendingPayment(true);
    }
  }, []);

  const handleStartTrial = () => {
    console.log('🎁 Redirecionando para página de assinatura...');
    navigate('/subscription');
  };

  // Logs detalhados para debug
  console.log('🏷️ SubscriptionBanner - Estado atual:', {
    loading,
    subscription,
    isTrialActive,
    trialDaysRemaining,
    isSubscriptionActive,
    currentPlan,
    error
  });

  // Se há pagamento pendente, mostrar banner específico
  if (pendingPayment) {
    console.log('💳 SubscriptionBanner: Mostrando banner de pagamento pendente');
    return (
      <Alert className="border-orange-200 bg-orange-50 mb-4">
        <Clock className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-orange-800">
              <strong>Pagamento Pendente!</strong> Verificando status do seu pagamento...
            </span>
            <Badge className="bg-orange-100 text-orange-800 ml-2">
              Processando
            </Badge>
          </div>
          <Button 
            size="sm" 
            onClick={() => navigate('/subscription')}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Verificar Status
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Se ainda está carregando mas usuário logado, mostrar banner de carregamento
  if (loading && user) {
    console.log('⏳ SubscriptionBanner: Carregando com usuário logado...');
    return (
      <Alert className="border-blue-200 bg-blue-50 mb-4">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-800">
              Carregando sua assinatura...
            </span>
            <Badge className="bg-blue-100 text-blue-800 ml-2">
              Aguarde
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Se ainda está carregando e sem usuário, não mostrar nada
  if (loading) {
    console.log('⏳ SubscriptionBanner: Carregando sem usuário...');
    return null;
  }

  // Se há erro, verificar se o usuário tem trial ativo no banco de dados
  // e mostrar banner de trial em vez do erro
  if (error) {
    console.log('❌ SubscriptionBanner: Erro detectado, verificando trial:', error);
    if (isTrialActive && trialDaysRemaining > 0) {
      // Trial realmente ativo, mostrar banner de trial
      return (
        <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 mb-4 p-4">
          <div className="flex items-start gap-3 w-full">
            <Gift className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-800 font-semibold text-sm">
                      Período gratuito ativo!
                    </span>
                    <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1">
                      Grátis
                    </Badge>
                  </div>
                  <p className="text-blue-700 text-sm leading-relaxed">
                    {trialDaysRemaining} dias restantes para aproveitar todos os recursos premium.
                  </p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/subscription')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium whitespace-nowrap"
                >
                  Ver Planos
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      );
    }
    // Caso contrário, mostrar banner de bloqueio/acesso negado
    return (
      <Alert className="border-red-200 bg-red-50 mb-4">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-800">
              <strong>Acesso bloqueado!</strong> Sua assinatura expirou ou não foi encontrada. Assine um plano para continuar usando.
            </span>
            <Badge className="bg-red-100 text-red-800 ml-2">
              Bloqueado
            </Badge>
          </div>
          <Button 
            size="sm" 
            onClick={() => navigate('/subscription')}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Ver Planos
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Se não há assinatura, mostrar banner para criar trial
  if (!subscription) {
    console.log('🆕 SubscriptionBanner: Usuário sem assinatura - mostrando banner de trial');
    return (
      <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 mb-4 p-4">
        <div className="flex items-start gap-3 w-full">
          <Gift className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-800 font-semibold text-sm">
                    Período gratuito ativo!
                  </span>
                  <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1">
                    7 dias restantes para aproveitar todos os recursos premium.
                  </Badge>
                </div>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Comece seu período gratuito! 7 dias grátis para testar todos os recursos premium.
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={handleStartTrial}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium whitespace-nowrap"
              >
                Escolher Plano
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  // Banner para trial ativo
  if (isTrialActive && trialDaysRemaining > 0) {
    return (
      <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 mb-4 p-4">
        <div className="flex items-start gap-3 w-full">
          <Gift className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-800 font-semibold text-sm">
                    Período gratuito ativo!
                  </span>
                  <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1">
                    Grátis
                  </Badge>
                </div>
                <p className="text-blue-700 text-sm leading-relaxed">
                  {trialDaysRemaining} dias restantes para aproveitar todos os recursos premium.
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => navigate('/subscription')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium whitespace-nowrap"
              >
                Escolher Plano
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  // Banner para trial expirado
  if (isTrialActive && trialDaysRemaining <= 0) {
    return (
      <Alert className="border-red-200 bg-red-50 mb-4">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-800">
              <strong>Período gratuito expirado!</strong> Escolha um plano para continuar usando todos os recursos.
            </span>
            <Badge className="bg-red-100 text-red-800 ml-2">
              Expirado
            </Badge>
          </div>
          <Button 
            size="sm" 
            onClick={() => navigate('/subscription')}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Assinar Agora
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Banner para assinatura ativa
  if (isSubscriptionActive && currentPlan) {
    return (
      <Alert className="border-green-200 bg-green-50 mb-4">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-800">
              <strong>Plano {currentPlan.name} ativo!</strong> Aproveite todos os recursos premium.
            </span>
            <Badge className="bg-green-100 text-green-800 ml-2">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate('/subscription')}
            className="border-green-200 text-green-700 hover:bg-green-100"
          >
            Gerenciar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Banner para pagamento pendente
  if (subscription && subscription.status === 'pending_payment') {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 mb-4">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-yellow-800">
              <strong>Pagamento pendente!</strong> Complete seu pagamento para ativar o plano premium.
            </span>
            <Badge className="bg-yellow-100 text-yellow-800 ml-2">
              Pendente
            </Badge>
          </div>
          <Button 
            size="sm" 
            onClick={() => navigate('/subscription')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Finalizar Pagamento
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default SubscriptionBanner;
