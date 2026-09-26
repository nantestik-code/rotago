import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/useSubscription';
import { useIsAdmin } from '@/hooks/use-admin-auth';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Crown,
  Gift,
} from 'lucide-react';

const SubscriptionBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const {
    subscription,
    loading,
    isTrialActive,
    trialDaysRemaining,
    trialTimeRemainingLabel,
    isSubscriptionActive,
    currentPlan,
    error,
  } = useSubscription();

  const [pendingPayment, setPendingPayment] = useState(false);

  useEffect(() => {
    const pending = localStorage.getItem('pending_payment');
    const pendingPlanId = localStorage.getItem('pending_plan_id');
    setPendingPayment(Boolean(pending && pendingPlanId));
  }, []);

  if (isAdmin) {
    return null;
  }

  if (isTrialActive && trialDaysRemaining > 3 && isSubscriptionActive) {
    return null;
  }

  if (isSubscriptionActive && !isTrialActive) {
    return null;
  }

  if (pendingPayment) {
    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50">
        <Clock className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-orange-800">
              <strong>Pagamento pendente.</strong> Abra sua assinatura para concluir ou conferir o pagamento.
            </span>
            <Badge className="bg-orange-100 text-orange-800">Pendente</Badge>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/subscription')}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            Pagar Agora
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading && user) {
    return (
      <Alert className="mb-4 border-brand-200 bg-brand-50">
        <Clock className="h-4 w-4 text-brand-600" />
        <AlertDescription className="flex items-center gap-2">
          <span className="text-brand-800">Carregando sua assinatura...</span>
          <Badge className="bg-brand-100 text-brand-800">Aguarde</Badge>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return null;
  }

  if (!subscription) {
    return (
      <Alert className="mb-4 border-brand-200 bg-brand-50">
        <Gift className="h-4 w-4 text-brand-600" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <span className="text-brand-800">
            <strong>Escolha um plano.</strong> O trial so inicia depois da escolha do plano.
          </span>
          <Button
            size="sm"
            onClick={() => navigate('/subscription')}
            className="bg-brand-600 text-white hover:bg-brand-700"
          >
            Ativar Agora
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isTrialActive && trialDaysRemaining > 0) {
    const isLastDays = trialDaysRemaining <= 3;

    return (
      <Alert
        className={`mb-4 p-4 ${
          isLastDays
            ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100'
            : 'border-brand-200 bg-gradient-to-r from-brand-50 to-brand-100'
        }`}
      >
        <div className="flex w-full items-start gap-3">
          <Gift
            className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
              isLastDays ? 'text-orange-600' : 'text-brand-600'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className={`text-sm font-semibold ${isLastDays ? 'text-orange-800' : 'text-brand-800'}`}>
                {isLastDays ? 'Trial terminando' : 'Trial ativo'}
              </span>
              <Badge className={isLastDays ? 'bg-orange-100 text-orange-800' : 'bg-brand-100 text-brand-800'}>
                {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}
              </Badge>
              <Badge className={isLastDays ? 'bg-orange-100 text-orange-800' : 'bg-brand-100 text-brand-800'}>
                {trialTimeRemainingLabel}
              </Badge>
              {currentPlan && (
                <Badge className={isLastDays ? 'bg-orange-100 text-orange-800' : 'bg-brand-100 text-brand-800'}>
                  {currentPlan.name}
                </Badge>
              )}
            </div>
            <p className={`text-sm leading-relaxed ${isLastDays ? 'text-orange-700' : 'text-brand-700'}`}>
              Seu acesso premium gratuito segue ativo por {trialTimeRemainingLabel}.
            </p>
            <div className="mt-3">
              <Button
                size="sm"
                onClick={() => navigate('/subscription')}
                className={`${isLastDays ? 'bg-orange-600 hover:bg-orange-700' : 'bg-brand-600 hover:bg-brand-700'} text-white`}
              >
                Assinar Agora
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    );
  }

  if (subscription.status === 'pending_payment') {
    return (
      <Alert className="mb-4 border-yellow-200 bg-yellow-50">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-yellow-800">
              <strong>Pagamento pendente.</strong> Finalize o pagamento para liberar o plano.
            </span>
            <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/subscription')}
            className="bg-yellow-600 text-white hover:bg-yellow-700"
          >
            Pagar Agora
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!isSubscriptionActive || error) {
    return (
      <Alert className="mb-4 border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-red-800">
              <strong>Acesso bloqueado.</strong> Seu trial ou assinatura terminou. Assine para voltar a usar o sistema.
            </span>
            <Badge className="bg-red-100 text-red-800">Bloqueado</Badge>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/subscription')}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Assinar Agora
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (currentPlan) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-green-800">
              <strong>Plano {currentPlan.name} ativo.</strong> Todos os recursos premium estao liberados.
            </span>
            <Badge className="bg-green-100 text-green-800">
              <Crown className="mr-1 h-3 w-3" />
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

  return null;
};

export default SubscriptionBanner;
