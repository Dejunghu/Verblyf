# Verblyf

Hotelboekingsplatform met **8% servicekosten voor de gast** en **0% commissie
voor het hotel**. Multi-supplier: LiteAPI en Amadeus werken out of the box,
bedbanks en direct-connect hotels hangen achter dezelfde interface.
Accounts via Better Auth, foto's via Cloudinary.

```
npm install
cp .env.example .env.local     # ACTIVE_SUPPLIERS="mock" werkt zonder sleutels
npx prisma generate
npm run dev                    # http://localhost:3000
```

---

## Architectuur

```
Gast → Next.js UI → /api/search ─┬→ Amadeus-adapter  ─→ Amadeus Self-Service
                                 ├→ Mock-adapter     ─→ lokale demo-inventaris
                                 └→ (Hotelbeds, RateHawk, direct connect)
                                        ↓
                              fee-engine (2%, min €2, max €50)
                                        ↓
              /api/checkout → Stripe Checkout → webhook → boeking bij leverancier
```

| Bestand | Verantwoordelijkheid |
|---|---|
| `src/lib/suppliers/types.ts` | Het contract waar elke leverancier aan voldoet |
| `src/lib/suppliers/liteapi.ts` | LiteAPI: content **met foto's**, rates, prebook, book |
| `src/lib/suppliers/amadeus.ts` | OAuth, hotel-list, v3 offers, v2 hotel-orders |
| `src/lib/suppliers/mock.ts` | Volledige demo-inventaris, geen API-sleutels nodig |
| `src/lib/suppliers/index.ts` | Parallelle fan-out, timeouts, ontdubbeling |
| `src/lib/pricing.ts` | De 8%: fee-berekening en marge per betaalmethode |
| `src/lib/images.ts` | Cloudinary-URL's, srcset, leveranciersfoto's, validatie |
| `src/lib/auth.ts` | Better Auth: e-mail, Google, Apple, sessies in de database |
| `src/app/api/photos/route.ts` | Uploaden, ordenen, omslagfoto, verwijderen |
| `src/lib/booking-service.ts` | Reserveren → betalen → boeken → terugbetalen bij fout |
| `src/lib/stripe.ts` | Merchant-of-record én destination charges |
| `prisma/schema.prisma` | Boekingen, events, partnerhotels |

### De regel die alles bij elkaar houdt

Er wordt **nooit** bij de leverancier geboekt voordat Stripe de betaling heeft
bevestigd, en er blijft **nooit** geld staan zonder boeking. Lukt de boeking na
een geslaagde betaling niet, dan doet `confirmAfterPayment()` automatisch een
volledige terugbetaling en zet de boeking op `FAILED`. Dit is de enige plek waar
een marktplaats echt geld kan verliezen; vandaar de webhook in plaats van de
success-redirect (de gast sluit zijn browser sneller dan je denkt).

---

## Het verdienmodel

`src/lib/pricing.ts` ondersteunt beide varianten; de standaard is **MARKUP**:

- **MARKUP (actief)** — de gast betaalt kamerprijs + 8%, als aparte regel
  zichtbaar vanaf het eerste zoekresultaat. Het hotel betaalt geen commissie.
- **COMMISSION** — de gast betaalt precies de kamerprijs en het hotel draagt af.
  Blijft beschikbaar voor hotels die liever zelf de kosten dragen.

Ondergrens €3,50 en bovengrens €150 per boeking, zodat een weekendje van €90
niet verliesgevend is en een verblijf van €4.000 geen fee van €320 krijgt.

### Wat blijft er over per betaalmethode

Bij 8% is elke betaalmethode ruim rendabel — dat was bij 2% niet zo. Op een
boeking van €200 (kamerprijs €200, fee €16, gast betaalt €216):

| Methode | Kosten Stripe | Netto voor jou |
|---|---|---|
| iDEAL | €0,29 | **€15,71** |
| Bancontact | €0,29 | **€15,71** |
| Europese kaart | €3,49 | **€12,51** |
| Niet-Europese creditcard | €7,27 | **€8,73** |

`marginByMethod()` rekent dit per boeking uit. Amex en zakelijke kaarten van
buiten de EER zijn het duurst; zet iDEAL bovenaan in de checkout en je gemiddelde
kosten dalen zonder dat je kaarten hoeft te weigeren.

### Waar je op moet letten

8% servicekosten is zichtbaar veel voor een gast — Booking toont er nul. Twee
dingen houden dat overeind: toon het bedrag vanaf het **eerste** zoekresultaat
(dat doet de UI nu, en het is ook wat art. 6:193e BW eist), en zet er de reden
bij: het hotel betaalt geen commissie, dus de kamerprijs zelf ligt lager. Zodra
je die twee loslaat, voelt de fee als een verrassing en verlies je de boeking op
de laatste stap.

## Live gaan — stappenplan

1. **LiteAPI eerst** — gratis sleutel op liteapi.travel, in `.env.local` en
   `ACTIVE_SUPPLIERS="mock,liteapi"`. Ruim 2 miljoen accommodaties, **inclusief
   hotelfoto's**, met prebook/book en wekelijkse uitbetaling. Ze nemen geen cut
   op je eigen marge. Wij vragen `margin: 0` en tellen de 8% zelf zichtbaar op.
   Controleer de veldnamen in `liteapi.ts` tegen docs.liteapi.travel zodra je
   een sleutel hebt.
2. **Amadeus** als tweede bron — gratis testsleutel op developers.amadeus.com.
   Let op: Amadeus Self-Service levert **geen foto's**. Gebruik het voor
   beschikbaarheid en prijs, niet voor beeld.
3. **Betalen aan het hotel** — bedbanks worden betaald met een virtual credit
   card per boeking (Adyen Issuing, Stripe Issuing, Wex). Nooit één vaste kaart
   in je env; `VCC_*` is alleen bedoeld voor de sandbox.
4. **Stripe** — account, iDEAL én kaarten aanzetten, webhook op
   `/api/webhooks/stripe` voor `checkout.session.completed`.
5. **Accounts** — `BETTER_AUTH_SECRET` genereren (`openssl rand -base64 32`),
   OAuth-clients aanmaken bij Google en Apple, redirect-URI
   `/api/auth/callback/{google,apple}`. Apple vereist een betaald developer-
   account en een gegenereerde client secret die elk half jaar verloopt — zet
   daar een herinnering voor.
6. **Foto's** — Cloudinary-account, de drie sleutels in `.env.local`. Uploads
   gaan ondertekend via `/api/photos`; de secret verlaat de server nooit.
   Cloudinary doet formaat, compressie en bijsnijden (`c_fill,g_auto` kiest het
   interessantste deel van de foto). Wij bewaren alleen de `publicId`.
7. **Database** — Neon of Supabase, `DATABASE_URL` invullen, `npm run db:migrate`.
8. **E-mail** — Resend voor bevestigingen én voor de accountverificatie;
   verstuur de boekingsmail pas na `SUPPLIER_CONFIRMED`.
9. **Direct connect** — het echte verdienmodel. Elk hotel dat rechtstreeks
   aansluit levert de volle 2% zonder bedbank ertussen. Koppelen gaat via de
   channel manager (Mews, Cloudbeds, SiteMinder).

---

## Foto's: rechten

Beeld van bedbanks (LiteAPI, Hotelbeds/GIATA) mag je tonen binnen de
boekingscontext, maar je mag het doorgaans **niet permanent op je eigen CDN
zetten**. `lib/images.ts` respecteert dat: eigen uploads gaan naar Cloudinary,
leveranciersfoto's worden alleen doorgelinkt. Hotelbeds serveert vanaf
`photos.hotelbeds.com/giata/<maat>/<pad>` met de maten small, medium, bigger,
xl, xxl en original; een maat die niet bestaat geeft een 403, dus val terug op
`bigger`. Vraag bij HBX schriftelijk toestemming voordat je iets cachet.

Eigen uploads: minimaal 1200×800 pixels, maximaal 12 MB en 20 foto's per kamer.
Die grenzen staan in `UPLOAD_RULES` en worden zowel in de browser als op de
server gecontroleerd.

## Juridisch (NL/EU, kort)

- Alleen accommodatie verkopen is **geen pakketreis**: de Richtlijn
  pakketreizen eist pas insolventiebescherming (SGR) zodra je een tweede
  reisdienst combineert, bijvoorbeeld vervoer. Zodra je vluchten of huurauto's
  toevoegt, verandert dit — dan gelden garantiefonds en informatieplicht.
- De totaalprijs inclusief de 8% servicekosten moet **vanaf het eerste
  zoekresultaat** volledig zichtbaar zijn, niet pas in de laatste stap
  (art. 6:193e BW en de Omnibus-richtlijn). Dit is bij een fee van 8% geen
  detail: een fee die pas bij het afrekenen opduikt is een drip pricing-
  overtreding waar de ACM actief op handhaaft.
- Accounts: bewaartermijn vastleggen, verwijderverzoeken binnen een maand
  afhandelen, en wachtwoorden nooit zelf hashen — Better Auth doet dat.
- Gastgegevens: verwerkersovereenkomst met elke leverancier, bewaartermijn
  vastleggen, en het e-mailadres van de gast alleen delen met het hotel waar
  daadwerkelijk geboekt is.
- Zet in je algemene voorwaarden expliciet dat je **bemiddelt**: de
  overeenkomst voor het verblijf komt tot stand tussen gast en hotel.
