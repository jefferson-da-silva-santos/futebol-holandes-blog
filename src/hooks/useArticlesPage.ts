// src/hooks/useArticlesPage.ts
//
// Hook reutilizável de paginação de artigos publicados. Substitui o padrão
// antigo de buscar "os últimos 50 artigos uma vez só" (que escondia
// publicações novas quando a lista crescia além desse teto) por uma busca
// paginada de verdade, direto na API, sincronizada com ?page= na URL.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { articlesApi, normalizeArticle, type Article } from "../api";

interface Filters {
  category?: string;
  club?: string;
  limit?: number;
}

interface UseArticlesPageResult {
  articles: Article[];
  page: number;
  pages: number;
  total: number;
  loading: boolean;
  goToPage: (n: number) => void;
}

export function useArticlesPage(filters: Filters): UseArticlesPageResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const [articles, setArticles] = useState<Article[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = filters.limit ?? 12;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    articlesApi
      .list({ published: true, category: filters.category, page, limit })
      .then(res => {
        if (!alive) return;
        let list = res.articles.map(normalizeArticle);
        // Filtro por clube não existe como parâmetro na API — aplicado no
        // cliente sobre a página retornada (uso pontual em TeamPage).
        if (filters.club) {
          list = list.filter(a => a.club && a.club.toLowerCase() === filters.club!.toLowerCase());
        }
        setArticles(list);
        setPages(res.pagination.pages || 1);
        setTotal(res.pagination.total || 0);
      })
      .catch(() => {
        if (!alive) return;
        setArticles([]);
        setPages(1);
        setTotal(0);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.club, page, limit]);

  function goToPage(n: number) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (n <= 1) next.delete("page");
      else next.set("page", String(n));
      return next;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return { articles, page, pages, total, loading, goToPage };
}