
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  Map, 
  Truck, 
  Clock, 
  BarChart4, 
  LucideShield, 
  Package, 
  Route, 
  CheckCheck, 
  ListCheck,
  ArrowRight 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth/signup');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b px-4 py-4 md:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Truck className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold">RotaFacil</span>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/auth/login')}>Entrar</Button>
          <Button onClick={() => navigate('/auth/signup')}>Cadastrar</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-20 md:py-28">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-block px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full mb-4">
                Plataforma de gestão de entregas
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Entregue <span className="text-primary">mais</span> com <span className="text-primary">menos</span> esforço
              </h1>
              <p className="mt-6 text-xl text-gray-600 max-w-lg mx-auto lg:mx-0">
                Automatize suas rotas, elimine retornos desnecessários e aumente sua produtividade em até 35%.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" onClick={handleGetStarted} className="px-8 py-6 text-base">
                  Começar Grátis <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="py-6 text-base" onClick={() => toast({
                  title: "Demonstração em vídeo",
                  description: "Recurso em desenvolvimento. Em breve você poderá assistir a um vídeo demonstrativo!",
                })}>
                  Ver demonstração
                </Button>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                <span className="bg-yellow-100 px-2 py-1 rounded text-yellow-700 font-medium">Grátis</span> durante todo o período de desenvolvimento. Sem cartão de crédito.
              </p>
            </div>
            <div className="relative order-first lg:order-last">
              <div className="relative bg-white p-4 rounded-xl shadow-2xl">
                <AspectRatio ratio={16/9} className="bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2426&q=80" 
                    alt="Dashboard RotaFacil" 
                    className="object-cover w-full h-full rounded-lg" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-lg"></div>
                </AspectRatio>
                <div className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg p-3 animate-bounce">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCheck className="h-5 w-5 text-green-500" />
                    <span>Rotas otimizadas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Benefits */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-16">
            <span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
              Benefícios principais
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
              Por que escolher o RotaFacil?
            </h2>
            <p className="mt-3 text-xl text-gray-600 max-w-3xl mx-auto">
              Nossos clientes aumentam em até 35% o número de entregas realizadas por dia
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <BenefitCard 
              icon={<Route className="h-10 w-10 text-primary" />}
              title="Sem voltar 10x no mesmo lugar"
              description="Otimize suas rotas para agrupar entregas próximas, eliminando retornos desnecessários ao mesmo endereço ou região."
            />
            <BenefitCard 
              icon={<ListCheck className="h-10 w-10 text-primary" />}
              title="Organização inteligente"
              description="Sequencie suas entregas automaticamente baseadas em distância, horário e importância para maximizar a eficiência."
            />
            <BenefitCard 
              icon={<Clock className="h-10 w-10 text-primary" />}
              title="Economize tempo e combustível"
              description="Reduza até 30% do tempo e combustível gastos com rotas inteligentes que consideram trânsito e distâncias."
            />
            <BenefitCard 
              icon={<Package className="h-10 w-10 text-primary" />}
              title="Controle total das entregas"
              description="Acompanhe em tempo real o status de cada entrega, com atualizações automáticas e comprovantes digitais."
            />
            <BenefitCard 
              icon={<Map className="h-10 w-10 text-primary" />}
              title="Mapeamento visual"
              description="Visualize todas as suas entregas no mapa e tome decisões estratégicas sobre a distribuição da sua equipe."
            />
            <BenefitCard 
              icon={<BarChart4 className="h-10 w-10 text-primary" />}
              title="Dados analíticos detalhados"
              description="Obtenha insights valiosos sobre desempenho, tempos de entrega e áreas de melhoria para sua operação."
            />
          </div>
        </div>
      </section>

      {/* Success Metrics */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl">
          <div className="text-center mb-16">
            <span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
              Resultados comprovados
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
              Transforme sua logística
            </h2>
            <p className="mt-3 text-xl text-gray-600 max-w-3xl mx-auto">
              Usuários do RotaFacil relatam melhorias significativas em suas operações
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <MetricCard 
              value="35%"
              label="Aumento nas entregas diárias"
              description="Mais entregas com a mesma equipe"
            />
            <MetricCard 
              value="28%"
              label="Redução em custos operacionais"
              description="Menos combustível e manutenção"
            />
            <MetricCard 
              value="92%"
              label="Satisfação dos clientes"
              description="Entregas no prazo e sem erros"
            />
          </div>

          <div className="mt-16 text-center">
            <Button size="lg" onClick={handleGetStarted} className="px-8 py-6 text-base">
              Experimente agora <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="mt-4 text-gray-500">
              Sem compromisso, sem cartão de crédito
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl">
          <div className="text-center mb-16">
            <span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
              Processo simples
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
              Como funciona
            </h2>
            <p className="mt-3 text-xl text-gray-600 max-w-3xl mx-auto">
              Em apenas três passos simples, transforme sua operação de entregas
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard 
              number="1"
              title="Importe seus pedidos"
              description="Carregue sua lista de entregas de planilhas, sistemas de gestão ou adicione manualmente."
            />
            <StepCard 
              number="2"
              title="Roteirize automaticamente"
              description="Nosso algoritmo cria as melhores rotas baseadas em localização, horários e prioridades."
            />
            <StepCard 
              number="3"
              title="Acompanhe as entregas"
              description="Monitore o progresso em tempo real e receba atualizações instantâneas de status."
            />
          </div>
          
          <div className="mt-16 text-center">
            <Button size="lg" variant="outline" onClick={() => toast({
              title: "Demonstração em vídeo",
              description: "Recurso em desenvolvimento. Em breve você poderá assistir a um vídeo demonstrativo!",
            })}>
              Ver o sistema em ação
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold">
              Pronto para transformar suas entregas?
            </h2>
            <p className="mt-4 text-xl opacity-90">
              Junte-se aos primeiros usuários e ajude a moldar o futuro da plataforma.
              Acesso gratuito durante todo o período de desenvolvimento.
            </p>
            <div className="mt-10">
              <Button 
                size="lg" 
                variant="outline" 
                onClick={handleGetStarted} 
                className="bg-white text-primary hover:bg-white/90 py-6 px-10 text-base border-white"
              >
                Começar Grátis <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="mt-4 text-sm opacity-80">
                Sem compromisso, sem cartão de crédito necessário
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-14">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Truck className="h-7 w-7 text-primary" />
                <span className="text-xl font-bold text-white">RotaFacil</span>
              </div>
              <p className="mb-4 text-gray-400 max-w-md">
                RotaFacil é uma plataforma completa para gerenciamento e otimização de rotas de entrega,
                ajudando empresas de todos os tamanhos a entregar mais com menos recursos.
              </p>
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} RotaFacil. Todos os direitos reservados.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Recursos</h3>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-primary transition-colors">Otimização de Rotas</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Controle de Entregas</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Relatórios</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Contato</h3>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-primary transition-colors">Suporte</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Vendas</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Benefit Card Component
const BenefitCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 bg-primary/10 p-3 rounded-lg inline-block">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ 
  value, 
  label,
  description
}: { 
  value: string; 
  label: string;
  description: string;
}) => {
  return (
    <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm text-center">
      <p className="text-4xl font-bold text-primary mb-2">{value}</p>
      <h3 className="text-lg font-semibold mb-2">{label}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
};

// Step Card Component
const StepCard = ({ 
  number, 
  title, 
  description 
}: { 
  number: string; 
  title: string; 
  description: string;
}) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative">
      <div className="absolute -top-5 left-6 bg-primary text-white text-lg font-bold w-10 h-10 rounded-full flex items-center justify-center">
        {number}
      </div>
      <div className="pt-6">
        <h3 className="text-xl font-semibold mb-3">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
};

export default LandingPage;
