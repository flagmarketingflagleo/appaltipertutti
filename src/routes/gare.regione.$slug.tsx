import { createFileRoute, notFound } from "@tanstack/react-router";

import { Hub } from "@/components/gc/Hub";
import { searchTenders } from "@/lib/gc/api.functions";
import { CATEGORIES, SITE, regionIn, regionName } from "@/lib/gc/config";

export const Route = createFileRoute("/gare/regione/$slug")({
  loader: async ({ params }) => {
    if (!regionName(params.slug)) throw notFound();
    return searchTenders({ data: { regione: params.slug, limit: 30 } });
  },
  head: ({ params }) => {
    const dove = regionIn(params.slug) ?? "in Italia";
    const url = `${SITE.url}/gare/regione/${params.slug}`;
    const title = `Gare d'appalto ${dove}: bandi aperti oggi | ${SITE.name}`;
    const description = `Tutte le gare d'appalto aperte ${dove}, aggiornate più volte al giorno. Per ogni bando: cosa chiedono, chi compra, quanto vale, entro quando.`;
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
  component: RegionePage,
});

function RegionePage() {
  const res = Route.useLoaderData();
  const { slug } = Route.useParams();
  const dove = regionIn(slug) ?? "";
  const nome = regionName(slug) ?? "";
  return (
    <Hub
      title={`Gare d'appalto ${dove}`}
      total={res.total}
      items={res.items}
      all={{ regione: slug }}
      origin="regione"
      radarTitle={`Ricevi le nuove gare ${dove}`}
      intro={
        <>
          <p>
            Qui trovi i bandi di gara, le indagini di mercato e gli elenchi di operatori pubblicati
            dagli enti che comprano {dove}: comuni, aziende sanitarie, scuole, università e società
            pubbliche.
          </p>
          <p>
            L'elenco si aggiorna più volte al giorno dagli avvisi di ANAC e di TED. Con il radar le
            gare nuove arrivano a te, senza cercarle.
          </p>
        </>
      }
      crossTitle={`${nome}: gare per settore`}
      cross={CATEGORIES.filter((c) => c.slug !== "altro").map((c) => ({
        key: c.slug,
        label: c.name,
        search: { regione: slug, settore: c.slug },
      }))}
    />
  );
}
