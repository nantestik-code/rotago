import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, X, Info } from 'lucide-react';
import { swManager, SWUpdateInfo } from '@/utils/sw-manager';

interface UpdateNotificationProps {
  className?: string;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ className }) => {
  const [updateInfo, setUpdateInfo] = useState<SWUpdateInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [swStatus, setSWStatus] = useState(swManager.status);

  useEffect(() => {
    // Registrar callback para atualizações
    const unsubscribe = swManager.onUpdate((info) => {
      console.log('🔔 [UpdateNotification] Atualização recebida:', info);
      setUpdateInfo(info);
      setIsVisible(true);
    });

    // Verificar status inicial
    setSWStatus(swManager.status);
    
    // Se já há uma atualização disponível, mostrar
    if (swManager.hasUpdateAvailable) {
      setIsVisible(true);
      setUpdateInfo({
        type: 'SW_UPDATED',
        message: 'Nova versão disponível!'
      });
    }

    // Verificar atualizações ao montar
    swManager.checkForUpdates();

    return unsubscribe;
  }, []);

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    
    try {
      console.log('🔄 [UpdateNotification] Aplicando atualização...');
      await swManager.applyUpdate();
    } catch (error) {
      console.error('❌ [UpdateNotification] Erro ao aplicar atualização:', error);
      setIsUpdating(false);
    }
  };

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    
    try {
      console.log('💥 [UpdateNotification] Forçando atualização...');
      await swManager.forceUpdate();
    } catch (error) {
      console.error('❌ [UpdateNotification] Erro ao forçar atualização:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setUpdateInfo(null);
  };

  const handleCheckUpdates = async () => {
    setIsUpdating(true);
    
    try {
      const hasUpdate = await swManager.checkForUpdates();
      if (!hasUpdate) {
        // Mostrar feedback de "já está atualizado"
        setUpdateInfo({
          type: 'SW_UPDATED',
          message: 'Você já está na versão mais recente!'
        });
        setIsVisible(true);
        
        // Auto-dismiss após 3 segundos
        setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      }
    } catch (error) {
      console.error('❌ [UpdateNotification] Erro ao verificar atualizações:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Não renderizar se SW não é suportado
  if (!swStatus.supported) {
    return null;
  }

  return (
    <>
      {/* Botão flutuante para verificar atualizações */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={handleCheckUpdates}
          disabled={isUpdating}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg hover:shadow-xl transition-shadow"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? 'Verificando...' : 'Verificar Atualizações'}
        </Button>
      </div>

      {/* Notificação de atualização */}
      {isVisible && updateInfo && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">
                    Atualização Disponível
                  </h3>
                  {updateInfo.version && (
                    <Badge variant="secondary" className="text-xs">
                      v{updateInfo.version}
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {updateInfo.message || 'Uma nova versão do RotaFacil Turbo está disponível!'}
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={handleApplyUpdate}
                  disabled={isUpdating}
                  size="sm"
                  className="flex-1"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Atualizar
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleForceUpdate}
                  disabled={isUpdating}
                  variant="outline"
                  size="sm"
                  title="Força atualização completa (limpa cache)"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Status do Service Worker */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Info className="h-3 w-3" />
                  <span>
                    SW: {swStatus.active ? 'Ativo' : 'Inativo'} | 
                    Cache: {swStatus.registered ? 'OK' : 'Erro'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default UpdateNotification;
