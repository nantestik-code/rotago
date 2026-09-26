
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
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Users, Search, Filter, Eye, EyeOff, UserPlus, Trash2, Download, Upload, Shield, CheckCircle2, Loader2, XCircle, PieChart, Crown, UserCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent 
} from "@/components/ui/chart";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Progress } from "@/components/ui/progress";

interface SubscriptionData {
  id: string;
  user_id: string;
  status: string;
  is_active: boolean | null;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

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
  subscriptions: SubscriptionData[] | null;
}

// Derived subscription status type
type DerivedSubscriptionStatus = "free" | "trial" | "premium" | "expired" | "pending";

// Extended status type for user filtering
type UserStatus = "all" | "free" | "premium" | "trial" | "expired" | "pending" | "admin";

interface AdminRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Deriva o status real de assinatura a partir dos dados de user_subscriptions.
 * Se houver múltiplas subscriptions, usa a mais recente.
 */
const getSubscriptionStatus = (user: UserProfile): DerivedSubscriptionStatus => {
  const subs = user.subscriptions;

  // Se não tem subscription -> "free"
  if (!subs || subs.length === 0) return "free";

  // Ordenar por data de criação/id (mais recente primeiro)
  // Como não temos created_at no select, usamos o último do array
  const latest = subs[subs.length - 1];
  const now = new Date();

  // Se is_trial e trial_ends_at > now -> "trial"
  if (latest.is_trial && latest.trial_ends_at) {
    const trialEnd = new Date(latest.trial_ends_at);
    if (trialEnd > now) return "trial";
    // Se is_trial e trial_ends_at <= now -> "expired"
    return "expired";
  }

  // Se status === 'active' e is_active e !is_trial -> verificar se período ainda é válido
  if (latest.status === 'active' && latest.is_active && !latest.is_trial) {
    // Verificar se current_period_end existe e se ainda não expirou
    if (latest.current_period_end) {
      const periodEnd = new Date(latest.current_period_end);
      if (periodEnd > now) return "premium";
      // Período expirou -> "expired"
      return "expired";
    }
    // Sem data de fim (ativação manual pelo admin) -> considerar premium
    return "premium";
  }

  // Se status === 'pending_payment' -> verificar se já expirou (mais de 3 dias)
  if (latest.status === 'pending_payment') {
    if (latest.current_period_end) {
      const periodEnd = new Date(latest.current_period_end);
      if (periodEnd < now) return "expired";
    }
    return "pending";
  }

  // Se status é 'expired' ou 'cancelled' -> "expired"
  if (latest.status === 'expired' || latest.status === 'cancelled') {
    return "expired";
  }

  // Caso default: se tem assinatura mas não é ativa -> "expired"
  if (!latest.is_active) return "expired";

  return "free";
};

const UsersManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
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
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<AdminRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

      // Buscar usuários usando cliente administrativo - queries separadas para evitar problemas de JOIN/RLS
      console.log('🔍 [UsersManagement] Buscando usuários com admin:', admin.email);

      // 1. Buscar todos os perfis
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        logger.error('DATABASE', 'Erro ao buscar perfis', {
          component: 'UsersManagement',
          function: 'fetchUsers',
          error: profilesError,
          data: {
            errorCode: profilesError.code,
            errorMessage: profilesError.message,
            adminId: admin.id,
          }
        });
        console.error('❌ Erro ao buscar perfis:', profilesError);
        throw profilesError;
      }

      // 2. Buscar todas as assinaturas
      const { data: subscriptionsData, error: subscriptionsError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id, user_id, status, is_active, is_trial, trial_ends_at, current_period_end');

      if (subscriptionsError) {
        logger.warn('DATABASE', 'Erro ao buscar assinaturas - continuando sem dados de assinatura', {
          component: 'UsersManagement',
          function: 'fetchUsers',
          error: subscriptionsError,
          data: {
            errorCode: subscriptionsError.code,
            errorMessage: subscriptionsError.message,
          }
        });
        console.warn('⚠️ Erro ao buscar assinaturas, continuando sem dados:', subscriptionsError);
        // Não lançar erro - continuar sem dados de assinatura
      }

      // 3. Fazer merge dos dados: mapear subscriptions por user_id
      const subscriptionsByUser = new Map<string, SubscriptionData[]>();
      if (subscriptionsData) {
        for (const sub of subscriptionsData) {
          const existing = subscriptionsByUser.get(sub.user_id) || [];
          existing.push(sub);
          subscriptionsByUser.set(sub.user_id, existing);
        }
      }

      // 4. Montar array final com profiles + subscriptions
      const data: UserProfile[] = (profilesData || []).map(profile => ({
        ...profile,
        subscriptions: subscriptionsByUser.get(profile.id) || null,
      }));

      setUsers(data);
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

  // Admins sao perfis com role administrativo. Nao existe tabela `admins`.
  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role, created_at, updated_at')
        .in('role', ['admin', 'super_admin', 'moderator'])
        .order('created_at', { ascending: false });
      if (error) throw error;

      setAdmins(
        (data || []).map((p: any) => ({
          id: p.id,
          email: '',
          full_name: p.full_name ?? '',
          role: p.role,
          is_active: true,
          created_at: p.created_at,
          updated_at: p.updated_at,
        })) as AdminRecord[]
      );
    } catch (error: any) {
      console.error('Erro ao buscar admins:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAdmins();
  }, []);

  const deleteUser = async (user: UserProfile) => {
    if (isDemoMode) return;
    try {
      setIsDeleting(true);

      // 1. Remover assinaturas
      await supabaseAdmin
        .from('user_subscriptions')
        .delete()
        .eq('user_id', user.id);

      // 2. Remover rotas e entregas relacionadas
      const { data: routes } = await supabaseAdmin
        .from('routes')
        .select('id')
        .eq('user_id', user.id);

      if (routes && routes.length > 0) {
        const routeIds = routes.map(r => r.id);
        await supabaseAdmin.from('route_deliveries').delete().in('route_id', routeIds);
        await supabaseAdmin.from('routes').delete().eq('user_id', user.id);
      }

      // 3. Remover perfil
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast({
        title: "Usuário excluído",
        description: `${user.full_name || 'Usuário'} foi removido do sistema.`,
      });

      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAdmin = async (adminRecord: AdminRecord) => {
    try {
      setIsDeleting(true);

      // Rebaixa para usuario comum em vez de apagar: a conta continua
      // existindo, so perde o acesso administrativo.
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'user', updated_at: new Date().toISOString() })
        .eq('id', adminRecord.id);

      if (error) throw error;

      toast({
        title: "Admin removido",
        description: `${adminRecord.full_name} foi removido do painel de admins.`,
      });

      setAdminToDelete(null);
      fetchAdmins();
    } catch (error: any) {
      toast({
        title: "Erro ao remover admin",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

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

      // 2. O trigger handle_new_user ja criou o perfil. Ajustar o nome.
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: newAdminData.full_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', authData.user.id);

      if (error) {
        logger.error('DATABASE', 'Erro ao atualizar perfil do admin', {
          component: 'UsersManagement',
          function: 'createAdmin',
          error: error
        });
        throw error;
      }

      // 3. Conceder o papel administrativo. A RPC valida no servidor que quem
      // chama e super_admin; o role nao pode ser gravado direto pelo cliente.
      const { error: roleError } = await supabaseAdmin.rpc('promote_user_to_role', {
        target_email: newAdminData.email,
        new_role: newAdminData.role
      });

      if (roleError) {
        logger.error('DATABASE', 'Erro ao conceder papel administrativo', {
          component: 'UsersManagement',
          function: 'createAdmin',
          error: roleError
        });
        throw new Error(`Conta criada, mas sem permissao de admin: ${roleError.message}`);
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
    
    const derivedStatus = getSubscriptionStatus(user);
    let matchesStatus = true;
    if (statusFilter === "admin") {
      matchesStatus = user.is_early_adopter === true;
    } else if (statusFilter === "premium") {
      matchesStatus = derivedStatus === "premium";
    } else if (statusFilter === "free") {
      matchesStatus = derivedStatus === "free";
    } else if (statusFilter === "trial") {
      matchesStatus = derivedStatus === "trial";
    } else if (statusFilter === "expired") {
      matchesStatus = derivedStatus === "expired";
    } else if (statusFilter === "pending") {
      matchesStatus = derivedStatus === "pending";
    }
    
    return matchesSearch && matchesStatus;
  });

  // Calculate user statistics using derived subscription status
  const userStats = {
    total: users.length,
    admin: users.filter(user => user.is_early_adopter === true).length,
    premium: users.filter(user => getSubscriptionStatus(user) === "premium").length,
    trial: users.filter(user => getSubscriptionStatus(user) === "trial").length,
    expired: users.filter(user => getSubscriptionStatus(user) === "expired").length,
    free: users.filter(user => getSubscriptionStatus(user) === "free").length,
    pending: users.filter(user => getSubscriptionStatus(user) === "pending").length,
  };

  // Prepare chart data
  const chartData = [
    { name: "Administradores", value: userStats.admin, color: "#8b5cf6" },
    { name: "Premium", value: userStats.premium, color: "#10b981" },
    { name: "Trial", value: userStats.trial, color: "#047857" },
    { name: "Expirados", value: userStats.expired, color: "#ef4444" },
    { name: "Pendentes", value: userStats.pending, color: "#f59e0b" },
    { name: "Gratuitos", value: userStats.free, color: "#6b7280" },
  ];

  // Export users to CSV
  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = ["Nome", "Status Assinatura", "Admin", "Data de Cadastro"];
      const csvRows = [
        headers.join(","),
        ...filteredUsers.map(user => {
          const derivedStatus = getSubscriptionStatus(user);
          const statusLabels: Record<DerivedSubscriptionStatus, string> = {
            free: "Gratuito",
            trial: "Trial",
            premium: "Premium",
            expired: "Trial Expirado",
            pending: "Pagamento Pendente",
          };
          const rowData = [
            user.full_name || "Nome não informado",
            statusLabels[derivedStatus],
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
      <div className="bg-gradient-to-r from-purple-600 via-brand-600 to-cyan-600 rounded-xl p-6 text-white">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-brand-500 to-brand-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-brand-100">
                Total
              </CardTitle>
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{userStats.total}</div>
            <div className="text-xs text-brand-100">Usuários</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-100">
                Admins
              </CardTitle>
              <Shield className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{userStats.admin}</div>
            <div className="text-xs text-purple-100">
              {userStats.total > 0 ? ((userStats.admin / userStats.total) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-emerald-100">
                Premium
              </CardTitle>
              <Crown className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{userStats.premium}</div>
            <div className="text-xs text-emerald-100">
              {userStats.total > 0 ? ((userStats.premium / userStats.total) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-brand-500 to-brand-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-brand-100">
                Trial
              </CardTitle>
              <UserCheck className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{userStats.trial}</div>
            <div className="text-xs text-brand-100">
              {userStats.total > 0 ? ((userStats.trial / userStats.total) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-red-100">
                Expirados
              </CardTitle>
              <XCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{userStats.expired}</div>
            <div className="text-xs text-red-100">
              {userStats.total > 0 ? ((userStats.expired / userStats.total) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-500 to-slate-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-100">
                Gratuitos
              </CardTitle>
              <UserCheck className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{userStats.free}</div>
            <div className="text-xs text-slate-100">
              {userStats.total > 0 ? ((userStats.free / userStats.total) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Chart Section */}
        <Card className="w-full md:w-1/3 bg-gradient-to-br from-brand-50 to-purple-50 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-brand-500 to-purple-600 text-white rounded-t-lg">
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
                trial: { color: "#047857", label: "Trial" },
                expired: { color: "#ef4444", label: "Expirados" },
                pending: { color: "#f59e0b", label: "Pendentes" },
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

        {/* Filters and Tables */}
        <div className="w-full md:w-2/3 space-y-4">
          <Tabs defaultValue="users">
            <TabsList className="mb-2">
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-1" /> Usuários ({users.length})
              </TabsTrigger>
              <TabsTrigger value="admins">
                <Shield className="h-4 w-4 mr-1" /> Admins ({admins.length})
              </TabsTrigger>
            </TabsList>

            {/* ── ABA USUÁRIOS ── */}
            <TabsContent value="users">
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
                        <SelectItem value="free">Gratuitos</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="expired">Trial expirado</SelectItem>
                        <SelectItem value="pending">Pagamento pendente</SelectItem>
                        <SelectItem value="admin">Administradores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-gradient-to-r from-brand-500 to-purple-600 text-white border-0 hover:from-brand-600 hover:to-purple-700 shadow-md"
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
                          variant="secondary"
                          className={(() => {
                            const ds = getSubscriptionStatus(user);
                            switch (ds) {
                              case "trial": return "bg-brand-100 text-brand-700";
                              case "premium": return "bg-emerald-100 text-emerald-700";
                              case "expired": return "bg-red-100 text-red-700";
                              case "pending": return "bg-amber-100 text-amber-700";
                              case "free": return "bg-slate-100 text-slate-700";
                              default: return "bg-slate-100 text-slate-700";
                            }
                          })()}
                        >
                          {(() => {
                            const ds = getSubscriptionStatus(user);
                            const labels: Record<DerivedSubscriptionStatus, string> = {
                              free: "Gratuito",
                              trial: "Trial",
                              premium: "Premium",
                              expired: "Expirado",
                              pending: "Pendente",
                            };
                            return labels[ds];
                          })()}
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
                                className="bg-gradient-to-r from-brand-500 to-brand-600 text-white border-0 hover:from-brand-600 hover:to-brand-700 shadow-sm"
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
                                  <div className="bg-brand-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-brand-800 mb-3 flex items-center">
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
                                      <div className="font-medium text-brand-600">
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
                                        {(() => {
                                          const ds = getSubscriptionStatus(selectedUser);
                                          const labelMap: Record<DerivedSubscriptionStatus, string> = {
                                            free: "Gratuito",
                                            trial: "Trial",
                                            premium: "Premium",
                                            expired: "Trial Expirado",
                                            pending: "Pagamento Pendente",
                                          };
                                          const colorMap: Record<DerivedSubscriptionStatus, string> = {
                                            free: "bg-slate-100 text-slate-700",
                                            trial: "bg-brand-100 text-brand-700",
                                            premium: "bg-emerald-100 text-emerald-700",
                                            expired: "bg-red-100 text-red-700",
                                            pending: "bg-amber-100 text-amber-700",
                                          };
                                          return <Badge className={colorMap[ds]}>{labelMap[ds]}</Badge>;
                                        })()}
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => setUserToDelete(user)}
                            disabled={isDemoMode}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-0 shadow-sm">
            <CardContent className="p-3">
              <div className="text-sm text-slate-600 flex items-center justify-between">
                <span>Exibindo {filteredUsers.length} de {users.length} usuários</span>
                <Badge variant="outline" className="text-slate-500">Atualizado em tempo real</Badge>
              </div>
            </CardContent>
          </Card>
            </TabsContent>

            {/* ── ABA ADMINS ── */}
            <TabsContent value="admins">
              <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-0 shadow-md mb-4">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Input
                      placeholder="Buscar admin por nome ou email..."
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
                      <DialogTrigger asChild>
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Novo Admin
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
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email *</label>
                            <Input
                              type="email"
                              placeholder="admin@rotago.com"
                              value={newAdminData.email}
                              onChange={(e) => setNewAdminData(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Senha *</label>
                            <Input
                              type="password"
                              placeholder="Digite uma senha segura"
                              value={newAdminData.password}
                              onChange={(e) => setNewAdminData(prev => ({ ...prev, password: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Função</label>
                            <Select value={newAdminData.role} onValueChange={(value) => setNewAdminData(prev => ({ ...prev, role: value }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                <SelectItem value="moderator">Moderador</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button variant="outline" onClick={() => setShowCreateAdmin(false)} disabled={isCreatingAdmin}>Cancelar</Button>
                          <Button onClick={createAdmin} disabled={isCreatingAdmin || !newAdminData.email || !newAdminData.password || !newAdminData.full_name} className="bg-purple-600 hover:bg-purple-700">
                            {isCreatingAdmin ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</> : <><UserCheck className="h-4 w-4 mr-2" />Criar Admin</>}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-slate-100 to-gray-100">
                      <TableHead className="font-semibold text-slate-700">Nome</TableHead>
                      <TableHead className="font-semibold text-slate-700">Email</TableHead>
                      <TableHead className="font-semibold text-slate-700">Função</TableHead>
                      <TableHead className="font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="font-semibold text-slate-700">Cadastro</TableHead>
                      <TableHead className="font-semibold text-slate-700">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins
                      .filter(a =>
                        adminSearchQuery.trim() === '' ||
                        a.full_name?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                        a.email?.toLowerCase().includes(adminSearchQuery.toLowerCase())
                      )
                      .map((a) => (
                        <TableRow key={a.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium">{a.full_name}</TableCell>
                          <TableCell className="text-sm text-slate-600">{a.email}</TableCell>
                          <TableCell>
                            <Badge className={a.role === 'super_admin' ? 'bg-purple-600 text-white' : 'bg-brand-500 text-white'}>
                              {a.role === 'super_admin' ? 'Super Admin' : a.role === 'moderator' ? 'Moderador' : 'Admin'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={a.is_active ? 'default' : 'secondary'}>
                              {a.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">{formatDate(a.created_at)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => setAdminToDelete(a)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Remover
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {admins.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                          Nenhum admin encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialog confirmação excluir usuário */}
      <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Excluir Usuário
            </DialogTitle>
            <DialogDescription>
              Isso removerá permanentemente <strong>{userToDelete?.full_name || 'este usuário'}</strong> do sistema, incluindo assinaturas e rotas. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={isDeleting}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => userToDelete && deleteUser(userToDelete)}
              disabled={isDeleting}
            >
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Excluindo...</> : 'Sim, excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmação remover admin */}
      <Dialog open={!!adminToDelete} onOpenChange={() => setAdminToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Remover Admin
            </DialogTitle>
            <DialogDescription>
              Isso removerá <strong>{adminToDelete?.full_name}</strong> ({adminToDelete?.email}) do painel de administradores. O usuário não poderá mais fazer login como admin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminToDelete(null)} disabled={isDeleting}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => adminToDelete && deleteAdmin(adminToDelete)}
              disabled={isDeleting}
            >
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Removendo...</> : 'Sim, remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
