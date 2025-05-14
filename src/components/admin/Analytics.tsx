
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Loader2, Users, Package, MapPin, CheckCircle } from "lucide-react";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useRoutes } from "@/hooks/useRoutes";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

interface StatsCard {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description: string;
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
    // Fetch user count
    const fetchUserCount = async () => {
      try {
        const { count, error } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });
        
        if (error) throw error;
        setUserCount(count || 0);
      } catch (error) {
        console.error("Error fetching user count:", error);
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
      icon: <Users className="h-8 w-8 text-blue-500" />,
      description: "Usuários registrados"
    },
    {
      title: "Total de Entregas",
      value: isLoadingDeliveries ? "..." : getTotalDeliveries(),
      icon: <Package className="h-8 w-8 text-green-500" />,
      description: "Entregas cadastradas"
    },
    {
      title: "Rotas Ativas",
      value: isLoadingRoutes ? "..." : getActiveRoutes(),
      icon: <MapPin className="h-8 w-8 text-amber-500" />,
      description: "Rotas em andamento"
    },
    {
      title: "Taxa de Conclusão",
      value: isLoadingDeliveries ? "..." : getCompletionPercentage(),
      icon: <CheckCircle className="h-8 w-8 text-purple-500" />,
      description: "Entregas concluídas"
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Usuários Ativos Hoje</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={activeUsersMockData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Entregas por Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={getDeliveriesByStatus()}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
