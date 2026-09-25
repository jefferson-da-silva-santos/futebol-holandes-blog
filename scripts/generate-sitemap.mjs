// scripts/generate-sitemap.mjs
//
// Gera public/sitemap.xml com as URLs REAIS do site: as rotas fixas
// (home, eredivisie, seleção) + uma entrada por artigo publicado + uma
// entrada por categoria — buscando tudo direto da API, na hora do build.
//
// Por que isso existe: um sitemap.xml escrito à mão fica desatualizado no
// mesmo dia em que uma notícia nova é publicada. Rodando este script antes
// de cada deploy (ver .github/workflows/deploy.yml), o sitemap sempre
// reflete o que está publicado de verdade — sem depender de lembrar de
// atualizar um arquivo estático.
//
// Uso: node scripts/generate-sitemap.mjs
// Variáveis de ambiente opcionais:
//   SITE_URL — domínio público do site (padrão: https://futebolholandes.blog.br)
//   API_URL  — base da API (padrão: mesma usada pelo front, ver src/api.ts)

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SITE_URL = (process.env.SITE_URL || "https://futebolholandes.blog.br").replace(/\/$/, "");
const API_URL = (process.env.API_URL || "https://deeppink-chimpanzee-322958.hostingersite.com").replace(/\/$/, "");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "public", "sitemap.xml");

function toSlug(str) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function xmlEscape(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function fetchJson(url) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(`Falha ao buscar ${url}: ${json.error ?? res.statusText}`);
  }
  return json.data;
}

// Busca TODOS os artigos publicados, paginando até acabar.
async function fetchAllPublishedArticles() {
  const all = [];
  let page = 1;
  const limit = 100;
  for (;;) {
    const data = await fetchJson(`${API_URL}/articles?published=true&page=${page}&limit=${limit}`);
    all.push(...(data.articles ?? []));
    const pages = data.pagination?.pages ?? 1;
    if (page >= pages) break;
    page += 1;
  }
  return all;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  console.log(`Gerando sitemap.xml para ${SITE_URL} (dados de ${API_URL})...`);

  let articles = [];
  let categories = [];
  try {
    [articles, categories] = await Promise.all([
      fetchAllPublishedArticles(),
      fetchJson(`${API_URL}/categories`),
    ]);
  } catch (err) {
    console.error("⚠️  Não foi possível buscar dados da API para o sitemap:", err.message);
    console.error("    Gerando sitemap só com as rotas fixas do site.");
  }

  const clubSlugs = new Set(
    articles.map(a => a.club).filter(Boolean).map(toSlug)
  );

  const urls = [
    { loc: `${SITE_URL}/`, changefreq: "hourly", priority: "1.0" },
    { loc: `${SITE_URL}/eredivisie`, changefreq: "daily", priority: "0.8" },
    { loc: `${SITE_URL}/selecao-holandesa`, changefreq: "daily", priority: "0.8" },
    ...categories.map(c => ({
      loc: `${SITE_URL}/categoria/${c.slug}`,
      changefreq: "daily",
      priority: "0.6",
    })),
    ...[...clubSlugs].map(slug => ({
      loc: `${SITE_URL}/time/${slug}`,
      changefreq: "weekly",
      priority: "0.6",
    })),
    ...articles.map(a => ({
      loc: `${SITE_URL}/noticia/${a.slug}`,
      lastmod: (a.updatedAt || a.publishedAt || a.createdAt || "").slice(0, 10) || today,
      changefreq: "monthly",
      priority: "0.7",
    })),
  ];

  const body = urls
    .map(u => {
      const lastmod = u.lastmod || today;
      return [
        "  <url>",
        `    <loc>${xmlEscape(u.loc)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${u.changefreq}</changefreq>`,
        `    <priority>${u.priority}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, xml, "utf-8");

  console.log(`✓ sitemap.xml gerado com ${urls.length} URLs em ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error("Erro fatal ao gerar sitemap:", err);
  process.exit(1);
});
