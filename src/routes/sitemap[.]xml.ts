import { createFileRoute } from "@tanstack/react-router";

import { getSitemap } from "@/lib/gc/api.functions";
import { CATEGORIES, REGIONS, SITE } from "@/lib/gc/config";

type Entry = { loc: string; lastmod?: string };

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().slice(0, 10);
        const urls: Entry[] = [
          { loc: `${SITE.url}/`, lastmod: today },
          { loc: `${SITE.url}/cerca`, lastmod: today },
          { loc: `${SITE.url}/radar` },
          { loc: `${SITE.url}/prezzi` },
          { loc: `${SITE.url}/fonti` },
          ...REGIONS.map((r) => ({ loc: `${SITE.url}/gare/regione/${r.slug}`, lastmod: today })),
          ...CATEGORIES.map((c) => ({ loc: `${SITE.url}/gare/settore/${c.slug}`, lastmod: today })),
        ];
        try {
          const rows = await getSitemap();
          for (const [id, slug, updated] of rows) {
            urls.push({ loc: `${SITE.url}/gara/${id}-${slug}`, lastmod: updated });
          }
        } catch {
          // la mappa resta valida anche senza le schede
        }
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map(
            (u) => `<url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
          ),
          "</urlset>",
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
