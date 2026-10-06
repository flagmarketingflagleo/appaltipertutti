// Accesso ai dati: funzioni RPC pubbliche di Supabase (schema dedicato, sola
// lettura salvo iscrizione e radar). La chiave qui sotto è quella "publishable",
// pensata per stare nel codice dei client: i permessi veri stanno nel database.
const SUPABASE_URL = "https://sixziykskamdikhssktn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wq4cimdRe5mObF1TNBdDQQ_GCqK3tSE";

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`rpc ${fn} ${res.status}: ${text.slice(0, 300)}`);
    throw new Error(`Dati non disponibili (${res.status})`);
  }
  if (res.status === 204) return null as T;
  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}
