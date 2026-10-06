import { Link, createFileRoute } from "@tanstack/react-router";

import { Page, useSettings } from "@/components/gc/Page";
import { SITE } from "@/lib/gc/config";
import { fmtInt } from "@/lib/gc/format";

const TITLE = `Piani e prezzi del radar gare | ${SITE.name}`;
const DESCRIPTION =
  "La ricerca tra le gare d'appalto è gratuita. Il radar gratuito segue un profilo; i piani a pagamento ne seguono di più e mostrano l'elenco completo. Si disdice quando si vuole.";

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

function Prezzi() {
  const { plans, emailEnabled } = useSettings();
  const conPaddle = Boolean(plans.paddle && (plans.pro.paddle_month || plans.pro.paddle_year));
  const pagamenti = conPaddle || Boolean(plans.pro.link_month || plans.pro.link_year);
  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <h1>Piani e prezzi</h1>
        <p className="gc-testata__sotto">
          Cercare tra le gare è gratuito e resta gratuito. Paghi solo se vuoi più radar e l'elenco
          completo delle gare adatte a te.
        </p>
      </div>

      <section className="gc-wrap" aria-label="Confronto dei piani">
        <div className="gc-scorri">
          <table className="gc-tab">
            <thead>
              <tr>
                <th scope="col">
                  <span className="gc-nascosto">Caratteristica</span>
                </th>
                <th scope="col">Gratis</th>
                <th scope="col">Pro</th>
                <th scope="col">Studio</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Prezzo</th>
                <td>
                  <span className="gc-prezzo">0 €</span>
                </td>
                <td>
                  <span className="gc-prezzo">{fmtInt(plans.pro.price_month)} € al mese</span>
                  <span className="gc-piccolo gc-tenue">
                    + IVA, oppure {fmtInt(plans.pro.price_year)} € l'anno + IVA
                  </span>
                </td>
                <td>
                  <span className="gc-prezzo">{fmtInt(plans.studio.price_month)} € al mese</span>
                  <span className="gc-piccolo gc-tenue">
                    + IVA, oppure {fmtInt(plans.studio.price_year)} € l'anno + IVA
                  </span>
                </td>
              </tr>
              <tr>
                <th scope="row">Per chi è</th>
                <td>Chi vuole provare</td>
                <td>L'impresa che partecipa alle gare</td>
                <td>Studi e associazioni che seguono più imprese</td>
              </tr>
              <tr>
                <th scope="row">Ricerca tra tutte le gare</th>
                <td>Sì</td>
                <td>Sì</td>
                <td>Sì</td>
              </tr>
              <tr>
                <th scope="row">Radar, cioè ricerche salvate</th>
                <td>{plans.free.profiles}</td>
                <td>{plans.pro.profiles}</td>
                <td>{plans.studio.profiles}</td>
              </tr>
              <tr>
                <th scope="row">Gare visibili in ogni radar</th>
                <td>Le {plans.free.daily_matches} più recenti</td>
                <td>Fino a 200, dalla più recente</td>
                <td>Fino a 200, dalla più recente</td>
              </tr>
              <tr>
                <th scope="row">Avvisi per email</th>
                {emailEnabled ? (
                  <>
                    <td>Riepilogo ogni lunedì</td>
                    <td>Ogni mattina</td>
                    <td>Ogni mattina</td>
                  </>
                ) : (
                  <td colSpan={3}>
                    In attivazione. Intanto il radar si consulta dalla pagina personale.
                  </td>
                )}
              </tr>
              <tr>
                <th scope="row">Esportazione dell'elenco in CSV</th>
                <td>No</td>
                <td>Sì</td>
                <td>Sì</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="gc-azioni" style={{ marginTop: "1.75rem" }}>
          <Link to="/radar" className="gc-btn">
            Attiva il radar
          </Link>
          <span className="gc-tenue">Si parte dal piano gratuito, senza carta.</span>
        </p>
      </section>

      <section className="gc-wrap gc-sezione gc-prosa">
        <h2>Come si passa a un piano a pagamento</h2>
        <p>
          {pagamenti
            ? "Dalla pagina del tuo radar, con carta. Il piano si rinnova ogni mese o ogni anno e si disdice quando vuoi: resta attivo fino alla fine del periodo già pagato."
            : "I piani a pagamento aprono a breve. Intanto puoi attivare il radar gratuito: quando Pro sarà disponibile lo troverai nella pagina del tuo radar."}
        </p>
        <p>
          Entro 14 giorni dal primo pagamento puoi chiedere il rimborso completo:{" "}
          <Link to="/rimborsi">come funzionano rimborsi e disdetta</Link>.
        </p>
        <h2>Che cosa non è incluso</h2>
        <p>
          Appalti per tutti segnala le gare e le riassume. Non prepara l'offerta, non carica documenti
          sulle piattaforme degli enti e non sostituisce un consulente.
        </p>
        <p className="gc-nota">
          Tutti i prezzi sono al netto dell'IVA, che si aggiunge al momento del pagamento. Il
          servizio è rivolto a imprese e professionisti.
        </p>
      </section>
    </Page>
  );
}
