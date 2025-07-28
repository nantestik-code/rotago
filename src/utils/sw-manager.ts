// Gerenciador do Service Worker
// Controla registro, atualizações e comunicação com SW

export interface SWUpdateInfo {
  type: 'SW_UPDATED' | 'FORCE_RELOAD' | 'VERSION_INFO' | 'FORCE_UPDATE_REQUESTED';
  version?: string;
  message?: string;
  cacheName?: string;
}

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateCallbacks: ((info: SWUpdateInfo) => void)[] = [];
  private isUpdateAvailable = false;

  constructor() {
    this.init();
  }

  /**
   * Inicializa o Service Worker
   */
  private async init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ [SW-Manager] Service Worker não suportado neste navegador');
      return;
    }

    try {
      console.log('🔧 [SW-Manager] Registrando Service Worker...');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ [SW-Manager] Service Worker registrado:', this.registration.scope);

      // Escutar atualizações
      this.registration.addEventListener('updatefound', () => {
        console.log('🔄 [SW-Manager] Nova versão encontrada');
        this.handleUpdateFound();
      });

      // Escutar mensagens do SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleSWMessage(event.data);
      });

      // Verificar se já existe uma atualização pendente
      if (this.registration.waiting) {
        console.log('⏳ [SW-Manager] Atualização pendente detectada');
        this.isUpdateAvailable = true;
        this.notifyUpdateAvailable();
      }

      // Verificar atualizações periodicamente
      this.startUpdateCheck();

    } catch (error) {
      console.error('❌ [SW-Manager] Erro ao registrar Service Worker:', error);
    }
  }

  /**
   * Manipula quando uma nova versão é encontrada
   */
  private handleUpdateFound() {
    if (!this.registration) return;

    const newWorker = this.registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('🎉 [SW-Manager] Nova versão instalada e pronta');
        this.isUpdateAvailable = true;
        this.notifyUpdateAvailable();
      }
    });
  }

  /**
   * Manipula mensagens do Service Worker
   */
  private handleSWMessage(data: SWUpdateInfo) {
    console.log('📨 [SW-Manager] Mensagem do SW:', data);

    switch (data.type) {
      case 'SW_UPDATED':
        this.isUpdateAvailable = true;
        this.notifyUpdateAvailable(data);
        break;

      case 'FORCE_RELOAD':
        console.log('🔄 [SW-Manager] Recarregamento forçado solicitado');
        window.location.reload();
        break;

      case 'VERSION_INFO':
        console.log('ℹ️ [SW-Manager] Versão atual:', data.version);
        break;

      case 'FORCE_UPDATE_REQUESTED':
        this.forceUpdate();
        break;
    }

    // Notificar callbacks registrados
    this.updateCallbacks.forEach(callback => callback(data));
  }

  /**
   * Notifica sobre atualização disponível
   */
  private notifyUpdateAvailable(info?: SWUpdateInfo) {
    const updateInfo: SWUpdateInfo = {
      type: 'SW_UPDATED',
      message: 'Nova versão disponível!',
      ...info
    };

    this.updateCallbacks.forEach(callback => callback(updateInfo));
  }

  /**
   * Inicia verificação periódica de atualizações
   */
  private startUpdateCheck() {
    // Verifica atualizações a cada 30 minutos
    setInterval(() => {
      this.checkForUpdates();
    }, 30 * 60 * 1000);

    // Verifica quando a aba fica ativa
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });
  }

  /**
   * Verifica manualmente por atualizações
   */
  public async checkForUpdates(): Promise<boolean> {
    if (!this.registration) {
      console.warn('⚠️ [SW-Manager] Service Worker não registrado');
      return false;
    }

    try {
      console.log('🔍 [SW-Manager] Verificando atualizações...');
      
      const registration = await this.registration.update();
      
      if (registration.waiting && !this.isUpdateAvailable) {
        console.log('🆕 [SW-Manager] Nova versão encontrada na verificação manual');
        this.isUpdateAvailable = true;
        this.notifyUpdateAvailable();
        return true;
      }

      console.log('✅ [SW-Manager] Nenhuma atualização encontrada');
      return false;
    } catch (error) {
      console.error('❌ [SW-Manager] Erro ao verificar atualizações:', error);
      return false;
    }
  }

  /**
   * Aplica a atualização disponível
   */
  public async applyUpdate(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      console.warn('⚠️ [SW-Manager] Nenhuma atualização disponível');
      return;
    }

    console.log('🔄 [SW-Manager] Aplicando atualização...');

    // Envia mensagem para o SW pular a espera
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Aguarda a ativação e recarrega
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 [SW-Manager] Controlador alterado - recarregando página');
      window.location.reload();
    });
  }

  /**
   * Força atualização completa (limpa cache)
   */
  public async forceUpdate(): Promise<void> {
    console.log('💥 [SW-Manager] Forçando atualização completa...');

    if (this.registration && this.registration.active) {
      // Envia mensagem para limpar cache
      this.registration.active.postMessage({ type: 'FORCE_UPDATE' });
    } else {
      // Fallback: limpa cache manualmente e recarrega
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Limpa localStorage relacionado ao cache
      localStorage.removeItem('sw-cache-version');
      
      console.log('🔄 [SW-Manager] Cache limpo - recarregando...');
      window.location.reload();
    }
  }

  /**
   * Obtém informações da versão atual
   */
  public async getVersionInfo(): Promise<SWUpdateInfo | null> {
    if (!this.registration || !this.registration.active) {
      return null;
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration!.active!.postMessage(
        { type: 'GET_VERSION' },
        [channel.port2]
      );

      // Timeout após 5 segundos
      setTimeout(() => resolve(null), 5000);
    });
  }

  /**
   * Registra callback para atualizações
   */
  public onUpdate(callback: (info: SWUpdateInfo) => void): () => void {
    this.updateCallbacks.push(callback);
    
    // Retorna função para remover o callback
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Verifica se há atualização disponível
   */
  public get hasUpdateAvailable(): boolean {
    return this.isUpdateAvailable;
  }

  /**
   * Obtém o status do Service Worker
   */
  public get status(): {
    supported: boolean;
    registered: boolean;
    active: boolean;
    updateAvailable: boolean;
  } {
    return {
      supported: 'serviceWorker' in navigator,
      registered: !!this.registration,
      active: !!this.registration?.active,
      updateAvailable: this.isUpdateAvailable
    };
  }
}

// Instância singleton
export const swManager = new ServiceWorkerManager();

// Utilitários para uso direto
export const checkForUpdates = () => swManager.checkForUpdates();
export const applyUpdate = () => swManager.applyUpdate();
export const forceUpdate = () => swManager.forceUpdate();
export const getVersionInfo = () => swManager.getVersionInfo();
export const onSWUpdate = (callback: (info: SWUpdateInfo) => void) => swManager.onUpdate(callback);
