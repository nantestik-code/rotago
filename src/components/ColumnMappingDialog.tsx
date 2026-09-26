import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft } from 'lucide-react';
import { mapFields } from '@/utils/fileUtils';
import { Checkbox } from '@/components/ui/checkbox';

interface ColumnMappingDialogProps {
  isOpen: boolean;
  onBack: () => void;
  onContinue: (mapping: Record<string, string>) => void;
  sampleData?: Record<string, string[]>;
  headers: string[];
}

const ColumnMappingDialog: React.FC<ColumnMappingDialogProps> = ({
  isOpen,
  onBack,
  onContinue,
  sampleData,
  headers
}) => {

  // Opções rápidas de visualização na lista (não altera mapeamento)
  const displayOptions: { id: string; label: string }[] = [
    { id: 'order', label: 'Ordem' },
    { id: 'address', label: 'Endereço' },
    { id: 'city', label: 'Cidade' },
    { id: 'bairro', label: 'Bairro' },
    { id: 'zipcode', label: 'CEP' },
  ];

  // Sugestão inicial automática baseada nos cabeçalhos
  const suggested = useMemo(() => mapFields(headers || []), [headers]);

  // mapeamento sugerido será usado diretamente ao continuar

  // Seleção simples do que mostrar (padrão: ordem, endereço, cidade)
  const [displaySelection, setDisplaySelection] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('delivery-display-fields');
    if (saved) {
      try {
        const arr: string[] = JSON.parse(saved);
        return displayOptions.reduce((acc, opt) => ({ ...acc, [opt.id]: arr.includes(opt.id) }), {} as Record<string, boolean>);
      } catch {}
    }
    return { order: true, address: true, city: true, bairro: false, zipcode: false };
  });

  const handleChange = (fieldId: string, value: string) => {
    // Mantido apenas por compatibilidade (não usado)
  };

  const handleContinue = () => {
    // Persistir preferências de exibição para a lista
    // Persistir preferências de exibição para a lista
    try {
      const selected = Object.entries(displaySelection)
        .filter(([, v]) => v)
        .map(([k]) => k);
      localStorage.setItem('delivery-display-fields', JSON.stringify(selected));
    } catch {}
    // Enviar o mapeamento sugerido automaticamente sem perguntar
    onContinue(suggested as Record<string, string>);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onBack()}>
      <DialogContent className="bg-white text-gray-900 max-w-lg p-6 rounded-lg" aria-describedby="mapping-desc">
        <DialogTitle className="text-lg font-semibold">Mapear colunas da planilha</DialogTitle>
        <DialogDescription id="mapping-desc" className="sr-only">
          Configure rapidamente o que mostrar na lista e ajuste o mapeamento das colunas, se necessário.
        </DialogDescription>
        <div className="flex flex-col items-start space-y-5 py-2">
          {/* Modo simples: o que mostrar na lista */}
          <div className="w-full">
            <h3 className="text-sm font-medium mb-2">O que mostrar na lista (rápido)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {displayOptions.map(opt => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!displaySelection[opt.id]}
                    onCheckedChange={(v) => setDisplaySelection(prev => ({ ...prev, [opt.id]: Boolean(v) }))}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Sem mapeamento avançado: usamos detecção automática */}
          <p className="text-xs text-gray-500">As colunas da planilha serão detectadas automaticamente.</p>
        </div>
        <DialogFooter className="flex justify-between pt-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          
          <Button
            onClick={handleContinue}
            className="bg-brand-600 text-white hover:bg-brand-700"
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnMappingDialog;
