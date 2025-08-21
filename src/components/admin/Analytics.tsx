
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Bar
} from "recharts";
import { Loader2, Users, Package, MapPin, CheckCircle, TrendingUp, Activity } from "lucide-react";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useRoutes } from "@/hooks/useRoutes";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useAdminSupabaseClient } from "@/utils/adminSupabaseClient";
import { testAdminConnection } from "@/integrations/supabase/admin-client";

interface StatsCard {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description: string;
  gradient: string;
  progress: number;
}

// Mock data for active users chart
const activeUsersMockData = [
  { date: '10:00', users: 12 },
  { date: '11:00', users: 19 },
  { date: '12:00', users: 15 },
  { date: '13:00', users: 21 },
  { date: '14:00', users: 28 },
  { date: '15:00', users: 24 },
  { date: '16:00', users: 30 },
  { date: '17:00', users: 22 },
];

// Mock data for deliveries by status
const deliveriesByStatusMockData = [
  { name: 'Pendente', value: 40 },
  { name: 'Em Rota', value: 25 },
  { name: 'Entregue', value: 35 },
  { name: 'Cancelado', value: 5 },
];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsCard[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const { admin } = useAdminAuth();
  const adminSupabase = useAdminSupabaseClient();

  useEffect(() => {
    if (admin) {
      console.log('🚀 [Analytics] Sessão admin detectada, carregando dados...');
      fetchAnalyticsData();
    }
  }, [admin, adminSupabase]);

  const fetchAnalyticsData = async () => {
    if (!admin) {
      console.warn('⚠️ [Analytics] Sem sessão admin ativa');
      setLoading(false);
      return;
    }

    try {
      console.log('📊 [Analytics] Iniciando busca de dados analíticos...');
      console.log('🔑 [Analytics] Usando cliente admin para bypass RLS');
      
      // Debug do cliente Supabase
      console.log('🔍 [Analytics] Debug cliente:', {
        supabaseUrl: adminSupabase.supabaseUrl,
        supabaseKey: adminSupabase.supabaseKey?.substring(0, 20) + '...',
        hasKey: !!adminSupabase.supabaseKey
      });

      // Smoke test do cliente administrativo
      console.log('🧪 [Analytics] testAdminConnection() iniciando...');
      const adminPingOk = await testAdminConnection();
      console.log('🧪 [Analytics] testAdminConnection() status:', adminPingOk);
      if (!adminPingOk) {
        throw new Error('Conexão administrativa falhou (smoke test)');
      }
      
      // Buscar dados básicos usando cliente admin
      const [usersResult, routesResult, deliveriesResult, subscriptionsResult] = await Promise.all([
        adminSupabase.from('profiles').select('*'),
        adminSupabase.from('routes').select('*'),
        adminSupabase.from('deliveries').select('*'),
        adminSupabase.from('user_subscriptions').select('*')
      ]);

      // Verificar erros nas consultas
      if (usersResult.error) {
        console.error('❌ [Analytics] Erro ao buscar usuários:', usersResult.error);
        throw new Error(`Erro ao buscar usuários: ${usersResult.error.message}`);
      }
      if (routesResult.error) {
        console.error('❌ [Analytics] Erro ao buscar rotas:', routesResult.error);
        throw new Error(`Erro ao buscar rotas: ${routesResult.error.message}`);
      }
      if (deliveriesResult.error) {
        console.error('❌ [Analytics] Erro ao buscar entregas:', deliveriesResult.error);
        throw new Error(`Erro ao buscar entregas: ${deliveriesResult.error.message}`);
      }
      if (subscriptionsResult.error) {
        console.error('❌ [Analytics] Erro ao buscar assinaturas:', subscriptionsResult.error);
        throw new Error(`Erro ao buscar assinaturas: ${subscriptionsResult.error.message}`);
      }

      const users = usersResult.data || [];
      const routes = routesResult.data || [];
      const deliveries = deliveriesResult.data || [];
      const subscriptions = subscriptionsResult.data || [];

      console.log('✅ [Analytics] Dados carregados com sucesso:', {
        users: users.length,
        routes: routes.length,
        deliveries: deliveries.length,
        subscriptions: subscriptions.length,
        clientType: 'admin'
      });

      // Processar dados para estatísticas
      const totalUsers = users.length;
      const totalRoutes = routes.length;
      const totalDeliveries = deliveries.length;
      const totalSubscriptions = subscriptions.length;

      const pendentes = deliveries.filter(d => d.status === "pendente").length;
      const emRota = deliveries.filter(d => d.status === "em_rota").length;
      const entregues = deliveries.filter(d => d.status === "entregue").length;
      const cancelados = deliveries.filter(d => d.status === "cancelado").length;

      setStats([
        {
          title: "Usuários Ativos",
          value: totalUsers,
          icon: <Users className="h-4 w-4" />,
          description: `${totalUsers} usuários cadastrados`,
          gradient: "from-blue-500 to-cyan-500",
          progress: Math.min((totalUsers / 50) * 100, 100)
        },
        {
          title: "Rotas Ativas",
          value: totalRoutes,
          icon: <MapPin className="h-4 w-4" />,
          description: `${totalRoutes} rotas criadas`,
          gradient: "from-amber-500 to-amber-600",
          progress: Math.min((totalRoutes / 30) * 100, 100)
        },
        {
          title: "Entregas",
          value: totalDeliveries,
          icon: <Package className="h-4 w-4" />,
          description: `${totalDeliveries} entregas registradas`,
          gradient: "from-green-500 to-emerald-600",
          progress: Math.min((totalDeliveries / 100) * 100, 100)
        },
        {
          title: "Assinaturas",
          value: totalSubscriptions,
          icon: <CheckCircle className="h-4 w-4" />,
          description: `${totalSubscriptions} assinaturas ativas`,
          gradient: "from-purple-500 to-purple-600",
          progress: Math.min((totalSubscriptions / 50) * 100, 100)
        },
      ]);

      setChartData([
        { name: 'Pendente', value: pendentes },
        { name: 'Em Rota', value: emRota },
        { name: 'Entregue', value: entregues },
        { name: 'Cancelado', value: cancelados },
      ]);

      setPerformanceData([
        { date: '10:00', users: 12 },
        { date: '11:00', users: 19 },
        { date: '12:00', users: 15 },
        { date: '13:00', users: 21 },
        { date: '14:00', users: 28 },
        { date: '15:00', users: 24 },
        { date: '16:00', users: 30 },
        { date: '17:00', users: 22 },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('❌ [Analytics] Erro ao carregar dados:', error);
      console.error('🔍 [Analytics] Detalhes do erro:', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        admin: !!admin,
        clientType: 'admin'
      });
      
      // Usar dados de fallback em caso de erro
      setStats([
        {
          title: "Usuários Ativos",
          value: "--",
          icon: <Users className="h-4 w-4" />,
          description: "Erro ao carregar dados",
          gradient: "from-blue-500 to-cyan-500",
          progress: 0
        },
        {
          title: "Rotas Ativas",
          value: "--",
          icon: <MapPin className="h-4 w-4" />,
          description: "Erro ao carregar dados",
          gradient: "from-amber-500 to-amber-600",
          progress: 0
        },
        {
          title: "Entregas",
          value: "--",
          icon: <Package className="h-4 w-4" />,
          description: "Erro ao carregar dados",
          gradient: "from-green-500 to-emerald-600",
          progress: 0
        },
        {
          title: "Assinaturas",
          value: "--",
          icon: <CheckCircle className="h-4 w-4" />,
          description: "Erro ao carregar dados",
          gradient: "from-purple-500 to-purple-600",
          progress: 0
        },
      ]);

      setChartData(deliveriesByStatusMockData);
      setPerformanceData(activeUsersMockData);

      setLoading(false);
    }
  };

  if (!admin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Acesso negado. Faça login como administrador.</p>
          <p className="text-sm text-gray-500 mt-2">Sessão administrativa necessária para visualizar analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando estatísticas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header com título */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard de Análises</h2>
          <p className="text-gray-600">Visão geral das métricas do sistema</p>
        </div>
      </div>

      {/* Cards de estatísticas modernos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-90`}></div>
            <CardContent className="relative p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium">{stat.title}</p>
                  <h3 className="text-3xl font-bold mt-2 mb-1">{stat.value}</h3>
                  <p className="text-white/70 text-xs">{stat.description}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                  {stat.icon}
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/80">
                  <span>Progresso</span>
                  <span>{stat.progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(stat.progress, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos modernos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Usuários Ativos Hoje</CardTitle>
                <p className="text-sm text-gray-600">Atividade por hora</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={performanceData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fill="url(#userGradient)"
                  activeDot={{ r: 6, fill: '#1d4ed8' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Entregas por Status</CardTitle>
                <p className="text-sm text-gray-600">Distribuição atual</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="barGradient3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="barGradient4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="url(#barGradient3)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
