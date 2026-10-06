import type { PaddleConf } from "./types";

/** Quello che Paddle.js racconta mentre il cliente paga. */
export type PaddleEvent = { name?: string; data?: unknown };

type PaddleApi = {
  Environment: { set: (env: "sandbox" | "production") => void };
  Initialize: (options: { token: string; eventCallback?: (event: PaddleEvent) => void }) => void;
  Checkout: { open: (options: Record<string, unknown>) => void; close: () => void };
};

declare global {
  interface Window {
    Paddle?: PaddleApi;
  }
}

const SCRIPT = "https://cdn.paddle.com/paddle/v2/paddle.js";

let loading: Promise<PaddleApi> | null = null;
const listeners = new Set<(event: PaddleEvent) => void>();

/** Ascolta gli eventi del pagamento. Restituisce la funzione per smettere. */
export function onPaddleEvent(fn: (event: PaddleEvent) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Carica Paddle.js una sola volta e lo inizializza. Se la pagina è stata aperta
 * da un collegamento di Paddle (parametro _ptxn), Paddle.js apre da solo il pagamento.
 */
export function loadPaddle(conf: PaddleConf): Promise<PaddleApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("paddle: solo nel browser"));
  if (loading) return loading;
  loading = new Promise<PaddleApi>((resolve, reject) => {
    const start = () => {
      const api = window.Paddle;
      if (!api) {
        loading = null;
        reject(new Error("paddle: script non disponibile"));
        return;
      }
      try {
        if (conf.sandbox) api.Environment.set("sandbox");
        api.Initialize({
          token: conf.token,
          eventCallback: (event) => {
            listeners.forEach((fn) => fn(event));
          },
        });
        resolve(api);
      } catch (error) {
        loading = null;
        reject(error instanceof Error ? error : new Error("paddle: avvio non riuscito"));
      }
    };
    if (window.Paddle) {
      start();
      return;
    }
    const tag = document.createElement("script");
    tag.src = SCRIPT;
    tag.async = true;
    tag.onload = start;
    tag.onerror = () => {
      loading = null;
      tag.remove();
      reject(new Error("paddle: script non caricato"));
    };
    document.head.appendChild(tag);
  });
  return loading;
}

/** Apre la finestra di pagamento per un prezzo, legandola al radar di chi paga. */
export async function openCheckout(conf: PaddleConf, priceId: string, subscriberId: string, email: string): Promise<void> {
  const api = await loadPaddle(conf);
  api.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email },
    customData: { sid: subscriberId },
    settings: { displayMode: "overlay", theme: "light", locale: "it", variant: "one-page" },
  });
}

export function closeCheckout(): void {
  try {
    window.Paddle?.Checkout.close();
  } catch {
    // la finestra era già chiusa
  }
}
