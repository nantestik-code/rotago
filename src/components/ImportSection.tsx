
import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import FileImport from '@/components/FileImport';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, Plus, Route, Calendar, MapPin, Lock, Crown } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ImportSectionProps {
  onImportComplete: (deliveries: DeliveryItem[], routeName: string) => void;
  processingGeocode: boolean;
  geocodeProgress: number;
}

const ImportSection: React.FC<ImportSectionProps> = ({ 
  onImportComplete, 
  processingGeocode, 
  geocodeProgress 
}) => {
  const [routeName, setRouteName] = useState('');
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('import');
  const navigate = useNavigate();
  
  // Usar o hook de assinatura para verificar o status
  const { 
    subscription, 
    isSubscriptionActive, 
    isTrialActive, 
    trialDaysRemaining,
    loading: subscriptionLoading
  } = useSubscription();
  
  const handleCreateEmptyRoute = () => {
    if (!routeName.trim()) {
      toast({
        title: "Nome da rota obrigatório",
        description: "Por favor, informe um nome para a rota.",
        variant: "destructive",
      });
      return;
    }
    
    // Criar uma rota vazia com o nome e data definidos
    const emptyDeliveries: DeliveryItem[] = [];
    
    // Adicionar metadados da rota
    localStorage.setItem('current-route-name', routeName);
    localStorage.setItem('current-route-date', routeDate);
    
    // Sem notificação para reduzir o número de toasts
    
    onImportComplete(emptyDeliveries, routeName);
  };
  
  const handleImportComplete = (deliveries: DeliveryItem[]) => {
    // Verificar se o nome da rota foi informado
    if (!routeName.trim()) {
      toast({
        title: "Nome da rota obrigatório",
        description: "Por favor, informe um nome para a rota antes de importar.",
        variant: "destructive",
      });
      return;
    }
    
    // Salvar nome da rota
    localStorage.setItem('current-route-name', routeName);
    localStorage.setItem('current-route-date', routeDate);
    
    // Salvar no histórico de rotas
    saveRouteToHistory(routeName, routeDate);
    
    onImportComplete(deliveries, routeName);
  };
  
  // Função para salvar a rota no histórico - otimizada para evitar duplicações
  const saveRouteToHistory = (name: string, date: string) => {
    try {
      // Obter histórico existente ou iniciar um novo
      const existingHistory = localStorage.getItem('route-history');
      let routeHistory = existingHistory ? JSON.parse(existingHistory) : [];
      
      // Verificar se já existe uma rota com o mesmo nome
      const existingRouteIndex = routeHistory.findIndex((route: any) => route.name === name);
      
      // Criar o objeto da nova rota
      const newRoute = {
        id: Date.now().toString(),
        name,
        date,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      };
      
      // Se a rota já existe, atualizá-la
      if (existingRouteIndex >= 0) {
        routeHistory[existingRouteIndex] = {
          ...routeHistory[existingRouteIndex],
          lastAccessed: new Date().toISOString()
        };
      } else {
        // Adicionar nova rota ao histórico
        routeHistory.push(newRoute);
      }
      
      // Ordenar por último acesso
      routeHistory.sort((a: any, b: any) => 
        new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
      );
      
      // Limitar o histórico a 20 itens
      if (routeHistory.length > 20) {
        routeHistory = routeHistory.slice(0, 20);
      }
      
      // Salvar histórico atualizado
      localStorage.setItem('route-history', JSON.stringify(routeHistory));
    } catch (error) {
      console.error('Erro ao salvar rota no histórico:', error);
    }
  };
  
  // Verificar se o usuário pode acessar as funcionalidades de importação
  // Verificar diretamente o status da assinatura para maior confiabilidade
  const isTrialActiveManual = subscription?.is_trial && 
                             subscription?.trial_ends_at && 
                             new Date(subscription.trial_ends_at) > new Date();
                             
  const isSubscriptionActiveManual = subscription?.status === 'active' && subscription?.is_active;
  
  // Permitir acesso se estiver carregando, ou se o trial estiver ativo, ou se a assinatura estiver ativa
  const canAccessImport = subscriptionLoading || 
                         isTrialActiveManual || 
                         isSubscriptionActiveManual || 
                         (typeof isSubscriptionActive === 'function' && isSubscriptionActive()) || 
                         (typeof isTrialActive === 'function' && isTrialActive());
  
  // Log apenas em desenvolvimento e com menos frequência
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
    console.log('📚 ImportSection:', { 
      subscriptionLoading, 
      canAccessImport,
      hasSubscription: !!subscription
    });
  }
  
  // Função para navegar para a página de assinatura
  const goToSubscription = () => {
    navigate('/subscription');
  };
  
  return (
    <div className="max-w-2xl mx-auto py-4 pb-20">
      {/* Mostrar alerta quando o período de trial expirou */}
      {!subscriptionLoading && !canAccessImport && subscription && (
        <Alert className="border-amber-200 bg-amber-50 mb-4">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-800">
                <strong>Período gratuito expirado!</strong> Assine um plano para continuar importando planilhas.
              </span>
              <Badge className="bg-amber-100 text-amber-800 ml-2">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </div>
            <Button 
              size="sm" 
              onClick={goToSubscription}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Assinar Agora
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="w-full mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold">Criar Nova Rota</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="route-name">Nome da Rota</Label>
              <Input 
                id="route-name" 
                placeholder="Ex: Entregas Centro - Manhã" 
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="route-date">Data da Rota</Label>
              <Input 
                id="route-date" 
                type="date" 
                value={routeDate}
                onChange={(e) => setRouteDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="import" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="import" className="flex items-center gap-1 text-xs sm:text-sm">
            <FileUp size={16} />
            <span className="hidden xs:inline">Importar Planilha</span>
            <span className="xs:hidden">Importar</span>
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-1 text-xs sm:text-sm">
            <Plus size={16} />
            <span className="hidden xs:inline">Criar Manualmente</span>
            <span className="xs:hidden">Criar</span>
          </TabsTrigger>
          <TabsTrigger value="empty" className="flex items-center gap-1 text-xs sm:text-sm">
            <Route size={16} />
            <span className="hidden xs:inline">Rota Vazia</span>
            <span className="xs:hidden">Vazia</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Importar Planilha
                {!canAccessImport && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Premium
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canAccessImport ? (
                <FileImport onImportComplete={handleImportComplete} routeName={routeName} />
              ) : (
                <div className="p-4 border border-dashed border-gray-300 rounded-md bg-gray-50">
                  <div className="text-center">
                    <Lock className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                    <p className="text-sm text-gray-600 mb-3">
                      A importação de planilhas é uma funcionalidade premium.
                      Assine um plano para continuar utilizando.
                    </p>
                    <Button 
                      onClick={goToSubscription}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Ver Planos
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Adicionar Entregas Manualmente
                {!canAccessImport && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Premium
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Crie uma rota adicionando endereços manualmente um a um.
              </p>
              {canAccessImport ? (
                <Button 
                  className="w-full" 
                  onClick={handleCreateEmptyRoute}
                >
                  <Plus size={16} className="mr-2" />
                  Criar e Adicionar Entregas
                </Button>
              ) : (
                <div className="p-4 border border-dashed border-gray-300 rounded-md bg-gray-50 mt-4">
                  <div className="text-center">
                    <Lock className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                    <p className="text-sm text-gray-600 mb-3">
                      A criação de rotas é uma funcionalidade premium.
                      Assine um plano para continuar utilizando.
                    </p>
                    <Button 
                      onClick={goToSubscription}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Ver Planos
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="empty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Iniciar Rota Vazia
                {!canAccessImport && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Premium
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Crie uma rota vazia para usar apenas o GPS e navegação.
              </p>
              {canAccessImport ? (
                <Button 
                  className="w-full" 
                  onClick={handleCreateEmptyRoute}
                >
                  <MapPin size={16} className="mr-2" />
                  Iniciar Rota
                </Button>
              ) : (
                <div className="p-4 border border-dashed border-gray-300 rounded-md bg-gray-50 mt-4">
                  <div className="text-center">
                    <Lock className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                    <p className="text-sm text-gray-600 mb-3">
                      A criação de rotas vazias é uma funcionalidade premium.
                      Assine um plano para continuar utilizando.
                    </p>
                    <Button 
                      onClick={goToSubscription}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Ver Planos
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {processingGeocode && geocodeProgress > 0 && (
        <div className="my-4">
          <p className="text-sm mb-1">Convertendo endereços em coordenadas...</p>
          <Progress value={geocodeProgress} className="h-1" />
        </div>
      )}
    </div>
  );
};

export default ImportSection;
