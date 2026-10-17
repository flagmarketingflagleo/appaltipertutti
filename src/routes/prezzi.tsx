import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Page, useSettings } from "@/components/gc/Page";
import { SITE } from "@/lib/gc/config";
import { fmtPrezzo } from "@/lib/gc/format";

const TITLE = `Piani e prezzi del radar gare | ${SITE.name}`;
const DESCRIPTION =
  "Il radar gratuito segue un settore in una regione e mostra le 10 gare più recenti. Pro e Studio seguono tutta Italia e più settori, filtrano per codici CPV, mostrano tutte le gare, avvisano ogni mattina e ricordano le scadenze. Si disdice quando si vuole.";

export const Route = createFileRoute("/prezzi")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE.url}/prezzi` },
    ],
    links: [{ rel: "canonical", href: `${SITE.url}/prezzi` }],
  }),
  component: Prezzi,
});

/** Mesi che si risparmiano pagando l'anno invece di dodici mesi. */
function mesiGratis(mese: number, anno: number): string {
  if (!mese || !anno) return "";
  const n = Math.round(12 - anno / mese);
  return n >= 1 ? ` (${n === 1 ? "un mese gratis" : `${n} mesi gratis`})` : "";
}

type PianoProps = {
  nome: string;
  perChi: string;
  prezzo: string;
  unita?: string;
  sotto: string;
  azione: ReactNode;
  inEvidenza?: boolean;
};

function Piano({ nome, perChi, prezzo, unita, sotto, azione, inEvidenza }: PianoProps) {
  return (
    <article className={inEvidenza ? "gc-piano gc-piano--evidenza" : "gc-piano"} aria-label={`Piano ${nome}`}>
      {inEvidenza ? <span className="gc-piano__segno">Il più scelto</span> : null}
      <h2 className="gc-piano__nome">{nome}</h2>
      <p className="gc-piano__perchi">{perChi}</p>
      <p className="gc-piano__prezzo">
        <strong>{prezzo}</strong>
        {unita ? <span> {unita}</span> : null}
      </p>
      <p className="gc-piano__sotto">{sotto}</p>
      <div className="gc-piano__azione">{azione}</div>
    </article>
  );
}

const PIANI = ["Gratis", "Pro", "Studio"];

/** Una riga del confronto: true = incluso, false = non incluso, testo = valore. */
function Riga({ nome, valori }: { nome: string; valori: (boolean | string)[] }) {
  return (
    <tr>
      <th scope="row">{nome}</th>
      {valori.map((v, i) => (
        <td key={i} data-piano={PIANI[i]}>
          {v === true ? (
            <span className="gc-si" aria-label="incluso">✓</span>
          ) : v === false ? (
            <span className="gc-no" aria-label="non incluso">—</span>
          ) : (
            v
          )}
        </td>
      ))}
    </tr>
  );
}

function Prezzi() {
  const { plans, emailEnabled, nexi } = useSettings();
  const conPaddle = Boolean(plans.paddle && (plans.pro.paddle_month || plans.pro.paddle_year));
  const pagamenti = nexi.enabled || conPaddle || Boolean(plans.pro.link_month || plans.pro.link_year);
  // Con Nexi vende l'impresa: l'IVA si aggiunge solo se nella regia è impostata un'aliquota.
  // Con Paddle, che è un rivenditore, l'IVA la applica lui al pagamento.
  const conIva = nexi.enabled ? nexi.iva > 0 : conPaddle;
  const iva = conIva ? " + IVA" : "";
  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <h1>Piani e prezzi</h1>
        <p className="gc-testata__sotto">
          Si parte gratis, con un radar sul tuo settore nella tua regione. Paghi solo se vuoi seguire tutta
          Italia e più settori, filtrare con precisione, vedere tutte le gare e non perdere una scadenza.
        </p>
      </div>

      <section className="gc-wrap" aria-label="I piani">
        <div className="gc-piani">
          <Piano
            nome="Gratis"
            perChi="Per chi vuole provare"
            prezzo="0 €"
            sotto="Per sempre, senza carta"
            azione={<Link to="/radar" className="gc-btn gc-btn--linea">Attiva il radar</Link>}
          />
          <Piano
            nome="Pro"
            perChi="Per l'impresa che partecipa alle gare"
            prezzo={`${fmtPrezzo(plans.pro.price_month)} €`}
            unita={`al mese${iva}`}
            sotto={`oppure ${fmtPrezzo(plans.pro.price_year)} € l'anno${iva}${mesiGratis(plans.pro.price_month, plans.pro.price_year)}`}
            inEvidenza
            azione={
              <Link to="/radar" search={{ piano: "pro" }} className="gc-btn">
                Scegli Pro
              </Link>
            }
          />
          <Piano
            nome="Studio"
            perChi="Per studi e associazioni che seguono più imprese"
            prezzo={`${fmtPrezzo(plans.studio.price_month)} €`}
            unita={`al mese${iva}`}
            sotto={`oppure ${fmtPrezzo(plans.studio.price_year)} € l'anno${iva}${mesiGratis(plans.studio.price_month, plans.studio.price_year)}`}
            azione={
              <Link to="/radar" search={{ piano: "studio" }} className="gc-btn gc-btn--linea">
                Scegli Studio
              </Link>
            }
          />
        </div>
        <p className="gc-tenue gc-piccolo" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
          Per Pro e Studio prima attivi il radar (un minuto, serve l'email), poi paghi con carta dalla tua
          pagina. Si disdice quando vuoi.
        </p>
      </section>

      <section className="gc-wrap gc-sezione" aria-labelledby="h-confronto">
        <div className="gc-sezione__testa">
          <h2 id="h-confronto">Cosa c'è in ogni piano</h2>
        </div>
        <div className="gc-scorri">
          <table className="gc-tab gc-tab--piani">
            <thead>
              <tr>
                <th scope="col">
                  <span className="gc-nascosto">Caratteristica</span>
                </th>
                <th scope="col">Gratis</th>
                <th scope="col">
                  Pro <span className="gc-piano__segno">Il più scelto</span>
                </th>
                <th scope="col">Studio</th>
              </tr>
            </thead>
            <tbody>
              <Riga nome="Ricerca tra tutte le gare, senza registrazione" valori={[true, true, true]} />
              <Riga
                nome="Radar, cioè ricerche salvate"
                valori={[String(plans.free.profiles), String(plans.pro.profiles), String(plans.studio.profiles)]}
              />
              <Riga
                nome="Dove e cosa segue ogni radar"
                valori={["Un settore, una regione (più parole chiave a scelta)", "Più settori, tutta Italia o le regioni che scegli", "Più settori, tutta Italia o le regioni che scegli"]}
              />
              <Riga nome="Gare visibili per radar" valori={[`Le ${plans.free.daily_matches} più recenti`, "Tutte", "Tutte"]} />
              <Riga nome="Filtri precisi: codici CPV e parole da escludere" valori={[false, true, true]} />
              <Riga nome="Gare preferite con promemoria a 30, 10 e 5 giorni dalla scadenza" valori={[false, true, true]} />
              {emailEnabled ? (
                <Riga nome="Avvisi per email" valori={["Riepilogo ogni lunedì", "Ogni mattina", "Ogni mattina"]} />
              ) : (
                <tr>
                  <th scope="row">Avvisi per email</th>
                  <td colSpan={3} data-piano="Tutti i piani">In attivazione. Intanto il radar si consulta dalla pagina personale.</td>
                </tr>
              )}
              <Riga nome="Esportazione dell'elenco in CSV" valori={[false, true, true]} />
              <Riga nome="Rimborso entro 14 giorni dal primo pagamento" valori={["—", true, true]} />
            </tbody>
          </table>
        </div>
      </section>

      <section className="gc-wrap gc-sezione gc-prosa">
        <h2>Come si passa a un piano a pagamento</h2>
        <p>
          {pagamenti
            ? "Dalla pagina del tuo radar, con carta, sulla pagina sicura di Nexi. Il piano si rinnova ogni mese o ogni anno e si disdice quando vuoi: resta attivo fino alla fine del periodo già pagato."
            : "I piani a pagamento aprono a breve. Intanto puoi attivare il radar gratuito: quando Pro sarà disponibile lo troverai nella pagina del tuo radar."}
        </p>
        <p>
          Entro 14 giorni dal primo pagamento puoi chiedere il rimborso completo:{" "}
          <Link to="/rimborsi">come funzionano rimborsi e disdetta</Link>.
        </p>
        <h2>Che cosa sono i filtri precisi</h2>
        <p>
          Il CPV (Common Procurement Vocabulary) è il codice europeo con cui ogni ente classifica ciò che
          compra: 90910000 sono i servizi di pulizia, 45000000 i lavori di costruzione, 79340000 i servizi
          pubblicitari. Con Pro e Studio scegli i codici della tua attività e le parole da escludere: il
          radar segnala solo le gare classificate così, senza rumore.
        </p>
        <h2>Che cosa non è incluso</h2>
        <p>
          Appalti per tutti segnala le gare e le riassume. Non prepara l'offerta, non carica documenti
          sulle piattaforme degli enti e non sostituisce un consulente.
        </p>
        <p className="gc-nota">
          {conIva
            ? "Tutti i prezzi sono al netto dell'IVA, che si aggiunge al momento del pagamento."
            : "I prezzi sono quelli indicati: non si aggiunge l'IVA, perché il servizio è venduto da un'impresa in regime fiscale agevolato (operazione senza applicazione dell'IVA)."}{" "}
          Il servizio è rivolto a imprese e professionisti: per ogni pagamento viene emessa la fattura.
        </p>
      </section>
    </Page>
  );
}
