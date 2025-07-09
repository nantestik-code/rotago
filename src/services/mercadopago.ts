import { SubscriptionPlan } from '@/hooks/useSubscription';

// Configuração do Mercado Pago
const MERCADOPAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || 'TEST-your-public-key';
const MERCADOPAGO_ACCESS_TOKEN = import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || 'TEST-your-access-token';

export interface PaymentData {
  planId: string;
  userEmail: string;
  userName: string;
  userId: string;
}

export interface PaymentResult {
  id: string;
  status: string;
  init_point: string;
  sandbox_init_point: string;
}

export class MercadoPagoService {
  private static instance: MercadoPagoService;
  private mp: any = null;

  private constructor() {
    this.initializeMercadoPago();
  }

  public static getInstance(): MercadoPagoService {
    if (!MercadoPagoService.instance) {
      MercadoPagoService.instance = new MercadoPagoService();
    }
    return MercadoPagoService.instance;
  }

  private async initializeMercadoPago() {
    try {
      // Carrega o SDK do Mercado Pago dinamicamente
      if (typeof window !== 'undefined' && !window.MercadoPago) {
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        document.head.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      if (window.MercadoPago) {
        this.mp = new window.MercadoPago(MERCADOPAGO_PUBLIC_KEY);
      }
    } catch (error) {
      console.error('Erro ao inicializar Mercado Pago:', error);
    }
  }

  public async createPreference(plan: SubscriptionPlan, paymentData: PaymentData): Promise<PaymentResult> {
    console.log('🔄 Iniciando criação de preferência:', { plan: plan.id, user: paymentData.userEmail });
    
    try {
      // Log da chave configurada
      console.log('🔑 Chave MP configurada:', MERCADOPAGO_PUBLIC_KEY.slice(0, 20) + '...');

      const preference = {
        items: [
          {
            id: plan.id,
            title: `${plan.name} - RotaFacil`,
            description: plan.description,
            quantity: 1,
            unit_price: parseFloat(plan.total),
            currency_id: 'BRL',
          }
        ],
        payer: {
          name: paymentData.userName,
          email: paymentData.userEmail,
        },
        payment_methods: {
          excluded_payment_types: [],
          installments: plan.frequency > 1 ? plan.frequency : 1,
        },
        back_urls: {
          success: `${window.location.origin}/app?payment=success`,
          failure: `${window.location.origin}/app?payment=failure`,
          pending: `${window.location.origin}/app?payment=pending`,
        },
        auto_return: 'approved',
        external_reference: paymentData.userId,
        metadata: {
          user_id: paymentData.userId,
          plan_id: plan.id,
          subscription_type: 'new',
        },
        notification_url: `${window.location.origin}/api/webhooks/mercadopago`,
      };

      console.log('📋 Preferência criada:', preference);

      // Criar preferência real no Mercado Pago
      const response = await this.createPreferenceReal(preference);
      console.log('✅ Resposta do MP:', response);
      return response;
    } catch (error) {
      console.error('❌ Erro ao criar preferência:', error);
      throw error;
    }
  }

  private async createPreferenceReal(preference: any): Promise<PaymentResult> {
    console.log('🚀 Criando preferência real no Mercado Pago...');
    console.log('🔑 Token usado:', MERCADOPAGO_ACCESS_TOKEN.slice(0, 20) + '...');
    console.log('📋 Dados da preferência:', JSON.stringify(preference, null, 2));
    
    // Fazer chamada real para a API do Mercado Pago
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erro na API do Mercado Pago:', errorData);
      console.error('📋 Preferência que causou erro:', JSON.stringify(preference, null, 2));
      throw new Error(`Erro na API do Mercado Pago: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Preferência criada com sucesso:', result.id);
    console.log('🔗 URL de pagamento:', result.init_point);
    
    return result;
  }

  public async createSubscriptionPreference(plan: SubscriptionPlan, paymentData: PaymentData): Promise<PaymentResult> {
    try {
      // Para assinaturas recorrentes, usamos o plan_id do Mercado Pago
      const subscriptionData = {
        preapproval_plan_id: plan.mercadopago_plan_id,
        payer_email: paymentData.userEmail,
        card_token_id: '', // Será preenchido após a coleta dos dados do cartão
        external_reference: paymentData.userId,
        back_url: `${window.location.origin}/subscription/success`,
      };

      // Simula a criação da assinatura
      const response = await this.mockCreateSubscription(subscriptionData);
      return response;
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw new Error('Erro ao processar assinatura');
    }
  }

  private async mockCreateSubscription(subscriptionData: any): Promise<PaymentResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockId = `SUB-${Date.now()}`;
        resolve({
          id: mockId,
          status: 'pending',
          init_point: `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=${mockId}`,
          sandbox_init_point: `https://sandbox.mercadopago.com.br/subscriptions/checkout?preapproval_id=${mockId}`,
        });
      }, 1000);
    });
  }

  public async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      // Em produção, isso seria uma chamada para seu backend
      // que consultaria o status do pagamento no Mercado Pago
      
      return this.mockGetPaymentStatus(paymentId);
    } catch (error) {
      console.error('Erro ao consultar status do pagamento:', error);
      throw error;
    }
  }

  private async mockGetPaymentStatus(paymentId: string): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: paymentId,
          status: 'approved',
          status_detail: 'accredited',
          transaction_amount: 29.90,
          currency_id: 'BRL',
          date_approved: new Date().toISOString(),
        });
      }, 500);
    });
  }

  public formatPrice(price: string | number): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  public calculateDiscount(originalPrice: number, discountPercent: number): number {
    return originalPrice * (discountPercent / 100);
  }

  public calculateTotalWithDiscount(originalPrice: number, discountPercent: number): number {
    return originalPrice - this.calculateDiscount(originalPrice, discountPercent);
  }
}

// Instância singleton
export const mercadoPagoService = MercadoPagoService.getInstance();

// Declaração global para o SDK do Mercado Pago
declare global {
  interface Window {
    MercadoPago: any;
  }
}
