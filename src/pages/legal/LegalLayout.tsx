import React from 'react';
import { Link } from 'react-router-dom';

interface LegalLayoutProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

const LegalLayout = ({ title, updatedAt, children }: LegalLayoutProps) => {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-3xl py-5">
          <Link to="/" className="flex items-center space-x-3 w-fit">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-400 rounded transform rotate-45"></div>
            </div>
            <span className="text-xl font-bold text-gray-900">RotaGo</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 lg:px-8 max-w-3xl py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-10">Última atualização: {updatedAt}</p>
        <div className="legal-content space-y-6 text-gray-700 leading-relaxed">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-200 mt-8">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-3xl py-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-gray-900 transition-colors">Início</Link>
          <Link to="/privacidade" className="hover:text-gray-900 transition-colors">Privacidade</Link>
          <Link to="/termos" className="hover:text-gray-900 transition-colors">Termos de Uso</Link>
          <Link to="/excluir-conta" className="hover:text-gray-900 transition-colors">Excluir conta</Link>
        </div>
      </footer>
    </div>
  );
};

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">{title}</h2>
    <div className="space-y-3">{children}</div>
  </section>
);

export const Bullets = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="list-disc pl-6 space-y-2">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

export default LegalLayout;
