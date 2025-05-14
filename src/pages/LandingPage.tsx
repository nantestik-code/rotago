
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight, Map, Truck, Clock, BarChart4, LucideShield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth/signup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="px-4 py-6 md:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Truck className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">RotaFacil</span>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/auth/login')}>Entrar</Button>
          <Button onClick={() => navigate('/auth/signup')}>Cadastrar</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-16 md:py-24 md:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Otimize suas entregas com o RotaFacil
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              A plataforma completa para gerenciar e otimizar rotas de entrega, economizando tempo e combustível.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <Button size="lg" onClick={handleGetStarted} className="px-8">
                Começar Grátis <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => toast({
                title: "Demonstração em vídeo",
                description: "Recurso em desenvolvimento. Em breve você poderá assistir a um vídeo demonstrativo!",
              })}>
                Ver demonstração
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Grátis durante o período de desenvolvimento. Cadastre-se agora!
            </p>
          </div>
          <div className="order-first md:order-last flex justify-center">
            <div className="bg-white p-3 rounded-lg shadow-xl w-full max-w-md">
              <img 
                src="/placeholder.svg" 
                alt="RotaFacil Dashboard" 
                className="w-full h-auto rounded border" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 md:py-24 bg-white md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Recursos que facilitam sua logística
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Map className="h-10 w-10 text-primary" />}
              title="Rotas Inteligentes"
              description="Otimize suas entregas com algoritmos avançados que encontram o melhor caminho, economizando tempo e combustível."
            />
            <FeatureCard 
              icon={<Truck className="h-10 w-10 text-primary" />}
              title="Controle de Entregas"
              description="Acompanhe o status de cada entrega em tempo real, com atualizações automáticas e notificações."
            />
            <FeatureCard 
              icon={<Clock className="h-10 w-10 text-primary" />}
              title="Economia de Tempo"
              description="Reduza o tempo gasto com planejamento e logística, focando no que realmente importa: seu negócio."
            />
            <FeatureCard 
              icon={<BarChart4 className="h-10 w-10 text-primary" />}
              title="Estatísticas Detalhadas"
              description="Acesse relatórios e métricas sobre suas entregas para tomar decisões melhores e mais informadas."
            />
            <FeatureCard 
              icon={<LucideShield className="h-10 w-10 text-primary" />}
              title="Segurança"
              description="Seus dados estão protegidos com as mais modernas tecnologias de criptografia e segurança."
            />
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg shadow-sm border border-primary/20 flex flex-col items-center text-center">
              <span className="text-2xl font-bold text-primary mb-2">100% Grátis</span>
              <p className="text-gray-700">
                Durante o desenvolvimento, todos os recursos estão disponíveis gratuitamente. Cadastre-se agora!
              </p>
              <Button 
                onClick={handleGetStarted}
                className="mt-4"
              >
                Começar agora
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials (future) */}
      <section className="px-4 py-16 md:py-24 bg-gray-50 md:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Junte-se aos primeiros usuários
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Seja um dos primeiros a experimentar o RotaFacil e ajude a moldar o futuro da plataforma.
            Os primeiros usuários terão benefícios exclusivos quando lançarmos oficialmente.
          </p>
          <Button size="lg" onClick={handleGetStarted} className="px-8">
            Começar Grátis <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 bg-gray-900 text-gray-300 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Truck className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-white">RotaFacil</span>
            </div>
            <p className="mb-4">
              Otimizando rotas e entregas para empresas de todos os tamanhos.
            </p>
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} RotaFacil. Todos os direitos reservados.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Recursos</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-primary transition-colors">Otimização de Rotas</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Controle de Entregas</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Relatórios</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Contato</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-primary transition-colors">Suporte</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Vendas</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export default LandingPage;
