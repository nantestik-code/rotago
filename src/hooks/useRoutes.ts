
import { useQuery } from "@tanstack/react-query";
import { getRoutes } from "@/services/routeService";
import { toast } from "@/hooks/use-toast";
import { Route } from "@/types/route";
import { useAuth } from "@/hooks/use-auth";

export const useRoutes = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["routes", user?.id],
    queryFn: () => getRoutes(user),
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
