
import { useQuery } from "@tanstack/react-query";
import { getDeliveries } from "@/services/deliveryService";
import { toast } from "@/hooks/use-toast";
import { Delivery } from "@/types/delivery";

export const useDeliveries = () => {
  return useQuery({
    queryKey: ["deliveries"],
    queryFn: getDeliveries,
    meta: {
      onError: (error: Error) => {
        toast({
          title: "Erro ao carregar entregas",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });
};

export default useDeliveries;
