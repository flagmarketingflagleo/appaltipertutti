import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { searchCpv } from "@/lib/gc/api.functions";
import { fmtInt } from "@/lib/gc/format";
import type { CpvHit } from "@/lib/gc/types";

/**
 * Filtri precisi del radar, solo per i piani a pagamento: codici CPV e parole da escludere.
 * Per il piano gratuito mostra che cosa sono e che si sbloccano con Pro.
 */

export function CosaEIlCpv() {
  return (
    <p className="gc-aiuto">
      Il CPV (Common Procurement Vocabulary) è il codice europeo con cui ogni ente classifica ciò che
      compra: per esempio 90910000 «Servizi di pulizia», 45000000 «Lavori di costruzione», 79340000
      «Servizi pubblicitari». Scegliendo i tuoi codici il radar segnala solo le gare classificate così,
      compresi i sotto-codici.
    </p>
  );
}

type Props = {
  uid: string;
  cpv: string[];
  labels: Record<string, string>;
  exclude: string;
  onCpv: (codes: string[], labels: Record<string, string>) => void;
  onExclude: (v: string) => void;
};

export function FiltriCpv({ uid, cpv, labels, exclude, onCpv, onExclude }: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CpvHit[]>([]);
  const [cerco, setCerco] = useState(false);

  useEffect(() => {
    const testo = q.trim();
    if (testo.length < 2) {
      setHits([]);
      return;
    }
    let vivo = true;
    const timer = window.setTimeout(() => {
      setCerco(true);
      searchCpv({ data: { q: testo } })
        .then((r) => {
          if (vivo) setHits(r);
        })
        .catch(() => {
          if (vivo) setHits([]);
        })
        .finally(() => {
          if (vivo) setCerco(false);
        });
    }, 300);
    return () => {
      vivo = false;
      window.clearTimeout(timer);
    };
  }, [q]);

  function aggiungi(h: CpvHit) {
    if (cpv.includes(h.code) || cpv.length >= 20) return;
    onCpv([...cpv, h.code], { ...labels, [h.code]: h.label });
    setQ("");
    setHits([]);
  }

  function togli(code: string) {
    const { [code]: _tolto, ...resto } = labels;
    onCpv(
      cpv.filter((c) => c !== code),
      resto,
    );
  }

  return (
    <details className="gc-dettagli" open={cpv.length > 0 || exclude !== ""}>
      <summary>
        Filtri precisi: {cpv.length === 0 ? "nessun codice CPV" : `${cpv.length} ${cpv.length === 1 ? "codice CPV" : "codici CPV"}`}
        {exclude.trim() ? ", parole escluse" : ""}
      </summary>
      <div style={{ display: "grid", gap: "0.9rem", paddingTop: "0.6rem" }}>
        <CosaEIlCpv />
        {cpv.length > 0 ? (
          <ul className="gc-etichette" aria-label="Codici CPV scelti">
            {cpv.map((c) => (
              <li key={c} className="gc-etichetta">
                <span className="gc-codice">{c}</span> {labels[c] ?? ""}
                <button type="button" className="gc-etichetta__via" onClick={() => togli(c)} aria-label={`Togli ${c}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="gc-campo">
          <label htmlFor={`${uid}-cpv`}>Cerca un codice CPV</label>
          <input
            id={`${uid}-cpv`}
            className="gc-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              // Invio sceglie la prima voce invece di salvare tutto il radar.
              if (e.key === "Enter") {
                e.preventDefault();
                if (hits[0]) aggiungi(hits[0]);
              }
            }}
            placeholder="es. pulizia, oppure 9091"
            autoComplete="off"
            maxLength={80}
            aria-describedby={`${uid}-cpv-aiuto`}
          />
          <span id={`${uid}-cpv-aiuto`} className="gc-aiuto">
            Scrivi una parola o le prime cifre del codice. Accanto a ogni voce, le gare aperte oggi in quel ramo.
          </span>
          {q.trim().length >= 2 ? (
            <ul className="gc-suggerimenti" role="listbox" aria-label="Codici trovati">
              {cerco && hits.length === 0 ? <li className="gc-tenue">Cerco…</li> : null}
              {!cerco && hits.length === 0 ? <li className="gc-tenue">Nessun codice con questa parola.</li> : null}
              {hits.map((h) => (
                <li key={h.code}>
                  <button
                    type="button"
                    className="gc-suggerimento"
                    disabled={cpv.includes(h.code)}
                    onClick={() => aggiungi(h)}
                  >
                    <span className="gc-codice">{h.code}</span> {h.label}
                    <span className="gc-tenue gc-piccolo"> · {h.open === 0 ? "nessuna gara aperta" : `${fmtInt(h.open)} ${h.open === 1 ? "gara aperta" : "gare aperte"}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="gc-campo">
          <label htmlFor={`${uid}-escludi`}>Parole da escludere</label>
          <input
            id={`${uid}-escludi`}
            className="gc-input"
            value={exclude}
            onChange={(e) => onExclude(e.target.value)}
            placeholder="es. ospedale, sanitario"
            maxLength={200}
            aria-describedby={`${uid}-escludi-aiuto`}
          />
          <span id={`${uid}-escludi-aiuto`} className="gc-aiuto">
            Le gare che contengono una di queste parole non compaiono. Separa con una virgola.
          </span>
        </div>
      </div>
    </details>
  );
}

/** Per il piano gratuito: che cosa sono i filtri precisi e che si sbloccano con Pro. */
export function FiltriCpvChiusi() {
  return (
    <details className="gc-dettagli">
      <summary>Filtri precisi: codici CPV e parole da escludere (con Pro)</summary>
      <div style={{ display: "grid", gap: "0.6rem", paddingTop: "0.6rem" }}>
        <CosaEIlCpv />
        <p className="gc-aiuto">
          Con il piano Pro aggiungi al settore i tuoi codici CPV e le parole da escludere: il radar
          segnala solo le gare che fanno davvero per te e non ti fa perdere tempo con le altre.{" "}
          <Link to="/prezzi">Vedi i piani</Link>
        </p>
      </div>
    </details>
  );
}
