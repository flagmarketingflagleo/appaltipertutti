import { createFileRoute } from "@tanstack/react-router";

import { Page, useSettings } from "@/components/gc/Page";
import { SITE } from "@/lib/gc/config";

const TITLE = `Informativa sulla privacy | ${SITE.name}`;
const DESCRIPTION =
  "Quali dati personali tratta Appalti per tutti, perché, per quanto tempo e come esercitare i tuoi diritti.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: TITLE }, { name: "description", content: DESCRIPTION }],
    links: [{ rel: "canonical", href: `${SITE.url}/privacy` }],
  }),
  component: Privacy,
});

function Privacy() {
  const { legal, signupOpen, contactEmail, plans, tagId } = useSettings();
  const soloStripe = !plans.paddle && Boolean(plans.pro.link_month || plans.pro.link_year);
  const email = legal.email ?? contactEmail;
  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <h1>Informativa sulla privacy</h1>
        <p className="gc-testata__sotto">Ultimo aggiornamento: 6 ottobre 2026.</p>
      </div>
      <div className="gc-wrap gc-prosa">
        {signupOpen ? null : (
          <p className="gc-nota">
            Il servizio è in fase di avvio: le iscrizioni non sono ancora aperte e il sito non
            raccoglie dati personali tramite moduli. Questa informativa descrive il trattamento che
            partirà con l'apertura del radar.
          </p>
        )}

        <h2>Chi tratta i dati</h2>
        {legal.ragione_sociale ? (
          <p>
            Il titolare del trattamento è {legal.ragione_sociale}
            {legal.sede ? `, con sede in ${legal.sede}` : ""}
            {legal.piva ? `, partita IVA ${legal.piva}` : ""}.
            {email ? (
              <>
                {" "}
                Per ogni richiesta sulla privacy scrivi a <a href={`mailto:${email}`}>{email}</a>.
              </>
            ) : null}
          </p>
        ) : (
          <p>
            I dati del titolare del trattamento saranno pubblicati qui prima dell'apertura delle
            iscrizioni.
          </p>
        )}

        <h2>Quali dati trattiamo</h2>
        <ul>
          <li>
            <strong>Indirizzo email</strong>, quando attivi un radar.
          </li>
          <li>
            <strong>Profilo del radar</strong>: le parole che descrivono la tua attività, le
            regioni, i settori e il valore minimo che scegli.
          </li>
          <li>
            <strong>Dati di pagamento</strong>, se passi a un piano a pagamento. Li raccoglie{" "}
            {soloStripe
              ? "Stripe"
              : "Paddle.com, che vende il servizio come rivenditore e li tratta come titolare autonomo, secondo la propria informativa"}
            : noi riceviamo l'esito, il piano scelto e gli identificativi del cliente e
            dell'abbonamento, non il numero della carta.
          </li>
          <li>
            <strong>Ricerche e schede aperte</strong>, in forma anonima: registriamo il testo
            cercato e la scheda vista, senza collegarli a te o al tuo indirizzo IP.
          </li>
          <li>
            <strong>Dati tecnici</strong>, come l'indirizzo IP, che i fornitori di rete trattano
            per il tempo necessario a consegnare le pagine e a proteggere il sito.
          </li>
        </ul>

        <h2>Perché li trattiamo</h2>
        <ul>
          <li>
            Per fornirti il radar e gli avvisi che hai chiesto (esecuzione del servizio, articolo
            6, paragrafo 1, lettera b del GDPR).
          </li>
          <li>
            Per emettere i documenti fiscali e rispettare gli obblighi di legge (lettera c).
          </li>
          <li>
            Per proteggere il sito e capire, in forma aggregata, che cosa viene cercato (legittimo
            interesse, lettera f).
          </li>
        </ul>
        <p>Non vendiamo i dati e non li usiamo per la pubblicità di terzi.</p>

        <h2>Chi li riceve</h2>
        <p>
          I dati sono trattati da fornitori che lavorano per noi: Supabase per il database,
          ospitato nell'Unione europea; Cloudflare, tramite Higgsfield, per la pubblicazione del
          sito; Resend per l'invio delle email; {soloStripe ? "Stripe" : "Paddle"} per i pagamenti. Alcuni di questi fornitori
          hanno sede negli Stati Uniti: i trasferimenti avvengono con le garanzie previste dal
          GDPR.
        </p>

        <h2>Per quanto tempo</h2>
        <ul>
          <li>
            Email e profilo del radar: finché il radar resta attivo. Puoi cancellarli in ogni
            momento dalla pagina del tuo radar, con effetto immediato.
          </li>
          <li>Dati di fatturazione: per il tempo richiesto dalla legge, di norma dieci anni.</li>
          <li>Ricerche anonime: non sono riconducibili a una persona.</li>
        </ul>

        <h2>Cookie e strumenti di misurazione</h2>
        <p>
          Il sito usa cookie tecnici, necessari al funzionamento e alla sicurezza (compresi quelli del
          fornitore di rete Cloudflare e, durante il pagamento, quelli di Paddle). I caratteri
          tipografici sono serviti dal sito stesso.
        </p>
        {tagId ? (
          <>
            <p>
              Solo con il tuo consenso, espresso nel banner alla prima visita, usiamo strumenti di
              Google: Google Analytics per statistiche sulle pagine visitate e Google Ads per misurare
              le campagne pubblicitarie e mostrare annunci pertinenti. Finché non acconsenti questi
              strumenti non scrivono cookie. Puoi cambiare o ritirare il consenso in ogni momento dal
              collegamento «Cookie» in fondo a ogni pagina. I dati raccolti sono trattati da Google
              Ireland Ltd secondo le sue{" "}
              <a href="https://policies.google.com/privacy" rel="noopener">
                informazioni sulla privacy
              </a>
              .
            </p>
          </>
        ) : (
          <p>
            Appalti per tutti non usa cookie di profilazione né strumenti di tracciamento
            pubblicitario.
          </p>
        )}

        <h2>I tuoi diritti</h2>
        <p>
          Puoi chiedere di accedere ai tuoi dati, correggerli, cancellarli, limitarne l'uso,
          riceverne una copia e opporti al trattamento.{" "}
          {email ? "Scrivi all'indirizzo indicato sopra" : "Scrivi al titolare"}: rispondiamo entro
          un mese. Puoi anche presentare un reclamo al Garante per la protezione dei dati personali.
        </p>
        <p>Ogni email che inviamo contiene il collegamento per disattivare gli avvisi.</p>
      </div>
    </Page>
  );
}
