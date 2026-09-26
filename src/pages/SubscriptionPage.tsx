import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Crown,
  Gift,
  Shield,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/useSubscription';
import { asaasService } from '@/services/asaas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';


const SubscriptionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const {
    subscription,
    plans,
    loading,
    error,
    isTrialActive,
    trialDaysRemaining,
    trialTimeRemainingLabel,
    isSubscriptionActive,
    currentPlan,
    activateTrial,
    redeemCoupon,
    cancelSubscription,
    refetch,
  } = useSubscription();

  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [redeemingCoupon, setRedeemingCoupon] = useState(false);
  const [syncingReturn, setSyncingReturn] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [checkingTrialHistory, setCheckingTrialHistory] = useState(true);

  const showPlanSelector =
    !subscription ||
    isTrialActive ||
    subscription.status === 'pending_payment' ||
    !isSubscriptionActive;

  // Verificar se o usuário já usou trial antes
  useEffect(() => {
    const checkTrialHistory = async () => {
      if (!user) {
        setCheckingTrialHistory(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_trial', true)
          .limit(1);

        setHasUsedTrial(Boolean(data && data.length > 0));
      } catch {
        setHasUsedTrial(false);
      } finally {
        setCheckingTrialHistory(false);
      }
    };

    checkTrialHistory();
  }, [user?.id]);

  const getTrialProgress = () => {
    if (!isTrialActive || !subscription?.current_period_start || !subscription?.trial_ends_at) {
      return 0;
    }

    const start = new Date(subscription.current_period_start).getTime();
    const end = new Date(subscription.trial_ends_at).getTime();
    const now = Date.now();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return 0;
    }

    const progress = ((Math.min(now, end) - start) / (end - start)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    if (isTrialActive) {
      return (
        <Badge className="bg-brand-100 text-brand-800">
          <Gift className="mr-1 h-3 w-3" />
          Trial Ativo
        </Badge>
      );
    }

    if (subscription.status === 'pending_payment') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="mr-1 h-3 w-3" />
          Pagamento Pendente
        </Badge>
      );
    }

    if (isSubscriptionActive) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          Ativo
        </Badge>
      );
    }

    return (
      <Badge className="bg-red-100 text-red-800">
        <AlertCircle className="mr-1 h-3 w-3" />
        Bloqueado
      </Badge>
    );
  };

  const handleUpgradePlan = async (planId: string) => {
    if (!user) return;

    setProcessingPayment(true);
    setSelectedPlanId(planId);

    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Plano nao encontrado');
      }

      const paymentResult = await asaasService.createCheckout(plan, {
        planId: plan.id,
        userEmail: user.email || '',
        userName: user.user_metadata?.full_name || 'Usuario',
        userId: user.id,
      });

      localStorage.setItem('pending_payment', 'true');
      localStorage.setItem('pending_plan_id', planId);
      localStorage.setItem('pending_subscription_id', paymentResult.user_subscription_id || '');
      localStorage.setItem('pending_payment_time', new Date().toISOString());

      window.location.assign(paymentResult.init_point);

      toast({
        title: 'Redirecionando para pagamento',
        description: 'Voce sera enviado ao checkout Asaas (PIX ou cartao).',
      });
    } catch (paymentError) {
      console.error('Erro ao processar pagamento:', paymentError);
      toast({
        title: 'Erro no pagamento',
        description: 'Nao foi possivel iniciar o pagamento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setProcessingPayment(false);
      setSelectedPlanId(null);
    }
  };

  const handleStartTrial = async (planId: string) => {
    if (!user) return;

    setActivatingTrial(true);
    setSelectedPlanId(planId);

    try {
      await activateTrial(planId);
      toast({
        title: 'Trial ativado',
        description: 'O acesso premium foi liberado para o periodo de teste.',
      });
      // Redirecionar direto para o app (tela de importar planilha)
      navigate('/app', { replace: true });
    } catch (trialError: any) {
      console.error('Erro ao ativar trial:', trialError);
      toast({
        title: 'Erro ao ativar trial',
        description: trialError?.message || 'Nao foi possivel iniciar o periodo gratuito.',
        variant: 'destructive',
      });
    } finally {
      setActivatingTrial(false);
      setSelectedPlanId(null);
    }
  };

  const handleRedeemCoupon = async () => {
    if (!user || !couponCode.trim()) return;

    setRedeemingCoupon(true);
    try {
      await redeemCoupon(couponCode);
      toast({
        title: 'Cupom aplicado',
        description: 'Seu período gratuito foi liberado. Bom uso!',
      });
      setCouponCode('');
      navigate('/app', { replace: true });
    } catch (couponError: any) {
      toast({
        title: 'Não foi possível aplicar o cupom',
        description: couponError?.message || 'Verifique o código e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setRedeemingCoupon(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      toast({
        title: 'Assinatura cancelada',
        description: 'O cancelamento foi agendado para o fim do periodo atual.',
      });
    } catch (cancelError) {
      console.error('Erro ao cancelar assinatura:', cancelError);
      toast({
        title: 'Erro ao cancelar',
        description: 'Nao foi possivel cancelar a assinatura.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(location.search);
    const paymentFlow = params.get('payment');
    const subscriptionId =
      params.get('ref') ||
      localStorage.getItem('pending_subscription_id') ||
      '';

    if (!paymentFlow || paymentFlow === 'failure' || paymentFlow === 'expired') {
      return;
    }

    if (!subscriptionId) {
      return;
    }

    let cancelled = false;

    const runSync = async () => {
      setSyncingReturn(true);

      try {
        let result: { status?: string } | null = null;
        for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
          result = await asaasService.syncPayment(subscriptionId);
          await refetch();
          if (result?.status === 'active') break;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (cancelled) return;

        localStorage.removeItem('pending_payment');
        localStorage.removeItem('pending_plan_id');
        localStorage.removeItem('pending_subscription_id');
        localStorage.removeItem('pending_payment_time');

        toast({
          title: result?.status === 'active' ? 'Pagamento confirmado' : 'Pagamento em processamento',
          description:
            result?.status === 'active'
              ? 'Sua assinatura foi ativada.'
              : 'Se o PIX ja foi pago, aguarde alguns segundos e atualize a pagina.',
        });

        navigate(result?.status === 'active' ? '/app' : '/subscription', { replace: true });
      } catch (syncError) {
        if (cancelled) return;

        console.error('Erro ao sincronizar retorno do pagamento:', syncError);
        toast({
          title: 'Pagamento recebido, sincronizacao pendente',
          description: 'Aguarde alguns instantes e atualize a pagina se necessario.',
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) {
          setSyncingReturn(false);
        }
      }
    };

    runSync();

    return () => {
      cancelled = true;
    };
  }, [location.search, navigate, refetch, user]);

  if (loading || authLoading || syncingReturn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 rounded bg-gray-200" />
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
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex justify-start">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate('/app')}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Voltar para o painel
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-[#176585] to-[#27b1bf]">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <h1 className="mb-3 text-4xl font-bold text-[#176585]">Minha Assinatura</h1>
            <p className="mx-auto max-w-2xl text-lg text-[#176585]/70">
              Gerencie seu trial, sua assinatura e o desbloqueio dos recursos premium.
            </p>
          </motion.div>

          {error && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Atencao</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <Card className="overflow-hidden rounded-xl border-0 bg-gradient-to-br from-white to-[#c2e4cb]/30 shadow-lg">
              <div className="h-2 bg-gradient-to-r from-[#27b1bf] to-[#c2e4cb]" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-[#176585]">
                  <CreditCard className="h-5 w-5 text-[#27b1bf]" />
                  Status da Assinatura
                </CardTitle>
                <CardDescription className="text-[#176585]/70">
                  O bloqueio do app depende deste status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  {getStatusBadge()}
                  {currentPlan && (
                    <Badge className="bg-primary/10 text-primary">{currentPlan.name}</Badge>
                  )}
                </div>

                {subscription ? (
                  <div className="space-y-4">
                    {isTrialActive && (
                      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge className="bg-brand-100 text-brand-800">
                            <Gift className="mr-1 h-3 w-3" />
                            Periodo Gratuito
                          </Badge>
                          <Badge className="bg-brand-100 text-brand-800">
                            {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'}
                          </Badge>
                          <Badge className="bg-brand-100 text-brand-800">{trialTimeRemainingLabel}</Badge>
                        </div>
                        <Progress value={getTrialProgress()} className="mb-2" />
                        <p className="text-sm text-brand-700">
                          Trial ativo por mais {trialTimeRemainingLabel}. Quando esse tempo acabar, o app trava ate uma nova assinatura.
                        </p>
                      </div>
                    )}

                    {subscription.status === 'pending_payment' && (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                        <p className="font-medium text-yellow-900">Pagamento pendente</p>
                        <p className="text-sm text-yellow-700">
                          Seu plano foi escolhido, mas ainda falta concluir o pagamento para liberar o acesso pago.
                        </p>
                      </div>
                    )}

                    {!isTrialActive && !isSubscriptionActive && subscription.status !== 'pending_payment' && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="font-medium text-red-900">Acesso bloqueado</p>
                        <p className="text-sm text-red-700">
                          O trial ou a assinatura terminou. O retorno ao app depende de uma nova assinatura valida.
                        </p>
                      </div>
                    )}

                    {subscription.current_period_end && isSubscriptionActive && !isTrialActive && (
                      <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                        <div>
                          <p className="font-medium">Plano valido ate</p>
                          <p className="text-sm text-gray-600">
                            {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {currentPlan ? asaasService.formatPrice(currentPlan.total) : 'R$ 0,00'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Pagamento avulso do plano
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {isTrialActive ? (
                        <Button onClick={() => document.getElementById('plan-selector')?.scrollIntoView({ behavior: 'smooth' })}>Assinar Agora</Button>
                      ) : subscription.status === 'pending_payment' ? (
                        <Button onClick={() => document.getElementById('plan-selector')?.scrollIntoView({ behavior: 'smooth' })}>Pagar Agora</Button>
                      ) : !isSubscriptionActive ? (
                        <Button onClick={() => document.getElementById('plan-selector')?.scrollIntoView({ behavior: 'smooth' })}>Ativar Agora</Button>
                      ) : subscription.cancel_at_period_end ? (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Sua assinatura sera cancelada em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={handleCancelSubscription}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Cancelar Assinatura
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900">Nenhuma assinatura ativa</h3>
                    <p className="mb-4 text-gray-600">
                      Escolha um plano abaixo para liberar o trial e o acesso premium.
                    </p>
                    {hasUsedTrial && (
                      <p className="mb-2 text-sm text-amber-600">
                        Seu periodo de teste gratuito ja foi utilizado. Escolha um plano pago para continuar.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="overflow-hidden rounded-xl border-0 bg-gradient-to-br from-white to-[#c2e4cb]/30 shadow-lg">
              <div className="h-2 bg-gradient-to-r from-[#27b1bf] to-[#c2e4cb]" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-[#176585]">
                  <Star className="h-5 w-5 text-[#27b1bf]" />
                  Recursos Premium
                </CardTitle>
                <CardDescription className="text-[#176585]/70">
                  O acesso real depende da assinatura valida ou do trial ativo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { icon: Zap, text: 'Entregas ilimitadas', active: isSubscriptionActive },
                    { icon: TrendingUp, text: 'Relatorios avancados', active: isSubscriptionActive },
                    { icon: Shield, text: 'Suporte prioritario', active: isSubscriptionActive },
                    { icon: Calendar, text: 'Agendamento automatico', active: isSubscriptionActive },
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div
                        className={`rounded p-1 ${
                          feature.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <feature.icon className="h-4 w-4" />
                      </div>
                      <span className={feature.active ? 'text-gray-900' : 'text-gray-500'}>
                        {feature.text}
                      </span>
                      {feature.active && <CheckCircle className="ml-auto h-4 w-4 text-green-500" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {showPlanSelector && !isSubscriptionActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-green-600" />
                    Tem um cupom?
                  </CardTitle>
                  <CardDescription>
                    Se você recebeu um código promocional, use-o aqui para liberar seu
                    período gratuito.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRedeemCoupon();
                      }}
                      placeholder="Digite seu cupom"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={40}
                      disabled={redeemingCoupon}
                      aria-label="Código do cupom"
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase tracking-wider ring-offset-background placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                    />
                    <Button
                      onClick={handleRedeemCoupon}
                      disabled={redeemingCoupon || !couponCode.trim()}
                      className="sm:w-40"
                    >
                      {redeemingCoupon ? 'Aplicando...' : 'Aplicar cupom'}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Cada cupom pode ser usado uma vez por pessoa.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {showPlanSelector && (
            <motion.div
              id="plan-selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Escolha seu Plano</CardTitle>
                  <CardDescription>Selecione o plano ideal e desbloqueie o acesso.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {plans.map((plan, idx) => {
                      const isCurrentPlan = currentPlan?.id === plan.id;
                      const isRecommended = plan.id === 'trimestral';

                      return (
                        <div
                          key={`${plan.id}-${idx}`}
                          className={`relative rounded-lg border p-4 ${
                            isCurrentPlan
                              ? 'border-green-500 bg-green-50'
                              : isRecommended
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200'
                          }`}
                        >
                          {isCurrentPlan && (
                            <Badge className="absolute -top-2 left-4 bg-green-600 text-white">
                              Plano Atual
                            </Badge>
                          )}
                          {!isCurrentPlan && isRecommended && (
                            <Badge className="absolute -top-2 left-4 bg-primary text-white">
                              Mais Popular
                            </Badge>
                          )}

                          <div className="mb-4 text-center">
                            <h3 className="text-lg font-semibold">{plan.name}</h3>
                            <p className="mb-2 text-sm text-gray-600">{plan.description}</p>

                            <div className="mb-2">
                              <span className="text-2xl font-bold">
                                {asaasService.formatPrice(plan.price)}
                              </span>
                              <span className="text-gray-600">/mes</span>
                            </div>

                            {plan.discount > 0 && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {plan.discount}% desconto
                              </Badge>
                            )}
                          </div>

                          {!subscription && !hasUsedTrial && (
                            <Button
                              className="mb-2 w-full"
                              variant={isRecommended ? 'default' : 'outline'}
                              onClick={() => handleStartTrial(plan.id)}
                              disabled={activatingTrial || processingPayment}
                            >
                              {activatingTrial && selectedPlanId === plan.id ? (
                                'Ativando...'
                              ) : (
                                <>
                                  <Gift className="mr-1 h-4 w-4" />
                                  Comecar Trial Gratis
                                </>
                              )}
                            </Button>
                          )}
                          {!subscription && hasUsedTrial && (
                            <div className="mb-2 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-center text-sm text-gray-500">
                              Trial ja utilizado
                            </div>
                          )}

                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => handleUpgradePlan(plan.id)}
                            disabled={processingPayment || activatingTrial}
                          >
                            {processingPayment && selectedPlanId === plan.id
                              ? 'Processando...'
                              : subscription?.status === 'pending_payment'
                                ? 'Pagar Agora'
                                : isTrialActive
                                  ? 'Assinar Agora'
                              : 'Pagar com Asaas'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>


    </div>
  );
};

export default SubscriptionPage;
