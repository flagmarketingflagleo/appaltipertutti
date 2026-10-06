import { Link } from "@tanstack/react-router";

import { KIND_LABEL, NATURE_LABEL, regionName } from "@/lib/gc/config";
import { deadlineLabel, fmtDay, fmtEuroShort } from "@/lib/gc/format";
import type { Card } from "@/lib/gc/types";

export function tenderPath(c: { id: number; slug: string }): string {
  return `${c.id}-${c.slug}`;
}

function where(c: Card): string | null {
  if (c.place && c.province && c.place.toLowerCase() !== c.province.toLowerCase()) {
    return `${c.place} (${c.province})`;
  }
  return c.place ?? c.province ?? regionName(c.region);
}

export function Riga({ c }: { c: Card }) {
  const vicina = c.days_left != null && c.days_left <= 5;
  const chi = [c.buyer, where(c)].filter(Boolean).join(", ");
  const tipo = c.kind !== "bando" ? KIND_LABEL[c.kind] : c.nature ? NATURE_LABEL[c.nature] : null;
  return (
    <li className="gc-riga">
      <div>
        <Link to="/gara/$slug" params={{ slug: tenderPath(c) }} className="gc-riga__link">
          <span className="gc-riga__chiaro">{c.what ?? c.title}</span>
          {c.summary ? (
            <span className="gc-riga__titolo">{c.summary}</span>
          ) : c.what ? (
            <span className="gc-riga__titolo">{c.title}</span>
          ) : null}
        </Link>
        {chi ? <p className="gc-riga__chi">{chi}</p> : null}
      </div>
      <div className="gc-riga__quanto">
        <span className="gc-riga__val">{fmtEuroShort(c.value)}</span>
        {tipo ? <span className="gc-riga__sub">{tipo}</span> : null}
      </div>
      <div className="gc-riga__quando">
        <span className={vicina ? "gc-riga__scad gc-riga__scad--vicina" : "gc-riga__scad"}>
          {deadlineLabel(c.days_left)}
        </span>
        {c.deadline_local ? <span className="gc-riga__sub">{fmtDay(c.deadline_local)}</span> : null}
      </div>
    </li>
  );
}

export function Registro({ items }: { items: Card[] }) {
  return (
    <ul className="gc-registro">
      {items.map((c) => (
        <Riga key={c.id} c={c} />
      ))}
    </ul>
  );
}
