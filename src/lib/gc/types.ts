export type Card = {
  id: number;
  slug: string;
  kind: string;
  title: string;
  what: string | null;
  buyer: string | null;
  place: string | null;
  province: string | null;
  region: string | null;
  category: string | null;
  nature: string | null;
  value: number | null;
  deadline: string | null;
  deadline_local: string | null;
  days_left: number | null;
  published: string | null;
  is_new: boolean | null;
  lots: number | null;
  source: string;
  cig: string | null;
  correction: boolean;
  /** riassunto in parole semplici, quando c'è */
  summary?: string | null;
};

export type SearchResult = {
  total: number;
  relaxed: boolean;
  items: Card[];
  limit: number;
  offset: number;
  sort: string;
  /** le parole dei bandi che la ricerca ha aggiunto a quelle scritte da chi cerca */
  also?: string[];
};

export type Tender = {
  id: number;
  slug: string;
  kind: string;
  title: string;
  description: string | null;
  summary: string | null;
  buyer: string | null;
  buyer_cf: string | null;
  comune: string | null;
  province: string | null;
  place_label: string | null;
  region: string | null;
  region_name: string | null;
  category: string | null;
  category_name: string | null;
  cpv_code: string | null;
  cpv_label: string | null;
  nature: string | null;
  procedure: string | null;
  value: number | null;
  published: string | null;
  deadline: string | null;
  deadline_local: string | null;
  days_left: number | null;
  cig: string | null;
  lots: number | null;
  source: string;
  url_official: string | null;
  url_documents: string | null;
  correction: boolean;
  open: boolean;
  twin_id: number | null;
  ted_ref: string | null;
  updated: string | null;
  related: Card[];
};

export type Stats = {
  open: number;
  new_today: number;
  new_7d: number;
  closing_7d: number;
  under_150k: number;
  from_150k_to_1m: number;
  over_1m: number;
  median_value: number | null;
  buyers: number;
  by_region: Record<string, number>;
  by_category: Record<string, number>;
  by_kind: Record<string, number>;
  by_nature: Record<string, number>;
  last_ingest: string | null;
};

export type Legal = {
  ragione_sociale: string | null;
  piva: string | null;
  sede: string | null;
  email: string | null;
};

export type PlanPaid = {
  price_month: number;
  price_year: number;
  profiles: number;
  link_month: string | null;
  link_year: string | null;
  /** identificativi dei prezzi in Paddle, nella forma pri_… */
  paddle_month: string | null;
  paddle_year: string | null;
};

/** Paddle nel browser: il token pubblico e l'ambiente a cui appartiene. */
export type PaddleConf = { token: string; sandbox: boolean };

export type Plans = {
  free: { profiles: number; daily_matches: number };
  pro: PlanPaid;
  studio: PlanPaid;
  /** collegamento al portale clienti, per disdire in autonomia */
  portal?: string | null;
  /** token pubblico di Paddle così come è salvato nelle impostazioni */
  paddle_token?: string | null;
  /** Paddle pronto all'uso, ricavato dal token: assente se il token manca o non è valido */
  paddle?: PaddleConf | null;
};

export type PublicSettings = {
  signupOpen: boolean;
  emailEnabled: boolean;
  legal: Legal;
  contactEmail: string | null;
  plans: Plans;
};

export type RadarProfile = {
  id: number;
  label: string | null;
  q: string | null;
  regions: string[];
  categories: string[];
  min_value: number | null;
  active: boolean;
  matches: { total: number; items: Card[]; relaxed?: boolean };
};

export type RadarOk = {
  ok: true;
  subscriber: {
    id: string;
    email: string;
    company: string | null;
    plan: string;
    status: string;
    confirmed: boolean;
    created: string;
  };
  limits: { profiles?: number; daily_matches?: number; shown: number };
  profiles: RadarProfile[];
};
export type RadarData = RadarOk | { ok: false; error?: string };

export type AdminSettings = {
  site?: { name?: string; url?: string; contact_email?: string | null; email_from?: string | null };
  legal?: Legal;
  plans?: Plans;
  signup_enabled?: boolean;
  email_enabled?: boolean;
};

export type AdminOk = {
  ok: true;
  settings: AdminSettings;
  secrets: { resend: boolean; stripe: boolean; paddle?: boolean };
  pay_events?: { type: string | null; outcome: string | null; at: string }[];
  signup_open: boolean;
  email_ready: boolean;
  kpi: {
    subscribers: number;
    confirmed: number;
    pro: number;
    studio: number;
    signups_today: number;
    signups_7d: number;
    searches_7d: number;
    views_7d: number;
    mrr: number;
  };
  signups_daily: [string, number][];
  top_queries: [string, number][];
  recent: {
    email: string;
    company: string | null;
    plan: string;
    status: string;
    confirmed: boolean;
    created: string;
    origin: string | null;
    q: string | null;
    regions: string[] | null;
  }[];
  data: {
    home: Stats | null;
    tenders_total: number;
    queue_pending: number;
    queue_errors_24h: number;
    last_done: string | null;
  };
  email: Record<string, number>;
};
export type AdminData = AdminOk | { ok: false };

export type HomeData = {
  stats: Stats | null;
  latest: Card[];
  sample: Card | null;
};

export type SubscribeResult =
  | { ok: true; status: "created"; token: string }
  | { ok: true; status: "exists" }
  | { ok: false; error: string };
