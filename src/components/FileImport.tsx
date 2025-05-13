
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { processFile, ProcessedFile } from '@/utils/fileUtils';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FileImportProps {
  onImportComplete: (deliveries: DeliveryItem[]) => void;
}

const FileImport: React.FC<FileImportProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportWarnings([]);
    
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file type
      if (!['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
            'application/csv', 'text/comma-separated-values', ''].includes(selectedFile.type)) {
        toast({
          title: "Formato não suportado",
          description: "Por favor, selecione um arquivo CSV, XLS ou XLSX.",
          variant: "destructive",
        });
        return;
      }
      
      // Aceitar qualquer extensão .csv, .xls ou .xlsx
      if (!selectedFile.name.endsWith('.csv') && 
          !selectedFile.name.endsWith('.xls') && 
          !selectedFile.name.endsWith('.xlsx')) {
        toast({
          title: "Extensão não suportada",
          description: "Por favor, selecione um arquivo com extensão .CSV, .XLS ou .XLSX.",
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
    setImportError(null);
    setImportWarnings([]);

    try {
      console.log("Processando arquivo:", file.name);
      const result: ProcessedFile = await processFile(file);
      setProgress(70);

      if (result.errors && result.errors.length > 0) {
        // Mostrar os primeiros 5 erros e quantos mais existem
        const sampleErrors = result.errors.slice(0, 5);
        const remainingErrors = result.errors.length - 5;
        
        setImportWarnings(sampleErrors);
        
        // Show errors but continue if we have some valid data
        toast({
          title: `Importação com ${result.errors.length} erros`,
          description: `Alguns dados foram importados com sucesso, mas ocorreram erros. Veja detalhes abaixo.`,
          variant: "destructive",
        });
        
        console.error("Erros de importação:", result.errors);
        
        if (result.deliveries.length === 0) {
          setImportError(`Falha na importação: ${sampleErrors[0]}`);
          setIsProcessing(false);
          setProgress(0);
          return;
        }
      } else {
        toast({
          title: "Importação concluída",
          description: `${result.deliveries.length} entregas importadas com sucesso.`,
        });
      }

      if (result.deliveries.length > 0) {
        setProgress(90);
        onImportComplete(result.deliveries);
      } else {
        setImportError("Nenhuma entrega foi importada. Verifique se o arquivo contém os dados necessários.");
      }
    } catch (error) {
      setImportError(`Ocorreu um erro ao processar o arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast({
        title: "Erro na importação",
        description: `Ocorreu um erro ao processar o arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
      
      // Reset file input if successful
      if (!importError) {
        setTimeout(() => {
          setProgress(0);
          setFile(null);
        }, 1000);
      } else {
        setProgress(0);
      }
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
          
          {importError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                {importError}
              </AlertDescription>
            </Alert>
          )}
          
          {importWarnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Avisos ({importWarnings.length})</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 text-sm">
                  {importWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                  {importWarnings.length > 5 && (
                    <li>... e mais {importWarnings.length - 5} avisos.</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

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
          
          <div className="text-xs text-gray-500 mt-2">
            <p><strong>Dica:</strong> Certifique-se que sua planilha tenha pelo menos duas colunas: uma para o nome do cliente e outra para o endereço.</p>
            <p>Colunas recomendadas: Cliente, Endereço, Cidade, Estado, CEP, Telefone, Observações</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileImport;
