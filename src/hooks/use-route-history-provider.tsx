import React, { createContext, useContext, ReactNode } from 'react';
import { useRouteHistory } from '@/hooks/use-route-history';

// Definindo um tipo para o valor padrão do contexto
type RouteHistoryContextType = ReturnType<typeof useRouteHistory> | null;

// Contexto para o histórico de rotas com valor padrão null
const RouteHistoryContext = createContext<RouteHistoryContextType>(null);

// Provider para o histórico de rotas com tratamento de erros
export function RouteHistoryProvider({ children }: { children: ReactNode }) {
  // Usando o hook diretamente no componente (não dentro de um useEffect)
  let routeHistory: RouteHistoryContextType = null;
  
  try {
    // Usar try/catch para capturar erros na inicialização do hook
    routeHistory = useRouteHistory();
  } catch (err) {
    console.error('Erro ao inicializar RouteHistoryProvider:', err);
    // Continuar com routeHistory como null
  }
  
  // Se não conseguir inicializar o hook, continuar com valor null
  // O componente que usa o contexto deve verificar se o valor é null
  
  return (
    <RouteHistoryContext.Provider value={routeHistory}>
      {children}
    </RouteHistoryContext.Provider>
  );
}

// Hook para usar o histórico de rotas
export function useRouteHistoryContext() {
  const context = useContext(RouteHistoryContext);
  
  if (context === undefined) {
    throw new Error('useRouteHistoryContext must be used within a RouteHistoryProvider');
  }
  
  // Se o contexto for null, significa que houve um erro na inicialização do hook useRouteHistory
  if (context === null) {
    // Retornar um objeto com métodos vazios para evitar erros em componentes que usam o contexto
    return {
      getUserRouteHistory: async () => ({ data: null, error: 'Erro ao inicializar o histórico de rotas' }),
      getAllRouteHistory: async () => ({ data: null, error: 'Erro ao inicializar o histórico de rotas' }),
      getRouteHistory: async () => ({ data: null, error: 'Erro ao inicializar o histórico de rotas' }),
      logRouteAction: async () => ({ success: false, error: 'Erro ao inicializar o histórico de rotas' }),
      syncPendingActions: async () => ({ success: false, error: 'Erro ao inicializar o histórico de rotas' }),
      pendingActions: [],
      isLoading: false,
      error: 'Erro ao inicializar o histórico de rotas'
    } as ReturnType<typeof useRouteHistory>;
  }
  
  return context;
}
