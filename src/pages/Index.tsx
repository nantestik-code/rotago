
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ImportSection from '@/components/ImportSection';
import RouteViewSection from '@/components/RouteViewSection';
import { useDeliveries } from '@/hooks/use-deliveries';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { useRouteActions } from '@/components/RouteActions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActivityTracker } from '@/hooks/use-activity-tracker';
import { useRouteHistory } from '@/hooks/use-route-history';
import SubscriptionBanner from '@/components/subscription/SubscriptionBanner';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';

const STORAGE_KEY = 'rota-facil-turbo-state';

const Index = () => {
  const isMobile = useIsMobile();
  const [showFileImport, setShowFileImport] = useState(true);
  const { logRouteAction } = useRouteHistory();
  const { user } = useAuth();
  
  // Ativar o rastreamento de atividade para manter a sessão ativa
  useActivityTracker();
  
  const {
    deliveries,
    setDeliveries,
    selectedDeliveryId,
    setSelectedDeliveryId,
    processingGeocode,
    geocodeProgress,
    processingOptimization,
    handleImportComplete,
    handleStatusChange,
    optimizeDeliveryRoute,
    statusCounts
  } = useDeliveries();
  
  // Carregar estado salvo quando o componente é montado
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      const savedUserId = localStorage.getItem('currentUserId');
      const routeFinished = localStorage.getItem('route-finished');
      
      if (savedState && !routeFinished) {
        const parsedState = JSON.parse(savedState);
        
        // Validar ownership se usuário estiver logado
        if (user && savedUserId && savedUserId !== user.id) {
          console.log('🧹 Dados da landing page pertencem a outro usuário - limpando...');
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        
        // Verificar se os dados salvos são válidos
        if (parsedState.deliveries && Array.isArray(parsedState.deliveries) && parsedState.deliveries.length > 0) {
          // Perguntar ao usuário se quer continuar a rota anterior
          const continueRoute = window.confirm(
            `Você tem uma rota em andamento com ${parsedState.deliveries.length} entregas. Deseja continuar?`
          );
          
          if (continueRoute) {
            setDeliveries(parsedState.deliveries);
            setSelectedDeliveryId(parsedState.selectedDeliveryId || null);
            setShowFileImport(false);
            
            toast({
              title: 'Rota restaurada',
              description: `${parsedState.deliveries.length} entregas foram restauradas.`,
            });
          } else {
            // Limpar dados se usuário não quiser continuar
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('route-finished');
          }
        }
      } else if (routeFinished) {
        // Limpar flag de rota finalizada
        localStorage.removeItem('route-finished');
      }
    } catch (error) {
      console.error('Erro ao carregar estado salvo:', error);
    }
  }, []);
  
  // Salvar estado quando deliveries ou selectedDeliveryId mudam
  useEffect(() => {
    if (deliveries.length > 0) {
      try {
        const stateToSave = {
          deliveries,
          selectedDeliveryId,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (error) {
        console.error('Erro ao salvar estado:', error);
      }
    }
  }, [deliveries, selectedDeliveryId]);

  const {
    currentLocation,
    isTrackingActive,
    startTracking,
    stopTracking
  } = useLocationTracking(deliveries, setSelectedDeliveryId);

  const { handleExport } = useRouteActions(deliveries, handleNewRoute);

  // Handle deliveries import with UI update
  const handleImport = async (importedDeliveries, routeName = 'Nova Rota') => {
    try {
      // Registrar a criação da rota no histórico antes de processar a importação
      const result = await handleImportComplete(importedDeliveries, routeName);
      
      // Só redirecionar após a geocodificação terminar com sucesso
      if (result?.success) {
        setShowFileImport(false);
        
        // Registrar a ação no histórico de rotas se a importação foi bem-sucedida
        if (result?.routeId) {
          logRouteAction('create', result.routeId, {
            message: `Rota "${routeName}" criada com ${importedDeliveries.length} entregas`,
            delivery_count: importedDeliveries.length
          });
        }
      }
    } catch (error) {
      console.error('Erro durante importação:', error);
      // Manter na tela de importação se houver erro
    }
  };

  // Handle new route
  function handleNewRoute() {
    setShowFileImport(true);
    setDeliveries([]);
    setSelectedDeliveryId(null);
    stopTracking();
    
    // Limpar dados salvos no localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('route-finished');
    } catch (error) {
      console.error('Erro ao limpar estado salvo:', error);
    }
  }

  // Handle finish route
  function handleFinishRoute() {
    const completedDeliveries = deliveries.filter(d => d.status === 'entregue').length;
    const totalDeliveries = deliveries.length;
    
    const confirmFinish = window.confirm(
      `Finalizar rota?\n\nResumo:\n• ${completedDeliveries}/${totalDeliveries} entregas concluídas\n• ${totalDeliveries - completedDeliveries} pendentes/ocorrências\n\nEsta ação não pode ser desfeita.`
    );
    
    if (confirmFinish) {
      // Marcar rota como finalizada
      localStorage.setItem('route-finished', 'true');
      
      // Limpar dados da rota atual
      setShowFileImport(true);
      setDeliveries([]);
      setSelectedDeliveryId(null);
      stopTracking();
      
      // Limpar localStorage
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Erro ao limpar estado salvo:', error);
      }
      
      toast({
        title: 'Rota finalizada',
        description: `Rota concluída com ${completedDeliveries}/${totalDeliveries} entregas realizadas.`,
      });
    }
  }

  // Handle route optimization with current location
  const handleOptimizeRoute = () => {
    // A função optimizeDeliveryRoute já registra a ação no histórico internamente
    optimizeDeliveryRoute(currentLocation);
  };

  return (
    <div className="min-h-screen bg-gray-50 native-main-container">
      <Header />
      <SubscriptionBanner />
      
      <main className="container max-w-7xl mx-auto px-4 py-6">
        {showFileImport && (
          <ImportSection 
            onImportComplete={handleImport}
            processingGeocode={processingGeocode}
            geocodeProgress={geocodeProgress}
          />
        )}

        {!showFileImport && (
          <RouteViewSection 
            deliveries={deliveries}
            selectedDeliveryId={selectedDeliveryId}
            onSelectDelivery={setSelectedDeliveryId}
            onStatusChange={handleStatusChange}
            currentLocation={currentLocation}
            isTrackingActive={isTrackingActive}
            onStartTracking={startTracking}
            onStopTracking={stopTracking}
            onOptimizeRoute={handleOptimizeRoute}
            statusCounts={statusCounts}
            processingGeocode={processingGeocode}
            geocodeProgress={geocodeProgress}
            processingOptimization={processingOptimization}
            isMobile={isMobile}
            onBackToImport={() => {
              stopTracking();
              setShowFileImport(true);
              setDeliveries([]);
              setSelectedDeliveryId(null);
            }}
            onFinishRoute={handleFinishRoute}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
