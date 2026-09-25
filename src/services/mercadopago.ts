import { SubscriptionPlan } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

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
  sandbox_init_point?: string;
  user_subscription_id?: string;
}

export interface MercadoPagoAdminSettings {
  mp_public_key: string;
  mp_access_token: string;
  mp_webhook_url: string;
  mp_sandbox_mode: string;
  access_token_configured?: boolean;
}

export class MercadoPagoService {
  private static instance: MercadoPagoService;

  public static getInstance(): MercadoPagoService {
    if (!MercadoPagoService.instance) {
      MercadoPagoService.instance = new MercadoPagoService();
    }
    return MercadoPagoService.instance;
  }

  public async createPreference(plan: SubscriptionPlan, paymentData: PaymentData): Promise<PaymentResult> {
    const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
      body: {
        action: 'create_checkout_pro_preference',
        planId: plan.id,
        payerEmail: paymentData.userEmail,
        payerName: paymentData.userName,
        origin: window.location.origin,
      },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao criar preferencia do Checkout Pro');
    }

    if (!data?.init_point) {
      throw new Error(data?.error || 'Mercado Pago nao retornou URL de pagamento');
    }

    return data as PaymentResult;
  }

  public async syncPaymentStatus(paymentId: string) {
    const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
      body: {
        action: 'sync_payment_status',
        paymentId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao sincronizar pagamento');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  public async getAdminSettings(): Promise<MercadoPagoAdminSettings> {
    const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
      body: {
        action: 'get_admin_settings',
      },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao carregar configuracoes do Mercado Pago');
    }

    return {
      mp_public_key: data?.mp_public_key || '',
      mp_access_token: '',
      mp_webhook_url: data?.mp_webhook_url || '',
      mp_sandbox_mode: data?.mp_sandbox_mode || 'false',
      access_token_configured: Boolean(data?.access_token_configured),
    };
  }

  public async saveAdminSettings(settings: MercadoPagoAdminSettings) {
    const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
      body: {
        action: 'save_admin_settings',
        mp_public_key: settings.mp_public_key,
        mp_access_token: settings.mp_access_token,
        mp_webhook_url: settings.mp_webhook_url,
        mp_sandbox_mode: settings.mp_sandbox_mode,
      },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao salvar configuracoes do Mercado Pago');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  public async testAdminConnection(accessToken?: string) {
    const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
      body: {
        action: 'test_admin_connection',
        mp_access_token: accessToken,
      },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao testar conexao com o Mercado Pago');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  public formatPrice(price: string | number): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  public calculateDiscount(originalPrice: number, discountPercent: number): number {
    return originalPrice * (discountPercent / 100);
  }

  public calculateTotalWithDiscount(originalPrice: number, discountPercent: number): number {
    return originalPrice - this.calculateDiscount(originalPrice, discountPercent);
  }
}

export const mercadoPagoService = MercadoPagoService.getInstance();
