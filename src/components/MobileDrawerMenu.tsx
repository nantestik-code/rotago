import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  History, 
  Map, 
  FileUp, 
  Settings, 
  X, 
  ChevronRight,
  Route
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RouteHistoryItem {
  id: string;
  name: string;
  date: string;
  createdAt: string;
}

interface MobileDrawerMenuProps {
  onNewRoute: () => void;
  onSelectHistoryRoute?: (routeId: string) => void;
}

const MobileDrawerMenu: React.FC<MobileDrawerMenuProps> = ({
  onNewRoute,
  onSelectHistoryRoute
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [routeHistory, setRouteHistory] = useState<RouteHistoryItem[]>([]);

  // Carregar histórico de rotas do localStorage
  useEffect(() => {
    try {
      const historyString = localStorage.getItem('route-history');
      if (historyString) {
        const history = JSON.parse(historyString);
        setRouteHistory(history);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de rotas:', error);
    }
  }, [isOpen]); // Recarregar quando o menu for aberto

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <>
      {/* Botão de menu fixo no canto superior esquerdo */}
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="absolute top-14 left-2 z-20 h-8 w-8 p-0 shadow-md bg-white"
      >
        <Menu size={16} />
      </Button>

      {/* Menu arrastável */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-white shadow-lg z-50 flex flex-col"
          >
            {/* Cabeçalho do menu */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Conteúdo do menu */}
            <div className="flex-1 overflow-y-auto">
              {/* Opções principais */}
              <div className="p-2">
                <Button
                  onClick={() => {
                    setIsOpen(false);
                    onNewRoute();
                  }}
                  variant="ghost"
                  className="w-full justify-start text-left p-3 mb-1"
                >
                  <FileUp size={18} className="mr-2" />
                  Nova Rota
                </Button>
                
                <Button
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  variant="ghost"
                  className="w-full justify-start text-left p-3 mb-1"
                >
                  <Map size={18} className="mr-2" />
                  Mapa Atual
                </Button>
              </div>

              {/* Histórico de rotas */}
              <div className="border-t mt-2 pt-2">
                <h3 className="px-4 py-2 text-sm font-medium text-gray-500 flex items-center">
                  <History size={16} className="mr-2" />
                  Histórico de Rotas
                </h3>

                <div className="px-2">
                  {routeHistory.length > 0 ? (
                    routeHistory
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((route) => (
                        <Button
                          key={route.id}
                          onClick={() => {
                            if (onSelectHistoryRoute) {
                              onSelectHistoryRoute(route.id);
                            }
                            setIsOpen(false);
                          }}
                          variant="ghost"
                          className="w-full justify-between text-left p-3 mb-1 hover:bg-gray-100"
                        >
                          <div className="flex items-center">
                            <Route size={16} className="mr-2 text-brand-500" />
                            <div>
                              <div className="font-medium text-sm">{route.name}</div>
                              <div className="text-xs text-gray-500">{formatDate(route.date)}</div>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-400" />
                        </Button>
                      ))
                  ) : (
                    <p className="text-sm text-gray-500 px-3 py-2">
                      Nenhuma rota no histórico
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé do menu */}
            <div className="border-t p-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setIsOpen(false)}
              >
                <Settings size={16} className="mr-2" />
                Configurações
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay para fechar o menu ao clicar fora */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default MobileDrawerMenu;
