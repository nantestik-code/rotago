
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import DeliveryList from '@/components/DeliveryList';
import DeliveryMap from '@/components/DeliveryMap';
import StatusCounter from '@/components/StatusCounter';
import { DeliveryItem } from '@/utils/deliveryUtils';
import { MapPosition, calculateDistance } from '@/utils/mapUtils';
import { ArrowLeft, FileUp, Check, AlertTriangle, Clock } from 'lucide-react';
import StopCard from '@/components/StopCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface RouteViewSectionProps {
  deliveries: DeliveryItem[];
  selectedDeliveryId: string | null;
  onSelectDelivery: (id: string) => void;
  onStatusChange: (id: string, status: 'pendente' | 'entregue' | 'ocorrencia', onDeliveryCompleted?: (nextDeliveryId: string | null) => void) => void;
  currentLocation: MapPosition | null;
  isTrackingActive: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onOptimizeRoute: () => void;
  statusCounts: {
    pendente: number;
    entregue: number;
    ocorrencia: number;
    total: number;
  };
  processingGeocode: boolean;
  geocodeProgress: number;
  processingOptimization: boolean;
  isMobile: boolean;
  onBackToImport?: () => void;
  onFinishRoute?: () => void;
}

const RouteViewSection: React.FC<RouteViewSectionProps> = ({
  deliveries,
  selectedDeliveryId,
  onSelectDelivery,
  onStatusChange,
  currentLocation,
  isTrackingActive,
  onStartTracking,
  onStopTracking,
  onOptimizeRoute,
  statusCounts,
  processingGeocode,
  geocodeProgress,
  processingOptimization,
  isMobile,
  onBackToImport,
  onFinishRoute
}) => {
  // Estado compartilhado para controlar a aba ativa em ambos os layouts (mobile e desktop)
  const [activeTab, setActiveTab] = useState<'pendente' | 'entregue' | 'ocorrencia'>('pendente');

  // Bottom sheet mobile: 'minimized' | 'half' | 'full'
  // Inicial: minimizado (só a barra visível). Clicar expande para 'half'. Arrastar para 'full'.
  const SHEET_HANDLE_HEIGHT = 56;
  const [sheetHeight, setSheetHeight] = useState(SHEET_HANDLE_HEIGHT);
  const [sheetPosition, setSheetPosition] = useState<'minimized' | 'half' | 'full'>('minimized');
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const sheetHeightRef = useRef(SHEET_HANDLE_HEIGHT);
  const dragState = useRef({
    dragging: false,
    startY: 0,
    startHeight: SHEET_HANDLE_HEIGHT,
    currentY: 0,
    moved: false,
    pointerId: null as number | null,
  });
  const ignoreNextHandleClickRef = useRef(false);
  const sheetHeightInitializedRef = useRef(false);

  const getSheetBounds = useCallback(() => {
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const minHeight = SHEET_HANDLE_HEIGHT;
    const maxHeight = Math.min(Math.max(Math.round(viewportHeight * 0.88), 360), viewportHeight - 12);
    const initialHeight = Math.min(
      Math.max(Math.round(viewportHeight * 0.42), 260),
      maxHeight
    );

    return { minHeight, initialHeight, maxHeight };
  }, []);

  const clampSheetHeight = useCallback((height: number) => {
    const { minHeight, maxHeight } = getSheetBounds();
    return Math.min(Math.max(height, minHeight), maxHeight);
  }, [getSheetBounds]);

  useEffect(() => {
    sheetHeightRef.current = sheetHeight;
    const { minHeight, maxHeight } = getSheetBounds();
    const nextSheetPosition =
      sheetHeight <= minHeight + 12
        ? 'minimized'
        : sheetHeight >= maxHeight - 12
        ? 'full'
        : 'half';

    setSheetPosition(currentPosition =>
      currentPosition === nextSheetPosition ? currentPosition : nextSheetPosition
    );
  }, [getSheetBounds, sheetHeight]);

  // Registrar touch events com {passive: false} para poder chamar preventDefault
  useEffect(() => {
    return;
    const handle = dragHandleRef.current;
    const sheet = sheetRef.current;
    if (!handle || !sheet) return;

    const onTouchStart = (e: TouchEvent) => {
      dragState.current = { dragging: true, startY: e.touches[0].clientY, currentY: 0 };
      sheet.style.transition = 'none';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragState.current.dragging) return;
      e.preventDefault();
      const delta = e.touches[0].clientY - dragState.current.startY;
      dragState.current.currentY = delta;
      // Aplicar transform visual durante o drag (limitado para não sair da tela)
      const clamp = Math.max(-window.innerHeight * 0.5, Math.min(delta, window.innerHeight * 0.5));
      sheet.style.transform = `translateY(${clamp}px)`;
    };

    const onTouchEnd = () => {
      if (!dragState.current.dragging) return;
      dragState.current.dragging = false;
      sheet.style.transition = '';
      sheet.style.transform = '';
      const delta = dragState.current.currentY;
      const threshold = 50;
      if (delta < -threshold) {
        // Arrastar para cima: minimized→half→full
        setSheetPosition(prev =>
          prev === 'minimized' ? 'half' : prev === 'half' ? 'full' : 'full'
        );
      } else if (delta > threshold) {
        // Arrastar para baixo: full→half→minimized
        setSheetPosition(prev =>
          prev === 'full' ? 'half' : 'minimized'
        );
      }
    };

    handle.addEventListener('touchstart', onTouchStart, { passive: true });
    handle.addEventListener('touchmove', onTouchMove, { passive: false });
    handle.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      handle.removeEventListener('touchstart', onTouchStart);
      handle.removeEventListener('touchmove', onTouchMove);
      handle.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;

    const syncSheetBounds = () => {
      const { minHeight, maxHeight } = getSheetBounds();

      setSheetHeight(currentHeight => {
        if (!sheetHeightInitializedRef.current) {
          sheetHeightInitializedRef.current = true;
          return minHeight;
        }

        if (currentHeight <= minHeight + 12) {
          return minHeight;
        }

        return Math.min(Math.max(currentHeight, minHeight), maxHeight);
      });
    };

    syncSheetBounds();
    window.addEventListener('resize', syncSheetBounds);

    return () => {
      window.removeEventListener('resize', syncSheetBounds);
    };
  }, [getSheetBounds, isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const handle = dragHandleRef.current;
    const sheet = sheetRef.current;
    if (!handle || !sheet) return;

    const finishDrag = (pointerId?: number) => {
      if (!dragState.current.dragging) return;

      dragState.current.dragging = false;
      dragState.current.pointerId = null;
      sheet.style.transition = '';
      document.body.style.userSelect = '';

      if (pointerId != null) {
        handle.releasePointerCapture?.(pointerId);
      }

      const { minHeight } = getSheetBounds();
      setSheetHeight(currentHeight => currentHeight <= minHeight + 24 ? minHeight : clampSheetHeight(currentHeight));
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      dragState.current = {
        dragging: true,
        startY: event.clientY,
        startHeight: sheetHeightRef.current,
        currentY: 0,
        moved: false,
        pointerId: event.pointerId,
      };

      sheet.style.transition = 'none';
      document.body.style.userSelect = 'none';
      handle.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragState.current.dragging) return;
      if (dragState.current.pointerId != null && event.pointerId !== dragState.current.pointerId) return;

      event.preventDefault();

      const deltaY = dragState.current.startY - event.clientY;
      if (Math.abs(deltaY) > 4) {
        dragState.current.moved = true;
        ignoreNextHandleClickRef.current = true;
      }

      dragState.current.currentY = deltaY;
      setSheetHeight(clampSheetHeight(dragState.current.startHeight + deltaY));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (dragState.current.pointerId != null && event.pointerId !== dragState.current.pointerId) return;
      finishDrag(event.pointerId);
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (dragState.current.pointerId != null && event.pointerId !== dragState.current.pointerId) return;
      finishDrag(event.pointerId);
    };

    handle.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    return () => {
      document.body.style.userSelect = '';
      handle.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [clampSheetHeight, getSheetBounds, isMobile]);

  const [showOcorrenciaDialog, setShowOcorrenciaDialog] = useState(false);
  const [ocorrenciaText, setOcorrenciaText] = useState('');
  const [currentDeliveryId, setCurrentDeliveryId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentDeliveryIndex, setCurrentDeliveryIndex] = useState(0);
  const pendingGroupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const deliveredRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const occurrenceRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sheetBounds = isMobile ? getSheetBounds() : {
    minHeight: SHEET_HANDLE_HEIGHT,
    initialHeight: SHEET_HANDLE_HEIGHT,
    maxHeight: SHEET_HANDLE_HEIGHT,
  };
  const isSheetExpanded = sheetHeight > sheetBounds.minHeight + 12;

  const handleSheetHandleClick = useCallback(() => {
    if (ignoreNextHandleClickRef.current) {
      ignoreNextHandleClickRef.current = false;
      return;
    }

    if (sheetHeight <= sheetBounds.minHeight + 8) {
      setSheetHeight(sheetBounds.initialHeight);
      return;
    }

    if (sheetHeight >= sheetBounds.maxHeight - 8) {
      setSheetHeight(sheetBounds.initialHeight);
      return;
    }

    setSheetHeight(sheetBounds.maxHeight);
  }, [sheetBounds.initialHeight, sheetBounds.maxHeight, sheetBounds.minHeight, sheetHeight]);

  useEffect(() => {
    if (!currentLocation || selectedDeliveryId) return;
    const pendings = deliveries.filter(d => d.status === 'pendente' && d.lat && d.lng);
    if (pendings.length === 0) return;
    let nearest = pendings[0];
    let best = calculateDistance(currentLocation.lat, currentLocation.lng, nearest.lat!, nearest.lng!);
    for (let i = 1; i < pendings.length; i++) {
      const d = pendings[i];
      const dist = calculateDistance(currentLocation.lat, currentLocation.lng, d.lat!, d.lng!);
      if (dist < best) {
        best = dist;
        nearest = d;
      }
    }
    onSelectDelivery(nearest.id);
    setActiveTab('pendente');
  }, [currentLocation, deliveries, selectedDeliveryId]);

  useEffect(() => {
    if (!selectedDeliveryId) return;
    const sel = deliveries.find(d => d.id === selectedDeliveryId);
    if (!sel) return;
    const status = sel.status as 'pendente' | 'entregue' | 'ocorrencia';
    if (status !== activeTab) setActiveTab(status);
  }, [selectedDeliveryId, deliveries]);

  // Verificar se a rota foi otimizada (qualquer entrega com optimizedOrder, independente do status)
  const isRouteOptimized = useMemo(() =>
    deliveries.some(d => d.optimizedOrder != null),
  [deliveries]);

  // Filtrar e ordenar pendentes:
  // - Se otimizado: usar optimizedOrder (ordem geográfica nearest-neighbor)
  // - Se não otimizado: usar sequence_number da planilha
  const pendingDeliveries = useMemo(() => {
    return deliveries
      .filter(d => d.status === 'pendente')
      .slice()
      .sort((a, b) => {
        if (isRouteOptimized) {
          const oa = a.optimizedOrder ?? 999999;
          const ob = b.optimizedOrder ?? 999999;
          return oa - ob;
        }
        const seqA = a.sequence_number != null && Number(a.sequence_number) > 0 ? Number(a.sequence_number) : 999999;
        const seqB = b.sequence_number != null && Number(b.sequence_number) > 0 ? Number(b.sequence_number) : 999999;
        return seqA - seqB;
      });
  }, [deliveries, isRouteOptimized]);
  const deliveredDeliveries = useMemo(() =>
    deliveries
      .filter(d => d.status === 'entregue')
      .slice()
      .sort((a, b) => {
        const seqA = a.sequence_number != null && Number(a.sequence_number) > 0 ? Number(a.sequence_number) : 999999;
        const seqB = b.sequence_number != null && Number(b.sequence_number) > 0 ? Number(b.sequence_number) : 999999;
        return seqA - seqB;
      }),
  [deliveries]);

  const occurrenceDeliveries = useMemo(() =>
    deliveries
      .filter(d => d.status === 'ocorrencia')
      .slice()
      .sort((a, b) => {
        const seqA = a.sequence_number != null && Number(a.sequence_number) > 0 ? Number(a.sequence_number) : 999999;
        const seqB = b.sequence_number != null && Number(b.sequence_number) > 0 ? Number(b.sequence_number) : 999999;
        return seqA - seqB;
      }),
  [deliveries]);

  // Agrupar entregas pendentes por Stop (orderNumber) — um card por parada
  // Dentro de cada grupo, ordenar por sequence_number
  const groupByStop = (items: DeliveryItem[]) => {
    const groups: { [key: string]: DeliveryItem[] } = {};
    items.forEach((delivery) => {
      const stopKey = String(delivery.orderNumber ?? delivery.sequence_number ?? 'x');
      if (!groups[stopKey]) groups[stopKey] = [];
      groups[stopKey].push(delivery);
    });

    const sorted = Object.values(groups).map((group) =>
      group.sort((a, b) => (Number(a.sequence_number) || 0) - (Number(b.sequence_number) || 0))
    );

    sorted.sort((a, b) => {
      const idxA = items.findIndex((delivery) => delivery.id === a[0].id);
      const idxB = items.findIndex((delivery) => delivery.id === b[0].id);
      return idxA - idxB;
    });

    return sorted;
  };

  const groupedPendingDeliveries = useMemo(() => groupByStop(pendingDeliveries), [pendingDeliveries]);
  const groupedDeliveredDeliveries = useMemo(() => groupByStop(deliveredDeliveries), [deliveredDeliveries]);
  const groupedOccurrenceDeliveries = useMemo(() => groupByStop(occurrenceDeliveries), [occurrenceDeliveries]);

  const getNextPendingSelectionId = (deliveryId: string): string | null => {
    const currentGroupIndex = groupedPendingDeliveries.findIndex(group =>
      group.some(delivery => delivery.id === deliveryId)
    );

    const currentGroup = currentGroupIndex >= 0 ? groupedPendingDeliveries[currentGroupIndex] ?? [] : [];
    const remainingInCurrentGroup = currentGroup
      .filter(delivery => delivery.id !== deliveryId)
      .sort((a, b) => Number(a.sequence_number || 0) - Number(b.sequence_number || 0));

    if (remainingInCurrentGroup.length > 0) {
      return remainingInCurrentGroup[0].id;
    }

    const candidateGroups = currentGroupIndex >= 0
      ? groupedPendingDeliveries.filter((_, index) => index !== currentGroupIndex)
      : groupedPendingDeliveries;

    if (currentLocation) {
      const nearestGroup = candidateGroups
        .map(group => {
          const referenceDelivery = group.find(delivery => delivery.lat != null && delivery.lng != null) ?? group[0];
          if (!referenceDelivery || referenceDelivery.lat == null || referenceDelivery.lng == null) {
            return null;
          }

          return {
            group,
            distance: calculateDistance(
              currentLocation.lat,
              currentLocation.lng,
              referenceDelivery.lat,
              referenceDelivery.lng
            ),
          };
        })
        .filter((entry): entry is { group: DeliveryItem[]; distance: number } => entry !== null)
        .sort((a, b) => a.distance - b.distance)[0];

      if (nearestGroup?.group?.length) {
        return [...nearestGroup.group]
          .sort((a, b) => Number(a.sequence_number || 0) - Number(b.sequence_number || 0))[0]
          ?.id ?? null;
      }
    }

    if (currentGroupIndex === -1) {
      const fallbackIndex = Math.min(currentDeliveryIndex, groupedPendingDeliveries.length - 1);
      return groupedPendingDeliveries[fallbackIndex]?.[0]?.id ?? null;
    }

    const nextGroup = groupedPendingDeliveries[currentGroupIndex + 1];
    if (nextGroup?.[0]?.id) {
      return nextGroup[0].id;
    }

    const previousGroup = groupedPendingDeliveries[currentGroupIndex - 1];
    return previousGroup?.[0]?.id ?? null;
  };

  // Quando groupedPendingDeliveries monta/muda e não há seleção compatível,
  // selecionar o primeiro pacote do primeiro grupo (primeira parada)
  useEffect(() => {
    if (groupedPendingDeliveries.length === 0) return;

    const selectedDelivery = selectedDeliveryId
      ? deliveries.find(delivery => delivery.id === selectedDeliveryId)
      : null;

    if (selectedDelivery && selectedDelivery.status !== 'pendente') return;

    const fallbackId = getNextPendingSelectionId(selectedDeliveryId ?? '');
    if (!fallbackId) return;

    const alreadyInGroup = groupedPendingDeliveries.some(group =>
      group.some(delivery => delivery.id === selectedDeliveryId)
    );

    if (!alreadyInGroup) {
      onSelectDelivery(fallbackId);
    }
  }, [currentDeliveryIndex, currentLocation, deliveries, groupedPendingDeliveries, onSelectDelivery, selectedDeliveryId]);

  // Sincronizar carousel quando entrega for selecionada no mapa
  // DEVE ficar após groupedPendingDeliveries para evitar TDZ no bundle minificado
  useEffect(() => {
    if (activeTab !== 'pendente') return;
    if (isMobile && !isSheetExpanded) return;
    if (!selectedDeliveryId || deliveries.length === 0) return;
    const selected = deliveries.find(d => d.id === selectedDeliveryId);
    if (!selected) return;
    const selectedIndex = selected.status === 'pendente'
      ? groupedPendingDeliveries.findIndex(group => group.some(d => d.id === selectedDeliveryId))
      : -1;
    if (selectedIndex === -1) return;
    setCurrentDeliveryIndex(selectedIndex);
    const selectedGroup = groupedPendingDeliveries[selectedIndex];
    const selectedGroupId = selectedGroup?.[0]?.id;
    if (!selectedGroupId) return;

    requestAnimationFrame(() => {
      pendingGroupRefs.current[selectedGroupId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }, [activeTab, deliveries, groupedPendingDeliveries, isMobile, isSheetExpanded, selectedDeliveryId, sheetHeight]);

  useEffect(() => {
    if (activeTab !== 'entregue') return;
    if (isMobile && !isSheetExpanded) return;
    if (!selectedDeliveryId || deliveries.length === 0) return;

    const selectedDelivery = deliveries.find(delivery => delivery.id === selectedDeliveryId);
    if (!selectedDelivery || selectedDelivery.status !== 'entregue') return;

    requestAnimationFrame(() => {
      deliveredRefs.current[selectedDeliveryId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }, [activeTab, deliveries, isMobile, isSheetExpanded, selectedDeliveryId]);

  useEffect(() => {
    if (activeTab !== 'ocorrencia') return;
    if (isMobile && !isSheetExpanded) return;
    if (!selectedDeliveryId || deliveries.length === 0) return;

    const selectedDelivery = deliveries.find(delivery => delivery.id === selectedDeliveryId);
    if (!selectedDelivery || selectedDelivery.status !== 'ocorrencia') return;

    requestAnimationFrame(() => {
      occurrenceRefs.current[selectedDeliveryId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }, [activeTab, deliveries, isMobile, isSheetExpanded, selectedDeliveryId]);

  // Próxima entrega (primeira pendente)
  const nextDelivery = pendingDeliveries[0];

  // Marca todos os pacotes de um grupo como entregue, navegando apenas uma vez
  // A seleção da próxima parada é feita pelo useEffect de correção (groupedPendingDeliveries)
  // que já detecta automaticamente quando selectedDeliveryId sai dos grupos pendentes
  const handleGroupEntregue = (group: DeliveryItem[]) => {
    if (group.length === 0) return;
    if (group.length === 1) {
      handleStatusChange(group[0].id, 'entregue');
      return;
    }
    const nextPendingSelectionId = getNextPendingSelectionId(group[0].id);
    // Múltiplos pacotes: marcar todos sem callback — o useEffect de correção vai navegar
    for (const d of group) {
      onStatusChange(d.id, 'entregue');
    }
    setFeedbackMessage(`Parada concluída — ${group.length} pacote(s) entregue(s)`);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
    if (nextPendingSelectionId) {
      onSelectDelivery(nextPendingSelectionId);
      setActiveTab('pendente');
    } else {
      setActiveTab('entregue');
    }
    // selectedDeliveryId vai cair fora dos grupos pendentes após os status mudarem,
    // o useEffect de groupedPendingDeliveries vai selecionar a primeira parada restante
  };

  const handleStatusChange = (id: string, status: 'pendente' | 'entregue' | 'ocorrencia') => {
    console.log('RouteViewSection: Changing delivery status:', id, 'to', status);
    console.log('RouteViewSection: Estado atual das entregas:', {
      total: deliveries.length,
      pendentes: deliveries.filter(d => d.status === 'pendente').length,
      entregues: deliveries.filter(d => d.status === 'entregue').length,
      ocorrencias: deliveries.filter(d => d.status === 'ocorrencia').length
    });
    
    if (status === 'ocorrencia') {
      setCurrentDeliveryId(id);
      setShowOcorrenciaDialog(true);
      return;
    }
    
    // Encontrar a entrega para atualização
    const deliveryToUpdate = deliveries.find(d => d.id === id);
    if (!deliveryToUpdate) {
      console.error(`RouteViewSection: Entrega com ID ${id} não encontrada`);
      return;
    }
    
    // Registrar o status anterior para verificação
    const previousStatus = deliveryToUpdate.status;
    console.log(`RouteViewSection: Alterando status da entrega ${id} de ${previousStatus} para ${status}`);
    
    // IMPORTANTE: Primeiro mostrar feedback para melhor UX
    let message = 'Status atualizado!';
    if (status === 'entregue') {
      // SIMPLES: Usar APENAS sequence_number
      const delivery = deliveries.find(d => d.id === id);
      const orderNum = delivery?.sequence_number ?? '?';
      message = `Entrega concluída, ordem ${orderNum}`;
    }
    setFeedbackMessage(message);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
    
    // IMPORTANTE: Criar uma cópia local atualizada da entrega para verificação
    // Chamar o handler pai para atualizar o estado global
    // Se for uma entrega concluída, passar callback para navegação automática
    if (status === 'entregue') {
      // Buscar a entrega que acabou de ser marcada como entregue ANTES de chamar onStatusChange
      const nextPendingSelectionId = getNextPendingSelectionId(id);
      
      console.log(`Marcando entrega ${id} como entregue. Próxima seleção prevista: ${nextPendingSelectionId ?? 'nenhuma'}`);
      
      onStatusChange(id, status, (nextDeliveryId: string | null) => {
        try {
          // Buscar entregas pendentes do estado ATUAL (deliveries), não do localStorage
          // porque o localStorage ainda não foi atualizado neste momento
          const nextId = nextPendingSelectionId ?? nextDeliveryId ?? null;
          
          if (nextId) {
            onSelectDelivery(nextId);
            setActiveTab('pendente');
          } else {
            setActiveTab('entregue');
          }
        } catch (error) {
          console.error('❌ Erro ao selecionar próxima entrega:', error);
          setActiveTab('pendente');
        }
      });
    } else {
      // Para outros status, comportamento normal
      onStatusChange(id, status);
      setActiveTab(status);
    }
    
  };
  
  // Função para abrir o diálogo de ocorrência
  const handleOcorrenciaClick = (group: DeliveryItem[]) => {
    setCurrentDeliveryId(group[0]?.id ?? null);
    setShowOcorrenciaDialog(true);
  };

  const handleOcorrenciaSubmit = () => {
    if (!currentDeliveryId) return;
    const group = groupedPendingDeliveries.find((items) =>
      items.some((item) => item.id === currentDeliveryId)
    ) ?? deliveries.filter((item) => item.id === currentDeliveryId);

    group.forEach((item) => onStatusChange(item.id, 'ocorrencia'));
    setShowOcorrenciaDialog(false);
    setFeedbackMessage(group.length > 1 ? `Problema na parada · ${group.length} pacotes` : 'Ocorrência registrada');
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2000);
  };

  const handleGroupUndo = (group: DeliveryItem[]) => {
    group.forEach((item) => onStatusChange(item.id, 'pendente'));
    if (group[0]) onSelectDelivery(group[0].id);
    setActiveTab('pendente');
  };

  const openNavigation = (delivery: DeliveryItem) => {
    if (!delivery.lat || !delivery.lng) return;
    
    const userAgent = navigator.userAgent || navigator.vendor;
    const { lat, lng } = delivery;
    
    // Criar o endereço formatado para melhor compatibilidade
    const address = encodeURIComponent(
      `${delivery.endereco || ''}, ${delivery.numero || ''}, ${delivery.bairro || ''}, ${delivery.cidade || ''}`
    );
    
    // Log para debug
    console.log('Abrindo navegação para:', { lat, lng, address, userAgent });
    
    try {
      if (/iPad|iPhone|iPod/.test(userAgent)) {
        // iOS - tentar com endereço e coordenadas como fallback
        window.location.href = `maps://maps.apple.com/?q=${address}&ll=${lat},${lng}`;
      } else if (/android/i.test(userAgent)) {
        // Android - usar intent com fallback para Google Maps
        window.location.href = `google.navigation:q=${lat},${lng}`;
        
        // Fallback se o primeiro método não funcionar
        setTimeout(() => {
          window.location.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        }, 500);
      } else {
        // Desktop e outros dispositivos
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
      }
    } catch (error) {
      console.error('Erro ao abrir navegação:', error);
      // Fallback universal
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    }
  };

  return (
    <>
      {/* Indicadores de processamento */}
      {processingGeocode && geocodeProgress > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white p-4 shadow-sm">
          <p className="text-sm mb-2">Convertendo endereços em coordenadas...</p>
          <Progress value={geocodeProgress} className="h-2" />
        </div>
      )}

      {processingOptimization && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white p-4 shadow-sm">
          <p className="text-sm mb-2">Otimizando rota...</p>
          <Progress value={50} className="h-2" />
        </div>
      )}

      {/* Renderizar apenas um layout baseado no tamanho da tela */}
      {isMobile ? (
        /* Layout Mobile */
        <div className="mobile-route-view">
          {/* Header Mobile Fixo */}
          <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm shadow-sm mobile-header">
            <div className="flex items-center gap-2">
              {onBackToImport && (
                <Button
                  onClick={onBackToImport}
                  className="header-back-btn"
                  variant="ghost"
                  size="sm"
                >
                  <ArrowLeft size={18} />
                </Button>
              )}
              
              {onFinishRoute && (
                <Button
                  onClick={onFinishRoute}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Check size={16} />
                  <span className="hidden sm:inline">Finalizar</span>
                </Button>
              )}
            </div>
            
            <div className="header-info">
              <span className="route-name">
                {localStorage.getItem('current-route-name') || 'Rota Atual'}
              </span>
              <div className="status-badges">
                <div className="status-badge status-pending">
                  <div className="status-dot"></div>
                  <span>{statusCounts.pendente}</span>
                </div>
                <div className="status-badge status-delivered">
                  <div className="status-dot"></div>
                  <span>{statusCounts.entregue}</span>
                </div>
                <div className="status-badge status-occurrence">
                  <div className="status-dot"></div>
                  <span>{statusCounts.ocorrencia}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Layout para mobile com mapa e lista suspensa arrastável */}
          <div className="flex flex-col h-screen pt-20 relative">
            {/* Mapa em tela cheia */}
            <div className="h-full rounded-md overflow-hidden">
              <DeliveryMap
                deliveries={deliveries}
                selectedDeliveryId={selectedDeliveryId}
                onSelectDelivery={onSelectDelivery}
                currentLocation={currentLocation}
                isTrackingActive={isTrackingActive}
                onStartTracking={onStartTracking}
                onStopTracking={onStopTracking}
                onOptimizeRoute={onOptimizeRoute}
                onStatusChange={onStatusChange}
                isMobileView={true}
              />
            </div>
            
            {/* Bottom sheet — minimizada por padrão, expande ao clicar/arrastar */}
            <div
              ref={sheetRef}
              className="absolute bottom-0 left-0 right-0 flex flex-col bg-white rounded-t-2xl shadow-2xl overflow-hidden"
              style={{
                height: `${sheetHeight}px`,
                transition: 'height 220ms cubic-bezier(0.32, 0.72, 0, 1)',
                zIndex: 50,
              }}
            >
              {/* Handle — clicar alterna minimized→half→full→minimized */}
              <div
                ref={dragHandleRef}
                className="flex flex-col items-center justify-center w-full cursor-pointer select-none border-b border-gray-100"
                style={{ height: SHEET_HANDLE_HEIGHT, flexShrink: 0, touchAction: 'none' }}
                onClick={handleSheetHandleClick}
              >
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
                <span className="text-xs text-gray-400 mt-2">
                  {sheetPosition === 'minimized'
                    ? `▲  ${pendingDeliveries.length} pendentes · ${deliveredDeliveries.length} entregues · ${occurrenceDeliveries.length} ocorrências`
                    : sheetPosition === 'half'
                    ? '▲ Expandir  ·  toque para ver tudo'
                    : '▼ Recolher lista'}
                </span>
              </div>
              
              {/* Conteúdo: oculto quando minimizado */}
              {isSheetExpanded && <>
              {/* Abas de navegação */}
              <div className="flex flex-wrap gap-1 space-x-1 mb-2 border-b border-gray-200 pb-2 overflow-x-auto px-2">
                <button 
                  className={`px-2 py-1 rounded-md text-xs font-medium flex items-center whitespace-nowrap ${activeTab === 'pendente' ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('pendente')}
                >
                  <Clock size={14} className="mr-1 text-brand-500" />
                  <span>Pend.</span>
                  <span className="ml-1">({groupedPendingDeliveries.length})</span>
                </button>
                <button 
                  className={`px-2 py-1 rounded-md text-xs font-medium flex items-center whitespace-nowrap ${activeTab === 'entregue' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('entregue')}
                >
                  <Check size={14} className="mr-1 text-green-500" />
                  <span>Entr.</span>
                  <span className="ml-1">({groupedDeliveredDeliveries.length})</span>
                </button>
                <button 
                  className={`px-2 py-1 rounded-md text-xs font-medium flex items-center whitespace-nowrap ${activeTab === 'ocorrencia' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('ocorrencia')}
                >
                  <AlertTriangle size={14} className="mr-1 text-red-500" />
                  <span>Ocor.</span>
                  <span className="ml-1">({occurrenceDeliveries.length})</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-1 touch-auto overscroll-contain">
                {/* Renderizar apenas a lista ativa selecionada */}
                {activeTab === 'pendente' && (
                  <div className="relative">
                    <div className="space-y-2 overflow-y-auto p-1">
                      {groupedPendingDeliveries.map((group, groupIndex) => {
                        const firstDelivery = group[0];
                        const isGroupSelected = group.some(d => d.id === selectedDeliveryId);
                        const stopNum = firstDelivery.orderNumber ?? firstDelivery.sequence_number;
                        return (
                          <div
                            key={`stop-${stopNum}-${groupIndex}`}
                            ref={(element) => {
                              if (element) {
                                pendingGroupRefs.current[firstDelivery.id] = element;
                                return;
                              }

                              delete pendingGroupRefs.current[firstDelivery.id];
                            }}
                          >
                            <StopCard
                              group={group}
                              selected={isGroupSelected}
                              mode="pendente"
                              onSelect={() => onSelectDelivery(firstDelivery.id)}
                              onNavigate={() => openNavigation(firstDelivery)}
                              onComplete={() => handleGroupEntregue(group)}
                              onProblem={() => handleOcorrenciaClick(group)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'entregue' && (
                  <div className="space-y-2 overflow-y-auto pb-6 px-1">
                    {groupedDeliveredDeliveries.length > 0 ? groupedDeliveredDeliveries.map((group) => (
                      <StopCard
                        key={`delivered-${group[0].id}`}
                        group={group}
                        selected={group.some((item) => item.id === selectedDeliveryId)}
                        mode="entregue"
                        onSelect={() => onSelectDelivery(group[0].id)}
                        onUndo={() => handleGroupUndo(group)}
                      />
                    )) : (
                      <div className="empty-list-message p-4 text-center text-gray-500 italic">Nenhuma entrega concluída</div>
                    )}
                  </div>
                )}

                {activeTab === 'ocorrencia' && (
                  <div className="space-y-2">
                    {groupedOccurrenceDeliveries.length > 0 ? groupedOccurrenceDeliveries.map((group) => (
                      <StopCard
                        key={`occ-${group[0].id}`}
                        group={group}
                        selected={group.some((item) => item.id === selectedDeliveryId)}
                        mode="ocorrencia"
                        onSelect={() => onSelectDelivery(group[0].id)}
                        onUndo={() => handleGroupUndo(group)}
                      />
                    )) : (
                      <div className="empty-list-message p-4 text-center text-gray-500 italic">Nenhuma ocorrência registrada</div>
                    )}
                  </div>
                )}
              </div>
              </>}
            </div>
          </div>
        </div>
      ) : (
        // Layout desktop
        <div className="desktop-route-view">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">Rota do dia</h2>
              <div className="flex gap-2">
                {onFinishRoute && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={onFinishRoute}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check size={16} />
                    Finalizar Rota
                  </Button>
                )}
                {onBackToImport && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onBackToImport}
                    className="flex items-center gap-1"
                  >
                    <ArrowLeft size={16} />
                    <FileUp size={16} />
                    Nova Rota
                  </Button>
                )}
              </div>
            </div>
            <StatusCounter 
              pendente={statusCounts.pendente} 
              entregue={statusCounts.entregue} 
              ocorrencia={statusCounts.ocorrencia} 
              total={statusCounts.total}
            />
          </div>

          <div className="h-[calc(100vh-230px)] overflow-hidden">
            {/* Layout em grid para desktop - mapa à esquerda (60%), lista à direita (40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-6 h-full">
              {/* Mapa à esquerda - ocupa 60% do espaço em desktop */}
              <div className="h-full rounded-md overflow-hidden col-span-3">
                <DeliveryMap
                  deliveries={deliveries}
                  selectedDeliveryId={selectedDeliveryId}
                  onSelectDelivery={onSelectDelivery}
                  currentLocation={currentLocation}
                  isTrackingActive={isTrackingActive}
                  onStartTracking={onStartTracking}
                  onStopTracking={onStopTracking}
                  onOptimizeRoute={onOptimizeRoute}
                  onStatusChange={onStatusChange}
                  isMobileView={false}
                />
              </div>
              
              {/* Lista de entregas à direita - ocupa 40% do espaço em desktop */}
              <div className="h-full flex flex-col border-l border-gray-200 pl-2 lg:pl-4 col-span-2 bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Abas de navegação */}
                <div className="flex flex-wrap gap-1 lg:space-x-2 mb-4 border-b border-gray-200 pb-2 overflow-x-auto">
                  <button 
                    className={`px-2 lg:px-4 py-2 rounded-md text-xs lg:text-sm font-medium flex items-center whitespace-nowrap ${activeTab === 'pendente' ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('pendente')}
                  >
                    <Clock size={16} className="mr-1 lg:mr-2 text-brand-500" />
                    <span className="hidden sm:inline">Paradas</span>
                    <span className="sm:hidden">Pend.</span>
                    <span className="ml-1">({groupedPendingDeliveries.length})</span>
                  </button>
                  <button 
                    className={`px-2 lg:px-4 py-2 rounded-md text-xs lg:text-sm font-medium flex items-center whitespace-nowrap ${activeTab === 'entregue' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('entregue')}
                  >
                    <Check size={16} className="mr-1 lg:mr-2 text-green-500" />
                    <span className="hidden sm:inline">Entregues</span>
                    <span className="sm:hidden">Entr.</span>
                    <span className="ml-1">({groupedDeliveredDeliveries.length})</span>
                  </button>
                  <button 
                    className={`px-2 lg:px-4 py-2 rounded-md text-xs lg:text-sm font-medium flex items-center whitespace-nowrap ${activeTab === 'ocorrencia' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('ocorrencia')}
                  >
                    <AlertTriangle size={16} className="mr-1 lg:mr-2 text-red-500" />
                    <span className="hidden sm:inline">Ocorrências</span>
                    <span className="sm:hidden">Ocor.</span>
                    <span className="ml-1">({occurrenceDeliveries.length})</span>
                  </button>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  {activeTab === 'pendente' && (
                    <div className="h-full space-y-2 overflow-y-auto p-3">
                      {groupedPendingDeliveries.map((group, groupIndex) => {
                        const firstDelivery = group[0];
                        const stopNum = firstDelivery.orderNumber ?? firstDelivery.sequence_number;
                        return (
                          <div
                            key={`desk-stop-${stopNum}-${groupIndex}`}
                            ref={(element) => {
                              if (element) {
                                pendingGroupRefs.current[firstDelivery.id] = element;
                                return;
                              }
                              delete pendingGroupRefs.current[firstDelivery.id];
                            }}
                          >
                            <StopCard
                              group={group}
                              selected={group.some((item) => item.id === selectedDeliveryId)}
                              mode="pendente"
                              onSelect={() => onSelectDelivery(firstDelivery.id)}
                              onNavigate={() => openNavigation(firstDelivery)}
                              onComplete={() => handleGroupEntregue(group)}
                              onProblem={() => handleOcorrenciaClick(group)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {activeTab === 'entregue' && (
                    <div className="h-full space-y-2 overflow-y-auto p-3">
                      {groupedDeliveredDeliveries.length === 0 && (
                        <div className="text-sm text-gray-500 italic p-4">Nenhuma entrega concluída</div>
                      )}
                      {groupedDeliveredDeliveries.map((group) => (
                        <StopCard
                          key={`desk-delivered-${group[0].id}`}
                          group={group}
                          selected={group.some((item) => item.id === selectedDeliveryId)}
                          mode="entregue"
                          onSelect={() => onSelectDelivery(group[0].id)}
                          onUndo={() => handleGroupUndo(group)}
                        />
                      ))}
                    </div>
                  )}
                  {activeTab === 'ocorrencia' && (
                    <div className="h-full space-y-2 overflow-y-auto p-3">
                      {groupedOccurrenceDeliveries.length === 0 && (
                        <div className="text-sm text-gray-500 italic p-4">Nenhuma ocorrência registrada</div>
                      )}
                      {groupedOccurrenceDeliveries.map((group) => (
                        <StopCard
                          key={`desk-occ-${group[0].id}`}
                          group={group}
                          selected={group.some((item) => item.id === selectedDeliveryId)}
                          mode="ocorrencia"
                          onSelect={() => onSelectDelivery(group[0].id)}
                          onUndo={() => handleGroupUndo(group)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de Ocorrência */}
      <Dialog open={showOcorrenciaDialog} onOpenChange={setShowOcorrenciaDialog}>
        <DialogContent className="mobile-dialog">
          <DialogHeader>
            <DialogTitle>Registrar Ocorrência</DialogTitle>
            <DialogDescription>
              Informe o motivo da ocorrência para esta entrega.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Descreva o motivo da ocorrência..."
              value={ocorrenciaText}
              onChange={(e) => setOcorrenciaText(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="mobile-dialog-footer">
            <Button variant="outline" onClick={() => setShowOcorrenciaDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleOcorrenciaSubmit}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Toast */}
      {showFeedback && (
        <div className="feedback-toast">
          {feedbackMessage}
        </div>
      )}
    </>
  );
};

export default RouteViewSection;
