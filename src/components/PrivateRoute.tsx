
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
  // Mostrar loading enquanto o auth está carregando
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="flex items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Carregando...</span>
        </div>
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
