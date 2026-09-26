import LegalLayout, { Section, Bullets } from './LegalLayout';

const SUPPORT_EMAIL = 'contato@rotago.site';

const DeleteAccount = () => (
  <LegalLayout title="Excluir sua conta e seus dados" updatedAt="25 de setembro de 2026">
    <p>
      Esta página explica como solicitar a exclusão da sua conta do <strong>RotaGo</strong>
      {' '}(aplicativo <strong>com.rotafacil.turbo</strong>) e de todos os dados associados a ela.
    </p>

    <Section title="Como solicitar a exclusão">
      <p>
        Envie um e-mail para <strong>{SUPPORT_EMAIL}</strong> com o assunto
        {' '}<strong>&quot;Excluir minha conta&quot;</strong>, a partir do mesmo endereço de e-mail
        cadastrado no RotaGo.
      </p>
      <p>
        Usamos o endereço remetente para confirmar que o pedido partiu mesmo do titular da conta. Se
        você não tiver mais acesso a esse e-mail, informe o telefone cadastrado para que possamos
        validar sua identidade por outro meio.
      </p>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="m-0">
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Excluir%20minha%20conta&body=Solicito%20a%20exclus%C3%A3o%20da%20minha%20conta%20no%20RotaGo%20e%20de%20todos%20os%20dados%20associados%20a%20ela.`}
            className="text-brand-600 underline font-medium"
          >
            Abrir um e-mail de solicitação já preenchido
          </a>
        </p>
      </div>
    </Section>

    <Section title="Prazo">
      <p>
        Confirmamos o recebimento em até <strong>2 dias úteis</strong> e concluímos a exclusão em até
        <strong> 30 dias</strong> a partir da confirmação. Assim que o processo começa, sua conta é
        desativada e o acesso ao aplicativo é encerrado.
      </p>
    </Section>

    <Section title="O que é excluído">
      <Bullets
        items={[
          'Sua conta e as credenciais de acesso.',
          'Nome, e-mail, telefone e demais dados de cadastro.',
          'Endereços de entrega, paradas, anotações e status cadastrados por você.',
          'Todo o histórico de rotas.',
          'Fotos e comprovantes de entrega enviados por você.',
          'Dados de localização armazenados.',
        ]}
      />
    </Section>

    <Section title="O que é mantido, e por quê">
      <p>
        Alguns registros não podem ser apagados imediatamente porque a legislação brasileira exige
        que sejam conservados:
      </p>
      <Bullets
        items={[
          <><strong>Registros fiscais e financeiros</strong> de assinaturas e pagamentos — mantidos por até 5 anos, conforme a legislação tributária e o Código de Defesa do Consumidor.</>,
          <><strong>Registros de acesso à aplicação</strong> — mantidos por 6 meses, conforme o artigo 15 do Marco Civil da Internet (Lei nº 12.965/2014).</>,
        ]}
      />
      <p>
        Esses registros ficam isolados, são usados apenas para cumprir obrigações legais e são
        eliminados ao fim do prazo.
      </p>
    </Section>

    <Section title="Antes de excluir">
      <p>
        A exclusão é <strong>permanente e não pode ser desfeita</strong>. Se quiser guardar o
        histórico das suas rotas, exporte os dados pelo aplicativo antes de solicitar.
      </p>
      <p>
        Se você tiver uma assinatura ativa, ela é cancelada junto com a conta. Cancelar a assinatura
        sozinha não exclui os seus dados — são pedidos diferentes.
      </p>
    </Section>

    <Section title="Dúvidas">
      <p>
        Fale com a gente em <strong>{SUPPORT_EMAIL}</strong>. Para entender como tratamos seus dados,
        veja a{' '}
        <a href="/privacidade" className="text-brand-600 underline">Política de Privacidade</a>.
      </p>
    </Section>
  </LegalLayout>
);

export default DeleteAccount;
