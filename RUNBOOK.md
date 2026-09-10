# Runbook — Verblyf

Werkinstructie voor elke sessie die aan Verblyf werkt, inclusief de wekelijkse
analyse. De container waarin die sessie draait kan **niet** met git bij GitHub;
lezen kan wel via `raw.githubusercontent.com`, en deployen kan via de
Netlify-connector. Hieronder staat precies hoe.

## 1. Code ophalen

```bash
mkdir -p ~/verblyf && cd ~/verblyf
B=https://raw.githubusercontent.com/Dejunghu/Verblyf/main
curl -sSL "$B/MANIFEST.txt" -o MANIFEST.txt
while read -r f; do
  [ -z "$f" ] && continue
  mkdir -p "$(dirname "$f")"
  curl -sSL "$B/$f" -o "$f"
done < MANIFEST.txt
npm install
```

`MANIFEST.txt` is de lijst van alle bestanden in de repo. Werk hem bij met
`git ls-files > MANIFEST.txt` zodra je bestanden toevoegt of verwijdert,
anders mist de volgende sessie ze.

## 2. Bouwen en controleren

```bash
DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate
npx tsc --noEmit
npm run build
```

## 3. Deployen naar Netlify

Netlify-project: **verblyf**, site-id `e773212a-9c22-42d5-b775-96925ae81510`.

Vraag via de Netlify-connector een deploycommando op — tool
`netlify-deploy-services-updater`, operatie `deploy-site`, met
`params.siteId = e773212a-9c22-42d5-b775-96925ae81510`. Die geeft een
`npx -y @netlify/mcp@latest --site-id ... --proxy-path "..."` terug.
Voer dat commando uit in de map waar `netlify.toml` staat. Het pakt de map in,
bouwt bij Netlify en zet het live. Eén proxy-path is eenmalig: krijg je 403,
vraag dan een nieuwe op.

De site is nog **niet** gekoppeld aan GitHub voor auto-deploy. Deployen gaat dus
altijd via bovenstaande route, niet via een push.

## 4. Wijzigingen terug naar GitHub

De container kan niet pushen. Ga zo te werk:

1. `git bundle create verblyf-repo.bundle --all` in de repo-map.
2. Zet `verblyf-repo.bundle` en `verblyf-naar-github.bat` met
   `device_commit_files` in `C:\Users\Luukd\Documents` op Luuks computer.
3. Start `verblyf-naar-github.bat` (Verkenner, dubbelklik). Git en de
   GitHub-credentials staan daar al, dus de push gaat zonder inloggen.

Bewaar altijd eerst de bundle op zijn computer voordat je de sessie afsluit —
de container is tijdelijk, zijn schijf niet.

## 5. Demo-modus

Zolang `ACTIVE_SUPPLIERS` alleen `mock` bevat zijn de hotels fictief. Dan geldt:
banner bovenaan elke pagina, `robots.txt` blokkeert alles, lege sitemap, geen
Hotel-JSON-LD. Dat is bewust en geen fout. Zodra LiteAPI erbij komt schakelt
alles vanzelf om — controleer die omschakeling wel bij elke analyse.

## 6. Wat nog van Luuk moet komen

| Wat | Waarvoor | Waar |
| --- | --- | --- |
| LiteAPI-sleutel | echte hotels inclusief foto's | liteapi.travel |
| Neon `DATABASE_URL` | accounts, boekingen, favorieten | neon.tech (gratis) |
| Stripe-sleutels | creditcard en iDEAL | dashboard.stripe.com |
| Cloudinary | foto-uploads door hotels | cloudinary.com |
| Netlify autoriseren voor GitHub | auto-deploy bij push | app.netlify.com/projects/verblyf/configuration/deploys |

Alle env-variabelen staan met uitleg in `NETLIFY-SETUP.md` en `.env.example`.
