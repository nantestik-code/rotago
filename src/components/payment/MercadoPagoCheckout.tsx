import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Lock,
  Star
} from 'lucide-react';
import { SubscriptionPlan } from '@/hooks/useSubscription';
import { mercadoPagoService } from '@/services/mercadopago';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface MercadoPagoCheckoutProps {
  plan: SubscriptionPlan;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const MercadoPagoCheckout: React.FC<MercadoPagoCheckoutProps> = ({
  plan,
  onSuccess,
  onError,
  onCancel,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'review' | 'processing' | 'redirect'>('review');

  const handlePayment = async () => {
    if (!user) {
      onError?.('Usuário não autenticado');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      const paymentResult = await mercadoPagoService.createPreference(plan, {
        planId: plan.id,
        userEmail: user.email || '',
        userName: user.user_metadata?.full_name || 'Usuário',
        userId: user.id,
      });

      setPaymentUrl(paymentResult.init_point);
      setStep('redirect');

      // Aguarda um momento antes de redirecionar
      setTimeout(() => {
        window.open(paymentResult.init_point, '_blank');
        
        toast({
          title: "Redirecionando para pagamento",
          description: "Complete o pagamento na nova aba que foi aberta.",
        });

        onSuccess?.(paymentResult.id);
      }, 1500);

    } catch (error) {
      console.error('Erro no checkout:', error);
      setStep('review');
      onError?.('Erro ao processar pagamento');
      
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanFeatures = () => {
    const features = [
      'Entregas ilimitadas',
      'Motoristas ilimitados',
      'Otimização automática de rotas',
      'App móvel completo',
      'Rastreamento em tempo real',
    ];

    if (plan.id !== 'monthly') {
      features.push(
        'Relatórios avançados',
        'Suporte prioritário',
        'Importação de planilhas',
        'Dashboard completo',
        'Notificações automáticas'
      );
    }

    return features;
  };

  const calculateSavings = () => {
    if (plan.discount <= 0) return null;
    
    const originalPrice = parseFloat(plan.price) * plan.frequency;
    const discountAmount = originalPrice * (plan.discount / 100);
    
    return {
      originalPrice,
      discountAmount,
      finalPrice: parseFloat(plan.total),
    };
  };

  const savings = calculateSavings();

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary to-primary/90 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Finalizar Assinatura</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Confirme os detalhes do seu plano
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {mercadoPagoService.formatPrice(plan.price)}
                </div>
                <div className="text-sm opacity-90">/mês</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {step === 'review' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Detalhes do Plano */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      {plan.name}
                    </h3>
                    {plan.id === 'quarterly' && (
                      <Badge className="bg-primary text-white">
                        Mais Popular
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-4">{plan.description}</p>

                  {/* Economia */}
                  {savings && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">
                          Você está economizando {plan.discount}%!
                        </span>
                      </div>
                      <div className="text-sm text-green-700">
                        <div className="flex justify-between">
                          <span>Preço original:</span>
                          <span className="line-through">
                            {mercadoPagoService.formatPrice(savings.originalPrice)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Desconto:</span>
                          <span className="text-green-600 font-medium">
                            -{mercadoPagoService.formatPrice(savings.discountAmount)}
                          </span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>{mercadoPagoService.formatPrice(savings.finalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recursos Inclusos */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Recursos inclusos:</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {getPlanFeatures().map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Informações de Cobrança */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Detalhes da cobrança:</h4>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Plano {plan.name}</span>
                      <span>{mercadoPagoService.formatPrice(plan.price)}/mês</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Período</span>
                      <span>{plan.frequency} {plan.frequency_type === 'month' ? 'mês' : 'meses'}</span>
                    </div>
                    {plan.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Desconto ({plan.discount}%)</span>
                        <span>-{mercadoPagoService.formatPrice(
                          parseFloat(plan.price) * plan.frequency * (plan.discount / 100)
                        )}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{mercadoPagoService.formatPrice(plan.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Período de Teste */}
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>7 dias grátis!</strong> Teste todos os recursos premium sem compromisso. 
                    A cobrança só acontece após o período de teste.
                  </AlertDescription>
                </Alert>

                {/* Segurança */}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4" />
                  <span>Pagamento seguro processado pelo Mercado Pago</span>
                  <Lock className="w-4 h-4" />
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handlePayment}
                    disabled={loading}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pagar com Mercado Pago
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center py-8"
              >
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Processando pagamento...</h3>
                <p className="text-gray-600">
                  Aguarde enquanto preparamos seu checkout seguro
                </p>
              </motion.div>
            )}

            {step === 'redirect' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center py-8"
              >
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Redirecionando...</h3>
                <p className="text-gray-600 mb-4">
                  Complete o pagamento na nova aba que foi aberta
                </p>
                {paymentUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(paymentUrl, '_blank')}
                  >
                    Abrir pagamento novamente
                  </Button>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default MercadoPagoCheckout;
