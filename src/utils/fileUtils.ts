
import { DeliveryItem, generateId } from './deliveryUtils';
import * as XLSX from 'xlsx';

export interface ProcessedFile {
  deliveries: DeliveryItem[];
  errors?: string[];
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

    // Process each row
    data.forEach((row, index) => {
      try {
        const delivery = createDeliveryFromRow(row, fieldMapping, index);
        deliveries.push(delivery);
      } catch (error) {
        errors.push(`Erro na linha ${index + 1}: ${error instanceof Error ? error.message : 'Formato inválido'}`);
      }
    });

    return { deliveries, errors: errors.length > 0 ? errors : undefined };
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

const mapFields = (headers: string[]) => {
  const mapping: Record<string, string> = {};
  const fieldOptions = {
    cliente: ['cliente', 'nome', 'name', 'customer', 'razão social', 'razao social'],
    endereco: ['endereco', 'endereço', 'address', 'logradouro', 'rua'],
    cidade: ['cidade', 'city', 'municipio', 'município'],
    estado: ['estado', 'state', 'uf'],
    cep: ['cep', 'zip', 'zipcode', 'zip code', 'código postal', 'codigo postal'],
    telefone: ['telefone', 'phone', 'tel', 'fone', 'celular'],
    observacoes: ['observacoes', 'observações', 'notes', 'obs', 'observacao', 'observação', 'comentários', 'comentarios']
  };

  // Match each header with the most likely field
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    
    for (const [field, options] of Object.entries(fieldOptions)) {
      if (options.some(option => lowerHeader.includes(option))) {
        mapping[field] = header;
        break;
      }
    }
  });

  return mapping;
};

const createDeliveryFromRow = (
  row: Record<string, any>,
  fieldMapping: Record<string, string>,
  rowIndex: number
): DeliveryItem => {
  // Check for required fields
  if (!fieldMapping.cliente || !row[fieldMapping.cliente]) {
    throw new Error('Campo cliente é obrigatório');
  }
  
  if (!fieldMapping.endereco || !row[fieldMapping.endereco]) {
    throw new Error('Campo endereço é obrigatório');
  }

  return {
    id: generateId(),
    cliente: row[fieldMapping.cliente] || '',
    endereco: row[fieldMapping.endereco] || '',
    cidade: fieldMapping.cidade && row[fieldMapping.cidade] ? row[fieldMapping.cidade] : '',
    estado: fieldMapping.estado && row[fieldMapping.estado] ? row[fieldMapping.estado] : '',
    cep: fieldMapping.cep && row[fieldMapping.cep] ? row[fieldMapping.cep].toString() : '',
    telefone: fieldMapping.telefone && row[fieldMapping.telefone] ? row[fieldMapping.telefone].toString() : '',
    observacoes: fieldMapping.observacoes && row[fieldMapping.observacoes] ? row[fieldMapping.observacoes] : '',
    status: 'pendente',
  };
};

export const exportToCSV = (deliveries: DeliveryItem[]): void => {
  const worksheet = XLSX.utils.json_to_sheet(deliveries);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Entregas');
  
  XLSX.writeFile(workbook, `RotaFacil_Exportacao_${new Date().toISOString().split('T')[0]}.xlsx`);
};
