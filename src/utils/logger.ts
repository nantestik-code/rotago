/**
 * Sistema de Logs Estruturados para RotaGo
 * Categoriza e formata logs para facilitar debugging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogCategory = 
  | 'AUTH' 
  | 'DATABASE' 
  | 'API' 
  | 'UI' 
  | 'ADMIN' 
  | 'PAYMENT' 
  | 'ROUTE' 
  | 'DELIVERY' 
  | 'SUBSCRIPTION'
  | 'SECURITY'
  | 'PERFORMANCE';

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

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;
  
  // Configuração de níveis por categoria
  private categoryLevels: Record<LogCategory, LogLevel[]> = {
    AUTH: ['info', 'warn', 'error', 'critical'],
    DATABASE: ['warn', 'error', 'critical'],
    API: ['warn', 'error', 'critical'],
    UI: ['error', 'critical'],
    ADMIN: ['info', 'warn', 'error', 'critical'],
    PAYMENT: ['info', 'warn', 'error', 'critical'],
    ROUTE: ['warn', 'error', 'critical'],
    DELIVERY: ['warn', 'error', 'critical'],
    SUBSCRIPTION: ['info', 'warn', 'error', 'critical'],
    SECURITY: ['info', 'warn', 'error', 'critical'],
    PERFORMANCE: ['warn', 'error', 'critical']
  };

  private formatMessage(entry: LogEntry): string {
    const emoji = this.getLevelEmoji(entry.level);
    const timestamp = new Date(entry.timestamp).toLocaleTimeString('pt-BR');
    
    let message = `${emoji} [${entry.category}] ${timestamp} - ${entry.message}`;
    
    if (entry.component) {
      message += ` (${entry.component}`;
      if (entry.function) {
        message += `::${entry.function}`;
      }
      message += ')';
    }
    
    return message;
  }

  private getLevelEmoji(level: LogLevel): string {
    const emojis = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    return emojis[level];
  }

  private shouldLog(category: LogCategory, level: LogLevel): boolean {
    // Em desenvolvimento, log tudo
    if (this.isDevelopment) {
      return true;
    }
    
    // Em produção, respeitar configuração por categoria
    return this.categoryLevels[category].includes(level);
  }

  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    options: {
      data?: any;
      userId?: string;
      sessionId?: string;
      component?: string;
      function?: string;
      error?: Error;
    } = {}
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...options
    };
  }

  private executeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.category, entry.level)) {
      return;
    }

    const formattedMessage = this.formatMessage(entry);
    
    // Escolher método de console baseado no nível
    switch (entry.level) {
      case 'debug':
        console.debug(formattedMessage, entry.data);
        break;
      case 'info':
        console.info(formattedMessage, entry.data);
        break;
      case 'warn':
        console.warn(formattedMessage, entry.data);
        break;
      case 'error':
      case 'critical':
        console.error(formattedMessage, entry.data, entry.error);
        break;
    }

    // Salvar todos os logs para análise posterior
    this.saveLog(entry);

    // Em produção, enviar logs críticos para serviço externo
    if (this.isProduction && (entry.level === 'error' || entry.level === 'critical')) {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    try {
      // Aqui você pode integrar com serviços como Sentry, LogRocket, etc.
      // Por enquanto, apenas salvamos no localStorage para análise
      const logs = JSON.parse(localStorage.getItem('rotago_error_logs') || '[]');
      logs.push(entry);
      
      // Manter apenas os últimos 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('rotago_error_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Falha ao salvar log:', error);
    }
  }

  // Método para salvar todos os logs (não apenas críticos)
  private saveLog(logEntry: LogEntry): void {
    try {
      const savedLogs = JSON.parse(localStorage.getItem('rotago_all_logs') || '[]');
      savedLogs.push(logEntry);
      
      // Manter apenas os últimos 500 logs
      if (savedLogs.length > 500) {
        savedLogs.splice(0, savedLogs.length - 500);
      }
      
      localStorage.setItem('rotago_all_logs', JSON.stringify(savedLogs));
    } catch (error) {
      console.error('❌ Falha ao salvar log:', error);
    }
  }

  // Método público para obter logs críticos
  public getCriticalLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('rotago_error_logs') || '[]');
    } catch (error) {
      console.error('❌ Falha ao recuperar logs críticos:', error);
      return [];
    }
  }

  // Métodos públicos para cada nível
  debug(category: LogCategory, message: string, options?: any): void {
    const entry = this.createLogEntry('debug', category, message, options);
    this.executeLog(entry);
  }

  info(category: LogCategory, message: string, options?: any): void {
    const entry = this.createLogEntry('info', category, message, options);
    this.executeLog(entry);
  }

  warn(category: LogCategory, message: string, options?: any): void {
    const entry = this.createLogEntry('warn', category, message, options);
    this.executeLog(entry);
  }

  error(category: LogCategory, message: string, options?: any): void {
    const entry = this.createLogEntry('error', category, message, options);
    this.executeLog(entry);
  }

  critical(category: LogCategory, message: string, options?: any): void {
    const entry = this.createLogEntry('critical', category, message, options);
    this.executeLog(entry);
  }

  // Métodos de conveniência para categorias específicas
  auth = {
    login: (message: string, data?: any) => this.info('AUTH', `Login: ${message}`, { data }),
    logout: (message: string, data?: any) => this.info('AUTH', `Logout: ${message}`, { data }),
    error: (message: string, error?: Error, data?: any) => this.error('AUTH', message, { error, data }),
    sessionExpired: (userId?: string) => this.warn('AUTH', 'Sessão expirada', { userId })
  };

  database = {
    query: (table: string, operation: string, data?: any) => 
      this.debug('DATABASE', `${operation} em ${table}`, { data }),
    error: (message: string, error?: Error, data?: any) => 
      this.error('DATABASE', message, { error, data }),
    rls: (message: string, data?: any) => 
      this.warn('DATABASE', `RLS: ${message}`, { data })
  };

  admin = {
    access: (action: string, userId?: string) => 
      this.info('ADMIN', `Acesso admin: ${action}`, { userId }),
    error: (message: string, error?: Error, data?: any) => 
      this.error('ADMIN', message, { error, data }),
    security: (message: string, data?: any) => 
      this.warn('SECURITY', `Admin: ${message}`, { data })
  };

  api = {
    request: (url: string, method: string, data?: any) => 
      this.debug('API', `${method} ${url}`, { data }),
    response: (url: string, status: number, data?: any) => 
      this.debug('API', `Resposta ${status} de ${url}`, { data }),
    error: (message: string, error?: Error, data?: any) => 
      this.error('API', message, { error, data })
  };

  ui = {
    error: (component: string, message: string, error?: Error) => 
      this.error('UI', message, { component, error }),
    warn: (component: string, message: string, data?: any) => 
      this.warn('UI', message, { component, data })
  };

  // Método para obter todos os logs salvos (útil para debug)
  getSavedLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('rotago_all_logs') || '[]');
    } catch (error) {
      console.error('❌ Falha ao recuperar logs salvos:', error);
      return [];
    }
  }

  // Método para limpar logs salvos
  clearSavedLogs(): void {
    try {
      localStorage.removeItem('rotago_all_logs');
      localStorage.removeItem('rotago_error_logs');
      console.log('🧹 Logs salvos limpos');
    } catch (error) {
      console.error('❌ Falha ao limpar logs salvos:', error);
    }
  }
}

// Instância singleton
export const logger = new Logger();

// Export default para facilitar importação
export default logger;