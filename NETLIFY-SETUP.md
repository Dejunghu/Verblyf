# Verblyf online zetten

## 1. Repo op GitHub

De code staat al in een git-repo met één commit. Zodra ik een token heb, doe ik:

```
gh repo create verblyf --private --source=. --remote=origin
git push -u origin main
```

## 2. Netlify koppelen

Netlify → **Add new site** → **Import an existing project** → **GitHub** → `verblyf`.

Build-instellingen hoef je niet in te vullen: `netlify.toml` staat in de repo en
regelt het commando, de publicatiemap en de Next.js-runtime.

## 3. Omgevingsvariabelen in Netlify

Site configuration → Environment variables. Zonder deze waarden draait de site
in **demo-modus**: zoeken, hotelpagina's en fotobeheer werken, accounts en
betalingen niet. Dat is een prima eerste versie.

| Variabele | Nodig voor | Waar vandaan |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | overal | je Netlify-domein, bv. `https://verblyf.netlify.app` |
| `ACTIVE_SUPPLIERS` | zoeken | `mock` om te beginnen, later `mock,liteapi` |
| `LITEAPI_KEY` | echte hotels + foto's | liteapi.travel, gratis sleutel |
| `DATABASE_URL` | accounts, boekingen | Neon, gratis Postgres |
| `BETTER_AUTH_SECRET` | accounts | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | accounts | zelfde als je domein |
| `GOOGLE_CLIENT_ID` / `_SECRET` | inloggen met Google | console.cloud.google.com |
| `APPLE_CLIENT_ID` / `_SECRET` | inloggen met Apple | developer.apple.com (betaald account) |
| `STRIPE_SECRET_KEY` | betalen | dashboard.stripe.com |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | betalen | idem |
| `STRIPE_WEBHOOK_SECRET` | boeking bevestigen | webhook op `/api/webhooks/stripe` |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | foto's uploaden | cloudinary.com |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | foto's tonen | zelfde cloud name |
| `RESEND_API_KEY` | bevestigingsmails | resend.com |

Na het toevoegen van `DATABASE_URL` één keer draaien:

```
npx prisma migrate deploy
```

## 4. Wat er automatisch gebeurt

- **Elke push naar `main`** → Netlify bouwt en zet live, ongeveer twee minuten.
- **Elke pull request** → Netlify maakt een preview-URL, zodat je een wijziging
  live ziet voordat hij naar productie gaat.
- **Elke maandag 06:00 UTC** → GitHub Actions draait build, typecheck, `npm audit`
  en Lighthouse. Faalt er iets, dan zie je het in de Actions-tab.
- **Elke maandag 08:00** → Claude doet de inhoudelijke analyse (techniek, SEO,
  conversie) en stuurt je een rapport.

Zet in de repo onder Settings → Secrets and variables → Actions → Variables een
`SITE_URL` naar je Netlify-domein, dan meet Lighthouse de echte site.
