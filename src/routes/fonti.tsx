import { createFileRoute } from "@tanstack/react-router";

import { Page, useSettings } from "@/components/gc/Page";
import { SITE } from "@/lib/gc/config";

const TITLE = `Fonti dei dati | ${SITE.name}`;
const DESCRIPTION =
  "Da dove arrivano le gare pubblicate su Appalti per tutti, come vengono elaborate e che cosa non è compreso nell'elenco.";

export const Route = createFileRoute("/fonti")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE.url}/fonti` },
    ],
    links: [{ rel: "canonical", href: `${SITE.url}/fonti` }],
  }),
  component: Fonti,
});

function Fonti() {
  const { contactEmail } = useSettings();
  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <h1>Fonti dei dati</h1>
        <p className="gc-testata__sotto">
          Ogni gara che leggi qui arriva da un avviso ufficiale. Appalti per tutti lo riordina e lo
          riassume, poi ti rimanda all'originale.
        </p>
      </div>
      <div className="gc-wrap gc-prosa">
        <h2>Le fonti</h2>
        <ul>
          <li>
            <strong>ANAC, Piattaforma per la pubblicità legale.</strong> È la piattaforma
            dell'Autorità nazionale anticorruzione su cui gli enti pubblicano bandi e avvisi:{" "}
            <a href="https://pubblicitalegale.anticorruzione.it" rel="noopener">
              pubblicitalegale.anticorruzione.it
            </a>
            .
          </li>
          <li>
            <strong>TED, Tenders Electronic Daily.</strong> È il supplemento alla Gazzetta
            ufficiale dell'Unione europea dedicato agli appalti:{" "}
            <a href="https://ted.europa.eu" rel="noopener">
              ted.europa.eu
            </a>
            . © Unione europea. Il riutilizzo dei dati è consentito citando la fonte.
          </li>
          <li>
            <strong>Vocabolario comune per gli appalti (CPV)</strong> dell'Unione europea, usato
            per descrivere l'oggetto di ogni gara.
          </li>
        </ul>

        <h2>Che cosa facciamo sui dati</h2>
        <ul>
          <li>Leggiamo le fonti più volte al giorno.</li>
          <li>Quando lo stesso avviso compare in entrambe le fonti, teniamo una sola scheda.</li>
          <li>
            Assegniamo settore e territorio a partire dal codice CPV e dal luogo indicato
            nell'avviso.
          </li>
          <li>
            Riportiamo in minuscolo i titoli scritti tutti in maiuscolo, senza cambiarne le parole.
          </li>
          <li>Togliamo dall'elenco le gare scadute.</li>
        </ul>

        <h2>Che cosa non trovi</h2>
        <ul>
          <li>Gli affidamenti diretti, che non prevedono un avviso di gara.</li>
          <li>Le richieste di offerta riservate agli iscritti ai mercati elettronici.</li>
          <li>I documenti di gara: ogni scheda rimanda alla pagina ufficiale dove scaricarli.</li>
        </ul>

        <h2>Errori e segnalazioni</h2>
        <p>
          L'elaborazione è automatica e può sbagliare. Fa fede soltanto l'avviso ufficiale.
          {contactEmail ? (
            <>
              {" "}
              Se trovi un errore scrivi a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
            </>
          ) : null}
        </p>
        <p>
          Appalti per tutti non è un sito istituzionale e non è collegato ad ANAC né all'Unione europea.
        </p>
      </div>
    </Page>
  );
}
