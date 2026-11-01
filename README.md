# Propul'Sound DJ — Site vitrine + espace client

Site web de réservation pour DJ événementiel (mariages, anniversaires, bars/clubs) :
vitrine publique, formulaire de devis interactif, espace client (playlist, documents,
messagerie, timeline de soirée) et back-office admin.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + composants shadcn/ui (Base UI), Framer Motion, sonner
- **Supabase** (PostgreSQL, Auth, Storage) — schéma dans `supabase/schema.sql`
- **pdf-lib** (génération devis / contrats / factures), **Resend** (e-mails)
- **Vercel** (déploiement, Analytics, cron `/api/cron`)

## Démarrage

```bash
npm install
cp .env.example .env.local   # renseigner les clés Supabase / Resend
npm run dev                  # http://localhost:3000
```

Build de production : `npm run build && npm start`

## Tests E2E (Playwright)

Les tests simulent un visiteur réel (navigation, sélection de pack, formulaire de
devis, protection admin…). Ils tournent contre un serveur de production local :

```bash
npm run build
npm run test:e2e
```

Prérequis : navigateurs Playwright installés (`npx playwright install chromium`).

## Structure

- `src/app/` — pages (public, `mon-espace/`, `admin/`), server actions, API
- `src/components/` — composants client (formulaire de devis, playlist, timeline…)
- `src/lib/` — clients Supabase, génération PDF, e-mails, config
- `supabase/` — schéma SQL et migrations
- `scripts/` — scripts utilitaires (exemples PDF, seed des options)

## Déploiement

Push sur `main` → déploiement Vercel automatique.
