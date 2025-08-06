import { useState } from "react";
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
  const [activeTab, setActiveTab] = useState('analytics');

  const handleLogout = async () => {
    await logoutAdmin();
  };

  const menuItems = [
    { id: 'analytics', label: 'Análises', icon: BarChart3, color: 'blue' },
    { id: 'financial', label: 'Financeiro', icon: DollarSign, color: 'green' },
    { id: 'subscriptions', label: 'Assinaturas', icon: CreditCard, color: 'purple' },
    { id: 'users', label: 'Usuários', icon: Users, color: 'orange' },
    { id: 'reports', label: 'Relatórios', icon: FileText, color: 'indigo' },
    { id: 'audit', label: 'Auditoria', icon: Shield, color: 'red' },
    { id: 'logs', label: 'Logs', icon: Bug, color: 'gray' },
    { id: 'content', label: 'Conteúdo', icon: FileText, color: 'teal' },
    { id: 'settings', label: 'Configurações', icon: Settings, color: 'slate' }
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white/90 backdrop-blur-sm border-r border-white/20 shadow-xl flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-12 h-12 border-2 border-blue-200">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                    {admin?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'AD'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-gray-800 text-lg">RotaGo Admin</h2>
                <p className="text-sm text-gray-600 truncate">{admin?.full_name}</p>
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className="mt-3 bg-blue-50 text-blue-700 border-blue-200 w-full justify-center"
            >
              <Shield className="w-3 h-3 mr-1" />
              {admin?.role === 'super_admin' ? 'Super Admin' : 
               admin?.role === 'moderator' ? 'Moderador' : 'Administrador'}
            </Badge>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                        isActive
                          ? `bg-gradient-to-r from-${item.color}-500 to-${item.color}-600 text-white shadow-lg transform scale-[1.02]`
                          : `hover:bg-${item.color}-50 text-gray-700 hover:text-${item.color}-700`
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : `text-${item.color}-500`}`} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200/50">
            <div className="flex items-center gap-2 mb-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Bell className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notificações</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="flex-1 text-gray-600 hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sair</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 p-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/" className="text-gray-600 hover:text-gray-800">
                    <Home className="w-4 h-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-gray-800 font-medium">
                    {menuItems.find(item => item.id === activeTab)?.label || 'Painel Administrativo'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="hidden"> {/* Hide the original TabsList */}
                <TabsList>
                  {menuItems.map(item => (
                    <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>
                  ))}
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
