import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'super_admin' | 'moderator';
}

export default function AdminRoute({ children, requiredRole = 'admin' }: AdminRouteProps) {
  const { admin, isLoading, hasPermission } = useAdminAuth();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">
            Verificando permissões de administrador...
          </p>
        </div>
      </div>
    );
  }

  // Se não está logado como admin, redirecionar para login admin
  if (!admin) {
    return (
      <Navigate 
        to="/admin/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Se está logado mas não tem a permissão necessária
  if (!hasPermission(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta área.
          </p>
          <p className="text-sm text-muted-foreground">
            Permissão necessária: <span className="font-mono">{requiredRole}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Sua permissão atual: <span className="font-mono">{admin.role}</span>
          </p>
        </div>
      </div>
    );
  }

  // Se tudo está ok, renderizar o conteúdo
  return <>{children}</>;
}