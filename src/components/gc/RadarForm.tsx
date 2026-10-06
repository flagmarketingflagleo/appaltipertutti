import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { subscribe } from "@/lib/gc/api.functions";
import { REGIONS } from "@/lib/gc/config";

import { useSettings } from "./Page";

const ERRORS: Record<string, string> = {
  consent: "Per attivare il radar serve la conferma qui sotto.",
  email: "Controlla l'indirizzo email: sembra incompleto.",
  busy: "Ci sono troppe richieste in questo momento. Riprova tra qualche minuto.",
  closed: "Le iscrizioni non sono ancora aperte.",
};

type Props = {
  q?: string;
  regione?: string;
  settore?: string;
  origin: string;
  /** mostra anche i campi "cosa" e "dove" */
  full?: boolean;
  id: string;
};

export function RadarForm({ q, regione, settore, origin, full = false, id }: Props) {
  const settings = useSettings();
  const [email, setEmail] = useState("");
  const [what, setWhat] = useState(q ?? "");
  const [place, setPlace] = useState(regione ?? "");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const [sending, setSending] = useState(false);
  const [exists, setExists] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!settings.signupOpen) {
    return (
      <div className="gc-nota">
        <p>
          <strong>Il radar apre a breve.</strong>
        </p>
        <p>
          Intanto la ricerca è libera: tutte le gare aperte si consultano senza registrazione.
        </p>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setExists(false);
    if (!consent) {
      setError(ERRORS.consent);
      return;
    }
    setSending(true);
    try {
      const res = await subscribe({
        data: {
          email: email.trim(),
          q: (full ? what : (q ?? "")).trim() || undefined,
          regione: (full ? place : (regione ?? "")) || undefined,
          settore: settore || undefined,
          consent,
          origin,
          hp,
        },
      });
      if (res.ok && res.status === "created") {
        window.location.assign(`/radar/${res.token}`);
        return;
      }
      if (res.ok) {
        setExists(true);
      } else {
        setError(ERRORS[res.error] ?? "Il radar non si è attivato per un problema tecnico. Riprova tra poco.");
      }
    } catch {
      setError("Il radar non si è attivato per un problema tecnico. Riprova tra poco.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="gc-modulo" onSubmit={onSubmit} noValidate>
      {full ? (
        <>
          <div className="gc-campo">
            <label htmlFor={`${id}-cosa`}>Cosa fa la tua impresa?</label>
            <textarea
              id={`${id}-cosa`}
              className="gc-textarea"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="es. pulizie, sanificazione, disinfestazione"
              maxLength={300}
              aria-describedby={`${id}-cosa-aiuto`}
            />
            <span id={`${id}-cosa-aiuto`} className="gc-aiuto">
              Separa con una virgola le attività diverse.
            </span>
          </div>
          <div className="gc-campo">
            <label htmlFor={`${id}-dove`}>Dove lavori?</label>
            <select
              id={`${id}-dove`}
              className="gc-select"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            >
              <option value="">Tutta Italia</option>
              {REGIONS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}
      <div className="gc-campo">
        <label htmlFor={`${id}-email`}>La tua email di lavoro</label>
        <input
          id={`${id}-email`}
          type="email"
          className="gc-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          aria-describedby={error ? `${id}-errore` : undefined}
        />
      </div>
      <div className="gc-hp" aria-hidden="true">
        <label htmlFor={`${id}-sito`}>Lascia vuoto questo campo</label>
        <input
          id={`${id}-sito`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
      </div>
      <label className="gc-check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Ho letto l'<Link to="/privacy">informativa sulla privacy</Link> e chiedo di ricevere gli
          avvisi sulle gare.
        </span>
      </label>
      {error ? (
        <p id={`${id}-errore`} className="gc-errore" role="alert">
          {error}
        </p>
      ) : null}
      {exists ? (
        <p className="gc-esito" role="status">
          Questo indirizzo ha già un radar.{" "}
          {settings.emailEnabled
            ? "Ti abbiamo inviato per email il collegamento per aprirlo."
            : "Aprilo dal collegamento personale che hai salvato."}
        </p>
      ) : null}
      <div>
        <button type="submit" className="gc-btn" disabled={sending}>
          {sending ? "Attivazione in corso" : "Attiva il radar"}
        </button>
      </div>
      <p className="gc-aiuto">
        Gratis, senza carta di credito. Ti disiscrivi quando vuoi dal tuo radar.
      </p>
    </form>
  );
}
