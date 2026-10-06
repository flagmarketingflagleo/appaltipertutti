import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { rpc } from "./supabase.server";
import type {
  AdminData,
  Card,
  HomeData,
  Plans,
  PublicSettings,
  RadarData,
  SearchResult,
  Stats,
  SubscribeResult,
  Tender,
} from "./types";

export const PAGE_SIZE = 20;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_PLANS: Plans = {
  free: { profiles: 1, daily_matches: 5 },
  pro: { price_month: 29, price_year: 290, profiles: 5, link_month: null, link_year: null, paddle_month: null, paddle_year: null },
  studio: { price_month: 79, price_year: 790, profiles: 20, link_month: null, link_year: null, paddle_month: null, paddle_year: null },
};

const DEFAULT_SETTINGS: PublicSettings = {
  signupOpen: false,
  emailEnabled: false,
  legal: { ragione_sociale: null, piva: null, sede: null, email: null },
  contactEmail: null,
  plans: DEFAULT_PLANS,
};

type RawSettings = {
  site?: { contact_email?: string | null };
  legal?: Partial<PublicSettings["legal"]>;
  plans?: Partial<Plans>;
  signup_enabled?: boolean;
  email_enabled?: boolean;
};

function txt(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function safeLink(v: unknown): string | null {
  const s = txt(v);
  return s && s.startsWith("https://") ? s : null;
}

function paddleId(v: unknown): string | null {
  const s = txt(v);
  return s && /^pri_[a-z0-9]{8,40}$/i.test(s) ? s : null;
}

function paddleToken(v: unknown): string | null {
  const s = txt(v);
  return s && /^(live|test)_[a-z0-9]{8,80}$/i.test(s) ? s : null;
}

function paid(p: Plans["pro"]): Plans["pro"] {
  return {
    ...p,
    link_month: safeLink(p.link_month),
    link_year: safeLink(p.link_year),
    paddle_month: paddleId(p.paddle_month),
    paddle_year: paddleId(p.paddle_year),
  };
}

function normalizeSettings(raw: RawSettings | null): PublicSettings {
  if (!raw) return DEFAULT_SETTINGS;
  const legal = {
    ragione_sociale: txt(raw.legal?.ragione_sociale),
    piva: txt(raw.legal?.piva),
    sede: txt(raw.legal?.sede),
    email: txt(raw.legal?.email),
  };
  const pro = { ...DEFAULT_PLANS.pro, ...(raw.plans?.pro ?? {}) };
  const studio = { ...DEFAULT_PLANS.studio, ...(raw.plans?.studio ?? {}) };
  const token = paddleToken(raw.plans?.paddle_token);
  return {
    signupOpen: raw.signup_enabled === true && legal.ragione_sociale !== null,
    emailEnabled: raw.email_enabled === true,
    legal,
    contactEmail: txt(raw.site?.contact_email) ?? legal.email,
    plans: {
      free: { ...DEFAULT_PLANS.free, ...(raw.plans?.free ?? {}) },
      pro: paid(pro),
      studio: paid(studio),
      portal: safeLink(raw.plans?.portal),
      paddle: token ? { token, sandbox: token.toLowerCase().startsWith("test_") } : null,
    },
  };
}

// Le impostazioni cambiano di rado: si rileggono al massimo ogni 30 secondi.
let settingsCache: { at: number; value: PublicSettings } | null = null;

export const getSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSettings> => {
    const now = Date.now();
    if (settingsCache && now - settingsCache.at < 30_000) return settingsCache.value;
    try {
      const value = normalizeSettings(await rpc<RawSettings>("gc_public_settings"));
      settingsCache = { at: now, value };
      return value;
    } catch {
      return settingsCache?.value ?? DEFAULT_SETTINGS;
    }
  },
);

const searchSchema = z.object({
  q: z.string().max(300).optional(),
  regione: z.string().max(40).optional(),
  settore: z.string().max(40).optional(),
  natura: z.string().max(20).optional(),
  tipo: z.string().max(20).optional(),
  min: z.number().min(0).max(1e12).optional(),
  ordine: z.string().max(20).optional(),
  p: z.number().int().min(1).max(150).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  log: z.boolean().optional(),
});

export const searchTenders = createServerFn({ method: "GET" })
  .validator(searchSchema)
  .handler(async ({ data }): Promise<SearchResult> => {
    const limit = data.limit ?? PAGE_SIZE;
    const page = data.p ?? 1;
    const q = data.q?.trim() || null;
    // Una sola chiamata: il database cerca e, se richiesto, registra la ricerca con il numero
    // di gare trovate (le ricerche a zero dicono quali parole mancano al dizionario).
    return rpc<SearchResult>("gc_search_logged", {
      p_q: q,
      p_region: data.regione || null,
      p_category: data.settore || null,
      p_nature: data.natura || null,
      p_kind: data.tipo || null,
      p_min_value: data.min ?? null,
      p_max_value: null,
      p_sort: data.ordine || null,
      p_limit: limit,
      p_offset: (page - 1) * limit,
      p_log: data.log === true && page === 1,
    });
  });

function pickSample(items: Card[]): Card | null {
  const good = items.find(
    (c) =>
      c.kind === "bando" &&
      c.what &&
      c.buyer &&
      c.place &&
      c.value != null &&
      c.deadline_local &&
      (c.days_left ?? 0) >= 5 &&
      c.title.length >= 110 &&
      c.title.length <= 280,
  );
  return good ?? items.find((c) => c.what && c.buyer && c.value != null && c.deadline_local) ?? null;
}

export const getHome = createServerFn({ method: "GET" }).handler(async (): Promise<HomeData> => {
  const [statsWrap, latest] = await Promise.all([
    rpc<{ stats: Stats | null }>("gc_stats"),
    rpc<SearchResult>("gc_search", { p_sort: "recenti", p_limit: 40, p_offset: 0 }),
  ]);
  return {
    stats: statsWrap?.stats ?? null,
    latest: latest.items.slice(0, 8),
    sample: pickSample(latest.items),
  };
});

export const getTender = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }): Promise<Tender | null> => {
    const [tender] = await Promise.all([
      rpc<Tender | null>("gc_tender", { p_id: data.id }),
      rpc<null>("gc_event", { p_type: "view", p_payload: { id: data.id } }).catch(() => null),
    ]);
    return tender;
  });

export const subscribe = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().min(3).max(200),
      q: z.string().max(300).optional(),
      regione: z.string().max(40).optional(),
      settore: z.string().max(40).optional(),
      consent: z.boolean(),
      origin: z.string().max(120).optional(),
      hp: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }): Promise<SubscribeResult> => {
    return rpc<SubscribeResult>("gc_subscribe", {
      p_email: data.email,
      p_q: data.q ?? null,
      p_regions: data.regione ? [data.regione] : [],
      p_categories: data.settore ? [data.settore] : [],
      p_min_value: null,
      p_company: null,
      p_consent: data.consent,
      p_origin: data.origin ?? null,
      p_hp: data.hp ?? null,
    });
  });

export const getRadar = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().regex(UUID), confirm: z.boolean().optional() }))
  .handler(async ({ data }): Promise<RadarData> => {
    if (data.confirm) {
      await rpc("gc_radar_action", { p_token: data.token, p_action: "confirm" }).catch(() => null);
    }
    return rpc<RadarData>("gc_radar", { p_token: data.token });
  });

export const saveRadar = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().regex(UUID),
      profileId: z.number().int().positive().nullable(),
      label: z.string().max(60).optional(),
      q: z.string().max(300).optional(),
      regions: z.array(z.string().max(40)).max(20),
      categories: z.array(z.string().max(40)).max(22),
      min: z.number().min(0).max(1e12).nullable(),
      active: z.boolean(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; max?: number }> => {
    return rpc("gc_radar_save", {
      p_token: data.token,
      p_profile_id: data.profileId,
      p_label: data.label ?? null,
      p_q: data.q ?? null,
      p_regions: data.regions,
      p_categories: data.categories,
      p_min_value: data.min,
      p_active: data.active,
    });
  });

export const radarAction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().regex(UUID),
      action: z.enum(["unsubscribe", "resubscribe", "erase"]),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    return rpc("gc_radar_action", { p_token: data.token, p_action: data.action });
  });

export const getAdmin = createServerFn({ method: "POST" })
  .validator(z.object({ key: z.string().min(20).max(80) }))
  .handler(async ({ data }): Promise<AdminData> => {
    return rpc<AdminData>("gc_admin", { p_key: data.key });
  });

export const saveAdmin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      key: z.string().min(20).max(80),
      settings: z.record(z.string(), z.unknown()).optional(),
      secrets: z.record(z.string(), z.string().max(300)).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; signup_open?: boolean; email_ready?: boolean }> => {
    return rpc("gc_admin_save", {
      p_key: data.key,
      p_settings: data.settings ?? null,
      p_secrets: data.secrets ?? null,
    });
  });

export const getSitemap = createServerFn({ method: "GET" }).handler(
  async (): Promise<[number, string, string][]> => {
    return (await rpc<[number, string, string][]>("gc_sitemap", { p_limit: 10000, p_offset: 0 })) ?? [];
  },
);
