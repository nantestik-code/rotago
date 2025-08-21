
import React, { useState, useEffect } from "react";
import { supabaseAdmin } from "@/integrations/supabase/admin-client";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { logger } from "@/utils/logger";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Users, Search, Filter, Eye, EyeOff, UserPlus, Trash2, Download, Upload, Shield, CheckCircle2, Loader2, XCircle, PieChart, Crown, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent 
} from "@/components/ui/chart";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Progress } from "@/components/ui/progress";

interface UserProfile {
  id: string;
  full_name: string | null;
  cpf: string | null;
  avatar_url: string | null;
  role: string | null;
  is_early_adopter: boolean | null;
  subscription_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Extended status type for user filtering
type UserStatus = "all" | "free" | "premium" | "admin";

const UsersManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus>("all");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'admin'
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const { admin, isAdminLoggedIn } = useAdminAuth();

  const fetchUsers = async () => {
    logger.info('ADMIN', 'Iniciando busca de usuários', {
      component: 'UsersManagement',
      function: 'fetchUsers'
    });

    try {
      setLoading(true);
      
      // Verificar se há uma sessão administrativa ativa
      if (!isAdminLoggedIn || !admin) {
        logger.warn('SECURITY', 'Tentativa de acesso admin sem sessão ativa', {
          component: 'UsersManagement',
          function: 'fetchUsers',
          data: { hasSession: false }
        });
        console.warn('⚠️ Sem sessão ativa para acesso administrativo');
        setUsers([]); // Limpar dados
        setLoading(false);
        return;
      }

      logger.debug('DATABASE', 'Consultando tabela profiles', {
        component: 'UsersManagement',
        function: 'fetchUsers',
        data: { 
          table: 'profiles',
          adminEmail: admin.email,
          hasSession: true
        }
      });

      // Buscar usuários usando cliente administrativo
      console.log('🔍 [UsersManagement] Buscando usuários com admin:', admin.email);
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('DATABASE', 'Erro ao buscar usuários', {
          component: 'UsersManagement',
          function: 'fetchUsers',
          error,
          data: { 
            errorCode: error.code,
            errorMessage: error.message,
            adminId: admin.id,
          }
        });
        console.error('❌ Erro ao buscar usuários:', error);
        
        // Verificar se é um erro de RLS/permissão
        if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
          logger.warn('SECURITY', 'Acesso bloqueado por políticas RLS - usando dados de demonstração', {
            component: 'UsersManagement',
            function: 'fetchUsers',
            data: { 
              errorCode: error.code,
              securityLevel: 'RLS_BLOCKED'
            }
          });

          setIsDemoMode(true);
          
          toast({
            title: "Modo Demonstração",
            description: "Exibindo dados simulados devido às políticas de segurança RLS.",
            variant: "default",
          });
          
          // Criar dados de exemplo para demonstração
          const mockUsers = [
            {
              id: 'demo-1',
              full_name: 'João Silva Santos',
              avatar_url: null,
              is_early_adopter: false,
              subscription_status: 'free',
              created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'demo-2', 
              full_name: 'Maria Oliveira Costa',
              avatar_url: null,
              is_early_adopter: true,
              subscription_status: 'premium',
              created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'demo-3',
              full_name: 'Carlos Eduardo Lima',
              avatar_url: null,
              is_early_adopter: false,
              subscription_status: 'trial',
              created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'demo-4',
              full_name: 'Ana Paula Ferreira',
              avatar_url: null,
              is_early_adopter: true,
              subscription_status: 'premium',
              created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
            }
          ];
          
          setUsers(mockUsers);
          logger.info('ADMIN', 'Dados de demonstração carregados', {
            component: 'UsersManagement',
            function: 'fetchUsers',
            data: { mockUsersCount: mockUsers.length }
          });
          console.log('📊 Exibindo dados de demonstração devido às políticas RLS');
        } else {
          throw error;
        }
        return;
      }

      setUsers(data || []);
      logger.info('ADMIN', 'Usuários carregados com sucesso', {
        component: 'UsersManagement',
        function: 'fetchUsers',
        data: { 
          usersCount: data?.length || 0,
          adminId: admin.id
        }
      });
      console.log('✅ Usuários carregados com sucesso:', data?.length || 0);
      
    } catch (error: any) {
      logger.error('ADMIN', 'Erro inesperado ao carregar usuários', {
        component: 'UsersManagement',
        function: 'fetchUsers',
        error: error as Error,
        data: { errorMessage: error.message }
      });
      console.error('❌ Erro inesperado:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const createAdmin = async () => {
    if (isDemoMode) {
      toast({
        title: "Modo Demonstração",
        description: "Criação de admin não permitida em modo demonstração.",
        variant: "default",
      });
      return;
    }

    if (!newAdminData.email || !newAdminData.password || !newAdminData.full_name) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingAdmin(true);
      
      logger.info('ADMIN', 'Iniciando criação de novo administrador', {
        component: 'UsersManagement',
        function: 'createAdmin',
        data: { 
          email: newAdminData.email,
          full_name: newAdminData.full_name,
          role: newAdminData.role
        }
      });

      // 1. Criar usuário no Supabase Auth
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = authUsers?.users?.find(user => user.email === newAdminData.email);
      if (existingUser) {
        logger.error('AUTH', 'Erro ao criar usuário no Supabase Auth', {
          component: 'UsersManagement',
          function: 'createAdmin',
          error: new Error('Usuário já existe')
        });
        throw new Error('Usuário já existe');
      }

      const { data: authData, error: authCreateError } = await supabaseAdmin.auth.signUp({
        email: newAdminData.email,
        password: newAdminData.password,
        options: {
          data: {
            full_name: newAdminData.full_name,
            role: newAdminData.role
          }
        }
      });

      if (authCreateError) {
        logger.error('AUTH', 'Erro ao criar usuário no Supabase Auth', {
          component: 'UsersManagement',
          function: 'createAdmin',
          error: authCreateError
        });
        throw authCreateError;
      }

      if (!authData.user) {
        throw new Error('Usuário não foi criado no Supabase Auth');
      }

      logger.info('AUTH', 'Usuário criado no Supabase Auth', {
        component: 'UsersManagement', 
        function: 'createAdmin',
        data: { userId: authData.user.id }
      });

      // 2. Criar perfil na tabela profiles
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: newAdminData.full_name,
          role: newAdminData.role,
          is_early_adopter: true, // Admins são early adopters
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.error('DATABASE', 'Erro ao criar perfil do admin', {
          component: 'UsersManagement',
          function: 'createAdmin', 
          error: error
        });
        throw error;
      }

      // 3. Criar entrada na tabela admins
      const { error: adminError } = await supabaseAdmin
        .from('admins')
        .insert({
          id: authData.user.id,
          email: newAdminData.email,
          full_name: newAdminData.full_name,
          role: newAdminData.role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (adminError) {
        logger.error('DATABASE', 'Erro ao criar entrada na tabela admins', {
          component: 'UsersManagement',
          function: 'createAdmin',
          error: adminError
        });
        // Não falhar aqui, pois o usuário já foi criado
        console.warn('⚠️ Admin criado mas não foi possível adicionar à tabela admins:', adminError);
      }

      logger.info('ADMIN', 'Administrador criado com sucesso', {
        component: 'UsersManagement',
        function: 'createAdmin',
        data: {
          userId: authData.user.id,
          email: newAdminData.email,
          role: newAdminData.role
        }
      });

      toast({
        title: "Admin criado com sucesso!",
        description: `Administrador ${newAdminData.full_name} foi criado e pode fazer login.`,
        variant: "default",
      });

      // Limpar formulário e fechar modal
      setNewAdminData({
        email: '',
        password: '',
        full_name: '',
        role: 'admin'
      });
      setShowCreateAdmin(false);
      
      // Recarregar lista de usuários
      fetchUsers();

    } catch (error: any) {
      logger.error('ADMIN', 'Erro ao criar administrador', {
        component: 'UsersManagement',
        function: 'createAdmin',
        error: error as Error
      });
      
      toast({
        title: "Erro ao criar admin",
        description: error.message || "Erro desconhecido ao criar administrador",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const toggleAdminStatus = async (user: UserProfile) => {
    if (isDemoMode) {
      toast({
        title: "Modo Demonstração",
        description: "Alterações não são permitidas em modo demonstração.",
        variant: "default",
      });
      return;
    }

    try {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_early_adopter: !user.is_early_adopter })
        .eq("id", user.id);
      
      if (error) throw error;
      
      toast({
        title: "Status atualizado",
        description: `${user.full_name || "Usuário"} ${!user.is_early_adopter ? "agora é" : "não é mais"} administrador.`,
      });
      
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter users based on search query and status filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery.trim() === "" || 
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    
    let matchesStatus = true;
    if (statusFilter === "admin") {
      matchesStatus = user.is_early_adopter === true;
    } else if (statusFilter === "premium") {
      matchesStatus = user.subscription_status === "premium";
    } else if (statusFilter === "free") {
      matchesStatus = user.subscription_status === "free" || !user.subscription_status;
    }
    
    return matchesSearch && matchesStatus;
  });

  // Calculate user statistics
  const userStats = {
    total: users.length,
    admin: users.filter(user => user.is_early_adopter === true).length,
    premium: users.filter(user => user.subscription_status === "premium").length,
    free: users.filter(user => user.subscription_status === "free" || !user.subscription_status).length,
  };

  // Prepare chart data
  const chartData = [
    { name: "Administradores", value: userStats.admin, color: "#3b82f6" },
    { name: "Premium", value: userStats.premium, color: "#10b981" },
    { name: "Gratuito", value: userStats.free, color: "#6b7280" },
  ];

  // Export users to CSV
  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = ["Nome", "Email", "Status", "Admin", "Data de Cadastro"];
      const csvRows = [
        headers.join(","),
        ...filteredUsers.map(user => {
          const status = user.is_early_adopter ? "Admin" : (user.subscription_status || "Free");
          const rowData = [
            user.full_name || "Nome não informado",
            "", // We don't have email in the current data model
            status,
            user.is_early_adopter ? "Sim" : "Não",
            formatDate(user.created_at)
          ];
          return rowData.map(value => `"${value}"`).join(",");
        })
      ];
      
      const csvContent = csvRows.join("\n");
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `usuarios-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Exportação Concluída",
        description: `${filteredUsers.length} usuários exportados com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando usuários...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
            <p className="text-white/80">Administre usuários e permissões do sistema</p>
          </div>
          <div className="ml-auto">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Tempo Real
            </Badge>
          </div>
        </div>
      </div>

      {/* Demo Mode Indicator */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
            <Separator orientation="vertical" className="h-8 bg-white/30" />
            <div>
              <span className="font-semibold">Modo Demonstração</span>
              <p className="text-white/90 text-sm mt-1">
                Os dados exibidos são simulados devido às políticas de segurança RLS.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-100">
                Total de Usuários
              </CardTitle>
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{userStats.total}</div>
            <Progress className="mt-2 bg-blue-400/30" value={100} />
            <div className="text-xs text-blue-100 mt-1">100% da base</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-100">
                Administradores
              </CardTitle>
              <Shield className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{userStats.admin}</div>
            <Progress 
              className="mt-2 bg-purple-400/30" 
              value={(userStats.admin / userStats.total) * 100} 
            />
            <div className="text-xs text-purple-100 mt-1">
              {((userStats.admin / userStats.total) * 100).toFixed(1)}% do total
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-emerald-100">
                Usuários Premium
              </CardTitle>
              <Crown className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{userStats.premium}</div>
            <Progress 
              className="mt-2 bg-emerald-400/30" 
              value={(userStats.premium / userStats.total) * 100} 
            />
            <div className="text-xs text-emerald-100 mt-1">
              {((userStats.premium / userStats.total) * 100).toFixed(1)}% do total
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-500 to-slate-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-100">
                Usuários Gratuitos
              </CardTitle>
              <UserCheck className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{userStats.free}</div>
            <Progress 
              className="mt-2 bg-slate-400/30" 
              value={(userStats.free / userStats.total) * 100} 
            />
            <div className="text-xs text-slate-100 mt-1">
              {((userStats.free / userStats.total) * 100).toFixed(1)}% do total
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Chart Section */}
        <Card className="w-full md:w-1/3 bg-gradient-to-br from-indigo-50 to-purple-50 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-lg flex items-center">
              <div className="p-1 bg-white/20 rounded-md mr-3">
                <PieChart className="h-5 w-5" />
              </div>
              Distribuição de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 p-6">
            <ChartContainer 
              config={{
                admin: { color: "#8b5cf6", label: "Administradores" },
                premium: { color: "#10b981", label: "Premium" },
                free: { color: "#64748b", label: "Gratuito" },
              }}
            >
              <RechartsPieChart>
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    className="bg-white/95 backdrop-blur-sm border-0 shadow-lg rounded-lg"
                  />} 
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  labelLine={false}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartLegend 
                  content={<ChartLegendContent className="text-sm font-medium" />} 
                />
              </RechartsPieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Filters and Table */}
        <div className="w-full md:w-2/3 space-y-4">
          {/* Filters */}
          <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Buscar por nome ou email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={(value: UserStatus) => setStatusFilter(value)}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filtrar por status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os usuários</SelectItem>
                        <SelectItem value="free">Usuários gratuitos</SelectItem>
                        <SelectItem value="premium">Usuários premium</SelectItem>
                        <SelectItem value="admin">Administradores</SelectItem>
                      </SelectContent>
                    </Select>
                    <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
                      <DialogTrigger asChild>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Criar Admin
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold text-purple-800 flex items-center">
                            <Crown className="h-5 w-5 mr-2" />
                            Criar Novo Administrador
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Nome Completo *</label>
                            <Input
                              placeholder="Digite o nome completo"
                              value={newAdminData.full_name}
                              onChange={(e) => setNewAdminData(prev => ({ ...prev, full_name: e.target.value }))}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email *</label>
                            <Input
                              type="email"
                              placeholder="admin@rotago.com"
                              value={newAdminData.email}
                              onChange={(e) => setNewAdminData(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Senha *</label>
                            <Input
                              type="password"
                              placeholder="Digite uma senha segura"
                              value={newAdminData.password}
                              onChange={(e) => setNewAdminData(prev => ({ ...prev, password: e.target.value }))}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Função</label>
                            <Select 
                              value={newAdminData.role} 
                              onValueChange={(value) => setNewAdminData(prev => ({ ...prev, role: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                <SelectItem value="moderator">Moderador</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-start">
                              <Shield className="h-4 w-4 text-yellow-600 mt-0.5 mr-2" />
                              <div className="text-xs text-yellow-800">
                                <strong>Atenção:</strong> Este administrador terá acesso completo ao sistema e poderá fazer login imediatamente após a criação.
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowCreateAdmin(false)}
                            disabled={isCreatingAdmin}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={createAdmin}
                            disabled={isCreatingAdmin || !newAdminData.email || !newAdminData.password || !newAdminData.full_name}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {isCreatingAdmin ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Criando...
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Criar Admin
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700 shadow-md" 
                  onClick={exportToCSV}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="bg-white border-0 shadow-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-100 to-gray-100 border-0">
                  <TableHead className="font-semibold text-slate-700">Nome</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold text-slate-700">Data de Cadastro</TableHead>
                  <TableHead className="font-semibold text-slate-700">Admin</TableHead>
                  <TableHead className="font-semibold text-slate-700">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      {loading ? "Carregando..." : "Nenhum usuário encontrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                      <TableCell className="font-medium text-slate-900">{user.full_name || "Nome não informado"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.subscription_status === "premium" ? "default" : "secondary"}
                          className={
                            user.subscription_status === "premium" 
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white" 
                              : "bg-slate-100 text-slate-700"
                          }
                        >
                          {user.subscription_status || "free"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-slate-600">{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        {user.is_early_adopter ? (
                          <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-slate-300">
                            Usuário
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 hover:from-blue-600 hover:to-blue-700 shadow-sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-gray-800">
                                  Detalhes Completos do Cliente
                                </DialogTitle>
                              </DialogHeader>
                              {selectedUser && (
                                <div className="space-y-6 py-4">
                                  {/* Informações Pessoais */}
                                  <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                                      <Users className="h-4 w-4 mr-2" />
                                      Informações Pessoais
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="font-medium text-gray-700">ID do Usuário:</div>
                                      <div className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                        {selectedUser.id}
                                      </div>
                                      <div className="font-medium text-gray-700">Nome Completo:</div>
                                      <div className="font-medium">{selectedUser.full_name || "Não informado"}</div>
                                      <div className="font-medium text-gray-700">CPF:</div>
                                      <div className="font-medium text-blue-600">
                                        {selectedUser.cpf || "Não informado"}
                                      </div>
                                      <div className="font-medium text-gray-700">Role/Função:</div>
                                      <div>
                                        <Badge variant={selectedUser.role === 'admin' ? 'destructive' : 'secondary'}>
                                          {selectedUser.role || 'cliente'}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Status da Conta */}
                                  <div className="bg-green-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                                      <Shield className="h-4 w-4 mr-2" />
                                      Status da Conta
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="font-medium text-gray-700">Status da Assinatura:</div>
                                      <div>
                                        <Badge variant={selectedUser.subscription_status === 'active' ? 'default' : 'secondary'}>
                                          {selectedUser.subscription_status || "trial"}
                                        </Badge>
                                      </div>
                                      <div className="font-medium text-gray-700">É Administrador:</div>
                                      <div>
                                        <Badge variant={selectedUser.is_early_adopter ? 'destructive' : 'secondary'}>
                                          {selectedUser.is_early_adopter ? "Sim" : "Não"}
                                        </Badge>
                                      </div>
                                      <div className="font-medium text-gray-700">Avatar:</div>
                                      <div className="text-xs text-gray-500">
                                        {selectedUser.avatar_url ? "Configurado" : "Não configurado"}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Datas */}
                                  <div className="bg-purple-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-purple-800 mb-3 flex items-center">
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Histórico
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="font-medium text-gray-700">Data de Cadastro:</div>
                                      <div className="font-medium text-purple-600">
                                        {formatDate(selectedUser.created_at)}
                                      </div>
                                      <div className="font-medium text-gray-700">Última Atualização:</div>
                                      <div className="text-gray-600">
                                        {formatDate(selectedUser.updated_at)}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Ações Administrativas */}
                                  <div className="flex justify-between items-center pt-4 border-t">
                                    <div className="text-xs text-gray-500">
                                      Todas as informações do cliente estão sendo exibidas
                                    </div>
                                    <Button
                                      onClick={() => toggleAdminStatus(selectedUser)}
                                      disabled={isDemoMode}
                                      className={selectedUser.is_early_adopter 
                                        ? "bg-red-500 hover:bg-red-600" 
                                        : "bg-purple-500 hover:bg-purple-600"
                                      }
                                    >
                                      {selectedUser.is_early_adopter
                                        ? "Remover Admin"
                                        : "Tornar Admin"}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            className={
                              user.is_early_adopter 
                                ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-sm" 
                                : "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 hover:from-purple-600 hover:to-purple-700 shadow-sm"
                            }
                            onClick={() => toggleAdminStatus(user)}
                            disabled={isDemoMode}
                          >
                            {user.is_early_adopter ? "Remover Admin" : "Tornar Admin"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Info Footer */}
          <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="text-sm text-slate-600 flex items-center justify-between">
                <span>Exibindo {filteredUsers.length} de {users.length} usuários</span>
                <Badge variant="outline" className="text-slate-500">
                  Atualizado em tempo real
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UsersManagement;
