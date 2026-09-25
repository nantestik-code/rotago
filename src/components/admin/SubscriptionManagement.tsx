import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/utils/logger";
import { asaasService } from "@/services/asaas";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  gateway_plan_id?: string;
}

interface UserSubscription {
  id: string;
  user_id: string;
  subscription_id?: string;
  external_id?: string;
  plan_id?: string;
  is_active: boolean;
  is_trial: boolean;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  canceled_at?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  email?: string;
  metadata?: any;
  profiles?: {
    full_name: string;
  };
}

const SubscriptionManagement = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<UserSubscription | null>(null);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    subscriptionId: string;
    userName: string;
    actionLabel: string;
    action: () => void;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      logger.info('ADMIN', 'Iniciando busca de dados de assinaturas e planos', {
        component: 'SubscriptionManagement',
        function: 'fetchData'
      });
      
      // Buscar planos
      logger.debug('ADMIN', 'Buscando planos de assinatura', {
        component: 'SubscriptionManagement',
        function: 'fetchData',
        table: 'subscription_plans'
      });

      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (plansError) {
        logger.error('ADMIN', 'Erro ao buscar planos de assinatura', {
          component: 'SubscriptionManagement',
          function: 'fetchData',
          table: 'subscription_plans',
          error: plansError.message,
          code: plansError.code
        });
        throw plansError;
      }

      logger.info('ADMIN', 'Planos de assinatura carregados com sucesso', {
        component: 'SubscriptionManagement',
        function: 'fetchData',
        table: 'subscription_plans',
        count: plansData?.length || 0
      });

      // Buscar assinaturas com dados do usuário
      logger.debug('ADMIN', 'Buscando assinaturas de usuários', {
        component: 'SubscriptionManagement',
        function: 'fetchData',
        table: 'user_subscriptions'
      });

      const { data: subscriptionsData, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) {
        logger.error('ADMIN', 'Erro ao buscar assinaturas de usuários', {
          component: 'SubscriptionManagement',
          function: 'fetchData',
          table: 'user_subscriptions',
          error: subsError.message,
          code: subsError.code
        });

        toast({
          title: "Erro ao carregar assinaturas",
          description: `Erro: ${subsError.message}`,
          variant: "destructive",
        });

        // Definir arrays vazios em caso de erro, mas não ativar modo demo
        setSubscriptions([]);
        setPlans(plansData || []);
        setIsDemoMode(false);
        setLoading(false);
        return;
      }

      logger.info('ADMIN', 'Assinaturas de usuários carregadas com sucesso', {
        component: 'SubscriptionManagement',
        function: 'fetchData',
        table: 'user_subscriptions',
        count: subscriptionsData?.length || 0
      });

      // Buscar perfis dos usuários separadamente
      let subscriptionsWithProfiles = subscriptionsData || [];
      
      if (subscriptionsData && subscriptionsData.length > 0) {
        const userIds = subscriptionsData.map(sub => sub.user_id);
        
        logger.debug('ADMIN', 'Buscando perfis dos usuários', {
          component: 'SubscriptionManagement',
          function: 'fetchData',
          table: 'profiles',
          userIds: userIds.length
        });

        // Nao existe mais um mapa de perfis fixo no codigo. Havia aqui nome e
        // email de 18 clientes reais, que iam para o bundle JS servido a
        // qualquer visitante. Os dados vem do banco, protegidos por RLS.

        // Buscar perfis do banco
        let profilesData = [];
        let profilesError = null;
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, cpf')
            .in('id', userIds);
          
          profilesData = data || [];
          profilesError = error;
          
          logger.info('ADMIN', 'Perfis buscados do banco', {
            component: 'SubscriptionManagement',
            function: 'fetchData',
            profilesFound: profilesData.length,
            totalRequested: userIds.length,
            error: profilesError?.message
          });
        } catch (error) {
          logger.warn('ADMIN', 'Erro ao buscar perfis do banco', {
            component: 'SubscriptionManagement',
            function: 'fetchData',
            error: error.message
          });
        }

        // Combinar dados de assinaturas com perfis do banco
        subscriptionsWithProfiles = subscriptionsData.map(subscription => {
          let profile = profilesData.find(p => p.id === subscription.user_id);

          if (!profile) {
            profile = {
              id: subscription.user_id,
              full_name: `Usuário ${subscription.user_id.substring(0, 8)}`,
              cpf: null
            };
          }

          const email = subscription.email || '—';

          return {
            ...subscription,
            profiles: {
              ...profile,
              email: email
            }
          };
        });

        logger.info('ADMIN', 'Perfis e emails de usuários processados', {
          component: 'SubscriptionManagement',
          function: 'fetchData',
          totalSubscriptions: subscriptionsWithProfiles.length,
          profilesFromDB: profilesData.length,
          profilesMissing: userIds.length - profilesData.length,
          sampleData: subscriptionsWithProfiles.slice(0, 2).map(s => ({
            user_id: s.user_id.substring(0, 8),
            profile_name: s.profiles?.full_name,
            profile_email: s.profiles?.email
          }))
        });
      }

      setPlans(plansData || []);
      setSubscriptions(subscriptionsWithProfiles);

      logger.info('ADMIN', 'Dados de assinaturas e planos carregados com sucesso', {
        component: 'SubscriptionManagement',
        function: 'fetchData',
        plansCount: plansData?.length || 0,
        subscriptionsCount: subscriptionsData?.length || 0
      });
    } catch (error: any) {
      logger.error('ADMIN', 'Erro inesperado ao carregar dados de assinaturas', {
        component: 'SubscriptionManagement',
        function: 'fetchData',
        error: error.message
      });

      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (planData: Partial<SubscriptionPlan>) => {
    try {
      if (editingPlan) {
        logger.info('ADMIN', 'Iniciando atualização de plano de assinatura', {
          component: 'SubscriptionManagement',
          function: 'handleSavePlan',
          planId: editingPlan.id,
          planName: planData.name,
          operation: 'update'
        });
        
        // Atualizar plano existente
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) {
          logger.error('ADMIN', 'Erro ao atualizar plano de assinatura', {
            component: 'SubscriptionManagement',
            function: 'handleSavePlan',
            planId: editingPlan.id,
            planName: planData.name,
            error: error.message,
            code: error.code
          });
          throw error;
        }

        logger.info('ADMIN', 'Plano de assinatura atualizado com sucesso', {
          component: 'SubscriptionManagement',
          function: 'handleSavePlan',
          planId: editingPlan.id,
          planName: planData.name,
          operation: 'update'
        });

        toast({
          title: "Plano atualizado",
          description: "O plano foi atualizado com sucesso.",
        });
      } else {
        logger.info('ADMIN', 'Iniciando criação de novo plano de assinatura', {
          component: 'SubscriptionManagement',
          function: 'handleSavePlan',
          planName: planData.name,
          planPrice: planData.price,
          operation: 'create'
        });

        // Criar novo plano
        const { error } = await supabase
          .from('subscription_plans')
          .insert([planData]);

        if (error) {
          logger.error('ADMIN', 'Erro ao criar plano de assinatura', {
            component: 'SubscriptionManagement',
            function: 'handleSavePlan',
            planName: planData.name,
            planPrice: planData.price,
            error: error.message,
            code: error.code
          });
          throw error;
        }

        logger.info('ADMIN', 'Plano de assinatura criado com sucesso', {
          component: 'SubscriptionManagement',
          function: 'handleSavePlan',
          planName: planData.name,
          planPrice: planData.price,
          operation: 'create'
        });

        toast({
          title: "Plano criado",
          description: "O novo plano foi criado com sucesso.",
        });
      }

      setIsDialogOpen(false);
      setEditingPlan(null);
      fetchData();
    } catch (error: any) {
      logger.error('ADMIN', 'Erro inesperado ao salvar plano de assinatura', {
        component: 'SubscriptionManagement',
        function: 'handleSavePlan',
        planName: planData.name,
        operation: editingPlan ? 'update' : 'create',
        error: error.message
      });

      toast({
        title: "Erro ao salvar plano",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;

    try {
      logger.info('ADMIN', 'Iniciando exclusão de plano de assinatura', {
        component: 'SubscriptionManagement',
        function: 'handleDeletePlan',
        planId: planId
      });

      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        logger.error('ADMIN', 'Erro ao excluir plano de assinatura', {
          component: 'SubscriptionManagement',
          function: 'handleDeletePlan',
          planId: planId,
          error: error.message,
          code: error.code
        });
        throw error;
      }

      logger.info('ADMIN', 'Plano de assinatura excluído com sucesso', {
        component: 'SubscriptionManagement',
        function: 'handleDeletePlan',
        planId: planId
      });

      toast({
        title: "Plano excluído",
        description: "O plano foi excluído com sucesso.",
      });

      fetchData();
    } catch (error: any) {
      logger.error('ADMIN', 'Erro inesperado ao excluir plano de assinatura', {
        component: 'SubscriptionManagement',
        function: 'handleDeletePlan',
        planId: planId,
        error: error.message
      });

      toast({
        title: "Erro ao excluir plano",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExtendTrial = async (subscriptionId: string, days: number) => {
    try {
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + days);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          is_active: true,
          is_trial: true,
          current_period_start: now.toISOString(),
          current_period_end: trialEnd.toISOString(),
          trial_ends_at: trialEnd.toISOString(),
          canceled_at: null,
          cancel_at_period_end: false,
          updated_at: now.toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "Trial estendido",
        description: `Período gratuito configurado para ${days} dias a partir de hoje.`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao estender trial",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateSubscriptionStatus = async (subscriptionId: string, newStatus: string, durationMonths: number = 1) => {
    try {
      logger.info('ADMIN', 'Iniciando atualização de status de assinatura', {
        component: 'SubscriptionManagement',
        function: 'handleUpdateSubscriptionStatus',
        subscriptionId: subscriptionId,
        newStatus: newStatus,
        durationMonths: durationMonths,
        isActive: newStatus === 'active'
      });

      const now = new Date();
      
      // Calcular datas baseadas no status
      let updateData: any = {
        status: newStatus,
        is_active: newStatus === 'active',
        updated_at: now.toISOString()
      };

      // Se ativando a assinatura, definir datas apropriadas
      if (newStatus === 'active') {
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + durationMonths);
        
        updateData = {
          ...updateData,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          is_trial: false,
          trial_ends_at: null,
          canceled_at: null,
          cancel_at_period_end: false
        };
        
        logger.info('ADMIN', 'Ativando assinatura com período definido', {
          component: 'SubscriptionManagement',
          function: 'handleUpdateSubscriptionStatus',
          subscriptionId: subscriptionId,
          periodStart: now.toISOString(),
          periodEnd: periodEnd.toISOString(),
          durationMonths: durationMonths
        });
      } else if (newStatus === 'cancelled' || newStatus === 'expired') {
        updateData = {
          ...updateData,
          is_active: false,
          canceled_at: newStatus === 'cancelled' ? now.toISOString() : null
        };
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId);

      if (error) {
        logger.error('ADMIN', 'Erro ao atualizar status de assinatura', {
          component: 'SubscriptionManagement',
          function: 'handleUpdateSubscriptionStatus',
          subscriptionId: subscriptionId,
          newStatus: newStatus,
          error: error.message,
          code: error.code
        });
        throw error;
      }

      logger.info('ADMIN', 'Status de assinatura atualizado com sucesso', {
        component: 'SubscriptionManagement',
        function: 'handleUpdateSubscriptionStatus',
        subscriptionId: subscriptionId,
        newStatus: newStatus,
        isActive: newStatus === 'active',
        updateData: updateData
      });

      toast({
        title: "Status atualizado",
        description: `Assinatura ${newStatus === 'active' ? `ativada por ${durationMonths} ${durationMonths === 1 ? 'mês' : 'meses'}` : 'atualizada'} com sucesso.`,
      });

      fetchData();
    } catch (error: any) {
      logger.error('ADMIN', 'Erro inesperado ao atualizar status de assinatura', {
        component: 'SubscriptionManagement',
        function: 'handleUpdateSubscriptionStatus',
        subscriptionId: subscriptionId,
        newStatus: newStatus,
        error: error.message
      });

      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const requestConfirm = useCallback((
    subscriptionId: string,
    userName: string,
    actionLabel: string,
    action: () => void
  ) => {
    setConfirmAction({ subscriptionId, userName, actionLabel, action });
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (confirmAction) {
      confirmAction.action();
      setConfirmAction(null);
    }
  }, [confirmAction]);

  const filteredSubscriptions = subscriptions.filter(sub => {
    const userName = sub.profiles?.full_name || sub.email || sub.user_id || '';
    const userEmail = sub.profiles?.email || sub.email || '';
    const planName = sub.plan_id || 'Trial Gratuito';
    
    const matchesSearch = 
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      planName.toLowerCase().includes(searchTerm.toLowerCase());

    const subStatus = sub.status || (sub.is_active ? 'active' : 'inactive');
    const matchesStatus = statusFilter === "all" || subStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="secondary">Inativo</Badge>;
    }

    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Ativo</Badge>;
      case 'pending_payment':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Indicador de Modo Demonstração */}
      {isDemoMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-amber-800 font-medium">Modo Demonstração</span>
            <span className="text-amber-600 text-sm">
              Dados simulados devido às políticas de segurança RLS
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Assinaturas</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as assinaturas de usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por usuário ou plano..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="pending_payment">Pendente</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabela de Assinaturas */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {subscription.profiles?.full_name || 'Usuário sem nome'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {subscription.profiles?.email || subscription.email || `ID: ${subscription.user_id.substring(0, 8)}...`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {subscription.plan_id || (subscription.is_trial ? 'Trial Gratuito' : 'Plano Básico')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {subscription.is_trial ? 'Gratuito' : 'R$ 29,90'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(subscription.status || (subscription.is_active ? 'active' : 'inactive'), subscription.is_active)}
                        </TableCell>
                        <TableCell>
                          {subscription.is_trial ? (
                            <Badge variant="outline">Trial</Badge>
                          ) : subscription.status === 'active' && subscription.is_active ? (
                            <Badge variant="default">Pago</Badge>
                          ) : subscription.status === 'pending_payment' ? (
                            <Badge variant="outline" className="border-amber-400 text-amber-600">Aguardando Pagamento</Badge>
                          ) : (
                            <Badge variant="secondary">Não Pago</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(subscription.current_period_start || subscription.created_at)}</TableCell>
                        <TableCell>
                          {subscription.trial_ends_at ? formatDate(subscription.trial_ends_at) : 
                           subscription.current_period_end ? formatDate(subscription.current_period_end) : '-'}
                        </TableCell>
                        <TableCell>
                          {isDemoMode ? (
                            <Badge variant="outline" className="cursor-not-allowed">
                              Modo Demo
                            </Badge>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-1 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={async () => {
                                    try {
                                      await asaasService.adminActivate(subscription.id);
                                      toast({ title: 'Acesso liberado' });
                                      window.location.reload();
                                    } catch (error: any) {
                                      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                                    }
                                  }}
                                >
                                  Liberar acesso
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={async () => {
                                    try {
                                      const result = await asaasService.adminSync(subscription.id);
                                      toast({ title: 'Sincronizado', description: `Status: ${result.status}` });
                                      window.location.reload();
                                    } catch (error: any) {
                                      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                                    }
                                  }}
                                >
                                  Sync Asaas
                                </Button>
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                <span className="text-xs text-gray-400 self-center w-full">Pago:</span>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-xs px-2"
                                  onClick={() => requestConfirm(
                                    subscription.id,
                                    subscription.profiles?.full_name || 'Usuário sem nome',
                                    `Ativar assinatura paga por 1 mês para ${subscription.profiles?.full_name || 'Usuário sem nome'}?`,
                                    () => handleUpdateSubscriptionStatus(subscription.id, 'active', 1)
                                  )}
                                  title="Ativar como pago por 1 mês"
                                >
                                  +1M
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-xs px-2"
                                  onClick={() => requestConfirm(
                                    subscription.id,
                                    subscription.profiles?.full_name || 'Usuário sem nome',
                                    `Ativar assinatura paga por 3 meses para ${subscription.profiles?.full_name || 'Usuário sem nome'}?`,
                                    () => handleUpdateSubscriptionStatus(subscription.id, 'active', 3)
                                  )}
                                  title="Ativar como pago por 3 meses"
                                >
                                  +3M
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-xs px-2"
                                  onClick={() => requestConfirm(
                                    subscription.id,
                                    subscription.profiles?.full_name || 'Usuário sem nome',
                                    `Ativar assinatura paga por 6 meses para ${subscription.profiles?.full_name || 'Usuário sem nome'}?`,
                                    () => handleUpdateSubscriptionStatus(subscription.id, 'active', 6)
                                  )}
                                  title="Ativar como pago por 6 meses"
                                >
                                  +6M
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-xs px-2"
                                  onClick={() => requestConfirm(
                                    subscription.id,
                                    subscription.profiles?.full_name || 'Usuário sem nome',
                                    `Ativar assinatura paga por 12 meses para ${subscription.profiles?.full_name || 'Usuário sem nome'}?`,
                                    () => handleUpdateSubscriptionStatus(subscription.id, 'active', 12)
                                  )}
                                  title="Ativar como pago por 12 meses"
                                >
                                  +1A
                                </Button>
                              </div>
                              {/* Conceder trial gratuito (dias) */}
                              <div className="flex gap-1 flex-wrap">
                                <span className="text-xs text-gray-400 self-center w-full">Trial:</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs px-2"
                                  onClick={() => requestConfirm(
                                    subscription.id,
                                    subscription.profiles?.full_name || 'Usuário sem nome',
                                    `Estender trial por 7 dias para ${subscription.profiles?.full_name || 'Usuário sem nome'}?`,
                                    () => handleExtendTrial(subscription.id, 7)
                                  )}
                                  title="Conceder 7 dias grátis"
                                >
                                  7d
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs px-2"
                                  onClick={() => requestConfirm(
                                    subscription.id,
                                    subscription.profiles?.full_name || 'Usuário sem nome',
                                    `Estender trial por 15 dias para ${subscription.profiles?.full_name || 'Usuário sem nome'}?`,
                                    () => handleExtendTrial(subscription.id, 15)
                                  )}
                                  title="Conceder 15 dias grátis"
                                >
                                  15d
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs px-2"
                                  onClick={() => requestConfirm(
                                    subscription.id,
                                    subscription.profiles?.full_name || 'Usuário sem nome',
                                    `Estender trial por 30 dias para ${subscription.profiles?.full_name || 'Usuário sem nome'}?`,
                                    () => handleExtendTrial(subscription.id, 30)
                                  )}
                                  title="Conceder 30 dias grátis"
                                >
                                  30d
                                </Button>
                              </div>
                              <div className="flex gap-1">
                                <Select
                                  value={subscription.status || (subscription.is_active ? 'active' : 'inactive')}
                                  onValueChange={(value) => {
                                    const statusLabels: Record<string, string> = {
                                      active: 'Ativo',
                                      pending_payment: 'Pendente',
                                      cancelled: 'Cancelado',
                                      expired: 'Expirado'
                                    };
                                    requestConfirm(
                                      subscription.id,
                                      subscription.profiles?.full_name || 'Usuário sem nome',
                                      `Alterar status para ${statusLabels[value] || value} para ${subscription.profiles?.full_name || 'Usuário sem nome'}?`,
                                      () => handleUpdateSubscriptionStatus(subscription.id, value, 1)
                                    );
                                  }}
                                >
                                  <SelectTrigger className="w-[110px] h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">Ativo</SelectItem>
                                    <SelectItem value="pending_payment">Pendente</SelectItem>
                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                    <SelectItem value="expired">Expirado</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7"
                                  onClick={() => {
                                    setEditingSubscription(subscription);
                                    setIsSubscriptionDialogOpen(true);
                                  }}
                                  title="Editar detalhes completos"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Planos de Assinatura</CardTitle>
                <CardDescription>
                  Gerencie os planos disponíveis para assinatura
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingPlan(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Plano
                  </Button>
                </DialogTrigger>
                <PlanDialog 
                  plan={editingPlan} 
                  onSave={handleSavePlan}
                  onClose={() => setIsDialogOpen(false)}
                />
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <Card key={plan.id} className="relative">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <CardDescription>{plan.description}</CardDescription>
                        </div>
                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                          {plan.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">{formatCurrency(plan.price)}</div>
                        <div className="text-sm text-muted-foreground">
                          {plan.duration_months} {plan.duration_months === 1 ? 'mês' : 'meses'}
                        </div>
                        {plan.features && plan.features.length > 0 && (
                          <div className="text-sm">
                            <strong>Recursos:</strong>
                            <ul className="list-disc list-inside mt-1">
                              {plan.features.map((feature, index) => (
                                <li key={index}>{feature}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPlan(plan);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePlan(plan.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de Edição de Assinatura */}
      <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
        <SubscriptionEditDialog 
          subscription={editingSubscription} 
          onSave={async (subscriptionData) => {
            try {
              const { error } = await supabase
                .from('user_subscriptions')
                .update(subscriptionData)
                .eq('id', editingSubscription?.id);

              if (error) throw error;

              toast({
                title: "Assinatura atualizada",
                description: "As informações da assinatura foram atualizadas com sucesso.",
              });

              setIsSubscriptionDialogOpen(false);
              setEditingSubscription(null);
              fetchData();
            } catch (error: any) {
              toast({
                title: "Erro ao atualizar assinatura",
                description: error.message,
                variant: "destructive",
              });
            }
          }}
          onClose={() => {
            setIsSubscriptionDialogOpen(false);
            setEditingSubscription(null);
          }}
        />
      </Dialog>

      {/* Dialog de Confirmação de Ação */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.actionLabel}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-amber-600 text-sm font-medium">
            Esta ação não pode ser desfeita automaticamente.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Componente de diálogo para editar assinaturas
const SubscriptionEditDialog = ({ 
  subscription, 
  onSave, 
  onClose 
}: { 
  subscription: UserSubscription | null; 
  onSave: (data: Partial<UserSubscription>) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    status: subscription?.status || 'active',
    is_active: subscription?.is_active ?? true,
    is_trial: subscription?.is_trial ?? false,
    current_period_start: subscription?.current_period_start ? 
      new Date(subscription.current_period_start).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0],
    current_period_end: subscription?.current_period_end ? 
      new Date(subscription.current_period_end).toISOString().split('T')[0] : 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    trial_ends_at: subscription?.trial_ends_at ? 
      new Date(subscription.trial_ends_at).toISOString().split('T')[0] : '',
    plan_id: subscription?.plan_id || '',
    cancel_at_period_end: subscription?.cancel_at_period_end ?? false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const subscriptionData: Partial<UserSubscription> = {
      status: formData.status,
      is_active: formData.is_active,
      is_trial: formData.is_trial,
      current_period_start: formData.current_period_start ? new Date(formData.current_period_start).toISOString() : null,
      current_period_end: formData.current_period_end ? new Date(formData.current_period_end).toISOString() : null,
      trial_ends_at: formData.trial_ends_at ? new Date(formData.trial_ends_at).toISOString() : null,
      plan_id: formData.plan_id || null,
      cancel_at_period_end: formData.cancel_at_period_end,
      updated_at: new Date().toISOString()
    };

    onSave(subscriptionData);
  };

  if (!subscription) return null;

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Editar Assinatura</DialogTitle>
        <DialogDescription>
          Edite os detalhes da assinatura do usuário {subscription.profiles?.full_name || 'Usuário'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value, is_active: value === 'active' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="pending_payment">Pendente</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="plan_id">Plano</Label>
            <Input
              id="plan_id"
              value={formData.plan_id}
              onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
              placeholder="ID do plano"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_trial"
            checked={formData.is_trial}
            onChange={(e) => setFormData({ ...formData, is_trial: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="is_trial">É período de teste (trial)</Label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="cancel_at_period_end"
            checked={formData.cancel_at_period_end}
            onChange={(e) => setFormData({ ...formData, cancel_at_period_end: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="cancel_at_period_end">Cancelar no final do período</Label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="current_period_start">Data de Início</Label>
            <Input
              id="current_period_start"
              type="date"
              value={formData.current_period_start}
              onChange={(e) => setFormData({ ...formData, current_period_start: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="current_period_end">Data de Fim</Label>
            <Input
              id="current_period_end"
              type="date"
              value={formData.current_period_end}
              onChange={(e) => setFormData({ ...formData, current_period_end: e.target.value })}
            />
          </div>
        </div>

        {formData.is_trial && (
          <div>
            <Label htmlFor="trial_ends_at">Trial expira em</Label>
            <Input
              id="trial_ends_at"
              type="date"
              value={formData.trial_ends_at}
              onChange={(e) => setFormData({ ...formData, trial_ends_at: e.target.value })}
            />
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Ativação Rápida</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                const oneMonthLater = new Date(now);
                oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
                
                setFormData({
                  ...formData,
                  status: 'active',
                  is_active: true,
                  is_trial: false,
                  current_period_start: now.toISOString().split('T')[0],
                  current_period_end: oneMonthLater.toISOString().split('T')[0],
                  trial_ends_at: '',
                  cancel_at_period_end: false
                });
              }}
            >
              Ativar por 1 mês
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                const threeMonthsLater = new Date(now);
                threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
                
                setFormData({
                  ...formData,
                  status: 'active',
                  is_active: true,
                  is_trial: false,
                  current_period_start: now.toISOString().split('T')[0],
                  current_period_end: threeMonthsLater.toISOString().split('T')[0],
                  trial_ends_at: '',
                  cancel_at_period_end: false
                });
              }}
            >
              Ativar por 3 meses
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                const sevenDaysLater = new Date(now);
                sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
                
                setFormData({
                  ...formData,
                  status: 'active',
                  is_active: true,
                  is_trial: true,
                  current_period_start: now.toISOString().split('T')[0],
                  current_period_end: sevenDaysLater.toISOString().split('T')[0],
                  trial_ends_at: sevenDaysLater.toISOString().split('T')[0],
                  cancel_at_period_end: false
                });
              }}
            >
              Trial 7 dias
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                const fifteenDaysLater = new Date(now);
                fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);
                
                setFormData({
                  ...formData,
                  status: 'active',
                  is_active: true,
                  is_trial: true,
                  current_period_start: now.toISOString().split('T')[0],
                  current_period_end: fifteenDaysLater.toISOString().split('T')[0],
                  trial_ends_at: fifteenDaysLater.toISOString().split('T')[0],
                  cancel_at_period_end: false
                });
              }}
            >
              Trial 15 dias
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Salvar Alterações
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

// Componente de diálogo para criar/editar planos
const PlanDialog = ({ 
  plan, 
  onSave, 
  onClose 
}: { 
  plan: SubscriptionPlan | null; 
  onSave: (data: Partial<SubscriptionPlan>) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    duration_months: plan?.duration_months || 1,
    features: plan?.features?.join('\n') || '',
    is_active: plan?.is_active ?? true,
    gateway_plan_id: plan?.gateway_plan_id || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const planData = {
      ...formData,
      features: formData.features.split('\n').filter(f => f.trim())
    };

    onSave(planData);
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{plan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
        <DialogDescription>
          {plan ? 'Edite as informações do plano' : 'Crie um novo plano de assinatura'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome do Plano</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="duration">Duração (meses)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration_months}
              onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="features">Recursos (um por linha)</Label>
          <textarea
            id="features"
            className="w-full p-2 border rounded-md"
            rows={4}
            value={formData.features}
            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
            placeholder="Recurso 1&#10;Recurso 2&#10;Recurso 3"
          />
        </div>
        
        <div>
          <Label htmlFor="gateway_plan_id">ID externo do plano (opcional)</Label>
          <Input
            id="gateway_plan_id"
            value={formData.gateway_plan_id}
            onChange={(e) => setFormData({ ...formData, gateway_plan_id: e.target.value })}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {plan ? 'Atualizar' : 'Criar'} Plano
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default SubscriptionManagement;