import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Page, useSettings } from "@/components/gc/Page";
import { SITE } from "@/lib/gc/config";
import { loadPaddle } from "@/lib/gc/paddle";

/**
 * Pagina a cui Paddle manda i clienti dalle sue email (per esempio per aggiornare la carta).
 * Basta caricare Paddle.js: se nell'indirizzo c'è il parametro _ptxn apre da solo il pagamento.
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
  const { plans, contactEmail } = useSettings();
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
          Se arrivi da un'email di Paddle, la finestra di pagamento si apre da sola in pochi
          secondi.
        </p>
      </div>
      <div className="gc-wrap gc-prosa">
        {!token ? (
          <p className="gc-nota">I pagamenti non sono ancora attivi su questo sito.</p>
        ) : stato === "errore" ? (
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
        )}
        <p>
          Per attivare un piano o cambiarlo apri la pagina del tuo radar: il collegamento è nella
          email che hai ricevuto quando lo hai attivato. Il pagamento è gestito da Paddle, il
          nostro rivenditore.
        </p>
        <p>
          <Link to="/prezzi">Vedi piani e prezzi</Link>
        </p>
      </div>
    </Page>
  );
}
