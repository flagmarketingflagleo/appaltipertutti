import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { plural } from "@/lib/gc/format";
import type { Card } from "@/lib/gc/types";

import { Page } from "./Page";
import { RadarForm } from "./RadarForm";
import { Registro } from "./Registro";

type Cross = { key: string; label: string; search: { regione?: string; settore?: string } };

type Props = {
  title: string;
  intro: ReactNode;
  total: number;
  items: Card[];
  all: { regione?: string; settore?: string };
  crossTitle: string;
  cross: Cross[];
  radarTitle: string;
  origin: string;
};

export function Hub({ title, intro, total, items, all, crossTitle, cross, radarTitle, origin }: Props) {
  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <p className="gc-briciole">
          <Link to="/cerca">Gare aperte</Link>
        </p>
        <h1>{title}</h1>
        <p className="gc-testata__sotto">
          {total === 0
            ? "In questo momento non ci sono gare aperte in questo elenco."
            : `${plural(total, "gara aperta", "gare aperte")} oggi, dalla più recente.`}
        </p>
      </div>

      <section className="gc-wrap" aria-label="Elenco delle gare">
        {items.length > 0 ? <Registro items={items} /> : null}
        {total > items.length ? (
          <p className="gc-pagine">
            <Link to="/cerca" search={all}>
              Vedi tutte le {plural(total, "gara", "gare")} con i filtri
            </Link>
          </p>
        ) : null}
      </section>

      <section className="gc-wrap gc-sezione" style={{ marginTop: "2rem" }} aria-labelledby="h-hub-radar">
        <div className="gc-due">
          <div className="gc-prosa">
            <h2 id="h-hub-radar" style={{ fontSize: "var(--t-xl)", marginTop: 0 }}>
              {radarTitle}
            </h2>
            {intro}
          </div>
          <div className="gc-pannello">
            <RadarForm id={`radar-${origin}`} origin={origin} regione={all.regione} settore={all.settore} />
          </div>
        </div>
      </section>

      <section className="gc-wrap gc-sezione" aria-labelledby="h-hub-indice">
        <div className="gc-sezione__testa">
          <h2 id="h-hub-indice">{crossTitle}</h2>
        </div>
        <ul className="gc-indice">
          {cross.map((c) => (
            <li key={c.key}>
              <Link to="/cerca" search={c.search}>
                <span className="gc-indice__nome">{c.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
