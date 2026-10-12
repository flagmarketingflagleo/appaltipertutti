import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from "react";

import { nexiCancel, nexiStart, nexiStatus } from "@/lib/gc/api.functions";
import { traccia } from "@/lib/gc/analytics";
import { fmtDay, fmtPrezzo } from "@/lib/gc/format";
import type { Billing, NexiConf, NexiStart, NexiStatus, Plans } from "@/lib/gc/types";

/**
 * Acquisto e gestione del piano con Nexi XPay, dentro la pagina del radar.
 *
 * Il cliente sceglie il piano, compila i dati di fatturazione, vede il riepilogo e viene
 * mandato alla pagina di pagamento di Nexi con un modulo POST. Al ritorno (?pagamento=esito)
 * la pagina interroga il database finché l'ordine non è chiuso e mostra l'esito; la notifica
 * che attiva il piano arriva da Nexi al database, non dal browser.
 */

type Piano = "pro" | "studio";
type Periodo = "month" | "year";
type Scelta = { plan: Piano; period: Periodo };

type Props = {
  token: string;
  email: string;
  plan: string;
  promoUntil: string | null;
  plans: Plans;
  nexi: NexiConf;
  contactEmail: string | null;
  /** parametro ?pagamento= con cui Nexi rimanda il cliente qui */
  ritorno?: "esito" | "annullato";
  /** piano scelto nella pagina prezzi: il modulo si apre già su quel piano */
  preseleziona?: Piano;
  /** da chiamare quando il piano è cambiato, per ricaricare la pagina del radar */
  onPianoCambiato: () => Promise<void> | void;
};

const NOME_PIANO: Record<Piano, string> = { pro: "Pro", studio: "Studio" };
const NOME_PERIODO: Record<Periodo, string> = { month: "mensile", year: "annuale" };
const PERIODO_LABEL: Record<string, string> = { month: "ogni mese", year: "ogni anno" };

function vuoto(): Billing {
  return { name: "", vat: "", cf: "", address: "", cap: "", city: "", prov: "", sdi: "", pec: "" };
}

/** Manda il browser alla pagina di pagamento di Nexi con un modulo POST (il GET è deprecato). */
function vaiANexi(avvio: Extract<NexiStart, { ok: true }>) {
  const f = document.createElement("form");
  f.method = "POST";
  f.action = avvio.action;
  f.acceptCharset = avvio.charset || "ISO-8859-1";
  f.style.display = "none";
  for (const [nome, valore] of Object.entries(avvio.fields)) {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = nome;
    i.value = String(valore ?? "");
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}

export function PagamentoNexi({ token, email, plan, promoUntil, plans, nexi, contactEmail, ritorno, preseleziona, onPianoCambiato }: Props) {
  const [stato, setStato] = useState<Extract<NexiStatus, { ok: true }> | null>(null);
  const [statoErrore, setStatoErrore] = useState(false);
  const [scelta, setScelta] = useState<Scelta | null>(
    preseleziona && plan === "free" ? { plan: preseleziona, period: "month" } : null,
  );
  const radice = useRef<HTMLDivElement>(null);

  // Chi arriva dalla pagina prezzi trova il modulo già aperto e la pagina scorre fin qui.
  useEffect(() => {
    if (preseleziona && plan === "free") radice.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [preseleziona, plan]);
  const [fatt, setFatt] = useState<Billing>(vuoto);
  const [avvio, setAvvio] = useState<Extract<NexiStart, { ok: true }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [attesa, setAttesa] = useState<"no" | "in-corso" | "lunga">(ritorno === "esito" ? "in-corso" : "no");
  const prefillato = useRef(false);

  const pagato = plan !== "free";
  const promoAttiva = Boolean(promoUntil && new Date(promoUntil).getTime() > Date.now());
  const contatto = contactEmail ? (
    <>
      {" "}
      Se serve aiuto scrivi a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
    </>
  ) : null;

  async function leggiStato(): Promise<Extract<NexiStatus, { ok: true }> | null> {
    try {
      const s = await nexiStatus({ data: { token } });
      if (!s.ok) {
        setStatoErrore(true);
        return null;
      }
      setStato(s);
      if (!prefillato.current && s.billing) {
        prefillato.current = true;
        setFatt({ ...vuoto(), ...s.billing });
      }
      return s;
    } catch {
      setStatoErrore(true);
      return null;
    }
  }

  // Stato del piano e dati di fatturazione già salvati.
  useEffect(() => {
    void leggiStato();
  }, [token]);

  // Ritorno da Nexi: si aspetta la notifica che chiude l'ordine (di solito pochi secondi).
  useEffect(() => {
    if (attesa !== "in-corso") return;
    let tentativi = 0;
    let fermo = false;
    const timer = window.setInterval(() => {
      if (fermo) return;
      tentativi += 1;
      void leggiStato().then(async (s) => {
        if (fermo) return;
        const ordine = s?.last_order ?? null;
        if (ordine && ordine.status !== "pending") {
          fermo = true;
          window.clearInterval(timer);
          setAttesa("no");
          if (ordine.status === "paid") {
            const chiave = `apt-acquisto-${ordine.codTrans}`;
            let giaSegnato = false;
            try {
              giaSegnato = window.sessionStorage.getItem(chiave) !== null;
              window.sessionStorage.setItem(chiave, "1");
            } catch {
              // senza memoria di sessione l'evento parte comunque una volta
            }
            if (!giaSegnato) {
              traccia("purchase", {
                transaction_id: ordine.codTrans,
                value: ordine.total,
                currency: "EUR",
                items: [
                  {
                    item_id: `${ordine.plan}_${ordine.period}`,
                    item_name: `${NOME_PIANO[ordine.plan as Piano] ?? ordine.plan} ${NOME_PERIODO[ordine.period as Periodo] ?? ordine.period}`,
                    price: ordine.total,
                    quantity: 1,
                  },
                ],
              });
            }
            await onPianoCambiato();
          }
        } else if (tentativi >= 25) {
          fermo = true;
          window.clearInterval(timer);
          setAttesa("lunga");
        }
      });
    }, 3000);
    return () => {
      fermo = true;
      window.clearInterval(timer);
    };
  }, [attesa]);

  function prezzo(p: Piano, periodo: Periodo): number {
    const listino = periodo === "month" ? plans[p].price_month : plans[p].price_year;
    const promo = periodo === "month" ? plans[p].promo_month : plans[p].promo_year;
    return promoAttiva && promo > 0 ? promo : listino;
  }

  function scegli(s: Scelta) {
    setScelta(s);
    setAvvio(null);
    setErrore(null);
  }

  async function avvia(e: FormEvent) {
    e.preventDefault();
    if (!scelta) return;
    setBusy(true);
    setErrore(null);
    try {
      const res = await nexiStart({
        data: {
          token,
          plan: scelta.plan,
          period: scelta.period,
          billing: fatt.name.trim() ? fatt : undefined,
        },
      });
      if (res.ok) {
        setAvvio(res);
        traccia("begin_checkout", {
          value: res.order.total,
          currency: "EUR",
          items: [{ item_id: `${scelta.plan}_${scelta.period}`, item_name: res.order.name, price: res.order.total, quantity: 1 }],
        });
      } else if (res.error === "billing") {
        setErrore("Per la fattura servono il nome dell'impresa e la partita IVA oppure il codice fiscale.");
      } else if (res.error === "not_configured") {
        setErrore("I pagamenti non sono attivi in questo momento. Riprova più tardi.");
      } else {
        setErrore("Non è stato possibile preparare il pagamento. Riprova tra poco.");
      }
    } catch {
      setErrore("Non è stato possibile preparare il pagamento per un problema tecnico. Riprova tra poco.");
    } finally {
      setBusy(false);
    }
  }

  async function disdici() {
    if (!window.confirm("Disdire il rinnovo? Il piano resta attivo fino alla scadenza già pagata.")) return;
    setBusy(true);
    setErrore(null);
    try {
      const res = await nexiCancel({ data: { token } });
      if (res.ok) {
        await leggiStato();
      } else {
        setErrore("La disdetta non è andata a buon fine. Riprova tra poco.");
      }
    } catch {
      setErrore("La disdetta non è andata a buon fine per un problema tecnico. Riprova tra poco.");
    } finally {
      setBusy(false);
    }
  }

  const campo = (k: keyof Billing, label: string, extra: Partial<InputHTMLAttributes<HTMLInputElement>> = {}) => (
    <div className="gc-campo">
      <label htmlFor={`fatt-${k}`}>{label}</label>
      <input
        id={`fatt-${k}`}
        className="gc-input"
        value={fatt[k] ?? ""}
        onChange={(e) => setFatt((f) => ({ ...f, [k]: e.target.value }))}
        autoComplete="off"
        {...extra}
      />
    </div>
  );

  const ultimo = stato?.last_order ?? null;
  const ivaTesto = nexi.iva > 0 ? ` + IVA ${fmtPrezzo(nexi.iva)}%` : "";

  return (
    <div ref={radice} style={{ display: "grid", gap: "1rem", scrollMarginTop: "1rem" }}>
      {ritorno === "annullato" ? (
        <p className="gc-nota" role="status">
          Pagamento annullato: non è stato addebitato nulla. Puoi riprovare quando vuoi.
        </p>
      ) : null}

      {attesa === "in-corso" ? (
        <p className="gc-esito" role="status">
          Grazie. Sto aspettando la conferma del pagamento da Nexi: di solito arriva in pochi secondi e
          questa pagina si aggiorna da sola.
        </p>
      ) : attesa === "lunga" ? (
        <p className="gc-nota gc-nota--allerta" role="status">
          La conferma del pagamento non è ancora arrivata. Se hai pagato, il piano si attiva appena Nexi
          ce lo comunica: ricarica questa pagina tra qualche minuto.{contatto}
        </p>
      ) : ritorno === "esito" && ultimo ? (
        ultimo.status === "paid" ? (
          <p className="gc-esito" role="status">
            Pagamento riuscito: il piano {NOME_PIANO[ultimo.plan as Piano] ?? ultimo.plan} è attivo. La
            ricevuta arriva per email.
          </p>
        ) : ultimo.status === "cancelled" ? (
          <p className="gc-nota" role="status">
            Pagamento annullato: non è stato addebitato nulla.
          </p>
        ) : (
          <p className="gc-nota gc-nota--allerta" role="status">
            Il pagamento non è andato a buon fine e non è stato addebitato nulla. Puoi riprovare con
            un'altra carta.{contatto}
          </p>
        )
      ) : null}

      {stato?.test ? (
        <p className="gc-nota">
          Ambiente di prova di Nexi: i pagamenti fatti ora non sono veri.
        </p>
      ) : null}

      {pagato ? (
        <>
          {stato && stato.provider === "nexi" ? (
            <>
              <p>
                Piano {NOME_PIANO[stato.plan as Piano] ?? stato.plan}
                {stato.period ? ` ${NOME_PERIODO[stato.period as Periodo] ?? stato.period}` : ""}
                {stato.plan_until ? `, pagato fino al ${fmtDay(stato.plan_until)}` : ""}.{" "}
                {stato.auto_renew
                  ? `Il rinnovo è automatico ${PERIODO_LABEL[stato.period ?? ""] ?? "alla scadenza"} con la stessa carta, allo stesso prezzo.`
                  : "Il rinnovo automatico è disattivato: alla scadenza il radar torna al piano gratuito, a meno che tu non paghi di nuovo da qui."}
              </p>
              <p className="gc-azioni">
                {stato.auto_renew ? (
                  <button type="button" className="gc-btn gc-btn--linea" disabled={busy} onClick={() => void disdici()}>
                    Disdici il rinnovo
                  </button>
                ) : null}
                {contactEmail ? (
                  <span className="gc-tenue gc-piccolo">
                    Per cambiare piano o carta scrivi a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
                  </span>
                ) : null}
              </p>
            </>
          ) : stato ? (
            <p>
              {contactEmail ? (
                <>
                  Per cambiare piano o disdire scrivi a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
                </>
              ) : (
                "Per cambiare piano o disdire usa il collegamento che trovi nella ricevuta del pagamento."
              )}
            </p>
          ) : statoErrore ? (
            <p className="gc-tenue">I dettagli dell'abbonamento non si caricano in questo momento.</p>
          ) : (
            <p className="gc-tenue">Carico i dettagli dell'abbonamento…</p>
          )}
        </>
      ) : (
        <>
          <p>
            Con Pro segui tutta Italia e più settori, fino a {plans.pro.profiles} radar, vedi l'elenco completo
            delle gare, salvi le preferite con il promemoria della scadenza e scarichi tutto in CSV.
          </p>
          {promoAttiva && plans.pro.promo_month > 0 && plans.pro.promo_month < plans.pro.price_month ? (
            <p className="gc-nota">
              <strong>Prezzo riservato a chi si è iscritto:</strong> Pro a {fmtPrezzo(plans.pro.promo_month)} € al
              mese invece di {fmtPrezzo(plans.pro.price_month)}, e il prezzo resta bloccato finché tieni
              l'abbonamento. Vale fino al {fmtDay(promoUntil, false)}.
            </p>
          ) : null}
          <p className="gc-azioni">
            {(
              [
                ["pro", "month", `Passa a Pro, ${fmtPrezzo(prezzo("pro", "month"))} € al mese${ivaTesto}`],
                ["pro", "year", `Pro annuale, ${fmtPrezzo(prezzo("pro", "year"))} € l'anno${ivaTesto}`],
                ["studio", "month", `Studio, ${fmtPrezzo(prezzo("studio", "month"))} € al mese${ivaTesto}`],
                ["studio", "year", `Studio annuale, ${fmtPrezzo(prezzo("studio", "year"))} € l'anno${ivaTesto}`],
              ] as [Piano, Periodo, string][]
            ).map(([p, per, label]) => {
              const attiva = scelta?.plan === p && scelta.period === per;
              return (
                <button
                  key={`${p}-${per}`}
                  type="button"
                  className={attiva ? "gc-btn" : "gc-btn gc-btn--linea"}
                  disabled={busy}
                  aria-pressed={attiva}
                  onClick={() => scegli({ plan: p, period: per })}
                >
                  {label}
                </button>
              );
            })}
          </p>

          {scelta && !avvio ? (
            <form className="gc-pannello" onSubmit={(e) => void avvia(e)} aria-labelledby="h-fatturazione">
              <h3 id="h-fatturazione" style={{ margin: 0 }}>
                Dati per la fattura: {NOME_PIANO[scelta.plan]} {NOME_PERIODO[scelta.period]},{" "}
                {fmtPrezzo(prezzo(scelta.plan, scelta.period))} €{ivaTesto}
              </h3>
              <p className="gc-aiuto">
                La fattura è intestata a questi dati. Servono il nome dell'impresa e la partita IVA
                oppure il codice fiscale; gli altri campi sono facoltativi.
              </p>
              {campo("name", "Impresa o professionista", { required: true, maxLength: 120, autoComplete: "organization" })}
              <div className="gc-due-campi">
                {campo("vat", "Partita IVA", { maxLength: 20, inputMode: "numeric" })}
                {campo("cf", "Codice fiscale", { maxLength: 20 })}
              </div>
              {campo("address", "Indirizzo", { maxLength: 120, autoComplete: "street-address" })}
              <div className="gc-due-campi">
                {campo("cap", "CAP", { maxLength: 10, inputMode: "numeric", autoComplete: "postal-code" })}
                {campo("city", "Città", { maxLength: 80, autoComplete: "address-level2" })}
              </div>
              <div className="gc-due-campi">
                {campo("prov", "Provincia (sigla)", { maxLength: 4 })}
                {campo("sdi", "Codice destinatario SDI", { maxLength: 10 })}
              </div>
              {campo("pec", "PEC", { maxLength: 120, type: "email" })}
              <p className="gc-aiuto">
                La ricevuta arriva a {email}. Pagamento con carta sulla pagina sicura di Nexi: il numero
                della carta non passa da questo sito.{" "}
                <Link to="/rimborsi">Rimborso entro 14 giorni dal primo pagamento.</Link>
              </p>
              <div className="gc-azioni">
                <button type="submit" className="gc-btn" disabled={busy}>
                  {busy ? "Preparo il pagamento" : "Continua"}
                </button>
                <button type="button" className="gc-btn gc-btn--linea" disabled={busy} onClick={() => setScelta(null)}>
                  Annulla
                </button>
              </div>
            </form>
          ) : null}

          {avvio ? (
            <div className="gc-pannello" role="region" aria-labelledby="h-riepilogo">
              <h3 id="h-riepilogo" style={{ margin: 0 }}>
                Riepilogo
              </h3>
              <p style={{ margin: 0 }}>
                {avvio.order.name}
                {avvio.order.recurring ? `, si rinnova ${PERIODO_LABEL[scelta?.period ?? ""] ?? "alla scadenza"}` : ""}.
              </p>
              <table className="gc-tab" style={{ minWidth: 0 }}>
                <tbody>
                  <tr>
                    <th scope="row">Prezzo</th>
                    <td>{fmtPrezzo(avvio.order.net)} €</td>
                  </tr>
                  {avvio.order.vat_rate > 0 ? (
                    <tr>
                      <th scope="row">IVA {fmtPrezzo(avvio.order.vat_rate)}%</th>
                      <td>{fmtPrezzo(Math.round((avvio.order.total - avvio.order.net) * 100) / 100)} €</td>
                    </tr>
                  ) : (
                    <tr>
                      <th scope="row">IVA</th>
                      <td>non applicata</td>
                    </tr>
                  )}
                  <tr>
                    <th scope="row">Totale</th>
                    <td>
                      <strong>{fmtPrezzo(avvio.order.total)} €</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="gc-aiuto">
                Premendo «Paga» vai alla pagina sicura di Nexi, dove inserisci la carta. Al termine torni qui
                e il piano si attiva da solo.
              </p>
              <div className="gc-azioni">
                <button type="button" className="gc-btn" disabled={busy} onClick={() => vaiANexi(avvio)}>
                  Paga {fmtPrezzo(avvio.order.total)} € con Nexi
                </button>
                <button type="button" className="gc-btn gc-btn--linea" disabled={busy} onClick={() => setAvvio(null)}>
                  Indietro
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {errore ? (
        <p className="gc-errore" role="alert">
          {errore}
        </p>
      ) : null}
    </div>
  );
}
