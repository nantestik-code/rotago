
import React from 'react';
import { Progress } from '@/components/ui/progress';
import FileImport from '@/components/FileImport';
import { DeliveryItem } from '@/utils/deliveryUtils';

interface ImportSectionProps {
  onImportComplete: (deliveries: DeliveryItem[]) => void;
  processingGeocode: boolean;
  geocodeProgress: number;
}

const ImportSection: React.FC<ImportSectionProps> = ({ 
  onImportComplete, 
  processingGeocode, 
  geocodeProgress 
}) => {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <FileImport onImportComplete={onImportComplete} />
      
      {processingGeocode && geocodeProgress > 0 && (
        <div className="my-4">
          <p className="text-sm mb-1">Convertendo endereços em coordenadas...</p>
          <Progress value={geocodeProgress} className="h-1" />
        </div>
      )}
    </div>
  );
};

export default ImportSection;
