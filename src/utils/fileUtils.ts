
import { DeliveryItem, generateId } from './deliveryUtils';
import * as XLSX from 'xlsx';

export const isStructuredRouteSheet = (headers: string[] = []): boolean => {
  const names = headers.map((header) => header.toLowerCase().trim());
  const hasSequence = names.some((header) => header === 'sequence' || header === 'sequencia' || header === 'sequência');
  const hasStop = names.some((header) => header === 'stop' || header === 'parada');
  const hasAddress = names.some((header) => header.includes('address') || header.includes('endere'));
  return hasSequence && hasStop && hasAddress;
};

const exactHeaderMap: Record<string, string> = {
  'at id': 'atId',
  'sequence': 'sequence',
  'stop': 'stop',
  'sequence stop': 'stop',
  'spx tn': 'tracking',
  'destination address': 'endereco',
  'address': 'endereco',
  'bairro': 'bairro',
  'city': 'cidade',
  'zipcode/postal code': 'cep',
  'zipcode': 'cep',
  'postal code': 'cep',
  'latitude': 'latitude',
  'longitude': 'longitude',
};

// Remove acentos e pontuação para comparar cabeçalhos
export const normalizeHeader = (value: string) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[º°]/g, 'o')
    .replace(/[^a-z0-9/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Sinônimos por campo, já normalizados. A comparação é por palavra inteira,
// então "tn" não casa com "atendimento" e "nome" não casa com "nome da rua".
export const FIELD_SYNONYMS: Record<string, string[]> = {
  endereco: ['endereco', 'endereco completo', 'endereco de entrega', 'address', 'destination address', 'logradouro', 'rua', 'street', 'end'],
  numero: ['numero', 'no', 'n', 'num', 'nro', 'number'],
  complemento: ['complemento', 'compl', 'apto', 'apartamento'],
  bairro: ['bairro', 'neighborhood', 'district'],
  cidade: ['cidade', 'city', 'municipio'],
  estado: ['estado', 'state', 'uf'],
  cep: ['cep', 'zipcode', 'zip code', 'zip', 'postal code', 'zipcode/postal code', 'codigo postal'],
  cliente: ['cliente', 'nome', 'nome do cliente', 'nome cliente', 'customer', 'destinatario', 'recebedor', 'razao social'],
  telefone: ['telefone', 'phone', 'celular', 'whatsapp', 'fone', 'contato', 'tel'],
  observacoes: ['observacoes', 'observacao', 'obs', 'notes', 'nota', 'referencia', 'ponto de referencia'],
  tracking: ['spx tn', 'tracking', 'tracking number', 'tn', 'rastreio', 'codigo de rastreio', 'pedido', 'numero do pedido'],
  atId: ['at id'],
  sequence: ['sequence', 'sequencia', 'pacote'],
  stop: ['stop', 'parada', 'sequence stop'],
  latitude: ['latitude', 'lat', 'geocode/latitude'],
  longitude: ['longitude', 'lng', 'lon', 'long', 'geocode/longitude'],
};

// Palavras que, se aparecerem, impedem o cabeçalho de ser "cliente"
const NOT_CLIENT = ['rua', 'logradouro', 'endereco', 'address', 'street', 'bairro', 'cidade'];

const headerMatches = (header: string, option: string) => {
  if (header === option) return 3;
  const words = header.split(' ');
  const optionWords = option.split(' ');
  // Sinônimo com várias palavras: precisa aparecer como sequência inteira
  if (optionWords.length > 1) return ` ${header} `.includes(` ${option} `) ? 2 : 0;
  // Sinônimos muito curtos (n, no, tn, end, lat...) só valem como palavra isolada no início
  if (option.length <= 3) return words[0] === option && words.length <= 2 ? 1 : 0;
  return words.includes(option) ? 1 : 0;
};

export const mapFields = (headers: string[]) => {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  headers.forEach((header) => {
    const exact = exactHeaderMap[header.toLowerCase().trim()];
    if (exact && !mapping[exact]) {
      mapping[exact] = header;
      used.add(header);
    }
  });

  // Para cada campo, pega o cabeçalho de maior pontuação ainda livre
  for (const [field, options] of Object.entries(FIELD_SYNONYMS)) {
    if (mapping[field]) continue;
    let best: { header: string; score: number } | null = null;
    for (const header of headers) {
      if (used.has(header)) continue;
      const normalized = normalizeHeader(header);
      if (field === 'cliente' && NOT_CLIENT.some((word) => normalized.includes(word))) continue;
      const score = Math.max(0, ...options.map((option) => headerMatches(normalized, option)));
      if (score > 0 && (!best || score > best.score)) best = { header, score };
    }
    if (best) {
      mapping[field] = best.header;
      used.add(best.header);
    }
  }

  return mapping;
};

// Aceita vírgula decimal e só devolve coordenadas plausíveis para o Brasil
export const parseCoordinates = (latRaw: string, lngRaw: string): { lat?: number; lng?: number } => {
  if (!latRaw || !lngRaw) return {};
  const lat = Number(latRaw.replace(',', '.'));
  const lng = Number(lngRaw.replace(',', '.'));
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -34 && lat <= 6 && lng >= -74.5 && lng <= -28;
  return valid ? { lat, lng } : {};
};

const readMapped = (row: Record<string, any>, key?: string) => {
  if (!key || row[key] === undefined || row[key] === null) return '';
  return String(row[key]).trim();
};

const streetTitle = (address: string) => {
  const [first] = address.split(',');
  return (first || address).trim();
};

export const createDeliveryFromRow = (
  row: Record<string, any>,
  fieldMapping: Record<string, string>,
  rowIndex: number
): DeliveryItem => {
  let enderecoValue = readMapped(row, fieldMapping.endereco);
  if (!enderecoValue) {
    throw new Error('Endereço vazio');
  }
  // Número em coluna separada: junta ao endereço se ainda não estiver lá
  const numeroValue = readMapped(row, fieldMapping.numero);
  const addressTokens = enderecoValue.split(/[\s,.-]+/);
  if (numeroValue && !addressTokens.includes(numeroValue)) {
    enderecoValue = `${enderecoValue}, ${numeroValue}`;
  }

  const trackingNumber = readMapped(row, fieldMapping.tracking);
  const atId = readMapped(row, fieldMapping.atId);
  let clienteValue = readMapped(row, fieldMapping.cliente);
  if (!clienteValue || /^AT\d/i.test(clienteValue)) {
    clienteValue = streetTitle(enderecoValue);
  }
  
  // ============================================================================
  // NUMERAÇÃO BLINDADA - NUNCA ALTERAR APÓS IMPORTAÇÃO
  // ============================================================================
  // Baseado na planilha do usuário:
  // - Sequence (coluna B): NÚMERO DO PACOTE (único para cada entrega: 1, 2, 3...)
  // - Stop (coluna C): NÚMERO DA PARADA (pode repetir - ex: parada 1 tem pacotes 1 e 2)
  //
  // MAPEAMENTO FINAL:
  // - sequence_number = Sequence = NÚMERO DO PACOTE (identificador único)
  // - orderNumber = Stop = NÚMERO DA PARADA (agrupamento por local)
  // ============================================================================
  
  // Valores padrão baseados na posição na planilha
  let sequenceNumber = rowIndex + 1; // Número do pacote
  let stopNumber = rowIndex + 1;     // Número da parada
  
  // 1. LER SEQUENCE (Número do Pacote) - OBRIGATÓRIO
  // Tentar múltiplas formas de encontrar a coluna Sequence
  const sequenceFields = ['Sequence', 'sequence', 'SEQUENCE', fieldMapping.sequence].filter(Boolean);
  for (const field of sequenceFields) {
    if (field && row[field] !== undefined && row[field] !== null && row[field] !== '') {
      const value = parseInt(String(row[field]).trim());
      if (!isNaN(value) && value > 0) {
        sequenceNumber = value;
        break;
      }
    }
  }
  
  // 2. LER STOP (Número da Parada) - OBRIGATÓRIO
  // Tentar múltiplas formas de encontrar a coluna Stop
  const stopFields = ['Stop', 'stop', 'STOP', fieldMapping.stop].filter(Boolean);
  for (const field of stopFields) {
    if (field && row[field] !== undefined && row[field] !== null && row[field] !== '') {
      const value = parseInt(String(row[field]).trim());
      if (!isNaN(value) && value > 0) {
        stopNumber = value;
        break;
      }
    }
  }
  
  // Se não encontrou Stop, usar Sequence como fallback
  if (stopNumber === rowIndex + 1 && sequenceNumber !== rowIndex + 1) {
    stopNumber = sequenceNumber;
  }
  
  // ID único que NUNCA muda
  const deliveryId = `pkg-${sequenceNumber}-stop-${stopNumber}-${generateId()}`;

  return {
    id: deliveryId,
    orderNumber: stopNumber, // Stop = Número da PARADA (pode repetir)
    sequence_number: sequenceNumber, // Sequence = Número do PACOTE (único)
    cliente: clienteValue,
    endereco: enderecoValue,
    cidade: readMapped(row, fieldMapping.cidade),
    estado: readMapped(row, fieldMapping.estado),
    cep: readMapped(row, fieldMapping.cep),
    telefone: readMapped(row, fieldMapping.telefone),
    observacoes: [
      readMapped(row, fieldMapping.complemento) && `Compl.: ${readMapped(row, fieldMapping.complemento)}`,
      readMapped(row, fieldMapping.observacoes),
    ].filter(Boolean).join(' · '),
    numero: numeroValue || undefined,
    complemento: readMapped(row, fieldMapping.complemento) || undefined,
    trackingNumber,
    atId,
    bairro: readMapped(row, fieldMapping.bairro),
    // Latitude/Longitude, se informados na planilha
    ...parseCoordinates(readMapped(row, fieldMapping.latitude), readMapped(row, fieldMapping.longitude)),
    status: 'pendente',
  };
};

export const exportToCSV = (deliveries: DeliveryItem[]): void => {
  const worksheet = XLSX.utils.json_to_sheet(deliveries);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Entregas');
  
  XLSX.writeFile(workbook, `RotaGo_Exportacao_${new Date().toISOString().split('T')[0]}.xlsx`);
};
