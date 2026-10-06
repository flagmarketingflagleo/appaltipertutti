import { Link, getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { PublicSettings } from "@/lib/gc/types";

const rootApi = getRouteApi("__root__");

export function useSettings(): PublicSettings {
  return rootApi.useLoaderData().settings;
}

export function Logo() {
  return (
    <span className="gc-logo">
      Appalti <span className="gc-mark">per tutti</span>
    </span>
  );
}

export function Page({ children }: { children: ReactNode }) {
  const { legal } = useSettings();
  const identity = [
    legal.ragione_sociale,
    legal.piva ? `partita IVA ${legal.piva}` : null,
    legal.sede,
  ].filter(Boolean);

  return (
    <>
      <a className="gc-skip" href="#contenuto">
        Vai al contenuto
      </a>
      <header className="gc-top">
        <div className="gc-wrap gc-top__in">
          <Link to="/" className="gc-top__logo" aria-label="Appalti per tutti, pagina iniziale">
            <Logo />
          </Link>
          <nav className="gc-top__nav" aria-label="Menu principale">
            <Link to="/cerca">Tutte le gare</Link>
            <Link to="/" hash="settori">
              Settori
            </Link>
            <Link to="/prezzi">Prezzi</Link>
            <Link to="/radar" className="gc-btn gc-btn--piccolo">
              Attiva il radar
            </Link>
          </nav>
        </div>
      </header>
      <main id="contenuto">{children}</main>
      <footer className="gc-piede">
        <div className="gc-wrap gc-piede__griglia">
          <div>
            <p>
              Appalti per tutti non è un sito istituzionale. I dati arrivano dagli avvisi pubblicati da ANAC
              e da TED: prima di partecipare a una gara verifica sempre l'avviso ufficiale.
            </p>
            {identity.length > 0 ? <p>{identity.join(", ")}</p> : null}
          </div>
          <nav aria-label="Informazioni">
            <Link to="/cerca">Tutte le gare</Link>
            <Link to="/prezzi">Prezzi</Link>
            <Link to="/fonti">Fonti dei dati</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/termini">Termini</Link>
            <Link to="/rimborsi">Rimborsi</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
