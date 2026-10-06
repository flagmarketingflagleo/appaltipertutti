import { Link, createFileRoute } from "@tanstack/react-router";

import { Page, useSettings } from "@/components/gc/Page";
import { SITE } from "@/lib/gc/config";

const TITLE = `Rimborsi e disdetta | ${SITE.name}`;
const DESCRIPTION =
  "Rimborso completo entro 14 giorni dal primo pagamento di un piano di Appalti per tutti, disdetta in ogni momento. Come chiederlo e chi gestisce il pagamento.";

export const Route = createFileRoute("/rimborsi")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE.url}/rimborsi` },
    ],
    links: [{ rel: "canonical", href: `${SITE.url}/rimborsi` }],
  }),
  component: Rimborsi,
});

function Rimborsi() {
  const { legal, contactEmail } = useSettings();
  const email = contactEmail ?? legal.email;
  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <h1>Rimborsi e disdetta</h1>
        <p className="gc-testata__sotto">Ultimo aggiornamento: 6 ottobre 2026.</p>
      </div>
      <div className="gc-wrap gc-prosa">
        <h2>Rimborso entro 14 giorni</h2>
        <p>
          Se un piano a pagamento non fa per te, entro 14 giorni dal primo pagamento ti viene
          restituito l'intero importo, senza che tu debba spiegare il motivo.
        </p>

        <h2>Come chiederlo</h2>
        <p>
          {email ? (
            <>
              Scrivi a <a href={`mailto:${email}`}>{email}</a> dall'indirizzo con cui hai attivato
              il radar,
            </>
          ) : (
            "Scrivici dall'indirizzo con cui hai attivato il radar,"
          )}{" "}
          oppure rispondi alla ricevuta che hai ricevuto da Paddle. Il rimborso torna sullo stesso
          metodo di pagamento usato per l'acquisto: i tempi di accredito dipendono dalla banca o
          dal circuito della carta.
        </p>

        <h2>Disdetta e rinnovi</h2>
        <p>
          Puoi disdire quando vuoi, dalla pagina del tuo radar o dal collegamento nella ricevuta.
          Il piano resta attivo fino alla fine del periodo già pagato e non ci sono altri
          addebiti. I rinnovi successivi al primo pagamento non sono rimborsabili, salvo addebiti
          doppi o sbagliati, che vengono sempre restituiti.
        </p>

        <h2>Chi gestisce il pagamento</h2>
        <p>
          Gli ordini sono gestiti dal nostro rivenditore online Paddle.com. Paddle.com è il
          venditore ufficiale (Merchant of Record) per tutti gli acquisti: incassa il pagamento,
          applica l'IVA, emette la ricevuta e dispone i rimborsi.
        </p>
        <p>
          Le altre regole del servizio sono nella pagina <Link to="/termini">Termini</Link>.
        </p>
      </div>
    </Page>
  );
}
