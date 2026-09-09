import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { hasDatabase, prisma } from './db';

/**
 * Accounts.
 *
 * Better Auth in plaats van Auth.js: sessies staan in onze eigen database, dus
 * een account uitloggen of blokkeren is één rij verwijderen. Bij een JWT-opzet
 * blijft een gestolen token geldig tot hij verloopt — bij een boekingsplatform
 * met opgeslagen betaalgegevens is dat het risico niet waard.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  // In demo-modus (geen database) staan accounts uit; Better Auth wil dan toch
  // een waarde zien om te kunnen initialiseren. Zodra er een database is, is
  // BETTER_AUTH_SECRET verplicht — anders weigert de app te starten.
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (hasDatabase
      ? (() => {
          throw new Error('BETTER_AUTH_SECRET ontbreekt. Genereer er een met: openssl rand -base64 32');
        })()
      : 'demo-modus-accounts-staan-uit'),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const { sendMail } = await import('./mail');
      await sendMail({
        to: user.email,
        subject: 'Je wachtwoord opnieuw instellen',
        text: `Stel je wachtwoord in via ${url}. Deze link verloopt over een uur. Heb je dit niet aangevraagd, dan hoef je niets te doen.`,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { sendMail } = await import('./mail');
      await sendMail({
        to: user.email,
        subject: 'Bevestig je e-mailadres',
        text: `Welkom bij Verblyf. Bevestig je e-mailadres via ${url} — daarna kun je je boekingen terugvinden en favorieten bewaren.`,
      });
    },
  },

  // Alleen aanmelden wat daadwerkelijk is ingesteld: een provider met een lege
  // clientId laat Better Auth al bij het opstarten struikelen.
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? {
          apple: {
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: process.env.APPLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  user: {
    additionalFields: {
      phone: { type: 'string', required: false },
      countryCode: { type: 'string', required: false, defaultValue: 'NL' },
      marketingOptIn: { type: 'boolean', required: false, defaultValue: false },
    },
  },

  advanced: {
    cookiePrefix: 'verblyf',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
});

export type Session = typeof auth.$Infer.Session;
