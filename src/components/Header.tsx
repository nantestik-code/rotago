
import React from 'react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onNewRouteClick: () => void;
  onExportClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewRouteClick, onExportClick }) => {
  return (
    <header className="bg-primary text-white py-4 px-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold">
        <a href="/" className="flex items-center">
          RotaFácil
        </a>
      </h1>

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="bg-white text-primary hover:bg-gray-100"
          onClick={onNewRouteClick}
        >
          Nova Rota
        </Button>
        <Button 
          variant="outline" 
          className="bg-amber-500 text-white hover:bg-amber-600 border-amber-500"
          onClick={onExportClick}
        >
          Baixar CSV
        </Button>
      </div>
    </header>
  );
};

export default Header;
