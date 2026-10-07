import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Page, useSettings } from "@/components/gc/Page";
import { Registro } from "@/components/gc/Registro";
import { getRadar, radarAction, saveRadar } from "@/lib/gc/api.functions";
import { CATEGORIES, MIN_VALUES, REGIONS, SITE } from "@/lib/gc/config";
import { fmtInt, plural } from "@/lib/gc/format";
import { traccia } from "@/lib/gc/analytics";
import { closeCheckout, onPaddleEvent, openCheckout } from "@/lib/gc/paddle";
import type { Card, RadarData, RadarOk, RadarProfile } from "@/lib/gc/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAN_NAME: Record<string, string> = { free: "Gratis", pro: "Pro", studio: "Studio" };

type Search = { conferma?: number };

export const Route = createFileRoute("/radar/$token")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    conferma: s.conferma === 1 || s.conferma === "1" ? 1 : undefined,
  }),
  loaderDeps: ({ search }) => ({ conferma: search.conferma }),
  loader: async ({ params, deps }): Promise<RadarData> => {
    if (!UUID.test(params.token)) return { ok: false };
    try {
      return await getRadar({ data: { token: params.token, confirm: deps.conferma === 1 } });
    } catch {
      return { ok: false, error: "tecnico" };
    }
  },
  head: () => ({
    meta: [
      { title: `Il tuo radar | ${SITE.name}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RadarPage,
});

function payUrl(link: string, id: string, email: string): string {
  const sep = link.includes("?") ? "&" : "?";
  return `${link}${sep}client_reference_id=${encodeURIComponent(id)}&prefilled_email=${encodeURIComponent(email)}`;
}

function downloadCsv(name: string, items: Card[]) {
  const esc = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const head = ["Oggetto", "Titolo dell'avviso", "Ente", "Luogo", "Provincia", "Valore in euro", "Scadenza", "CIG", "Scheda"];
  const rows = items.map((c) => [
    c.what ?? c.title,
    c.title,
    c.buyer,
    c.place,
    c.province,
    c.value,
    c.deadline_local,
    c.cig,
    `${SITE.url}/gara/${c.id}-${c.slug}`,
  ]);
  const csv = [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function RadarPage() {
  const data = Route.useLoaderData();
  const { token } = Route.useParams();
  if (!data.ok) {
    const tecnico = data.error === "tecnico";
    return (
      <Page>
        <div className="gc-wrap gc-testata">
          <h1>{tecnico ? "Il radar non si apre" : "Radar non trovato"}</h1>
          <p className="gc-testata__sotto">
            {tecnico
              ? "C'è un problema tecnico in questo momento. Riprova tra qualche minuto: il tuo radar è al sicuro."
              : "Il collegamento non è valido oppure il radar è stato cancellato. Puoi attivarne uno nuovo in un minuto."}
          </p>
          {tecnico ? null : (
            <p>
              <Link to="/radar" className="gc-btn">
                Attiva il radar
              </Link>
            </p>
          )}
        </div>
      </Page>
    );
  }
  return (
    <Page>
      <RadarBody data={data} token={token} />
    </Page>
  );
}

type ProfiloProps = {
  p: RadarProfile;
  token: string;
  paid: boolean;
  shown: number;
  canRemove: boolean;
};

function Profilo({ p, token, paid, shown, canRemove }: ProfiloProps) {
  const router = useRouter();
  const [label, setLabel] = useState(p.label ?? "");
  const [q, setQ] = useState(p.q ?? "");
  const [regions, setRegions] = useState<string[]>(p.regions ?? []);
  const [categories, setCategories] = useState<string[]>(p.categories ?? []);
  const [min, setMin] = useState(p.min_value ? String(p.min_value) : "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const uid = `r${p.id}`;
  const hidden = p.matches.total - p.matches.items.length;

  async function save(active: boolean) {
    setBusy(true);
    setNote(null);
    try {
      const res = await saveRadar({
        data: {
          token,
          profileId: p.id,
          label: label.trim() || undefined,
          q: q.trim() || undefined,
          regions,
          categories,
          min: min ? Number(min) : null,
          active,
        },
      });
      if (res.ok) {
        setNote(active ? "Radar salvato. L'elenco qui accanto è aggiornato." : "Radar eliminato.");
        await router.invalidate();
      } else {
        setNote("Il radar non è stato salvato. Riprova tra poco.");
      }
    } catch {
      setNote("Il radar non è stato salvato per un problema tecnico. Riprova tra poco.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="gc-wrap gc-sezione" aria-labelledby={`${uid}-h`}>
      <div className="gc-sezione__testa">
        <h2 id={`${uid}-h`}>{p.label ?? "Radar"}</h2>
        <p className="gc-tenue">{plural(p.matches.total, "gara aperta", "gare aperte")}</p>
      </div>
      <div className="gc-due gc-due--radar">
        <form
          className="gc-pannello"
          onSubmit={(e) => {
            e.preventDefault();
            void save(true);
          }}
        >
          <div className="gc-campo">
            <label htmlFor={`${uid}-nome`}>Nome del radar</label>
            <input
              id={`${uid}-nome`}
              className="gc-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
            />
          </div>
          <div className="gc-campo">
            <label htmlFor={`${uid}-cosa`}>Cosa fa la tua impresa?</label>
            <textarea
              id={`${uid}-cosa`}
              className="gc-textarea"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={300}
              placeholder="es. pulizie, sanificazione, disinfestazione"
              aria-describedby={`${uid}-cosa-aiuto`}
            />
            <span id={`${uid}-cosa-aiuto`} className="gc-aiuto">
              Separa con una virgola le attività diverse.
            </span>
          </div>
          <details className="gc-dettagli">
            <summary>
              Regioni: {regions.length === 0 ? "tutta Italia" : plural(regions.length, "scelta", "scelte")}
            </summary>
            <div className="gc-scelte" role="group" aria-label="Regioni">
              {REGIONS.map((r) => (
                <label key={r.slug} className="gc-check">
                  <input
                    type="checkbox"
                    checked={regions.includes(r.slug)}
                    onChange={() => setRegions((l) => toggle(l, r.slug))}
                  />
                  <span>{r.name}</span>
                </label>
              ))}
            </div>
          </details>
          <details className="gc-dettagli">
            <summary>
              Settori: {categories.length === 0 ? "tutti" : plural(categories.length, "scelto", "scelti")}
            </summary>
            <div className="gc-scelte" role="group" aria-label="Settori">
              {CATEGORIES.map((c) => (
                <label key={c.slug} className="gc-check">
                  <input
                    type="checkbox"
                    checked={categories.includes(c.slug)}
                    onChange={() => setCategories((l) => toggle(l, c.slug))}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </details>
          <div className="gc-campo">
            <label htmlFor={`${uid}-min`}>Valore minimo</label>
            <select
              id={`${uid}-min`}
              className="gc-select"
              value={min}
              onChange={(e) => setMin(e.target.value)}
            >
              <option value="">Qualsiasi valore</option>
              {MIN_VALUES.map((m) => (
                <option key={m.value} value={String(m.value)}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="gc-azioni">
            <button type="submit" className="gc-btn" disabled={busy}>
              Salva il radar
            </button>
            {canRemove ? (
              <button
                type="button"
                className="gc-btn gc-btn--linea"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Eliminare questo radar?")) void save(false);
                }}
              >
                Elimina
              </button>
            ) : null}
          </div>
          {note ? (
            <p className="gc-esito" role="status">
              {note}
            </p>
          ) : null}
        </form>
        <div style={{ display: "grid", gap: "1rem" }}>
          {p.matches.relaxed ? (
            <p className="gc-nota">
              Nessuna gara contiene tutte le parole insieme: qui sotto trovi quelle che ne
              contengono almeno una.
            </p>
          ) : null}
          {p.matches.items.length > 0 ? (
            <Registro items={p.matches.items} />
          ) : (
            <div className="gc-vuoto">
              <p>
                Nessuna gara aperta corrisponde a questo radar. Prova con meno parole o con più
                regioni: appena esce una gara adatta la trovi qui.
              </p>
            </div>
          )}
          {hidden > 0 && !paid ? (
            <p className="gc-nota">
              Con il piano gratuito vedi le {shown} gare più recenti.{" "}
              {hidden === 1 ? "Ce n'è un'altra" : `Ce ne sono altre ${fmtInt(hidden)}`}: il piano Pro
              mostra l'elenco completo, fino a 200 gare per radar. <Link to="/prezzi">Vedi i piani</Link>
            </p>
          ) : null}
          {hidden > 0 && paid ? (
            <p className="gc-piccolo gc-tenue">
              Sono mostrate le {shown} gare più recenti su {fmtInt(p.matches.total)}. Per vederne
              altre restringi il radar con regioni, settori o valore minimo.
            </p>
          ) : null}
          {paid && p.matches.items.length > 0 ? (
            <p>
              <button
                type="button"
                className="gc-btn gc-btn--linea gc-btn--piccolo"
                onClick={() => downloadCsv("appaltipertutti-radar", p.matches.items)}
              >
                Scarica l'elenco in CSV
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function RadarBody({ data, token }: { data: RadarOk; token: string }) {
  const settings = useSettings();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const { subscriber, profiles, limits } = data;
  const { plans, contactEmail } = settings;
  const plan = subscriber.plan;
  const paid = plan !== "free";
  const maxProfiles = limits.profiles ?? 1;

  async function act(action: "unsubscribe" | "resubscribe" | "erase") {
    if (
      action === "erase" &&
      !window.confirm("Cancellare il radar e tutti i tuoi dati? L'operazione non si può annullare.")
    ) {
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const res = await radarAction({ data: { token, action } });
      if (!res.ok) {
        setNote("L'operazione non è riuscita. Riprova tra poco.");
      } else if (action === "erase") {
        window.location.assign("/");
      } else {
        await router.invalidate();
      }
    } catch {
      setNote("L'operazione non è riuscita per un problema tecnico. Riprova tra poco.");
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    setBusy(true);
    setNote(null);
    try {
      const res = await saveRadar({
        data: { token, profileId: null, regions: [], categories: [], min: null, active: true },
      });
      if (res.ok) {
        await router.invalidate();
      } else {
        setNote(
          res.error === "limit"
            ? `Il tuo piano include ${res.max ?? maxProfiles} radar.`
            : "Il radar non è stato aggiunto. Riprova tra poco.",
        );
      }
    } catch {
      setNote("Il radar non è stato aggiunto per un problema tecnico. Riprova tra poco.");
    } finally {
      setBusy(false);
    }
  }

  // Dopo il pagamento Paddle avvisa il sito in pochi secondi: nel frattempo la pagina si ricarica da sola.
  const [waiting, setWaiting] = useState<"no" | "attesa" | "lunga">("no");
  // L'acquisto in corso, per segnalare il pagamento riuscito con il suo importo.
  const [acquisto, setAcquisto] = useState<{ priceId: string; piano: string; valore: number } | null>(null);

  // Radar appena attivato (il modulo lascia un segno prima di arrivare qui).
  useEffect(() => {
    try {
      const origine = window.sessionStorage.getItem("apt-nuovo-radar");
      if (origine !== null) {
        window.sessionStorage.removeItem("apt-nuovo-radar");
        traccia("sign_up", { method: "radar", origine });
      }
    } catch {
      // nessuna memoria di sessione: niente da segnalare
    }
  }, []);

  useEffect(() => {
    return onPaddleEvent((event) => {
      if (event.name === "checkout.completed") setWaiting("attesa");
      if (event.name === "checkout.closed") void router.invalidate();
    });
  }, [router]);

  useEffect(() => {
    if (waiting !== "attesa") return;
    if (paid) {
      setWaiting("no");
      closeCheckout();
      if (acquisto) {
        traccia("purchase", {
          transaction_id: `${subscriber.id}-${Date.now()}`,
          value: acquisto.valore,
          currency: "EUR",
          items: [{ item_id: acquisto.priceId, item_name: acquisto.piano, price: acquisto.valore, quantity: 1 }],
        });
        setAcquisto(null);
      }
      return;
    }
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (tries > 30) {
        window.clearInterval(timer);
        setWaiting("lunga");
        return;
      }
      void router.invalidate();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [waiting, paid, router, acquisto, subscriber.id]);

  function offerta(priceId: string): { piano: string; valore: number } {
    const { pro, studio } = plans;
    if (priceId === pro.paddle_month) return { piano: "Pro mensile", valore: pro.price_month };
    if (priceId === pro.paddle_year) return { piano: "Pro annuale", valore: pro.price_year };
    if (priceId === studio.paddle_month) return { piano: "Studio mensile", valore: studio.price_month };
    return { piano: "Studio annuale", valore: studio.price_year };
  }

  async function buy(priceId: string) {
    if (!plans.paddle) return;
    setBusy(true);
    setNote(null);
    const o = offerta(priceId);
    setAcquisto({ priceId, ...o });
    traccia("begin_checkout", {
      value: o.valore,
      currency: "EUR",
      items: [{ item_id: priceId, item_name: o.piano, price: o.valore, quantity: 1 }],
    });
    try {
      await openCheckout(plans.paddle, priceId, subscriber.id, subscriber.email);
    } catch {
      setNote("La finestra di pagamento non si apre in questo momento. Riprova tra poco.");
    } finally {
      setBusy(false);
    }
  }

  const upgrades: { key: string; label: string; href?: string; priceId?: string }[] = [];
  const conPaddle = Boolean(plans.paddle && (plans.pro.paddle_month || plans.pro.paddle_year));
  if (!paid) {
    const { pro, studio } = plans;
    const go = (link: string) => payUrl(link, subscriber.id, subscriber.email);
    const offerte: [string, string, string | null, string | null][] = [
      ["pm", `Passa a Pro, ${fmtInt(pro.price_month)} € al mese + IVA`, pro.paddle_month, pro.link_month],
      ["py", `Pro annuale, ${fmtInt(pro.price_year)} € + IVA`, pro.paddle_year, pro.link_year],
      ["sm", `Studio, ${fmtInt(studio.price_month)} € al mese + IVA`, studio.paddle_month, studio.link_month],
      ["sy", `Studio annuale, ${fmtInt(studio.price_year)} € + IVA`, studio.paddle_year, studio.link_year],
    ];
    for (const [key, label, priceId, link] of offerte) {
      if (conPaddle) {
        if (priceId) upgrades.push({ key, label, priceId });
      } else if (link) {
        upgrades.push({ key, label, href: go(link) });
      }
    }
  }

  return (
    <>
      <div className="gc-wrap gc-testata">
        <h1>Il tuo radar</h1>
        <p className="gc-testata__sotto">
          {subscriber.email}, piano {PLAN_NAME[plan] ?? plan}. Questa pagina è personale: salvala tra
          i preferiti e non condividere il suo indirizzo.
        </p>
        {subscriber.status === "unsubscribed" ? (
          <div className="gc-nota gc-nota--allerta">
            <p>Gli avvisi sono disattivati.</p>
            <p>
              <button
                type="button"
                className="gc-btn gc-btn--piccolo"
                disabled={busy}
                onClick={() => void act("resubscribe")}
              >
                Riattiva gli avvisi
              </button>
            </p>
          </div>
        ) : !settings.emailEnabled ? (
          <p className="gc-nota">
            Gli avvisi per email partono a breve. Intanto questa pagina si aggiorna da sola più
            volte al giorno.
          </p>
        ) : !subscriber.confirmed ? (
          <p className="gc-nota">
            Controlla la posta: ti abbiamo scritto per confermare l'indirizzo. Senza conferma gli
            avvisi non partono.
          </p>
        ) : null}
        {waiting === "attesa" ? (
          <p className="gc-esito" role="status">
            Pagamento ricevuto, grazie. Sto attivando il piano: questa pagina si aggiorna da sola
            entro un minuto.
          </p>
        ) : waiting === "lunga" && !paid ? (
          <p className="gc-nota gc-nota--allerta" role="status">
            Il pagamento è arrivato ma il piano non risulta ancora attivo. Ricarica la pagina tra
            qualche minuto
            {contactEmail ? (
              <>
                ; se non cambia scrivi a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </>
            ) : null}
            .
          </p>
        ) : null}
        {note ? (
          <p className="gc-errore" role="alert">
            {note}
          </p>
        ) : null}
      </div>

      {profiles.map((p) => (
        <Profilo
          key={p.id}
          p={p}
          token={token}
          paid={paid}
          shown={limits.shown}
          canRemove={profiles.length > 1}
        />
      ))}

      <section className="gc-wrap gc-sezione gc-prosa" aria-labelledby="h-piano">
        <h2 id="h-piano">Piano e radar</h2>
        <p>
          Stai usando {profiles.length} di {maxProfiles} radar inclusi nel piano{" "}
          {PLAN_NAME[plan] ?? plan}.
        </p>
        {profiles.length < maxProfiles ? (
          <p>
            <button type="button" className="gc-btn gc-btn--linea" disabled={busy} onClick={() => void add()}>
              Aggiungi un radar
            </button>
          </p>
        ) : null}
        {paid ? (
          <p>
            {plans.portal ? (
              <a href={plans.portal} rel="noopener">
                Gestisci o disdici l'abbonamento
              </a>
            ) : contactEmail ? (
              <>
                Per cambiare piano o disdire scrivi a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
              </>
            ) : (
              "Per cambiare piano o disdire usa il collegamento che trovi nella ricevuta del pagamento."
            )}
          </p>
        ) : upgrades.length > 0 ? (
          <>
            <p>
              Con Pro segui fino a {plans.pro.profiles} radar, vedi l'elenco completo delle gare e lo
              scarichi in CSV.
            </p>
            <p className="gc-azioni">
              {upgrades.map((u) =>
                u.priceId ? (
                  <button
                    key={u.key}
                    type="button"
                    className="gc-btn"
                    disabled={busy}
                    onClick={() => void buy(u.priceId as string)}
                  >
                    {u.label}
                  </button>
                ) : (
                  <a key={u.key} className="gc-btn" href={u.href} rel="noopener">
                    {u.label}
                  </a>
                ),
              )}
            </p>
            <p className="gc-aiuto">
              {conPaddle
                ? "Il pagamento si apre in questa pagina ed è gestito da Paddle, il nostro rivenditore: la ricevuta arriva da Paddle e puoi inserire la partita IVA. Il piano si attiva da solo entro un minuto."
                : "Il pagamento avviene su Stripe. Il piano si attiva da solo subito dopo il pagamento: ti basta ricaricare questa pagina."}{" "}
              <Link to="/rimborsi">Rimborso entro 14 giorni dal primo pagamento.</Link>
            </p>
          </>
        ) : (
          <p>
            Il piano Pro, con più radar e l'elenco completo delle gare, apre a breve.{" "}
            <Link to="/prezzi">Vedi i piani</Link>
          </p>
        )}
      </section>

      <section className="gc-wrap gc-sezione gc-prosa" aria-labelledby="h-dati">
        <h2 id="h-dati">I tuoi dati</h2>
        <p>
          Puoi fermare gli avvisi oppure cancellare il radar con tutti i tuoi dati. La cancellazione
          è immediata e non si può annullare.
          {paid ? " Se hai un piano a pagamento, disdici prima l'abbonamento." : ""}
        </p>
        <p className="gc-azioni">
          {subscriber.status !== "unsubscribed" ? (
            <button
              type="button"
              className="gc-btn gc-btn--linea"
              disabled={busy}
              onClick={() => void act("unsubscribe")}
            >
              Disattiva gli avvisi
            </button>
          ) : null}
          <button
            type="button"
            className="gc-btn gc-btn--linea"
            disabled={busy}
            onClick={() => void act("erase")}
          >
            Cancella il radar e i miei dati
          </button>
        </p>
      </section>
    </>
  );
}
