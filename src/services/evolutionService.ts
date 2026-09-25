import { supabase } from '@/integrations/supabase/client';

export interface EvolutionSettings {
  apiUrl: string;
  instance: string;
  apiKey: string;
}

export interface EvolutionConnectionResult {
  connected: boolean;
  instanceName: string;
  state: string;
}

class EvolutionService {
  /**
   * Busca credenciais da Evolution salvas em system_settings via Edge Function.
   * A api_key retorna mascarada (ex: "****E35E0").
   */
  async getSettings(): Promise<EvolutionSettings> {
    const { data, error } = await supabase.functions.invoke('whatsapp-notify', {
      body: { action: 'get_evolution_settings' },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao carregar configurações da Evolution API');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return {
      apiUrl: data?.api_url || '',
      instance: data?.instance || '',
      apiKey: data?.api_key || '',
    };
  }

  /**
   * Salva credenciais da Evolution via Edge Function.
   * Se api_key for mascarada (****), mantém a existente.
   */
  async saveSettings(apiUrl: string, instance: string, apiKey: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('whatsapp-notify', {
      body: {
        action: 'save_evolution_settings',
        api_url: apiUrl,
        instance,
        api_key: apiKey,
      },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao salvar configurações da Evolution API');
    }

    if (data?.error) {
      throw new Error(data.error);
    }
  }

  /**
   * Testa conexão com a Evolution API via Edge Function.
   */
  async testConnection(): Promise<EvolutionConnectionResult> {
    const { data, error } = await supabase.functions.invoke('whatsapp-notify', {
      body: { action: 'test_evolution_connection' },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao testar conexão com a Evolution API');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return {
      connected: data?.connected ?? false,
      instanceName: data?.instanceName ?? '',
      state: data?.state ?? 'unknown',
    };
  }
}

export const evolutionService = new EvolutionService();
