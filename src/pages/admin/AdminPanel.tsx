
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import UsersManagement from "@/components/admin/UsersManagement";
import SiteContent from "@/components/admin/SiteContent";
import Analytics from "@/components/admin/Analytics";
import { toast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const AdminPanel = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        navigate("/auth/login");
        return;
      }
      
      try {
        // Check if user has admin rights - for a simple implementation we're using the is_early_adopter field
        // In a production environment, you'd want a proper roles table
        if (profile?.is_early_adopter) {
          setIsAdmin(true);
        } else {
          toast({
            title: "Acesso não autorizado",
            description: "Você não tem permissões de administrador.",
            variant: "destructive",
          });
          navigate("/app");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate("/app");
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [user, navigate, profile]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return null; // Will redirect from useEffect
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Shield className="h-8 w-8 mr-2 text-primary" />
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        </div>
        <Button onClick={() => navigate("/app")}>Voltar ao App</Button>
      </div>
      
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>
                Gerencie os usuários cadastrados na plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo do Site</CardTitle>
              <CardDescription>
                Atualize banners, mensagens e outros conteúdos do site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SiteContent />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Visualize estatísticas de uso e desempenho do app.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Analytics />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
