/**
 * Kontaktformular - nimmt eine Nachricht entgegen und stellt sie per Resend zu.
 *
 * Web-Standard-Signatur (statt (req, res) wie in den uebrigen Routen), weil
 * checkBotId() den Request-Kontext dieser Aufrufform braucht.
 */
import { checkBotId } from 'botid/server';
import { Resend } from 'resend';

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;

export async function POST(request) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return Response.json({ error: 'Zugriff verweigert.' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Ungueltiger Anfragekoerper.' }, { status: 400 });
  }

  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const message = String(body?.message ?? '').trim();

  const problem = validate({ name, email, message });
  if (problem) {
    return Response.json({ error: problem }, { status: 400 });
  }

  const to = process.env.CONTACT_TO;
  const domain = process.env.RESEND_EMAIL_DOMAIN;
  const apiKey = process.env.RESEND_API_KEY;

  if (!to || !domain || !apiKey) {
    console.error('contact: Konfiguration unvollstaendig', {
      hasTo: Boolean(to), hasDomain: Boolean(domain), hasKey: Boolean(apiKey),
    });
    return Response.json({ error: 'Versand ist nicht konfiguriert.' }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  // Absender muss auf der verifizierten Domain liegen - die Adresse des
  // Absenders steht nur in replyTo, sonst wuerde die Mail als Spoofing gelten
  const { data, error } = await resend.emails.send({
    from: `KilowattWerk Kontakt <kontakt@${domain}>`,
    to: [to],
    replyTo: email,
    subject: `Kontaktanfrage von ${name}`,
    text: [
      `Name:    ${name}`,
      `E-Mail:  ${email}`,
      '',
      message,
    ].join('\n'),
  });

  if (error) {
    console.error('contact: Versand fehlgeschlagen', error);
    return Response.json({ error: 'Nachricht konnte nicht gesendet werden.' }, { status: 502 });
  }

  return Response.json({ id: data?.id ?? null }, { status: 200 });
}

function validate({ name, email, message }) {
  if (!name) return 'Bitte gib deinen Namen an.';
  if (name.length > MAX_NAME) return 'Der Name ist zu lang.';

  if (!email) return 'Bitte gib deine E-Mail-Adresse an.';
  if (email.length > MAX_EMAIL) return 'Die E-Mail-Adresse ist zu lang.';
  // bewusst grob: strenge Regeln lehnen gueltige Adressen ab, zugestellt wird ohnehin nichts
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Die E-Mail-Adresse sieht nicht gueltig aus.';

  if (!message) return 'Bitte schreib eine Nachricht.';
  if (message.length > MAX_MESSAGE) return 'Die Nachricht ist zu lang.';

  return null;
}
