
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsAdmin } from "@/hooks/use-admin-auth";
import { Loader2 } from "lucide-react";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated, isLoading, session } = useAuth();
  const { subscription, subscriptionLoading, isSubscriptionActive, isPendingConfirmation } = useSubscription();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();

  if (isLoading || subscriptionLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="flex items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !session) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Admins sempre têm acesso total — sem bloqueio de assinatura
  if (isAdmin) {
    return <>{children}</>;
  }

  // Se já está na página de assinatura, não redirecionar
  if (location.pathname === '/subscription') {
    return <>{children}</>;
  }

  if (isPendingConfirmation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-lg font-medium text-slate-800">Confirmando pagamento</p>
        <p className="max-w-sm text-sm text-slate-500">
          O Asaas ainda esta processando. Esta tela atualiza sozinha em instantes.
        </p>
      </div>
    );
  }

  if (!subscription || !isSubscriptionActive) {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
