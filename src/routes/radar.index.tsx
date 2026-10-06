import { Link, createFileRoute } from "@tanstack/react-router";

import { Page } from "@/components/gc/Page";
import { RadarForm } from "@/components/gc/RadarForm";
import { SITE } from "@/lib/gc/config";

const TITLE = `Attiva il radar delle gare | ${SITE.name}`;
const DESCRIPTION =
  "Scrivi cosa fa la tua impresa e dove lavora: il radar confronta il tuo profilo con le gare d'appalto nuove e mette da parte solo quelle adatte. Il primo radar è gratuito.";

type Search = { q?: string; regione?: string };

function str(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : undefined;
}

export const Route = createFileRoute("/radar/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: str(s.q, 300),
    regione: str(s.regione, 40),
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE.url}/radar` },
    ],
    links: [{ rel: "canonical", href: `${SITE.url}/radar` }],
  }),
  component: RadarStart,
});

function RadarStart() {
  const search = Route.useSearch();
  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <h1>Attiva il radar</h1>
        <p className="gc-testata__sotto">
          Dicci cosa fa la tua impresa e dove lavora. Il radar confronta il tuo profilo con le gare
          nuove e mette da parte solo quelle adatte.
        </p>
      </div>
      <div className="gc-wrap gc-due">
        <div className="gc-pannello">
          <RadarForm id="radar-pagina" origin="radar" full q={search.q} regione={search.regione} />
        </div>
        <div className="gc-prosa">
          <h2 style={{ marginTop: 0 }}>Che cosa succede dopo</h2>
          <ul>
            <li>Si apre la tua pagina personale, con le gare aperte adatte al profilo.</li>
            <li>Da lì puoi aggiungere regioni, settori e un valore minimo.</li>
            <li>La pagina si aggiorna da sola più volte al giorno.</li>
          </ul>
          <p>
            Il primo radar è gratuito. <Link to="/prezzi">Vedi i piani</Link>
          </p>
        </div>
      </div>
    </Page>
  );
}
