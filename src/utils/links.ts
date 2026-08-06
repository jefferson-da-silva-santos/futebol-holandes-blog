// src/utils/links.ts
//
// Resolve, de forma definitiva, se um "path" salvo num item de menu deve
// navegar via SPA (<Link>/<NavLink>, sem reload) ou como link realmente
// externo (<a target="_blank">).
//
// Contexto do bug original: itens de menu criados pelo usuário foram salvos
// como URL ABSOLUTA do próprio domínio (ex: "https://futebolholandes.blog.br/fc-twente"),
// e a checagem antiga (`/^https?:\/\//.test(path)`) tratava qualquer URL
// absoluta como link externo — inclusive as que apontavam pro próprio site.
// Isso fazia o clique recarregar a página inteira em vez de trocar de rota
// via React Router.
//
// A correção age em duas frentes complementares:
//   1) Aqui (renderização): qualquer URL cujo host seja o do próprio site é
//      tratada como interna, não importa a origem do dado — mesmo que o path
//      em si esteja "torto" (ex: "/fc-twente" em vez de "/time/fc-twente").
//   2) No admin (MenuSection) e no script de correção do banco: o path em si
//      é normalizado para um formato de rota válido do projeto.
import { SITE_BASE_URL } from "../config";

const OWN_HOSTS = (() => {
  try {
    const host = new URL(SITE_BASE_URL).hostname;
    return new Set([host, `www.${host}`]);
  } catch {
    return new Set<string>();
  }
})();

const BASE_PATHS = new Set(["/", "/eredivisie", "/selecao-holandesa"]);

/** Verifica se um pathname bate com alguma rota real definida em <Routes> do App.tsx. */
export function isKnownRoute(pathname: string): boolean {
  if (BASE_PATHS.has(pathname)) return true;
  if (/^\/categoria\/[^/]+$/.test(pathname)) return true;
  if (/^\/time\/[^/]+$/.test(pathname)) return true;
  if (/^\/noticia\/[^/]+$/.test(pathname)) return true;
  return false;
}

export interface ResolvedLink {
  /** true = deve navegar via <Link>/<NavLink> (SPA, sem reload) */
  internal: boolean;
  /** path relativo pronto para usar em `to=` (quando internal) */
  to: string;
}

export function resolveLink(path: string): ResolvedLink {
  if (!path) return { internal: true, to: "/" };

  // Já é relativo (ex: "/eredivisie", "/categoria/ajax") — sempre interno.
  if (!/^https?:\/\//.test(path)) return { internal: true, to: path };

  // URL absoluta: só é interna se o host bater com o do próprio site.
  try {
    const url = new URL(path);
    if (OWN_HOSTS.has(url.hostname)) {
      const to = `${url.pathname}${url.search}${url.hash}` || "/";
      return { internal: true, to };
    }
  } catch {
    // URL malformada — trata como externa (o <a> vai simplesmente falhar
    // ao abrir, mas não quebra a navegação interna do site).
  }

  return { internal: false, to: path };
}