import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { processFile, ProcessedFile } from '@/utils/fileUtils';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Navigation, MapPin, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import ImportHelpDialog from "./ImportHelpDialog";
import ColumnMappingDialog from "./ColumnMappingDialog";

interface FileImportProps {
  onImportComplete: (deliveries: DeliveryItem[]) => void;
  routeName?: string;
}

const FileImport: React.FC<FileImportProps> = ({ onImportComplete, routeName = '' }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  
  // Estados para os diálogos de importação
  const [showHelpDialog, setShowHelpDialog] = useState<boolean>(false);
  const [showColumnMappingDialog, setShowColumnMappingDialog] = useState<boolean>(false);
  const [processedDeliveries, setProcessedDeliveries] = useState<DeliveryItem[]>([]);
  const [sampleData, setSampleData] = useState<Record<string, string[]>>({});
  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>({});

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
    
    // Verificar se o nome da rota foi informado
    if (!routeName || routeName.trim() === '') {
      toast({
        title: "Nome da rota obrigatório",
        description: "Por favor, informe um nome para a rota antes de importar.",
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
      }

      if (result.deliveries.length > 0) {
        setProgress(90);
        
        // Extrair amostras de dados para exibir no diálogo de mapeamento de colunas
        const sampleData: Record<string, string[]> = {
          // Usar o orderNumber real se disponível, caso contrário usar o índice
          atId: result.deliveries.slice(0, 3).map(d => d.orderNumber?.toString() || ''),
          // Usar a sequência real baseada na ordem da planilha
          sequence: result.deliveries.slice(0, 3).map((d, i) => {
            // Tentar usar o orderNumber se disponível
            if (d.orderNumber) return d.orderNumber.toString();
            // Caso contrário, usar o índice + 1
            return (i + 1).toString();
          }),
          stop: result.deliveries.slice(0, 3).map((d, i) => {
            // Tentar usar o orderNumber se disponível
            if (d.orderNumber) return d.orderNumber.toString();
            // Caso contrário, usar o índice + 1
            return (i + 1).toString();
          }),
          spxTn: result.deliveries.slice(0, 3).map(d => {
            // Tentar usar o telefone como tracking number se disponível
            if (d.telefone) return d.telefone;
            // Caso contrário, gerar um aleatório para exemplo
            return `BR${Math.floor(Math.random() * 10000000000000)}`;
          }),
          address: result.deliveries.slice(0, 3).map(d => d.endereco || d.address || ''),
          neighborhood: result.deliveries.slice(0, 3).map(d => {
            // Tentar extrair o bairro do endereço
            const endereco = d.endereco || d.address || '';
            const parts = endereco.split(',');
            return parts.length > 1 ? parts[1].trim() : '';
          }),
          city: result.deliveries.slice(0, 3).map(d => d.cidade || d.city || ''),
          zipcode: result.deliveries.slice(0, 3).map(d => d.cep || d.zipCode || ''),
        };
        
        setSampleData(sampleData);
        setProcessedDeliveries(result.deliveries);
        
        // Mostrar o diálogo de ajuda na importação
        setShowHelpDialog(true);
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
      
      // Não resetar o arquivo se vamos mostrar os diálogos
      if (importError) {
        setProgress(0);
      }
    }
  };

  // Função para iniciar GPS sem importação de arquivo
  const handleStartGPS = () => {
    // Criar uma entrega vazia apenas para iniciar o GPS - sem coordenadas definidas
    // para que o usuário possa escolher o destino
    const emptyDelivery: DeliveryItem[] = [];
    
    // Sem notificação para reduzir o número de toasts
    
    onImportComplete(emptyDelivery);
  };
  
  // Funções para lidar com os diálogos de importação
  const handleHelpDialogCancel = () => {
    setShowHelpDialog(false);
    setProcessedDeliveries([]);
    setProgress(0);
    setFile(null);
  };
  
  const handleHelpDialogContinue = () => {
    setShowHelpDialog(false);
    setShowColumnMappingDialog(true);
  };
  
  const handleColumnMappingBack = () => {
    setShowColumnMappingDialog(false);
    setShowHelpDialog(true);
  };
  
  const handleColumnMappingContinue = (selectedColumns: Record<string, boolean>) => {
    setSelectedColumns(selectedColumns);
    setShowColumnMappingDialog(false);
    
    // Finalizar a importação e passar as entregas para o componente pai
    toast({
      title: "Importação concluída",
      description: `${processedDeliveries.length} entregas importadas com sucesso.`,
    });
    
    // Limpar estados imediatamente
    setProgress(0);
    setFile(null);
    
    // Passar as entregas para o componente pai
    onImportComplete(processedDeliveries);
  };

  return (
    <>
      {/* Diálogo de ajuda na importação */}
      <ImportHelpDialog 
        isOpen={showHelpDialog}
        onCancel={handleHelpDialogCancel}
        onContinue={handleHelpDialogContinue}
      />
      
      {/* Diálogo de mapeamento de colunas */}
      <ColumnMappingDialog 
        isOpen={showColumnMappingDialog}
        onBack={handleColumnMappingBack}
        onContinue={handleColumnMappingContinue}
        sampleData={sampleData}
      />
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Rota Fácil Turbo</CardTitle>
        </CardHeader>
        <CardContent>
        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="import" className="flex items-center gap-1">
              <Upload size={16} />
              Importar Entregas
            </TabsTrigger>
            <TabsTrigger value="gps" className="flex items-center gap-1">
              <Navigation size={16} />
              Usar GPS
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="import" className="flex flex-col gap-4">
            <div className="grid w-full items-center gap-1.5">
              <div className="relative">
                <Button 
                  variant="outline" 
                  className="w-full h-auto py-8 flex flex-col items-center justify-center border-dashed border-2 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload size={24} className="mb-2 text-blue-500" />
                  <span className="font-medium">Selecionar arquivo</span>
                  <span className="text-xs text-gray-500 mt-1">{file ? file.name : 'Formatos aceitos: CSV, XLS, XLSX'}</span>
                </Button>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  id="file-upload"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  className="sr-only"
                />
              </div>
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

          {isProcessing ? (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center mt-1">
                Processando arquivo... {progress}%
              </p>
            </div>
          ) : (
            <Button 
              onClick={handleImport} 
              disabled={!file || isProcessing}
              className="w-full mt-4"
              size="lg"
            >
              <Upload size={16} className="mr-2" />
              {file ? 'Importar ' + file.name : 'Importar Arquivo'}
            </Button>
          )}
            
            <div className="text-xs text-gray-500 mt-2">
              <p><strong>Dica:</strong> Certifique-se que sua planilha tenha pelo menos duas colunas: uma para o nome do cliente e outra para o endereço.</p>
              <p>Colunas recomendadas: Cliente, Endereço, Cidade, Estado, CEP, Telefone, Observações</p>
            </div>
          </TabsContent>
          
          <TabsContent value="gps" className="flex flex-col gap-4">
            <div className="text-center py-6 flex flex-col items-center">
              <div className="bg-blue-50 p-4 rounded-full mb-4">
                <MapPin size={48} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">Modo GPS</h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md">
                Inicie a navegação GPS sem importar entregas. Você poderá usar o GPS para navegar para qualquer endereço.  
              </p>
              
              <Button 
                onClick={handleStartGPS}
                className="w-full max-w-xs bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <Navigation size={18} />
                Iniciar Navegação GPS
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </>
  );
};

export default FileImport;
