import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Download, FileSpreadsheet, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DeliveryItem } from '@/utils/deliveryUtils';
import {
  Workbook,
  buildHeaders,
  detectHeaderRow,
  downloadIssues,
  gridToRows,
  loadMapping,
  reviewRows,
  saveMapping,
} from '@/utils/sheetImport';

interface ImportReviewDialogProps {
  open: boolean;
  fileName: string;
  workbook: Workbook | null;
  onCancel: () => void;
  onConfirm: (deliveries: DeliveryItem[]) => void;
}

const NONE = '__none__';

const MAIN_FIELDS: { id: string; label: string; required?: boolean }[] = [
  { id: 'endereco', label: 'Endereço', required: true },
  { id: 'numero', label: 'Número' },
  { id: 'bairro', label: 'Bairro' },
  { id: 'cidade', label: 'Cidade' },
  { id: 'cep', label: 'CEP' },
  { id: 'cliente', label: 'Cliente' },
];

const EXTRA_FIELDS: { id: string; label: string }[] = [
  { id: 'estado', label: 'UF' },
  { id: 'complemento', label: 'Complemento' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'observacoes', label: 'Observações' },
  { id: 'tracking', label: 'Rastreio / pedido' },
  { id: 'sequence', label: 'Nº do pacote' },
  { id: 'stop', label: 'Nº da parada' },
  { id: 'latitude', label: 'Latitude' },
  { id: 'longitude', label: 'Longitude' },
];

const PREVIEW_LIMIT = 200;

const ImportReviewDialog: React.FC<ImportReviewDialogProps> = ({ open, fileName, workbook, onCancel, onConfirm }) => {
  const [sheetName, setSheetName] = useState('');
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  const grid = useMemo(() => (workbook && sheetName ? workbook.sheets[sheetName] ?? [] : []), [workbook, sheetName]);
  const headers = useMemo(() => buildHeaders(grid[headerRow] ?? []), [grid, headerRow]);
  const rows = useMemo(() => gridToRows(grid, headerRow, headers), [grid, headerRow, headers]);

  // Novo arquivo: escolhe a primeira aba e detecta o cabeçalho
  useEffect(() => {
    if (!workbook) return;
    const first = workbook.sheetNames[0] ?? '';
    setSheetName(first);
    setHeaderRow(detectHeaderRow(workbook.sheets[first] ?? []));
    setOnlyIssues(false);
  }, [workbook]);

  // Cabeçalhos mudaram: recarrega mapeamento salvo ou automático
  useEffect(() => {
    if (headers.length) setMapping(loadMapping(headers));
  }, [headers]);

  const reviewed = useMemo(
    () => (mapping.endereco ? reviewRows(rows, mapping, headerRow) : []),
    [rows, mapping, headerRow]
  );

  const counts = useMemo(
    () => ({
      ok: reviewed.filter((row) => row.status === 'ok').length,
      aviso: reviewed.filter((row) => row.status === 'aviso').length,
      erro: reviewed.filter((row) => row.status === 'erro').length,
    }),
    [reviewed]
  );
  const importable = counts.ok + counts.aviso;

  const visible = (onlyIssues ? reviewed.filter((row) => row.status !== 'ok') : reviewed).slice(0, PREVIEW_LIMIT);

  const sampleFor = (header: string) => rows.find((row) => row[header])?.[header] ?? '';

  const setField = (field: string, header: string) =>
    setMapping((current) => {
      const next = { ...current };
      // Uma coluna só pode alimentar um campo
      for (const key of Object.keys(next)) if (next[key] === header) delete next[key];
      if (header === NONE) delete next[field];
      else next[field] = header;
      return next;
    });

  const handleConfirm = () => {
    saveMapping(headers, mapping);
    onConfirm(reviewed.filter((row) => row.delivery && row.status !== 'erro').map((row) => row.delivery!));
  };

  const renderField = (field: { id: string; label: string; required?: boolean }) => (
    <div key={field.id} className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      <Select value={mapping[field.id] ?? NONE} onValueChange={(value) => setField(field.id, value)}>
        <SelectTrigger className={`h-9 text-sm ${field.required && !mapping[field.id] ? 'border-destructive' : ''}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Não usar</SelectItem>
          {headers.map((header) => (
            <SelectItem key={header} value={header}>
              <span className="font-medium">{header}</span>
              {sampleFor(header) && (
                <span className="ml-2 text-muted-foreground">ex.: {sampleFor(header).slice(0, 28)}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Confira antes de importar
          </DialogTitle>
          <DialogDescription className="truncate">
            {fileName} · {rows.length} linha{rows.length === 1 ? '' : 's'} encontradas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {workbook && (
            <div className="flex flex-wrap gap-3">
              {workbook.sheetNames.length > 1 && (
                <div className="min-w-[180px] flex-1 space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Aba</Label>
                  <Select
                    value={sheetName}
                    onValueChange={(name) => {
                      setSheetName(name);
                      setHeaderRow(detectHeaderRow(workbook.sheets[name] ?? []));
                    }}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {workbook.sheetNames.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="min-w-[180px] flex-1 space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">Cabeçalho na linha</Label>
                <Select value={String(headerRow)} onValueChange={(value) => setHeaderRow(Number(value))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {grid.slice(0, 10).map((row, index) => (
                      <SelectItem key={index} value={String(index)}>
                        Linha {index + 1}: {row.filter(Boolean).slice(0, 3).join(' · ').slice(0, 40)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <section>
            <h3 className="mb-1 text-sm font-semibold">Qual coluna é o quê?</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Já preenchemos sozinhos. Corrija se algo estiver errado; guardamos sua escolha para a próxima planilha igual.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{MAIN_FIELDS.map(renderField)}</div>
            <button
              type="button"
              onClick={() => setShowExtra((value) => !value)}
              className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showExtra ? 'rotate-180' : ''}`} />
              {showExtra ? 'Menos campos' : 'Mais campos (telefone, rastreio, parada, coordenadas...)'}
            </button>
            {showExtra && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{EXTRA_FIELDS.map(renderField)}</div>}
          </section>

          {!mapping.endereco ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Escolha qual coluna tem o endereço para continuar.
            </div>
          ) : (
            <section>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {counts.ok} prontas
                </span>
                {counts.aviso > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" /> {counts.aviso} com aviso
                  </span>
                )}
                {counts.erro > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                    <XCircle className="h-3.5 w-3.5" /> {counts.erro} serão ignoradas
                  </span>
                )}
                {counts.aviso + counts.erro > 0 && (
                  <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={onlyIssues} onCheckedChange={setOnlyIssues} />
                    Só problemas
                  </label>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border">
                <div className="max-h-[38dvh] overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-muted text-muted-foreground">
                      <tr>
                        <th className="w-12 px-3 py-2 font-medium">Linha</th>
                        <th className="px-3 py-2 font-medium">Endereço</th>
                        <th className="hidden px-3 py-2 font-medium sm:table-cell">Bairro / cidade</th>
                        <th className="hidden px-3 py-2 font-medium md:table-cell">CEP</th>
                        <th className="px-3 py-2 font-medium">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {visible.map((row) => (
                        <tr key={row.line} className={row.status === 'erro' ? 'bg-destructive/5' : ''}>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{row.line}</td>
                          <td className="max-w-[220px] truncate px-3 py-2 font-medium">
                            {row.delivery?.endereco || row.raw[mapping.endereco] || '—'}
                          </td>
                          <td className="hidden max-w-[160px] truncate px-3 py-2 text-muted-foreground sm:table-cell">
                            {[row.delivery?.bairro, row.delivery?.cidade].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td className="hidden px-3 py-2 font-mono text-muted-foreground md:table-cell">{row.delivery?.cep || '—'}</td>
                          <td className="px-3 py-2">
                            {row.status === 'ok' ? (
                              <CheckCircle2 className="h-4 w-4 text-success" aria-label="OK" />
                            ) : (
                              <span className={row.status === 'erro' ? 'text-destructive' : 'text-warning'}>
                                {row.messages.join(' · ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(onlyIssues ? counts.aviso + counts.erro : reviewed.length) > PREVIEW_LIMIT && (
                  <p className="border-t bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    Mostrando as primeiras {PREVIEW_LIMIT} linhas. Todas serão importadas.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:items-center">
          {counts.aviso + counts.erro > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="sm:mr-auto"
              onClick={() => downloadIssues(reviewed, headers, fileName)}
            >
              <Download className="mr-1.5 h-4 w-4" /> Baixar linhas com problema
            </Button>
          )}
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={importable === 0}>
            Importar {importable} entrega{importable === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportReviewDialog;
