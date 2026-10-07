import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeaders } from "./lib/security-headers.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// --- Copia delle pagine pubbliche tenuta da Cloudflare ---------------------
// Le pagine uguali per tutti (home, ricerca, schede, pagine fisse) vengono
// disegnate una volta e poi servite dalla copia per due minuti: così una
// raffica di visite non arriva al database. Se il database non risponde,
// il visitatore riceve l'ultima copia buona invece della pagina di errore.
const FRESCA_MS = 120_000;
const SITEMAP_MS = 1_800_000;
const PAGINE_FISSE = ["/prezzi", "/fonti", "/termini", "/privacy", "/rimborsi"];

function conCopia(url: URL): boolean {
  const p = url.pathname;
  if (p === "/" || p === "/cerca" || p === "/sitemap.xml") return true;
  if (p.startsWith("/gara/") || p.startsWith("/gare/")) return true;
  return PAGINE_FISSE.includes(p);
}

function copieCloudflare(): Cache | null {
  try {
    return (caches as unknown as { default?: Cache }).default ?? null;
  } catch {
    return null;
  }
}

function dallaCopia(copia: Response, stato: "fresca" | "di-riserva"): Response {
  const risposta = new Response(copia.body, copia);
  risposta.headers.delete("x-apt-at");
  risposta.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  risposta.headers.set("x-apt-copia", stato);
  return risposta;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    let copia: Response | undefined;
    try {
      // Un solo indirizzo per pagina: /prezzi/ diventa /prezzi.
      const url = new URL(request.url);
      const conWww = url.hostname.startsWith("www.");
      // Un solo indirizzo anche per il dominio: www.appaltipertutti.it diventa appaltipertutti.it.
      if (conWww) url.hostname = url.hostname.slice(4);
      // Sempre in https (tranne quando il sito gira in prova su questo computer).
      const locale = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      const senzaHttps = url.protocol === "http:" && !locale;
      if (senzaHttps) url.protocol = "https:";
      if (conWww || senzaHttps || (url.pathname !== "/" && url.pathname.endsWith("/"))) {
        if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
        return applySecurityHeaders(
          new Response(null, { status: 301, headers: { Location: url.toString() } }),
        );
      }
      const copie = request.method === "GET" && conCopia(url) ? copieCloudflare() : null;
      const chiave = new Request(url.toString(), { method: "GET" });
      if (copie) {
        copia = await copie.match(chiave).catch(() => undefined);
        if (copia) {
          const eta = Date.now() - Number(copia.headers.get("x-apt-at") ?? 0);
          const durata = url.pathname === "/sitemap.xml" ? SITEMAP_MS : FRESCA_MS;
          if (eta < durata) return dallaCopia(copia, "fresca");
        }
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const finale = applySecurityHeaders(await normalizeCatastrophicSsrResponse(response));
      // L'indirizzo di prova di Cloudflare non deve finire su Google al posto del dominio vero.
      if (url.hostname.endsWith(".workers.dev")) finale.headers.set("X-Robots-Tag", "noindex");
      // Database fermo: meglio la pagina di qualche minuto fa che un errore.
      if (finale.status >= 500 && copia) return dallaCopia(copia, "di-riserva");
      if (copie && finale.status === 200 && !finale.headers.has("set-cookie")) {
        const daTenere = new Response(finale.clone().body, finale);
        daTenere.headers.set("Cache-Control", "public, max-age=86400");
        daTenere.headers.set("x-apt-at", String(Date.now()));
        const salva = copie.put(chiave, daTenere).catch(() => undefined);
        (ctx as { waitUntil?: (p: Promise<unknown>) => void } | null)?.waitUntil?.(salva);
      }
      return finale;
    } catch (error) {
      console.error(error);
      if (copia) return dallaCopia(copia, "di-riserva");
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
