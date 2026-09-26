import LegalLayout, { Section, Bullets } from './LegalLayout';

const TermsOfService = () => (
  <LegalLayout title="Termos de Uso" updatedAt="25 de setembro de 2026">
    <p>
      Estes Termos de Uso regem o acesso e o uso do RotaGo, plataforma de organização e otimização
      de rotas de entrega, disponível pelo site <strong>rotago.site</strong> e pelo aplicativo para
      celular. Ao criar uma conta, você declara que leu e aceita estes termos.
    </p>

    <Section title="1. O que o RotaGo faz">
      <p>
        O RotaGo permite cadastrar endereços de entrega, calcular a melhor ordem de visita, navegar
        até cada parada, registrar o status e as fotos de cada entrega e consultar o histórico das
        rotas realizadas.
      </p>
      <p>
        O serviço é uma ferramenta de apoio. A rota sugerida é uma estimativa baseada em dados de
        mapas de terceiros e pode não refletir as condições reais de trânsito, bloqueios, obras ou
        restrições de circulação.
      </p>
    </Section>

    <Section title="2. Cadastro e conta">
      <Bullets
        items={[
          'Você precisa ter 18 anos ou mais e fornecer informações verdadeiras e atualizadas.',
          'Você é responsável por manter a confidencialidade da sua senha e por toda atividade realizada na sua conta.',
          'Avise-nos imediatamente em contato@rotago.site se suspeitar de uso não autorizado.',
          'Cada conta é individual. A revenda ou o compartilhamento de credenciais com terceiros não é permitido.',
        ]}
      />
    </Section>

    <Section title="3. Período de teste, planos e pagamento">
      <Bullets
        items={[
          'Oferecemos um período de teste gratuito de 10 dias, sem cobrança e sem necessidade de cartão para iniciar. Cupons promocionais podem estender esse período; o prazo concedido aparece no momento do resgate.',
          'Ao fim do teste, o acesso às funções pagas só continua com a contratação de um plano.',
          'A assinatura é mensal e renova automaticamente até que você cancele.',
          'Os pagamentos são processados pela Asaas. O RotaGo não armazena dados de cartão.',
          'Preços podem mudar. Qualquer reajuste será comunicado com pelo menos 30 dias de antecedência e só vale para os ciclos seguintes.',
        ]}
      />
    </Section>

    <Section title="4. Cancelamento e reembolso">
      <p>
        Você pode cancelar a assinatura a qualquer momento pelo próprio aplicativo ou escrevendo
        para <strong>contato@rotago.site</strong>. O cancelamento interrompe as renovações futuras e
        o acesso continua até o fim do período já pago.
      </p>
      <p>
        Conforme o artigo 49 do Código de Defesa do Consumidor, você pode desistir da contratação em
        até <strong>7 dias corridos</strong> a contar do pagamento e receber o reembolso integral.
      </p>
    </Section>

    <Section title="5. Uso aceitável">
      <p>Ao usar o RotaGo, você concorda em não:</p>
      <Bullets
        items={[
          'Usar a plataforma para qualquer atividade ilegal ou para transportar itens proibidos por lei.',
          'Cadastrar dados pessoais de terceiros sem base legal para isso.',
          'Tentar burlar limites de uso, acessar contas alheias ou explorar falhas de segurança.',
          'Fazer engenharia reversa, copiar ou redistribuir partes da plataforma.',
          'Sobrecarregar a infraestrutura com automações ou requisições em massa não autorizadas.',
        ]}
      />
      <p>
        Podemos suspender ou encerrar contas que violem estas regras, com aviso prévio sempre que
        for possível.
      </p>
    </Section>

    <Section title="6. Responsabilidade do usuário no trânsito">
      <p>
        A responsabilidade pela condução do veículo e pelo cumprimento das leis de trânsito é
        inteiramente sua. <strong>Não manuseie o aplicativo enquanto dirige.</strong> O RotaGo não
        se responsabiliza por multas, acidentes, atrasos ou prejuízos decorrentes do uso do
        aplicativo durante a condução.
      </p>
    </Section>

    <Section title="7. Disponibilidade do serviço">
      <p>
        Trabalhamos para manter a plataforma disponível de forma contínua, mas o serviço é oferecido
        no estado em que se encontra. Pode haver interrupções para manutenção, falhas de provedores
        externos (mapas, pagamentos, mensageria) ou indisponibilidade da sua conexão. Não garantimos
        operação ininterrupta ou livre de erros.
      </p>
    </Section>

    <Section title="8. Limitação de responsabilidade">
      <p>
        Na máxima extensão permitida pela lei brasileira, a responsabilidade do RotaGo por qualquer
        reclamação relacionada ao serviço fica limitada ao valor efetivamente pago por você nos 12
        meses anteriores ao fato. Não respondemos por lucros cessantes, perda de clientes ou danos
        indiretos.
      </p>
    </Section>

    <Section title="9. Propriedade intelectual">
      <p>
        O nome RotaGo, a marca, o código-fonte, a interface e todo o material da plataforma são de
        nossa propriedade. Os dados que você cadastra — endereços, rotas, fotos e anotações —
        continuam sendo seus; você apenas nos autoriza a processá-los para prestar o serviço.
      </p>
    </Section>

    <Section title="10. Privacidade">
      <p>
        O tratamento dos seus dados pessoais é descrito na nossa{' '}
        <a href="/privacidade" className="text-brand-600 underline">Política de Privacidade</a>, que é
        parte integrante destes termos.
      </p>
    </Section>

    <Section title="11. Alterações nos termos">
      <p>
        Podemos alterar estes termos a qualquer momento. Mudanças relevantes serão comunicadas por
        e-mail ou dentro do aplicativo com antecedência razoável. Continuar usando o RotaGo após a
        alteração significa que você aceita a nova versão.
      </p>
    </Section>

    <Section title="12. Lei aplicável e foro">
      <p>
        Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro do
        domicílio do consumidor para dirimir eventuais controvérsias.
      </p>
    </Section>

    <Section title="13. Contato">
      <p>
        Dúvidas sobre estes termos: <strong>contato@rotago.site</strong>.
      </p>
    </Section>
  </LegalLayout>
);

export default TermsOfService;
