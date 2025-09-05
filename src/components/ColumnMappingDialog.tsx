import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';

interface ColumnOption {
  id: string;
  label: string;
  description: string; // Added description field
  examples: string[];
  selected: boolean;
}

interface ColumnMappingDialogProps {
  isOpen: boolean;
  onBack: () => void;
  onContinue: (selectedColumns: Record<string, boolean>) => void;
  sampleData: Record<string, string[]>;
}

const ColumnMappingDialog: React.FC<ColumnMappingDialogProps> = ({
  isOpen,
  onBack,
  onContinue,
  sampleData
}) => {
  // Determine which options have valid data in the spreadsheet
  const hasValidData = (examples: string[]) => {
    return examples && examples.length > 0 && examples.some(ex => ex && ex.trim() !== '');
  };

  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { 
      id: 'sequence', 
      label: 'Sequence', 
      description: 'Ordem da entrega na rota', 
      examples: sampleData.sequence || [], 
      selected: true 
    },
    { 
      id: 'address', 
      label: 'Destination Address', 
      description: 'Endereço completo de entrega', 
      examples: sampleData.address || [], 
      selected: true 
    },
    { 
      id: 'neighborhood', 
      label: 'Bairro', 
      description: 'Bairro da entrega', 
      examples: sampleData.neighborhood || [], 
      selected: hasValidData(sampleData.neighborhood || []) 
    },
  ]);

  const handleCheckboxChange = (id: string) => {
    setColumnOptions(prev => 
      prev.map(option => 
        option.id === id ? { ...option, selected: !option.selected } : option
      )
    );
  };

  const handleContinue = () => {
    const selectedColumns = columnOptions.reduce((acc, option) => {
      acc[option.id] = option.selected;
      return acc;
    }, {} as Record<string, boolean>);
    
    onContinue(selectedColumns);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onBack()}>
      <DialogContent className="bg-blue-600 text-white max-w-md p-6 rounded-lg">
        <DialogTitle className="sr-only">Seleção de informações adicionais</DialogTitle>
        <div className="flex flex-col items-start space-y-6 py-4">
          <h2 className="text-xl font-bold leading-tight">
            Além das informações de endereço, selecione o que mais você quer ver ao chegar
          </h2>
          
          <div className="w-full space-y-4">
            {columnOptions.map((option) => (
              <div key={option.id} className="flex items-start space-x-3">
                <Checkbox 
                  id={option.id}
                  checked={option.selected}
                  onCheckedChange={() => handleCheckboxChange(option.id)}
                  className="bg-white data-[state=checked]:bg-white data-[state=checked]:text-blue-600 border-white h-5 w-5 mt-1"
                />
                <div className="flex flex-col">
                  <label 
                    htmlFor={option.id} 
                    className="text-base font-medium cursor-pointer"
                  >
                    {option.label}
                    <span className="ml-1 font-normal text-sm opacity-90">({option.description})</span>
                  </label>
                  {option.examples.length > 0 && (
                    <span className="text-sm opacity-80 mt-0.5">
                      {option.examples.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between pt-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-white hover:bg-blue-700 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
          </Button>
          
          <Button
            onClick={handleContinue}
            className="bg-white text-blue-600 hover:bg-blue-100"
          >
            PRÓXIMO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnMappingDialog;
