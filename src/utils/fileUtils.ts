
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

    // Log para diagnóstico
    console.log("Dados importados:", data[0]);
    console.log("Cabeçalhos detectados:", Object.keys(data[0]));

    // Map headers to standardized fields
    const headers = Object.keys(data[0]);
    const fieldMapping = mapFields(headers);
    
    // Log para diagnóstico
    console.log("Mapeamento de campos:", fieldMapping);

    // Verificar se campos obrigatórios foram mapeados
    if (!fieldMapping.cliente && !fieldMapping.endereco) {
      // Tentar configuração de mapeamento direta
      if (headers.length >= 2) {
        // Usar as duas primeiras colunas como cliente e endereço
        fieldMapping.cliente = headers[0];
        fieldMapping.endereco = headers[1];
        console.log("Usando mapeamento direto:", fieldMapping);
      }
    }

    // Process each row
    data.forEach((row, index) => {
      try {
        // Log para diagnóstico da linha
        if (index === 0) {
          console.log("Processando linha 1:", row);
        }

        // Se o cliente não existe diretamente, tentar encontrar em outras propriedades
        if (!fieldMapping.cliente || !row[fieldMapping.cliente]) {
          // Encontrar primeira propriedade não vazia para usar como cliente
          for (const key of Object.keys(row)) {
            if (row[key] && typeof row[key] === 'string' && row[key].trim() !== '') {
              fieldMapping.cliente = key;
              console.log(`Usando coluna '${key}' como cliente para linha ${index + 1}`);
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
                console.log(`Usando coluna '${key}' como endereço para linha ${index + 1}`);
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
    cliente: ['cliente', 'nome', 'name', 'customer', 'razão social', 'razao social', 'razão', 'razao', 
              'empresa', 'company', 'destinatário', 'destinatario', 'pessoa', 'pessoa física', 'pessoa fisica',
              'contato', 'contact', 'cliente id', 'id cliente', 'identificação', 'identificacao'],
    endereco: ['endereco', 'endereço', 'address', 'logradouro', 'rua', 'avenida', 'av', 'travessa', 
               'local', 'location', 'destino', 'destination'],
    cidade: ['cidade', 'city', 'municipio', 'município', 'localidade', 'locale'],
    estado: ['estado', 'state', 'uf', 'província', 'provincia', 'region', 'região', 'regiao'],
    cep: ['cep', 'zip', 'zipcode', 'zip code', 'código postal', 'codigo postal', 'postal', 'postal code'],
    telefone: ['telefone', 'phone', 'tel', 'fone', 'celular', 'mobile', 'contato', 'whatsapp', 'numero'],
    observacoes: ['observacoes', 'observações', 'notes', 'obs', 'observacao', 'observação', 
                  'comentários', 'comentarios', 'descrição', 'descricao', 'description']
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

  return mapping;
};

const createDeliveryFromRow = (
  row: Record<string, any>,
  fieldMapping: Record<string, string>,
  rowIndex: number
): DeliveryItem => {
  // Verificação de campos obrigatórios
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
