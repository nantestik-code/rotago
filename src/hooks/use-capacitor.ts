import { useEffect, useState } from 'react';

export const useCapacitor = () => {
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkCapacitor = async () => {
      try {
        // Verificar se Capacitor está disponível
        if (window.Capacitor) {
          setIsCapacitor(true);
          
          // Adicionar classe CSS ao body para styling específico
          document.body.classList.add('capacitor-app');
          
          // Aguardar Capacitor estar pronto
          await window.Capacitor.Plugins.Device.getInfo();
          setIsReady(true);
          
          console.log('📱 Capacitor detectado - App nativo');
        } else {
          setIsCapacitor(false);
          setIsReady(true);
          
          // Remover classe se não for Capacitor
          document.body.classList.remove('capacitor-app');
          
          console.log('🌐 Executando no navegador web');
        }
      } catch (error) {
        console.log('⚠️ Erro ao detectar Capacitor:', error);
        setIsCapacitor(false);
        setIsReady(true);
      }
    };

    checkCapacitor();
  }, []);

  return {
    isCapacitor,
    isReady,
    isWeb: !isCapacitor
  };
};

// Função utilitária para verificar se é Capacitor
export const isCapacitorApp = (): boolean => {
  return !!(window as any).Capacitor;
};

// Tipos para TypeScript
declare global {
  interface Window {
    Capacitor?: {
      Plugins: {
        Device: {
          getInfo(): Promise<any>;
        };
      };
    };
  }
}
