import { toast } from "@/hooks/use-toast";
import notificationCache from "@/utils/notification-manager";

type ToastType = 'login' | 'location' | 'navigation' | 'route' | 'optimization' | 'status' | 'error' | 'default';

interface SmartToastOptions {
  type?: ToastType | string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

/**
 * Hook para exibir notificações de forma inteligente, evitando duplicações
 * e limitando a frequência de notificações do mesmo tipo
 */
export function useSmartToast() {
  return function smartToast(options: SmartToastOptions) {
    const { type = "default", title, description, ...rest } = options;
    
    // Criar uma string de conteúdo para comparar notificações
    const contentKey = `${title}|${description || ''}`;
    
    // Verificar se pode exibir a notificação
    if (notificationCache.shouldShow(type, contentKey)) {
      // Exibir a notificação
      return toast({
        title,
        description,
        ...rest
      });
    }
    
    // Retornar um objeto vazio se a notificação for bloqueada
    return { id: "", dismiss: () => {} };
  };
}

// Exportar uma versão simplificada para uso direto sem hook
export function smartToast(options: SmartToastOptions) {
  const { type = "default", title, description, ...rest } = options;
  
  // Criar uma string de conteúdo para comparar notificações
  const contentKey = `${title}|${description || ''}`;
  
  // Verificar se pode exibir a notificação
  if (notificationCache.shouldShow(type, contentKey)) {
    // Exibir a notificação
    return toast({
      title,
      description,
      ...rest
    });
  }
  
  // Retornar um objeto vazio se a notificação for bloqueada
  return { id: "", dismiss: () => {} };
}
