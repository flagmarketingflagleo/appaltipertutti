import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Consenso } from "../components/gc/Consenso";
import gcCss from "../gc.css?url";
import { scriptGoogle } from "../lib/gc/analytics";
import { getSettings } from "../lib/gc/api.functions";
import { SITE } from "../lib/gc/config";
import type { PublicSettings } from "../lib/gc/types";

function buildHead(settings: PublicSettings | undefined) {
  const ogImage = `${SITE.url}/og.png`;
  // Statistiche e pubblicità (Google) solo se nella regia è stato inserito un codice.
  const scripts = settings?.tagId ? [{ children: scriptGoogle(settings.tagId) }] : [];
  return {
    scripts,
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE.title },
      { name: "description", content: SITE.description },
      { name: "author", content: SITE.name },
      { name: "theme-color", content: "#f4f6f3" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:site_name", content: SITE.name },
      { property: "og:locale", content: "it_IT" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: SITE.title },
      { property: "og:description", content: SITE.description },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ogImage },
    ],
    links: [
      { rel: "stylesheet", href: gcCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  };
}

function NotFoundComponent() {
  return (
    <main className="gc-wrap gc-testata">
      <h1>Questa pagina non c'è</h1>
      <p className="gc-testata__sotto">
        L'indirizzo è sbagliato oppure la gara è stata rimossa. Puoi ripartire dalla ricerca.
      </p>
      <p className="gc-azioni">
        <a className="gc-btn" href="/cerca">
          Cerca tra le gare aperte
        </a>
        <a href="/">Torna alla pagina iniziale</a>
      </p>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <main className="gc-wrap gc-testata">
      <h1>La pagina non si è caricata</h1>
      <p className="gc-testata__sotto">
        I dati delle gare non sono arrivati. Di solito basta riprovare tra qualche secondo.
      </p>
      <p className="gc-azioni">
        <button
          type="button"
          className="gc-btn"
          onClick={() => {
            void router.invalidate();
            reset();
          }}
        >
          Riprova
        </button>
        <a href="/">Torna alla pagina iniziale</a>
      </p>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ loaderData }) => buildHead(loaderData?.settings),
  loader: async () => ({ settings: await getSettings() }),
  staleTime: 120_000,
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
      </head>
      <body className="gc">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { settings } = Route.useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      {/* I percorsi figli vengono disegnati qui. */}
      <Outlet />
      <Consenso attivo={settings.tagId !== null} />
    </QueryClientProvider>
  );
}
