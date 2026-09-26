// Templates dos e-mails de autenticação do RotaGo.
//
// HTML em tabelas e estilos inline, que é o que Gmail, Outlook e Apple Mail
// renderizam de forma consistente. Todo e-mail tem também versão em texto
// puro, o que melhora a entrega e a leitura em clientes sem HTML.

export const SITE_URL = 'https://rotago.site';
export const SUPPORT_EMAIL = 'contato@rotago.site';

const C = {
  brand: '#16a34a',
  brandDark: '#15803d',
  accent: '#2563eb',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f1f5f9',
  card: '#ffffff',
  soft: '#f8fafc',
  warnBg: '#fff7ed',
  warnBorder: '#fed7aa',
  warnText: '#9a3412',
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export type Email = { subject: string; html: string; text: string };

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function greeting(name: string) {
  return name ? `Olá, ${escapeHtml(name)}!` : 'Olá!';
}

function paragraph(html: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${C.text}">${html}</p>`;
}

function button(link: string, label: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0">
    <tr>
      <td align="center" bgcolor="${C.brand}" style="border-radius:10px">
        <a href="${link}" target="_blank"
           style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;background:${C.brand}">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function fallbackLink(link: string) {
  return `
  <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:${C.muted}">
    Se o botão não funcionar, copie e cole este endereço no navegador:
  </p>
  <p style="margin:0 0 8px;font-size:12px;line-height:18px;word-break:break-all">
    <a href="${link}" style="color:${C.accent};text-decoration:underline">${link}</a>
  </p>`;
}

function notice(html: string) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px">
    <tr>
      <td style="background:${C.warnBg};border:1px solid ${C.warnBorder};border-radius:10px;padding:14px 16px;font-size:13px;line-height:20px;color:${C.warnText}">
        ${html}
      </td>
    </tr>
  </table>`;
}

function features(items: Array<[string, string]>) {
  const rows = items
    .map(
      ([title, desc]) => `
      <tr>
        <td valign="top" style="padding:0 12px 14px 0;width:22px">
          <div style="width:22px;height:22px;border-radius:11px;background:${C.brand};color:#fff;font-size:13px;line-height:22px;text-align:center;font-weight:700">&#10003;</div>
        </td>
        <td valign="top" style="padding:0 0 14px;font-size:14px;line-height:21px;color:${C.text}">
          <strong>${title}</strong><br><span style="color:${C.muted}">${desc}</span>
        </td>
      </tr>`,
    )
    .join('');
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin:8px 0 8px;background:${C.soft};border:1px solid ${C.border};border-radius:12px">
    <tr><td style="padding:20px 20px 6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
    </td></tr>
  </table>`;
}

function divider() {
  return `<div style="height:1px;background:${C.border};margin:28px 0 20px;line-height:1px;font-size:1px">&nbsp;</div>`;
}

function layout(opts: { preheader: string; title: string; body: string }) {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
    ${escapeHtml(opts.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg}">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:${FONT}">
          <tr>
            <td style="padding:0 4px 20px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle"><img src="cid:rotago-logo" width="40" height="40" alt="RotaGo" style="display:block;border:0;border-radius:10px"></td>
                  <td valign="middle" style="padding-left:10px;font-size:22px;font-weight:800;letter-spacing:-0.3px;color:${C.text}">Rota<span style="color:${C.brand}">Go</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:${C.card};border:1px solid ${C.border};border-radius:16px;overflow:hidden">
              <div style="height:4px;background:${C.brand};background-image:linear-gradient(90deg,${C.brand},${C.accent});line-height:4px;font-size:4px">&nbsp;</div>
              <div style="padding:36px 36px 32px">
                <h1 style="margin:0 0 20px;font-size:24px;line-height:32px;font-weight:800;color:${C.text};letter-spacing:-0.3px">${opts.title}</h1>
                ${opts.body}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0;text-align:center;font-size:12px;line-height:19px;color:${C.muted}">
              Precisa de ajuda? Responda este e-mail ou escreva para
              <a href="mailto:${SUPPORT_EMAIL}" style="color:${C.muted};text-decoration:underline">${SUPPORT_EMAIL}</a>.<br>
              <a href="${SITE_URL}" style="color:${C.muted};text-decoration:none;font-weight:600">rotago.site</a>
              &nbsp;·&nbsp; Rotas inteligentes para quem entrega<br>
              © ${year} RotaGo. Você recebeu este e-mail por causa de uma ação na sua conta.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function textFooter() {
  return `\n\n—\nRotaGo · ${SITE_URL}\nDúvidas: ${SUPPORT_EMAIL}`;
}

export function welcomeEmail(name: string, link: string, trialDays: number): Email {
  const trial = trialDays > 0 ? `${trialDays} dias grátis` : 'período de teste';
  return {
    subject: 'Bem-vindo ao RotaGo! Confirme seu e-mail para começar',
    html: layout({
      preheader: `Sua conta foi criada. Confirme seu e-mail e aproveite ${trial}.`,
      title: 'Sua conta está quase pronta',
      body: `
        ${paragraph(greeting(name))}
        ${paragraph(`Que bom ter você no <strong>RotaGo</strong>. Sua conta foi criada e seu teste de <strong>${trial}</strong> já está reservado. Falta só confirmar que este e-mail é seu:`)}
        ${button(link, 'Confirmar meu e-mail')}
        ${paragraph('<strong>O que você pode fazer a partir de agora:</strong>')}
        ${features([
          ['Rotas otimizadas em segundos', 'Cadastre as entregas e o RotaGo calcula a melhor sequência.'],
          ['Menos quilômetros, mais entregas', 'Economize combustível e tempo em cada saída.'],
          ['Tudo no celular', 'Navegue parada por parada e marque cada entrega concluída.'],
        ])}
        ${notice('Por segurança, este link só pode ser usado uma vez e expira em breve. Se ele expirar, é só pedir um novo na tela de login.')}
        ${divider()}
        ${fallbackLink(link)}
        <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:${C.muted}">Não criou uma conta no RotaGo? Ignore este e-mail: nada será ativado sem a confirmação.</p>`,
    }),
    text:
      `${name ? `Olá, ${name}!` : 'Olá!'}\n\n` +
      `Que bom ter você no RotaGo. Sua conta foi criada e seu teste de ${trial} já está reservado.\n\n` +
      `Confirme seu e-mail neste link:\n${link}\n\n` +
      `Por segurança, o link só pode ser usado uma vez e expira em breve.\n` +
      `Não criou uma conta no RotaGo? Ignore este e-mail.` +
      textFooter(),
  };
}

export function confirmEmail(name: string, link: string): Email {
  return {
    subject: 'Confirme seu e-mail no RotaGo',
    html: layout({
      preheader: 'Aqui está o novo link para confirmar seu e-mail.',
      title: 'Confirme seu e-mail',
      body: `
        ${paragraph(greeting(name))}
        ${paragraph('Você pediu um novo link de confirmação. Clique no botão abaixo para ativar sua conta e entrar no RotaGo:')}
        ${button(link, 'Confirmar e entrar')}
        ${notice('Este link só pode ser usado uma vez e expira em breve. Links enviados antes deste deixam de valer.')}
        ${divider()}
        ${fallbackLink(link)}
        <p style="margin:16px 0 0;font-size:13px;line-height:20px;color:${C.muted}">Não foi você? Pode ignorar este e-mail com segurança.</p>`,
    }),
    text:
      `${name ? `Olá, ${name}!` : 'Olá!'}\n\n` +
      `Você pediu um novo link de confirmação. Acesse:\n${link}\n\n` +
      `O link só pode ser usado uma vez e expira em breve.\nNão foi você? Ignore este e-mail.` +
      textFooter(),
  };
}

export function recoveryEmail(name: string, link: string): Email {
  return {
    subject: 'Redefinição de senha do RotaGo',
    html: layout({
      preheader: 'Recebemos um pedido para redefinir sua senha.',
      title: 'Redefinir sua senha',
      body: `
        ${paragraph(greeting(name))}
        ${paragraph('Recebemos um pedido para redefinir a senha da sua conta no RotaGo. Clique no botão abaixo para criar uma nova senha:')}
        ${button(link, 'Criar nova senha')}
        ${notice('<strong>Não pediu isso?</strong> Ignore este e-mail: sua senha atual continua valendo e ninguém consegue alterá-la sem este link. O link só pode ser usado uma vez e expira em breve.')}
        ${divider()}
        ${fallbackLink(link)}`,
    }),
    text:
      `${name ? `Olá, ${name}!` : 'Olá!'}\n\n` +
      `Recebemos um pedido para redefinir a senha da sua conta no RotaGo.\n\n` +
      `Crie uma nova senha neste link:\n${link}\n\n` +
      `Não pediu isso? Ignore este e-mail: sua senha atual continua valendo.\n` +
      `O link só pode ser usado uma vez e expira em breve.` +
      textFooter(),
  };
}

export function passwordChangedEmail(name: string, when: Date): Email {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(when);
  const recover = `${SITE_URL}/auth/forgot-password`;
  return {
    subject: 'Sua senha do RotaGo foi alterada',
    html: layout({
      preheader: `A senha da sua conta foi alterada em ${formatted}.`,
      title: 'Senha alterada com sucesso',
      body: `
        ${paragraph(greeting(name))}
        ${paragraph(`A senha da sua conta no RotaGo foi alterada em <strong>${formatted}</strong> (horário de Brasília).`)}
        ${paragraph('Se foi você, está tudo certo e não precisa fazer mais nada.')}
        ${notice(`<strong>Não reconhece esta alteração?</strong> Redefina sua senha agora mesmo e fale com a gente em <a href="mailto:${SUPPORT_EMAIL}" style="color:${C.warnText}">${SUPPORT_EMAIL}</a>.`)}
        ${button(recover, 'Redefinir minha senha')}`,
    }),
    text:
      `${name ? `Olá, ${name}!` : 'Olá!'}\n\n` +
      `A senha da sua conta no RotaGo foi alterada em ${formatted} (horário de Brasília).\n\n` +
      `Se foi você, não precisa fazer nada.\n` +
      `Não reconhece esta alteração? Redefina sua senha em ${recover} e fale com a gente em ${SUPPORT_EMAIL}.` +
      textFooter(),
  };
}
