import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";import { 
  Download, 
  FileText, 
  Calendar, 
  Filter, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Package, 
  Clock, 
  CheckCircle,
  CreditCard 
} from 'lucide-react';import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";

interface ReportData {
  id: string;
  name: string;
  description: string;
  type: 'users' | 'financial' | 'deliveries' | 'subscriptions';
  generated_at: string;
  file_size: string;
  status: 'generating' | 'ready' | 'error';
}

interface ExportConfig {
  type: string;
  dateRange: DateRange | undefined;
  format: 'csv' | 'xlsx' | 'pdf';
  filters: Record<string, any>;
}

const ReportsAndExports = () => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    type: 'users',
    dateRange: {
      from: addDays(new Date(), -30),
      to: new Date(),
    },
    format: 'csv',
    filters: {}
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Mock data para relatórios (em um sistema real, viria do banco)
      const mockReports: ReportData[] = [
        {
          id: '1',
          name: 'Relatório de Usuários - Dezembro 2024',
          description: 'Dados completos de usuários cadastrados',
          type: 'users',
          generated_at: new Date().toISOString(),
          file_size: '2.4 MB',
          status: 'ready'
        },
        {
          id: '2',
          name: 'Relatório Financeiro - Novembro 2024',
          description: 'Receitas, pagamentos e assinaturas',
          type: 'financial',
          generated_at: new Date(Date.now() - 86400000).toISOString(),
          file_size: '1.8 MB',
          status: 'ready'
        },
        {
          id: '3',
          name: 'Relatório de Entregas - Outubro 2024',
          description: 'Estatísticas de entregas e rotas',
          type: 'deliveries',
          generated_at: new Date(Date.now() - 172800000).toISOString(),
          file_size: '3.2 MB',
          status: 'ready'
        }
      ];

      setReports(mockReports);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar relatórios",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      
      // Simular geração de relatório
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newReport: ReportData = {
        id: Date.now().toString(),
        name: `Relatório ${getReportTypeName(exportConfig.type)} - ${format(new Date(), 'MMMM yyyy')}`,
        description: `Dados de ${exportConfig.dateRange?.from ? format(exportConfig.dateRange.from, 'dd/MM/yyyy') : ''} até ${exportConfig.dateRange?.to ? format(exportConfig.dateRange.to, 'dd/MM/yyyy') : ''}`,
        type: exportConfig.type as any,
        generated_at: new Date().toISOString(),
        file_size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
        status: 'ready'
      };

      setReports(prev => [newReport, ...prev]);

      toast({
        title: "Relatório gerado com sucesso",
        description: "O relatório está pronto para download.",
      });

    } catch (error: any) {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      // Simular download
      toast({
        title: "Download iniciado",
        description: "O arquivo será baixado em breve.",
      });
      
      // Em um sistema real, faria o download do arquivo
      console.log(`Downloading report ${reportId}`);
      
    } catch (error: any) {
      toast({
        title: "Erro no download",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Tem certeza que deseja excluir este relatório?")) return;

    try {
      setReports(prev => prev.filter(r => r.id !== reportId));
      
      toast({
        title: "Relatório excluído",
        description: "O relatório foi removido com sucesso.",
      });
      
    } catch (error: any) {
      toast({
        title: "Erro ao excluir relatório",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getReportTypeName = (type: string) => {
    const types = {
      users: 'Usuários',
      financial: 'Financeiro',
      deliveries: 'Entregas',
      subscriptions: 'Assinaturas'
    };
    return types[type as keyof typeof types] || type;
  };

  const getReportTypeIcon = (type: string) => {
    const icons = {
      users: Users,
      financial: DollarSign,
      deliveries: Package,
      subscriptions: CreditCard
    };
    const Icon = icons[type as keyof typeof icons] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Pronto</Badge>;
      case 'generating':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Gerando</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando relatórios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Gerar Relatório</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Gerar Novo Relatório</CardTitle>
              <CardDescription>
                Configure e gere relatórios personalizados do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo de Relatório */}
                <div className="space-y-2">
                  <Label>Tipo de Relatório</Label>
                  <Select 
                    value={exportConfig.type} 
                    onValueChange={(value) => setExportConfig(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="users">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Usuários
                        </div>
                      </SelectItem>
                      <SelectItem value="financial">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Financeiro
                        </div>
                      </SelectItem>
                      <SelectItem value="deliveries">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Entregas
                        </div>
                      </SelectItem>
                      <SelectItem value="subscriptions">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Assinaturas
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Formato */}
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select 
                    value={exportConfig.format} 
                    onValueChange={(value) => setExportConfig(prev => ({ ...prev, format: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Período */}
              <div className="space-y-2">
                <Label>Período</Label>
                <DatePickerWithRange
                  date={exportConfig.dateRange}
                  onDateChange={(range) => setExportConfig(prev => ({ ...prev, dateRange: range }))}
                />
              </div>

              {/* Filtros Específicos por Tipo */}
              {exportConfig.type === 'users' && (
                <div className="space-y-4">
                  <Label>Filtros de Usuários</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Status da assinatura" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Assinantes ativos</SelectItem>
                        <SelectItem value="trial">Em trial</SelectItem>
                        <SelectItem value="free">Gratuitos</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="admin">Administradores</SelectItem>
                        <SelectItem value="regular">Usuários regulares</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {exportConfig.type === 'financial' && (
                <div className="space-y-4">
                  <Label>Filtros Financeiros</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Status do pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="approved">Aprovados</SelectItem>
                        <SelectItem value="pending">Pendentes</SelectItem>
                        <SelectItem value="rejected">Rejeitados</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input placeholder="Valor mínimo (R$)" type="number" />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button 
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="min-w-[150px]"
                >
                  {generating ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Gerar Relatório
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Relatórios</CardTitle>
              <CardDescription>
                Visualize e baixe relatórios gerados anteriormente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Relatório</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Gerado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{report.name}</div>
                            <div className="text-sm text-muted-foreground">{report.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getReportTypeIcon(report.type)}
                            {getReportTypeName(report.type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(report.status)}
                        </TableCell>
                        <TableCell>{report.file_size}</TableCell>
                        <TableCell>{formatDate(report.generated_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {report.status === 'ready' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadReport(report.id)}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Baixar
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteReport(report.id)}
                            >
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsAndExports;