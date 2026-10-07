import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { Page } from "@/components/gc/Page";
import { RadarForm } from "@/components/gc/RadarForm";
import { Registro } from "@/components/gc/Registro";
import { traccia } from "@/lib/gc/analytics";
import { PAGE_SIZE, searchTenders } from "@/lib/gc/api.functions";
import {
  CATEGORIES,
  KIND_LABEL,
  MIN_VALUES,
  NATURE_LABEL,
  REGIONS,
  SITE,
  SORT_LABEL,
  categoryName,
  regionIn,
} from "@/lib/gc/config";
import { plural } from "@/lib/gc/format";

type Search = {
  q?: string;
  regione?: string;
  settore?: string;
  natura?: string;
  tipo?: string;
  min?: number;
  ordine?: string;
  p?: number;
};

function str(v: unknown, max = 300): string | undefined {
  if (typeof v === "number") return String(v);
  return typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : undefined;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function heading(s: Search): string {
  const dove = regionIn(s.regione);
  const settore = categoryName(s.settore);
  if (s.q) return `Gare per «${s.q}»${dove ? ` ${dove}` : ""}`;
  if (settore) return `${settore}${dove ? ` ${dove}` : ""}`;
  return dove ? `Gare aperte ${dove}` : "Tutte le gare aperte";
}

export const Route = createFileRoute("/cerca")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const p = num(s.p);
    return {
      q: str(s.q),
      regione: str(s.regione, 40),
      settore: str(s.settore, 40),
      natura: str(s.natura, 20),
      tipo: str(s.tipo, 20),
      min: num(s.min),
      ordine: str(s.ordine, 20),
      p: p ? Math.min(150, Math.floor(p)) : undefined,
    };
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => searchTenders({ data: { ...deps, log: true } }),
  head: ({ match }) => {
    const s = match.search as Search;
    const filtered = Boolean(s.q || s.natura || s.tipo || s.min || s.ordine || (s.p && s.p > 1));
    return {
      meta: [
        { title: `${heading(s)} | ${SITE.name}` },
        {
          name: "description",
          content:
            "Cerca tra le gare d'appalto aperte in Italia per attività, regione, settore e valore. Ogni gara ha i quattro dati che contano e il collegamento all'avviso ufficiale.",
        },
        ...(filtered ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: [{ rel: "canonical", href: `${SITE.url}/cerca` }],
    };
  },
  component: Cerca,
});

function Cerca() {
  const res = Route.useLoaderData();
  const search = Route.useSearch();
  const page = search.p ?? 1;
  const pages = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
  const scritto = (search.q ?? "").toLowerCase();
  const anche = (res.also ?? []).filter((a) => !scritto.includes(a.toLowerCase())).slice(0, 6);

  useEffect(() => {
    if (page !== 1) return;
    traccia("search", { search_term: search.q ?? "", risultati: res.total, regione: search.regione ?? "", settore: search.settore ?? "" });
  }, [search.q, search.regione, search.settore, page, res.total]);

  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <h1>{heading(search)}</h1>
        <p className="gc-testata__sotto">
          {res.total === 0
            ? "Nessuna gara aperta corrisponde a questa ricerca."
            : `${plural(res.total, "gara aperta corrisponde", "gare aperte corrispondono")} alla ricerca.`}{" "}
          {res.total > 0 ? <a href="#radar">Ricevile senza cercarle</a> : null}
        </p>
        {anche.length > 0 ? (
          <p className="gc-tenue">
            Ho cercato anche le parole che usano i bandi: {anche.join(", ")}.
          </p>
        ) : null}
        {res.relaxed ? (
          <p className="gc-nota">
            Nessuna gara contiene tutte le parole insieme: qui sotto trovi quelle che ne contengono
            almeno una.
          </p>
        ) : null}
      </div>

      <div className="gc-wrap">
        <form className="gc-filtri" method="get" action="/cerca" role="search" aria-label="Filtri">
          <div className="gc-campo gc-filtri__q">
            <label htmlFor="f-q">Cosa cerchi</label>
            <input
              id="f-q"
              name="q"
              type="search"
              className="gc-input"
              defaultValue={search.q ?? ""}
              placeholder="es. pulizie, manutenzione del verde, software"
              autoComplete="off"
            />
          </div>
          <div className="gc-campo">
            <label htmlFor="f-regione">Regione</label>
            <select id="f-regione" name="regione" className="gc-select" defaultValue={search.regione ?? ""}>
              <option value="">Tutta Italia</option>
              {REGIONS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="gc-campo">
            <label htmlFor="f-settore">Settore</label>
            <select id="f-settore" name="settore" className="gc-select" defaultValue={search.settore ?? ""}>
              <option value="">Tutti i settori</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.short}
                </option>
              ))}
            </select>
          </div>
          <div className="gc-campo">
            <label htmlFor="f-natura">Contratto</label>
            <select id="f-natura" name="natura" className="gc-select" defaultValue={search.natura ?? ""}>
              <option value="">Lavori, servizi e forniture</option>
              {Object.entries(NATURE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="gc-campo">
            <label htmlFor="f-tipo">Avviso</label>
            <select id="f-tipo" name="tipo" className="gc-select" defaultValue={search.tipo ?? ""}>
              <option value="">Tutti gli avvisi</option>
              <option value="bando">{KIND_LABEL.bando}</option>
              <option value="indagine">{KIND_LABEL.indagine}</option>
              <option value="elenco">{KIND_LABEL.elenco}</option>
            </select>
          </div>
          <div className="gc-campo">
            <label htmlFor="f-min">Valore</label>
            <select id="f-min" name="min" className="gc-select" defaultValue={search.min ? String(search.min) : ""}>
              <option value="">Qualsiasi valore</option>
              {MIN_VALUES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="gc-campo">
            <label htmlFor="f-ordine">Ordine</label>
            <select id="f-ordine" name="ordine" className="gc-select" defaultValue={search.ordine ?? ""}>
              <option value="">{search.q ? SORT_LABEL.rilevanza : SORT_LABEL.recenti}</option>
              {search.q ? <option value="recenti">{SORT_LABEL.recenti}</option> : null}
              <option value="scadenza">{SORT_LABEL.scadenza}</option>
              <option value="valore">{SORT_LABEL.valore}</option>
            </select>
          </div>
          <div>
            <button type="submit" className="gc-btn">
              Cerca gare
            </button>
          </div>
        </form>
      </div>

      <section className="gc-wrap" style={{ paddingTop: "1.75rem" }} aria-label="Risultati">
        {res.items.length > 0 ? (
          <Registro items={res.items} />
        ) : (
          <div className="gc-vuoto">
            <p>
              Prova con meno parole, togli un filtro oppure cerca in tutta Italia. I bandi usano
              spesso parole diverse da quelle di tutti i giorni: prova anche un sinonimo.
            </p>
            <p>
              <Link to="/cerca">Vedi tutte le gare aperte</Link>
              {search.q ? (
                <>
                  {" "}
                  oppure <a href="#radar">fatti avvisare quando esce una gara adatta</a>
                </>
              ) : null}
            </p>
          </div>
        )}
        {pages > 1 ? (
          <nav className="gc-pagine" aria-label="Pagine dei risultati">
            {page > 1 ? (
              <Link to="/cerca" search={{ ...search, p: page - 1 === 1 ? undefined : page - 1 }}>
                Pagina precedente
              </Link>
            ) : (
              <span />
            )}
            <span>
              Pagina {page} di {pages}
            </span>
            {page < pages ? (
              <Link to="/cerca" search={{ ...search, p: page + 1 }}>
                Pagina successiva
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>

      <section className="gc-wrap gc-sezione" id="radar" aria-labelledby="h-radar-cerca">
        <div className="gc-due">
          <div className="gc-prosa">
            <h2 id="h-radar-cerca" style={{ fontSize: "var(--t-xl)", marginTop: 0 }}>
              Ricevi queste gare senza cercarle
            </h2>
            <p>
              Il radar ripete questa ricerca per te più volte al giorno e mette da parte le gare
              nuove. Lo attivi con la sola email e lo modifichi quando vuoi.
            </p>
          </div>
          <div className="gc-pannello">
            <RadarForm
              id="radar-cerca"
              origin="cerca"
              q={search.q}
              regione={search.regione}
              settore={search.settore}
            />
          </div>
        </div>
      </section>
    </Page>
  );
}
