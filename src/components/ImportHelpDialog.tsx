import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';

interface ImportHelpDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

const ImportHelpDialog: React.FC<ImportHelpDialogProps> = ({
  isOpen,
  onCancel,
  onContinue
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="bg-blue-600 text-white max-w-md p-6 rounded-lg">
        <DialogTitle className="sr-only">Ajuda para importação</DialogTitle>
        <div className="flex flex-col items-start space-y-4 py-8">
          <h2 className="text-2xl font-bold">
            O ROTAGO precisa de ajuda para importar sua rota.
          </h2>
          
          <p className="text-base opacity-90">
            Responda a algumas perguntas para nos ajudar a identificar as informações no arquivo importado.
          </p>
        </div>
        
        <DialogFooter className="flex justify-between pt-4">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-white hover:bg-blue-700 hover:text-white"
          >
            CANCELAR
          </Button>
          
          <Button
            onClick={onContinue}
            className="bg-white text-blue-600 hover:bg-blue-100"
          >
            VAMOS LÁ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportHelpDialog;
