import { createFileRoute, notFound } from "@tanstack/react-router";

import { Hub } from "@/components/gc/Hub";
import { searchTenders } from "@/lib/gc/api.functions";
import { REGIONS, SITE, categoryName } from "@/lib/gc/config";

/** "nel settore edilizia e lavori pubblici", "negli altri settori" */
function settoreIn(slug: string): string {
  if (slug === "altro") return "negli altri settori";
  return `nel settore ${(categoryName(slug) ?? "").toLowerCase()}`;
}

export const Route = createFileRoute("/gare/settore/$slug")({
  loader: async ({ params }) => {
    if (!categoryName(params.slug)) throw notFound();
    return searchTenders({ data: { settore: params.slug, limit: 30 } });
  },
  head: ({ params }) => {
    const nome = categoryName(params.slug) ?? "Gare";
    const url = `${SITE.url}/gare/settore/${params.slug}`;
    const title = `${nome}: gare d'appalto aperte | ${SITE.name}`;
    const description = `Le gare d'appalto aperte oggi ${settoreIn(params.slug)}, in tutta Italia. Per ogni bando: cosa chiedono, chi compra, quanto vale, entro quando.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: SettorePage,
});

function SettorePage() {
  const res = Route.useLoaderData();
  const { slug } = Route.useParams();
  const nome = categoryName(slug) ?? "";
  return (
    <Hub
      title={`${nome}: gare aperte`}
      total={res.total}
      items={res.items}
      all={{ settore: slug }}
      origin="settore"
      radarTitle="Ricevi le nuove gare di questo settore"
      intro={
        <>
          <p>
            Qui trovi le gare pubblicate {settoreIn(slug)} dagli enti pubblici italiani, ordinate
            dalla più recente. Ogni riga riporta in parole semplici che cosa viene chiesto, chi
            compra, quanto vale il contratto e la scadenza.
          </p>
          <p>
            Il settore è assegnato in automatico a partire dal codice CPV dell'avviso. Con il radar
            puoi restringere l'elenco alla tua regione e alle tue parole chiave.
          </p>
        </>
      }
      crossTitle={`${nome}: gare per regione`}
      cross={REGIONS.map((r) => ({
        key: r.slug,
        label: r.name,
        search: { regione: r.slug, settore: slug },
      }))}
    />
  );
}
