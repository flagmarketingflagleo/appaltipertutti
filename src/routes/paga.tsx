import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Page, useSettings } from "@/components/gc/Page";
import { SITE } from "@/lib/gc/config";
import { loadPaddle } from "@/lib/gc/paddle";

/**
 * Pagina "Pagamento": spiega dove si paga (dalla pagina del radar). Se è configurato Paddle,
 * carica anche Paddle.js, che apre da solo il pagamento quando nell'indirizzo c'è _ptxn
 * (è l'indirizzo che Paddle mette nelle sue email). Con Nexi questa pagina è solo informativa.
 */
export const Route = createFileRoute("/paga")({
  head: () => ({
    meta: [
      { title: `Pagamento | ${SITE.name}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Paga,
});

function Paga() {
  const { plans, contactEmail, nexi, legal } = useSettings();
  const token = plans.paddle?.token ?? null;
  const sandbox = plans.paddle?.sandbox ?? false;
  const [stato, setStato] = useState<"avvio" | "pronto" | "errore">("avvio");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    loadPaddle({ token, sandbox })
      .then(() => {
        if (vivo) setStato("pronto");
      })
      .catch(() => {
        if (vivo) setStato("errore");
      });
    return () => {
      vivo = false;
    };
  }, [token, sandbox]);

  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <h1>Pagamento</h1>
        <p className="gc-testata__sotto">
          {token
            ? "Se arrivi da un'email di Paddle, la finestra di pagamento si apre da sola in pochi secondi."
            : "I piani si pagano dalla pagina del tuo radar, con carta, sulla pagina sicura di Nexi."}
        </p>
      </div>
      <div className="gc-wrap gc-prosa">
        {token ? (
          stato === "errore" ? (
            <p className="gc-nota gc-nota--allerta" role="alert">
              La finestra di pagamento non si è caricata. Ricarica la pagina
              {contactEmail ? (
                <>
                  ; se il problema resta scrivi a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                </>
              ) : null}
              .
            </p>
          ) : (
            <p className="gc-nota" role="status">
              {stato === "avvio" ? "Sto preparando il pagamento." : "Pagamento pronto."}
            </p>
          )
        ) : !nexi.enabled ? (
          <p className="gc-nota">I pagamenti non sono ancora attivi su questo sito.</p>
        ) : null}
        <p>
          Per attivare un piano apri la pagina del tuo radar: il collegamento è nell'email che hai
          ricevuto quando lo hai attivato.{" "}
          {token
            ? "Il pagamento è gestito da Paddle, il nostro rivenditore."
            : `Il venditore è ${legal.ragione_sociale ?? "il gestore del servizio"}; il pagamento con carta avviene sulla pagina sicura di Nexi e il piano si attiva da solo subito dopo.`}
        </p>
        <p>
          <Link to="/prezzi">Vedi piani e prezzi</Link>
        </p>
      </div>
    </Page>
  );
}
