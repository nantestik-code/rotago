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
  user_subscription_id?: string;
}

export class AsaasService {
  private static instance: AsaasService;

  public static getInstance(): AsaasService {
    if (!AsaasService.instance) {
      AsaasService.instance = new AsaasService();
    }
    return AsaasService.instance;
  }

  public async createCheckout(plan: SubscriptionPlan, paymentData: PaymentData): Promise<PaymentResult> {
    const { data, error } = await supabase.functions.invoke('asaas-checkout', {
      body: {
        action: 'create_checkout',
        planId: plan.id,
        payerEmail: paymentData.userEmail,
        payerName: paymentData.userName,
        origin: window.location.origin,
      },
    });

    if (error) throw new Error(error.message || 'Falha ao criar checkout Asaas');
    if (data?.error) throw new Error(data.error);
    if (!data?.init_point) throw new Error('Asaas nao retornou URL de pagamento');
    return data as PaymentResult;
  }

  public async syncPayment(subscriptionId: string) {
    const { data, error } = await supabase.functions.invoke('asaas-checkout', {
      body: { action: 'sync_payment', subscriptionId },
    });
    if (error) throw new Error(error.message || 'Falha ao sincronizar pagamento');
    if (data?.error) throw new Error(data.error);
    return data;
  }

  public async getAdminSettings() {
    const { data, error } = await supabase.functions.invoke('asaas-checkout', {
      body: { action: 'get_admin_settings' },
    });
    if (error) throw new Error(error.message || 'Falha ao carregar configuracoes Asaas');
    return data;
  }

  public async saveAdminSettings(settings: {
    asaas_api_key?: string;
    asaas_sandbox?: string;
    asaas_webhook_token?: string;
  }) {
    const { data, error } = await supabase.functions.invoke('asaas-checkout', {
      body: { action: 'save_admin_settings', ...settings },
    });
    if (error) throw new Error(error.message || 'Falha ao salvar configuracoes Asaas');
    if (data?.error) throw new Error(data.error);
    return data;
  }

  public async testAdminConnection(apiKey?: string, sandbox?: string) {
    const { data, error } = await supabase.functions.invoke('asaas-checkout', {
      body: { action: 'test_admin_connection', asaas_api_key: apiKey, asaas_sandbox: sandbox },
    });
    if (error) throw new Error(error.message || 'Falha ao testar conexao Asaas');
    if (data?.error) throw new Error(data.error);
    return data;
  }

  public async adminActivate(subscriptionId: string) {
    const { data, error } = await supabase.functions.invoke('asaas-checkout', {
      body: { action: 'admin_activate', subscriptionId },
    });
    if (error) throw new Error(error.message || 'Falha ao liberar assinatura');
    if (data?.error) throw new Error(data.error);
    return data;
  }

  public async adminSync(subscriptionId: string) {
    const { data, error } = await supabase.functions.invoke('asaas-checkout', {
      body: { action: 'admin_sync', subscriptionId },
    });
    if (error) throw new Error(error.message || 'Falha ao sincronizar Asaas');
    if (data?.error) throw new Error(data.error);
    return data;
  }

  public formatPrice(price: string | number): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}

export const asaasService = AsaasService.getInstance();
