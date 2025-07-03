import { SubscriptionPlan } from '@/hooks/useSubscription';

// Configuração do Mercado Pago
const MERCADOPAGO_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || 'TEST-your-public-key';

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
    try {
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
          success: `${window.location.origin}/subscription/success`,
          failure: `${window.location.origin}/subscription/failure`,
          pending: `${window.location.origin}/subscription/pending`,
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

      // Simula a criação da preferência (em produção, isso seria feito no backend)
      const response = await this.mockCreatePreference(preference);
      return response;
    } catch (error) {
      console.error('Erro ao criar preferência:', error);
      throw new Error('Erro ao processar pagamento');
    }
  }

  private async mockCreatePreference(preference: any): Promise<PaymentResult> {
    // Em produção, isso seria uma chamada para seu backend
    // que criaria a preferência usando o SDK do Mercado Pago server-side
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockId = `PREF-${Date.now()}`;
        resolve({
          id: mockId,
          status: 'pending',
          init_point: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${mockId}`,
          sandbox_init_point: `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=${mockId}`,
        });
      }, 1000);
    });
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
