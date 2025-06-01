import { useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';

/**
 * Hook para rastrear atividade do usuário e manter a sessão ativa
 * Renova o token de autenticação quando o usuário interage com a aplicação
 */
export function useActivityTracker() {
  const { refreshToken } = useAuth();

  const handleUserActivity = useCallback(() => {
    // Renovar o token a cada interação significativa do usuário
    // Isso ajuda a manter a sessão ativa durante o uso do aplicativo
    if (refreshToken) {
      refreshToken();
    }
  }, [refreshToken]);

  useEffect(() => {
    // Lista de eventos de interação do usuário para monitorar
    const events = [
      'mousedown',
      'keydown',
      'touchstart',
      'scroll'
    ];

    // Usar um debounce para não chamar a renovação de token com muita frequência
    let timeout: number | null = null;
    
    const debouncedHandler = () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      
      timeout = window.setTimeout(() => {
        handleUserActivity();
      }, 60000); // Renovar token no máximo a cada 1 minuto
    };

    // Adicionar listeners para todos os eventos
    events.forEach(event => {
      window.addEventListener(event, debouncedHandler, { passive: true });
    });

    // Limpar listeners quando o componente for desmontado
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, debouncedHandler);
      });
      
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [handleUserActivity]);

  // Este hook não retorna nada, apenas configura os listeners
  return null;
}

export default useActivityTracker;
