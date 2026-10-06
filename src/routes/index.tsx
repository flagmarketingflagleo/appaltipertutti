import { Link, createFileRoute } from "@tanstack/react-router";
import type { CSSProperties } from "react";

import { StructuredData } from "@/components/StructuredData";
import { CercaForm } from "@/components/gc/CercaForm";
import { Page, useSettings } from "@/components/gc/Page";
import { Registro, tenderPath } from "@/components/gc/Registro";
import { getHome } from "@/lib/gc/api.functions";
import { CATEGORIES, REGIONS, SITE } from "@/lib/gc/config";
import { clip, fmtDay, fmtEuro, fmtInt } from "@/lib/gc/format";
import type { Card } from "@/lib/gc/types";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Appalti per tutti è un sito ufficiale?",
    a: "No. È un servizio privato che legge gli avvisi pubblicati da ANAC e da TED e li riordina. Per partecipare a una gara valgono solo i documenti pubblicati dall'ente che la bandisce.",
  },
  {
    q: "Quali gare trovo?",
    a: "Gli avvisi con pubblicità legale: bandi di gara, indagini di mercato ed elenchi di operatori economici. Gli affidamenti diretti senza avviso non compaiono, perché non vengono pubblicati prima dell'assegnazione.",
  },
  {
    q: "Ogni quanto si aggiorna?",
    a: "Più volte al giorno, dalla mattina alla sera. Ogni scheda riporta la data di pubblicazione dell'avviso e rimanda alla fonte.",
  },
  {
    q: "Quanto costa?",
    a: "La ricerca è gratuita e senza registrazione. Anche il primo radar è gratuito. Il piano Pro costa 29 euro al mese e serve a chi vuole seguire più profili e vedere tutte le gare del proprio radar.",
  },
  {
    q: "Come si partecipa a una gara?",
    a: "Ogni scheda ha il collegamento ai documenti e alla piattaforma dell'ente. L'offerta si presenta lì, con le regole scritte nel disciplinare di gara.",
  },
  {
    q: "Posso disattivare il radar?",
    a: "Sì, in qualsiasi momento dalla tua pagina personale. Dalla stessa pagina puoi anche cancellare i tuoi dati.",
  },
];

const SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#sito`,
      name: SITE.name,
      url: SITE.url,
      inLanguage: "it",
      description: SITE.description,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE.url}/cerca?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
});

export const Route = createFileRoute("/")({
  loader: () => getHome(),
  head: () => ({
    meta: [{ property: "og:url", content: SITE.url }],
    links: [{ rel: "canonical", href: SITE.url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE.name,
          url: SITE.url,
          description: SITE.description,
          inLanguage: "it",
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/cerca?q={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  component: Home,
});

function step(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}

function Esempio({ c }: { c: Card }) {
  const dove = [c.place, c.province && c.province !== c.place ? `(${c.province})` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <aside className="gc-foglio" aria-label="Un esempio vero, tra le gare aperte oggi">
      <p className="gc-foglio__voce">Così è scritto l'avviso</p>
      <p className="gc-foglio__burocratese">{clip(c.title, 300)}</p>
      <p className="gc-foglio__voce">Così lo leggi qui</p>
      <dl className="gc-fatti">
        <dt>Cosa</dt>
        <dd>
          <span className="gc-mark gc-mark--traccia" style={step(0)}>
            {c.what}
          </span>
        </dd>
        <dt>Chi compra</dt>
        <dd>
          <span className="gc-mark gc-mark--traccia" style={step(1)}>
            {c.buyer}
          </span>
          {dove ? <small>{dove}</small> : null}
        </dd>
        <dt>Quanto vale</dt>
        <dd>
          <span className="gc-mark gc-mark--traccia" style={step(2)}>
            {fmtEuro(c.value)}
          </span>
        </dd>
        <dt>Entro quando</dt>
        <dd>
          <span className="gc-mark gc-mark--traccia" style={step(3)}>
            {fmtDay(c.deadline_local)}
          </span>
        </dd>
      </dl>
      <p className="gc-piccolo">
        È una gara vera, aperta oggi.{" "}
        <Link to="/gara/$slug" params={{ slug: tenderPath(c) }}>
          Apri la scheda
        </Link>
      </p>
    </aside>
  );
}

function Home() {
  const { stats, latest, sample } = Route.useLoaderData();
  const settings = useSettings();
  const piccole = stats ? stats.under_150k + stats.from_150k_to_1m : 0;

  return (
    <Page>
      <StructuredData json={SCHEMA} />
      <section className="gc-wrap gc-apertura">
        <div className="gc-apertura__griglia">
          <div>
            <h1>Le gare pubbliche, scritte chiare.</h1>
            <p className="gc-sommario">
              Scrivi cosa fa la tua impresa. Trovi le gare adatte con i quattro dati che contano:
              cosa chiedono, chi compra, quanto vale, entro quando.
            </p>
            <CercaForm />
          </div>
          {sample ? <Esempio c={sample} /> : null}
        </div>
      </section>

      {stats ? (
        <p className="gc-wrap gc-numeri">
          Oggi sono aperte <strong>{fmtInt(stats.open)}</strong> gare di{" "}
          <strong>{fmtInt(stats.buyers)}</strong> enti.{" "}
          {stats.new_today > 0 ? (
            <>
              <strong>{fmtInt(stats.new_today)}</strong> sono uscite oggi,{" "}
            </>
          ) : (
            <>
              <strong>{fmtInt(stats.new_7d)}</strong> sono uscite negli ultimi sette giorni,{" "}
            </>
          )}
          <strong>{fmtInt(stats.closing_7d)}</strong> scadono entro una settimana e{" "}
          <strong>{fmtInt(piccole)}</strong> valgono meno di un milione di euro.
        </p>
      ) : null}

      <section className="gc-wrap gc-sezione" aria-labelledby="h-ultime">
        <div className="gc-sezione__testa">
          <h2 id="h-ultime">Uscite da poco</h2>
          <Link to="/cerca">Tutte le gare aperte</Link>
        </div>
        <Registro items={latest} />
      </section>

      <section className="gc-wrap gc-sezione" id="settori" aria-labelledby="h-settori">
        <div className="gc-sezione__testa">
          <h2 id="h-settori">Sfoglia per settore</h2>
        </div>
        <ul className="gc-indice">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link to="/gare/settore/$slug" params={{ slug: c.slug }}>
                <span className="gc-indice__nome">{c.name}</span>
                <span className="gc-indice__punti" aria-hidden="true" />
                <span className="gc-indice__n">{fmtInt(stats?.by_category[c.slug] ?? 0)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="gc-wrap gc-sezione" id="regioni" aria-labelledby="h-regioni">
        <div className="gc-sezione__testa">
          <h2 id="h-regioni">Sfoglia per regione</h2>
        </div>
        <ul className="gc-indice">
          {REGIONS.map((r) => (
            <li key={r.slug}>
              <Link to="/gare/regione/$slug" params={{ slug: r.slug }}>
                <span className="gc-indice__nome">{r.name}</span>
                <span className="gc-indice__punti" aria-hidden="true" />
                <span className="gc-indice__n">{fmtInt(stats?.by_region[r.slug] ?? 0)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="gc-wrap gc-sezione" aria-labelledby="h-radar">
        <div className="gc-sezione__testa">
          <h2 id="h-radar">Come funziona il radar</h2>
        </div>
        <ol className="gc-passi">
          <li>
            <div>
              <h3>Scrivi cosa fai e dove</h3>
              <p>
                Bastano poche parole, come le diresti a un cliente: pulizie, manutenzione del verde,
                software gestionale.
              </p>
            </div>
          </li>
          <li>
            <div>
              <h3>Il radar legge gli avvisi nuovi</h3>
              <p>
                Più volte al giorno confronta il tuo profilo con le gare appena pubblicate da ANAC e
                da TED.
              </p>
            </div>
          </li>
          <li>
            <div>
              <h3>Trovi solo quelle adatte</h3>
              <p>
                {settings.emailEnabled
                  ? "Le ricevi per email e le ritrovi nella tua pagina personale. Apri la scheda, leggi i quattro dati e decidi se partecipare."
                  : "Le trovi nella tua pagina personale, che si aggiorna da sola. Apri la scheda, leggi i quattro dati e decidi se partecipare."}
              </p>
            </div>
          </li>
        </ol>
        <p className="gc-azioni" style={{ marginTop: "1.75rem" }}>
          <Link to="/radar" className="gc-btn">
            Attiva il radar
          </Link>
          <Link to="/prezzi">Vedi i piani e i prezzi</Link>
        </p>
      </section>

      <section className="gc-wrap gc-sezione" aria-labelledby="h-fonti">
        <div className="gc-prosa">
          <h2 id="h-fonti" style={{ fontSize: "var(--t-xl)", marginTop: 0 }}>
            Da dove arrivano i dati
          </h2>
          <p>
            Dagli avvisi che hanno valore di pubblicità legale: la piattaforma di ANAC per le gare
            italiane e TED per quelle sopra la soglia europea. Appalti per tutti li legge più volte al
            giorno, toglie i doppioni e li ordina per settore e per territorio.
          </p>
          <p>
            Non è un servizio pubblico e può contenere errori: per questo ogni scheda rimanda
            all'avviso originale. <Link to="/fonti">Come lavoriamo sui dati</Link>
          </p>
        </div>
      </section>

      <section className="gc-wrap gc-sezione gc-faq" aria-labelledby="h-domande">
        <div className="gc-sezione__testa">
          <h2 id="h-domande">Domande frequenti</h2>
        </div>
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>
    </Page>
  );
}
