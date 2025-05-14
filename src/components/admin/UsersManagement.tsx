
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_early_adopter: boolean | null;
  subscription_status: string | null;
  created_at: string | null;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleAdminStatus = async (user: UserProfile) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_early_adopter: !user.is_early_adopter })
        .eq("id", user.id);
      
      if (error) throw error;
      
      toast({
        title: "Status atualizado",
        description: `${user.full_name || "Usuário"} ${!user.is_early_adopter ? "agora é" : "não é mais"} administrador.`,
      });
      
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando usuários...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-medium">Usuários Cadastrados: {users.length}</h3>
        <Button onClick={fetchUsers} variant="outline" size="sm">
          Atualizar Lista
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Cadastro</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name || "Nome não informado"}</TableCell>
                  <TableCell>{user.subscription_status || "free"}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    {user.is_early_adopter ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-300" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Detalhes do Usuário</DialogTitle>
                          </DialogHeader>
                          {selectedUser && (
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="font-medium">ID:</div>
                                <div className="truncate">{selectedUser.id}</div>
                                <div className="font-medium">Nome:</div>
                                <div>{selectedUser.full_name || "N/A"}</div>
                                <div className="font-medium">Status:</div>
                                <div>{selectedUser.subscription_status || "free"}</div>
                                <div className="font-medium">Admin:</div>
                                <div>{selectedUser.is_early_adopter ? "Sim" : "Não"}</div>
                                <div className="font-medium">Cadastro:</div>
                                <div>{formatDate(selectedUser.created_at)}</div>
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  onClick={() => toggleAdminStatus(selectedUser)}
                                >
                                  {selectedUser.is_early_adopter
                                    ? "Remover Admin"
                                    : "Tornar Admin"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant={user.is_early_adopter ? "destructive" : "default"}
                        onClick={() => toggleAdminStatus(user)}
                      >
                        {user.is_early_adopter ? "Remover Admin" : "Tornar Admin"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UsersManagement;
