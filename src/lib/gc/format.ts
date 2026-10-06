// Formattazione deterministica (niente Intl): il testo prodotto sul server e
// quello prodotto nel browser devono coincidere carattere per carattere.
const MESI = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

export function fmtInt(n: number): string {
  const s = Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return n < 0 ? `-${s}` : s;
}

function dec(x: number): string {
  const r = Math.round(x * 10) / 10;
  return (Number.isInteger(r) ? r.toString() : r.toFixed(1)).replace(".", ",");
}

export function fmtEuro(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "non indicato";
  return `${fmtInt(n)} €`;
}

export function fmtEuroShort(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "importo non indicato";
  if (n >= 1_000_000_000) return `${dec(n / 1_000_000_000)} mld €`;
  if (n >= 1_000_000) return `${dec(n / 1_000_000)} mln €`;
  if (n >= 10_000) return `${fmtInt(Math.round(n / 1000))} mila €`;
  return `${fmtInt(n)} €`;
}

/** local: "YYYY-MM-DD" oppure "YYYY-MM-DD HH:MM", già in ora italiana */
export function fmtDay(local: string | null | undefined, withYear = true): string {
  if (!local) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(local);
  if (!m) return "";
  const day = Number(m[3]);
  const month = MESI[Number(m[2]) - 1] ?? "";
  return withYear ? `${day} ${month} ${m[1]}` : `${day} ${month}`;
}

export function fmtTime(local: string | null | undefined): string {
  if (!local) return "";
  const m = /(\d{2}):(\d{2})$/.exec(local);
  return m ? `${m[1]}:${m[2]}` : "";
}

export function deadlineLabel(days: number | null | undefined): string {
  if (days == null) return "senza scadenza indicata";
  if (days < 0) return "scaduta";
  if (days === 0) return "scade oggi";
  if (days === 1) return "scade domani";
  return `scade tra ${days} giorni`;
}

export function plural(n: number, one: string, many: string): string {
  return `${fmtInt(n)} ${n === 1 ? one : many}`;
}

export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${cut.slice(0, sp > max * 0.6 ? sp : max).replace(/[\s,;:.]+$/, "")}…`;
}

/** Solo indirizzi http o https: i collegamenti arrivano dalle fonti come testo libero. */
export function httpUrl(v: string | null | undefined): string | null {
  return v && /^https?:\/\//i.test(v) ? v : null;
}
