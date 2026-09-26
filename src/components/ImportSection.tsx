
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
  // Usar a função isSubscriptionActive que já tem toda a lógica correta
  const canAccessImport = subscriptionLoading || isSubscriptionActive;
  
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
    <div className="mx-auto max-w-2xl py-8 pb-20">
      {/* Usuário sem assinatura: convidar a escolher um plano para trial */}
      {!subscriptionLoading && !canAccessImport && !subscription && (
        <Alert className="mb-5 rounded-2xl border-brand-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(219,234,254,0.9)_100%)] shadow-[0_18px_36px_-28px_rgba(37,99,235,0.35)]">
          <Crown className="h-4 w-4 text-brand-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-brand-800">
              <strong>Bem-vindo!</strong> Escolha um plano para ativar seu período gratuito.
            </span>
            <Button
              size="sm"
              onClick={goToSubscription}
              className="bg-brand-600 hover:bg-brand-700 text-white ml-3 shrink-0"
            >
              Ver Planos
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {/* Trial expirado */}
      {!subscriptionLoading && !canAccessImport && subscription && (
        <Alert className="mb-5 rounded-2xl border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.9)_100%)] shadow-[0_18px_36px_-28px_rgba(217,119,6,0.35)]">
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
      
      <section className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-[0_30px_60px_-36px_rgba(37,99,235,0.25)]">
        <div className="border-b border-brand-100 bg-gradient-to-r from-emerald-50 via-white to-brand-50 px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">Nova rota</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Importar planilha</h1>
          <p className="mt-1 text-sm text-slate-500">Um arquivo. Sem telas extras para planilha SPX.</p>
        </div>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-[1.4fr_0.8fr]">
          <div className="grid gap-2">
            <Label htmlFor="route-name" className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Nome</Label>
            <Input
              id="route-name"
              placeholder="Gabriela Tapia — manhã"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="route-date" className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Data</Label>
            <Input
              id="route-date"
              type="date"
              value={routeDate}
              onChange={(e) => setRouteDate(e.target.value)}
              className="h-11"
            />
          </div>
        </div>
        <div className="px-6 pb-6">
          {canAccessImport ? (
            <FileImport onImportComplete={handleImportComplete} routeName={routeName} />
          ) : (
            <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-8 text-center">
              <p className="text-sm text-slate-600">Assine para importar rotas.</p>
              <Button onClick={goToSubscription} className="mt-4 bg-brand-600 text-white hover:bg-brand-700">
                Ver planos
              </Button>
            </div>
          )}
          <div className="mt-4 flex gap-3 text-xs text-slate-500">
            <button type="button" className="hover:text-brand-700 hover:underline" onClick={() => { setActiveTab('create'); handleCreateEmptyRoute(); }}>
              Adicionar endereços na mão
            </button>
            <span>·</span>
            <button type="button" className="hover:text-brand-700 hover:underline" onClick={handleCreateEmptyRoute}>
              Só GPS
            </button>
          </div>
        </div>
      </section>

      <Tabs defaultValue="import" value={activeTab} onValueChange={setActiveTab} className="hidden">
        <TabsList>
          <TabsTrigger value="import">Importar</TabsTrigger>
          <TabsTrigger value="create">Criar</TabsTrigger>
          <TabsTrigger value="empty">Vazia</TabsTrigger>
        </TabsList>
        <TabsContent value="import" />
        
        <TabsContent value="create" className="space-y-4">
          <Card className="border-white/70 bg-white/90 shadow-[0_24px_44px_-32px_rgba(15,23,42,0.28)]">
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
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-5">
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
          <Card className="border-white/70 bg-white/90 shadow-[0_24px_44px_-32px_rgba(15,23,42,0.28)]">
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
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-5">
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
