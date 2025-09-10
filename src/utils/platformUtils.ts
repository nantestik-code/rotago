// Utilitários para detectar plataforma e ambiente
export const isMobileApp = (): boolean => {
  // Detectar se está rodando no Capacitor (app mobile)
  return !!(window as any).Capacitor;
};

export const isWebBrowser = (): boolean => {
  // Detectar se está rodando no navegador web
  return !(window as any).Capacitor;
};

export const getPlatform = (): 'web' | 'mobile' => {
  return isMobileApp() ? 'mobile' : 'web';
};

export const shouldRedirectToApp = (): boolean => {
  // Só redirecionar para /app se estiver no mobile
  return isMobileApp();
};
