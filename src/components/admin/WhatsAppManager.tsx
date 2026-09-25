import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { evolutionService } from '@/services/evolutionService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageCircle,
  Send,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Settings,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface NotifyResult {
  phone: string;
  email: string;
  name: string;
  status: 'sent' | 'error' | 'skipped';
  error?: string;
}

interface NotifyResponse {
  success: boolean;
  dryRun: boolean;
  summary: { total: number; sent: number; failed: number; skipped: number };
  results: NotifyResult[];
  message?: string;
  error?: string;
}

type ConnectionStatus = 'unknown' | 'connected' | 'disconnected' | 'unconfigured';

const WhatsAppManager = () => {
  // === Configurações ===
  const [apiUrl, setApiUrl] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [connectionInfo, setConnectionInfo] = useState<{ instanceName: string; state: string } | null>(null);

  // === Notificações ===
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NotifyResponse | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [singlePhone, setSinglePhone] = useState('');
  const [singleUserId, setSingleUserId] = useState('');
  const [activeMode, setActiveMode] = useState<'expired_trials' | 'expiring_soon' | 'single'>('expired_trials');

  // Carregar configurações ao montar
  useEffect(() => {
    const loadSettings = async () => {
      setConfigLoading(true);
      try {
        const settings = await evolutionService.getSettings();
        setApiUrl(settings.apiUrl);
        setInstanceName(settings.instance);
        setApiKey(settings.apiKey);

        if (!settings.apiUrl && !settings.instance) {
          setConnectionStatus('unconfigured');
        }
      } catch (err: any) {
        toast({ title: 'Erro ao carregar configurações', description: err.message, variant: 'destructive' });
      } finally {
        setConfigLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleTestConnection = async () => {
    if (!apiUrl.trim() || !instanceName.trim()) {
      toast({ title: 'Preencha URL e Instância', variant: 'destructive' });
      return;
    }
    setTesting(true);
    try {
      const result = await evolutionService.testConnection();
      setConnectionStatus(result.connected ? 'connected' : 'disconnected');
      setConnectionInfo({ instanceName: result.instanceName, state: result.state });
      toast({
        title: result.connected ? 'Conectado' : 'Desconectado',
        description: result.connected
          ? `Instância "${result.instanceName}" está ${result.state}`
          : 'Não foi possível conectar à Evolution API.',
        variant: result.connected ? 'default' : 'destructive',
      });
    } catch (err: any) {
      setConnectionStatus('disconnected');
      toast({ title: 'Erro no teste de conexão', description: err.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await evolutionService.saveSettings(apiUrl, instanceName, apiKey);
      toast({ title: 'Configurações salvas com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const statusConfig: Record<ConnectionStatus, { label: string; colorClass: string; icon: React.ReactNode }> = {
    unknown: { label: 'Status desconhecido', colorClass: 'bg-gray-100 text-gray-600', icon: <WifiOff className="w-4 h-4" /> },
    connected: { label: 'Conectado', colorClass: 'bg-green-100 text-green-700', icon: <Wifi className="w-4 h-4" /> },
    disconnected: { label: 'Desconectado', colorClass: 'bg-red-100 text-red-700', icon: <WifiOff className="w-4 h-4" /> },
    unconfigured: { label: 'Não configurado', colorClass: 'bg-gray-100 text-gray-500', icon: <Settings className="w-4 h-4" /> },
  };

  const currentStatus = statusConfig[connectionStatus];

  const callNotifyFunction = async (dryRun: boolean) => {
    setLoading(true);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sem sessão ativa');

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

      const body: Record<string, any> = {
        mode: activeMode,
        dryRun,
      };

      if (customMessage.trim()) body.message = customMessage.trim();
      if (activeMode === 'single') {
        if (!singleUserId.trim()) {
          toast({ title: 'Informe o ID do usuário', variant: 'destructive' });
          setLoading(false);
          return;
        }
        body.userId = singleUserId.trim();
        if (singlePhone.trim()) body.phone = singlePhone.trim();
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-notify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data: NotifyResponse = await response.json();
      setResults(data);

      if (data.success) {
        toast({
          title: dryRun ? 'Simulação concluída' : 'Notificações enviadas',
          description: dryRun
            ? `${data.summary?.total || 0} usuários seriam notificados`
            : `${data.summary?.sent || 0} mensagens enviadas com sucesso`,
        });
      } else {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro inesperado', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const modeLabels = {
    expired_trials: { label: 'Trials Expirados', desc: 'Usuários cujo trial expirou e ainda não foram notificados', color: 'red' },
    expiring_soon: { label: 'Expirando em breve', desc: 'Trials que expiram nos próximos 2 dias', color: 'orange' },
    single: { label: 'Usuário Específico', desc: 'Enviar para um único usuário pelo ID', color: 'blue' },
  };

  const subtitleText = instanceName.trim()
    ? `Disparar mensagens via Evolution API (${instanceName})`
    : 'Instância não configurada';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-100">
          <MessageCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">WhatsApp — Notificações</h2>
          <p className="text-gray-500 text-sm">{subtitleText}</p>
        </div>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="config" className="gap-2">
            <Settings className="w-4 h-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Send className="w-4 h-4" />
            Notificações
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: CONFIGURAÇÕES */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credenciais da Evolution API</CardTitle>
              <CardDescription>
                Configure os dados de conexão com a instância Evolution WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="evolution-url">Evolution API URL</Label>
                <Input
                  id="evolution-url"
                  placeholder="https://api.seudominio.com"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  disabled={configLoading}
                />
              </div>

              <div>
                <Label htmlFor="evolution-instance">Nome da Instância</Label>
                <Input
                  id="evolution-instance"
                  placeholder="MINHA-INSTANCIA"
                  value={instanceName}
                  onChange={e => setInstanceName(e.target.value)}
                  disabled={configLoading}
                />
              </div>

              <div>
                <Label htmlFor="evolution-apikey">API Key</Label>
                <div className="relative">
                  <Input
                    id="evolution-apikey"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Sua chave de API"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    disabled={configLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Indicador de status */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-sm text-gray-600">Status da conexão:</span>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${currentStatus.colorClass}`}>
                  {currentStatus.icon}
                  {currentStatus.label}
                </div>
                {connectionInfo && connectionStatus === 'connected' && (
                  <span className="text-xs text-gray-400">
                    {connectionInfo.instanceName} — {connectionInfo.state}
                  </span>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing || saving || configLoading}
                  className="flex items-center gap-2"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                  Testar Conexão
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={saving || testing || configLoading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: NOTIFICAÇÕES */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Seleção de modo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(modeLabels) as (keyof typeof modeLabels)[]).map((mode) => {
              const m = modeLabels[mode];
              const isActive = activeMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => { setActiveMode(mode); setResults(null); }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isActive
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-800 mb-1">{m.label}</div>
                  <div className="text-xs text-gray-500">{m.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Campos específicos por modo */}
          {activeMode === 'single' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usuário Específico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>ID do Usuário (UUID do Supabase)</Label>
                  <Input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={singleUserId}
                    onChange={e => setSingleUserId(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>Telefone (opcional — sobrescreve o do cadastro)</Label>
                  <Input
                    placeholder="11999999999"
                    value={singlePhone}
                    onChange={e => setSinglePhone(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mensagem customizada */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagem Customizada (opcional)</CardTitle>
              <CardDescription>Deixe em branco para usar a mensagem padrão do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Olá {nome}! Seu trial expirou..."
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Botões de ação */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => callNotifyFunction(true)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Simular (dry run)
            </Button>
            <Button
              onClick={() => callNotifyFunction(false)}
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar Notificações
            </Button>
          </div>

          {/* Resultados */}
          {results && (
            <div className="space-y-4">
              {results.message && !results.results?.length ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{results.message}</AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Resumo */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Total</span>
                      </div>
                      <div className="text-2xl font-bold mt-1">{results.summary?.total ?? 0}</div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-600">Enviados</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 mt-1">{results.summary?.sent ?? 0}</div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-gray-600">Erros</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600 mt-1">{results.summary?.failed ?? 0}</div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2">
                        <SkipForward className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-600">Ignorados</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-600 mt-1">{results.summary?.skipped ?? 0}</div>
                    </Card>
                  </div>

                  {/* Detalhamento */}
                  {results.results && results.results.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          Detalhamento
                          {results.dryRun && (
                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">Simulação</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {results.results.map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                              <div>
                                <span className="font-medium text-sm">{r.name || 'Sem nome'}</span>
                                <span className="text-xs text-gray-500 ml-2">{r.email}</span>
                                <span className="text-xs text-gray-400 ml-2">{r.phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {r.status === 'sent' && <Badge className="bg-green-100 text-green-700">Enviado</Badge>}
                                {r.status === 'error' && (
                                  <Badge className="bg-red-100 text-red-700" title={r.error}>Erro</Badge>
                                )}
                                {r.status === 'skipped' && (
                                  <Badge className="bg-yellow-100 text-yellow-700" title={r.error}>Sem tel.</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppManager;
