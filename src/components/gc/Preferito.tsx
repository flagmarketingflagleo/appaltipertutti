import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { traccia } from "@/lib/gc/analytics";
import { favoriteState, setFavorite } from "@/lib/gc/api.functions";
import type { FavoriteState } from "@/lib/gc/types";

const GIORNI = [30, 10, 5];

/**
 * Pulsante "Salva tra i preferiti" nella scheda di una gara. Solo i piani a pagamento
 * salvano e ricevono il promemoria; agli altri spiega cosa si ottiene.
 */
export function Preferito({ tenderId, aperta }: { tenderId: number; aperta: boolean }) {
  const [stato, setStato] = useState<FavoriteState | "carico">("carico");
  const [busy, setBusy] = useState(false);
  const [nota, setNota] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    favoriteState({ data: { tenderId } })
      .then((s) => {
        if (vivo) setStato(s);
      })
      .catch(() => {
        if (vivo) setStato({ plan: null });
      });
    return () => {
      vivo = false;
    };
  }, [tenderId]);

  if (!aperta || stato === "carico") return null;

  if (stato.plan === null) {
    return (
      <p className="gc-preferito gc-tenue">
        Con il piano Pro salvi questa gara tra i preferiti e ricevi un promemoria 30, 10 e 5 giorni
        prima della scadenza. <a href="#radar">Attiva il radar</a> o <Link to="/prezzi">vedi i piani</Link>.
      </p>
    );
  }

  if (stato.plan === "free") {
    return (
      <p className="gc-preferito gc-tenue">
        I preferiti con il promemoria della scadenza sono del piano Pro.{" "}
        <Link to="/prezzi">Passa a Pro</Link>
      </p>
    );
  }

  async function cambia(on: boolean, remind?: number[]) {
    if (stato === "carico" || stato.plan === null) return;
    setBusy(true);
    setNota(null);
    try {
      const r = await setFavorite({ data: { tenderId, on, remind } });
      if (r.ok) {
        setStato({ plan: stato.plan, on: r.on, remind: r.remind ?? stato.remind });
        if (on) traccia("add_to_wishlist", { item_id: String(tenderId) });
      } else {
        setNota(r.error === "limit" ? "Hai raggiunto il massimo di 200 preferiti." : "Non sono riuscito a salvare. Riprova tra poco.");
      }
    } catch {
      setNota("Non sono riuscito a salvare. Riprova tra poco.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gc-preferito">
      <button
        type="button"
        className={stato.on ? "gc-btn gc-btn--piccolo" : "gc-btn gc-btn--piccolo gc-btn--linea"}
        disabled={busy}
        onClick={() => void cambia(!stato.on, stato.remind)}
        aria-pressed={stato.on}
      >
        {stato.on ? "★ Nei preferiti" : "☆ Salva tra i preferiti"}
      </button>
      {stato.on ? (
        <span className="gc-preferito__giorni" role="group" aria-label="Promemoria prima della scadenza">
          <span className="gc-tenue">Promemoria:</span>
          {GIORNI.map((g) => (
            <label key={g} className="gc-check gc-check--inline">
              <input
                type="checkbox"
                checked={stato.remind.includes(g)}
                disabled={busy}
                onChange={(e) => {
                  const nuovo = e.target.checked
                    ? [...stato.remind, g].sort((a, b) => b - a)
                    : stato.remind.filter((x) => x !== g);
                  void cambia(true, nuovo);
                }}
              />
              <span>{g} giorni</span>
            </label>
          ))}
        </span>
      ) : (
        <span className="gc-tenue gc-piccolo">Ti avvisiamo 30, 10 e 5 giorni prima della scadenza.</span>
      )}
      {nota ? (
        <span className="gc-errore" role="alert">
          {nota}
        </span>
      ) : null}
    </div>
  );
}
