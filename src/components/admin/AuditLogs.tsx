import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Download, 
  Eye, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  CreditCard,
  Truck,
  LogIn,
  Settings,
  Info,
  AlertCircle,
  Zap,
  Activity,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'pending';
}

interface SystemEvent {
  id: string;
  timestamp: string;
  event_type: string;
  service: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  metadata: Record<string, any>;
}

const AuditLogs = () => {
  const { toast } = useToast();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      
      // Tentar buscar dados reais do Supabase
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      const { data: events, error: eventsError } = await supabase
        .from('system_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (logsError || eventsError) {
        // Se houver erro (provavelmente RLS), usar dados mock
        setIsDemoMode(true);
        loadMockData();
        return;
      }

      setAuditLogs(logs || []);
      setSystemEvents(events || []);
      
    } catch (error: any) {
      setIsDemoMode(true);
      loadMockData();
      toast({
        title: "Modo Demonstração",
        description: "Exibindo dados fictícios para demonstração",
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    // Mock data para logs de auditoria
    const mockAuditLogs: AuditLog[] = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        user_id: 'user-123',
        user_email: 'admin@rotago.com',
        action: 'user_subscription_updated',
        resource_type: 'subscription',
        resource_id: 'sub-456',
        details: { 
          old_plan: 'monthly', 
          new_plan: 'annual',
          amount: 299.90 
        },
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0...',
        severity: 'medium',
        status: 'success'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        user_id: 'user-789',
        user_email: 'user@example.com',
        action: 'login_failed',
        resource_type: 'auth',
        resource_id: 'auth-attempt-123',
        details: { 
          reason: 'invalid_password',
          attempts: 3 
        },
        ip_address: '203.0.113.45',
        user_agent: 'Mozilla/5.0...',
        severity: 'high',
        status: 'failure'
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        user_id: 'user-456',
        user_email: 'manager@rotago.com',
        action: 'delivery_route_created',
        resource_type: 'route',
        resource_id: 'route-789',
        details: { 
          route_name: 'Zona Norte - Manhã',
          deliveries_count: 15 
        },
        ip_address: '192.168.1.101',
        user_agent: 'Mozilla/5.0...',
        severity: 'low',
        status: 'success'
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        user_id: 'system',
        user_email: 'system@rotago.com',
        action: 'payment_processed',
        resource_type: 'payment',
        resource_id: 'pay-123',
        details: { 
          amount: 49.90,
          method: 'credit_card',
          gateway: 'mercado_pago' 
        },
        ip_address: '10.0.0.1',
        user_agent: 'System/1.0',
        severity: 'medium',
        status: 'success'
      }
    ];

    // Mock data para eventos do sistema
    const mockSystemEvents: SystemEvent[] = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        event_type: 'database_backup',
        service: 'backup_service',
        message: 'Backup automático concluído com sucesso',
        level: 'info',
        metadata: { 
          backup_size: '2.4GB',
          duration: '45s' 
        }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        event_type: 'high_memory_usage',
        service: 'monitoring',
        message: 'Uso de memória acima de 85%',
        level: 'warning',
        metadata: { 
          memory_usage: '87%',
          threshold: '85%' 
        }
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        event_type: 'api_rate_limit',
        service: 'api_gateway',
        message: 'Rate limit atingido para IP 203.0.113.45',
        level: 'warning',
        metadata: { 
          ip: '203.0.113.45',
          requests: 1000,
          window: '1h' 
        }
      }
    ];

    setAuditLogs(mockAuditLogs);
    setSystemEvents(mockSystemEvents);
  };









  // Função para formatar timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Função para filtrar logs
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
    const matchesAction = actionFilter === "all" || log.action.toLowerCase().includes(actionFilter.toLowerCase());
    
    return matchesSearch && matchesSeverity && matchesAction;
  });

  // Função para exportar logs
  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Usuário', 'Ação', 'Recurso', 'Status', 'Severidade', 'IP'],
      ...filteredAuditLogs.map(log => [
        formatTimestamp(log.timestamp),
        log.user_email,
        log.action,
        log.resource_type,
        log.status,
        log.severity,
        log.ip_address
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Logs exportados",
      description: "Os logs foram exportados com sucesso",
    });
  };

  // Função para obter ícone da ação
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
      case 'logout':
        return <LogIn className="w-4 h-4 text-blue-600" />;
      case 'create':
      case 'update':
      case 'delete':
        return <Settings className="w-4 h-4 text-purple-600" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-green-600" />;
      case 'delivery':
        return <Truck className="w-4 h-4 text-orange-600" />;
      case 'subscription':
        return <User className="w-4 h-4 text-indigo-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  // Função para obter badge de severidade
  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low':
        return (
          <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
            Baixa
          </Badge>
        );
      case 'medium':
        return (
          <Badge className="bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
            Média
          </Badge>
        );
      case 'high':
        return (
          <Badge className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border-orange-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-orange-500 mr-1" />
            Alta
          </Badge>
        );
      case 'critical':
        return (
          <Badge className="bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-1 animate-pulse" />
            Crítica
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-gray-500 mr-1" />
            {severity}
          </Badge>
        );
    }
  };

  // Função para obter badge de nível
  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'info':
        return (
          <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200 shadow-sm">
            <Info className="w-3 h-3 mr-1" />
            Info
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200 shadow-sm">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Warning
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200 shadow-sm">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      case 'debug':
        return (
          <Badge className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-purple-200 shadow-sm">
            <Settings className="w-3 h-3 mr-1" />
            Debug
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200 shadow-sm">
            <Activity className="w-3 h-3 mr-1" />
            {level}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho Moderno */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
        <div className="relative flex items-center gap-4">
          <div className="rounded-full bg-white/10 p-3 backdrop-blur-sm">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
            <p className="text-purple-200">Monitoramento e rastreamento de atividades do sistema</p>
          </div>
          <div className="ml-auto">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
              <Activity className="w-3 h-3 mr-1" />
              Tempo Real
            </Badge>
          </div>
        </div>
      </div>

      {/* Indicador de Modo Demonstração */}
      {isDemoMode && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 p-2">
                <div className="h-4 w-4 animate-pulse rounded-full bg-white" />
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <p className="font-semibold text-amber-800">Modo Demonstração Ativo</p>
                <p className="text-sm text-amber-600">Exibindo dados fictícios para demonstração</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      <Tabs defaultValue="audit" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-slate-100 to-gray-100 p-1 rounded-xl shadow-inner">
          <TabsTrigger 
            value="audit" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
          >
            <FileText className="w-4 h-4 mr-2" />
            Logs de Auditoria
          </TabsTrigger>
          <TabsTrigger 
            value="system"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
          >
            <Zap className="w-4 h-4 mr-2" />
            Eventos do Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6" />
                <div>
                  <CardTitle className="text-xl font-bold">Logs de Auditoria</CardTitle>
                  <CardDescription className="text-blue-100">
                    Registro detalhado de todas as ações dos usuários
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Filtros */}
              <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200 shadow-md">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Busca */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Buscar</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input
                          placeholder="Buscar por usuário, ação..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Severidade */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Severidade</Label>
                      <Select value={severityFilter} onValueChange={setSeverityFilter}>
                        <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="critical">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tipo de Ação */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Tipo de Ação</Label>
                      <Select value={actionFilter} onValueChange={setActionFilter}>
                        <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="login">Login/Auth</SelectItem>
                          <SelectItem value="subscription">Assinaturas</SelectItem>
                          <SelectItem value="delivery">Entregas</SelectItem>
                          <SelectItem value="payment">Pagamentos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Exportar */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Ações</Label>
                      <Button 
                        onClick={exportLogs} 
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                      </Button>
                    </div>
                  </div>

                  {/* Período */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-semibold text-slate-700">Período:</Label>
                      <DatePickerWithRange
                        date={dateRange}
                        onDateChange={setDateRange}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de Logs */}
              <Card className="shadow-lg border-slate-200">
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-slate-100 to-gray-100 hover:from-slate-200 hover:to-gray-200">
                        <TableHead className="font-bold text-slate-700">Timestamp</TableHead>
                        <TableHead className="font-bold text-slate-700">Usuário</TableHead>
                        <TableHead className="font-bold text-slate-700">Ação</TableHead>
                        <TableHead className="font-bold text-slate-700">Recurso</TableHead>
                        <TableHead className="font-bold text-slate-700">Status</TableHead>
                        <TableHead className="font-bold text-slate-700">Severidade</TableHead>
                        <TableHead className="font-bold text-slate-700">IP</TableHead>
                        <TableHead className="font-bold text-slate-700">Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                          <TableCell className="font-mono text-sm text-slate-600">
                            {formatTimestamp(log.timestamp)}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">{log.user_email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <span className="font-medium text-slate-700">{log.action}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-700"
                            >
                              {log.resource_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(log.status)}
                              <span className="capitalize font-medium text-slate-700">{log.status}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getSeverityBadge(log.severity)}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-slate-600">
                            {log.ip_address}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Ver
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-bold text-slate-800">Detalhes do Log</DialogTitle>
                                  <DialogDescription className="text-slate-600">
                                    Informações completas sobre esta ação
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="font-semibold text-slate-700">Usuário</Label>
                                      <p className="text-sm text-slate-600">{log.user_email}</p>
                                    </div>
                                    <div>
                                      <Label className="font-semibold text-slate-700">Timestamp</Label>
                                      <p className="text-sm font-mono text-slate-600">{formatTimestamp(log.timestamp)}</p>
                                    </div>
                                    <div>
                                      <Label className="font-semibold text-slate-700">Ação</Label>
                                      <p className="text-sm text-slate-600">{log.action}</p>
                                    </div>
                                    <div>
                                      <Label className="font-semibold text-slate-700">Recurso</Label>
                                      <p className="text-sm text-slate-600">{log.resource_type} ({log.resource_id})</p>
                                    </div>
                                    <div>
                                      <Label className="font-semibold text-slate-700">IP Address</Label>
                                      <p className="text-sm font-mono text-slate-600">{log.ip_address}</p>
                                    </div>
                                    <div>
                                      <Label className="font-semibold text-slate-700">User Agent</Label>
                                      <p className="text-sm truncate text-slate-600">{log.user_agent}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="font-semibold text-slate-700">Detalhes</Label>
                                    <pre className="text-sm bg-gradient-to-r from-slate-50 to-gray-50 p-3 rounded-md overflow-auto border border-slate-200">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
              <div className="flex items-center gap-3">
                <Zap className="h-6 w-6" />
                <div>
                  <CardTitle className="text-xl font-bold">Eventos do Sistema</CardTitle>
                  <CardDescription className="text-emerald-100">
                    Logs de eventos internos e monitoramento do sistema
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Card className="shadow-lg border-slate-200">
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-slate-100 to-gray-100 hover:from-slate-200 hover:to-gray-200">
                        <TableHead className="font-bold text-slate-700">Timestamp</TableHead>
                        <TableHead className="font-bold text-slate-700">Serviço</TableHead>
                        <TableHead className="font-bold text-slate-700">Tipo</TableHead>
                        <TableHead className="font-bold text-slate-700">Nível</TableHead>
                        <TableHead className="font-bold text-slate-700">Mensagem</TableHead>
                        <TableHead className="font-bold text-slate-700">Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {systemEvents.map((event) => (
                        <TableRow key={event.id} className="hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200">
                          <TableCell className="font-mono text-sm text-slate-600">
                            {formatTimestamp(event.timestamp)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700"
                            >
                              {event.service}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">{event.event_type}</TableCell>
                          <TableCell>
                            {getLevelBadge(event.level)}
                          </TableCell>
                          <TableCell className="text-slate-700">{event.message}</TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm"
                                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Ver
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-bold text-slate-800">Detalhes do Evento</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label className="font-semibold text-slate-700">Metadata</Label>
                                    <pre className="text-sm bg-gradient-to-r from-slate-50 to-gray-50 p-3 rounded-md overflow-auto border border-slate-200">
                                      {JSON.stringify(event.metadata, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuditLogs;