import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Mic, X, Navigation } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { MapPosition, getMapboxToken } from '@/utils/mapUtils';

interface AddressSearchProps {
  onAddressFound: (position: MapPosition, address: string) => void;
  currentLocation: MapPosition | null;
  isMobile: boolean;
}

const AddressSearch: React.FC<AddressSearchProps> = ({ 
  onAddressFound, 
  currentLocation,
  isMobile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    place_name: string;
    center: [number, number];
  }>>([]);
  const [showResults, setShowResults] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Inicializar reconhecimento de voz se disponível
  useEffect(() => {
    // Definir tipos para reconhecimento de voz
    interface IWindow extends Window {
      SpeechRecognition?: any;
      webkitSpeechRecognition?: any;
    }
    
    const windowWithSpeech = window as IWindow;
    
    if ('webkitSpeechRecognition' in windowWithSpeech || 'SpeechRecognition' in windowWithSpeech) {
      const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        handleSearch(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Erro de reconhecimento de voz:', event.error);
        setIsListening(false);
        toast({
          title: 'Erro de reconhecimento',
          description: 'Não foi possível reconhecer sua voz. Tente novamente.',
          variant: 'destructive',
        });
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);
  
  // Fechar resultados ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const startListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Recurso não suportado',
        description: 'Reconhecimento de voz não é suportado neste navegador.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Erro ao iniciar reconhecimento de voz:', error);
      setIsListening(false);
    }
  };
  
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setShowResults(true);
    
    try {
      const mapboxToken = getMapboxToken();
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=br&limit=5`
      );
      
      if (!response.ok) {
        throw new Error(`Erro na API de geocodificação: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        setSearchResults(data.features.map((feature: any) => ({
          place_name: feature.place_name,
          center: feature.center
        })));
      } else {
        setSearchResults([]);
        toast({
          title: 'Nenhum resultado encontrado',
          description: 'Tente um endereço mais específico.',
        });
      }
    } catch (error) {
      console.error('Erro na busca de endereço:', error);
      toast({
        title: 'Erro na busca',
        description: 'Não foi possível buscar o endereço. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleResultClick = (result: { place_name: string; center: [number, number] }) => {
    const [lng, lat] = result.center;
    onAddressFound({ lat, lng }, result.place_name);
    setSearchQuery(result.place_name);
    setShowResults(false);
  };
  
  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  
  // Referência para controlar notificações de navegação para localização atual
  const lastCurrentLocationNavRef = useRef<number>(0);
  
  const handleNavigateToCurrentLocation = () => {
    if (!currentLocation) {
      toast({
        title: 'Localização não disponível',
        description: 'Sua localização atual não está disponível.',
        variant: 'destructive',
      });
      return;
    }
    
    // Abrir navegação para a localização atual
    const { lat, lng } = currentLocation;
    
    // Detectar plataforma e abrir app apropriado
    const userAgent = navigator.userAgent || navigator.vendor;
    
    // iOS
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      window.open(`maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, '_blank');
    } 
    // Android
    else if (/android/i.test(userAgent)) {
      window.open(`geo:0,0?q=${lat},${lng}`, '_blank');
    } 
    // Fallback para Google Maps web
    else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
    
    // Mostrar notificação apenas uma vez a cada 30 segundos
    const now = Date.now();
    if (now - lastCurrentLocationNavRef.current > 30000) {
      lastCurrentLocationNavRef.current = now;
      toast({
        title: 'Navegando para sua localização atual',
        description: 'Abrindo aplicativo de navegação',
        duration: 3000,
      });
    }
  };
  
  return (
    <div className={`relative ${isMobile ? 'w-full' : 'w-72'}`} ref={searchInputRef}>
      <div className="flex gap-1">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Buscar endereço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pr-8"
          />
          {searchQuery && (
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <Button 
          size="icon" 
          variant="outline" 
          onClick={() => handleSearch()}
          disabled={isSearching || !searchQuery.trim()}
        >
          <Search size={16} />
        </Button>
        
        <Button 
          size="icon" 
          variant="outline" 
          onClick={startListening}
          disabled={isListening}
          className={isListening ? 'bg-red-100' : ''}
        >
          <Mic size={16} className={isListening ? 'text-red-500' : ''} />
        </Button>
        
        {currentLocation && (
          <Button 
            size="icon" 
            variant="outline" 
            onClick={handleNavigateToCurrentLocation}
            title="Navegar para minha localização atual"
          >
            <Navigation size={16} />
          </Button>
        )}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-1">
            {searchResults.map((result, index) => (
              <li 
                key={index} 
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => handleResultClick(result)}
              >
                {result.place_name}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {isListening && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg p-3 text-center">
          <div className="animate-pulse text-red-500 mb-1">
            <Mic size={24} className="mx-auto" />
          </div>
          <p className="text-sm">Ouvindo... Fale o endereço</p>
        </div>
      )}
    </div>
  );
};

export default AddressSearch;
