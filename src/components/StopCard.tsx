import { AlertTriangle, Check, Navigation, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeliveryItem } from '@/utils/deliveryUtils';

interface StopCardProps {
  group: DeliveryItem[];
  selected: boolean;
  mode: 'pendente' | 'entregue' | 'ocorrencia';
  onSelect: () => void;
  onNavigate?: () => void;
  onComplete?: () => void;
  onProblem?: () => void;
  onUndo?: () => void;
}

const streetTitle = (address: string) => address.split(',')[0]?.trim() || address;

const StopCard = ({
  group,
  selected,
  mode,
  onSelect,
  onNavigate,
  onComplete,
  onProblem,
  onUndo,
}: StopCardProps) => {
  const first = group[0];
  const stopNum = Number(first.orderNumber ?? first.sequence_number ?? 0);
  const packages = group
    .map((item) => item.sequence_number)
    .filter((value): value is number => value != null);
  const notes = group.map((item) => item.observacoes).filter(Boolean);
  const trackings = group.map((item) => item.trackingNumber).filter(Boolean);
  const canNavigate = Boolean(first.lat && first.lng);

  const tone = {
    pendente: {
      badge: selected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800',
      ring: selected ? 'ring-2 ring-blue-500/40' : 'ring-1 ring-slate-200',
    },
    entregue: {
      badge: 'bg-emerald-600 text-white',
      ring: selected ? 'ring-2 ring-emerald-500/30' : 'ring-1 ring-emerald-100',
    },
    ocorrencia: {
      badge: 'bg-red-600 text-white',
      ring: selected ? 'ring-2 ring-red-500/30' : 'ring-1 ring-red-100',
    },
  }[mode];

  return (
    <article
      className={`rounded-2xl bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] ${tone.ring}`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-bold ${tone.badge}`}>
          {stopNum}
          {group.length > 1 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
              {group.length}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-500">
            Parada {stopNum}
            {group.length > 1 ? ` · ${group.length} pacotes` : ''}
          </p>
          <h3 className="truncate text-[15px] font-semibold text-slate-900">
            {streetTitle(first.endereco)}
          </h3>
          <p className="truncate text-xs text-slate-500">
            {[first.bairro, first.cidade].filter(Boolean).join(' · ')}
          </p>
          {packages.length > 0 && (
            <p className="mt-1 truncate text-xs font-medium text-slate-600">
              Pacotes {packages.map((value) => `#${value}`).join(' · ')}
            </p>
          )}
          {trackings.length > 0 && (
            <p className="truncate text-[11px] text-slate-400">
              {trackings.slice(0, 3).join(' · ')}
              {trackings.length > 3 ? ` +${trackings.length - 3}` : ''}
            </p>
          )}
        </div>
      </div>

      {notes.map((note, index) => (
        <p key={`${note}-${index}`} className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
          {note}
        </p>
      ))}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {mode === 'pendente' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-10 text-xs"
              disabled={!canNavigate}
              onClick={(event) => {
                event.stopPropagation();
                onNavigate?.();
              }}
            >
              <Navigation size={14} />
              Navegar
            </Button>
            <Button
              size="sm"
              className="h-10 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              onClick={(event) => {
                event.stopPropagation();
                onComplete?.();
              }}
            >
              <Check size={14} />
              Entregue
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 border-red-200 text-xs text-red-700 hover:bg-red-50"
              onClick={(event) => {
                event.stopPropagation();
                onProblem?.();
              }}
            >
              <AlertTriangle size={14} />
              Problema
            </Button>
          </>
        )}
        {mode !== 'pendente' && (
          <Button
            size="sm"
            variant="outline"
            className="col-span-3 h-10 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onUndo?.();
            }}
          >
            <RotateCcw size={14} />
            Desfazer
          </Button>
        )}
      </div>
    </article>
  );
};

export default StopCard;
