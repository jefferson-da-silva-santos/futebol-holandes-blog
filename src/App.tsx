import { useState, useEffect, useRef, useCallback, createContext, useContext, type ReactNode } from "react";
import { Routes, Route, Link, NavLink, useNavigate, useParams, Outlet } from "react-router-dom";
import {
  articlesApi, standingsApi, convocationApi, fixturesApi, nationsApi,
  scorersApi, configApi, menuApi, normalizeArticle,
  type Article, type Standing, type Convocation, type Fixture,
  type NationsGroup, type TopScorer, type SiteConfig, type MenuItem,
} from "./api";
import { useToast, ToastProvider } from "./utils/toast";
import { resolveLink } from "./utils/links";
import { useArticlesPage } from "./hooks/useArticlesPage";
import PaginationBar from "./components/PaginationBar";
import Admin from "./Admin";

// ═════════════════════════════════════════════════════════════════════════════
//  DATA CONTEXT — carrega tudo uma vez e compartilha entre as páginas
//  IMPORTANTE: `articles` foi REMOVIDO deste contexto de propósito. Antes,
//  a lista global era buscada uma única vez com `limit: 50` e todas as
//  páginas recortavam essa mesma lista (slice). Isso fazia com que qualquer
//  artigo além dos ~23 primeiros nunca aparecesse em lugar nenhum do site,
//  não importa quantos artigos novos fossem publicados. Agora cada página
//  busca exatamente os artigos que precisa, paginados de verdade.
// ═════════════════════════════════════════════════════════════════════════════
interface DataContextValue {
  standing: Standing | null;
  nations: NationsGroup | null;
  scorers: TopScorer[];
  convocation: Convocation | null;
  fixtures: Fixture[];
  config: SiteConfig;
  menu: MenuItem[];
  loading: boolean;
  reload: () => Promise<void>;
}
const DataContext = createContext<DataContextValue | null>(null);

function DataProvider({ children }: { children: ReactNode }) {
  const [standing, setStanding] = useState<Standing | null>(null);
  const [nations, setNations] = useState<NationsGroup | null>(null);
  const [scorers, setScorers] = useState<TopScorer[]>([]);
  const [convocation, setConvocation] = useState<Convocation | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [config, setConfig] = useState<SiteConfig>({});
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const notyf = useToast();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [st, nat, sc, conv, fix, cfg, mnu] = await Promise.all([
        standingsApi.get(), nationsApi.get(), scorersApi.list(),
        convocationApi.get(), fixturesApi.list(), configApi.get(), menuApi.get(),
      ]);
      setStanding(st); setNations(nat); setScorers(sc);
      setConvocation(conv); setFixtures(fix); setConfig(cfg); setMenu(mnu);
    } catch {
      notyf.error("Erro ao carregar dados. Verifique a conexão com a API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <DataContext.Provider value={{ standing, nations, scorers, convocation, fixtures, config, menu, loading, reload }}>
      {children}
    </DataContext.Provider>
  );
}

function useSiteData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useSiteData deve ser usado dentro de <DataProvider>");
  return ctx;
}

// ═════════════════════════════════════════════════════════════════════════════
//  LIGHTBOX — modal de visualização de imagem
// ═════════════════════════════════════════════════════════════════════════════
interface LightboxData { src: string; alt: string; }

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Fechar">
        <i className="bx bx-x" />
      </button>
      <img
        src={src}
        alt={alt}
        className="lightbox-img"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  WIDGETS
// ═════════════════════════════════════════════════════════════════════════════
function StandingsWidget({ standing }: { standing: Standing | null }) {
  if (!standing) return null;
  return (
    <div className="widget">
      <div className="widget-head"><i className="bx bxs-trophy widget-head-icon" /><span>{standing.title}</span></div>
      <div className="widget-table-wrap">
        <table className="wtable">
          <thead><tr><th>#</th><th className="tl">Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Pts</th></tr></thead>
          <tbody>
            {standing.entries.map(r => (
              <tr key={r.id} className={r.champion ? "row-champ" : r.relegation ? "row-rel" : ""}>
                <td className={`pos ${r.clSpot ? "cl" : r.elSpot ? "el" : r.relegation ? "rd" : ""}`}>{r.position}</td>
                <td className="tname tl">{r.team}{r.champion && " 🏆"}</td>
                <td>{r.played}</td><td>{r.wins}</td><td>{r.draws}</td><td>{r.losses}</td>
                <td className={r.goalDiff.startsWith("+") ? "pos-sg" : "neg-sg"}>{r.goalDiff}</td>
                <td className="pts">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {standing.footer && <p className="widget-foot">{standing.footer}</p>}
    </div>
  );
}

function NationsWidget({ nations }: { nations: NationsGroup | null }) {
  if (!nations) return null;
  return (
    <div className="widget">
      <div className="widget-head"><i className="bx bx-flag widget-head-icon" /><span>{nations.title}</span></div>
      <div className="widget-table-wrap">
        <table className="wtable">
          <thead><tr><th>#</th><th className="tl">Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>Pts</th></tr></thead>
          <tbody>
            {nations.entries.map(r => (
              <tr key={r.id} className={r.highlight ? "row-champ" : ""}>
                <td className={`pos ${r.position === 1 ? "cl" : ""}`}>{r.position}</td>
                <td className="tname tl">{r.team}{r.highlight && " 🇳🇱"}</td>
                <td>{r.played}</td><td>{r.wins}</td><td>{r.draws}</td><td>{r.losses}</td>
                <td className="pts">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nations.footer && <p className="widget-foot">{nations.footer}</p>}
    </div>
  );
}

function ScorersWidget({ scorers }: { scorers: TopScorer[] }) {
  if (!scorers.length) return null;
  return (
    <div className="widget">
      <div className="widget-head"><i className="bx bxs-star widget-head-icon" /><span>Artilheiros Históricos</span></div>
      <div className="scorers">
        {scorers.map(s => (
          <div key={s.id} className="scorer-row">
            <span className={`sc-rank${s.rank === 1 ? " sc-gold" : s.rank === 2 ? " sc-silver" : s.rank === 3 ? " sc-bronze" : ""}`}>{s.rank}</span>
            <span className="sc-name">{s.name}</span>
            <span className="sc-goals">{s.goals} <i className="bx bx-football" /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArticleCard({ article, onClick }: { article: Article; onClick: () => void }) {
  return (
    <article className="news-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onClick()}>
      <div className="news-thumb"><img src={article.image} alt={article.title} className="thumb-img" /></div>
      <div className="news-info">
        <h3 className="news-title">{article.title}</h3>
        <p className="news-date"><i className="bx bx-calendar" /> {article.date}</p>
      </div>
    </article>
  );
}

function HeroCard({ article, size, onClick }: { article: Article; size: "large" | "small"; onClick: () => void }) {
  return (
    <article className={`hero-${size}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onClick()}>
      <img src={article.image} alt={article.title} className="hero-img" />
      <div className="hero-overlay" />
      <div className="hero-body">
        {size === "large"
          ? <h2 className="hero-title">{article.title}</h2>
          : <h3 className="hero-sub-title">{article.title}</h3>}
        <p className="hero-meta"><i className="bx bx-time-five" /> {article.meta}</p>
      </div>
    </article>
  );
}

// ─── Skeleton primitivos ─────────────────────────────────────────────────────
function Sk({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`sk ${className}`} style={style} />;
}

function SkSectionHead() {
  return (
    <div className="sk-section-head">
      <Sk className="sk-label" />
    </div>
  );
}

function SkHeroLarge() {
  return (
    <div className="sk-hero-large">
      <Sk className="sk-fill" />
      <div className="sk-hero-overlay">
        <Sk className="sk-badge" />
        <Sk className="sk-hero-title" />
        <Sk className="sk-hero-meta" />
      </div>
    </div>
  );
}

function SkHeroSmall() {
  return (
    <div className="sk-hero-small">
      <Sk className="sk-fill" />
      <div className="sk-hero-overlay">
        <Sk className="sk-badge sk-badge-sm" />
        <Sk className="sk-hero-title sk-hero-title-sm" />
        <Sk className="sk-hero-meta" />
      </div>
    </div>
  );
}

function SkCard() {
  return (
    <div className="sk-card">
      <Sk className="sk-card-thumb" />
      <div className="sk-card-body">
        <Sk className="sk-card-cat" />
        <Sk className="sk-card-title" />
        <Sk className="sk-card-title sk-card-title-short" />
        <Sk className="sk-card-date" />
      </div>
    </div>
  );
}

function SkWidget() {
  return (
    <div className="sk-widget">
      <div className="sk-widget-head">
        <Sk className="sk-widget-icon" />
        <Sk className="sk-widget-title" />
      </div>
      <div className="sk-widget-rows">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="sk-widget-row">
            <Sk className="sk-wr-pos" />
            <Sk className="sk-wr-name" />
            <Sk className="sk-wr-num" />
            <Sk className="sk-wr-num" />
            <Sk className="sk-wr-num" />
            <Sk className="sk-wr-pts" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkArticlePage() {
  return (
    <div className="article-layout">
      <main className="main">
        <div className="sk-art-hero"><Sk className="sk-fill" /></div>
        <div className="sk-art-card">
          <div className="sk-art-badges"><Sk className="sk-badge" /></div>
          <Sk className="sk-art-title" />
          <Sk className="sk-art-title sk-art-title-short" />
          <div className="sk-art-meta"><Sk className="sk-art-meta-item" /><Sk className="sk-art-meta-item" /></div>
          <div className="sk-art-body">
            {[100, 90, 95, 80, 100, 75, 88].map((w, i) => <Sk key={i} style={{ width: `${w}%`, height: "16px", marginBottom: "0.6rem" }} />)}
          </div>
        </div>
      </main>
      <aside className="sidebar">
        <SkWidget />
      </aside>
    </div>
  );
}

function PageSkeleton({ variant = "home" }: { variant?: "home" | "eredivisie" | "selecao" | "article" }) {
  if (variant === "article") return <SkArticlePage />;

  return (
    <div className="layout-grid">
      <main className="main">
        <SkSectionHead />
        <div className="sk-hero-grid">
          <SkHeroLarge />
          <div className="sk-hero-sub">
            <SkHeroSmall />
            <SkHeroSmall />
          </div>
        </div>
        <SkSectionHead />
        <div className="news-grid">
          <SkCard /><SkCard /><SkCard />
        </div>
      </main>
      <aside className="sidebar">
        <SkWidget />
        {variant === "home" && <SkWidget />}
      </aside>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  PÁGINAS
// ═════════════════════════════════════════════════════════════════════════════
function HomePage() {
  const { standing, nations } = useSiteData();
  const navigate = useNavigate();

  // Destaques: busca própria e independente, sempre os 3 mais recentes
  // marcados como featured — não depende mais da lista geral.
  const [highlights, setHighlights] = useState<Article[]>([]);
  const [highlightsLoaded, setHighlightsLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    articlesApi.list({ published: true, featured: true, limit: 3, page: 1 })
      .then(res => { if (alive) setHighlights(res.articles.map(normalizeArticle)); })
      .catch(() => { if (alive) setHighlights([]); })
      .finally(() => { if (alive) setHighlightsLoaded(true); });
    return () => { alive = false; };
  }, []);

  // Grade "Mais Notícias": paginada de verdade via API.
  const { articles: gridArticles, page, pages, loading: gridLoading, goToPage } = useArticlesPage({ limit: 12 });

  // Na primeira página, evita repetir nos dois blocos um artigo que já
  // apareceu nos Destaques.
  const highlightIds = new Set(highlights.map(h => h.id));
  const moreNews = page > 1 ? gridArticles : gridArticles.filter(a => !highlightIds.has(a.id));

  const openArticle = (slug: string) => navigate(`/noticia/${slug}`);

  if (!highlightsLoaded && gridLoading) return <PageSkeleton variant="home" />;

  return (
    <div className="layout-grid">
      <main className="main">
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bxs-star" /> Destaques</span></div>
          {highlights.length > 0 ? (
            <div className="hero-grid">
              <HeroCard article={highlights[0]} size="large" onClick={() => openArticle(highlights[0].slug)} />
              {highlights.length > 1 && (
                <div className="hero-sub">
                  {highlights.slice(1).map(h => <HeroCard key={h.id} article={h} size="small" onClick={() => openArticle(h.slug)} />)}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state"><i className="bx bx-news" /><p>Nenhum artigo publicado ainda.</p></div>
          )}
        </section>

        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bx-news" /> Mais Notícias</span></div>
          {gridLoading ? (
            <div className="news-grid"><SkCard /><SkCard /><SkCard /></div>
          ) : moreNews.length > 0 ? (
            <>
              <div className="news-grid">{moreNews.map(n => <ArticleCard key={n.id} article={n} onClick={() => openArticle(n.slug)} />)}</div>
              <PaginationBar page={page} pages={pages} onChange={goToPage} />
            </>
          ) : (
            <div className="empty-state"><i className="bx bx-news" /><p>Nenhuma notícia encontrada.</p></div>
          )}
        </section>
      </main>
      <aside className="sidebar">
        <StandingsWidget standing={standing} />
        <NationsWidget nations={nations} />
      </aside>
    </div>
  );
}

function EredivisieePage() {
  const { standing, config } = useSiteData();
  const navigate = useNavigate();
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    articlesApi.list({ published: true, category: "Eredivisie", limit: 50 })
      .then(res => { if (alive) setNews(res.articles.map(normalizeArticle)); })
      .catch(() => { if (alive) setNews([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const openArticle = (slug: string) => navigate(`/noticia/${slug}`);

  if (loading) return <PageSkeleton variant="eredivisie" />;

  return (
    <div className="layout-grid">
      <main className="main">
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bxs-trophy" /> {standing?.title || "Eredivisie"}</span></div>
          {config.eredivisie_intro && (
            <p className="page-intro" dangerouslySetInnerHTML={{ __html: config.eredivisie_intro.replace(/PSV Eindhoven/g, "<strong>PSV Eindhoven</strong>") }} />
          )}
        </section>
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bx-news" /> Notícias</span></div>
          {news.length > 0
            ? <div className="news-grid">{news.map(n => <ArticleCard key={n.id} article={n} onClick={() => openArticle(n.slug)} />)}</div>
            : <div className="empty-state"><i className="bx bx-news" /><p>Nenhuma notícia da Eredivisie.</p></div>}
        </section>
        {standing && (
          <section className="page-section">
            <div className="sec-head"><span className="sec-label"><i className="bx bx-bar-chart-alt-2" /> Classificação Final</span></div>
            <div className="table-wrap">
              <table className="full-table">
                <thead><tr><th>#</th><th className="tl">Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Pts</th></tr></thead>
                <tbody>
                  {standing.entries.map(r => (
                    <tr key={r.id} className={r.champion ? "row-champ" : r.relegation ? "row-rel" : ""}>
                      <td className={`pos ${r.clSpot ? "cl" : r.elSpot ? "el" : r.relegation ? "rd" : ""}`}>{r.position}</td>
                      <td className="tname tl">{r.team}{r.champion && " 🏆"}</td>
                      <td>{r.played}</td><td>{r.wins}</td><td>{r.draws}</td><td>{r.losses}</td>
                      <td className={r.goalDiff.startsWith("+") ? "pos-sg" : "neg-sg"}>{r.goalDiff}</td>
                      <td className="pts">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-legend">
                <span><span className="leg cl" /> Champions League</span>
                <span><span className="leg el" /> Europa League</span>
                <span><span className="leg rd" /> Rebaixamento</span>
              </div>
            </div>
          </section>
        )}
      </main>
      <aside className="sidebar"><StandingsWidget standing={standing} /></aside>
    </div>
  );
}

function SelecaoPage() {
  const { nations, scorers, convocation, fixtures } = useSiteData();
  const navigate = useNavigate();
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    articlesApi.list({ published: true, category: "Seleção Holandesa", limit: 50 })
      .then(res => { if (alive) setNews(res.articles.map(normalizeArticle)); })
      .catch(() => { if (alive) setNews([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const openArticle = (slug: string) => navigate(`/noticia/${slug}`);

  if (loading) return <PageSkeleton variant="selecao" />;

  return (
    <div className="layout-grid">
      <main className="main">
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bx-flag" /> Seleção Holandesa</span></div>
          {news.map(n => <HeroCard key={n.id} article={n} size="large" onClick={() => openArticle(n.slug)} />)}
        </section>

        {convocation && convocation.groups.length > 0 && (
          <section className="page-section">
            <div className="sec-head"><span className="sec-label"><i className="bx bxs-group" /> {convocation.title}</span></div>
            <div className="conv-grid">
              {convocation.groups.map(g => (
                <div key={g.id} className="conv-group">
                  <h4 className="conv-pos"><i className="bx bx-chevron-right" /> {g.position}</h4>
                  <ul>{g.players.map(j => <li key={j}><i className="bx bx-user" /> {j}</li>)}</ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {fixtures.length > 0 && (
          <section className="page-section">
            <div className="sec-head"><span className="sec-label"><i className="bx bx-calendar-event" /> Próximos Jogos</span></div>
            <div className="fixtures">
              {fixtures.map(f => (
                <div key={f.id} className="fixture">
                  <div className="fx-date"><span className="fx-day">{f.day}</span><span className="fx-month">{f.month}</span></div>
                  <div className="fx-mid">
                    <span className="fx-comp"><i className="bx bx-trophy" /> {f.competition}</span>
                    <div className="fx-teams">
                      <span className={f.homeTeam === "Holanda" ? "fx-team hl" : "fx-team"}>{f.homeTeam}</span>
                      <span className="fx-vs">vs</span>
                      <span className={f.awayTeam === "Holanda" ? "fx-team hl" : "fx-team"}>{f.awayTeam}</span>
                    </div>
                  </div>
                  <div className="fx-time"><i className="bx bx-time" /> {f.time}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <aside className="sidebar">
        <NationsWidget nations={nations} />
        <ScorersWidget scorers={scorers} />
      </aside>
    </div>
  );
}

// Renderiza o corpo do artigo, ativa embeds do Twitter/Instagram e abre o lightbox ao clicar em imagens
function ArticleBody({
  bodyHtml, body, onImageClick,
}: {
  bodyHtml: string;
  body: string[];
  onImageClick: (img: LightboxData) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Lightbox — depende de onImageClick
  useEffect(() => {
    if (!bodyHtml || !ref.current) return;
    const container = ref.current;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" && target.classList.contains("re-img")) {
        const img = target as HTMLImageElement;
        onImageClick({ src: img.currentSrc || img.src, alt: img.alt || "" });
      }
    }
    container.addEventListener("click", handleClick);
    return () => { container.removeEventListener("click", handleClick); };
  }, [bodyHtml, onImageClick]);

  // Embeds Twitter/Instagram — depende só do bodyHtml
  useEffect(() => {
    if (!bodyHtml || !ref.current) return;
    const container = ref.current;

    // Twitter/X
    const tweetDivs = container.querySelectorAll<HTMLElement>("[data-tweet-url]");
    if (tweetDivs.length > 0) {
      tweetDivs.forEach(el => {
        const url = el.getAttribute("data-tweet-url");
        if (!url) return;
        // O widgets.js do Twitter/X não renderiza embeds cujo link usa o domínio
        // "x.com" — só funciona com "twitter.com". Sem essa conversão, o embed
        // fica preso indefinidamente no estado de "carregando".
        const twitterUrl = url.replace(
          /^https?:\/\/(www\.)?x\.com/i,
          "https://twitter.com"
        );
        // Sempre reconstrói para garantir que o widget processe
        el.innerHTML = "";
        const bq = document.createElement("blockquote");
        bq.className = "twitter-tweet";
        bq.setAttribute("data-lang", "pt");
        bq.setAttribute("data-dnt", "true");
        bq.setAttribute("data-theme", "light");
        const a = document.createElement("a");
        a.href = twitterUrl;
        a.textContent = twitterUrl;
        bq.appendChild(a);
        el.appendChild(bq);
      });

      // Padrão oficial do X for Websites (twttr.ready). Usar apenas o
      // evento "onload" do <script> não é confiável: ele dispara assim que
      // o arquivo termina de baixar, mas o objeto twttr.widgets às vezes
      // ainda não terminou de se inicializar internamente naquele instante,
      // fazendo o twttr.widgets.load() falhar silenciosamente (sem erro no
      // console, sem o tweet aparecer). twttr.ready() enfileira o callback
      // e só o executa quando o widget está de fato pronto para uso.
      const win = window as any;
      win.twttr = (function (d: Document, s: string, id: string) {
        let js: HTMLScriptElement;
        const fjs = d.getElementsByTagName(s)[0];
        const t = win.twttr || {};
        if (d.getElementById(id)) return t;
        js = d.createElement(s) as HTMLScriptElement;
        js.id = id;
        js.async = true;
        js.charset = "utf-8";
        js.src = "https://platform.twitter.com/widgets.js";
        fjs.parentNode?.insertBefore(js, fjs);
        t._e = [];
        t.ready = function (f: (twttr: any) => void) { t._e.push(f); };
        return t;
      })(document, "script", "twitter-wjs");

      win.twttr.ready((twttr: any) => {
        twttr.widgets.load(container);
      });
    }

    // Instagram
    const igDivs = container.querySelectorAll<HTMLElement>("[data-instagram-url]");
    if (igDivs.length > 0) {
      igDivs.forEach(el => {
        const url = el.getAttribute("data-instagram-url");
        if (!url) return;
        el.innerHTML = "";
        const bq = document.createElement("blockquote");
        bq.className = "instagram-media";
        bq.setAttribute("data-instgrm-captioned", "");
        bq.setAttribute("data-instgrm-permalink", url);
        bq.setAttribute("data-instgrm-version", "14");
        bq.style.margin = "0 auto";
        el.appendChild(bq);
      });
      const win = window as any;
      if (win.instgrm?.Embeds?.process) {
        win.instgrm.Embeds.process();
      } else {
        const scriptId = "instagram-wjs";
        if (!document.getElementById(scriptId)) {
          const s = document.createElement("script");
          s.id = scriptId;
          s.src = "https://www.instagram.com/embed.js";
          s.async = true;
          s.onload = () => { (window as any).instgrm?.Embeds?.process(); };
          document.body.appendChild(s);
        }
      }
    }
  }, [bodyHtml]);

  if (bodyHtml) {
    return (
      <div className="art-body">
        <div ref={ref} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </div>
    );
  }
  return (
    <div className="art-body">
      {body.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { standing, nations } = useSiteData();
  const navigate = useNavigate();

  // Busca o artigo diretamente pelo slug — não depende mais de uma lista
  // global limitada, então artigos "fora dos primeiros N" continuam
  // abrindo normalmente mesmo que não apareçam nas grades.
  // undefined = carregando · null = não encontrado · Article = carregado
  const [article, setArticle] = useState<Article | null | undefined>(undefined);
  const [related, setRelated] = useState<Article[]>([]);
  const [lightbox, setLightbox] = useState<LightboxData | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!slug) { setArticle(null); return; }
    let alive = true;
    setArticle(undefined);
    articlesApi.get(slug)
      .then(a => { if (alive) setArticle(normalizeArticle(a)); })
      .catch(() => { if (alive) setArticle(null); });
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    if (!article) { setRelated([]); return; }
    const firstCat = article.categories[0]?.slug;
    if (!firstCat) { setRelated([]); return; }
    let alive = true;
    articlesApi.list({ published: true, category: firstCat, limit: 4 })
      .then(res => {
        if (!alive) return;
        const list = res.articles.map(normalizeArticle).filter(a => a.id !== article.id).slice(0, 2);
        setRelated(list);
      })
      .catch(() => { if (alive) setRelated([]); });
    return () => { alive = false; };
  }, [article]);

  if (article === undefined) return <PageSkeleton variant="article" />;

  if (!article) {
    return (
      <div className="layout-grid">
        <main className="main">
          <div className="empty-state">
            <i className="bx bx-error-circle" />
            <p>Artigo não encontrado.</p>
            <button className="back-btn" onClick={() => navigate("/")}><i className="bx bx-arrow-back" /> Voltar ao início</button>
          </div>
        </main>
      </div>
    );
  }

  // bodyHtml para novos artigos, body legado para artigos antigos
  const rawText = article.bodyHtml
    ? article.bodyHtml.replace(/<[^>]+>/g, " ")
    : article.body.join(" ");
  const readTime = Math.max(1, Math.ceil(rawText.split(" ").filter(Boolean).length / 200));

  return (
    <div className="article-layout">
      <main className="main">
        <nav className="breadcrumb">
          <button className="bread-link" onClick={() => navigate("/")}><i className="bx bx-home-alt" /> Início</button>
          <i className="bx bx-chevron-right bread-sep" />
          <span className="bread-current">{article.categories.map(c => c.name).join(" · ")}</span>
        </nav>
        <div className="art-hero-img">
          <img
            src={article.image}
            alt={article.title}
            onClick={() => setLightbox({ src: article.image, alt: article.title })}
          />
          <div className="art-hero-gradient" />
        </div>
        <article className="art-card">
          <header className="art-header">
            <div className="art-badges">
              {article.categories.map(cat => (
                <span key={cat.id} className={`badge ${cat.badgeClass}`} style={{ background: cat.color }}>{cat.name}</span>
              ))}
              {article.club && <span className="badge badge-grey">{article.club}</span>}
            </div>
            <h1 className="art-title">{article.title}</h1>
            <div className="art-meta-row">
              <span className="art-meta-item"><i className="bx bx-calendar" /> {article.date}</span>
              <span className="art-meta-item"><i className="bx bx-time-five" /> {readTime} min de leitura</span>
            </div>
          </header>
          <ArticleBody bodyHtml={article.bodyHtml} body={article.body} onImageClick={setLightbox} />
          <footer className="art-footer">
            <div className="art-tags">
              {article.tags.map(t => <span key={t} className="art-tag"><i className="bx bx-hash" />{t}</span>)}
            </div>
            <button className="back-btn" onClick={() => navigate(-1)}><i className="bx bx-arrow-back" /> Voltar</button>
          </footer>
        </article>
        {related.length > 0 && (
          <section className="related-section">
            <div className="sec-head"><span className="sec-label"><i className="bx bx-news" /> Relacionadas</span></div>
            <div className={`news-grid cols-${related.length}`}>
              {related.map(n => <ArticleCard key={n.id} article={n} onClick={() => navigate(`/noticia/${n.slug}`)} />)}
            </div>
          </section>
        )}
      </main>
      <aside className="sidebar">
        <StandingsWidget standing={standing} />
        <NationsWidget nations={nations} />
      </aside>

      {lightbox && (
        <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  CATEGORY PAGE — agora paginada de verdade e alimentada pelo menu via SPA
// ═════════════════════════════════════════════════════════════════════════════
function CategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { standing, nations } = useSiteData();
  const navigate = useNavigate();

  const { articles, page, pages, loading, goToPage } = useArticlesPage({
    category: categorySlug,
    limit: 12,
  });

  const [realName, setRealName] = useState(
    categorySlug ? decodeURIComponent(categorySlug.replace(/-/g, " ")) : ""
  );

  useEffect(() => {
    const cat = articles.flatMap(a => a.categories).find(c => c.slug === categorySlug);
    if (cat) setRealName(cat.name);
  }, [articles, categorySlug]);

  const openArticle = (slug: string) => navigate(`/noticia/${slug}`);

  if (loading && articles.length === 0) return <PageSkeleton />;

  return (
    <div className="layout-grid">
      <main className="main">
        <section className="page-section">
          <div className="sec-head">
            <span className="sec-label">
              <i className="bx bx-purchase-tag" /> {realName}
            </span>
          </div>
          {articles.length > 0 ? (
            <>
              <div className="news-grid">
                {articles.map(n => <ArticleCard key={n.id} article={n} onClick={() => openArticle(n.slug)} />)}
              </div>
              <PaginationBar page={page} pages={pages} onChange={goToPage} />
            </>
          ) : (
            <div className="empty-state">
              <i className="bx bx-news" />
              <p>Nenhuma notícia encontrada para esta categoria.</p>
            </div>
          )}
        </section>
      </main>
      <aside className="sidebar">
        <StandingsWidget standing={standing} />
        <NationsWidget nations={nations} />
      </aside>
    </div>
  );
}

// Filtra notícias por clube/time (usado pelos itens de menu de "Eredivisie")
function TeamPage() {
  const { clubSlug } = useParams<{ clubSlug: string }>();
  const { standing, nations } = useSiteData();
  const navigate = useNavigate();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [realClub, setRealClub] = useState(
    clubSlug ? decodeURIComponent(clubSlug.replace(/-/g, " ")) : ""
  );

  function toSlug(str: string) {
    return str.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim().replace(/\s+/g, "-");
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // A API não filtra por clube diretamente; busca um lote amplo de
    // publicados e filtra no cliente. Suficiente para o volume atual do
    // site — se crescer muito, dá para expor `?club=` na API depois.
    articlesApi.list({ published: true, limit: 200 })
      .then(res => {
        if (!alive) return;
        const all = res.articles.map(normalizeArticle);
        const slug = (clubSlug ?? "").toLowerCase();
        const filtered = all.filter(a => a.club && toSlug(a.club) === slug);
        setArticles(filtered);
        if (filtered[0]?.club) setRealClub(filtered[0].club);
      })
      .catch(() => { if (alive) setArticles([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [clubSlug]);

  const openArticle = (s: string) => navigate(`/noticia/${s}`);

  if (loading) return <PageSkeleton />;

  return (
    <div className="layout-grid">
      <main className="main">
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bx-football" /> {realClub}</span></div>
          {articles.length > 0 ? (
            <div className="news-grid">
              {articles.map(n => <ArticleCard key={n.id} article={n} onClick={() => openArticle(n.slug)} />)}
            </div>
          ) : (
            <div className="empty-state">
              <i className="bx bx-news" />
              <p>Nenhuma notícia encontrada para este time.</p>
            </div>
          )}
        </section>
      </main>
      <aside className="sidebar">
        <StandingsWidget standing={standing} />
        <NationsWidget nations={nations} />
      </aside>
    </div>
  );
}

function Layout() {
  const { config, menu } = useSiteData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) { setOpenDropdownId(null); setMenuOpen(false); }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const siteName = config.site_name || "Futebol Holandês";
  const siteSub = config.site_sub || "tudo sobre o futebol da Holanda";
  const footerTag = config.site_tagline || "Tudo sobre o futebol da Holanda em português";
  const footerCopy = config.footer_copy || "© 2026 Futebol Holandês · Todos os direitos reservados";

  function closeMenus() { setMenuOpen(false); setOpenDropdownId(null); }

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="logo-btn" onClick={closeMenus}>
            <img src="logo.png" alt={siteName} className="logo-img" />
            <div className="logo-text">
              <span className="logo-title">{siteName}</span>
              <span className="logo-sub">{siteSub}</span>
            </div>
          </Link>
          <div className="topbar-right">
            <span className="topbar-date"><i className="bx bx-calendar" /> {today}</span>
            <button className="adm-trigger-btn" onClick={() => navigate("/admin")} title="Painel Admin">
              <i className="bx bxs-dashboard" />
            </button>
          </div>
        </div>
      </div>

      <nav className="navbar" ref={navRef}>
        <div className="nav-inner">
          <div className="nav-links">
            {menu.map(item => {
              const hasChildren = item.children && item.children.length > 0;

              if (hasChildren) {
                return (
                  <div className="nav-dropdown" key={item.id}>
                    <button className="nav-btn" onClick={() => setOpenDropdownId(o => o === item.id ? null : item.id)}>
                      <i className={item.icon} /> {item.label}
                      <i className={`bx ${openDropdownId === item.id ? "bx-chevron-up" : "bx-chevron-down"} chevron-icon`} />
                    </button>
                    {openDropdownId === item.id && (
                      <div className="dropdown">
                        {item.children.map(child => {
                          // Resolução DEFINITIVA: qualquer link que aponte pro
                          // próprio domínio navega via <Link> (SPA, sem reload),
                          // mesmo que tenha sido salvo como URL absoluta ou com
                          // formato antigo. Só links de outros sites viram <a>.
                          const { internal, to } = resolveLink(child.path);
                          return internal ? (
                            <Link key={child.id} to={to} onClick={closeMenus}>
                              <i className={child.icon} /> {child.label}
                            </Link>
                          ) : (
                            <a key={child.id} href={child.path} target="_blank" rel="noreferrer" onClick={closeMenus}>
                              <i className={child.icon} /> {child.label}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const { internal, to } = resolveLink(item.path);
              return internal ? (
                <NavLink
                  key={item.id}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) => `nav-btn${isActive ? " nav-active" : ""}`}
                  onClick={closeMenus}
                >
                  <i className={item.icon} /> {item.label}
                </NavLink>
              ) : (
                <a key={item.id} href={item.path} target="_blank" rel="noreferrer" className="nav-btn" onClick={closeMenus}>
                  <i className={item.icon} /> {item.label}
                </a>
              );
            })}
          </div>
          <button className="hamburger" onClick={() => { setMenuOpen(o => !o); setOpenDropdownId(null); }} aria-label="Menu">
            <i className={`bx ${menuOpen ? "bx-x" : "bx-menu"}`} />
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-drawer">
            {menu.map(item => {
              const hasChildren = item.children && item.children.length > 0;

              if (hasChildren) {
                return (
                  <div key={item.id}>
                    <span className="mob-link" style={{ opacity: 0.6, cursor: "default" }}><i className={item.icon} /> {item.label}</span>
                    {item.children.map(child => {
                      const { internal, to } = resolveLink(child.path);
                      return internal ? (
                        <NavLink
                          key={child.id}
                          to={to}
                          className={({ isActive }) => `mob-link${isActive ? " mob-active" : ""}`}
                          style={{ paddingLeft: "2.5rem" }}
                          onClick={closeMenus}
                        >
                          <i className={child.icon} /> {child.label}
                        </NavLink>
                      ) : (
                        <a key={child.id} href={child.path} target="_blank" rel="noreferrer" className="mob-link" style={{ paddingLeft: "2.5rem" }} onClick={closeMenus}>
                          <i className={child.icon} /> {child.label}
                        </a>
                      );
                    })}
                  </div>
                );
              }

              const { internal, to } = resolveLink(item.path);
              return internal ? (
                <NavLink
                  key={item.id}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) => `mob-link${isActive ? " mob-active" : ""}`}
                  onClick={closeMenus}
                >
                  <i className={item.icon} /> {item.label}
                </NavLink>
              ) : (
                <a key={item.id} href={item.path} target="_blank" rel="noreferrer" className="mob-link" onClick={closeMenus}>
                  <i className={item.icon} /> {item.label}
                </a>
              );
            })}
            <button className="mob-link" onClick={() => { closeMenus(); navigate("/admin"); }}><i className="bx bxs-dashboard" /> Painel Admin</button>
          </div>
        )}
      </nav>

      <div className="container">
        <Outlet />
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <img src="logo.png" alt={siteName} className="footer-logo-img" />
          <p className="footer-title">{siteName}</p>
          <p className="footer-tagline">{footerTag}</p>
          <p className="footer-copy">{footerCopy}</p>
        </div>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  ROOT APP — Rotas em português
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <Routes>
          <Route path="/admin/*" element={<Admin />} />
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/eredivisie" element={<EredivisieePage />} />
            <Route path="/selecao-holandesa" element={<SelecaoPage />} />
            <Route path="/noticia/:slug" element={<ArticlePage />} />
            <Route path="/categoria/:categorySlug" element={<CategoryPage />} />
            <Route path="/time/:clubSlug" element={<TeamPage />} />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </DataProvider>
    </ToastProvider>
  );
}