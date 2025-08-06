
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  CreditCard, 
  Settings, 
  FileText,
  Shield,
  LogOut,
  Bug,
  Bell,
  Home
} from "lucide-react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import UsersManagement from "@/components/admin/UsersManagement";
import Analytics from "@/components/admin/Analytics";
import SiteContent from "@/components/admin/SiteContent";
import FinancialDashboard from "@/components/admin/FinancialDashboard";
import SubscriptionManagement from "@/components/admin/SubscriptionManagement";
import SystemSettings from "@/components/admin/SystemSettings";
import ReportsAndExports from "@/components/admin/ReportsAndExports";
import AuditLogs from "@/components/admin/AuditLogs";
import LogsViewer from "@/components/admin/LogsViewer";

const AdminPanel = () => {
  const { admin, logoutAdmin } = useAdminAuth();

  const handleLogout = async () => {
    await logoutAdmin();
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header com gradiente */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl opacity-90"></div>
          <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            {/* Breadcrumb */}
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="text-white/80 hover:text-white">
                    <Home className="w-4 h-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-white/60" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-white font-medium">
                    Painel Administrativo
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-4 border-white/30">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                      {admin?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'AD'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1">
                    Painel Administrativo
                  </h1>
                  <p className="text-white/80 text-lg">
                    Gerencie o sistema RotaGo
                  </p>
                  {admin && (
                    <p className="text-white/70 text-sm mt-1">
                      Bem-vindo, {admin.full_name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 relative"
                    >
                      <Bell className="w-5 h-5" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Notificações</p>
                  </TooltipContent>
                </Tooltip>

                <Badge 
                  variant="secondary" 
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {admin?.role === 'super_admin' ? 'Super Admin' : 
                   admin?.role === 'moderator' ? 'Moderador' : 'Administrador'}
                </Badge>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="text-white hover:bg-white/20 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fazer logout</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation com cores temáticas */}
        <Tabs defaultValue="analytics" className="w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 mb-6 border border-white/20 shadow-lg">
            <TabsList className="grid w-full grid-cols-9 bg-transparent gap-1">
              <TabsTrigger 
                value="analytics" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white hover:bg-blue-50 transition-all duration-200"
              >
                📊 Análises
              </TabsTrigger>
              <TabsTrigger 
                value="financial" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white hover:bg-green-50 transition-all duration-200"
              >
                💰 Financeiro
              </TabsTrigger>
              <TabsTrigger 
                value="subscriptions" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white hover:bg-purple-50 transition-all duration-200"
              >
                🎯 Assinaturas
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white hover:bg-orange-50 transition-all duration-200"
              >
                👥 Usuários
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white hover:bg-indigo-50 transition-all duration-200"
              >
                📈 Relatórios
              </TabsTrigger>
              <TabsTrigger 
                value="audit" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white hover:bg-red-50 transition-all duration-200"
              >
                🔍 Auditoria
              </TabsTrigger>
              <TabsTrigger 
                value="logs" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-500 data-[state=active]:to-gray-600 data-[state=active]:text-white hover:bg-gray-50 transition-all duration-200"
              >
                📝 Logs
              </TabsTrigger>
              <TabsTrigger 
                value="content" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white hover:bg-teal-50 transition-all duration-200"
              >
                📄 Conteúdo
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-500 data-[state=active]:to-slate-600 data-[state=active]:text-white hover:bg-slate-50 transition-all duration-200"
              >
                ⚙️ Configurações
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Contents com containers modernos */}
          <TabsContent value="analytics" className="mt-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <Analytics />
            </div>
          </TabsContent>

          <TabsContent value="financial" className="mt-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <FinancialDashboard />
            </div>
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <SubscriptionManagement />
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <UsersManagement />
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <ReportsAndExports />
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <AuditLogs />
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <LogsViewer />
            </div>
          </TabsContent>

          <TabsContent value="content" className="mt-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <SiteContent />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <SystemSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default AdminPanel;
