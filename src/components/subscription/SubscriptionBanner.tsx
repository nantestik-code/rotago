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
    createTrialSubscription,
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

  const handleStartTrial = async () => {
    try {
      console.log('🎁 Iniciando trial...');
      await createTrialSubscription();
      console.log('✅ Trial iniciado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao iniciar trial:', error);
      // Se der erro, redirecionar para página de assinatura
      navigate('/subscription');
    }
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

  // Se há erro, mostrar banner de erro
  if (error) {
    console.log('❌ SubscriptionBanner: Erro detectado:', error);
    return (
      <Alert className="border-red-200 bg-red-50 mb-4">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-800">
              <strong>Erro ao carregar assinatura!</strong> Usando dados de exemplo.
            </span>
            <Badge className="bg-red-100 text-red-800 ml-2">
              Demo
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
      <Alert className="border-blue-200 bg-blue-50 mb-4">
        <Gift className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-800">
              <strong>Comece seu período gratuito!</strong> 7 dias grátis para testar todos os recursos premium.
            </span>
            <Badge className="bg-blue-100 text-blue-800 ml-2">
              7 dias grátis
            </Badge>
          </div>
          <Button 
            size="sm" 
            onClick={handleStartTrial}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Começar Grátis
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Banner para trial ativo
  if (isTrialActive && trialDaysRemaining > 0) {
    return (
      <Alert className="border-blue-200 bg-blue-50 mb-4">
        <Gift className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-800">
              <strong>Período gratuito ativo!</strong> {trialDaysRemaining} dias restantes para aproveitar todos os recursos premium.
            </span>
            <Badge className="bg-blue-100 text-blue-800 ml-2">
              Grátis
            </Badge>
          </div>
          <Button 
            size="sm" 
            onClick={() => navigate('/subscription')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Escolher Plano
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </AlertDescription>
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
