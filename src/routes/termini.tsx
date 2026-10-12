import { Link, createFileRoute } from "@tanstack/react-router";

import { Page, useSettings } from "@/components/gc/Page";
import { SITE } from "@/lib/gc/config";

const TITLE = `Termini del servizio | ${SITE.name}`;
const DESCRIPTION =
  "Le regole d'uso di Appalti per tutti: che cosa offre il servizio, come funzionano il radar e i piani a pagamento, quali sono i limiti di responsabilità.";

export const Route = createFileRoute("/termini")({
  head: () => ({
    meta: [{ title: TITLE }, { name: "description", content: DESCRIPTION }],
    links: [{ rel: "canonical", href: `${SITE.url}/termini` }],
  }),
  component: Termini,
});

function Termini() {
  const { legal, plans, nexi } = useSettings();
  const venditore = legal.ragione_sociale ?? "il gestore del servizio";
  const conPaddle = Boolean(plans.paddle && (plans.pro.paddle_month || plans.pro.paddle_year));
  const conIva = nexi.enabled ? nexi.iva > 0 : conPaddle;
  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <h1>Termini del servizio</h1>
        <p className="gc-testata__sotto">Ultimo aggiornamento: 12 ottobre 2026.</p>
      </div>
      <div className="gc-wrap gc-prosa">
        <h2>Il servizio</h2>
        <p>
          Appalti per tutti è un servizio informativo
          {legal.ragione_sociale ? `, gestito da ${legal.ragione_sociale}` : ""}: raccoglie gli
          avvisi di gara pubblicati dalle fonti ufficiali, li riordina e li riassume. Non è un sito
          istituzionale, non è collegato ad ANAC né all'Unione europea e non offre consulenza
          legale o assistenza alla partecipazione.
        </p>

        <h2>I dati delle gare</h2>
        <p>
          I dati arrivano dalle fonti indicate nella pagina <Link to="/fonti">Fonti dei dati</Link>{" "}
          e sono elaborati in automatico. Possono contenere errori, ritardi od omissioni: prima di
          decidere se partecipare a una gara verifica sempre l'avviso ufficiale e i documenti
          pubblicati dall'ente. Fa fede soltanto l'avviso ufficiale.
        </p>

        <h2>Il radar</h2>
        <p>
          Il radar salva una ricerca e segnala le gare nuove che le corrispondono. La
          corrispondenza è automatica e si basa sulle parole, sui settori e sulle regioni che
          scegli: può segnalare gare non adatte e tralasciarne alcune adatte. Puoi modificare,
          sospendere o cancellare il radar in qualsiasi momento.
        </p>

        <h2>I piani a pagamento</h2>
        <p>
          I piani a pagamento sono rivolti a imprese e professionisti. Il pagamento è anticipato,
          per un mese o per un anno. L'abbonamento si rinnova alla scadenza e puoi disdirlo quando
          vuoi: resta attivo fino alla fine del periodo già pagato. I prezzi sono indicati nella
          pagina <Link to="/prezzi">Prezzi</Link>
          {conIva
            ? ", al netto dell'IVA, che si aggiunge al momento del pagamento."
            : " e sono definitivi: l'IVA non si applica, perché il servizio è venduto da un'impresa in regime fiscale agevolato."}
        </p>

        <h2>Pagamenti, fatture e rimborsi</h2>
        {conPaddle ? (
          <p>
            Gli ordini sono gestiti dal nostro rivenditore online Paddle.com. Paddle.com è il
            venditore ufficiale (Merchant of Record) per tutti gli ordini: incassa il pagamento,
            applica l'IVA dovuta, emette la ricevuta e gestisce resi e rimborsi. Al momento del
            pagamento accetti anche le condizioni di acquisto di Paddle. Entro 14 giorni dal primo
            pagamento puoi chiedere il rimborso completo: le regole sono nella pagina{" "}
            <Link to="/rimborsi">Rimborsi e disdetta</Link>.
          </p>
        ) : (
          <p>
            Il venditore è {venditore}. Il pagamento avviene con carta sulla pagina sicura di Nexi
            Payments, che gestisce l'incasso: il numero della carta non passa da questo sito e non viene
            conservato da noi. Per ogni pagamento emettiamo la fattura con i dati che indichi al momento
            dell'acquisto. Entro 14 giorni dal primo pagamento puoi chiedere il rimborso completo: le
            regole sono nella pagina <Link to="/rimborsi">Rimborsi e disdetta</Link>.
          </p>
        )}

        <h2>Responsabilità</h2>
        <p>
          Facciamo il possibile perché il servizio sia aggiornato e disponibile, ma non garantiamo
          che lo sia senza interruzioni né che l'elenco delle gare sia completo. Nei limiti
          consentiti dalla legge, Appalti per tutti non risponde delle decisioni prese sulla base delle
          informazioni pubblicate né delle gare perse per un avviso mancato o in ritardo.
        </p>

        <h2>Uso consentito</h2>
        <p>
          Puoi usare il sito per cercare gare per la tua attività. Non è consentito copiare in modo
          massivo o automatico i contenuti elaborati da Appalti per tutti per rivenderli o ripubblicarli.
        </p>

        <h2>Modifiche e legge applicabile</h2>
        <p>
          Possiamo aggiornare questi termini: la data in alto indica l'ultima versione. Ai termini
          si applica la legge italiana.
        </p>
      </div>
    </Page>
  );
}
