/**
 * E-mail. Resend in productie, console tijdens ontwikkelen — zodat je zonder
 * API-sleutel toch de verificatielinks ziet.
 */
export async function sendMail(args: { to: string; subject: string; text: string; html?: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? 'Verblyf <boekingen@verblyf.com>';

  if (!key) {
    console.info('[mail] (geen RESEND_API_KEY, niet verzonden)\n', args.to, '\n', args.subject, '\n', args.text);
    return { delivered: false };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: args.to, subject: args.subject, text: args.text, html: args.html }),
  });

  if (!res.ok) console.error('[mail] verzenden mislukt', await res.text());
  return { delivered: res.ok };
}
