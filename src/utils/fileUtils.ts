
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
    console.log('📊 Headers encontrados na planilha:', headers);
    const fieldMapping = mapFields(headers);
    console.log('🗺️ Mapeamento de campos:', fieldMapping);
    


    // Verificar se campos obrigatórios foram mapeados
    if (!fieldMapping.cliente && !fieldMapping.endereco) {
      // Tentar configuração de mapeamento direta
      if (headers.length >= 2) {
        // Usar as duas primeiras colunas como cliente e endereço
        fieldMapping.cliente = headers[0];
        fieldMapping.endereco = headers[1];

      }
    }

    // Process each row
    data.forEach((row, index) => {
      try {


        // Se o cliente não existe diretamente, tentar encontrar em outras propriedades
        if (!fieldMapping.cliente || !row[fieldMapping.cliente]) {
          // Encontrar primeira propriedade não vazia para usar como cliente
          for (const key of Object.keys(row)) {
            if (row[key] && typeof row[key] === 'string' && row[key].trim() !== '') {
              fieldMapping.cliente = key;

              break;
            }
          }
        }

        // Se endereço não existe, usar segunda propriedade não vazia
        if (!fieldMapping.endereco || !row[fieldMapping.endereco]) {
          let clienteFound = false;
          for (const key of Object.keys(row)) {
            if (clienteFound) {
              // Essa é a segunda propriedade
              if (row[key] && typeof row[key] === 'string' && row[key].trim() !== '') {
                fieldMapping.endereco = key;

                break;
              }
            }
            
            // Marca quando encontramos a coluna de cliente
            if (fieldMapping.cliente === key) {
              clienteFound = true;
            }
          }
        }

        const delivery = createDeliveryFromRow(row, fieldMapping, index);
        console.log(`📦 Entrega ${index + 1} criada:`, {
          id: delivery.id,
          cliente: delivery.cliente,
          endereco: delivery.endereco,
          bairro: delivery.bairro,
          sequence_number: delivery.sequence_number,
          orderNumber: delivery.orderNumber
        });
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

export const mapFields = (headers: string[]) => {
  const mapping: Record<string, string> = {};
  const fieldOptions = {
    cliente: ['cliente', 'nome', 'name', 'customer', 'razão social', 'razao social', 'razão', 'razao', 
              'empresa', 'company', 'destinatário', 'destinatario', 'pessoa', 'pessoa física', 'pessoa fisica',
              'contato', 'contact', 'cliente id', 'id cliente', 'identificação', 'identificacao', 'at id'],
    endereco: ['endereco', 'endereço', 'address', 'logradouro', 'rua', 'avenida', 'av', 'travessa', 
               'local', 'location', 'destino', 'destination', 'destination address'],
    cidade: ['cidade', 'city', 'municipio', 'município', 'localidade', 'locale'],
    estado: ['estado', 'state', 'uf', 'província', 'provincia', 'region', 'região', 'regiao'],
    cep: ['cep', 'zip', 'zipcode', 'zip code', 'código postal', 'codigo postal', 'postal', 'postal code', 'zipcode/postal code'],
    telefone: ['telefone', 'phone', 'tel', 'fone', 'celular', 'mobile', 'contato', 'whatsapp', 'numero', 'spx tn'],
    observacoes: ['observacoes', 'observações', 'notes', 'obs', 'observacao', 'observação', 
                  'comentários', 'comentarios', 'descrição', 'descricao', 'description'],
    // Sequence (ordem) - incluindo variações específicas da planilha
    sequence: ['sequence', 'sequencia', 'sequência', 'seq', 'sequence stop', 'ordem', 'order'],
    // Stop (parada) - incluindo variações específicas da planilha
    stop: ['stop', 'parada', 'stp', 'sequence stop'],
    // Order synonyms (fallback)
    order: ['ordem', 'order', 'numero', 'número'],
    bairro: ['bairro', 'neighborhood', 'district', 'zona', 'area'],
    // Coordenadas
    latitude: ['latitude', 'lat', 'geocode/latitude', 'latitude/longitude'],
    longitude: ['longitude', 'lng', 'lon', 'geocode/longitude', 'longitude']
  };

  // Converte todos os cabeçalhos para minúsculo para comparação
  const lowerHeaders = headers.map(h => h.toLowerCase());

  // Match each header with the most likely field
  lowerHeaders.forEach((lowerHeader, index) => {
    const originalHeader = headers[index];
    
    for (const [field, options] of Object.entries(fieldOptions)) {
      if (options.some(option => lowerHeader.includes(option))) {
        mapping[field] = originalHeader;
        break;
      }
    }
  });

  // Mapeamento específico para colunas conhecidas da planilha Gabriela Tapia
  headers.forEach((header, index) => {
    const lowerHeader = header.toLowerCase();
    
    // Mapeamentos específicos baseados na planilha fornecida
    if (lowerHeader === 'at id') {
      mapping['cliente'] = header;
    } else if (lowerHeader === 'sequence') {
      // Sequence = ordem/sequência da entrega
      mapping['sequence'] = header;
    } else if (lowerHeader === 'stop') {
      // Stop = número da parada
      mapping['stop'] = header;
    } else if (lowerHeader === 'sequence stop') {
      // Fallback para planilhas antigas que usam "Sequence Stop"
      mapping['sequence'] = header;
      mapping['stop'] = header;
    } else if (lowerHeader === 'spx tn') {
      mapping['telefone'] = header;
    } else if (lowerHeader === 'destination address') {
      mapping['endereco'] = header;
    } else if (lowerHeader === 'bairro') {
      mapping['bairro'] = header;
    } else if (lowerHeader === 'city') {
      mapping['cidade'] = header;
    } else if (lowerHeader === 'geocode/latitude') {
      mapping['latitude'] = header;
    } else if (lowerHeader === 'longitude') {
      mapping['longitude'] = header;
    }
  });

  return mapping;
};

export const createDeliveryFromRow = (
  row: Record<string, any>,
  fieldMapping: Record<string, string>,
  rowIndex: number
): DeliveryItem => {
  // Resolução robusta de campos obrigatórios com fallback
  // Cliente
  let clienteValue: string = '';
  if (fieldMapping.cliente && row[fieldMapping.cliente]) {
    clienteValue = String(row[fieldMapping.cliente]).trim();
  }
  if (!clienteValue) {
    // Tentar encontrar AT ID ou similar
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('at id') || lowerKey.includes('cliente') || lowerKey.includes('nome')) {
        const v = row[key];
        if (v && String(v).trim() !== '') {
          clienteValue = String(v).trim();
          break;
        }
      }
    }
  }
  if (!clienteValue) {
    // Fallback: usar primeira coluna não vazia
    for (const key of Object.keys(row)) {
      const v = row[key];
      if (v && String(v).trim() !== '') {
        clienteValue = String(v).trim();
        break;
      }
    }
  }
  if (!clienteValue) {
    throw new Error('Campo cliente é obrigatório');
  }
  // Endereço
  let enderecoValue: string = '';
  if (fieldMapping.endereco && row[fieldMapping.endereco]) {
    enderecoValue = String(row[fieldMapping.endereco]).trim();
  }
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
  
  // Sequence (ordem da entrega) -> sequence_number no app (para ordenação)
  // Este é o número que define a ordem de execução das entregas
  let sequenceNumber = rowIndex + 1;
  if (fieldMapping.sequence && row[fieldMapping.sequence]) {
    const sequenceValue = parseInt(String(row[fieldMapping.sequence]).trim());
    if (!isNaN(sequenceValue)) {
      sequenceNumber = sequenceValue;
    }
  }
  
  // Stop (número da parada) -> orderNumber no app (para exibição como "Parada X")
  // Este é o número que aparece na interface como identificação da parada
  let orderNumber = rowIndex + 1;
  if (fieldMapping.stop && row[fieldMapping.stop]) {
    const stopValue = parseInt(String(row[fieldMapping.stop]).trim());
    if (!isNaN(stopValue)) {
      orderNumber = stopValue;
    }
  } else if (fieldMapping.sequence && row[fieldMapping.sequence]) {
    // Se não há campo Stop, usar Sequence também para orderNumber
    const sequenceValue = parseInt(String(row[fieldMapping.sequence]).trim());
    if (!isNaN(sequenceValue)) {
      orderNumber = sequenceValue;
    }
  } else if (fieldMapping.order && row[fieldMapping.order]) {
    const parsed = parseInt(String(row[fieldMapping.order]).trim());
    if (!isNaN(parsed)) {
      orderNumber = parsed;
    }
  }
  
  // Se sequence_number não foi definido mas temos orderNumber, usar orderNumber
  if (sequenceNumber === rowIndex + 1 && orderNumber !== rowIndex + 1) {
    sequenceNumber = orderNumber;
  }
  
  // Criar um ID que inclui o número da ordem para facilitar a identificação
  const orderId = `ordem-${orderNumber}-${generateId()}`;
  
  // Debug log para verificar a correção
  console.log(`📦 Entrega ${rowIndex + 1} criada:`, {
    id: orderId,
    cliente: clienteValue,
    endereco: enderecoValue,
    bairro: fieldMapping.bairro && row[fieldMapping.bairro] ? String(row[fieldMapping.bairro]).trim() : '',
    sequence_number: sequenceNumber,
    orderNumber: orderNumber,
    sequence_raw: fieldMapping.sequence && row[fieldMapping.sequence] ? row[fieldMapping.sequence] : 'N/A',
    stop_raw: fieldMapping.stop && row[fieldMapping.stop] ? row[fieldMapping.stop] : 'N/A'
  });

  return {
    id: orderId,
    orderNumber: orderNumber, // Número da linha na planilha
    sequence_number: sequenceNumber, // Número da sequência para ordenação
    cliente: clienteValue,
    endereco: enderecoValue,
    cidade: fieldMapping.cidade && row[fieldMapping.cidade] ? row[fieldMapping.cidade] : '',
    estado: fieldMapping.estado && row[fieldMapping.estado] ? row[fieldMapping.estado] : '',
    cep: fieldMapping.cep && row[fieldMapping.cep] ? row[fieldMapping.cep].toString() : '',
    telefone: fieldMapping.telefone && row[fieldMapping.telefone] ? row[fieldMapping.telefone].toString() : '',
    observacoes: fieldMapping.observacoes && row[fieldMapping.observacoes] ? row[fieldMapping.observacoes] : '',
    bairro: fieldMapping.bairro && row[fieldMapping.bairro] ? String(row[fieldMapping.bairro]).trim() : '',
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
