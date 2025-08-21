import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Send, Users, TrendingUp, AlertCircle, CheckCircle, Clock, Search, Filter, RefreshCw, Eye, Download, Loader2, Bell, Shield, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useEmailManager, EmailLog, EmailStatistics } from '@/hooks/use-email-manager';
import { EmailTemplates } from './EmailTemplates';

const EmailManager: React.FC = () => {
  const {
    isLoading,
    isLoadingStats,
    isLoadingLogs,
    statistics,
    emailLogs,
    sendEmail,
    sendTestEmail,
    resendEmail,
    loadStatistics,
    loadEmailLogs,
    getAvailableTemplates
  } = useEmailManager();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'welcome' | 'admin_notification'>('welcome');
  const [selectedProvider, setSelectedProvider] = useState<'sendgrid' | 'hostinger'>('sendgrid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showTemplates, setShowTemplates] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    loadStatistics();
    loadEmailLogs();
  }, [loadStatistics, loadEmailLogs]);

  const handleSendTestEmail = async () => {
    if (!testEmail || !testName) {
      toast.error('Por favor, preencha o email e nome do destinatário.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    const emailData = {
      to: testEmail,
      name: testName,
      template: selectedTemplate,
      provider: selectedProvider,
      data: {
        loginUrl: `${window.location.origin}/login`,
        adminPanelUrl: `${window.location.origin}/admin`,
        userCpf: '000.000.000-00',
        registrationDate: new Date().toISOString(),
        subscriptionPlan: 'trial'
      }
    };

    const result = await sendEmail(emailData);
    
    if (result.success) {
      setTestEmail('');
      setTestName('');
    }
  };

  const handleResendEmail = async (logId: string) => {
    try {
      await resendEmail(logId);
      toast.success('Email reenviado com sucesso!');
      await loadEmailLogs();
    } catch (error) {
      toast.error('Erro ao reenviar email');
    }
  };

  const handleRefreshData = async () => {
    await Promise.all([
      loadStatistics(),
      loadEmailLogs({
        email_type: statusFilter !== 'all' ? statusFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined
      })
    ]);
  };



  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent: { label: 'Enviado', variant: 'outline' as const },
      delivered: { label: 'Entregue', variant: 'default' as const },
      opened: { label: 'Aberto', variant: 'secondary' as const },
      clicked: { label: 'Clicado', variant: 'secondary' as const },
      failed: { label: 'Falhou', variant: 'destructive' as const },
      pending: { label: 'Pendente', variant: 'outline' as const },
      bounced: { label: 'Rejeitado', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, variant: 'outline' as const };

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    const iconConfig = {
      sent: <Send className="w-4 h-4 text-blue-500" />,
      delivered: <CheckCircle className="w-4 h-4 text-green-500" />,
      opened: <Eye className="w-4 h-4 text-purple-500" />,
      clicked: <TrendingUp className="w-4 h-4 text-indigo-500" />,
      failed: <XCircle className="w-4 h-4 text-red-500" />,
      pending: <Clock className="w-4 h-4 text-yellow-500" />,
      bounced: <AlertCircle className="w-4 h-4 text-orange-500" />,
    };

    return iconConfig[status as keyof typeof iconConfig] || 
           <Clock className="w-4 h-4 text-gray-500" />;
  };

  const availableTemplates = getAvailableTemplates();

  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = log.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.recipient_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciador de Emails</h1>
          <p className="text-gray-600 mt-1">Controle e monitore todos os emails enviados pelo sistema</p>
        </div>
        <Button onClick={handleRefreshData} variant="outline" size="sm" disabled={isLoadingStats || isLoadingLogs}>
          <RefreshCw className={`w-4 h-4 mr-2 ${(isLoadingStats || isLoadingLogs) ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Enviar Teste
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enviados</CardTitle>
                <Mail className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.total_sent || 0}</div>
                <p className="text-xs text-muted-foreground">últimos 30 dias</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregues</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.delivered || 0}</div>
                <p className="text-xs text-muted-foreground">taxa de {statistics?.delivery_rate || 0}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Falhas</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.failed || 0}</div>
                <p className="text-xs text-muted-foreground">requer atenção</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.pending || 0}</div>
                <p className="text-xs text-muted-foreground">processando</p>
              </CardContent>
            </Card>
          </div>

          {/* Resumo Recente */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>Últimos emails enviados pelo sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emailLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{log.recipient_name}</p>
                        <p className="text-sm text-gray-600">{log.recipient_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(log.status)}
                      <span className="text-sm text-gray-500">
                        {new Date(log.sent_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Test Tab */}
        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Email de Teste</CardTitle>
              <CardDescription>
                Envie um email de teste para validar templates e configurações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-email">Email do Destinatário</Label>
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-name">Nome do Destinatário</Label>
                  <Input
                    id="test-name"
                    placeholder="João Silva"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-select">Template de Email</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welcome">Boas-vindas</SelectItem>
                      <SelectItem value="admin_notification">Notificação Admin</SelectItem>
                      <SelectItem value="password_reset">Reset de Senha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="provider-select">Provedor de Email</Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o provedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sendgrid">SendGrid (Padrão)</SelectItem>
                      <SelectItem value="hostinger">Hostinger SMTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este email será enviado imediatamente via {selectedProvider === 'hostinger' ? 'Hostinger SMTP' : 'SendGrid'}. Certifique-se de que o endereço está correto.
                </AlertDescription>
              </Alert>
              
              {selectedProvider === 'hostinger' && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Hostinger SMTP:</strong> Usando servidor SMTP nativo da hospedagem. Limite de 100 emails/dia.
                  </AlertDescription>
                </Alert>
              )}
              
              {selectedProvider === 'sendgrid' && (
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    <strong>SendGrid:</strong> Serviço profissional com analytics avançados e alta deliverabilidade.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleSendTestEmail} 
                disabled={isLoading || !testEmail || !testName}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Email de Teste
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Boas-vindas
                </CardTitle>
                <CardDescription>Email enviado para novos usuários</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline">Ativo</Badge>
                  <p className="text-sm text-gray-600">Última atualização: 15/01/2024</p>
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {availableTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {template.id === 'admin_notification' ? (
                      <Bell className="w-5 h-5 text-green-600" />
                    ) : template.id === 'password_reset' ? (
                      <Shield className="w-5 h-5 text-purple-600" />
                    ) : (
                      <Users className="w-5 h-5 text-blue-600" />
                    )}
                    {template.name}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant={template.active ? "outline" : "secondary"}>
                      {template.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <p className="text-sm text-gray-600">
                      Última atualização: {new Date(template.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setShowTemplates(true)}
                      disabled={!template.active}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por email ou nome..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="delivered">Entregues</SelectItem>
                    <SelectItem value="sent">Enviados</SelectItem>
                    <SelectItem value="opened">Abertos</SelectItem>
                    <SelectItem value="failed">Falhas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="bounced">Rejeitados</SelectItem>
                    <SelectItem value="clicked">Clicados</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Emails</CardTitle>
              <CardDescription>
                {filteredLogs.length} de {emailLogs.length} emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingLogs ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
                    <p className="text-gray-500">Carregando logs...</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum email encontrado com os filtros aplicados.</p>
                    {searchTerm && (
                      <p className="text-sm mt-2">Tente ajustar os filtros de busca</p>
                    )}
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(log.status)}
                          <div>
                            <p className="font-medium">{log.recipient_name}</p>
                            <p className="text-sm text-gray-600">{log.recipient_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(log.status)}
                          {log.status === 'failed' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleResendEmail(log.id)}
                              disabled={isLoading}
                              title="Reenviar email"
                            >
                              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Tipo:</span>
                          <p>{log.email_type === 'welcome' ? 'Boas-vindas' : log.email_type}</p>
                        </div>
                        <div>
                          <span className="font-medium">Enviado:</span>
                          <p>{new Date(log.sent_at).toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <span className="font-medium">Template:</span>
                          <p>{log.template_used}</p>
                        </div>
                        <div>
                          <span className="font-medium">Entregue:</span>
                          <p>{log.delivered_at ? new Date(log.delivered_at).toLocaleString('pt-BR') : '-'}</p>
                        </div>
                      </div>
                      
                      {log.opened_at && (
                        <div className="mt-2 text-xs text-purple-600">
                          Aberto em {new Date(log.opened_at).toLocaleString('pt-BR')}
                        </div>
                      )}
                      
                      {log.clicked_at && (
                        <div className="mt-1 text-xs text-indigo-600">
                          Clicado em {new Date(log.clicked_at).toLocaleString('pt-BR')}
                        </div>
                      )}
                      
                      {log.bounce_reason && (
                        <div className="mt-2 text-xs text-orange-600">
                          Motivo da rejeição: {log.bounce_reason}
                        </div>
                      )}
                      
                      {log.error_message && (
                        <Alert className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{log.error_message}</AlertDescription>
                        </Alert>
                      )}
                      
                      {log.message_id && (
                        <div className="mt-2 text-xs text-gray-400">
                          ID da mensagem: {log.message_id}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              {/* Paginação simples */}
              {filteredLogs.length > 0 && (
                <div className="flex justify-center mt-6">
                  <Button variant="outline" size="sm" disabled>
                    Carregar mais
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modal de Templates */}
      {showTemplates && (
        <EmailTemplates 
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
};

export default EmailManager;