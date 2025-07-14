import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Zap,
  Shield,
  Star,
  TrendingUp,
  Gift
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { mercadoPagoService } from '@/services/mercadopago';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import PaymentDebug from '@/components/debug/PaymentDebug';

const SubscriptionPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const {
    subscription,
    plans,
    loading,
    error,
    isTrialActive,
    trialDaysRemaining,
    isSubscriptionActive,
    currentPlan,
    createSubscription,
    cancelSubscription,
  } = useSubscription();

  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Logs detalhados para debug
  console.log('📊 SubscriptionPage - Estado atual:', {
    user: user ? { id: user.id, email: user.email } : null,
    authLoading,
    subscription,
    plansCount: plans.length,
    loading,
    error,
    isTrialActive,
    trialDaysRemaining,
    isSubscriptionActive,
    currentPlan,
    processingPayment,
    selectedPlanId
  });

  const handleUpgradePlan = async (planId: string) => {
    if (!user) return;

    setProcessingPayment(true);
    setSelectedPlanId(planId);

    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plano não encontrado');

      const paymentResult = await mercadoPagoService.createPreference(plan, {
        planId: plan.id,
        userEmail: user.email || '',
        userName: user.user_metadata?.full_name || 'Usuário',
        userId: user.id,
      });

      // Marcar pagamento como pendente no localStorage
      localStorage.setItem('pending_payment', 'true');
      localStorage.setItem('pending_plan_id', planId);
      localStorage.setItem('pending_payment_time', new Date().toISOString());
      
      console.log('💳 Pagamento marcado como pendente:', { planId, time: new Date().toISOString() });

      // Abrir o link de pagamento em nova aba
      window.open(paymentResult.init_point, '_blank');

      toast({
        title: "Redirecionando para pagamento",
        description: "Você será redirecionado para completar o pagamento no Mercado Pago.",
      });

    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
      setSelectedPlanId(null);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      toast({
        title: "Assinatura cancelada",
        description: "Sua assinatura será cancelada no final do período atual.",
      });
    } catch (error) {
      toast({
        title: "Erro ao cancelar",
        description: "Não foi possível cancelar a assinatura. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    if (isTrialActive) {
      return (
        <Badge className="bg-blue-100 text-blue-800">
          <Gift className="w-3 h-3 mr-1" />
          Período Gratuito
        </Badge>
      );
    }

    switch (subscription.status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ativo
          </Badge>
        );
      case 'pending_payment':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pagamento Pendente
          </Badge>
        );
      case 'canceled':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {subscription.status}
          </Badge>
        );
    }
  };

  const getTrialProgress = () => {
    if (!isTrialActive) return 0;
    const totalDays = 7;
    const remainingDays = trialDaysRemaining;
    return ((totalDays - remainingDays) / totalDays) * 100;
  };

  if (loading || authLoading) {
    console.log('⏳ SubscriptionPage: Carregando...', { loading, authLoading });
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#c2e4cb] via-white to-[#c2e4cb]/30">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#176585] to-[#27b1bf] rounded-full mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-[#176585] mb-3">
              Minha Assinatura
            </h1>
            <p className="text-[#176585]/70 text-lg max-w-2xl mx-auto">
              Gerencie sua assinatura e acesse todos os recursos premium do RotaFácil
            </p>
          </motion.div>

          {/* Loading State */}
          {(loading || authLoading) && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#176585]"></div>
              <span className="ml-3 text-[#176585]">Carregando...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !authLoading && (
            <>
          {/* Status e Plano Atual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <Card className="border-0 shadow-lg overflow-hidden rounded-xl bg-gradient-to-br from-white to-[#c2e4cb]/30">
              <div className="h-2 bg-gradient-to-r from-[#27b1bf] to-[#c2e4cb]"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#176585] text-xl">
                  <CreditCard className="w-5 h-5 text-[#27b1bf]" />
                  Status da Assinatura
                </CardTitle>
                <CardDescription className="text-[#176585]/70">
                  Veja o status da sua assinatura e detalhes do plano atual.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  {getStatusBadge()}
                  {currentPlan && (
                    <Badge className="bg-primary/10 text-primary ml-2">
                      {currentPlan.name}
                    </Badge>
                  )}
                </div>
                {subscription ? (
                  <div>
                    {/* Período de Teste */}
                    {isTrialActive && (
                      <div className="mb-4">
                        <Badge className="bg-blue-100 text-blue-800 mb-2">
                          <Gift className="w-3 h-3 mr-1" />
                          Período Gratuito
                        </Badge>
                        <Progress
                          value={getTrialProgress()} 
                          className="mb-2"
                        />
                        <p className="text-sm text-blue-700">
                          Aproveite todos os recursos premium gratuitamente até o final do período de teste.
                        </p>
                      </div>
                    )}

                    {/* Próxima Cobrança */}
                    {subscription.current_period_end && !isTrialActive && (
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Próxima cobrança</p>
                          <p className="text-sm text-gray-600">
                            {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {currentPlan ? mercadoPagoService.formatPrice(currentPlan.total) : 'R$ 0,00'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {currentPlan?.frequency_type === 'month' ? 'Mensal' : 'Anual'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex gap-3">
                      {subscription.cancel_at_period_end ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Sua assinatura será cancelada em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={handleCancelSubscription}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Cancelar Assinatura
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma assinatura ativa
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Escolha um plano para começar a usar todos os recursos premium
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recursos Premium */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg overflow-hidden rounded-xl bg-gradient-to-br from-white to-[#c2e4cb]/30">
              <div className="h-2 bg-gradient-to-r from-[#27b1bf] to-[#c2e4cb]"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#176585] text-xl">
                  <Star className="w-5 h-5 text-[#27b1bf]" />
                  Recursos Premium
                </CardTitle>
                <CardDescription className="text-[#176585]/70">
                  O que você tem acesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { icon: Zap, text: 'Entregas ilimitadas', active: isSubscriptionActive },
                    { icon: TrendingUp, text: 'Relatórios avançados', active: isSubscriptionActive },
                    { icon: Shield, text: 'Suporte prioritário', active: isSubscriptionActive },
                    { icon: Calendar, text: 'Agendamento automático', active: isSubscriptionActive },
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`p-1 rounded ${
                        feature.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <feature.icon className="w-4 h-4" />
                      </div>
                      <span className={`text-sm ${
                        feature.active ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {feature.text}
                      </span>
                      {feature.active && (
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Planos Disponíveis */}
          {(!subscription || isTrialActive) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Escolha seu Plano</CardTitle>
                  <CardDescription>
                    Selecione o plano ideal para sua empresa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {plans.map((plan, idx) => (
                      <div
                        key={plan.id + '-' + idx}
                        className={`border rounded-lg p-4 relative ${
                          plan.id === 'quarterly' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-gray-200'
                        }`}
                      >
                        {plan.id === 'quarterly' && (
                          <Badge className="absolute -top-2 left-4 bg-primary text-white">
                            Mais Popular
                          </Badge>
                        )}
                        
                        <div className="text-center mb-4">
                          <h3 className="font-semibold text-lg">{plan.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                          
                          <div className="mb-2">
                            <span className="text-2xl font-bold">
                              {mercadoPagoService.formatPrice(plan.price)}
                            </span>
                            <span className="text-gray-600">/mês</span>
                          </div>
                          
                          {plan.discount > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {plan.discount}% desconto
                            </Badge>
                          )}
                        </div>

                        <Button
                          className="w-full"
                          variant={plan.id === 'quarterly' ? 'default' : 'outline'}
                          onClick={() => handleUpgradePlan(plan.id)}
                          disabled={processingPayment}
                        >
                          {processingPayment && selectedPlanId === plan.id ? (
                            'Processando...'
                          ) : (
                            'Escolher Plano'
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
            </>
          )}
        </div>
      </div>
      
      {/* Componente de Debug - apenas em desenvolvimento */}
      {import.meta.env.DEV && <PaymentDebug />}
    </div>
  );
};

export default SubscriptionPage;