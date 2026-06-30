const BASE = "https://api-futebool-holandes.vercel.app";
const TOKEN_KEY = "fh_admin_token";

export const auth = {
  getToken: ()          => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear:    ()          => localStorage.removeItem(TOKEN_KEY),
  isLogged: ()          => !!localStorage.getItem(TOKEN_KEY),
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = auth.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res  = await fetch(`${BASE}${path}`, { ...init, headers });
  const json = await res.json();
  if (res.status === 401) { auth.clear(); throw new AuthError(json.error ?? "Sessão expirada."); }
  if (!res.ok || !json.success) throw new Error(json.error ?? "Erro desconhecido");
  return json.data as T;
}

export class AuthError extends Error {}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AdminUser { id: number; name: string; email: string; lastLoginAt?: string; }
export interface Category  { id: number; name: string; badgeClass: string; color: string; _count?: { articles: number }; }
export interface Article {
  id: number; title: string; slug: string; meta: string; date: string;
  image: string; icon: string; club?: string | null; tags: string[]; body: string[];
  published: boolean; featured: boolean; createdAt: string; updatedAt: string;
  category: Category; catClass?: string;
}
export interface ArticleInput {
  title: string; meta: string; date: string; image: string; icon?: string;
  club?: string; tags?: string[]; body: string[];
  published?: boolean; featured?: boolean; categoryId: number;
}
export interface PaginatedArticles {
  articles: Article[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

// ─── Standings ────────────────────────────────────────────────────────────────
export interface StandingEntry {
  id: number; position: number; team: string; played: number; wins: number;
  draws: number; losses: number; goalDiff: string; points: number;
  champion: boolean; relegation: boolean; clSpot: boolean; elSpot: boolean;
}
export interface Standing {
  id: number; title: string; season: string; footer: string;
  entries: StandingEntry[];
}

// ─── Convocation ─────────────────────────────────────────────────────────────
export interface ConvocationGroup { id: number; position: string; order: number; players: string[]; }
export interface Convocation { id: number; title: string; groups: ConvocationGroup[]; }

// ─── Fixture ─────────────────────────────────────────────────────────────────
export interface Fixture {
  id: number; day: string; month: string; competition: string;
  homeTeam: string; awayTeam: string; time: string; order: number;
}

// ─── Nations League ───────────────────────────────────────────────────────────
export interface NationsEntry {
  id: number; position: number; team: string; played: number;
  wins: number; draws: number; losses: number; points: number; highlight: boolean;
}
export interface NationsGroup { id: number; title: string; footer: string; entries: NationsEntry[]; }

// ─── Top Scorer ───────────────────────────────────────────────────────────────
export interface TopScorer { id: number; rank: number; name: string; goals: number; }

// ─── Site Config ─────────────────────────────────────────────────────────────
export interface SiteConfig {
  site_name?: string; site_tagline?: string; site_sub?: string;
  footer_copy?: string; eredivisie_intro?: string;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  async login(email: string, password: string) {
    const data = await request<{ token: string; admin: AdminUser; expiresIn: string }>(
      "/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }
    );
    auth.setToken(data.token);
    return data;
  },
  logout() { auth.clear(); },
  me() { return request<AdminUser>("/auth/me"); },
  changePassword(currentPassword: string, newPassword: string) {
    return request<{ message: string }>("/auth/change-password", {
      method: "POST", body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// ─── Articles API ─────────────────────────────────────────────────────────────
export const articlesApi = {
  list(params?: { category?: string; published?: boolean; featured?: boolean; search?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.category)                q.set("category", params.category);
    if (params?.published !== undefined) q.set("published", String(params.published));
    if (params?.featured  !== undefined) q.set("featured",  String(params.featured));
    if (params?.search)                  q.set("search", params.search);
    if (params?.page)                    q.set("page", String(params.page));
    if (params?.limit)                   q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<PaginatedArticles>(`/articles${qs ? `?${qs}` : ""}`);
  },
  get(idOrSlug: string | number)    { return request<Article>(`/articles/${idOrSlug}`); },
  create(data: ArticleInput)        { return request<Article>("/articles", { method: "POST", body: JSON.stringify(data) }); },
  update(id: number, data: ArticleInput) { return request<Article>(`/articles/${id}`, { method: "PUT", body: JSON.stringify(data) }); },
  patch(id: number, data: Partial<ArticleInput>) { return request<Article>(`/articles/${id}`, { method: "PATCH", body: JSON.stringify(data) }); },
  delete(id: number)                { return request<{ deleted: boolean }>(`/articles/${id}`, { method: "DELETE" }); },
};

// ─── Categories API ───────────────────────────────────────────────────────────
export const categoriesApi = {
  list() { return request<Category[]>("/categories"); },
  create(name: string, badgeClass: string, color: string = "#FF6200") {
    return request<Category>("/categories", { method: "POST", body: JSON.stringify({ name, badgeClass, color }) });
  },
  update(id: number, data: Partial<{ name: string; badgeClass: string; color: string }>) {
    return request<Category>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  delete(id: number) { return request<{ deleted: boolean }>(`/categories/${id}`, { method: "DELETE" }); },
};

// ─── Standings API ────────────────────────────────────────────────────────────
export const standingsApi = {
  get() { return request<Standing | null>("/standings"); },
  update(data: { title?: string; season?: string; footer?: string; entries: Omit<StandingEntry, "id">[] }) {
    return request<Standing>("/standings", { method: "PUT", body: JSON.stringify(data) });
  },
};

// ─── Convocation API ──────────────────────────────────────────────────────────
export const convocationApi = {
  get() { return request<Convocation | null>("/convocation"); },
  update(data: { title?: string; groups: { position: string; players: string[] }[] }) {
    return request<Convocation>("/convocation", { method: "PUT", body: JSON.stringify(data) });
  },
};

// ─── Fixtures API ─────────────────────────────────────────────────────────────
export const fixturesApi = {
  list() { return request<Fixture[]>("/fixtures"); },
  update(fixtures: Omit<Fixture, "id" | "order">[]) {
    return request<Fixture[]>("/fixtures", { method: "PUT", body: JSON.stringify({ fixtures }) });
  },
};

// ─── Nations API ──────────────────────────────────────────────────────────────
export const nationsApi = {
  get() { return request<NationsGroup | null>("/nations"); },
  update(data: { title?: string; footer?: string; entries: Omit<NationsEntry, "id">[] }) {
    return request<NationsGroup>("/nations", { method: "PUT", body: JSON.stringify(data) });
  },
};

// ─── Scorers API ──────────────────────────────────────────────────────────────
export const scorersApi = {
  list() { return request<TopScorer[]>("/scorers"); },
  update(scorers: { name: string; goals: number }[]) {
    return request<TopScorer[]>("/scorers", { method: "PUT", body: JSON.stringify({ scorers }) });
  },
};

// ─── Config API ───────────────────────────────────────────────────────────────
export const configApi = {
  get()                  { return request<SiteConfig>("/config"); },
  update(data: Partial<SiteConfig>) {
    return request<SiteConfig>("/config", { method: "PATCH", body: JSON.stringify(data) });
  },
};

// ─── Seed ─────────────────────────────────────────────────────────────────────
export function seedDatabase() { return request<{ message: string }>("/seed", { method: "POST" }); }

// ─── Helper ───────────────────────────────────────────────────────────────────
export function normalizeArticle(a: Article): Article {
  return { ...a, catClass: a.category.badgeClass };
}