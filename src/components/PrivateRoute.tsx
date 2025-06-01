
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated, isLoading, session } = useAuth();
  const location = useLocation();
  const [showTimeout, setShowTimeout] = useState(false);
  
  // Adicionar um timeout para evitar loading infinito
  useEffect(() => {
    // Se estiver carregando por mais de 5 segundos, mostrar mensagem adicional
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setShowTimeout(true);
        console.log('Timeout de carregamento atingido');
      }
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // Verificar se há uma sessão no localStorage como fallback
  useEffect(() => {
    if (isLoading && showTimeout) {
      // Tentar verificar o localStorage como fallback
      const localSession = localStorage.getItem('supabase.auth.token');
      if (!localSession) {
        console.log('Nenhuma sessão encontrada no localStorage, redirecionando para login');
        window.location.href = '/auth/login';
      }
    }
  }, [isLoading, showTimeout]);

  // Mostrar loading enquanto o auth está carregando
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="flex items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Carregando...</span>
        </div>
        
        {showTimeout && (
          <div className="mt-4 text-center max-w-md">
            <p className="text-amber-600 font-medium">O carregamento está demorando mais que o esperado.</p>
            <p className="text-sm text-gray-600 mt-1">Se o problema persistir, tente atualizar a página ou fazer login novamente.</p>
            <button 
              onClick={() => window.location.href = '/auth/login'}
              className="mt-3 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              Ir para Login
            </button>
          </div>
        )}
      </div>
    );
  }

  // Se não está autenticado, redirecionar para login
  if (!isAuthenticated && !session) {
    console.log('Usuário não autenticado, redirecionando para login');
    // Redirect to login page but save the current location they were trying to access
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
