import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Trash2, 
  Download, 
  RefreshCw, 
  Search,
  AlertTriangle,
  Info,
  XCircle,
  AlertCircle,
  Bug
} from 'lucide-react';
import { logger, type LogLevel, type LogCategory } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  component?: string;
  function?: string;
  error?: Error;
}

const LogsViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = () => {
    setIsLoading(true);
    try {
      const savedLogs = logger.getSavedLogs();
      setLogs(savedLogs);
      console.log(`📊 [LogsViewer] Carregados ${savedLogs.length} logs`);
    } catch (error) {
      console.error('❌ [LogsViewer] Erro ao carregar logs:', error);
      toast({
        title: 'Erro ao carregar logs',
        description: 'Não foi possível carregar os logs salvos',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    try {
      logger.clearSavedLogs();
      setLogs([]);
      setFilteredLogs([]);
      toast({
        title: 'Logs limpos',
        description: 'Todos os logs foram removidos com sucesso'
      });
      console.log('🧹 [LogsViewer] Logs limpos');
    } catch (error) {
      console.error('❌ [LogsViewer] Erro ao limpar logs:', error);
      toast({
        title: 'Erro ao limpar logs',
        description: 'Não foi possível limpar os logs',
        variant: 'destructive'
      });
    }
  };

  const exportLogs = () => {
    try {
      const dataStr = JSON.stringify(filteredLogs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `rotago-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Logs exportados',
        description: 'Arquivo de logs baixado com sucesso'
      });
      console.log('📥 [LogsViewer] Logs exportados');
    } catch (error) {
      console.error('❌ [LogsViewer] Erro ao exportar logs:', error);
      toast({
        title: 'Erro ao exportar logs',
        description: 'Não foi possível exportar os logs',
        variant: 'destructive'
      });
    }
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return <Bug className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return 'bg-gray-100 text-gray-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'critical':
        return 'bg-red-200 text-red-900 font-bold';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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

  // Filtrar logs baseado nos filtros ativos
  useEffect(() => {
    let filtered = logs;

    // Filtro por nível
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Filtro por categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(log => log.category === categoryFilter);
    }

    // Filtro por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.component?.toLowerCase().includes(query) ||
        log.function?.toLowerCase().includes(query) ||
        log.category.toLowerCase().includes(query)
      );
    }

    // Ordenar por timestamp (mais recente primeiro)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredLogs(filtered);
  }, [logs, levelFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    loadLogs();
  }, []);

  const logLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
  const logCategories: LogCategory[] = [
    'AUTH', 'DATABASE', 'API', 'UI', 'ADMIN', 'PAYMENT', 
    'ROUTE', 'DELIVERY', 'SUBSCRIPTION', 'SECURITY', 'PERFORMANCE'
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Logs do Sistema
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Buscar logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          
          <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as LogLevel | 'all')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {logLevels.map(level => (
                <SelectItem key={level} value={level}>
                  {level.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as LogCategory | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {logCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          Exibindo {filteredLogs.length} de {logs.length} logs
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {logs.length === 0 ? 'Nenhum log encontrado' : 'Nenhum log corresponde aos filtros'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      <Badge className={getLevelColor(log.level)}>
                        {log.level.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {log.category}
                      </Badge>
                      {log.component && (
                        <Badge variant="secondary">
                          {log.component}
                          {log.function && `::${log.function}`}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  
                  <div className="text-sm">
                    {log.message}
                  </div>
                  
                  {(log.data || log.error) && (
                    <>
                      <Separator />
                      <div className="text-xs space-y-1">
                        {log.data && (
                          <div>
                            <span className="font-medium">Dados:</span>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.error && (
                          <div>
                            <span className="font-medium text-red-600">Erro:</span>
                            <pre className="mt-1 p-2 bg-red-50 rounded text-xs overflow-x-auto">
                              {log.error.message}
                              {log.error.stack && `\n\nStack:\n${log.error.stack}`}
                            </pre>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LogsViewer;