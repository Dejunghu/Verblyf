# Automatische controles

`weekly-check.yml` draait elke maandag om 06:00 UTC:

1. **Build en typecheck** — breekt er iets, dan weet je het voordat een gast het merkt.
2. **npm audit** — kwetsbare packages, drempel `high`.
3. **Lighthouse** — laadtijd en Core Web Vitals van de homepage en de partnerpagina.

Zet in de repo-instellingen onder *Variables* een `SITE_URL` naar je Netlify-domein
zodra dat bekend is; anders valt Lighthouse terug op het standaard netlify.app-adres.

De inhoudelijke analyse (SEO, conversie, wat er beter kan) doet Claude er wekelijks
naast en levert die als rapport op.
