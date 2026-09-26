import LegalLayout, { Section, Bullets } from './LegalLayout';

const PrivacyPolicy = () => (
  <LegalLayout title="Política de Privacidade" updatedAt="25 de setembro de 2026">
    <p>
      Esta Política de Privacidade explica como o RotaGo coleta, usa, armazena e protege os dados
      pessoais de quem usa nosso aplicativo e nosso site em <strong>rotago.site</strong>. Ela foi
      escrita de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
    </p>
    <p>Ao criar uma conta e usar o RotaGo, você concorda com as práticas descritas aqui.</p>

    <Section title="1. Quem é o controlador dos seus dados">
      <p>
        O RotaGo é o controlador dos dados pessoais tratados na plataforma. Para qualquer questão
        relacionada à privacidade, incluindo o exercício dos seus direitos como titular, entre em
        contato pelo e-mail <strong>contato@rotago.site</strong>.
      </p>
    </Section>

    <Section title="2. Quais dados coletamos">
      <p>Coletamos apenas o necessário para o aplicativo funcionar:</p>
      <Bullets
        items={[
          <><strong>Dados de cadastro:</strong> nome, e-mail, telefone e senha (armazenada de forma criptografada, nunca em texto legível).</>,
          <><strong>Dados de localização:</strong> a localização do seu dispositivo, incluindo localização precisa por GPS, usada para calcular e otimizar rotas, mostrar sua posição no mapa e acompanhar o progresso das entregas.</>,
          <><strong>Endereços de entrega:</strong> os endereços e pontos de parada que você cadastra ou importa, junto com anotações, status e horários de entrega.</>,
          <><strong>Fotos e imagens:</strong> fotos tiradas pela câmera ou escolhidas da galeria, quando você registra um comprovante de entrega ou digitaliza uma lista de endereços.</>,
          <><strong>Dados de pagamento e assinatura:</strong> plano contratado, status e histórico da assinatura. Os dados do cartão são processados diretamente pelos nossos parceiros de pagamento — o RotaGo não recebe nem armazena números de cartão.</>,
          <><strong>Dados técnicos:</strong> identificadores do dispositivo, versão do aplicativo, sistema operacional e registros de erro, usados para diagnosticar problemas.</>,
        ]}
      />
    </Section>

    <Section title="3. Como usamos esses dados">
      <Bullets
        items={[
          'Criar e autenticar sua conta.',
          'Calcular, ordenar e otimizar rotas de entrega.',
          'Exibir mapas, trajetos e a sua posição em tempo real durante uma rota.',
          'Guardar o histórico das suas rotas para consulta posterior.',
          'Processar assinaturas, cobranças e renovações.',
          'Enviar comunicações operacionais por e-mail e WhatsApp, como confirmação de cadastro, avisos de vencimento do período de teste e da assinatura, e redefinição de senha.',
          'Prestar suporte, corrigir falhas e melhorar o desempenho do aplicativo.',
          'Cumprir obrigações legais e regulatórias.',
        ]}
      />
      <p>
        <strong>Não vendemos seus dados pessoais</strong> e não usamos sua localização ou suas fotos
        para publicidade.
      </p>
    </Section>

    <Section title="4. Uso da localização">
      <p>
        A localização é o dado mais sensível que tratamos, então detalhamos o uso dela separadamente.
        O RotaGo solicita acesso à localização precisa do dispositivo para traçar rotas a partir de
        onde você está, ordenar as paradas pela distância real e mostrar seu avanço no mapa enquanto
        você dirige.
      </p>
      <p>
        A coleta acontece <strong>apenas enquanto o aplicativo está em uso</strong>. Você pode negar
        ou revogar essa permissão a qualquer momento nas configurações do seu aparelho; nesse caso,
        as funções de mapa e otimização automática deixarão de funcionar, mas o restante do
        aplicativo continua disponível.
      </p>
    </Section>

    <Section title="5. Uso da câmera e das fotos">
      <p>
        O acesso à câmera e à galeria é usado somente quando você escolhe registrar um comprovante de
        entrega ou importar uma lista de endereços por imagem. As fotos ficam vinculadas à entrega
        correspondente na sua conta e não são compartilhadas com outros usuários.
      </p>
    </Section>

    <Section title="6. Com quem compartilhamos dados">
      <p>
        Compartilhamos dados apenas com prestadores de serviço necessários para operar a plataforma,
        e apenas na medida do necessário:
      </p>
      <Bullets
        items={[
          <><strong>Supabase</strong> — hospedagem do banco de dados e autenticação.</>,
          <><strong>Mapbox</strong> — mapas, geocodificação de endereços e cálculo de rotas.</>,
          <><strong>Asaas</strong> — processamento de pagamentos e assinaturas.</>,
          <><strong>Resend</strong> — envio de e-mails transacionais.</>,
          <>Provedores de mensageria para o envio de notificações por <strong>WhatsApp</strong>.</>,
        ]}
      />
      <p>
        Também poderemos compartilhar dados quando houver obrigação legal, ordem judicial ou
        requisição de autoridade competente.
      </p>
    </Section>

    <Section title="7. Por quanto tempo guardamos">
      <p>
        Mantemos seus dados enquanto sua conta estiver ativa. Se você excluir a conta, os dados
        pessoais, rotas, endereços e fotos são apagados em até 30 dias, com exceção dos registros
        fiscais e financeiros, que a legislação brasileira exige que sejam mantidos por até 5 anos.
      </p>
    </Section>

    <Section title="8. Segurança">
      <p>
        Usamos criptografia em trânsito (HTTPS), senhas com hash, autenticação por token e regras de
        acesso no banco de dados que isolam os dados de cada conta. Ainda assim, nenhum sistema é
        totalmente imune a incidentes; se ocorrer um vazamento que possa trazer risco relevante a
        você, comunicaremos você e a Autoridade Nacional de Proteção de Dados, como determina a LGPD.
      </p>
    </Section>

    <Section title="9. Seus direitos">
      <p>Pela LGPD, você pode, a qualquer momento:</p>
      <Bullets
        items={[
          'Confirmar que tratamos seus dados e pedir acesso a eles.',
          'Corrigir dados incompletos, inexatos ou desatualizados.',
          'Pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou excessivos.',
          'Solicitar a portabilidade dos seus dados a outro fornecedor.',
          'Revogar o consentimento e solicitar a exclusão da conta.',
          'Ser informado sobre com quem compartilhamos seus dados.',
        ]}
      />
      <p>
        Para exercer qualquer um desses direitos, escreva para <strong>contato@rotago.site</strong>.
        Respondemos em até 15 dias. Para excluir sua conta, veja a página{' '}
        <a href="/excluir-conta" className="text-brand-600 underline">Excluir conta</a>.
      </p>
    </Section>

    <Section title="10. Crianças e adolescentes">
      <p>
        O RotaGo é uma ferramenta profissional e não se destina a menores de 18 anos. Não coletamos
        intencionalmente dados de crianças ou adolescentes.
      </p>
    </Section>

    <Section title="11. Alterações nesta política">
      <p>
        Podemos atualizar esta política para refletir mudanças no aplicativo ou na legislação. A data
        no topo da página indica a última revisão. Mudanças relevantes serão comunicadas por e-mail
        ou dentro do aplicativo.
      </p>
    </Section>

    <Section title="12. Contato">
      <p>
        Dúvidas, solicitações ou reclamações sobre privacidade:{' '}
        <strong>contato@rotago.site</strong>.
      </p>
    </Section>
  </LegalLayout>
);

export default PrivacyPolicy;
