
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { processFile, ProcessedFile } from '@/utils/fileUtils';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { Progress } from '@/components/ui/progress';

interface FileImportProps {
  onImportComplete: (deliveries: DeliveryItem[]) => void;
}

const FileImport: React.FC<FileImportProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file type
      if (!['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(selectedFile.type)) {
        toast({
          title: "Formato não suportado",
          description: "Por favor, selecione um arquivo CSV, XLS ou XLSX.",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo para importar.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const result: ProcessedFile = await processFile(file);
      setProgress(70);

      if (result.errors && result.errors.length > 0) {
        // Show errors but continue if we have some valid data
        toast({
          title: `Importação com ${result.errors.length} erros`,
          description: `Alguns dados foram importados com sucesso, mas ocorreram erros. Veja o console para detalhes.`,
          variant: "destructive",
        });
        console.error("Erros de importação:", result.errors);
      } else {
        toast({
          title: "Importação concluída",
          description: `${result.deliveries.length} entregas importadas com sucesso.`,
        });
      }

      if (result.deliveries.length > 0) {
        setProgress(90);
        onImportComplete(result.deliveries);
      }
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: `Ocorreu um erro ao processar o arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
      
      // Reset file input
      setTimeout(() => {
        setProgress(0);
        setFile(null);
      }, 1000);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Importar Entregas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="grid w-full items-center gap-1.5">
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              id="file-upload"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500">
              Formatos aceitos: CSV, XLS, XLSX
            </p>
          </div>

          {progress > 0 && (
            <Progress value={progress} className="h-1" />
          )}

          <Button 
            onClick={handleImport}
            disabled={!file || isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Processando...' : 'Importar dados'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileImport;
