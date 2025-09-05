
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  Map, 
  Truck, 
  Clock, 
  BarChart4, 
  Package, 
  Route, 
  CheckCheck, 
  ListCheck,
  ArrowRight 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import PricingSection from '@/components/subscription/PricingSection';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth/signup');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b px-4 py-4 md:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 rounded transform rotate-45"></div>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">RotaGo</span>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/auth/login')}>Entrar</Button>
          <Button onClick={() => navigate('/auth/signup')}>Cadastrar</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-green-50 to-white py-16 md:py-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="bg-gradient-to-r from-green-100 to-blue-100 px-4 py-2 rounded-full inline-block mb-6">
                <span className="text-sm font-semibold text-green-800">🚀 Revolucione suas entregas por apenas R$ 29,90/mês</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Otimize suas <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">rotas</span> e <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">economize</span> tempo
              </h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Route className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">+35% entregas/dia</p>
                    <p className="text-sm text-gray-600">Rotas otimizadas</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">-30% combustível</p>
                    <p className="text-sm text-gray-600">Economia garantida</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" onClick={handleGetStarted} className="px-8 py-6 text-base bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                  Começar Grátis - 7 dias <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="py-6 text-base border-2 border-blue-200 hover:bg-blue-50" onClick={() => toast({
                  title: "Demonstração em vídeo",
                  description: "Recurso em desenvolvimento. Em breve você poderá assistir a um vídeo demonstrativo!",
                })}>
                  Ver demonstração
                </Button>
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                <p className="text-sm text-center">
                  <span className="font-semibold text-green-700">✨ Oferta especial:</span> <span className="text-gray-700">7 dias grátis + apenas</span> <span className="text-2xl font-bold text-green-600">R$ 29,90/mês</span>
                </p>
                <p className="text-xs text-gray-600 text-center mt-1">Sem taxas de setup • Cancele quando quiser • Suporte incluído</p>
              </div>
            </div>
            <div className="relative order-first lg:order-last">
              <div className="relative bg-white p-4 rounded-xl shadow-2xl">
                <AspectRatio ratio={16/9} className="bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src="/lovable-uploads/40d87efa-c141-4230-9169-0423b48170d2.png" 
                    alt="Mapa interativo com rotas de entrega" 
                    className="object-cover w-full h-full rounded-lg" 
                  />
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
              Por que escolher o RotaGo?
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

      {/* Pricing Section - Movida para cima */}
      <PricingSection />

      {/* Visual Demo Section - NOVO */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl">
          <div className="text-center mb-12">
            <span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
              Sistema em ação
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
              Conheça nosso sistema na prática
            </h2>
            <p className="mt-3 text-xl text-gray-600 max-w-3xl mx-auto">
              Veja como o RotaFacil funciona e como ele pode otimizar suas entregas
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-4 rounded-xl shadow-xl">
              <h3 className="font-semibold text-lg mb-3">Visualização de Rotas Otimizadas</h3>
              <AspectRatio ratio={16/9} className="bg-gray-100 rounded-lg overflow-hidden mb-3">
                <img 
                  src="/lovable-uploads/40d87efa-c141-4230-9169-0423b48170d2.png"
                  alt="Mapa com rotas e marcadores de entrega" 
                  className="object-cover w-full h-full rounded-lg" 
                />
              </AspectRatio>
              <p className="text-sm text-gray-600">
                Marcadores coloridos indicam o status e sequência de cada entrega no mapa interativo.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-xl">
              <h3 className="font-semibold text-lg mb-3">Dashboard de Acompanhamento</h3>
              <AspectRatio ratio={16/9} className="bg-gray-100 rounded-lg overflow-hidden mb-3">
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <div className="bg-white w-[90%] h-[90%] rounded-lg shadow-md p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-2">
                          <Truck className="w-4 h-4" />
                        </div>
                        <span className="font-bold">Painel de Entregas</span>
                      </div>
                      <div className="flex space-x-2">
                        <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs">Pendentes: 15</div>
                        <div className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs">Concluídas: 27</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 flex-grow overflow-auto">
                      {[1, 2, 3, 4, 5, 6].map((item) => (
                        <div key={item} className="p-2 border rounded-md bg-gray-50">
                          <div className="text-xs text-gray-500">Cliente #{item}</div>
                          <div className="text-sm font-medium truncate">Entrega #{item * 10}</div>
                          <div className="flex items-center mt-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
                            <span className="text-xs">Pendente</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AspectRatio>
              <p className="text-sm text-gray-600">
                Interface intuitiva para monitorar todas as suas entregas em um só lugar.
              </p>
            </div>
          </div>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="font-semibold text-lg mb-2">Múltiplos Pontos de Entrega</h3>
              <AspectRatio ratio={16/9} className="bg-gray-100 rounded-lg overflow-hidden mb-3">
                <div className="bg-slate-100 w-full h-full rounded-lg flex items-center justify-center overflow-hidden">
                  <div className="relative w-full h-full">
                    <div className="absolute top-[20%] left-[30%] w-10 h-10 bg-blue-500 rounded-lg rotate-45 flex items-center justify-center shadow-md">
                      <span className="text-white font-bold rotate-[315deg]">12</span>
                    </div>
                    <div className="absolute top-[50%] left-[60%] w-10 h-10 bg-orange-500 border-2 border-white rounded-lg rotate-45 flex items-center justify-center shadow-md">
                      <span className="text-white font-bold rotate-[315deg]">8</span>
                    </div>
                    <div className="absolute top-[30%] left-[70%] w-10 h-10 bg-blue-500 rounded-lg rotate-45 flex items-center justify-center shadow-md">
                      <span className="text-white font-bold rotate-[315deg]">3</span>
                    </div>
                    <div className="absolute top-[60%] left-[20%] w-10 h-10 bg-green-500 rounded-lg rotate-45 flex items-center justify-center shadow-md">
                      <span className="text-white font-bold rotate-[315deg]">5</span>
                    </div>
                  </div>
                </div>
              </AspectRatio>
              <p className="text-sm text-gray-600">Identifique facilmente onde há múltiplas entregas no mesmo local.</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="font-semibold text-lg mb-2">Status em Tempo Real</h3>
              <AspectRatio ratio={16/9} className="bg-gray-100 rounded-lg overflow-hidden mb-3">
                <div className="p-4 bg-white w-full h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Status da Rota</h4>
                    <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Em Progresso</div>
                  </div>
                  <div className="space-y-2 flex-grow">
                    <div className="p-2 border-l-4 border-green-500 bg-green-50 rounded">
                      <div className="text-xs text-gray-500">Entrega #125</div>
                      <div className="text-sm">Loja Conceito</div>
                      <div className="flex items-center mt-1">
                        <CheckCheck className="w-3 h-3 text-green-500 mr-1" />
                        <span className="text-xs text-green-700">Concluído às 10:23</span>
                      </div>
                    </div>
                    <div className="p-2 border-l-4 border-green-500 bg-green-50 rounded">
                      <div className="text-xs text-gray-500">Entrega #126</div>
                      <div className="text-sm">Supermercado Central</div>
                      <div className="flex items-center mt-1">
                        <CheckCheck className="w-3 h-3 text-green-500 mr-1" />
                        <span className="text-xs text-green-700">Concluído às 11:05</span>
                      </div>
                    </div>
                    <div className="p-2 border-l-4 border-blue-500 bg-blue-50 rounded">
                      <div className="text-xs text-gray-500">Entrega #127</div>
                      <div className="text-sm">Farmácia Popular</div>
                      <div className="flex items-center mt-1">
                        <Clock className="w-3 h-3 text-blue-500 mr-1" />
                        <span className="text-xs text-blue-700">Em andamento</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AspectRatio>
              <p className="text-sm text-gray-600">Acompanhe o status das entregas à medida que são realizadas.</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="font-semibold text-lg mb-2">Relatórios e Análises</h3>
              <AspectRatio ratio={16/9} className="bg-gray-100 rounded-lg overflow-hidden mb-3">
                <div className="bg-white w-full h-full p-4 flex flex-col">
                  <h4 className="text-sm font-semibold mb-2">Desempenho de Entregas</h4>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded p-2 flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-blue-600">94%</div>
                      <div className="text-xs text-gray-600">Entregas no prazo</div>
                    </div>
                    <div className="bg-green-50 rounded p-2 flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-green-600">85</div>
                      <div className="text-xs text-gray-600">Entregas hoje</div>
                    </div>
                    <div className="bg-purple-50 rounded p-2 flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-purple-600">28</div>
                      <div className="text-xs text-gray-600">min médio</div>
                    </div>
                    <div className="bg-amber-50 rounded p-2 flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-amber-600">12</div>
                      <div className="text-xs text-gray-600">km/entrega</div>
                    </div>
                  </div>
                </div>
              </AspectRatio>
              <p className="text-sm text-gray-600">Métricas detalhadas para melhorar continuamente suas operações.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Metrics */}
      <section className="py-20 bg-white">
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
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
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
      <section className="py-20 bg-gradient-to-r from-primary to-primary/90 text-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-6xl text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Pronto para revolucionar suas entregas?
            </h2>
            <p className="text-xl mb-8 opacity-90">
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
              <div className="flex items-center space-x-3 mb-4">
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-400 rounded transform rotate-45"></div>
                </div>
                <span className="text-xl font-bold text-white">RotaGo</span>
              </div>
              <p className="mb-4 text-gray-400 max-w-md">
                RotaGo é uma plataforma completa para gerenciamento e otimização de rotas de entrega,
                ajudando empresas de todos os tamanhos a entregar mais com menos recursos.
              </p>
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} RotaGo. Todos os direitos reservados.
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
