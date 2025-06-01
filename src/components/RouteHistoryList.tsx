import React, { useEffect, useState } from 'react';
import { useRouteHistory, RouteAction } from '@/hooks/use-route-history';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, MapPin, RotateCw, CheckCircle, AlertTriangle, User, LogIn, LogOut, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RouteHistoryItem {
  id: string;
  user_id: string;
  route_id: string | null;
  created_at: string;
  action: RouteAction;
  details: any;
  routes?: {
    id: string;
    name: string;
    status: string;
    total_distance: number;
    estimated_duration: number;
  } | null;
  profiles?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

interface RouteHistoryListProps {
  showUserInfo?: boolean;
  routeId?: string;
  limit?: number;
}

// Função para formatar a data no formato relativo (ex: "há 2 horas")
const formatRelativeTime = (dateString: string) => {
  try {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true,
      locale: ptBR
    });
  } catch (error) {
    return 'Data desconhecida';
  }
};

// Função para obter o ícone da ação
const getActionIcon = (action: RouteAction) => {
  switch (action) {
    case 'create':
      return <Plus size={16} />;
    case 'optimize':
      return <RotateCw size={16} />;
    case 'complete':
      return <CheckCircle size={16} />;
    case 'status_change':
      return <AlertTriangle size={16} />;
    case 'login':
      return <LogIn size={16} />;
    case 'logout':
      return <LogOut size={16} />;
    default:
      return <Clock size={16} />;
  }
};

// Função para obter a cor do badge da ação
const getActionColor = (action: RouteAction) => {
  switch (action) {
    case 'create':
      return 'bg-green-100 text-green-800';
    case 'optimize':
      return 'bg-blue-100 text-blue-800';
    case 'complete':
      return 'bg-purple-100 text-purple-800';
    case 'status_change':
      return 'bg-yellow-100 text-yellow-800';
    case 'delete':
      return 'bg-red-100 text-red-800';
    case 'login':
      return 'bg-teal-100 text-teal-800';
    case 'logout':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Função para obter o texto da ação
const getActionText = (action: RouteAction) => {
  switch (action) {
    case 'create':
      return 'Criação';
    case 'optimize':
      return 'Otimização';
    case 'update':
      return 'Atualização';
    case 'complete':
      return 'Conclusão';
    case 'delete':
      return 'Exclusão';
    case 'status_change':
      return 'Mudança de Status';
    case 'login':
      return 'Login';
    case 'logout':
      return 'Logout';
    case 'signup':
      return 'Cadastro';
    default:
      return action;
  }
};

export function RouteHistoryList({ showUserInfo = false, routeId, limit = 10 }: RouteHistoryListProps) {
  const { getUserRouteHistory, getAllRouteHistory, getRouteHistory } = useRouteHistory();
  const { user, profile } = useAuth();
  const [historyItems, setHistoryItems] = useState<RouteHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    console.log('Carregando histórico de rotas...', {
      routeId,
      showUserInfo,
      limit,
      page
    });
    
    try {
      let result;
      
      if (routeId) {
        // Buscar histórico de uma rota específica
        console.log(`Buscando histórico da rota ${routeId}`);
        result = await getRouteHistory(routeId, limit, page);
      } else if (showUserInfo) {
        // Buscar histórico de todos os usuários (admin)
        console.log('Buscando histórico de todos os usuários (admin)');
        result = await getAllRouteHistory(limit, page);
      } else {
        // Buscar histórico do usuário atual
        console.log('Buscando histórico do usuário atual');
        result = await getUserRouteHistory(limit, page);
      }
      
      console.log('Resultado da busca:', result);
      
      if (result.error) {
        console.error('Erro retornado pela API:', result.error);
        setError(result.error);
        return;
      }
      
      if (result.data) {
        console.log(`${result.data.length} itens de histórico carregados`);
        setHistoryItems(result.data);
        setHasMore(result.data.length === limit);
      } else {
        console.log('Nenhum item de histórico encontrado');
        setHistoryItems([]);
        setHasMore(false);
      }
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error);
      setError(error.message || 'Erro ao carregar histórico');
    } finally {
      setIsLoading(false);
    }
  }, [routeId, showUserInfo, limit, page, getRouteHistory, getAllRouteHistory, getUserRouteHistory]);

  // Carregar histórico ao montar o componente
  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, page, routeId]);

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  // Renderizar estado de carregamento
  if (isLoading && historyItems.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
        <p className="text-sm text-gray-500">Carregando histórico...</p>
      </div>
    );
  }

  // Renderizar mensagem de erro
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">{error}</p>
        <div className="text-sm text-gray-500 mb-2">
          Se o problema persistir, tente recarregar a página ou fazer logout e login novamente.
        </div>
        <Button 
          variant="outline" 
          onClick={loadHistory} 
          className="mt-2"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Renderizar lista vazia
  if (historyItems.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Nenhum registro de histórico encontrado.</p>
        <Button 
          variant="outline" 
          onClick={loadHistory} 
          className="mt-2 text-sm"
          size="sm"
        >
          Atualizar
        </Button>
        <p className="text-xs text-gray-400 mt-2">
          O histórico é gerado automaticamente ao criar rotas e atualizar status de entregas.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {historyItems.map((item) => (
        <Card key={item.id} className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`${getActionColor(item.action)} flex items-center gap-1`}>
                  {getActionIcon(item.action)}
                  {getActionText(item.action)}
                </Badge>
                {item.routes && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <MapPin size={14} />
                    {item.routes.name || 'Rota sem nome'}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(item.created_at)}
              </span>
            </div>
            
            {showUserInfo && item.profiles && (
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <User size={14} className="mr-1" />
                {item.profiles.full_name || 'Usuário'}
                {item.profiles.role === 'admin' && (
                  <Badge variant="secondary" className="ml-2 text-xs">Admin</Badge>
                )}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="pb-3 pt-0">
            <p className="text-sm">
              {item.details?.message || 
               (item.routes ? 
                `Ação em ${item.routes.name || 'rota sem nome'}` : 
                'Ação no sistema')}
            </p>
            
            {item.details?.delivery_id && (
              <p className="text-xs text-gray-600 mt-1">
                Entrega: {item.details.delivery_id}
              </p>
            )}
            
            {item.details?.previous_status && item.details?.new_status && (
              <div className="flex items-center gap-2 mt-1 text-xs">
                <Badge variant="outline" className="bg-gray-100">
                  {item.details.previous_status}
                </Badge>
                <span>→</span>
                <Badge variant="outline" className="bg-green-100">
                  {item.details.new_status}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      {hasMore && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={loadMore} 
          disabled={loading}
        >
          {loading ? (
            <>
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
              Carregando...
            </>
          ) : 'Carregar mais'}
        </Button>
      )}
    </div>
  );
}
