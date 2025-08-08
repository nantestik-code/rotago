import { useState, useCallback, useEffect } from 'react';
import { DeliveryItem, getStatusCounts } from '@/utils/deliveryUtils';
import { geocodeAddresses, optimizeRoute } from '@/utils/mapUtils';
import { smartToast } from '@/hooks/use-smart-toast';
import { MapPosition } from '@/utils/mapUtils';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/hooks/use-auth';
import { useRouteHistory } from '@/hooks/use-route-history';

// Interface para o resultado da importação de entregas
interface ImportResult {
  success: boolean;
  routeId?: string;
  deliveriesCount?: number;
  routeName?: string;
}

export function useDeliveries() {
  const { user } = useAuth();
  const { logRouteAction } = useRouteHistory();
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [processingGeocode, setProcessingGeocode] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState(0);
  const [processingOptimization, setProcessingOptimization] = useState(false);
  const [currentRouteId, setCurrentRouteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Obter a data atual formatada para o nome da rota
  const getCurrentDateFormatted = () => {
    const now = new Date();
    return now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Função para sincronizar entregas com o Supabase
  const syncDeliveriesWithSupabase = async (localDeliveries: DeliveryItem[]) => {
    if (!user || !supabase || !currentRouteId) return;
    
    try {
      console.log('Sincronizando entregas com Supabase...');
      
      // Buscar entregas da rota atual no Supabase
      const { data: supabaseDeliveries, error: fetchError } = await supabase
        .from('route_deliveries')
        .select(`
          delivery_id, 
          deliveries(
            id, 
            status, 
            updated_at
          )
        `)
        .eq('route_id', currentRouteId);
        
      if (fetchError) {
        console.error('Erro ao buscar entregas do Supabase:', fetchError);
        return;
      }
      
      if (!supabaseDeliveries || supabaseDeliveries.length === 0) {
        console.log('Nenhuma entrega encontrada no Supabase para sincronização');
        return;
      }
      
      // Verificar se há atualizações de status mais recentes no Supabase
      let hasUpdates = false;
      const updatedDeliveries = localDeliveries.map(localDelivery => {
        const supabaseDelivery = supabaseDeliveries.find(sd => 
          sd.delivery_id === localDelivery.id && sd.deliveries
        );
        
        if (supabaseDelivery && supabaseDelivery.deliveries) {
          // Tipagem correta para acessar as propriedades
          const deliveryData = supabaseDelivery.deliveries as any;
          const remoteStatus = deliveryData.status as 'pendente' | 'entregue' | 'ocorrencia';
          const remoteUpdatedAt = new Date(deliveryData.updated_at);
          const localUpdatedAt = localDelivery.updated_at ? new Date(localDelivery.updated_at) : new Date(0);
          
          // Se o status for diferente e a atualização remota for mais recente
          if (remoteStatus !== localDelivery.status && remoteUpdatedAt > localUpdatedAt) {
            hasUpdates = true;
            console.log(`Atualizando entrega ${localDelivery.id} de ${localDelivery.status} para ${remoteStatus}`);
            return {
              ...localDelivery,
              status: remoteStatus,
              updated_at: deliveryData.updated_at,
              synced: true
            };
          }
        }
        
        return localDelivery;
      });
      
      if (hasUpdates) {
        console.log('Atualizando entregas locais com dados mais recentes do Supabase');
        setDeliveries(updatedDeliveries);
        localStorage.setItem('currentRouteDeliveries', JSON.stringify(updatedDeliveries));
        localStorage.setItem('currentUserId', user?.id || ''); // Salvar ownership
        
        // Atualizar as contagens de status
        const newStatusCounts = getStatusCounts(updatedDeliveries);
        console.log('Novas contagens de status após sincronização:', newStatusCounts);
      }
      
      // Também tentar enviar mudanças pendentes ao Supabase
      await syncPendingStatusChanges();
    } catch (error) {
      console.error('Erro ao sincronizar com Supabase:', error);
    }
  };
  
  // Função para verificar estado da conexão e recuperar automaáticamente
  const checkConnectivityAndRestore = useCallback(async () => {
    // Verificar se o navegador está online
    if (navigator.onLine) {
      // Se estiver online e tivermos entregas carregadas, tentar sincronizar
      if (deliveries.length > 0 && user) {
        await syncDeliveriesWithSupabase(deliveries);
      } else if (user) {
        // Se não tivermos entregas carregadas, tentar recarregar do Supabase
        const savedRouteId = localStorage.getItem('currentRouteId');
        if (savedRouteId) {
          try {
            // Verificar se a rota existe no Supabase
            const { data: routeData, error: routeError } = await supabase
              .from('routes')
              .select('id, name, status')
              .eq('id', savedRouteId)
              .single();
              
            if (!routeError && routeData) {
              console.log('Rota encontrada no Supabase, recarregando dados...');
              // Recarregar dados (loadDeliveries já fará isso automaticamente)
            }
          } catch (error) {
            console.error('Erro ao verificar rota:', error);
          }
        }
      }
    } else {
      console.log('Navegador offline, usando dados do localStorage');
    }
  }, [user, deliveries]);

  // Carregar entregas do localStorage ou Supabase ao iniciar
  useEffect(() => {
    const loadDeliveries = async () => {
      if (!user) return; // Não carregar sem usuário autenticado
      
      try {
        setIsLoading(true);
        
        // Primeiro, tentar carregar do localStorage para rápida restauração do estado
        // IMPORTANTE: Validar ownership para evitar vazamento de dados entre usuários
        const savedDeliveriesString = localStorage.getItem('currentRouteDeliveries');
        const savedUserId = localStorage.getItem('currentUserId');
        
        if (savedDeliveriesString && savedUserId === user.id) {
          try {
            const savedDeliveries = JSON.parse(savedDeliveriesString);
            if (savedDeliveries && savedDeliveries.length > 0) {
              console.log('Carregando entregas do localStorage para usuário atual:', savedDeliveries.length);
              setDeliveries(savedDeliveries);
              
              // Selecionar a primeira entrega pendente
              const firstPending = savedDeliveries.find(d => d.status === 'pendente');
              if (firstPending) {
                setSelectedDeliveryId(firstPending.id);
              } else if (savedDeliveries.length > 0) {
                setSelectedDeliveryId(savedDeliveries[0].id);
              }
              
              // Mesmo carregando do localStorage, vamos verificar se há atualizações no Supabase
              syncDeliveriesWithSupabase(savedDeliveries);
              
              setIsLoading(false);
              return; // Continuar com as entregas carregadas do localStorage enquanto sincroniza
            }
          } catch (error) {
            console.error('Erro ao carregar entregas do localStorage:', error);
            // Continuar para carregar do Supabase se houver erro
          }
        } else if (savedDeliveriesString && savedUserId !== user.id) {
          // Dados pertencem a outro usuário - limpar para evitar vazamento
          console.log('🧹 Dados do localStorage pertencem a outro usuário - limpando...');
          localStorage.removeItem('currentRouteDeliveries');
          localStorage.removeItem('currentRouteId');
          localStorage.removeItem('currentUserId');
        }
        
        // Se não conseguiu carregar do localStorage, tentar do Supabase
        const savedRouteId = localStorage.getItem('currentRouteId');
        if (savedRouteId) {
          setCurrentRouteId(savedRouteId);
          
          // Verificar se a rota pertence ao usuário atual
          const { data: routeData, error: routeError } = await supabase
            .from('routes')
            .select('id, user_id, name')
            .eq('id', savedRouteId)
            .single();
            
          if (routeError) {
            if (routeError.code === 'PGRST116') {
              // Rota não encontrada, limpar estado local
              console.log('Rota não encontrada no Supabase, removendo referência local');
              localStorage.removeItem('currentRouteId');
              localStorage.removeItem('currentRouteDeliveries');
              setCurrentRouteId(null);
              setIsLoading(false);
              return;
            } else {
              console.error('Erro ao verificar propriedade da rota:', routeError);
              throw routeError;
            }
          }
          
          // Verificar se a rota tem um usuário associado
          // Nota: a tabela routes pode não ter o campo user_id, então verificamos se ele existe
          // Usando tipo any para evitar erro de TypeScript, já que a estrutura pode variar
          const routeData_any = routeData as any;
          const routeUserId = routeData_any?.user_id;
          
          if (routeUserId && user && routeUserId !== user.id) {
            console.log('Rota pertence a outro usuário, não carregando');
            localStorage.removeItem('currentRouteId');
            localStorage.removeItem('currentRouteDeliveries');
            setCurrentRouteId(null);
            setIsLoading(false);
            return;
          }
          
          // Buscar entregas da rota atual
          const { data: routeDeliveries, error: rdError } = await supabase
            .from('route_deliveries')
            .select('delivery_id, sequence_number')
            .eq('route_id', savedRouteId)
            .order('sequence_number');
            
          if (rdError) throw rdError;
          
          if (routeDeliveries && routeDeliveries.length > 0) {
            // Buscar detalhes das entregas
            const deliveryIds = routeDeliveries.map(rd => rd.delivery_id);
            const { data: deliveriesData, error: dError } = await supabase
              .from('deliveries')
              .select('*')
              .in('id', deliveryIds);
              
            if (dError) throw dError;
            
            if (deliveriesData && deliveriesData.length > 0) {
              // Converter para o formato DeliveryItem
              const formattedDeliveries: DeliveryItem[] = deliveriesData.map(d => ({
                id: d.id,
                orderNumber: d.order_number || '',
                // Campos originais
                cliente: d.client_name || '',
                endereco: d.address || '',
                cidade: d.city || '',
                estado: d.state || '',
                cep: d.postal_code || '',  // Usando postal_code do banco
                telefone: '',
                observacoes: d.notes || '',
                // Campos para compatibilidade com Supabase
                client: d.client_name || '',
                address: d.address || '',
                city: d.city || '',
                state: d.state || '',
                zipCode: d.postal_code || '',  // Usando postal_code do banco
                notes: d.notes || '',
                // Campos de posição
                lat: d.lat || undefined,  // Usando lat do banco
                lng: d.lng || undefined,  // Usando lng do banco
                position: d.lat && d.lng ? { lat: d.lat, lng: d.lng } : null,
                // Campos de status
                status: (d.status as 'pendente' | 'entregue' | 'ocorrencia') || 'pendente',
                statusChanged: false
              }));
              
              // Ordenar entregas conforme a sequência
              const orderedDeliveries = formattedDeliveries.sort((a, b) => {
                const aIndex = routeDeliveries.findIndex(rd => rd.delivery_id === a.id);
                const bIndex = routeDeliveries.findIndex(rd => rd.delivery_id === b.id);
                return aIndex - bIndex;
              });
              
              setDeliveries(orderedDeliveries);
              
              // Salvar entregas no localStorage para persistência
              try {
                localStorage.setItem('currentRouteDeliveries', JSON.stringify(orderedDeliveries));
                localStorage.setItem('currentUserId', user.id); // Salvar ownership
              } catch (error) {
                console.error('Erro ao salvar entregas no localStorage:', error);
              }
              
              // Selecionar a primeira entrega pendente
              const firstPending = orderedDeliveries.find(d => d.status === 'pendente');
              if (firstPending) {
                setSelectedDeliveryId(firstPending.id);
              } else if (orderedDeliveries.length > 0) {
                setSelectedDeliveryId(orderedDeliveries[0].id);
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar entregas:', error);
        // Sem notificação para não incomodar o usuário
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDeliveries();
  }, []);

  // Handle deliveries import with UI update
  const handleImportComplete = useCallback(async (importedDeliveries: DeliveryItem[], routeName?: string): Promise<ImportResult> => {
    // Retornar o ID da rota e o status de criação para permitir registro no histórico
    // Geocode addresses
    setProcessingGeocode(true);
    setGeocodeProgress(0);
    
    // Definir valores padrão para o retorno
    let result: ImportResult = { success: false };
    
    try {
      // Usar a data atual como nome da rota se não for fornecido
      const actualRouteName = routeName?.trim() || `Rota ${getCurrentDateFormatted()}`;
      
      const geocodedDeliveries = await geocodeAddresses(
        importedDeliveries,
        (progress) => setGeocodeProgress(progress)
      );
      
      // Criar nova rota no Supabase
      const routeId = uuidv4();
      let supabaseRouteCreated = false;
      
      try {
        const { error: routeError } = await supabase
          .from('routes')
          .insert({
            id: routeId,
            name: actualRouteName,
            created_at: new Date().toISOString(),
            status: 'em_andamento',
            user_id: user?.id // Associar a rota ao usuário atual
          });
          
        if (routeError) {
          console.error('Erro ao criar rota no Supabase:', routeError);
          // Não lançar o erro, apenas registrar que não foi possível criar no Supabase
        } else {
          supabaseRouteCreated = true;
        }
      } catch (routeCreateError) {
        console.error('Erro ao criar rota no Supabase:', routeCreateError);
        // Não lançar o erro, continuar com o fluxo local
      }
      
      // Salvar entregas no Supabase apenas se a rota foi criada com sucesso
      let supabaseDeliveriesCreated = false;
      const deliveriesWithIds = geocodedDeliveries.map((delivery, index) => {
        // Gerar um novo UUID para cada entrega, independentemente do ID original
        const deliveryId = uuidv4();
        return {
          ...delivery,
          id: deliveryId
        };
      });
      
      // Inserir entregas em lote para melhor performance, apenas se a rota foi criada com sucesso
      if (supabaseRouteCreated) {
        try {
          const deliveriesToInsert = deliveriesWithIds.map(delivery => {
            // Garantir que campos obrigatórios tenham valores válidos
            const orderNumber = String(delivery.orderNumber || '');
            const clientName = String(delivery.client || delivery.cliente || 'Cliente');
            const address = String(delivery.address || delivery.endereco || 'Endereço não informado');
            const city = String(delivery.city || delivery.cidade || 'Cidade');
            const state = String(delivery.state || delivery.estado || 'UF');
            
            return {
              id: delivery.id,
              order_number: orderNumber,
              client_name: clientName,
              address: address,
              city: city,
              state: state,
              postal_code: String(delivery.zipCode || delivery.cep || ''),  // Usando postal_code do banco
              lat: delivery.position?.lat || delivery.lat || null,  // Usando lat do banco
              lng: delivery.position?.lng || delivery.lng || null,  // Usando lng do banco
              status: delivery.status || 'pendente',
              notes: String(delivery.notes || delivery.observacoes || '')
            };
          });
          
          const { error: deliveryError } = await supabase
            .from('deliveries')
            .insert(deliveriesToInsert);
            
          if (deliveryError) {
            console.error('Erro ao inserir entregas no Supabase:', deliveryError);
            // Não lançar o erro, apenas registrar que não foi possível inserir no Supabase
          } else {
            console.log('Entregas inseridas com sucesso no Supabase');
            supabaseDeliveriesCreated = true;
          }
        } catch (error) {
          console.error('Erro ao processar entregas para inserção no Supabase:', error);
          // Não lançar o erro, continuar com o fluxo local
        }
      } else {
        console.log('Pulando inserção de entregas no Supabase porque a rota não foi criada com sucesso');
      }
      
      // Relacionar entregas com a rota apenas se a rota e as entregas foram criadas com sucesso no Supabase
      if (supabaseRouteCreated && supabaseDeliveriesCreated) {
        try {
          // Primeiro, verificar se já existem relacionamentos para esta rota
          const { data: existingRelations, error: checkError } = await supabase
            .from('route_deliveries')
            .select('delivery_id')
            .eq('route_id', routeId);
            
          if (checkError) {
            console.error('Erro ao verificar relações existentes:', checkError);
          }
          
          // Se existirem relações, removê-las primeiro
          if (existingRelations && existingRelations.length > 0) {
            console.log('Removendo relações existentes para a rota:', routeId);
            const { error: deleteError } = await supabase
              .from('route_deliveries')
              .delete()
              .eq('route_id', routeId);
              
            if (deleteError) {
              console.error('Erro ao remover relações existentes:', deleteError);
            }
          }
          
          // Criar novos relacionamentos
          const routeDeliveries = deliveriesWithIds.map((delivery, index) => ({
            route_id: routeId,
            delivery_id: delivery.id,
            sequence_number: index + 1
          }));
          
          console.log('Inserindo novas relações para a rota:', routeId);
          
          // Inserir em lotes menores para evitar problemas com limites de tamanho
          const batchSize = 20; // Reduzindo o tamanho do lote para evitar problemas
          for (let i = 0; i < routeDeliveries.length; i += batchSize) {
            const batch = routeDeliveries.slice(i, i + batchSize);
            console.log(`Inserindo lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(routeDeliveries.length/batchSize)}`);
            
            try {
              const { error: rdError } = await supabase
                .from('route_deliveries')
                .insert(batch);
                
              if (rdError) {
                console.error(`Erro ao inserir lote ${Math.floor(i/batchSize) + 1}:`, rdError);
                // Continuar mesmo com erro para tentar inserir o máximo possível
              }
            } catch (batchError) {
              console.error(`Erro ao processar lote ${Math.floor(i/batchSize) + 1}:`, batchError);
              // Continuar mesmo com erro para tentar inserir o máximo possível
            }
            
            // Pequena pausa entre lotes para evitar sobrecarga
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          console.log('Relações inseridas com sucesso');
        } catch (error) {
          console.error('Erro ao relacionar entregas com rota:', error);
          // Não lançar o erro para permitir que o usuário continue usando o app
          // mesmo que haja problemas com as relações
        }
      } else {
        console.log('Pulando criação de relações no Supabase porque a rota não foi criada com sucesso');
      }
      
      // Salvar ID da rota atual no localStorage
      localStorage.setItem('currentRouteId', routeId);
      localStorage.setItem('currentUserId', user?.id || ''); // Salvar ownership
      setCurrentRouteId(routeId);
      
      setDeliveries(deliveriesWithIds);
      
      // Salvar entregas no localStorage para persistência
      try {
        localStorage.setItem('currentRouteDeliveries', JSON.stringify(deliveriesWithIds));
        localStorage.setItem('currentUserId', user?.id || ''); // Salvar ownership
      } catch (error) {
        console.error('Erro ao salvar entregas no localStorage:', error);
      }
      
      // Find first pending delivery to select
      const firstPending = deliveriesWithIds.find(d => d.status === 'pendente');
      if (firstPending) {
        setSelectedDeliveryId(firstPending.id);
      }
      
      smartToast({
        title: 'Entregas importadas',
        description: `${deliveriesWithIds.length} entregas foram processadas com sucesso.`,
      });

      // Definir o resultado com sucesso e informações da rota
      result = {
        routeId,
        success: true,
        deliveriesCount: deliveriesWithIds.length,
        routeName: actualRouteName
      };
    } catch (error) {
      smartToast({
        title: 'Erro de geocodificação',
        description: 'Ocorreu um erro ao converter endereços em coordenadas.',
        variant: 'destructive',
      });
      console.error('Geocoding error:', error);
      setDeliveries(importedDeliveries);
    } finally {
      setProcessingGeocode(false);
      setGeocodeProgress(100);
      
      // Reset progress after delay
      setTimeout(() => {
        setGeocodeProgress(0);
      }, 1000);
    }
    
    // Retornar o resultado da operação
    return result;
  }, [user, getCurrentDateFormatted]);

  // Handle status change with animation flag and persistence
  const handleStatusChange = useCallback(async (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => {
    console.log(`useDeliveries: Iniciando atualização de status para entrega ${id} para ${status}`);
    
    // IMPORTANTE: Usar uma função de callback para acessar o estado mais recente
    // Isso evita problemas de closure com valores desatualizados
    setDeliveries(currentDeliveries => {
      // Encontrar a entrega atual para registrar o status anterior
      const currentDelivery = currentDeliveries.find(d => d.id === id);
      if (!currentDelivery) {
        console.error(`useDeliveries: Entrega com ID ${id} não encontrada no estado atual`);
        return currentDeliveries; // Retornar o estado atual sem mudanças
      }
      
      const previousStatus = currentDelivery.status;
      const now = new Date();
      const timestamp = now.toISOString();
      
      console.log(`useDeliveries: Alterando status da entrega ${id} de ${previousStatus} para ${status}`);
      
      // Registrar a alteração de status em um log local para recuperação
      try {
        const statusChangesLog = JSON.parse(localStorage.getItem('statusChangesLog') || '[]');
        statusChangesLog.push({
          id,
          previousStatus,
          newStatus: status,
          timestamp,
          synced: false // Indica que ainda não foi sincronizado com o Supabase
        });
        // Limitar o tamanho do log para evitar problemas de armazenamento
        if (statusChangesLog.length > 1000) {
          statusChangesLog.splice(0, statusChangesLog.length - 1000);
        }
        localStorage.setItem('statusChangesLog', JSON.stringify(statusChangesLog));
      } catch (logError) {
        console.error('Erro ao registrar log de alterações:', logError);
        // Não interromper o fluxo principal se houver erro no log
      }
      
      // Atualizar estado local imediatamente para feedback visual rápido
      console.log(`useDeliveries: Atualizando estado local para entrega ${id} com status ${status}`);
      
      // Criar uma cópia do array atual de entregas usando map para garantir nova referência
      // Isso é mais seguro que deep clone com JSON.parse/stringify que pode causar problemas
      const updatedDeliveries = currentDeliveries.map(delivery => {
        if (delivery.id === id) {
          // Atualizar apenas a entrega com o ID correspondente
          return {
            ...delivery,
            status,
            statusChanged: true,
            updated_at: timestamp,
            delivered_at: status === 'entregue' ? timestamp : null
          };
        }
        return delivery; // Manter as outras entregas inalteradas
      });
      
      // Verificar se a entrega foi realmente atualizada
      const updatedDelivery = updatedDeliveries.find(d => d.id === id);
      if (updatedDelivery) {
        console.log(`useDeliveries: Entrega ${id} atualizada com sucesso para status ${updatedDelivery.status}`);
      } else {
        console.error(`useDeliveries: Falha ao atualizar entrega ${id} - não encontrada após atualização`);
      }
      
      // Salvar imediatamente no localStorage para garantir persistência
      try {
        localStorage.setItem('currentRouteDeliveries', JSON.stringify(updatedDeliveries));
        localStorage.setItem('currentUserId', user?.id || ''); // Salvar ownership
        console.log('useDeliveries: Entregas atualizadas salvas no localStorage após mudança de status');
      } catch (error) {
        console.error('Erro ao salvar entregas no localStorage após mudança de status:', error);
      }
      
      // Retornar o novo array de entregas para atualizar o estado
      return updatedDeliveries;
    });
    
    // Verificar se a atualização foi aplicada corretamente e forçar nova atualização se necessário
    setTimeout(() => {
      // Usar uma função de callback para acessar o estado mais recente
      setDeliveries(currentDeliveries => {
        const checkDelivery = currentDeliveries.find(d => d.id === id);
        if (checkDelivery && checkDelivery.status !== status) {
          console.error(`useDeliveries: Erro de sincronização: Entrega ${id} deveria ter status ${status} mas tem ${checkDelivery.status}`);
          // Forçar uma nova atualização
          console.log('useDeliveries: Forçando nova atualização de estado');
          
          // Criar uma nova cópia com a entrega atualizada
          const forcedUpdate = currentDeliveries.map(d => 
            d.id === id ? { ...d, status, statusChanged: true } : d
          );
          
          // Salvar no localStorage para garantir persistência
          try {
            localStorage.setItem('currentRouteDeliveries', JSON.stringify(forcedUpdate));
            console.log('useDeliveries: Entregas atualizadas salvas no localStorage após correção de sincronização');
          } catch (error) {
            console.error('Erro ao salvar entregas no localStorage após correção:', error);
          }
          
          return forcedUpdate;
        } else if (checkDelivery) {
          console.log(`useDeliveries: Verificação de sincronização: Entrega ${id} tem status ${checkDelivery.status} como esperado`);
          return currentDeliveries; // Sem alterações
        } else {
          console.error(`useDeliveries: Entrega ${id} não encontrada durante verificação de sincronização`);
          return currentDeliveries; // Sem alterações
        }
      });
    }, 300);
    
    // Notificar sobre a mudança de status com smartToast
    smartToast({
      title: status === 'entregue' ? 'Entrega concluída' : (status === 'ocorrencia' ? 'Ocorrência registrada' : 'Status atualizado'),
      description: `Entrega ${id.substring(0, 8)}... marcada como ${status}`
    });
    
    // After a short delay, remove the statusChanged flag but KEEP the status
    setTimeout(() => {
      setDeliveries(prev => {
        const updatedDeliveries = prev.map(delivery => 
          delivery.id === id ? { ...delivery, statusChanged: false } : delivery
        );
        
        // Salvar novamente no localStorage após remover o flag de animação
        try {
          localStorage.setItem('currentRouteDeliveries', JSON.stringify(updatedDeliveries));
        localStorage.setItem('currentUserId', user?.id || ''); // Salvar ownership
        } catch (error) {
          console.error('Erro ao salvar entregas no localStorage após animação:', error);
        }
        
        return updatedDeliveries;
      });
    }, 1500); // Duration of animation
    
    // Verificar se o ID é um UUID válido (para Supabase)
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // Se não for um UUID válido, pular a atualização no Supabase
    if (!isValidUuid) {
      console.log('ID não é um UUID válido, pulando atualização no Supabase:', id);
      return;
    }
    
    // Função para atualizar o log de status após sincronização bem-sucedida
    const updateStatusLog = (deliveryId: string, success: boolean) => {
      try {
        const statusChangesLog = JSON.parse(localStorage.getItem('statusChangesLog') || '[]');
        const updatedLog = statusChangesLog.map((log: any) => {
          if (log.id === deliveryId && log.newStatus === status) {
            return { ...log, synced: success };
          }
          return log;
        });
        localStorage.setItem('statusChangesLog', JSON.stringify(updatedLog));
      } catch (error) {
        console.error('Erro ao atualizar log de status:', error);
      }
    };
    
    try {
      console.log('Atualizando status da entrega no Supabase:', id, status);
      
      // Atualizar no Supabase apenas se for um UUID válido
      const { error } = await supabase
        .from('deliveries')
        .update({
          status,
          updated_at: timestamp,
          delivered_at: status === 'entregue' ? timestamp : null
        })
        .eq('id', id);
        
      if (error) {
        console.error('Erro ao atualizar status:', error);
        // Marcar no log que a sincronização falhou
        updateStatusLog(id, false);
        // Tentar sincronizar novamente mais tarde (será pego pela sincronização periódica)
        return;
      }
      
      // Marcar no log que a sincronização foi bem-sucedida
      updateStatusLog(id, true);
      
      console.log('Status atualizado com sucesso no Supabase');
      
      // Registrar no histórico
      try {
        const historyEntry = {
          id: uuidv4(),
          delivery_id: id,
          previous_status: previousStatus,
          new_status: status,
          changed_at: new Date().toISOString(),
          changed_by: 'app_user',
          notes: `Status alterado de ${previousStatus} para ${status}`
        };
        
        console.log('Registrando no histórico:', historyEntry);
        
        // Registrar a alteração de status apenas em localStorage para evitar erros de tabela
        try {
          // Armazenar no localStorage para garantir que o histórico seja mantido
          const historyKey = `delivery_history_${user?.id}`;
          const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
          existingHistory.push({
            ...historyEntry,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem(historyKey, JSON.stringify(existingHistory));
          console.log('Histórico registrado com sucesso no localStorage');
          
          // Tentar registrar em profiles para manter um timestamp da última alteração
          if (user?.id) {
            const { error } = await supabase
              .from('profiles')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', user.id);
              
            if (error) {
              console.error('Erro ao atualizar perfil:', error);
            }
          }
        } catch (error) {
          console.error('Erro ao registrar histórico:', error);
          // Não lançar erro para não interromper o fluxo principal
        }  
      } catch (historyError) {
        console.error('Erro ao processar histórico:', historyError);
        // Não lançar erro para não interromper o fluxo principal
      }
      
      // Mostrar notificação de acordo com o status
      if (status === 'entregue') {
        smartToast({
          title: 'Entrega concluída',
          description: 'A entrega foi marcada como concluída com sucesso.',
        });
      }
    } catch (error) {
      console.error('Erro ao sincronizar alterações de status pendentes:', error);
    }
  }, []);

  // Função para sincronizar alterações de status pendentes
  const syncPendingStatusChanges = useCallback(async () => {
    if (!user || !supabase) return;
    
    try {
      const pendingChanges = getPendingStatusChanges();
      if (pendingChanges.length === 0) return;
      
      console.log(`Tentando sincronizar ${pendingChanges.length} alterações de status pendentes`);
      
      // Obter o log de alterações de status
      const statusChangesLog = JSON.parse(localStorage.getItem('statusChangesLog') || '[]');
      
      // Verificar se as entregas atuais refletem as alterações pendentes
      // Isso garante que as alterações de status não sejam perdidas mesmo que o estado do React seja reiniciado
      const currentDeliveriesString = localStorage.getItem('currentRouteDeliveries');
      if (currentDeliveriesString) {
        try {
          const currentDeliveries = JSON.parse(currentDeliveriesString);
          let hasUpdates = false;
          
          // Atualizar entregas locais com base no log de alterações
          const updatedDeliveries = currentDeliveries.map((delivery: DeliveryItem) => {
            // Encontrar a alteração mais recente para esta entrega
            const changes = pendingChanges
              .filter(change => change.id === delivery.id)
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            if (changes.length > 0 && changes[0].newStatus !== delivery.status) {
              hasUpdates = true;
              console.log(`Atualizando entrega ${delivery.id} para status ${changes[0].newStatus} com base no log`);
              return {
                ...delivery,
                status: changes[0].newStatus,
                updated_at: changes[0].timestamp,
                delivered_at: changes[0].newStatus === 'entregue' ? changes[0].timestamp : null
              };
            }
            return delivery;
          });
          
          if (hasUpdates) {
            console.log('Atualizando entregas locais com base no log de alterações pendentes');
            localStorage.setItem('currentRouteDeliveries', JSON.stringify(updatedDeliveries));
        localStorage.setItem('currentUserId', user?.id || ''); // Salvar ownership
            setDeliveries(updatedDeliveries);
          }
        } catch (error) {
          console.error('Erro ao processar entregas locais:', error);
        }
      }
      
      for (const change of pendingChanges) {
        try {
          // Verificar se o ID é válido
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(change.id)) {
            continue;
          }
          
          console.log(`Sincronizando alteração de status: ${change.id} -> ${change.newStatus}`);
          
          const { error } = await supabase
            .from('deliveries')
            .update({
              status: change.newStatus,
              updated_at: new Date().toISOString(),
              delivered_at: change.newStatus === 'entregue' ? new Date().toISOString() : null
            })
            .eq('id', change.id);
            
          if (error) {
            console.error(`Erro ao sincronizar status para ${change.id}:`, error);
            continue;
          }
          
          // Marcar como sincronizado no log
          const updatedLog = statusChangesLog.map((log: any) => {
            if (log.id === change.id && log.newStatus === change.newStatus && !log.synced) {
              return { ...log, synced: true };
            }
            return log;
          });
          
          localStorage.setItem('statusChangesLog', JSON.stringify(updatedLog));
          
          console.log(`Status sincronizado com sucesso para ${change.id}`);
        } catch (error) {
          console.error(`Erro ao processar sincronização para ${change.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar alterações de status pendentes:', error);
    }
  }, []);
  
  // Tentar sincronizar alterações pendentes quando o componente é montado
  useEffect(() => {
    // Pequeno atraso para garantir que outras inicializações sejam concluídas primeiro
    const timer = setTimeout(() => {
      syncPendingStatusChanges();
      
      // Verificar se as entregas foram carregadas corretamente
      const currentDeliveriesString = localStorage.getItem('currentRouteDeliveries');
      if (currentDeliveriesString && deliveries.length === 0) {
        try {
          console.log('Verificando entregas salvas no localStorage...');
          const savedDeliveries = JSON.parse(currentDeliveriesString);
          if (savedDeliveries && savedDeliveries.length > 0) {
            console.log(`Recuperando ${savedDeliveries.length} entregas do localStorage que não foram carregadas inicialmente`);
            setDeliveries(savedDeliveries);
            
            // Selecionar a primeira entrega pendente
            const firstPending = savedDeliveries.find(d => d.status === 'pendente');
            if (firstPending) {
              setSelectedDeliveryId(firstPending.id);
            } else if (savedDeliveries.length > 0) {
              setSelectedDeliveryId(savedDeliveries[0].id);
            }
          }
        } catch (error) {
          console.error('Erro ao recuperar entregas do localStorage:', error);
        }
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [syncPendingStatusChanges, deliveries.length]);
  
  // Configurar sincronização periódica de alterações pendentes
  useEffect(() => {
    const syncInterval = setInterval(() => {
      syncPendingStatusChanges();
    }, 2 * 60 * 1000); // Tentar sincronizar a cada 2 minutos
    
    return () => clearInterval(syncInterval);
  }, [syncPendingStatusChanges]);
  
  // Adicionar listeners para detectar mudanças de conectividade
  useEffect(() => {
    // Função para verificar estado da conexão e recuperar automaticamente
    const handleOnline = () => {
      console.log('Conexão restaurada, sincronizando com servidor...');
      smartToast({
        title: 'Conexão restaurada',
        description: 'Sincronizando dados com o servidor...',
      });
      checkConnectivityAndRestore();
    };
    
    const handleOffline = () => {
      console.log('Conexão perdida, usando dados locais...');
      smartToast({
        title: 'Conexão perdida',
        description: 'Trabalhando offline. Suas alterações serão sincronizadas quando a conexão for restaurada.',
        variant: 'destructive',
      });
    };
    
    // Listener para detectar quando a página volta a ficar visível (usuário retorna à aba)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Página tornou-se visível, verificando conexão e sincronizando...');
        if (navigator.onLine) {
          checkConnectivityAndRestore();
        }
      }
    };
    
    // Adicionar event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Verificar estado inicial
    if (navigator.onLine) {
      // Executar após um pequeno delay para dar tempo ao app de inicializar
      const initialTimer = setTimeout(() => {
        checkConnectivityAndRestore();
      }, 3000);
    }
    
    // Limpar event listeners quando o componente for desmontado
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkConnectivityAndRestore]);

  // Função para obter alterações de status pendentes do localStorage
  const getPendingStatusChanges = () => {
    try {
      const pendingChanges = localStorage.getItem('pendingStatusChanges');
      return pendingChanges ? JSON.parse(pendingChanges) : [];
    } catch (error) {
      console.error('Erro ao carregar alterações pendentes:', error);
      return [];
    }
  };

  // Função para otimizar rota de entregas
  const optimizeDeliveryRoute = useCallback(async (currentLocation?: MapPosition | null) => {
    if (deliveries.length === 0) {
      smartToast({
        title: 'Aviso',
        description: 'Nenhuma entrega foi importada ainda.',
      });
      return;
    }

    setProcessingOptimization(true);
    
    try {
      // Usar localização atual como origem ou localização padrão
      const origin: MapPosition = {
        lat: -22.9068, // São Paulo como padrão
        lng: -43.1729
      };

      // Usar localização fornecida, se disponível
      if (currentLocation && currentLocation.lat && currentLocation.lng) {
        origin.lat = currentLocation.lat;
        origin.lng = currentLocation.lng;
      }
      // Se não tiver localização atual, tentar obter do navegador
      else if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false
            });
          });
          
          origin.lat = position.coords.latitude;
          origin.lng = position.coords.longitude;
        } catch (error) {
          console.log('Usando localização padrão para otimização:', error);
        }
      }

      // Obter a rota otimizada
      const optimizedRoute = await optimizeRoute(origin, deliveries);
      
      // Adicionar a propriedade sequence_number para controlar a ordem de entrega
      // mas manter o orderNumber original que representa o número do pedido
      const updatedOptimizedRoute = optimizedRoute.map((delivery, index) => ({
        ...delivery,
        sequence_number: index + 1 // Adiciona número de sequência para a ordem de entrega
        // Mantém o orderNumber original que representa o número do pedido
      }));
      
      // Atualizar o estado
      setDeliveries(updatedOptimizedRoute);
      
      // Salvar no localStorage com a sequência de entrega atualizada
      localStorage.setItem('currentRouteDeliveries', JSON.stringify(updatedOptimizedRoute));
      localStorage.setItem('currentUserId', user?.id || ''); // Salvar ownership
      
      // Registrar ação no histórico de rotas
      if (user && currentRouteId) {
        logRouteAction('optimize', currentRouteId, {
          message: 'Rota otimizada com sucesso',
          delivery_count: updatedOptimizedRoute.length,
          origin: {
            lat: origin.lat,
            lng: origin.lng
          }
        });
      }
      
      smartToast({
        title: 'Rota otimizada',
        description: 'A rota foi otimizada com sucesso. A ordem de entrega foi atualizada mantendo os números de pedido originais.',
        type: 'optimization'
      });
    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
      smartToast({
        title: 'Erro',
        description: 'Não foi possível otimizar a rota. Tente novamente.',
        type: 'error'
      });
    } finally {
      setProcessingOptimization(false);
    }
  }, [deliveries]);

  // Calcular contagem de status
  const statusCounts = getStatusCounts(deliveries);

  return {
    deliveries,
    setDeliveries,
    selectedDeliveryId,
    setSelectedDeliveryId,
    processingGeocode,
    geocodeProgress,
    processingOptimization,
    isLoading,
    currentRouteId,
    handleImportComplete,
    handleStatusChange,
    optimizeDeliveryRoute,
    statusCounts,
    syncPendingStatusChanges // Exportar função para permitir sincronização manual
  };
}
