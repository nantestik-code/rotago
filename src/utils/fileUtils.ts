
import { DeliveryItem, generateId } from './deliveryUtils';
import * as XLSX from 'xlsx';

export interface ProcessedFile {
  deliveries: DeliveryItem[];
  errors?: string[];
  // Novos campos opcionais para permitir mapeamento manual pelo usuário
  headers?: string[];
  rawRows?: any[];
}

export const processFile = async (file: File): Promise<ProcessedFile> => {
  const deliveries: DeliveryItem[] = [];
  const errors: string[] = [];

  try {
    const data = await readFile(file);
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      errors.push('Nenhum dado encontrado no arquivo.');
      return { deliveries, errors };
    }



    // Map headers to standardized fields
    const headers = Object.keys(data[0]);
    const fieldMapping = mapFields(headers);
    


    // Verificar se campos obrigatórios foram mapeados
    if (!fieldMapping.cliente && !fieldMapping.endereco) {
      // Tentar configuração de mapeamento direta
      if (headers.length >= 2) {
        // Usar as duas primeiras colunas como cliente e endereço
        fieldMapping.cliente = headers[0];
        fieldMapping.endereco = headers[1];

      }
    }

    data.forEach((row, index) => {
      try {
        const delivery = createDeliveryFromRow(row, fieldMapping, index);
        deliveries.push(delivery);
      } catch (error) {
        errors.push(`Erro na linha ${index + 1}: ${error instanceof Error ? error.message : 'Formato inválido'}`);
      }
    });

    return { 
      deliveries, 
      errors: errors.length > 0 ? errors : undefined,
      headers,
      rawRows: data
    };
  } catch (error) {
    errors.push(`Erro ao processar o arquivo: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    return { deliveries, errors };
  }
};

const readFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        
        if (!data) {
          reject(new Error('Falha ao ler o arquivo.'));
          return;
        }
        
        let parsedData: any[] = [];
        
        if (file.name.endsWith('.csv')) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet);
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet);
        } else {
          reject(new Error('Formato de arquivo não suportado.'));
        }
        
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo.'));
    };
    
    reader.readAsBinaryString(file);
  });
};

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

export const mapFields = (headers: string[]) => {
  const mapping: Record<string, string> = {};
  const fieldOptions = {
    cliente: ['cliente', 'nome', 'customer', 'destinatário', 'destinatario', 'razão social', 'razao social'],
    endereco: ['endereco', 'endereço', 'address', 'logradouro', 'destination address'],
    cidade: ['cidade', 'city', 'municipio', 'município'],
    estado: ['estado', 'state', 'uf'],
    cep: ['cep', 'zipcode', 'zip code', 'postal code', 'código postal', 'codigo postal'],
    telefone: ['telefone', 'phone', 'celular', 'whatsapp', 'fone'],
    tracking: ['spx tn', 'tracking', 'tracking number', 'tn'],
    atId: ['at id'],
    observacoes: ['observacoes', 'observações', 'notes', 'obs', 'complemento'],
    sequence: ['sequence', 'sequencia', 'sequência'],
    stop: ['stop', 'parada'],
    bairro: ['bairro', 'neighborhood'],
    latitude: ['latitude', 'geocode/latitude'],
    longitude: ['longitude', 'geocode/longitude'],
  };

  headers.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim();
    if (exactHeaderMap[lowerHeader]) {
      mapping[exactHeaderMap[lowerHeader]] = header;
    }
  });

  headers.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim();
    if (Object.values(mapping).includes(header)) return;

    for (const [field, options] of Object.entries(fieldOptions)) {
      if (mapping[field]) continue;
      if (options.some((option) => lowerHeader === option || lowerHeader.includes(option))) {
        mapping[field] = header;
        break;
      }
    }
  });

  return mapping;
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
    // tentar detectar coluna de endereço por heurística
    const addrHints = ['address', 'endereco', 'endereço', 'logradouro', 'rua', 'street', 'destination'];
    for (const key of Object.keys(row)) {
      const lower = key.toLowerCase();
      if (addrHints.some(h => lower.includes(h))) {
        const v = row[key];
        if (typeof v === 'string' && v.trim() !== '') {
          enderecoValue = v.trim();
          break;
        }
      }
    }
  }
  if (!enderecoValue) {
    throw new Error('Campo endereço é obrigatório');
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
    observacoes: readMapped(row, fieldMapping.observacoes),
    trackingNumber,
    atId,
    bairro: readMapped(row, fieldMapping.bairro),
    // Latitude/Longitude, se informados na planilha
    lat: fieldMapping.latitude && row[fieldMapping.latitude] ? Number(row[fieldMapping.latitude]) : undefined,
    lng: fieldMapping.longitude && row[fieldMapping.longitude] ? Number(row[fieldMapping.longitude]) : undefined,
    status: 'pendente',
  };
};

export const exportToCSV = (deliveries: DeliveryItem[]): void => {
  const worksheet = XLSX.utils.json_to_sheet(deliveries);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Entregas');
  
  XLSX.writeFile(workbook, `RotaFacil_Exportacao_${new Date().toISOString().split('T')[0]}.xlsx`);
};
