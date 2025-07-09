import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bug, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Copy,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  data?: any;
}

const PaymentDebug: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [originalConsole, setOriginalConsole] = useState<{
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
  }>();

  useEffect(() => {
    // Interceptar console.log, console.warn, console.error
    const original = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };
    setOriginalConsole(original);

    const addLog = (level: LogEntry['level'], message: string, ...args: any[]) => {
      const logEntry: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        level,
        message,
        data: args.length > 0 ? args : undefined,
      };

      setLogs(prev => [...prev.slice(-49), logEntry]); // Manter apenas os últimos 50 logs
      
      // Chamar o console original
      if (level === 'success' || level === 'info') {
        original.log(message, ...args);
      } else if (level === 'warn') {
        original.warn(message, ...args);
      } else if (level === 'error') {
        original.error(message, ...args);
      }
    };

    console.log = (...args) => addLog('info', args.join(' '), ...args);
    console.warn = (...args) => addLog('warn', args.join(' '), ...args);
    console.error = (...args) => addLog('error', args.join(' '), ...args);

    // Adicionar log inicial
    addLog('info', '🐛 Debug do sistema de pagamento iniciado');

    return () => {
      // Restaurar console original
      console.log = original.log;
      console.warn = original.warn;
      console.error = original.error;
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
    console.log('🧹 Logs limpos');
  };

  const copyLogs = () => {
    const logsText = logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${
        log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''
      }`
    ).join('\n\n');
    
    navigator.clipboard.writeText(logsText);
    console.log('📋 Logs copiados para a área de transferência');
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Bug className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          <Bug className="w-4 h-4 mr-2" />
          Debug ({logs.length})
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96">
      <Card className="shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Debug - Pagamentos
            </CardTitle>
            <div className="flex gap-1">
              <Button
                onClick={copyLogs}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                onClick={clearLogs}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <EyeOff className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3">
          {/* Status do usuário */}
          <Alert className="mb-3">
            <AlertDescription className="text-xs">
              <strong>Usuário:</strong> {user ? `${user.email} (${user.id.slice(0, 8)}...)` : 'Não logado'}
              <br />
              <strong>Ambiente:</strong> {import.meta.env.DEV ? 'Desenvolvimento' : 'Produção'}
              <br />
              <strong>MP Key:</strong> {import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY?.slice(0, 20)}...
            </AlertDescription>
          </Alert>

          {/* Logs */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {logs.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">
                Nenhum log ainda...
              </p>
            ) : (
              logs.slice(-10).map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded border text-xs ${getLevelColor(log.level)}`}
                >
                  <div className="flex items-start gap-2">
                    {getLevelIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {log.timestamp}
                        </Badge>
                        <Badge 
                          variant={log.level === 'error' ? 'destructive' : 'secondary'}
                          className="text-xs px-1 py-0"
                        >
                          {log.level}
                        </Badge>
                      </div>
                      <p className="break-words">{log.message}</p>
                      {log.data && (
                        <pre className="mt-1 text-xs bg-gray-100 p-1 rounded overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentDebug;
