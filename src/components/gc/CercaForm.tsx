import { REGIONS } from "@/lib/gc/config";

export function CercaForm({ q, regione }: { q?: string; regione?: string }) {
  return (
    <form className="gc-cerca" method="get" action="/cerca" role="search">
      <div className="gc-campo">
        <label htmlFor="cerca-q">Cosa fa la tua impresa?</label>
        <input
          id="cerca-q"
          name="q"
          type="search"
          className="gc-input"
          defaultValue={q ?? ""}
          placeholder="es. pulizie, manutenzione del verde, software"
          autoComplete="off"
        />
      </div>
      <div className="gc-cerca__riga">
        <div className="gc-campo">
          <label htmlFor="cerca-regione">Dove lavori?</label>
          <select id="cerca-regione" name="regione" className="gc-select" defaultValue={regione ?? ""}>
            <option value="">Tutta Italia</option>
            {REGIONS.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="gc-btn">
          Cerca gare
        </button>
      </div>
    </form>
  );
}
