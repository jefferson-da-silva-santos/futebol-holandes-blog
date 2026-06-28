// ─────────────────────────────────────────────────────────────────────────────
//  api.ts — Cliente HTTP para a API do Futebol Holandês
// ─────────────────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const TOKEN_KEY = "fh_admin_token";

// ─── Token helpers ────────────────────────────────────────────────────────────
export const auth = {
  getToken: ()          => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear:    ()          => localStorage.removeItem(TOKEN_KEY),
  isLogged: ()          => !!localStorage.getItem(TOKEN_KEY),
};

// ─── Base fetch ───────────────────────────────────────────────────────────────
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = auth.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res  = await fetch(`${BASE}${path}`, { ...init, headers });
  const json = await res.json();

  if (res.status === 401) {
    auth.clear();
    throw new AuthError(json.error ?? "Sessão expirada.");
  }

  if (!res.ok || !json.success) throw new Error(json.error ?? "Erro desconhecido");
  return json.data as T;
}

export class AuthError extends Error {}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  lastLoginAt?: string;
}

export interface Category {
  id: number;
  name: string;
  badgeClass: string;
  _count?: { articles: number };
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  meta: string;
  date: string;
  image: string;
  icon: string;
  club?: string | null;
  tags: string[];
  body: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
  category: Category;
  catClass?: string; // derived
}

export interface ArticleInput {
  title: string;
  meta: string;
  date: string;
  image: string;
  icon?: string;
  club?: string;
  tags?: string[];
  body: string[];
  published?: boolean;
  categoryId: number;
}

export interface PaginatedArticles {
  articles: Article[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  async login(email: string, password: string) {
    const data = await request<{ token: string; admin: AdminUser; expiresIn: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
    auth.setToken(data.token);
    return data;
  },

  logout() {
    auth.clear();
  },

  me() {
    return request<AdminUser>("/auth/me");
  },

  changePassword(currentPassword: string, newPassword: string) {
    return request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// ─── Articles API ─────────────────────────────────────────────────────────────
export const articlesApi = {
  list(params?: { category?: string; published?: boolean; search?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.category)                q.set("category", params.category);
    if (params?.published !== undefined) q.set("published", String(params.published));
    if (params?.search)                  q.set("search", params.search);
    if (params?.page)                    q.set("page", String(params.page));
    if (params?.limit)                   q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<PaginatedArticles>(`/articles${qs ? `?${qs}` : ""}`);
  },

  get(idOrSlug: string | number) {
    return request<Article>(`/articles/${idOrSlug}`);
  },

  create(data: ArticleInput) {
    return request<Article>("/articles", { method: "POST", body: JSON.stringify(data) });
  },

  update(id: number, data: ArticleInput) {
    return request<Article>(`/articles/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  patch(id: number, data: Partial<ArticleInput>) {
    return request<Article>(`/articles/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  delete(id: number) {
    return request<{ deleted: boolean }>(`/articles/${id}`, { method: "DELETE" });
  },
};

// ─── Categories API ───────────────────────────────────────────────────────────
export const categoriesApi = {
  list() { return request<Category[]>("/categories"); },
  create(name: string, badgeClass: string) {
    return request<Category>("/categories", { method: "POST", body: JSON.stringify({ name, badgeClass }) });
  },
  delete(id: number) {
    return request<{ deleted: boolean }>(`/categories/${id}`, { method: "DELETE" });
  },
};

// ─── Seed ─────────────────────────────────────────────────────────────────────
export function seedDatabase() {
  return request<{ message: string }>("/seed", { method: "POST" });
}

// ─── Helper ───────────────────────────────────────────────────────────────────
export function normalizeArticle(a: Article): Article {
  return { ...a, catClass: a.category.badgeClass };
}