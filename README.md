# Appalti per tutti

Il sito di Appalti per tutti: le gare pubbliche italiane, scritte chiare.

- Le pagine vengono disegnate da un Worker di Cloudflare (TanStack Start + React).
- I dati (gare, iscritti, email, pagamenti) stanno su Supabase, nello schema `gc`.
  Il sito li legge con chiamate pubbliche: qui dentro non ci sono chiavi segrete.
- L'indirizzo ufficiale del sito si cambia in un punto solo: `src/lib/gc/config.ts` (`SITE.url`).

## Comandi

```
npm install        # scarica le dipendenze (serve Node 22 o più recente)
npm run build      # prepara il sito in dist/
npm run preview    # lo prova in locale su http://localhost:8787
npm run deploy     # lo pubblica su Cloudflare (serve l'accesso a Cloudflare)
```

## Pubblicazione automatica

Su Cloudflare (Workers > il Worker `appaltipertutti` > Settings > Build) il repository
è collegato così: comando di build `npm run build`, comando di deploy `npx wrangler deploy`.
Ogni modifica salvata sul ramo `main` va online da sola in un paio di minuti.
