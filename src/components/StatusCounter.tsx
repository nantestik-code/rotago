
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatusCounterProps {
  pendente: number;
  entregue: number;
  ocorrencia: number;
  total: number;
}

const StatusCounter: React.FC<StatusCounterProps> = ({ pendente, entregue, ocorrencia, total }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Pendente</p>
            <p className="text-2xl font-bold text-blue-500">{pendente}</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Entregue</p>
            <p className="text-2xl font-bold text-green-500">{entregue}</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Ocorrência</p>
            <p className="text-2xl font-bold text-red-500">{ocorrencia}</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatusCounter;
