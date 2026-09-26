
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Loader2, User, Settings, LogOut, Shield, History, Crown } from "lucide-react";
import SyncStatusButton from "./SyncStatusButton";
import { useDeliveries } from "@/hooks/use-deliveries";
import { useSubscription } from "@/hooks/useSubscription";
import Logo from "./Logo";

export function Header({ onNewRouteClick, onExportClick }: { 
  onNewRouteClick?: () => void; 
  onExportClick?: () => void;
}) {
  const { user, profile, signOut, isLoading } = useAuth();
  const { isTrialActive, trialTimeRemainingLabel, isSubscriptionActive, currentPlan } = useSubscription();
  const [initials, setInitials] = useState<string>("");
  const deliveriesContext = useDeliveries();

  useEffect(() => {
    if (profile?.full_name) {
      const nameParts = profile.full_name.split(" ");
      const firstInitial = nameParts[0]?.charAt(0) || "";
      const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1]?.charAt(0) : "";
      setInitials((firstInitial + lastInitial).toUpperCase());
    } else if (user?.email) {
      setInitials(user.email.charAt(0).toUpperCase());
    }
  }, [user, profile]);

  return (
    <header className="native-header border-b border-brand-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo size="md" variant="default" interactive={true} to="/app" />

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
        ) : user ? (
          <div className="flex items-center gap-3">
            {isTrialActive && (
              <Link
                to="/subscription"
                className="hidden items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 sm:flex"
              >
                Trial · {trialTimeRemainingLabel}
              </Link>
            )}
            {isSubscriptionActive && !isTrialActive && currentPlan && (
              <Link
                to="/subscription"
                className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:flex"
              >
                {currentPlan.name}
              </Link>
            )}
            {/* Botão de sincronização que só aparece quando há alterações pendentes */}
            {deliveriesContext && (
              <SyncStatusButton syncFunction={deliveriesContext.syncPendingStatusChanges} />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full h-8 w-8 p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  <User className="mr-2 h-4 w-4" />
                  <span>{profile?.full_name || user.email}</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <Link to="/app">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Meu Painel</span>
                  </DropdownMenuItem>
                </Link>
                
                <Link to="/history">
                  <DropdownMenuItem>
                    <History className="mr-2 h-4 w-4" />
                    <span>Histórico de Rotas</span>
                  </DropdownMenuItem>
                </Link>
                
                <Link to="/subscription">
                  <DropdownMenuItem>
                    <Crown className="mr-2 h-4 w-4" />
                    <span>Minha Assinatura</span>
                  </DropdownMenuItem>
                </Link>
                
                {profile?.is_early_adopter && (
                  <Link to="/admin">
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Painel Admin</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔐 Header: Botão Sair clicado - Executando logout forçado');
                    
                    // Notificar usuário
                    signOut();
                    
                    // Backup: Forçar redirecionamento caso o signOut falhe
                    setTimeout(() => {
                      console.log('🔄 Header: Redirecionamento de segurança');
                      localStorage.clear();
                      window.location.replace('/login?source=header');
                      window.location.reload();
                    }, 500);
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Link to="/auth/login">
              <Button variant="outline">Entrar</Button>
            </Link>
            <Link to="/auth/signup">
              <Button>Cadastre-se</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
