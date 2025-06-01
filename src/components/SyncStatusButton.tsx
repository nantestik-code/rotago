import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SyncStatusButtonProps {
  syncFunction: () => Promise<void>;
}

const SyncStatusButton: React.FC<SyncStatusButtonProps> = ({ syncFunction }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState(0);

  // Verificar status de conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verificar se há alterações pendentes
  useEffect(() => {
    const checkPendingChanges = () => {
      try {
        const statusChangesLog = JSON.parse(localStorage.getItem('statusChangesLog') || '[]');
        const pendingCount = statusChangesLog.filter((log: any) => !log.synced).length;
        setPendingChanges(pendingCount);
      } catch (error) {
        console.error('Erro ao verificar alterações pendentes:', error);
      }
    };

    // Verificar imediatamente
    checkPendingChanges();

    // Verificar periodicamente
    const interval = setInterval(checkPendingChanges, 30000); // A cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  // Sincronizar automaticamente quando voltar online
  useEffect(() => {
    if (isOnline && pendingChanges > 0) {
      // Pequeno atraso para garantir que a conexão esteja estável
      const timer = setTimeout(() => {
        handleSync();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingChanges]);

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      await syncFunction();
      
      // Verificar novamente quantas alterações ainda estão pendentes
      const statusChangesLog = JSON.parse(localStorage.getItem('statusChangesLog') || '[]');
      const remainingPending = statusChangesLog.filter((log: any) => !log.synced).length;
      setPendingChanges(remainingPending);
      
      if (remainingPending === 0) {
        toast({
          title: 'Sincronização concluída',
          description: 'Todas as alterações foram sincronizadas com sucesso.',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Sincronização parcial',
          description: `${remainingPending} alterações ainda aguardam sincronização.`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Erro durante sincronização:', error);
      toast({
        title: 'Erro de sincronização',
        description: 'Não foi possível sincronizar todas as alterações.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Não mostrar nada se não houver alterações pendentes
  if (pendingChanges === 0) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className={`flex items-center gap-1 ${!isOnline ? 'opacity-50' : ''}`}
      onClick={handleSync}
      disabled={isSyncing || !isOnline}
    >
      <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
      {pendingChanges > 0 ? `Sincronizar (${pendingChanges})` : 'Sincronizar'}
    </Button>
  );
};

export default SyncStatusButton;
