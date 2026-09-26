import React, { useEffect, useState, useCallback } from 'react';
import { useRouteHistory, RouteAction } from '@/hooks/use-route-history';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, RotateCw, CheckCircle, AlertTriangle, User, LogIn, LogOut, Plus, Trash2, BarChart2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { smartToast } from '@/hooks/use-smart-toast';

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
      return 'bg-brand-100 text-brand-800';
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

export const RouteHistoryList = ({ showUserInfo = false, routeId, limit = 10 }: RouteHistoryListProps) => {
  const { user } = useAuth();
  // Usando o hook com tipagem corrigida
  const routeHistory = useRouteHistory() as any;
  const getUserRouteHistory = routeHistory.getUserRouteHistory;
  const getAllRouteHistory = routeHistory.getAllRouteHistory;
  const getRouteHistory = routeHistory.getRouteHistory;
  const deleteRoute = routeHistory.deleteRoute;
  const [historyItems, setHistoryItems] = useState<RouteHistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [routeStats, setRouteStats] = useState<{
    total: number;
    entregue: number;
    pendente: number;
    ocorrencia: number;
  }>({ total: 0, entregue: 0, pendente: 0, ocorrencia: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedRouteName, setSelectedRouteName] = useState<string>('');
  const [loadingRouteId, setLoadingRouteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLoadRoute = useCallback(async (rid: string, rname?: string) => {
    if (!rid) return;
    if (!user) {
      smartToast({
        title: 'Ação não permitida',
        description: 'Você precisa estar logado para carregar uma rota.',
        variant: 'destructive'
      });
      return;
    }
    try {
      setLoadingRouteId(rid);
      // Validar propriedade da rota
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select('id, user_id, name')
        .eq('id', rid)
        .maybeSingle();
      if (routeError) {
        throw routeError;
      }
      if (!routeData) {
        smartToast({
          title: 'Rota não encontrada',
          description: 'Não foi possível localizar a rota selecionada.',
          variant: 'destructive'
        });
        return;
      }
      if ((routeData as any).user_id && (routeData as any).user_id !== user.id) {
        smartToast({
          title: 'Sem permissão',
          description: 'Você não pode carregar uma rota de outro usuário.',
          variant: 'destructive'
        });
        return;
      }

      // Buscar entregas vinculadas à rota com join
      const { data: routeDeliveries, error: rdError } = await supabase
        .from('route_deliveries')
        .select('delivery_id, sequence_number, deliveries(*)')
        .eq('route_id', rid)
        .order('sequence_number', { ascending: true });
      if (rdError) throw rdError;

      const mapped = (routeDeliveries || []).map((rd: any) => {
        const d = rd.deliveries || {};
        return {
          id: d.id,
          orderNumber: d.order_number || '',
          cliente: d.client_name || '',
          endereco: d.address || '',
          cidade: d.city || '',
          estado: d.state || '',
          cep: d.postal_code || '',
          telefone: '',
          observacoes: d.notes || '',
          client: d.client_name || '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          zipCode: d.postal_code || '',
          notes: d.notes || '',
          lat: d.lat || undefined,
          lng: d.lng || undefined,
          position: d.lat && d.lng ? { lat: d.lat, lng: d.lng } : null,
          status: (d.status as 'pendente' | 'entregue' | 'ocorrencia') || 'pendente',
          statusChanged: false
        };
      });

      // Já retornam ordenadas por sequence_number
      const orderedDeliveries = mapped;
      const firstPending = orderedDeliveries.find((d: any) => d.status === 'pendente') || orderedDeliveries[0] || null;

      // Persistir no localStorage para restauração e para o hook useDeliveries
      localStorage.setItem('currentRouteId', rid);
      localStorage.setItem('currentRouteDeliveries', JSON.stringify(orderedDeliveries));
      localStorage.setItem('currentUserId', user.id);

      // Também persistir no estado usado pela landing para exibir a rota imediatamente
      try {
        const stateToSave = {
          deliveries: orderedDeliveries,
          selectedDeliveryId: firstPending ? firstPending.id : null,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('rota-facil-turbo-state', JSON.stringify(stateToSave));
      } catch (e) {
        console.error('Erro ao salvar estado geral da rota:', e);
      }

      // Logar ação no histórico
      if (routeHistory?.logRouteAction) {
        routeHistory.logRouteAction('update', rid, {
          message: `Rota "${(routeData as any).name || rname || 'sem nome'}" carregada do histórico`,
          delivery_count: orderedDeliveries.length
        });
      }

      smartToast({
        title: 'Rota carregada',
        description: `${orderedDeliveries.length} entregas foram carregadas.`
      });

      // Navegar para a tela principal
      navigate('/app');
    } catch (err: any) {
      console.error('Erro ao carregar rota:', err);
      smartToast({
        title: 'Erro ao carregar rota',
        description: err?.message || 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
    } finally {
      setLoadingRouteId(null);
    }
  }, [user, navigate, routeHistory]);

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
  
  // Função para excluir uma rota
  const handleDeleteRoute = async (routeId: string, routeName: string) => {
    if (!routeId) return;
    
    setDeletingRouteId(routeId);
    
    try {
      console.log(`Excluindo rota ${routeId} (${routeName})`);
      
      // Usar o método deleteRoute do hook com tipagem corrigida
      const result = await routeHistory.deleteRoute(routeId);
      
      if (result && result.success) {
        smartToast({
          title: 'Rota excluída',
          description: `A rota "${routeName}" foi excluída com sucesso`,
          variant: 'default'
        });
        
        // Atualizar a lista de histórico
        loadHistory();
      } else {
        console.error('Erro ao excluir rota:', result?.error);
        smartToast({
          title: 'Erro ao excluir rota',
          description: (result && result.error) || 'Ocorreu um erro ao excluir a rota',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Erro ao excluir rota:', error);
      smartToast({
        title: 'Erro ao excluir rota',
        description: error.message || 'Ocorreu um erro ao excluir a rota',
        variant: 'destructive'
      });
    } finally {
      setDeletingRouteId(null);
      setIsLoading(false);
    }
  };
  
  // Função para carregar estatísticas de uma rota
  const loadRouteStats = async (routeId: string, routeName: string) => {
    if (!routeId) return;
    
    setSelectedRouteId(routeId);
    setSelectedRouteName(routeName);
    setLoadingStats(true);
    
    try {
      console.log(`Carregando estatísticas da rota ${routeId} (${routeName})`);
      
      // Buscar entregas da rota no Supabase
      const { data, error } = await supabase
        .from('route_deliveries')
        .select('delivery_id, deliveries(status)')
        .eq('route_id', routeId as any);
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Calcular estatísticas
        const total = data.length;
        const entregue = data.filter((d: any) => d?.deliveries?.status === 'entregue').length;
        const ocorrencia = data.filter((d: any) => d?.deliveries?.status === 'ocorrencia').length;
        const pendente = total - entregue - ocorrencia;
        
        setRouteStats({
          total,
          entregue,
          pendente,
          ocorrencia
        });
        
        setShowStatsDialog(true);
      }
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      smartToast({
        title: 'Erro ao carregar estatísticas',
        description: error.message || 'Ocorreu um erro ao carregar as estatísticas da rota',
        variant: 'destructive'
      });
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Diálogo de estatísticas */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estatísticas da Rota</DialogTitle>
            <DialogDescription>
              {selectedRouteName || 'Rota sem nome'}
            </DialogDescription>
          </DialogHeader>
          
          {loadingStats ? (
            <div className="flex justify-center p-4">
              <RotateCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="flex flex-col items-center p-3 border rounded-md bg-gray-50">
                <span className="text-2xl font-bold">{routeStats.total}</span>
                <span className="text-sm text-gray-500">Total de Entregas</span>
              </div>
              <div className="flex flex-col items-center p-3 border rounded-md bg-green-50">
                <span className="text-2xl font-bold text-green-600">{routeStats.entregue}</span>
                <span className="text-sm text-gray-500">Entregues</span>
              </div>
              <div className="flex flex-col items-center p-3 border rounded-md bg-brand-50">
                <span className="text-2xl font-bold text-brand-600">{routeStats.pendente}</span>
                <span className="text-sm text-gray-500">Pendentes</span>
              </div>
              <div className="flex flex-col items-center p-3 border rounded-md bg-yellow-50">
                <span className="text-2xl font-bold text-yellow-600">{routeStats.ocorrencia}</span>
                <span className="text-sm text-gray-500">Ocorrências</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowStatsDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
            
            {/* Botões de ação para rotas */}
            {item.routes && item.action === 'create' && (
              <div className="flex items-center gap-2 mt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => loadRouteStats(item.routes?.id || '', item.routes?.name || '')}
                  disabled={loadingStats || isLoading}
                >
                  <BarChart2 size={14} />
                  Estatísticas
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="flex items-center gap-1"
                      disabled={!!deletingRouteId || isLoading}
                    >
                      {deletingRouteId === item.routes?.id ? (
                        <RotateCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Excluir Rota
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Rota</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a rota "{item.routes?.name || 'sem nome'}"?
                        Esta ação não pode ser desfeita e todas as entregas associadas serão removidas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteRoute(item.routes?.id || '', item.routes?.name || '')}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {/* Botão Carregar Rota disponível para qualquer item com rota */}
            {item.routes && (
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => handleLoadRoute(item.routes?.id || '', item.routes?.name || '')}
                  disabled={!!loadingRouteId || isLoading}
                >
                  {loadingRouteId === item.routes?.id ? (
                    <RotateCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <MapPin size={14} />
                  )}
                  Carregar Rota
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      <div className="flex justify-center mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={loadMore}
          disabled={isLoading || !hasMore}
        >
          {isLoading ? (
            <>
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
              Carregando...
            </>
          ) : hasMore ? (
            "Carregar mais"
          ) : (
            "Fim do histórico"
          )}
        </Button>
      </div>
      
      {/* Diálogo para exibir estatísticas */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 size={18} />
              Estatísticas da Rota: {selectedRouteName}
            </DialogTitle>
            <DialogDescription>
              Resumo das entregas desta rota
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold">{routeStats.total}</div>
                  <div className="text-sm text-muted-foreground">Total de Entregas</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-green-600">{routeStats.entregue}</div>
                  <div className="text-sm text-muted-foreground">Entregas Realizadas</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-amber-600">{routeStats.pendente}</div>
                  <div className="text-sm text-muted-foreground">Entregas Pendentes</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-red-600">{routeStats.ocorrencia}</div>
                  <div className="text-sm text-muted-foreground">Ocorrências</div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {routeStats.total > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Progresso da Rota</div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500" 
                  style={{ width: `${(routeStats.entregue / routeStats.total) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{Math.round((routeStats.entregue / routeStats.total) * 100)}% concluído</span>
                <span>{routeStats.entregue} de {routeStats.total}</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowStatsDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
