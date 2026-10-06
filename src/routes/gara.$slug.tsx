import { Link, createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { Page } from "@/components/gc/Page";
import { RadarForm } from "@/components/gc/RadarForm";
import { Registro } from "@/components/gc/Registro";
import { getTender } from "@/lib/gc/api.functions";
import { KIND_LABEL, NATURE_LABEL, SITE, regionIn } from "@/lib/gc/config";
import { clip, deadlineLabel, fmtDay, fmtEuro, fmtTime, httpUrl } from "@/lib/gc/format";
import type { Tender } from "@/lib/gc/types";

function placeOf(t: Tender): string | null {
  const parts: string[] = [];
  if (t.comune) parts.push(t.comune);
  if (t.province && t.province.toLowerCase() !== (t.comune ?? "").toLowerCase()) {
    parts.push(t.comune ? `(${t.province})` : t.province);
  }
  const base = parts.join(" ");
  if (t.region_name) return base ? `${base}, ${t.region_name}` : t.region_name;
  return base || t.place_label;
}

function describe(t: Tender): string {
  const bits = [
    `${KIND_LABEL[t.kind] ?? "Gara"}${t.buyer ? ` di ${t.buyer}` : ""}`,
    t.cpv_label,
    t.value != null ? `valore ${fmtEuro(t.value)}` : null,
    t.deadline_local ? `scadenza ${fmtDay(t.deadline_local)}` : null,
  ].filter(Boolean);
  return clip(`${bits.join(", ")}. Scheda in chiaro e collegamento all'avviso ufficiale.`, 158);
}

export const Route = createFileRoute("/gara/$slug")({
  loader: async ({ params }): Promise<Tender> => {
    const id = Number.parseInt(params.slug, 10);
    if (!Number.isFinite(id) || id <= 0) throw notFound();
    const tender = await getTender({ data: { id } });
    if (!tender) throw notFound();
    if (tender.twin_id) {
      throw redirect({ to: "/gara/$slug", params: { slug: String(tender.twin_id) }, statusCode: 301 });
    }
    return tender;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const t = loaderData;
    const url = `${SITE.url}/gara/${t.id}-${t.slug}`;
    const title = `${clip(t.title, 46)} | ${SITE.name}`;
    const description = describe(t);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        ...(t.open ? [] : [{ name: "robots", content: "noindex, follow" }]),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: Scheda,
});

function Scheda() {
  const t = Route.useLoaderData();
  const dove = placeOf(t);
  const vicina = t.open && t.days_left != null && t.days_left <= 5;
  const ora = fmtTime(t.deadline_local);
  const fonte = t.source === "anac" ? "ANAC, Piattaforma per la pubblicità legale" : "TED, Tenders Electronic Daily";
  const paragrafi = (t.description ?? "").split("\n").filter((p) => p.trim() !== "");
  const documenti = httpUrl(t.url_documents);
  const ufficiale = httpUrl(t.url_official);

  return (
    <Page>
      <div className="gc-wrap gc-testata">
        <p className="gc-briciole">
          <Link to="/cerca">Gare aperte</Link>
          {t.category && t.category_name ? (
            <>
              {" / "}
              <Link to="/gare/settore/$slug" params={{ slug: t.category }}>
                {t.category_name}
              </Link>
            </>
          ) : null}
          {t.region && t.region_name ? (
            <>
              {" / "}
              <Link to="/gare/regione/$slug" params={{ slug: t.region }}>
                {t.region_name}
              </Link>
            </>
          ) : null}
        </p>
        <h1 style={t.title.length > 110 ? { fontSize: "var(--t-xl)", maxWidth: "46ch", lineHeight: 1.2 } : { maxWidth: "30ch" }}>
          {t.title}
        </h1>
        <p className="gc-tenue">
          {KIND_LABEL[t.kind] ?? "Avviso"}
          {t.published ? `, pubblicata il ${fmtDay(t.published)}` : ""}
          {t.correction ? ". Questo avviso corregge una pubblicazione precedente" : ""}.
        </p>
        {!t.open ? (
          <p className="gc-nota gc-nota--allerta">
            <strong>Questa gara è scaduta.</strong>{" "}
            <Link to="/cerca">Cerca tra quelle ancora aperte</Link>
          </p>
        ) : null}
      </div>

      <div className="gc-wrap gc-due">
        <div style={{ display: "grid", gap: "2rem" }}>
          <section className="gc-foglio" aria-labelledby="h-chiaro">
            <h2 id="h-chiaro" className="gc-foglio__voce" style={{ letterSpacing: 0 }}>
              In chiaro
            </h2>
            <dl className="gc-fatti gc-fatti--scheda">
              {t.cpv_label ? (
                <>
                  <dt>Cosa</dt>
                  <dd>
                    <span className="gc-mark">{t.cpv_label}</span>
                  </dd>
                </>
              ) : null}
              {t.buyer ? (
                <>
                  <dt>Chi compra</dt>
                  <dd>
                    <span className="gc-mark">{t.buyer}</span>
                    {dove ? <small>{dove}</small> : null}
                  </dd>
                </>
              ) : null}
              <dt>Quanto vale</dt>
              <dd>
                {t.value != null ? <span className="gc-mark">{fmtEuro(t.value)}</span> : "Importo non indicato"}
                {t.value != null ? (
                  <small>
                    Valore stimato dall'ente
                    {t.lots && t.lots > 1 ? `, somma di ${t.lots} lotti` : ""}
                  </small>
                ) : null}
              </dd>
              <dt>Entro quando</dt>
              <dd>
                {t.deadline_local ? (
                  <>
                    <span className="gc-mark">
                      {fmtDay(t.deadline_local)}
                      {ora && ora !== "23:59" ? `, ore ${ora}` : ""}
                    </span>
                    <small style={vicina ? { color: "var(--scadenza)", fontWeight: 700 } : undefined}>
                      {t.open ? deadlineLabel(t.days_left) : "scaduta"}
                    </small>
                  </>
                ) : (
                  "Scadenza non indicata nell'avviso"
                )}
              </dd>
            </dl>
            <p className="gc-azioni" style={{ marginTop: "0.75rem" }}>
              {documenti ? (
                <a className="gc-btn" href={documenti} rel="noopener nofollow" target="_blank">
                  Apri i documenti di gara
                </a>
              ) : null}
              {ufficiale ? (
                <a
                  className={documenti ? "gc-btn gc-btn--linea" : "gc-btn"}
                  href={ufficiale}
                  rel="noopener nofollow"
                  target="_blank"
                >
                  Leggi l'avviso ufficiale
                </a>
              ) : null}
            </p>
          </section>

          {t.summary ? (
            <section className="gc-prosa" aria-labelledby="h-semplice">
              <h2 id="h-semplice">In parole semplici</h2>
              {t.summary.split("\n").map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ) : null}

          {paragrafi.length > 0 ? (
            <section className="gc-prosa" aria-labelledby="h-testo">
              <h2 id="h-testo">Testo dell'avviso</h2>
              {paragrafi.slice(0, 40).map((p, i) => (
                <p key={`${i}-${p.slice(0, 24)}`} style={{ overflowWrap: "anywhere" }}>
                  {p}
                </p>
              ))}
            </section>
          ) : null}

          <section aria-labelledby="h-tecnici">
            <h2 id="h-tecnici" style={{ fontSize: "var(--t-l)", marginBottom: "0.5rem" }}>
              Dati tecnici
            </h2>
            <div className="gc-scorri">
              <table className="gc-tab" style={{ minWidth: 0 }}>
                <tbody>
                  {t.cig ? (
                    <tr>
                      <th scope="row">CIG</th>
                      <td className="gc-codice">{t.cig}</td>
                    </tr>
                  ) : null}
                  {t.cpv_code ? (
                    <tr>
                      <th scope="row">CPV</th>
                      <td>
                        <span className="gc-codice">{t.cpv_code}</span> {t.cpv_label}
                      </td>
                    </tr>
                  ) : null}
                  {t.nature ? (
                    <tr>
                      <th scope="row">Contratto</th>
                      <td>{NATURE_LABEL[t.nature] ?? t.nature}</td>
                    </tr>
                  ) : null}
                  {t.procedure ? (
                    <tr>
                      <th scope="row">Procedura</th>
                      <td>{t.procedure}</td>
                    </tr>
                  ) : null}
                  {t.lots && t.lots > 1 ? (
                    <tr>
                      <th scope="row">Lotti</th>
                      <td>{t.lots}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <th scope="row">Fonte</th>
                    <td>{fonte}</td>
                  </tr>
                  {t.updated ? (
                    <tr>
                      <th scope="row">Scheda aggiornata</th>
                      <td>{fmtDay(t.updated)}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <p className="gc-nota">
            Questa scheda è un riassunto automatico dell'avviso e può contenere errori. Per
            partecipare valgono solo i documenti pubblicati dall'ente.
          </p>
        </div>

        <aside className="gc-pannello" aria-labelledby="h-radar-gara">
          <h2 id="h-radar-gara">Ricevi le gare come questa</h2>
          <p className="gc-piccolo">
            Il radar ti segnala le nuove gare
            {t.category_name ? ` del settore ${t.category_name.toLowerCase()}` : ""}
            {t.region ? ` ${regionIn(t.region) ?? ""}` : ""}.
          </p>
          <RadarForm
            id="radar-gara"
            origin="gara"
            regione={t.region ?? undefined}
            settore={t.category ?? undefined}
          />
        </aside>
      </div>

      {t.related.length > 0 ? (
        <section className="gc-wrap gc-sezione" style={{ marginTop: "3rem" }} aria-labelledby="h-simili">
          <div className="gc-sezione__testa">
            <h2 id="h-simili">Altre gare simili aperte</h2>
          </div>
          <Registro items={t.related} />
        </section>
      ) : null}
    </Page>
  );
}
