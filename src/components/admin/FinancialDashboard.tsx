import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface FinancialMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  trialUsers: number;
  churnRate: number;
  averageRevenuePerUser: number;
  conversionRate: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  subscriptions: number;
}

interface SubscriptionData {
  plan: string;
  count: number;
  revenue: number;
  color: string;
}

const FinancialDashboard = () => {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    churnRate: 0,
    averageRevenuePerUser: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Buscar dados de assinaturas
      const { data: subscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans(*)
        `);

      let subscriptionsData = subscriptions;
      let demoMode = false;

      if (subsError) {
        console.warn('⚠️ Acesso restrito por RLS - usando dados de demonstração:', subsError.message);
        demoMode = true;
        
        // Dados de demonstração para assinaturas
        subscriptionsData = [
          {
            id: 'demo-1',
            user_id: 'demo-user-1',
            plan_id: 'demo-plan-1',
            is_active: true,
            is_trial: false,
            created_at: new Date().toISOString(),
            subscription_plans: {
              id: 'demo-plan-1',
              name: 'Plano Básico',
              price: 29.90
            }
          },
          {
            id: 'demo-2',
            user_id: 'demo-user-2',
            plan_id: 'demo-plan-2',
            is_active: true,
            is_trial: true,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            subscription_plans: {
              id: 'demo-plan-2',
              name: 'Plano Pro',
              price: 59.90
            }
          },
          {
            id: 'demo-3',
            user_id: 'demo-user-3',
            plan_id: 'demo-plan-3',
            is_active: true,
            is_trial: false,
            created_at: new Date(Date.now() - 172800000).toISOString(),
            subscription_plans: {
              id: 'demo-plan-3',
              name: 'Plano Premium',
              price: 99.90
            }
          }
        ];
      }

      // Buscar histórico de pagamentos
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_history')
        .select('*')
        .order('payment_date', { ascending: false });

      let paymentsData = payments;

      if (paymentsError) {
        console.warn('⚠️ Acesso restrito por RLS para payment_history - usando dados de demonstração:', paymentsError.message);
        demoMode = true;
        
        // Dados de demonstração para pagamentos
        paymentsData = [
          {
            id: 'demo-payment-1',
            user_id: 'demo-user-1',
            amount: 29.90,
            status: 'approved',
            payment_method: 'credit_card',
            payment_date: new Date().toISOString()
          },
          {
            id: 'demo-payment-2',
            user_id: 'demo-user-2',
            amount: 59.90,
            status: 'approved',
            payment_method: 'pix',
            payment_date: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 'demo-payment-3',
            user_id: 'demo-user-3',
            amount: 99.90,
            status: 'approved',
            payment_method: 'credit_card',
            payment_date: new Date(Date.now() - 172800000).toISOString()
          }
        ];
      }

      // Calcular métricas
      const activeSubscriptions = subscriptionsData?.filter(s => s.is_active).length || 0;
      const trialUsers = subscriptionsData?.filter(s => s.is_trial).length || 0;
      
      // Receita total dos últimos 12 meses
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      
      const recentPayments = paymentsData?.filter(p => 
        new Date(p.payment_date) >= twelveMonthsAgo && p.status === 'approved'
      ) || [];
      
      const totalRevenue = recentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      
      // Receita do mês atual
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const monthlyPayments = paymentsData?.filter(p => 
        new Date(p.payment_date) >= currentMonth && p.status === 'approved'
      ) || [];
      const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      // ARPU (Average Revenue Per User)
      const averageRevenuePerUser = activeSubscriptions > 0 ? totalRevenue / activeSubscriptions : 0;

      // Taxa de conversão (trial para pago)
      const totalTrials = subscriptions?.filter(s => s.is_trial).length || 0;
      const convertedUsers = subscriptions?.filter(s => !s.is_trial && s.is_active).length || 0;
      const conversionRate = totalTrials > 0 ? (convertedUsers / totalTrials) * 100 : 0;

      setMetrics({
        totalRevenue,
        monthlyRevenue,
        activeSubscriptions,
        trialUsers,
        churnRate: 5.2, // Mock data - seria calculado com dados históricos
        averageRevenuePerUser,
        conversionRate
      });

      // Preparar dados para gráficos
      generateRevenueData(paymentsData || []);
      generateSubscriptionData(subscriptionsData || []);

      // Definir estado do modo demonstração
        setIsDemoMode(demoMode);

        // Exibir toast se estiver em modo demonstração
        if (demoMode) {
          toast({
            title: "Modo Demonstração",
            description: "Exibindo dados de demonstração devido às políticas de segurança RLS.",
            variant: "default",
          });
        }

        setLoading(false);

    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados financeiros",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      }
    };

  const generateRevenueData = (payments: any[]) => {
    const monthlyData: { [key: string]: { revenue: number; subscriptions: number } } = {};
    
    // Últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      
      monthlyData[monthKey] = { revenue: 0, subscriptions: 0 };
      
      const monthPayments = payments.filter(p => 
        p.payment_date.startsWith(monthKey) && p.status === 'approved'
      );
      
      monthlyData[monthKey].revenue = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      monthlyData[monthKey].subscriptions = monthPayments.length;
    }

    const chartData = Object.entries(monthlyData).map(([key, data]) => {
      const date = new Date(key + '-01');
      return {
        month: date.toLocaleDateString('pt-BR', { month: 'short' }),
        revenue: data.revenue,
        subscriptions: data.subscriptions
      };
    });

    setRevenueData(chartData);
  };

  const generateSubscriptionData = (subscriptions: any[]) => {
    const planCounts: { [key: string]: { count: number; revenue: number } } = {};
    
    subscriptions.filter(s => s.is_active).forEach(sub => {
      const planName = sub.subscription_plans?.name || 'Plano Desconhecido';
      const planPrice = Number(sub.subscription_plans?.price || 0);
      
      if (!planCounts[planName]) {
        planCounts[planName] = { count: 0, revenue: 0 };
      }
      
      planCounts[planName].count++;
      planCounts[planName].revenue += planPrice;
    });

    const colors = ['#047857', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    const chartData = Object.entries(planCounts).map(([plan, data], index) => ({
      plan,
      count: data.count,
      revenue: data.revenue,
      color: colors[index % colors.length]
    }));

    setSubscriptionData(chartData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando dados financeiros...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho Moderno */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              💰 Dashboard Financeiro
              <Wallet className="h-6 w-6" />
            </h2>
            <p className="text-emerald-100 mt-1">Análise completa de receitas e assinaturas</p>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            Tempo Real
          </Badge>
        </div>
      </div>

      {/* Indicador de Modo Demonstração */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full animate-pulse"></div>
            <span className="text-amber-800 font-semibold">Modo Demonstração</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-amber-600 text-sm">
              Dados simulados devido às políticas de segurança RLS
            </span>
          </div>
        </div>
      )}

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100">Receita Total</CardTitle>
            <DollarSign className="h-5 w-5 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-emerald-100 mt-1">Últimos 12 meses</p>
            <Progress value={85} className="mt-2 bg-emerald-400/30" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-brand-500 to-brand-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-brand-100">Receita Mensal</CardTitle>
            <TrendingUp className="h-5 w-5 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.monthlyRevenue)}</div>
            <p className="text-xs text-brand-100 mt-1">Mês atual</p>
            <Progress value={72} className="mt-2 bg-brand-400/30" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">Assinaturas Ativas</CardTitle>
            <Users className="h-5 w-5 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
            <p className="text-xs text-purple-100 mt-1">{metrics.trialUsers} em trial</p>
            <Progress value={metrics.activeSubscriptions * 10} className="mt-2 bg-purple-400/30" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-100">ARPU</CardTitle>
            <CreditCard className="h-5 w-5 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.averageRevenuePerUser)}</div>
            <p className="text-xs text-orange-100 mt-1">Por usuário/ano</p>
            <Progress value={65} className="mt-2 bg-orange-400/30" />
          </CardContent>
        </Card>
      </div>

      {/* KPIs Secundários */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Taxa de Conversão
                </CardTitle>
                <CardDescription className="text-green-600">Trial para assinatura paga</CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                {formatPercentage(metrics.conversionRate)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress 
                value={metrics.conversionRate} 
                className="h-3 bg-green-100" 
              />
              <div className="flex justify-between text-sm text-green-700">
                <span>Meta: 15%</span>
                <span className="font-medium">Atual: {formatPercentage(metrics.conversionRate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-red-800 flex items-center gap-2">
                  <ArrowDownRight className="h-5 w-5" />
                  Taxa de Churn
                </CardTitle>
                <CardDescription className="text-red-600">Cancelamentos mensais</CardDescription>
              </div>
              <Badge className="bg-red-100 text-red-800 border-red-300">
                {formatPercentage(metrics.churnRate)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress 
                value={metrics.churnRate} 
                className="h-3 bg-red-100" 
              />
              <div className="flex justify-between text-sm text-red-700">
                <span>Meta: &lt;5%</span>
                <span className="font-medium">Atual: {formatPercentage(metrics.churnRate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-slate-100 to-gray-100 p-1 rounded-xl">
          <TabsTrigger 
            value="revenue" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-500 data-[state=active]:to-brand-600 data-[state=active]:text-white rounded-lg transition-all duration-300"
          >
            📈 Receita
          </TabsTrigger>
          <TabsTrigger 
            value="subscriptions"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-lg transition-all duration-300"
          >
            📊 Assinaturas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card className="bg-gradient-to-br from-brand-50 to-brand-50 border-brand-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Evolução da Receita
              </CardTitle>
              <CardDescription className="text-brand-100">
                Receita e número de assinaturas por mês
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis yAxisId="left" stroke="#047857" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Receita' : 'Assinaturas'
                    ]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left" 
                    dataKey="revenue" 
                    fill="url(#blueGradient)" 
                    name="Receita"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="subscriptions" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Assinaturas"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#047857" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#047857" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Distribuição por Planos
              </CardTitle>
              <CardDescription className="text-purple-100">
                Assinaturas ativas por tipo de plano
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={subscriptionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ plan, count }) => `${plan}: ${count}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {subscriptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value} assinaturas`,
                      props.payload.plan
                    ]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;