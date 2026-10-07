// Statistiche e pubblicità: Google Tag Manager (o Google Analytics) con il consenso dei visitatori.
//
// Come funziona:
// - nel <head> di ogni pagina uno script imposta il "consent mode" di Google su "negato" e poi
//   carica il contenitore; finché il visitatore non accetta, Google non scrive cookie;
// - il banner (components/gc/Consenso.tsx) salva la scelta nel browser e la comunica a Google;
// - le pagine segnalano gli eventi che contano (ricerca, scheda aperta, radar attivato,
//   inizio pagamento, pagamento riuscito) con `traccia()`: in Tag Manager si decide cosa farne.

export type Consenso = {
  /** Google Analytics: visite e pagine viste */
  statistiche: boolean;
  /** Google Ads: misurazione delle campagne e remarketing */
  pubblicita: boolean;
  /** quando è stata fatta la scelta (ISO) */
  quando: string;
};

export const CHIAVE_CONSENSO = "apt-consenso";
export const EVENTO_APRI_CONSENSO = "apt-consenso-apri";

type Finestra = Window & { dataLayer?: unknown[] };

function livello(): unknown[] {
  const w = window as Finestra;
  w.dataLayer = w.dataLayer ?? [];
  return w.dataLayer;
}

// Google vuole i comandi "consent" come oggetto `arguments`, non come array.
function gtag(..._args: unknown[]) {
  // eslint-disable-next-line prefer-rest-params
  livello().push(arguments);
}

export function leggiConsenso(): Consenso | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CHIAVE_CONSENSO);
    if (!v) return null;
    const c = JSON.parse(v) as Partial<Consenso>;
    if (typeof c.statistiche !== "boolean" || typeof c.pubblicita !== "boolean") return null;
    return { statistiche: c.statistiche, pubblicita: c.pubblicita, quando: c.quando ?? "" };
  } catch {
    return null;
  }
}

export function applicaConsenso(c: Consenso) {
  if (typeof window === "undefined") return;
  const si = "granted";
  const no = "denied";
  gtag("consent", "update", {
    analytics_storage: c.statistiche ? si : no,
    ad_storage: c.pubblicita ? si : no,
    ad_user_data: c.pubblicita ? si : no,
    ad_personalization: c.pubblicita ? si : no,
  });
  livello().push({ event: "consenso_aggiornato", statistiche: c.statistiche, pubblicita: c.pubblicita });
}

export function salvaConsenso(scelta: { statistiche: boolean; pubblicita: boolean }) {
  const c: Consenso = { ...scelta, quando: new Date().toISOString() };
  try {
    window.localStorage.setItem(CHIAVE_CONSENSO, JSON.stringify(c));
  } catch {
    // browser senza memoria locale: la scelta vale per questa pagina
  }
  applicaConsenso(c);
  return c;
}

/** Riapre il banner delle preferenze (dal collegamento "Cookie" in fondo alla pagina). */
export function apriPreferenze() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_APRI_CONSENSO));
}

/** Segnala un evento a Tag Manager. Innocuo se Tag Manager non è configurato. */
export function traccia(evento: string, dati: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  livello().push({ event: evento, ...dati });
}

/**
 * Lo script da mettere nel <head>, prima di ogni altro: consenso negato finché il visitatore
 * non sceglie, poi la scelta già salvata, infine il contenitore di Tag Manager o di Analytics.
 */
export function scriptGoogle(tagId: string): string {
  const id = JSON.stringify(tagId);
  const base =
    "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}" +
    "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});" +
    `try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(CHIAVE_CONSENSO)}));if(c){var s=c.statistiche?'granted':'denied',p=c.pubblicita?'granted':'denied';gtag('consent','update',{analytics_storage:s,ad_storage:p,ad_user_data:p,ad_personalization:p})}}catch(e){}`;
  if (/^GTM-/i.test(tagId)) {
    return (
      base +
      `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer',${id});`
    );
  }
  // Google Analytics 4 diretto, senza Tag Manager
  return (
    base +
    `(function(d,s,i){var j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtag/js?id='+i;d.head.appendChild(j)})(document,'script',${id});` +
    `gtag('js',new Date());gtag('config',${id});`
  );
}
