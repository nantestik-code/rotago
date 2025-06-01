
import React, { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import FileImport from '@/components/FileImport';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, Plus, Route, Calendar, MapPin } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

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
  
  // Função para salvar a rota no histórico
  const saveRouteToHistory = (name: string, date: string) => {
    try {
      // Obter histórico existente ou iniciar um novo
      const existingHistory = localStorage.getItem('route-history');
      const routeHistory = existingHistory ? JSON.parse(existingHistory) : [];
      
      // Adicionar nova rota ao histórico
      routeHistory.push({
        id: `route-${Date.now()}`,
        name,
        date,
        createdAt: new Date().toISOString()
      });
      
      // Limitar a 20 rotas no histórico (opcional)
      if (routeHistory.length > 20) {
        routeHistory.shift(); // Remove a rota mais antiga
      }
      
      // Salvar histórico atualizado
      localStorage.setItem('route-history', JSON.stringify(routeHistory));
      
      console.log('Rota salva no histórico:', name);
    } catch (error) {
      console.error('Erro ao salvar rota no histórico:', error);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto py-4 pb-20">
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
              <CardTitle className="text-lg">Importar Planilha</CardTitle>
            </CardHeader>
            <CardContent>
              <FileImport onImportComplete={handleImportComplete} routeName={routeName} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adicionar Entregas Manualmente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Crie uma rota adicionando endereços manualmente um a um.
              </p>
              <Button 
                className="w-full" 
                onClick={handleCreateEmptyRoute}
              >
                <Plus size={16} className="mr-2" />
                Criar e Adicionar Entregas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="empty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Iniciar Rota Vazia</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Crie uma rota vazia para usar apenas o GPS e navegação.
              </p>
              <Button 
                className="w-full" 
                onClick={handleCreateEmptyRoute}
              >
                <MapPin size={16} className="mr-2" />
                Iniciar Rota
              </Button>
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
