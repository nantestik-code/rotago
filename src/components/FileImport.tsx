import React, { useRef, useState } from 'react';
import { ClipboardPaste, Download, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { isStructuredRouteSheet } from '@/utils/fileUtils';
import {
  MAX_FILE_BYTES,
  Workbook,
  buildHeaders,
  detectHeaderRow,
  downloadTemplate,
  gridToRows,
  hasAcceptedExtension,
  loadMapping,
  parseText,
  readWorkbook,
  reviewRows,
} from '@/utils/sheetImport';
import ImportReviewDialog from './ImportReviewDialog';

interface FileImportProps {
  onImportComplete: (deliveries: DeliveryItem[]) => void;
  routeName?: string;
}

const FileImport: React.FC<FileImportProps> = ({ onImportComplete, routeName = '' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [fileName, setFileName] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');

  const requireRouteName = () => {
    if (routeName.trim()) return true;
    toast({
      title: 'Dê um nome para a rota',
      description: 'Preencha o nome da rota acima e tente de novo.',
      variant: 'destructive',
    });
    return false;
  };

  // Planilha SPX sem nenhum problema entra direto, como antes
  const tryFastPath = (wb: Workbook) => {
    const grid = wb.sheets[wb.sheetNames[0]] ?? [];
    const headerRow = detectHeaderRow(grid);
    const headers = buildHeaders(grid[headerRow] ?? []);
    if (!isStructuredRouteSheet(headers)) return false;
    const reviewed = reviewRows(gridToRows(grid, headerRow, headers), loadMapping(headers), headerRow);
    if (reviewed.length === 0 || reviewed.some((row) => row.status !== 'ok')) return false;
    toast({ title: 'Rota importada', description: `${reviewed.length} pacotes prontos para entrega.` });
    onImportComplete(reviewed.map((row) => row.delivery!));
    return true;
  };

  const openWorkbook = (wb: Workbook, name: string) => {
    if (wb.sheetNames.length === 0) {
      toast({ title: 'Planilha vazia', description: 'Não encontramos nenhuma linha preenchida.', variant: 'destructive' });
      return;
    }
    if (tryFastPath(wb)) return;
    setFileName(name);
    setWorkbook(wb);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !requireRouteName()) return;
    if (!hasAcceptedExtension(file.name)) {
      toast({
        title: 'Formato não suportado',
        description: 'Envie um arquivo .xlsx, .xls ou .csv.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'O limite é 15 MB.', variant: 'destructive' });
      return;
    }
    setReading(true);
    try {
      openWorkbook(await readWorkbook(file), file.name);
    } catch (error) {
      console.error('Erro ao ler planilha:', error);
      toast({
        title: 'Não conseguimos ler o arquivo',
        description: 'Ele pode estar corrompido ou protegido por senha. Tente salvar de novo como .xlsx.',
        variant: 'destructive',
      });
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handlePasteConfirm = () => {
    if (!pasted.trim() || !requireRouteName()) return;
    setPasteOpen(false);
    openWorkbook(parseText(pasted, 'Colado do Excel'), 'Colado do Excel');
    setPasted('');
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  return (
    <>
      <ImportReviewDialog
        open={Boolean(workbook)}
        fileName={fileName}
        workbook={workbook}
        onCancel={() => setWorkbook(null)}
        onConfirm={(deliveries) => {
          setWorkbook(null);
          onImportComplete(deliveries);
        }}
      />

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Colar do Excel ou Google Planilhas</DialogTitle>
            <DialogDescription>
              Selecione as células na planilha (com o cabeçalho), copie com Ctrl+C e cole aqui.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            placeholder={'Cliente\tEndereço\tBairro\tCidade\tCEP\nMaria\tRua das Flores, 120\tCentro\tCampinas\t13010-000'}
            className="min-h-[220px] font-mono text-xs"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteOpen(false)}>Cancelar</Button>
            <Button onClick={handlePasteConfirm} disabled={!pasted.trim()}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full space-y-3">
        <div
          role="button"
          tabIndex={0}
          aria-label="Escolher planilha"
          onClick={() => !reading && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            dragging ? 'border-primary bg-brand-50' : 'border-brand-200 bg-brand-50/40 hover:border-brand-400 hover:bg-brand-50'
          }`}
        >
          {reading ? (
            <Loader2 className="mb-2 h-7 w-7 animate-spin text-primary" />
          ) : (
            <Upload className="mb-2 h-7 w-7 text-primary" />
          )}
          <span className="font-semibold text-foreground">
            {reading ? 'Lendo planilha...' : dragging ? 'Solte para importar' : 'Arraste a planilha aqui ou clique para escolher'}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">Excel (.xlsx, .xls) ou CSV · até 15 MB</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.tsv,.txt,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0])}
            disabled={reading}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setPasteOpen(true)} disabled={reading}>
            <ClipboardPaste className="mr-1.5 h-4 w-4" /> Colar do Excel
          </Button>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-1.5 h-4 w-4" /> Baixar modelo
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Você confere as colunas e os endereços antes de importar. Planilha SPX entra direto.
        </p>
      </div>
    </>
  );
};

export default FileImport;
