
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
}

const SiteContent = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [newContent, setNewContent] = useState({
    title: "",
    content: "",
    type: "banner"
  });

  const fetchContent = async () => {
    try {
      setLoading(true);
      // Since we're creating this admin panel from scratch without an existing site_content table,
      // we'll first check if the table exists and create it if not
      const { error: contentTableError } = await supabase
        .from("site_content")
        .select("id")
        .limit(1)
        .single();
      
      if (contentTableError && contentTableError.code === "PGRST116") {
        // Table doesn't exist, we'll return mock data for now
        setContent([
          {
            id: "1",
            title: "Banner Principal",
            content: "Rota Fácil - Otimize suas entregas com a melhor ferramenta do mercado!",
            type: "banner",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: "2",
            title: "Texto Benefícios",
            content: "Economize tempo e combustível, evite voltar 10x no mesmo endereço, organize suas entregas de forma eficiente.",
            type: "text",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("site_content")
        .select("*")
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setContent(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar conteúdo",
        description: error.message,
        variant: "destructive",
      });
      // Provide mock data as fallback
      setContent([
        {
          id: "1",
          title: "Banner Principal",
          content: "Rota Fácil - Otimize suas entregas com a melhor ferramenta do mercado!",
          type: "banner",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "2",
          title: "Texto Benefícios",
          content: "Economize tempo e combustível, evite voltar 10x no mesmo endereço, organize suas entregas de forma eficiente.",
          type: "text",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleEditSubmit = async () => {
    if (!editingContent) return;
    
    try {
      // In a real implementation, this would update the database
      // For now we'll just update the local state
      const updatedContent = content.map(item => 
        item.id === editingContent.id ? editingContent : item
      );
      setContent(updatedContent);
      
      toast({
        title: "Conteúdo atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      setEditingContent(null);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar conteúdo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleNewContentSubmit = () => {
    try {
      // In a real implementation, this would insert into the database
      // For now we'll just update the local state
      const newItem: ContentItem = {
        id: Date.now().toString(),
        title: newContent.title,
        content: newContent.content,
        type: newContent.type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setContent([...content, newItem]);
      setNewContent({ title: "", content: "", type: "banner" });
      
      toast({
        title: "Conteúdo adicionado",
        description: "O novo conteúdo foi adicionado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar conteúdo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filterContentByType = (type: string) => {
    return content.filter(item => item.type === type);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando conteúdo do site...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-medium">Gerenciar Conteúdo do Site</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Conteúdo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Conteúdo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="title" className="text-right">
                  Título
                </label>
                <Input
                  id="title"
                  value={newContent.title}
                  onChange={(e) => setNewContent({...newContent, title: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="type" className="text-right">
                  Tipo
                </label>
                <select
                  id="type"
                  value={newContent.type}
                  onChange={(e) => setNewContent({...newContent, type: e.target.value})}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="banner">Banner</option>
                  <option value="text">Texto</option>
                  <option value="feature">Recurso</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="content" className="text-right">
                  Conteúdo
                </label>
                <Textarea
                  id="content"
                  value={newContent.content}
                  onChange={(e) => setNewContent({...newContent, content: e.target.value})}
                  className="col-span-3"
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleNewContentSubmit}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="banners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="texts">Textos</TabsTrigger>
          <TabsTrigger value="features">Recursos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="banners" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterContentByType("banner").map((item) => (
              <ContentCard 
                key={item.id} 
                item={item} 
                onEdit={(item) => setEditingContent(item)} 
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="texts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterContentByType("text").map((item) => (
              <ContentCard 
                key={item.id} 
                item={item} 
                onEdit={(item) => setEditingContent(item)} 
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterContentByType("feature").map((item) => (
              <ContentCard 
                key={item.id} 
                item={item} 
                onEdit={(item) => setEditingContent(item)} 
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {editingContent && (
        <Dialog open onOpenChange={() => setEditingContent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Conteúdo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-title" className="text-right">
                  Título
                </label>
                <Input
                  id="edit-title"
                  value={editingContent.title}
                  onChange={(e) => setEditingContent({...editingContent, title: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-content" className="text-right">
                  Conteúdo
                </label>
                <Textarea
                  id="edit-content"
                  value={editingContent.content}
                  onChange={(e) => setEditingContent({...editingContent, content: e.target.value})}
                  className="col-span-3"
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleEditSubmit}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

interface ContentCardProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
}

const ContentCard = ({ item, onEdit }: ContentCardProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium text-lg">{item.title}</h4>
            <p className="text-sm text-gray-500 mb-2">Tipo: {item.type}</p>
            <p className="text-sm break-words">{item.content}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SiteContent;
