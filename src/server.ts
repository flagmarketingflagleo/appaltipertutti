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

function conCookie(risposta: Response, cookies: string[]): Response {
  if (cookies.length === 0) return risposta;
  const r = new Response(risposta.body, risposta);
  for (const c of cookies) r.headers.append("Set-Cookie", c);
  return r;
}

function dallaCopia(copia: Response, stato: "fresca" | "di-riserva"): Response {
  const risposta = new Response(copia.body, copia);
  risposta.headers.delete("x-apt-at");
  risposta.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  risposta.headers.set("x-apt-copia", stato);
  return risposta;
}

// --- Cookie del visitatore -------------------------------------------------
// apt_ricerche: quante ricerche ha fatto senza radar (dalla seconda compare il modulo).
// apt_radar: il token del suo radar, messo quando apre la pagina personale.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTRI = ["q", "regione", "settore", "natura", "tipo", "min"];

function cookie(request: Request, nome: string): string | null {
  const tutti = request.headers.get("cookie") ?? "";
  for (const parte of tutti.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nome) return decodeURIComponent(v.join("="));
  }
  return null;
}

function setCookie(nome: string, valore: string): string {
  return `${nome}=${encodeURIComponent(valore)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    let copia: Response | undefined;
    const daImpostare: string[] = [];
    try {
      // Un solo indirizzo per pagina: /prezzi/ diventa /prezzi.
      const url = new URL(request.url);
      const conWww = url.hostname.startsWith("www.");
      // Un solo indirizzo anche per il dominio: www.appaltipertutti.it diventa appaltipertutti.it.
      if (conWww) url.hostname = url.hostname.slice(4);
      // Sempre in https. Lo schema vero lo dice Cloudflare nell'intestazione cf-visitor;
      // in prova sul computer quell'intestazione manca e non si rimanda da nessuna parte.
      const visitatore = request.headers.get("cf-visitor") ?? "";
      const senzaHttps = visitatore.includes('"http"');
      if (conWww || senzaHttps || (url.pathname !== "/" && url.pathname.endsWith("/"))) {
        if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
        const schema = senzaHttps ? "https:" : url.protocol;
        const destinazione = `${schema}//${url.host}${url.pathname}${url.search}`;
        return applySecurityHeaders(
          new Response(null, { status: 301, headers: { Location: destinazione } }),
        );
      }
      // Chi è il visitatore: radar e ricerche fatte. Le due informazioni passano al sito
      // come intestazioni, così la ricerca sa quante gare mostrare.
      const tokenRadar = UUID.test(cookie(request, "apt_radar") ?? "") ? (cookie(request, "apt_radar") as string) : null;
      const ricerche = Number.parseInt(cookie(request, "apt_ricerche") ?? "0", 10) || 0;
      const muro = !tokenRadar && ricerche >= 1;
      const intestazioni = new Headers(request.headers);
      intestazioni.delete("x-apt-token");
      intestazioni.delete("x-apt-muro");
      if (tokenRadar) intestazioni.set("x-apt-token", tokenRadar);
      if (muro) intestazioni.set("x-apt-muro", "1");
      const richiesta = new Request(request, { headers: intestazioni });
      const radarInUrl = /^\/radar\/([0-9a-f-]{36})$/i.exec(url.pathname)?.[1] ?? null;
      if (radarInUrl && UUID.test(radarInUrl) && radarInUrl !== tokenRadar) daImpostare.push(setCookie("apt_radar", radarInUrl));
      const ricercaFiltrata = url.pathname === "/cerca" && FILTRI.some((f) => (url.searchParams.get(f) ?? "") !== "");
      if (request.method === "GET" && ricercaFiltrata && !tokenRadar && !muro) daImpostare.push(setCookie("apt_ricerche", String(ricerche + 1)));

      // La copia condivisa vale solo per chi non ha cookie nostri: le pagine degli altri sono personali.
      const personale = tokenRadar !== null || ricerche > 0;
      const copie = request.method === "GET" && conCopia(url) && !personale ? copieCloudflare() : null;
      const chiave = new Request(url.toString(), { method: "GET" });
      if (copie) {
        copia = await copie.match(chiave).catch(() => undefined);
        if (copia) {
          const eta = Date.now() - Number(copia.headers.get("x-apt-at") ?? 0);
          const durata = url.pathname === "/sitemap.xml" ? SITEMAP_MS : FRESCA_MS;
          if (eta < durata) return conCookie(dallaCopia(copia, "fresca"), daImpostare);
        }
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(richiesta, env, ctx);
      const finale = applySecurityHeaders(await normalizeCatastrophicSsrResponse(response));
      // L'indirizzo di prova di Cloudflare non deve finire su Google al posto del dominio vero.
      if (url.hostname.endsWith(".workers.dev")) finale.headers.set("X-Robots-Tag", "noindex");
      // Database fermo: meglio la pagina di qualche minuto fa che un errore.
      if (finale.status >= 500 && copia) return conCookie(dallaCopia(copia, "di-riserva"), daImpostare);
      if (copie && finale.status === 200 && !finale.headers.has("set-cookie")) {
        const daTenere = new Response(finale.clone().body, finale);
        daTenere.headers.set("Cache-Control", "public, max-age=86400");
        daTenere.headers.set("x-apt-at", String(Date.now()));
        const salva = copie.put(chiave, daTenere).catch(() => undefined);
        (ctx as { waitUntil?: (p: Promise<unknown>) => void } | null)?.waitUntil?.(salva);
      }
      return conCookie(finale, daImpostare);
    } catch (error) {
      console.error(error);
      if (copia) return conCookie(dallaCopia(copia, "di-riserva"), daImpostare);
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
