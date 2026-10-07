import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EVENTO_APRI_CONSENSO, leggiConsenso, salvaConsenso } from "@/lib/gc/analytics";

/**
 * Banner del consenso per statistiche e pubblicità. Compare solo se il sito ha un codice
 * Google configurato e il visitatore non ha ancora scelto; si riapre dal collegamento "Cookie".
 */
export function Consenso({ attivo }: { attivo: boolean }) {
  const [aperto, setAperto] = useState(false);
  const [dettagli, setDettagli] = useState(false);
  const [statistiche, setStatistiche] = useState(true);
  const [pubblicita, setPubblicita] = useState(true);

  useEffect(() => {
    if (!attivo) return;
    const salvato = leggiConsenso();
    if (!salvato) setAperto(true);
    const apri = () => {
      const c = leggiConsenso();
      if (c) {
        setStatistiche(c.statistiche);
        setPubblicita(c.pubblicita);
      }
      setDettagli(true);
      setAperto(true);
    };
    window.addEventListener(EVENTO_APRI_CONSENSO, apri);
    return () => window.removeEventListener(EVENTO_APRI_CONSENSO, apri);
  }, [attivo]);

  if (!attivo || !aperto) return null;

  function scegli(scelta: { statistiche: boolean; pubblicita: boolean }) {
    salvaConsenso(scelta);
    setAperto(false);
    setDettagli(false);
  }

  return (
    <div className="gc-consenso" role="dialog" aria-modal="false" aria-labelledby="gc-consenso-titolo">
      <div className="gc-consenso__in">
        <p id="gc-consenso-titolo" className="gc-consenso__titolo">
          Statistiche e pubblicità
        </p>
        <p>
          Oltre ai cookie tecnici, con il tuo consenso usiamo Google Analytics per capire quali pagine
          sono utili e Google Ads per misurare le campagne. Puoi cambiare idea quando vuoi dal
          collegamento «Cookie» in fondo a ogni pagina.{" "}
          <Link to="/privacy">Come trattiamo i dati</Link>
        </p>
        {dettagli ? (
          <div className="gc-consenso__scelte">
            <label>
              <input type="checkbox" checked disabled /> Necessari: servono al sito per funzionare
            </label>
            <label>
              <input
                type="checkbox"
                checked={statistiche}
                onChange={(e) => setStatistiche(e.target.checked)}
              />{" "}
              Statistiche (Google Analytics)
            </label>
            <label>
              <input
                type="checkbox"
                checked={pubblicita}
                onChange={(e) => setPubblicita(e.target.checked)}
              />{" "}
              Pubblicità (Google Ads)
            </label>
          </div>
        ) : null}
        <div className="gc-consenso__azioni">
          <button type="button" className="gc-btn" onClick={() => scegli({ statistiche: true, pubblicita: true })}>
            Accetta tutti
          </button>
          <button
            type="button"
            className="gc-btn gc-btn--secondario"
            onClick={() => scegli({ statistiche: false, pubblicita: false })}
          >
            Solo necessari
          </button>
          {dettagli ? (
            <button
              type="button"
              className="gc-btn gc-btn--secondario"
              onClick={() => scegli({ statistiche, pubblicita })}
            >
              Salva le mie scelte
            </button>
          ) : (
            <button type="button" className="gc-collegamento" onClick={() => setDettagli(true)}>
              Scegli
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
