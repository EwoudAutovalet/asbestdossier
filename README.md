# AsbestDossier — Frontend

Professioneel beheerplatform voor asbestverwijdering. Gebouwd met Next.js 14.

## Vereisten

- Node.js 18 of hoger
- npm of yarn

## Installatie & opstarten

```bash
# 1. Installeer dependencies
npm install

# 2. Start de ontwikkelserver
npm run dev
```

Open vervolgens [http://localhost:3000](http://localhost:3000) in je browser.

## Projectstructuur

```
src/
  app/
    layout.js       # Root layout (Next.js App Router)
    page.js         # Hoofdpagina
  components/
    App.js          # Volledige applicatie (tijdelijk met mock data)
```

## Rollen

De applicatie ondersteunt 3 rollen. Wissel via de knop rechtsboven:

| Rol         | Ziet                                         |
|-------------|----------------------------------------------|
| Makelaar    | Alle dossiers, kan nieuw dossier aanmaken    |
| Eigenaar    | Enkel eigen dossiers                         |
| Specialist  | Enkel toegewezen dossiers, kan uploaden      |

## Volgende stappen: Supabase koppelen

1. Maak een project aan op [supabase.com](https://supabase.com)
2. Installeer de client: `npm install @supabase/supabase-js`
3. Maak een `.env.local` aan:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://jouwproject.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key
   ```
4. Vervang de mock data in `App.js` door echte Supabase queries

## Productie build

```bash
npm run build
npm run start
```

Of deploy rechtstreeks naar [Vercel](https://vercel.com) door de map te koppelen aan een GitHub repository.
