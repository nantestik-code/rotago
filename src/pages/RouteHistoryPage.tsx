import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RouteHistoryList } from '@/components/RouteHistoryList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Users, MapPin, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function RouteHistoryPage() {
  const { user, profile, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('meu-historico');
  const isAdmin = profile?.role === 'admin';

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Carregando...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-red-600">Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa estar logado para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Histórico de Rotas | RotaFacil</title>
      </Helmet>
      
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <Link to="/app">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Mapa
            </Button>
          </Link>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <History className="mr-2" /> 
            Histórico de Rotas
          </h1>
          <p className="text-gray-600">
            Acompanhe todas as atividades relacionadas às suas rotas de entrega.
          </p>
        </div>

        <Tabs 
          defaultValue="meu-historico" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="meu-historico" className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              Meu Histórico
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="todos-usuarios" className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Todos os Usuários
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="meu-historico" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Meu Histórico de Atividades</CardTitle>
                <CardDescription>
                  Visualize todas as suas atividades no sistema, incluindo otimizações de rota e atualizações de status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RouteHistoryList showUserInfo={false} limit={15} />
              </CardContent>
            </Card>
          </TabsContent>
          
          {isAdmin && (
            <TabsContent value="todos-usuarios" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Todos os Usuários</CardTitle>
                  <CardDescription>
                    Como administrador, você pode visualizar as atividades de todos os usuários do sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RouteHistoryList showUserInfo={true} limit={15} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  );
}
