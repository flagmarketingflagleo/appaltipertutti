export const SITE = {
  name: "Appalti per tutti",
  url: "https://appaltipertutti.it",
  title: "Appalti per tutti: le gare pubbliche, scritte chiare",
  description:
    "Scrivi cosa fa la tua impresa e trova le gare d'appalto adatte, con i quattro dati che contano: cosa chiedono, chi compra, quanto vale, entro quando.",
} as const;

/** Indirizzo da incollare in Stripe come destinazione del webhook. */
export const STRIPE_WEBHOOK_URL =
  "https://sixziykskamdikhssktn.supabase.co/rest/v1/rpc/gc_stripe_webhook?apikey=sb_publishable_wq4cimdRe5mObF1TNBdDQQ_GCqK3tSE";

/** Indirizzo da incollare in Paddle come destinazione delle notifiche. */
export const PADDLE_WEBHOOK_URL =
  "https://sixziykskamdikhssktn.supabase.co/rest/v1/rpc/gc_paddle_webhook?apikey=sb_publishable_wq4cimdRe5mObF1TNBdDQQ_GCqK3tSE";

export type Region = { slug: string; name: string };
export const REGIONS: Region[] = [
  { slug: "piemonte", name: "Piemonte" },
  { slug: "valle-d-aosta", name: "Valle d'Aosta" },
  { slug: "liguria", name: "Liguria" },
  { slug: "lombardia", name: "Lombardia" },
  { slug: "trentino-alto-adige", name: "Trentino-Alto Adige" },
  { slug: "veneto", name: "Veneto" },
  { slug: "friuli-venezia-giulia", name: "Friuli-Venezia Giulia" },
  { slug: "emilia-romagna", name: "Emilia-Romagna" },
  { slug: "toscana", name: "Toscana" },
  { slug: "umbria", name: "Umbria" },
  { slug: "marche", name: "Marche" },
  { slug: "lazio", name: "Lazio" },
  { slug: "abruzzo", name: "Abruzzo" },
  { slug: "molise", name: "Molise" },
  { slug: "campania", name: "Campania" },
  { slug: "puglia", name: "Puglia" },
  { slug: "basilicata", name: "Basilicata" },
  { slug: "calabria", name: "Calabria" },
  { slug: "sicilia", name: "Sicilia" },
  { slug: "sardegna", name: "Sardegna" },
];

export type Category = { slug: string; name: string; short: string };
export const CATEGORIES: Category[] = [
  { slug: "edilizia-lavori", name: "Edilizia e lavori pubblici", short: "Edilizia" },
  { slug: "progettazione-ingegneria", name: "Progettazione, ingegneria e architettura", short: "Progettazione" },
  { slug: "manutenzione-impianti", name: "Manutenzioni e impianti", short: "Manutenzioni" },
  { slug: "pulizie-rifiuti-ambiente", name: "Pulizie, rifiuti e ambiente", short: "Pulizie e ambiente" },
  { slug: "verde-agricoltura", name: "Verde, agricoltura e foreste", short: "Verde" },
  { slug: "informatica-software", name: "Informatica e software", short: "Informatica" },
  { slug: "telecomunicazioni", name: "Telecomunicazioni e apparati", short: "Telecomunicazioni" },
  { slug: "sanita-dispositivi-farmaci", name: "Sanità, dispositivi medici e farmaci", short: "Sanità" },
  { slug: "ristorazione-alimentari", name: "Ristorazione e alimentari", short: "Ristorazione" },
  { slug: "trasporti-veicoli", name: "Trasporti, veicoli e logistica", short: "Trasporti" },
  { slug: "energia-elettricita", name: "Energia, elettricità e carburanti", short: "Energia" },
  { slug: "arredi-forniture", name: "Arredi, abbigliamento e forniture varie", short: "Forniture" },
  { slug: "vigilanza-sicurezza", name: "Vigilanza e sicurezza", short: "Sicurezza" },
  { slug: "consulenza-servizi-imprese", name: "Consulenza e servizi alle imprese", short: "Consulenza" },
  { slug: "assicurazioni-finanza", name: "Assicurazioni e servizi finanziari", short: "Assicurazioni" },
  { slug: "formazione-istruzione", name: "Formazione e istruzione", short: "Formazione" },
  { slug: "servizi-sociali", name: "Servizi sociali e alla persona", short: "Sociale" },
  { slug: "cultura-sport-eventi", name: "Cultura, sport ed eventi", short: "Cultura e sport" },
  { slug: "laboratorio-chimica", name: "Laboratorio, chimica e strumenti", short: "Laboratorio" },
  { slug: "macchinari-attrezzature", name: "Macchinari e attrezzature", short: "Macchinari" },
  { slug: "stampa-comunicazione", name: "Stampa, editoria e comunicazione", short: "Stampa" },
  { slug: "altro", name: "Altri settori", short: "Altro" },
];

export const KIND_LABEL: Record<string, string> = {
  bando: "Gara",
  indagine: "Indagine di mercato",
  elenco: "Elenco fornitori",
  qualificazione: "Sistema di qualificazione",
  avviso: "Avviso",
};

export const NATURE_LABEL: Record<string, string> = {
  lavori: "Lavori",
  servizi: "Servizi",
  forniture: "Forniture",
};

export const SORT_LABEL: Record<string, string> = {
  rilevanza: "Più pertinenti",
  recenti: "Più recenti",
  scadenza: "Scadenza più vicina",
  valore: "Valore più alto",
};

export const MIN_VALUES: { value: number; label: string }[] = [
  { value: 40000, label: "da 40 mila €" },
  { value: 150000, label: "da 150 mila €" },
  { value: 500000, label: "da 500 mila €" },
  { value: 1000000, label: "da 1 milione €" },
  { value: 5000000, label: "da 5 milioni €" },
];

export function regionName(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return REGIONS.find((r) => r.slug === slug)?.name ?? null;
}

export function categoryName(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? null;
}

const REGION_IN: Record<string, string> = { lazio: "nel Lazio", marche: "nelle Marche" };

/** "in Sicilia", "nel Lazio", "nelle Marche" */
export function regionIn(slug: string | null | undefined): string | null {
  const name = regionName(slug);
  if (!slug || !name) return null;
  return REGION_IN[slug] ?? `in ${name}`;
}
