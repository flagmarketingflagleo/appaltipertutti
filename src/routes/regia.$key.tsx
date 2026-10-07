import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";

import { Page } from "@/components/gc/Page";
import { getAdmin, saveAdmin } from "@/lib/gc/api.functions";
import { PADDLE_WEBHOOK_URL, SITE, STRIPE_WEBHOOK_URL } from "@/lib/gc/config";
import { fmtDay, fmtInt } from "@/lib/gc/format";
import type { AdminOk } from "@/lib/gc/types";

export const Route = createFileRoute("/regia/$key")({
  loader: async ({ params }): Promise<AdminOk> => {
    if (params.key.length < 20 || params.key.length > 80) throw notFound();
    const data = await getAdmin({ data: { key: params.key } });
    if (!data.ok) throw notFound();
    return data;
  },
  head: () => ({
    meta: [
      { title: `Cabina di regia | ${SITE.name}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Regia,
});

const OUTBOX_LABEL: Record<string, string> = {
  pending: "in coda",
  sent: "inviate",
  failed: "non riuscite",
};

type CampoProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
  placeholder?: string;
};

function Campo({ id, label, value, onChange, hint, type = "text", placeholder }: CampoProps) {
  return (
    <div className="gc-campo">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className="gc-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-describedby={hint ? `${id}-aiuto` : undefined}
      />
      {hint ? (
        <span id={`${id}-aiuto`} className="gc-aiuto">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function Stato({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li>
      <strong>{ok ? "Fatto" : "Da fare"}</strong>
      <span>{children}</span>
    </li>
  );
}

function clean(v: string): string | null {
  return v.trim() === "" ? null : v.trim();
}

function Regia() {
  const d = Route.useLoaderData();
  const { key } = Route.useParams();
  const router = useRouter();
  const s = d.settings;
  const plans = s.plans;

  const [ragione, setRagione] = useState(s.legal?.ragione_sociale ?? "");
  const [piva, setPiva] = useState(s.legal?.piva ?? "");
  const [sede, setSede] = useState(s.legal?.sede ?? "");
  const [emailLegale, setEmailLegale] = useState(s.legal?.email ?? "");
  const [open, setOpen] = useState(s.signup_enabled !== false);
  const [contact, setContact] = useState(s.site?.contact_email ?? "");
  const [from, setFrom] = useState(s.site?.email_from ?? "");
  const [tagId, setTagId] = useState(s.site?.tag_id ?? "");
  const [resend, setResend] = useState("");
  const [stripe, setStripe] = useState("");
  const [pm, setPm] = useState(plans?.pro.link_month ?? "");
  const [py, setPy] = useState(plans?.pro.link_year ?? "");
  const [sm, setSm] = useState(plans?.studio.link_month ?? "");
  const [sy, setSy] = useState(plans?.studio.link_year ?? "");
  const [portal, setPortal] = useState(plans?.portal ?? "");
  const [paddleToken, setPaddleToken] = useState(plans?.paddle_token ?? "");
  const [ppm, setPpm] = useState(plans?.pro.paddle_month ?? "");
  const [ppy, setPpy] = useState(plans?.pro.paddle_year ?? "");
  const [psm, setPsm] = useState(plans?.studio.paddle_month ?? "");
  const [psy, setPsy] = useState(plans?.studio.paddle_year ?? "");
  const [paddleSecret, setPaddleSecret] = useState("");
  const [paddleApi, setPaddleApi] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ where: string; ok: boolean; text: string } | null>(null);

  async function save(where: string, settings: Record<string, unknown>, secrets?: Record<string, string>) {
    setBusy(true);
    setNote(null);
    try {
      const res = await saveAdmin({ data: { key, settings, secrets } });
      if (res.ok) {
        setNote({ where, ok: true, text: "Salvato." });
        setResend("");
        setStripe("");
        setPaddleSecret("");
        setPaddleApi("");
        await router.invalidate();
      } else {
        setNote({ where, ok: false, text: "Non salvato: la chiave di accesso non è valida." });
      }
    } catch {
      setNote({ where, ok: false, text: "Non salvato per un problema tecnico. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  function saveLegal(e: FormEvent) {
    e.preventDefault();
    void save("legale", {
      legal: {
        ragione_sociale: clean(ragione),
        piva: clean(piva),
        sede: clean(sede),
        email: clean(emailLegale),
      },
      signup_enabled: open,
    });
  }

  function saveEmail(e: FormEvent) {
    e.preventDefault();
    void save(
      "email",
      { site: { ...(s.site ?? {}), contact_email: clean(contact), email_from: clean(from), tag_id: clean(tagId) } },
      resend.trim() ? { resend: resend.trim() } : undefined,
    );
  }

  function savePay(e: FormEvent) {
    e.preventDefault();
    if (!plans) return;
    const secrets: Record<string, string> = {};
    if (stripe.trim()) secrets.stripe = stripe.trim();
    if (paddleSecret.trim()) secrets.paddle = paddleSecret.trim();
    if (paddleApi.trim()) secrets.paddle_api = paddleApi.trim();
    void save(
      "pagamenti",
      {
        plans: {
          free: plans.free,
          pro: {
            ...plans.pro,
            link_month: clean(pm),
            link_year: clean(py),
            paddle_month: clean(ppm),
            paddle_year: clean(ppy),
          },
          studio: {
            ...plans.studio,
            link_month: clean(sm),
            link_year: clean(sy),
            paddle_month: clean(psm),
            paddle_year: clean(psy),
          },
          portal: clean(portal),
          paddle_token: clean(paddleToken),
        },
      },
      Object.keys(secrets).length > 0 ? secrets : undefined,
    );
  }

  const tokenOk = /^(live|test)_[a-z0-9]{8,80}$/i.test(paddleToken.trim());
  const prezzoOk = (v: string) => v.trim() === "" || /^pri_[a-z0-9]{8,40}$/i.test(v.trim());
  const prezziOk = [ppm, ppy, psm, psy].every(prezzoOk);
  const dominio = SITE.url.replace(/^https?:\/\//, "");

  const esito = (where: string) =>
    note && note.where === where ? (
      <p className={note.ok ? "gc-esito" : "gc-errore"} role="status">
        {note.text}
      </p>
    ) : null;

  const paddlePronto =
    /^(live|test)_/i.test(plans?.paddle_token ?? "") &&
    Boolean(plans?.pro.paddle_month || plans?.pro.paddle_year) &&
    d.secrets.paddle === true;
  const stripePronto = Boolean(plans?.pro.link_month || plans?.pro.link_year) && d.secrets.stripe;
  const pagamentiPronti = paddlePronto || stripePronto;
  const avvisi = d.pay_events ?? [];
  const outbox = Object.entries(d.email);

  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <h1>Cabina di regia</h1>
        <p className="gc-testata__sotto">
          Pagina riservata. Chi ha questo indirizzo può cambiare le impostazioni: non condividerlo.
        </p>
      </div>

      <section className="gc-wrap gc-sezione" aria-labelledby="h-manca">
        <div className="gc-sezione__testa">
          <h2 id="h-manca">Cosa manca per incassare</h2>
        </div>
        <ul className="gc-lista-stato">
          <Stato ok={d.signup_open}>
            Dati legali dell'impresa. Finché mancano, le iscrizioni restano chiuse.
          </Stato>
          <Stato ok={d.email_ready}>
            Email: chiave di Resend e mittente sul tuo dominio. Servono per la conferma e per gli
            avvisi.
          </Stato>
          <Stato ok={pagamentiPronti}>
            Pagamenti: token, prezzi e segreto delle notifiche di Paddle.
          </Stato>
        </ul>
        <p className="gc-nota" style={{ marginTop: "1.25rem" }}>
          Privacy, Termini e Rimborsi sono bozze: falle leggere al tuo consulente prima di aprire
          le iscrizioni.
        </p>
      </section>

      <section className="gc-wrap gc-sezione" aria-labelledby="h-numeri">
        <div className="gc-sezione__testa">
          <h2 id="h-numeri">Numeri</h2>
          {d.data.last_done ? (
            <p className="gc-tenue gc-piccolo">
              Ultima lettura delle fonti: {d.data.last_done.slice(0, 16).replace("T", " ")} UTC
            </p>
          ) : null}
        </div>
        <div className="gc-kpi">
          <div>
            <b>{fmtInt(d.kpi.subscribers)}</b>iscritti
          </div>
          <div>
            <b>{fmtInt(d.kpi.pro + d.kpi.studio)}</b>paganti
          </div>
          <div>
            <b>{fmtInt(d.kpi.mrr)} €</b>ricavo mensile stimato
          </div>
          <div>
            <b>{fmtInt(d.kpi.signups_7d)}</b>iscrizioni in 7 giorni
          </div>
          <div>
            <b>{fmtInt(d.kpi.searches_7d)}</b>ricerche in 7 giorni
          </div>
          <div>
            <b>{fmtInt(d.kpi.views_7d)}</b>schede aperte in 7 giorni
          </div>
          <div>
            <b>{fmtInt(d.data.home?.open ?? 0)}</b>gare aperte in archivio
          </div>
          <div>
            <b>{fmtInt(d.data.queue_errors_24h)}</b>errori di lettura in 24 ore
          </div>
        </div>
      </section>

      <section className="gc-wrap gc-sezione" aria-labelledby="h-legale">
        <div className="gc-sezione__testa">
          <h2 id="h-legale">1. Dati legali</h2>
        </div>
        <div className="gc-due">
          <form className="gc-pannello" onSubmit={saveLegal}>
            <Campo id="l-ragione" label="Ragione sociale" value={ragione} onChange={setRagione} />
            <Campo id="l-piva" label="Partita IVA" value={piva} onChange={setPiva} />
            <Campo id="l-sede" label="Sede legale" value={sede} onChange={setSede} />
            <Campo
              id="l-email"
              label="Email per le richieste sulla privacy"
              type="email"
              value={emailLegale}
              onChange={setEmailLegale}
            />
            <label className="gc-check">
              <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />
              <span>Iscrizioni aperte</span>
            </label>
            <div>
              <button type="submit" className="gc-btn" disabled={busy}>
                Salva i dati legali
              </button>
            </div>
            {esito("legale")}
          </form>
          <div className="gc-prosa">
            <p>
              Questi dati compaiono in fondo a ogni pagina, nella privacy, nei termini e nelle
              email. Le iscrizioni si aprono da sole quando la ragione sociale è compilata e la
              casella è spuntata.
            </p>
          </div>
        </div>
      </section>

      <section className="gc-wrap gc-sezione" aria-labelledby="h-email">
        <div className="gc-sezione__testa">
          <h2 id="h-email">2. Email</h2>
          <p className="gc-tenue gc-piccolo">
            {d.email_ready ? "Invio attivo" : "Invio spento"}
            {d.secrets.resend ? ", chiave salvata" : ""}
          </p>
        </div>
        <div className="gc-due">
          <form className="gc-pannello" onSubmit={saveEmail}>
            <Campo
              id="e-contatto"
              label="Email di contatto mostrata sul sito"
              type="email"
              value={contact}
              onChange={setContact}
            />
            <Campo
              id="e-mittente"
              label="Mittente delle email"
              value={from}
              onChange={setFrom}
              placeholder="Appalti per tutti <avvisi@tuodominio.it>"
              hint="Deve usare un dominio verificato su Resend."
            />
            <Campo
              id="e-tag"
              label="Codice Google Tag Manager o Analytics"
              value={tagId}
              onChange={setTagId}
              placeholder="GTM-XXXXXXX oppure G-XXXXXXXXXX"
              hint={
                tagId.trim() !== "" && !/^(GTM-[A-Z0-9]{4,12}|G-[A-Z0-9]{6,14})$/i.test(tagId.trim())
                  ? "Il codice non sembra valido: inizia con GTM- oppure con G-."
                  : "Appena salvato, il sito mostra il banner dei cookie e manda a Google gli eventi: ricerche, schede, radar attivati, pagamenti. Lascia vuoto per non usare Google."
              }
            />
            <Campo
              id="e-resend"
              label="Chiave API di Resend"
              type="password"
              value={resend}
              onChange={setResend}
              hint={
                d.secrets.resend
                  ? "Una chiave è già salvata. Compila solo per sostituirla."
                  : "Inizia con re_. Resta nel database, cifrata."
              }
            />
            <div>
              <button type="submit" className="gc-btn" disabled={busy}>
                Salva le impostazioni email
              </button>
            </div>
            {esito("email")}
          </form>
          <div className="gc-prosa">
            <p>
              Crea un account su resend.com, aggiungi il tuo dominio e copia nel pannello del
              dominio i record DNS che ti indica. Quando il dominio risulta verificato, crea una
              chiave API e incollala qui.
            </p>
            <p>
              Da quel momento partono da sole la email di conferma, il riepilogo del lunedì per i
              radar gratuiti e l'avviso di ogni mattina per i piani a pagamento.
            </p>
            {outbox.length > 0 ? (
              <p className="gc-tenue">
                Email {outbox.map(([k, n]) => `${OUTBOX_LABEL[k] ?? k}: ${fmtInt(n)}`).join(", ")}.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="gc-wrap gc-sezione" aria-labelledby="h-paga">
        <div className="gc-sezione__testa">
          <h2 id="h-paga">3. Pagamenti con Paddle</h2>
          <p className="gc-tenue gc-piccolo">
            {paddlePronto
              ? "Paddle collegato"
              : d.secrets.paddle
                ? "Segreto salvato, mancano token o prezzi"
                : "Da collegare"}
          </p>
        </div>
        <div className="gc-due">
          <form className="gc-pannello" onSubmit={savePay}>
            <Campo
              id="p-token"
              label="Token lato client"
              value={paddleToken}
              onChange={setPaddleToken}
              placeholder="live_..."
              hint={
                paddleToken.trim() !== "" && !tokenOk
                  ? "Non sembra un token lato client: deve iniziare con live_ oppure test_."
                  : "Inizia con live_. Se inizia con test_ il sito usa l'ambiente di prova di Paddle."
              }
            />
            <Campo id="p-pm" label="Prezzo Pro mensile" value={ppm} onChange={setPpm} placeholder="pri_..." />
            <Campo id="p-py" label="Prezzo Pro annuale" value={ppy} onChange={setPpy} placeholder="pri_..." />
            <Campo id="p-sm" label="Prezzo Studio mensile" value={psm} onChange={setPsm} placeholder="pri_..." />
            <Campo
              id="p-sy"
              label="Prezzo Studio annuale"
              value={psy}
              onChange={setPsy}
              placeholder="pri_..."
              hint={
                prezziOk
                  ? "Gli identificativi dei prezzi iniziano con pri_."
                  : "Almeno un prezzo non è valido: deve iniziare con pri_ (pro_ è il prodotto, non il prezzo)."
              }
            />
            <Campo
              id="p-segreto"
              label="Segreto della destinazione delle notifiche"
              type="password"
              value={paddleSecret}
              onChange={setPaddleSecret}
              hint={
                d.secrets.paddle
                  ? "Un segreto è già salvato. Compila solo per sostituirlo."
                  : "Inizia con pdl_ntfset_. Resta nel database, cifrato."
              }
            />
            <Campo
              id="p-api"
              label="Chiave API di Paddle (facoltativa)"
              type="password"
              value={paddleApi}
              onChange={setPaddleApi}
              hint={
                d.secrets.paddle_api
                  ? "Una chiave API è già salvata. Compila solo per sostituirla."
                  : "Serve solo se vuoi che Claude crei da solo prodotti, prezzi e notifiche. Resta nel database, cifrata, e la puoi revocare da Paddle quando vuoi."
              }
            />
            <Campo
              id="s-portale"
              label="Collegamento al portale clienti"
              value={portal}
              onChange={setPortal}
              placeholder="https://customer-portal.paddle.com/..."
              hint="Facoltativo. Permette ai clienti di disdire da soli."
            />
            <details className="gc-altro">
              <summary>In alternativa: Stripe</summary>
              <div className="gc-altro__corpo">
                <p className="gc-aiuto">
                  Serve solo se non usi Paddle. Crea in Stripe un collegamento di pagamento per
                  ogni prezzo e una destinazione webhook con gli eventi{" "}
                  <span className="gc-codice">checkout.session.completed</span> e{" "}
                  <span className="gc-codice">customer.subscription.deleted</span> a questo
                  indirizzo:{" "}
                  <span className="gc-codice" style={{ overflowWrap: "anywhere" }}>
                    {STRIPE_WEBHOOK_URL}
                  </span>
                </p>
                <Campo id="s-pm" label="Collegamento Pro mensile" value={pm} onChange={setPm} placeholder="https://buy.stripe.com/..." />
                <Campo id="s-py" label="Collegamento Pro annuale" value={py} onChange={setPy} placeholder="https://buy.stripe.com/..." />
                <Campo id="s-sm" label="Collegamento Studio mensile" value={sm} onChange={setSm} placeholder="https://buy.stripe.com/..." />
                <Campo id="s-sy" label="Collegamento Studio annuale" value={sy} onChange={setSy} placeholder="https://buy.stripe.com/..." />
                <Campo
                  id="s-segreto"
                  label="Segreto della firma del webhook di Stripe"
                  type="password"
                  value={stripe}
                  onChange={setStripe}
                  hint={
                    d.secrets.stripe
                      ? "Un segreto è già salvato. Compila solo per sostituirlo."
                      : "Inizia con whsec_. Resta nel database, cifrato."
                  }
                />
              </div>
            </details>
            <div>
              <button type="submit" className="gc-btn" disabled={busy}>
                Salva i pagamenti
              </button>
            </div>
            {esito("pagamenti")}
          </form>
          <div className="gc-prosa">
            <p>
              Le voci del menu di Paddle cambiano ogni tanto di posto: se non trovi una pagina dove
              indicato, cercala per nome.
            </p>
            <ol style={{ paddingLeft: "1.2rem", display: "grid", gap: "0.6rem" }}>
              <li>
                <strong>Approvazione del sito.</strong> Alla voce Website approval (sotto Checkout
                oppure sotto My account, Settings) chiedi l'approvazione di{" "}
                <span className="gc-codice">{dominio}</span>. Paddle controlla che sul sito ci
                siano prezzi, termini, privacy e rimborsi: sono già pubblicati. Compila prima i
                dati legali del punto 1, perché vuole leggere il nome dell'impresa nei termini.
              </li>
              <li>
                <strong>Prodotti e prezzi.</strong> In Catalog, Products crea due prodotti in
                abbonamento, Pro e Studio. Dai a ognuno un prezzo mensile e uno annuale in euro,
                IVA esclusa: {fmtInt(plans?.pro.price_month ?? 29)} e{" "}
                {fmtInt(plans?.pro.price_year ?? 290)} € per Pro,{" "}
                {fmtInt(plans?.studio.price_month ?? 79)} e {fmtInt(plans?.studio.price_year ?? 790)} €
                per Studio. Copia qui l'identificativo di ogni prezzo.
              </li>
              <li>
                <strong>Token.</strong> Alla voce Authentication (sotto Developer tools oppure
                sotto My account, Settings) crea un token lato client, cioè un client-side token,
                e incollalo qui. Non serve la chiave API.
              </li>
              <li>
                <strong>Notifiche.</strong> Alla voce Notifications (sotto Developer tools oppure
                sotto Events) aggiungi una destinazione di tipo URL con questo indirizzo:
                <br />
                <span className="gc-codice" style={{ overflowWrap: "anywhere" }}>
                  {PADDLE_WEBHOOK_URL}
                </span>
                <br />
                Scegli tutti gli eventi che iniziano con{" "}
                <span className="gc-codice">subscription</span> e l'evento{" "}
                <span className="gc-codice">transaction.completed</span>. Poi copia il segreto
                (secret key) di quella destinazione e incollalo qui.
              </li>
              <li>
                <strong>Collegamento predefinito.</strong> In Checkout, Checkout settings imposta
                come Default payment link{" "}
                <span className="gc-codice" style={{ overflowWrap: "anywhere" }}>
                  {SITE.url}/paga
                </span>
                .
              </li>
              <li>
                <strong>Prova.</strong> Attiva un radar con la tua email e paga dalla pagina del
                radar. Con un token <span className="gc-codice">test_</span> usi le carte di prova
                di Paddle; con un token <span className="gc-codice">live_</span> paghi davvero e
                poi ti rimborsi da Paddle.
              </li>
            </ol>
            <p>
              Quando un cliente paga, il suo radar passa da solo al piano giusto. Quando disdice,
              torna al piano gratuito alla fine del periodo pagato.
            </p>
            <h3>Ultimi avvisi ricevuti da Paddle</h3>
            {avvisi.length === 0 ? (
              <p className="gc-tenue">
                Ancora nessuno. Dopo il primo pagamento, o una prova dal simulatore di Paddle,
                compaiono qui entro un minuto.
              </p>
            ) : (
              <ul>
                {avvisi.map((a, i) => (
                  <li key={`${a.at}-${i}`}>
                    <span className="gc-codice">{a.type ?? "evento"}</span>: {a.outcome ?? "ricevuto"}{" "}
                    <span className="gc-tenue gc-piccolo">
                      ({a.at.slice(0, 16).replace("T", " ")} UTC)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="gc-wrap gc-sezione" aria-labelledby="h-iscritti">
        <div className="gc-sezione__testa">
          <h2 id="h-iscritti">Ultimi iscritti</h2>
        </div>
        {d.recent.length === 0 ? (
          <p className="gc-tenue">Ancora nessun iscritto.</p>
        ) : (
          <div className="gc-scorri">
            <table className="gc-tab">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Piano</th>
                  <th scope="col">Cosa cerca</th>
                  <th scope="col">Arrivo</th>
                  <th scope="col">Iscritto il</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((r) => (
                  <tr key={r.email}>
                    <td style={{ overflowWrap: "anywhere" }}>
                      {r.email}
                      {r.confirmed ? "" : " (da confermare)"}
                    </td>
                    <td>{r.plan}</td>
                    <td>{[r.q, ...(r.regions ?? [])].filter(Boolean).join(", ") || "tutto"}</td>
                    <td>{r.origin ?? ""}</td>
                    <td>{fmtDay(r.created)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="gc-wrap gc-sezione" aria-labelledby="h-ricerche">
        <div className="gc-sezione__testa">
          <h2 id="h-ricerche">Cosa cercano i visitatori</h2>
          <p className="gc-tenue gc-piccolo">Ultimi 7 giorni</p>
        </div>
        {d.top_queries.length === 0 ? (
          <p className="gc-tenue">Ancora nessuna ricerca.</p>
        ) : (
          <ul className="gc-indice">
            {d.top_queries.map(([q, n]) => (
              <li key={q}>
                <a href={`/cerca?q=${encodeURIComponent(q)}`}>
                  <span className="gc-indice__nome">{q}</span>
                  <span className="gc-indice__punti" aria-hidden="true" />
                  <span className="gc-indice__n">{fmtInt(n)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}
