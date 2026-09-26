import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  /** Valor cobrado nos primeiros promo_cycles ciclos. Nulo = sem promoção. */
  promo_price?: string | null;
  promo_cycles?: number;
  frequency: number;
  frequency_type: string;
  discount: number;
  total: string;
  is_active: boolean;
  gateway_plan_id: string;
}

const PricingSection = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  // A leitura do banco estava desativada porque o RLS bloqueava a consulta.
  // A policy subscription_plans_read agora libera a leitura do catalogo para
  // visitantes nao autenticados, entao os precos vem do banco e param de
  // divergir do que e cobrado.
  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;

      setPlans(data?.length ? (data as SubscriptionPlan[]) : getFallbackPlans());
    } catch (error) {
      console.error('Erro ao buscar planos, usando fallback:', error);
      setPlans(getFallbackPlans());
    } finally {
      setLoading(false);
    }
  };

  // Usado apenas se o banco estiver fora do ar. Precisa refletir o plano real.
  const getFallbackPlans = (): SubscriptionPlan[] => [
    {
      id: 'mensal',
      name: 'Mensal',
      description: 'R$ 19,90/mês nos 2 primeiros meses, depois R$ 29,90/mês',
      price: '29.90',
      promo_price: '19.90',
      promo_cycles: 2,
      frequency: 1,
      frequency_type: 'month',
      discount: 0,
      total: '29.90',
      is_active: true,
      gateway_plan_id: ''
    }
  ];

  const getPopularPlan = () => plans[0];

  const getPlanFeatures = (planId: string) => {
    const baseFeatures = [
      'Entregas ilimitadas',
      'Motoristas ilimitados',
      'Otimização automática de rotas',
      'App móvel completo',
      'Rastreamento em tempo real'
    ];

    const premiumFeatures = [
      'Relatórios avançados',
      'Suporte prioritário',
      'Importação de planilhas',
      'Dashboard completo',
      'Notificações automáticas'
    ];

    return planId === 'mensal' ? baseFeatures : [...baseFeatures, ...premiumFeatures];
  };

  const formatPrice = (price: string) => {
    return parseFloat(price).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleSelectPlan = (planId: string) => {
    navigate(`/auth/signup?plan=${planId}`);
  };

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
        {/* Botão Voltar */}
        <div className="flex justify-start mb-4">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-gray-700 hover:text-primary"
            onClick={() => navigate('/app')}
            size="sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Voltar para o app
          </Button>
        </div>
        <div className="text-center mb-16">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mx-auto animate-pulse"></div>
        </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
              💎 Teste Grátis por 10 Dias
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Plano RotaGo
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Sem fidelidade. Cancele quando quiser.
            </p>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const isPopular = plan.id === getPopularPlan()?.id;
            const features = getPlanFeatures(plan.id);
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative ${isPopular ? 'lg:scale-105' : ''}`}
              >
                <Card className={`h-full transition-all duration-300 hover:shadow-xl ${
                  isPopular 
                    ? 'border-primary shadow-lg ring-2 ring-primary/20' 
                    : 'border-gray-200 hover:border-primary/50'
                }`}>
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-white px-4 py-1">
                        <Crown className="w-3 h-3 mr-1" />
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-xl font-bold text-gray-900">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {plan.description}
                    </CardDescription>
                    
                    {(() => {
                      const promoCycles = plan.promo_cycles ?? 0;
                      const hasPromo = promoCycles > 0 && !!plan.promo_price;
                      const displayPrice = hasPromo ? plan.promo_price! : plan.price;

                      return (
                        <div className="mt-4">
                          <div className="flex items-baseline justify-center gap-2">
                            {hasPromo && (
                              <span className="text-lg text-gray-400 line-through">
                                {formatPrice(plan.price)}
                              </span>
                            )}
                            <span className="text-3xl font-bold text-gray-900">
                              {formatPrice(displayPrice)}
                            </span>
                            <span className="text-gray-600">/mês</span>
                          </div>

                          {hasPromo ? (
                            <div className="mt-2">
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Promoção de lançamento
                              </Badge>
                              <p className="text-sm text-gray-600 mt-1">
                                Nos {promoCycles} primeiros meses. Depois,{' '}
                                {formatPrice(plan.price)}/mês.
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 mt-2">
                              Cobrança a cada {plan.frequency}{' '}
                              {plan.frequency === 1 ? 'mês' : 'meses'}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <Button 
                      className={`w-full mb-6 ${
                        isPopular 
                          ? 'bg-primary hover:bg-primary/90' 
                          : 'bg-gray-900 hover:bg-gray-800'
                      }`}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Começar Teste Grátis Agora
                    </Button>
                    
                    <div className="space-y-3">
                      <p className="font-semibold text-gray-900 text-sm">
                        ✨ Funcionalidades incluídas:
                      </p>
                      {features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto border">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              🎯 Teste completamente grátis por 10 dias
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div className="flex items-center justify-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Teste completamente grátis por 10 dias
              </div>
              <div className="flex items-center justify-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Não precisa cartão de crédito agora
              </div>
              <div className="flex items-center justify-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Cobrança automática só após período gratuito
              </div>
              <div className="flex items-center justify-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Cancele quando quiser com 1 clique
              </div>
            </div>
          </div>
        </motion.div>
        {/* Botão para acessar o app */}
        <div className="flex justify-center mt-10">
          <Button
            className="bg-brand-600 hover:bg-brand-700 text-white text-lg px-8 py-4 rounded-full shadow-lg transition-all duration-200"
            onClick={() => navigate('/app')}
          >
            Ir para o Painel do App
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
