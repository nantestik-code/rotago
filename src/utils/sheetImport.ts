import * as XLSX from 'xlsx';
import { DeliveryItem } from './deliveryUtils';
import { FIELD_SYNONYMS, createDeliveryFromRow, mapFields, normalizeHeader } from './fileUtils';

// Leitura e validação de planilhas para a tela de revisão da importação.

export type SheetGrid = string[][];

export interface Workbook {
  sheetNames: string[];
  sheets: Record<string, SheetGrid>;
}

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.txt', '.tsv'];

export const hasAcceptedExtension = (name: string) =>
  ACCEPTED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

const toGrid = (worksheet: XLSX.WorkSheet): SheetGrid =>
  // Mantém linhas em branco para o número da linha bater com o Excel
  (XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false, blankrows: true }) as unknown[][])
    .map((row) => row.map((cell) => (cell == null ? '' : String(cell).trim())));

const isBlank = (row: string[]) => row.every((cell) => cell === '');

// CSV exportado pelo Excel brasileiro costuma vir em Windows-1252; tenta UTF-8
// estrito primeiro e cai para 1252 se houver byte inválido.
const decodeText = (buffer: ArrayBuffer) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
};

const fromWorkbook = (wb: XLSX.WorkBook): Workbook => {
  const sheets: Record<string, SheetGrid> = {};
  const sheetNames = wb.SheetNames.filter((name) => {
    const grid = toGrid(wb.Sheets[name]);
    while (grid.length && isBlank(grid[grid.length - 1])) grid.pop();
    if (grid.every(isBlank)) return false;
    sheets[name] = grid;
    return true;
  });
  return { sheetNames, sheets };
};

export const readWorkbook = async (file: File): Promise<Workbook> => {
  const buffer = await file.arrayBuffer();
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return fromWorkbook(XLSX.read(buffer, { type: 'array', cellDates: false }));
  }
  return parseText(decodeText(buffer), file.name);
};

// Texto colado do Excel/Sheets (tabulação) ou CSV com ; ou ,
export const parseText = (text: string, name = 'Colado'): Workbook => {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? '';
  const counts = { '\t': 0, ';': 0, ',': 0 } as Record<string, number>;
  for (const ch of firstLine) if (ch in counts) counts[ch]++;
  const [topSeparator, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const FS = topCount > 0 ? topSeparator : ',';
  const wb = XLSX.read(text, { type: 'string', FS, raw: true });
  const result = fromWorkbook(wb);
  if (result.sheetNames.length === 1 && result.sheetNames[0] !== name) {
    result.sheets = { [name]: result.sheets[result.sheetNames[0]] };
    result.sheetNames = [name];
  }
  return result;
};

const KNOWN_WORDS = new Set(Object.values(FIELD_SYNONYMS).flat());

// A linha de cabeçalho é a que mais parece cabeçalho entre as 10 primeiras:
// muitas células de texto e palavras conhecidas (endereço, cep, bairro...)
export const detectHeaderRow = (grid: SheetGrid): number => {
  let best = 0;
  let bestScore = -1;
  grid.slice(0, 10).forEach((row, index) => {
    if (isBlank(row)) return;
    const textCells = row.filter((cell) => cell && !/^[\d\s.,/-]+$/.test(cell)).length;
    const known = row.filter((cell) => KNOWN_WORDS.has(normalizeHeader(cell))).length;
    const score = textCells + known * 4;
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
};

export const buildHeaders = (row: string[]): string[] => {
  const seen: Record<string, number> = {};
  return row.map((cell, index) => {
    const base = cell || `Coluna ${index + 1}`;
    seen[base] = (seen[base] ?? 0) + 1;
    return seen[base] > 1 ? `${base} (${seen[base]})` : base;
  });
};

export const gridToRows = (grid: SheetGrid, headerRow: number, headers: string[]) =>
  grid.slice(headerRow + 1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))
  );

// Mapeamento lembrado por "assinatura" de cabeçalhos, por navegador
const mappingKey = (headers: string[]) => `rotago-import-mapping:${headers.map(normalizeHeader).join('|')}`;

export const loadMapping = (headers: string[]): Record<string, string> => {
  try {
    const saved = localStorage.getItem(mappingKey(headers));
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, string>;
      // Só aceita colunas que ainda existem
      return Object.fromEntries(Object.entries(parsed).filter(([, header]) => headers.includes(header)));
    }
  } catch {
    // sem localStorage: segue com a detecção automática
  }
  return mapFields(headers);
};

export const saveMapping = (headers: string[], mapping: Record<string, string>) => {
  try {
    localStorage.setItem(mappingKey(headers), JSON.stringify(mapping));
  } catch {
    // ignora: é só conveniência
  }
};

export type RowStatus = 'ok' | 'aviso' | 'erro';

export interface ReviewedRow {
  line: number; // linha na planilha, como o usuário vê no Excel
  status: RowStatus;
  messages: string[];
  delivery?: DeliveryItem;
  raw: Record<string, string>;
}

const onlyDigits = (value: string) => value.replace(/\D/g, '');

export const reviewRows = (
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  headerRow: number
): ReviewedRow[] => {
  const firstSeen: Record<string, number> = {};

  const reviewed: ReviewedRow[] = [];
  rows.forEach((raw, index) => {
    if (Object.values(raw).every((value) => !value)) return;
    reviewed.push(reviewOne(raw, index));
  });
  return reviewed;

  function reviewOne(raw: Record<string, string>, index: number): ReviewedRow {
    const line = headerRow + index + 2;
    const messages: string[] = [];
    let delivery: DeliveryItem | undefined;

    try {
      delivery = createDeliveryFromRow(raw, mapping, index);
    } catch (error) {
      return {
        line,
        status: 'erro',
        messages: [error instanceof Error ? error.message : 'Linha inválida'],
        raw,
      };
    }

    if (mapping.cep) {
      const cep = onlyDigits(delivery.cep || '');
      if (!cep) messages.push('Sem CEP');
      else if (cep.length !== 8) messages.push(`CEP "${delivery.cep}" não tem 8 dígitos`);
      else delivery.cep = `${cep.slice(0, 5)}-${cep.slice(5)}`;
    }

    if ((mapping.latitude || mapping.longitude) && (delivery.lat == null || delivery.lng == null)) {
      const latRaw = raw[mapping.latitude] || '';
      const lngRaw = raw[mapping.longitude] || '';
      if (latRaw || lngRaw) messages.push('Coordenadas inválidas, vamos buscar pelo endereço');
    }

    if (!mapping.cidade && !mapping.cep && !/,\s*[^,]+\s*[-/]\s*[A-Za-z]{2}\b/.test(delivery.endereco)) {
      messages.push('Sem cidade nem CEP: a busca no mapa pode errar');
    }

    // Duplicada: mesmo endereço e mesmo cliente/rastreio de uma linha anterior
    const key = [normalizeHeader(delivery.endereco), normalizeHeader(delivery.cep || ''), delivery.trackingNumber || normalizeHeader(delivery.cliente)].join('|');
    if (firstSeen[key] != null) messages.push(`Repetida da linha ${firstSeen[key]}`);
    else firstSeen[key] = line;

    return { line, status: messages.length ? ('aviso' as const) : ('ok' as const), messages, delivery, raw };
  }
};

// Planilha com as linhas problemáticas e o motivo, para o usuário corrigir
export const downloadIssues = (reviewed: ReviewedRow[], headers: string[], baseName: string) => {
  const issues = reviewed.filter((row) => row.status !== 'ok');
  const data = issues.map((row) => ({
    Linha: row.line,
    Situação: row.status === 'erro' ? 'Ignorada' : 'Aviso',
    Motivo: row.messages.join('; '),
    ...Object.fromEntries(headers.map((header) => [header, row.raw[header] ?? ''])),
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Problemas');
  XLSX.writeFile(workbook, `${baseName.replace(/\.[^.]+$/, '')}_problemas.xlsx`);
};

export const downloadTemplate = () => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Cliente', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Cidade', 'UF', 'CEP', 'Telefone', 'Observações'],
    ['Maria Souza', 'Rua das Flores', '120', 'Apto 12', 'Centro', 'Campinas', 'SP', '13010-000', '(19) 99999-0000', 'Deixar na portaria'],
    ['Padaria Bom Dia', 'Av. Brasil', '1500', '', 'Jardim América', 'Campinas', 'SP', '13070-000', '', ''],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Entregas');
  XLSX.writeFile(workbook, 'modelo-rotago.xlsx');
};
