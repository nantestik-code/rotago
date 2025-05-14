
import { useQuery } from "@tanstack/react-query";
import { getRoutes } from "@/services/routeService";
import { toast } from "@/hooks/use-toast";
import { Route } from "@/types/route";

export const useRoutes = () => {
  return useQuery({
    queryKey: ["routes"],
    queryFn: getRoutes,
    meta: {
      onError: (error: Error) => {
        toast({
          title: "Erro ao carregar rotas",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });
};

export default useRoutes;
