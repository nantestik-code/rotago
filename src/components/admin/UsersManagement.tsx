
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Loader2, CheckCircle2, XCircle, PieChart, Download, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  avatar_url: string | null;
  is_early_adopter: boolean | null;
  subscription_status: string | null;
  created_at: string | null;
}

// Extended status type for user filtering
type UserStatus = "all" | "free" | "premium" | "admin";

const UsersManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus>("all");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
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

  const toggleAdminStatus = async (user: UserProfile) => {
    try {
      const { error } = await supabase
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.total}</div>
            <Progress className="mt-2" value={100} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Administradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.admin}</div>
            <Progress 
              className="mt-2" 
              value={(userStats.admin / userStats.total) * 100} 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuários Premium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.premium}</div>
            <Progress 
              className="mt-2" 
              value={(userStats.premium / userStats.total) * 100} 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuários Gratuitos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.free}</div>
            <Progress 
              className="mt-2" 
              value={(userStats.free / userStats.total) * 100} 
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Chart Section */}
        <Card className="w-full md:w-1/3">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Distribuição de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer 
              config={{
                admin: { color: "#3b82f6", label: "Administradores" },
                premium: { color: "#10b981", label: "Premium" },
                free: { color: "#6b7280", label: "Gratuito" },
              }}
            >
              <RechartsPieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent />} />
              </RechartsPieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Filters and Table */}
        <div className="w-full md:w-2/3 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              defaultValue="all"
              onValueChange={(value) => setStatusFilter(value as UserStatus)}
              value={statusFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="free">Gratuitos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="flex items-center gap-2" onClick={exportToCSV}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Data de Cadastro</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Ações</TableHead>
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
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || "Nome não informado"}</TableCell>
                      <TableCell>{user.subscription_status || "free"}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        {user.is_early_adopter ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-300" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Detalhes do Usuário</DialogTitle>
                              </DialogHeader>
                              {selectedUser && (
                                <div className="space-y-4 py-4">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="font-medium">ID:</div>
                                    <div className="truncate">{selectedUser.id}</div>
                                    <div className="font-medium">Nome:</div>
                                    <div>{selectedUser.full_name || "N/A"}</div>
                                    <div className="font-medium">Status:</div>
                                    <div>{selectedUser.subscription_status || "free"}</div>
                                    <div className="font-medium">Admin:</div>
                                    <div>{selectedUser.is_early_adopter ? "Sim" : "Não"}</div>
                                    <div className="font-medium">Cadastro:</div>
                                    <div>{formatDate(selectedUser.created_at)}</div>
                                  </div>
                                  <div className="flex justify-end">
                                    <Button
                                      onClick={() => toggleAdminStatus(selectedUser)}
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
                            variant={user.is_early_adopter ? "destructive" : "default"}
                            onClick={() => toggleAdminStatus(user)}
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
          </div>

          {/* Info Footer */}
          <div className="text-sm text-muted-foreground">
            Exibindo {filteredUsers.length} de {users.length} usuários
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersManagement;
