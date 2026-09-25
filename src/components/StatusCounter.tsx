import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Hash } from 'lucide-react';


interface StatusCounterProps {
  pendente: number;
  entregue: number;
  ocorrencia: number;
  total: number;
  className?: string;
}

const cards = [
  {
    key: 'pendente',
    label: 'Pacotes',
    valueKey: 'pendente',
    icon: Clock3,
    valueClass: 'text-blue-600',
    accentClass: 'bg-blue-500',
    chipClass: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  {
    key: 'entregue',
    label: 'Entregue',
    valueKey: 'entregue',
    icon: CheckCircle2,
    valueClass: 'text-emerald-600',
    accentClass: 'bg-emerald-500',
    chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  {
    key: 'ocorrencia',
    label: 'Ocorrencia',
    valueKey: 'ocorrencia',
    icon: AlertTriangle,
    valueClass: 'text-rose-600',
    accentClass: 'bg-rose-500',
    chipClass: 'bg-rose-50 text-rose-700 border-rose-100',
  },
  {
    key: 'total',
    label: 'Total',
    valueKey: 'total',
    icon: Hash,
    valueClass: 'text-slate-900',
    accentClass: 'bg-slate-400',
    chipClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
] as const;

const StatusCounter: React.FC<StatusCounterProps> = ({
  pendente,
  entregue,
  ocorrencia,
  total,
  className = '',
}) => {
  const values = { pendente, entregue, ocorrencia, total };

  return (
    <div className={`grid grid-cols-4 gap-2 ${className}`}>
      {cards.map(card => {
        const Icon = card.icon;
        const value = values[card.valueKey];

        return (
          <div
            key={card.key}
            className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 ${card.chipClass}`}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                {card.label}
              </p>
              <p className={`dispatch-num text-xl font-semibold ${card.valueClass}`}>
                {value}
              </p>
            </div>
            <Icon className="h-4 w-4 opacity-70" />
          </div>
        );
      })}
    </div>
  );
};

export default StatusCounter;
