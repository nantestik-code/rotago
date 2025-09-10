import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// Configurar status bar para apps nativos
export const configureStatusBar = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Configurar estilo da status bar
      await StatusBar.setStyle({ style: Style.Light });
      
      // Configurar cor de fundo da status bar
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      
      // Mostrar a status bar
      await StatusBar.show();
      
      console.log('Status bar configurada com sucesso');
    } catch (error) {
      console.error('Erro ao configurar status bar:', error);
    }
  }
};

// Configurar viewport para apps nativos
export const configureViewport = () => {
  if (Capacitor.isNativePlatform()) {
    // Adicionar padding-top para compensar a status bar nativa
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.style.paddingTop = 'env(safe-area-inset-top)';
      rootElement.style.paddingBottom = 'env(safe-area-inset-bottom)';
    }
    
    // Configurar meta viewport para apps nativos
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 
        'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no'
      );
    }
  }
};

// Detectar se é app nativo
export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Configuração inicial para apps nativos
export const initializeNativeApp = async () => {
  if (isNativeApp()) {
    await configureStatusBar();
    configureViewport();
  }
};
