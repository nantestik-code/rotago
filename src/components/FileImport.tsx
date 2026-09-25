import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { processFile, ProcessedFile, createDeliveryFromRow, isStructuredRouteSheet } from '@/utils/fileUtils';
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
  const [selectedMapping, setSelectedMapping] = useState<Record<string, string>>({});
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

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
            if (d.sequence_number) return d.sequence_number.toString();
            return (i + 1).toString();
          }),
          stop: result.deliveries.slice(0, 3).map((d, i) => {
            if (d.orderNumber) return d.orderNumber.toString();
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
        setRawRows(result.rawRows || []);
        setHeaders(result.headers || Object.keys(result.deliveries[0] || {}));

        if (isStructuredRouteSheet(result.headers || [])) {
          toast({
            title: "Rota importada",
            description: `${result.deliveries.length} pacotes prontos para entrega.`,
          });
          setProgress(0);
          setFile(null);
          onImportComplete(result.deliveries);
          return;
        }

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
  
  const handleColumnMappingContinue = (mapping: Record<string, string>) => {
    setSelectedMapping(mapping);
    setShowColumnMappingDialog(false);
    
    // Converter o mapeamento externo (order, city, zipcode, etc.) para os nomes internos
    const internalMapping: Record<string, string> = {};
    if (mapping['address']) internalMapping['endereco'] = mapping['address'];
    if (mapping['endereco']) internalMapping['endereco'] = mapping['endereco'];
    if (mapping['bairro']) internalMapping['bairro'] = mapping['bairro'];
    if (mapping['city']) internalMapping['cidade'] = mapping['city'];
    if (mapping['cidade']) internalMapping['cidade'] = mapping['cidade'];
    if (mapping['zipcode']) internalMapping['cep'] = mapping['zipcode'];
    if (mapping['cep']) internalMapping['cep'] = mapping['cep'];
    if (mapping['sequence']) internalMapping['sequence'] = mapping['sequence'];
    if (mapping['stop']) internalMapping['stop'] = mapping['stop'];
    if (mapping['order']) internalMapping['order'] = mapping['order'];
    if (mapping['latitude']) internalMapping['latitude'] = mapping['latitude'];
    if (mapping['longitude']) internalMapping['longitude'] = mapping['longitude'];
    if (mapping['cliente']) internalMapping['cliente'] = mapping['cliente'];
    if (mapping['tracking']) internalMapping['tracking'] = mapping['tracking'];
    if (mapping['atId']) internalMapping['atId'] = mapping['atId'];

    // Recriar as entregas a partir das linhas brutas com o mapeamento escolhido
    let finalDeliveries: DeliveryItem[] = [];
    try {
      finalDeliveries = (rawRows && rawRows.length > 0 ? rawRows : processedDeliveries).map((row, idx) =>
        createDeliveryFromRow(row, internalMapping, idx)
      );
    } catch (e) {
      console.error('Erro ao aplicar mapeamento personalizado, usando parse prévio.', e);
      finalDeliveries = processedDeliveries;
    }
    setProcessedDeliveries(finalDeliveries);
    
    // Finalizar a importação e passar as entregas para o componente pai
    toast({
      title: "Importação concluída",
      description: `${finalDeliveries.length} entregas importadas com sucesso.`,
    });
    
    // Limpar estados imediatamente
    setProgress(0);
    setFile(null);
    
    // Passar as entregas para o componente pai
    onImportComplete(finalDeliveries);
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
        headers={headers}
      />
      
      <div className="w-full">
            <div className="grid w-full items-center gap-1.5">
              <div className="relative">
                <Button 
                  variant="outline" 
                  className="h-auto w-full flex-col items-center justify-center border-2 border-dashed border-sky-200 bg-sky-50/40 py-10 hover:border-blue-400 hover:bg-blue-50"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload size={24} className="mb-2 text-blue-500" />
                  <span className="font-medium text-slate-800">Soltar planilha ou clicar para escolher</span>
                  <span className="mt-1 text-xs text-slate-500">{file ? file.name : 'CSV, XLS, XLSX · SPX entra direto'}</span>
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
            
            <p className="mt-3 text-center text-xs text-slate-500">
              Planilha SPX importa na hora. Outros formatos pedem uma confirmação rápida.
            </p>
      </div>
    </>
  );
};

export default FileImport;
