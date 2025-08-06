
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
import { supabase } from "@/integrations/supabase/client";

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
  const { data: deliveries, isLoading: isLoadingDeliveries } = useDeliveries();
  const { data: routes, isLoading: isLoadingRoutes } = useRoutes();
  const [userCount, setUserCount] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    // Fetch user count from auth.users (admin only)
    const fetchUserCount = async () => {
      try {
        // Para administradores, podemos usar uma query alternativa ou definir um valor fixo
        // Como não temos acesso direto à tabela auth.users, vamos usar user_subscriptions como proxy
        const { count, error } = await supabase
          .from("user_subscriptions")
          .select("user_id", { count: "exact", head: true });
        
        if (error) throw error;
        setUserCount(count || 0);
      } catch (error) {
        console.error("Error fetching user count:", error);
        // Fallback para um valor estimado
        setUserCount(0);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUserCount();
  }, []);

  // Calculate stats based on actual data
  const getTotalDeliveries = () => deliveries?.length || 0;
  const getCompletedDeliveries = () => deliveries?.filter(d => d.status === "entregue").length || 0;
  const getActiveRoutes = () => routes?.filter(r => r.status === "ativo").length || 0;
  
  // Calculate completion percentage
  const getCompletionPercentage = () => {
    if (!deliveries || deliveries.length === 0) return "0%";
    return `${Math.round((getCompletedDeliveries() / getTotalDeliveries()) * 100)}%`;
  };

  const statsCards: StatsCard[] = [
    {
      title: "Total de Usuários",
      value: loadingUsers ? "..." : userCount,
      icon: <Users className="h-8 w-8 text-white" />,
      description: "Usuários registrados",
      gradient: "from-blue-500 to-blue-600",
      progress: Math.min((userCount / 100) * 100, 100)
    },
    {
      title: "Total de Entregas",
      value: isLoadingDeliveries ? "..." : getTotalDeliveries(),
      icon: <Package className="h-8 w-8 text-white" />,
      description: "Entregas cadastradas",
      gradient: "from-green-500 to-green-600",
      progress: Math.min((getTotalDeliveries() / 50) * 100, 100)
    },
    {
      title: "Rotas Ativas",
      value: isLoadingRoutes ? "..." : getActiveRoutes(),
      icon: <MapPin className="h-8 w-8 text-white" />,
      description: "Rotas em andamento",
      gradient: "from-amber-500 to-amber-600",
      progress: Math.min((getActiveRoutes() / 20) * 100, 100)
    },
    {
      title: "Taxa de Conclusão",
      value: isLoadingDeliveries ? "..." : getCompletionPercentage(),
      icon: <CheckCircle className="h-8 w-8 text-white" />,
      description: "Entregas concluídas",
      gradient: "from-purple-500 to-purple-600",
      progress: parseInt(getCompletionPercentage().replace('%', '')) || 0
    },
  ];
  
  // Generate stats for deliveries by status using actual data
  const getDeliveriesByStatus = () => {
    if (!deliveries) return deliveriesByStatusMockData;
    
    const pendentes = deliveries.filter(d => d.status === "pendente").length;
    const emRota = deliveries.filter(d => d.status === "em_rota").length;
    const entregues = deliveries.filter(d => d.status === "entregue").length;
    const cancelados = deliveries.filter(d => d.status === "cancelado").length;
    
    return [
      { name: 'Pendente', value: pendentes },
      { name: 'Em Rota', value: emRota },
      { name: 'Entregue', value: entregues },
      { name: 'Cancelado', value: cancelados },
    ];
  };

  if (isLoadingDeliveries || isLoadingRoutes || loadingUsers) {
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
        {statsCards.map((stat, index) => (
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
                data={activeUsersMockData}
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
                data={getDeliveriesByStatus()}
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
