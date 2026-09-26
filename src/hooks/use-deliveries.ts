import { useState, useCallback, useEffect } from 'react';
import { DeliveryItem, getStatusCounts } from '@/utils/deliveryUtils';
import { geocodeAddresses, optimizeRoute, defaultMapCenter } from '@/utils/mapUtils';
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

  // DESABILITADO: Sincronização automática com Supabase
  // Esta função estava causando problemas de reordenação e mudança de números
  // O status local é a fonte da verdade - sincronização manual apenas quando necessário
  const syncDeliveriesWithSupabase = async (localDeliveries: DeliveryItem[]) => {
    // DESABILITADO para evitar sobrescrever dados locais
    console.log('⚠️ syncDeliveriesWithSupabase DESABILITADO para preservar numeração');
    return;
  };
  
  // DESABILITADO: Verificação de conectividade e restauração automática
  // Esta função estava causando problemas de reordenação
  const checkConnectivityAndRestore = useCallback(async () => {
    // DESABILITADO para evitar sobrescrever dados locais
    console.log('⚠️ checkConnectivityAndRestore DESABILITADO para preservar numeração');
    return;
  }, []);

  // Carregar entregas do localStorage ou Supabase ao iniciar
  useEffect(() => {
    const loadDeliveries = async () => {
      if (!user) return; // Não carregar sem usuário autenticado
      
      try {
        setIsLoading(true);
        
        // Cache local apenas como fallback/offline.
        // Quando houver routeId salvo, o Supabase passa a ser a fonte principal.
        const savedDeliveriesString = localStorage.getItem('currentRouteDeliveries');
        const savedUserId = localStorage.getItem('currentUserId');
        const savedRouteId = localStorage.getItem('currentRouteId');
        
        if (!savedRouteId && savedDeliveriesString && savedUserId === user.id) {
          try {
            const savedDeliveries = JSON.parse(savedDeliveriesString);
            if (savedDeliveries && savedDeliveries.length > 0) {
              console.log('📦 Carregando entregas do cache local:', savedDeliveries.length);
              setDeliveries(savedDeliveries);
              
              // Selecionar a primeira entrega pendente
              const firstPending = savedDeliveries.find(d => d.status === 'pendente');
              if (firstPending) {
                setSelectedDeliveryId(firstPending.id);
              } else if (savedDeliveries.length > 0) {
                setSelectedDeliveryId(savedDeliveries[0].id);
              }
              
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.error('Erro ao carregar entregas do localStorage:', error);
            // Continuar para carregar do Supabase se houver erro
          }
        } else if (savedDeliveriesString && savedUserId !== user.id) {
          // Dados pertencem a outro usuário - limpar para evitar vazamento
          localStorage.removeItem('currentRouteDeliveries');
          localStorage.removeItem('currentRouteId');
          localStorage.removeItem('currentUserId');
        }
        
        // Com routeId salvo, buscar o estado persistido no Supabase.
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
            localStorage.removeItem('currentRouteId');
            localStorage.removeItem('currentRouteDeliveries');
            setCurrentRouteId(null);
            setIsLoading(false);
            return;
          }
          
          // Buscar entregas da rota atual
          const { data: routeDeliveries, error: rdError } = await supabase
            .from('route_deliveries')
            .select('delivery_id, sequence_number, delivery_order')
            .eq('route_id', savedRouteId)
            .order('delivery_order');
            
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
              // Converter para o formato DeliveryItem, preservando a sequência da rota
              const formattedDeliveries: DeliveryItem[] = deliveriesData.map(d => {
                const rd = routeDeliveries.find(rd => rd.delivery_id === d.id);
                const seq = rd?.sequence_number ?? undefined;
                return {
                  id: d.id,
                  orderNumber: d.order_number || '',
                  sequence_number: seq,
                  optimizedOrder: rd?.delivery_order ?? undefined,
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
                };
              });
              
              // Ordenar entregas conforme a ordem de visita persistida na rota.
              const visitOrderMap = new Map<string, number>();
              routeDeliveries.forEach((rd: any) => {
                visitOrderMap.set(rd.delivery_id, Number(rd.delivery_order ?? rd.sequence_number ?? 999999));
              });
              const orderedDeliveries = [...formattedDeliveries].sort((a, b) => {
                const seqA = visitOrderMap.get(a.id) ?? 999999;
                const seqB = visitOrderMap.get(b.id) ?? 999999;
                return seqA - seqB;
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
  }, [user]);

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
          // Manter sequence_number e orderNumber originais do fileUtils.ts
        };
      });

      // IMPORTANTE: NÃO otimizar automaticamente na importação
      // Isso preserva a ordem original da planilha e evita confusão de numeração
      // O usuário pode otimizar manualmente depois se quiser
      
      // Ordenar por sequence_number para manter a ordem da planilha
      const stabilizedDeliveries = [...deliveriesWithIds].sort((a, b) => {
        const seqA = Number(a.sequence_number ?? a.orderNumber ?? 999999);
        const seqB = Number(b.sequence_number ?? b.orderNumber ?? 999999);
        return seqA - seqB;
      });
      
      // Inserir entregas em lote para melhor performance, apenas se a rota foi criada com sucesso
      if (supabaseRouteCreated) {
        try {
          const deliveriesToInsert = stabilizedDeliveries.map(delivery => {
            // Garantir que campos obrigatórios tenham valores válidos
            const orderNumber = String(delivery.orderNumber || '');
            const clientName = String(delivery.client || delivery.cliente || 'Cliente');
            const address = String(delivery.address || delivery.endereco || 'Endereço não informado');
            const city = String(delivery.city || delivery.cidade || 'Cidade');
            const state = String(delivery.state || delivery.estado || 'UF');
            
            return {
              id: delivery.id,
              user_id: user?.id || null,
              order_number: orderNumber,
              client_name: clientName,
              address: address,
              city: city,
              state: state,
              postal_code: String(delivery.zipCode || delivery.cep || ''),
              lat: delivery.position?.lat || delivery.lat || null,
              lng: delivery.position?.lng || delivery.lng || null,
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
            supabaseDeliveriesCreated = true;
          }
        } catch (error) {
          console.error('Erro ao processar entregas para inserção no Supabase:', error);
          // Não lançar o erro, continuar com o fluxo local
        }
      }
      
      // Relacionar entregas com a rota apenas se a rota e as entregas foram criadas com sucesso no Supabase
      // FIX #5: Rollback da rota órfã se insert de entregas falhar
      if (supabaseRouteCreated && !supabaseDeliveriesCreated) {
        console.warn('Entregas não inseridas — revertendo rota órfã...');
        try {
          await supabase.from('routes').delete().eq('id', routeId);
          console.log('Rota órfã removida com sucesso.');
        } catch (rollbackError) {
          console.error('Erro no rollback da rota órfã:', rollbackError);
        }
        smartToast({
          title: 'Erro de sincronização',
          description: 'Não foi possível salvar as entregas no servidor. Os dados estão preservados localmente.',
          variant: 'destructive'
        });
      }

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
            const { error: deleteError } = await supabase
              .from('route_deliveries')
              .delete()
              .eq('route_id', routeId);
              
            if (deleteError) {
              console.error('Erro ao remover relações existentes:', deleteError);
            }
          }
          
          // Criar novos relacionamentos preservando sequência e parada originais
          const routeDeliveries = stabilizedDeliveries.map((delivery, index) => ({
            route_id: routeId,
            delivery_id: delivery.id,
            delivery_order: Number(delivery.optimizedOrder ?? delivery.orderNumber ?? index + 1),
            sequence_number: Number(delivery.sequence_number ?? (index + 1))
          }));
          
          // Inserir em lotes menores para evitar problemas com limites de tamanho
          const batchSize = 20; // Reduzindo o tamanho do lote para evitar problemas
          let allBatchesOk = true;
          for (let i = 0; i < routeDeliveries.length; i += batchSize) {
            const batch = routeDeliveries.slice(i, i + batchSize);
            
            try {
              const { error: rdError } = await supabase
                .from('route_deliveries')
                .insert(batch);
                
              if (rdError) {
                console.error(`Erro ao inserir lote ${Math.floor(i/batchSize) + 1}:`, rdError);
                allBatchesOk = false;
                // Continuar mesmo com erro para tentar inserir o máximo possível
              }
            } catch (batchError) {
              console.error(`Erro ao processar lote ${Math.floor(i/batchSize) + 1}:`, batchError);
              allBatchesOk = false;
              // Continuar mesmo com erro para tentar inserir o máximo possível
            }
            
            // Pequena pausa entre lotes reduzida para melhor performance
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          if (!allBatchesOk) {
            console.warn('Algumas relações de rota não foram inseridas (ex.: delivery_order NOT NULL). Verifique os logs acima.');
          }
        } catch (error) {
          console.error('Erro ao relacionar entregas com rota:', error);
          // Não lançar o erro para permitir que o usuário continue usando o app
          // mesmo que haja problemas com as relações
        }
      }
      
      // Salvar ID da rota atual no localStorage
      localStorage.setItem('currentRouteId', routeId);
      localStorage.setItem('currentUserId', user?.id || ''); // Salvar ownership
      setCurrentRouteId(routeId);
      
      // 3) Publicar entregas estabilizadas (mesma ordem no mapa e na lista, números não mudam)
      setDeliveries(stabilizedDeliveries);
      
      // Salvar entregas no localStorage para persistência
      try {
        localStorage.setItem('currentRouteDeliveries', JSON.stringify(stabilizedDeliveries));
        localStorage.setItem('currentUserId', user?.id || ''); // Salvar ownership
      } catch (error) {
        console.error('Erro ao salvar entregas no localStorage:', error);
      }
      
      // Selecionar o primeiro pendente pela ordem de Stop (orderNumber),
      // que é o que o carousel exibe — evita dessincronização mapa/carousel
      const firstPending = [...stabilizedDeliveries]
        .filter(d => d.status === 'pendente')
        .sort((a, b) => {
          const stopA = Number(a.orderNumber ?? a.sequence_number ?? 999999);
          const stopB = Number(b.orderNumber ?? b.sequence_number ?? 999999);
          return stopA - stopB;
        })[0];
      if (firstPending) {
        setSelectedDeliveryId(firstPending.id);
      }
      
      const notFound = stabilizedDeliveries.filter(d => d.geocodeStatus === 'nao_encontrado').length;
      const approximate = stabilizedDeliveries.filter(d => d.geocodeStatus === 'aproximada').length;
      if (notFound > 0 || approximate > 0) {
        const parts = [
          notFound > 0 ? `${notFound} não encontrada${notFound > 1 ? 's' : ''} no mapa` : '',
          approximate > 0 ? `${approximate} com posição aproximada` : '',
        ].filter(Boolean);
        smartToast({
          title: `${deliveriesWithIds.length} entregas importadas`,
          description: `Confira: ${parts.join(' e ')}. Elas aparecem marcadas na lista.`,
        });
      } else {
        smartToast({
          title: 'Entregas importadas',
          description: `${deliveriesWithIds.length} entregas, todas localizadas no mapa.`,
        });
      }

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

  // ============================================================================
  // HANDLE STATUS CHANGE - BLINDADO E SIMPLIFICADO
  // ============================================================================
  // REGRAS ABSOLUTAS:
  // 1. NUNCA alterar sequence_number ou orderNumber
  // 2. NUNCA reordenar o array de entregas
  // 3. APENAS mudar o campo 'status' da entrega específica
  // 4. Salvar IMEDIATAMENTE no localStorage
  // ============================================================================
  const handleStatusChange = useCallback(async (
    id: string, 
    status: 'pendente' | 'entregue' | 'ocorrencia', 
    onDeliveryCompleted?: (nextDeliveryId: string | null) => void
  ) => {
    const timestamp = new Date().toISOString();
    
    // Atualizar estado de forma SIMPLES e DIRETA
    setDeliveries(currentDeliveries => {
      // Encontrar a entrega
      const targetIndex = currentDeliveries.findIndex(d => d.id === id);
      if (targetIndex === -1) {
        console.error(`❌ Entrega ${id} não encontrada`);
        return currentDeliveries;
      }
      
      const targetDelivery = currentDeliveries[targetIndex];
      const completedSequence = Number(targetDelivery.sequence_number || 0);
      
      console.log(`✅ Alterando status: Pacote #${completedSequence} → ${status}`);
      
      // Criar novo array com APENAS o status alterado
      // PRESERVAR TODOS OS OUTROS CAMPOS EXATAMENTE COMO ESTÃO
      const updatedDeliveries = currentDeliveries.map((delivery, index) => {
        if (index === targetIndex) {
          return {
            ...delivery,
            status,
            statusChanged: true,
            updated_at: timestamp,
            delivered_at: status === 'entregue' ? timestamp : delivery.delivered_at
            // NUNCA alterar: id, sequence_number, orderNumber, cliente, endereco, etc.
          };
        }
        return delivery; // Retornar EXATAMENTE como está
      });
      
      // Salvar IMEDIATAMENTE no localStorage
      try {
        localStorage.setItem('currentRouteDeliveries', JSON.stringify(updatedDeliveries));
        localStorage.setItem('currentUserId', user?.id || '');
        console.log(`💾 Salvo no localStorage: ${updatedDeliveries.length} entregas`);
      } catch (error) {
        console.error('Erro ao salvar:', error);
      }
      
      // Callback para navegação automática (se fornecido)
      if (status === 'entregue' && onDeliveryCompleted) {
        const pendingDeliveries = updatedDeliveries
          .filter(d => d.status === 'pendente')
          .sort((a, b) => {
            const seqA = a.sequence_number != null && Number(a.sequence_number) > 0 ? Number(a.sequence_number) : 999999;
            const seqB = b.sequence_number != null && Number(b.sequence_number) > 0 ? Number(b.sequence_number) : 999999;
            return seqA - seqB;
          });
        
        // Próxima entrega com sequence maior que a atual
        const nextDelivery = pendingDeliveries.find(d => 
          Number(d.sequence_number || 0) > completedSequence
        ) || pendingDeliveries[0];
        
        if (nextDelivery) {
          console.log(`🚚 Próximo pacote: #${nextDelivery.sequence_number}`);
        }
        
        setTimeout(() => onDeliveryCompleted(nextDelivery?.id || null), 300);
      }
      
      return updatedDeliveries;
    });
    
    // Remover flag de animação após delay
    setTimeout(() => {
      setDeliveries(prev => {
        const updated = prev.map(d => 
          d.id === id ? { ...d, statusChanged: false } : d
        );
        localStorage.setItem('currentRouteDeliveries', JSON.stringify(updated));
        return updated;
      });
    }, 1000);
    
    // Notificação simples
    smartToast({
      title: status === 'entregue' ? '✅ Entregue' : (status === 'ocorrencia' ? '⚠️ Ocorrência' : '🔄 Pendente'),
      description: `Status atualizado`
    });
    
    // Sincronizar status com Supabase (fire-and-forget, sem afetar estado local)
    try {
      const updateData: Record<string, string> = { status, updated_at: timestamp };
      if (status === 'entregue') updateData.delivered_at = timestamp;
      await supabase.from('deliveries').update(updateData).eq('id', id);
    } catch (err) {
      // Falha silenciosa — localStorage já está atualizado
      console.warn('Supabase status sync falhou (localStorage preservado):', err);
    }
  }, [user]);

  // DESABILITADO: Função de sincronização que causava problemas de reordenação e sobrescrita de dados
  // Esta função estava chamando setDeliveries() com dados potencialmente desatualizados,
  // causando reversão de status e mudança de numeração
  const syncPendingStatusChanges = useCallback(async () => {
    // DESABILITADO COMPLETAMENTE para preservar estabilidade
    console.log('⚠️ syncPendingStatusChanges DESABILITADO - localStorage é a fonte da verdade');
    return;
    
    // Código original comentado para referência futura se necessário reativar
    /*
    if (!user || !supabase) return;
    
    try {
      const pendingChanges = getPendingStatusChanges();
      if (pendingChanges.length === 0) return;
      
      // ... resto do código original ...
    } catch (error) {
      console.error('Erro ao sincronizar alterações de status pendentes:', error);
    }
    */
  }, []);
  
  // DESABILITADO: Sincronização automática que causava problemas de reordenação
  // O localStorage é a fonte da verdade - não sincronizar automaticamente
  
  // DESABILITADO: Fallback que causava recarregamento indesejado de dados
  // Este useEffect estava causando conflitos quando o estado era atualizado mas ainda não salvo
  // O carregamento inicial no useEffect principal (linha 58) é suficiente
  /*
  useEffect(() => {
    const timer = setTimeout(() => {
      // Verificar se as entregas foram carregadas corretamente
      const currentDeliveriesString = localStorage.getItem('currentRouteDeliveries');
      if (currentDeliveriesString && deliveries.length === 0) {
        try {
          const savedDeliveries = JSON.parse(currentDeliveriesString);
          if (savedDeliveries && savedDeliveries.length > 0) {
            console.log('📦 Fallback: Carregando entregas do localStorage');
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
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [deliveries.length]);
  */
  
  // DESABILITADO: Sincronização periódica - causava problemas de reordenação
  // useEffect(() => {
  //   const syncInterval = setInterval(() => {
  //     syncPendingStatusChanges();
  //   }, 2 * 60 * 1000);
  //   return () => clearInterval(syncInterval);
  // }, [syncPendingStatusChanges]);
  
  // DESABILITADO: Listeners de conectividade - causavam problemas de reordenação
  // O localStorage é a fonte da verdade

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
          // Usar localização padrão
        }
      }

      // Obter a rota otimizada
      const optimizedRoute = await optimizeRoute(origin, deliveries);
      
      // sequence_number (nº do pacote) nunca é alterado.
      // optimizedOrder (vindo do optimizeRoute) define a nova ordem de visita.
      // Status e campos de entrega do estado atual têm prioridade sobre o resultado da otimização.
      const updatedOptimizedRoute = optimizedRoute.map((delivery) => {
        const originalDelivery = deliveries.find(d => d.id === delivery.id);
        return {
          ...delivery,
          sequence_number: originalDelivery?.sequence_number ?? delivery.sequence_number,
          orderNumber: originalDelivery?.orderNumber ?? delivery.orderNumber,
          optimizedOrder: delivery.optimizedOrder, // preservar ordem geográfica do optimizeRoute
          status: originalDelivery?.status ?? delivery.status,
          statusChanged: originalDelivery?.statusChanged ?? delivery.statusChanged,
          delivered_at: originalDelivery?.delivered_at ?? delivery.delivered_at,
          updated_at: originalDelivery?.updated_at ?? delivery.updated_at
        };
      });

      console.log('✅ Rota otimizada por proximidade - nº pacotes preservados');
      
      // Atualizar o estado
      setDeliveries(updatedOptimizedRoute);
      
      // Salvar no cache local com a sequência de entrega atualizada
      localStorage.setItem('currentRouteDeliveries', JSON.stringify(updatedOptimizedRoute));
      localStorage.setItem('currentUserId', user?.id || ''); // Salvar ownership

      if (currentRouteId) {
        const routeOrderUpdates = await Promise.allSettled(
          updatedOptimizedRoute.map((delivery) =>
            supabase
              .from('route_deliveries')
              .update({
                delivery_order: Number(delivery.optimizedOrder ?? delivery.orderNumber ?? 999999)
              })
              .eq('route_id', currentRouteId)
              .eq('delivery_id', delivery.id)
          )
        );

        const failedUpdates = routeOrderUpdates.filter((result) =>
          result.status === 'rejected' ||
          (result.status === 'fulfilled' && result.value.error)
        );

        if (failedUpdates.length > 0) {
          console.warn(`Falha ao persistir ${failedUpdates.length} atualização(ões) de ordem no Supabase.`);
        }
      }
      
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
  }, [currentRouteId, deliveries, logRouteAction, user]);

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
