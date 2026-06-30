import { useState, useEffect, useRef, useCallback, createContext, useContext, type ReactNode } from "react";
import { Routes, Route, Link, NavLink, useNavigate, useParams, Outlet } from "react-router-dom";
import {
  articlesApi, standingsApi, convocationApi, fixturesApi, nationsApi,
  scorersApi, configApi, normalizeArticle,
  type Article, type Standing, type Convocation, type Fixture,
  type NationsGroup, type TopScorer, type SiteConfig,
} from "./api";
import { useNotyf } from "./useNotyf";
import Admin from "./Admin";

// ═════════════════════════════════════════════════════════════════════════════
//  DATA CONTEXT — carrega tudo uma vez e compartilha entre as páginas
// ═════════════════════════════════════════════════════════════════════════════
interface DataContextValue {
  articles: Article[];
  standing: Standing | null;
  nations: NationsGroup | null;
  scorers: TopScorer[];
  convocation: Convocation | null;
  fixtures: Fixture[];
  config: SiteConfig;
  loading: boolean;
  reload: () => Promise<void>;
}
const DataContext = createContext<DataContextValue | null>(null);

function DataProvider({ children }: { children: ReactNode }) {
  const [articles,    setArticles]    = useState<Article[]>([]);
  const [standing,    setStanding]    = useState<Standing | null>(null);
  const [nations,     setNations]     = useState<NationsGroup | null>(null);
  const [scorers,     setScorers]     = useState<TopScorer[]>([]);
  const [convocation, setConvocation] = useState<Convocation | null>(null);
  const [fixtures,    setFixtures]    = useState<Fixture[]>([]);
  const [config,      setConfig]      = useState<SiteConfig>({});
  const [loading,     setLoading]     = useState(true);
  const notyf = useNotyf();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [artRes, st, nat, sc, conv, fix, cfg] = await Promise.all([
        articlesApi.list({ published: true, limit: 50 }),
        standingsApi.get(), nationsApi.get(), scorersApi.list(),
        convocationApi.get(), fixturesApi.list(), configApi.get(),
      ]);
      setArticles(artRes.articles.map(normalizeArticle));
      setStanding(st); setNations(nat); setScorers(sc);
      setConvocation(conv); setFixtures(fix); setConfig(cfg);
    } catch {
      notyf.error("Erro ao carregar dados. Verifique a conexão com a API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <DataContext.Provider value={{ articles, standing, nations, scorers, convocation, fixtures, config, loading, reload }}>
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
//  WIDGETS
// ═════════════════════════════════════════════════════════════════════════════
function StandingsWidget({ standing }: { standing: Standing | null }) {
  if (!standing) return null;
  return (
    <div className="widget">
      <div className="widget-head"><i className="bx bxs-trophy widget-head-icon"/><span>{standing.title}</span></div>
      <div className="widget-table-wrap">
        <table className="wtable">
          <thead><tr><th>#</th><th className="tl">Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Pts</th></tr></thead>
          <tbody>
            {standing.entries.map(r=>(
              <tr key={r.id} className={r.champion?"row-champ":r.relegation?"row-rel":""}>
                <td className={`pos ${r.clSpot?"cl":r.elSpot?"el":r.relegation?"rd":""}`}>{r.position}</td>
                <td className="tname tl">{r.team}{r.champion&&" 🏆"}</td>
                <td>{r.played}</td><td>{r.wins}</td><td>{r.draws}</td><td>{r.losses}</td>
                <td className={r.goalDiff.startsWith("+")?"pos-sg":"neg-sg"}>{r.goalDiff}</td>
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
      <div className="widget-head"><i className="bx bx-flag widget-head-icon"/><span>{nations.title}</span></div>
      <div className="widget-table-wrap">
        <table className="wtable">
          <thead><tr><th>#</th><th className="tl">Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>Pts</th></tr></thead>
          <tbody>
            {nations.entries.map(r=>(
              <tr key={r.id} className={r.highlight?"row-champ":""}>
                <td className={`pos ${r.position===1?"cl":""}`}>{r.position}</td>
                <td className="tname tl">{r.team}{r.highlight&&" 🇳🇱"}</td>
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
      <div className="widget-head"><i className="bx bxs-star widget-head-icon"/><span>Artilheiros Históricos</span></div>
      <div className="scorers">
        {scorers.map(s=>(
          <div key={s.id} className="scorer-row">
            <span className={`sc-rank${s.rank===1?" sc-gold":s.rank===2?" sc-silver":s.rank===3?" sc-bronze":""}`}>{s.rank}</span>
            <span className="sc-name">{s.name}</span>
            <span className="sc-goals">{s.goals} <i className="bx bx-football"/></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArticleCard({article,onClick}:{article:Article;onClick:()=>void}) {
  return (
    <article className="news-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&onClick()}>
      <div className="news-thumb"><img src={article.image} alt={article.title} className="thumb-img"/></div>
      <div className="news-info">
        <p className="news-cat">
          <span className="cat-text">{article.category.name}</span>
          {article.club&&<><span className="dot">·</span><span className="club-text">{article.club}</span></>}
        </p>
        <h3 className="news-title">{article.title}</h3>
        <p className="news-date"><i className="bx bx-calendar"/> {article.date}</p>
      </div>
    </article>
  );
}

function HeroCard({article,size,onClick}:{article:Article;size:"large"|"small";onClick:()=>void}) {
  return (
    <article className={`hero-${size}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&onClick()}>
      <img src={article.image} alt={article.title} className="hero-img"/>
      <div className="hero-overlay"/>
      <div className="hero-body">
        <span className={`badge ${article.category.badgeClass}`} style={{background: article.category.color}}>{article.category.name}</span>
        {size==="large"
          ?<h2 className="hero-title">{article.title}</h2>
          :<h3 className="hero-sub-title">{article.title}</h3>}
        <p className="hero-meta"><i className="bx bx-time-five"/> {article.meta}</p>
      </div>
    </article>
  );
}

function PageSkeleton() {
  return (
    <div className="layout-grid">
      <main className="main">
        <div className="skeleton-hero-grid">
          <div className="skeleton skeleton-hero-large"/>
          <div className="skeleton-hero-sub">
            <div className="skeleton skeleton-hero-small"/>
            <div className="skeleton skeleton-hero-small"/>
          </div>
        </div>
        <div className="news-grid" style={{marginTop:"1.5rem"}}>
          {[1,2,3].map(i=><div key={i} className="skeleton skeleton-card"/>)}
        </div>
      </main>
      <aside className="sidebar"><div className="skeleton skeleton-widget"/></aside>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  PÁGINAS
// ═════════════════════════════════════════════════════════════════════════════
function HomePage() {
  const { articles, standing, nations, loading } = useSiteData();
  const navigate = useNavigate();
  if (loading) return <PageSkeleton/>;

  const published  = articles.filter(a=>a.published);
  const highlights = published.slice(0,3);
  const moreNews   = published.slice(3,6);
  const openArticle = (slug:string) => navigate(`/noticia/${slug}`);

  return (
    <div className="layout-grid">
      <main className="main">
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bxs-star"/> Destaques</span></div>
          {highlights.length>0?(
            <div className="hero-grid">
              <HeroCard article={highlights[0]} size="large" onClick={()=>openArticle(highlights[0].slug)}/>
              {highlights.length>1&&(
                <div className="hero-sub">
                  {highlights.slice(1).map(h=><HeroCard key={h.id} article={h} size="small" onClick={()=>openArticle(h.slug)}/>)}
                </div>
              )}
            </div>
          ):(
            <div className="empty-state"><i className="bx bx-news"/><p>Nenhum artigo publicado ainda.</p></div>
          )}
        </section>
        {moreNews.length>0&&(
          <section className="page-section">
            <div className="sec-head"><span className="sec-label"><i className="bx bx-news"/> Mais Notícias</span></div>
            <div className="news-grid">{moreNews.map(n=><ArticleCard key={n.id} article={n} onClick={()=>openArticle(n.slug)}/>)}</div>
          </section>
        )}
      </main>
      <aside className="sidebar">
        <StandingsWidget standing={standing}/>
        <NationsWidget nations={nations}/>
      </aside>
    </div>
  );
}

function EredivisieePage() {
  const { articles, standing, config, loading } = useSiteData();
  const navigate = useNavigate();
  if (loading) return <PageSkeleton/>;

  const news = articles.filter(a=>a.category.name==="Eredivisie"&&a.published);
  const openArticle = (slug:string) => navigate(`/noticia/${slug}`);

  return (
    <div className="layout-grid">
      <main className="main">
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bxs-trophy"/> {standing?.title||"Eredivisie"}</span></div>
          {config.eredivisie_intro && (
            <p className="page-intro" dangerouslySetInnerHTML={{__html: config.eredivisie_intro.replace(/PSV Eindhoven/g,"<strong>PSV Eindhoven</strong>")}}/>
          )}
        </section>
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bx-news"/> Notícias</span></div>
          {news.length>0
            ?<div className="news-grid">{news.map(n=><ArticleCard key={n.id} article={n} onClick={()=>openArticle(n.slug)}/>)}</div>
            :<div className="empty-state"><i className="bx bx-news"/><p>Nenhuma notícia da Eredivisie.</p></div>}
        </section>
        {standing && (
          <section className="page-section">
            <div className="sec-head"><span className="sec-label"><i className="bx bx-bar-chart-alt-2"/> Classificação Final</span></div>
            <div className="table-wrap">
              <table className="full-table">
                <thead><tr><th>#</th><th className="tl">Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Pts</th></tr></thead>
                <tbody>
                  {standing.entries.map(r=>(
                    <tr key={r.id} className={r.champion?"row-champ":r.relegation?"row-rel":""}>
                      <td className={`pos ${r.clSpot?"cl":r.elSpot?"el":r.relegation?"rd":""}`}>{r.position}</td>
                      <td className="tname tl">{r.team}{r.champion&&" 🏆"}</td>
                      <td>{r.played}</td><td>{r.wins}</td><td>{r.draws}</td><td>{r.losses}</td>
                      <td className={r.goalDiff.startsWith("+")?"pos-sg":"neg-sg"}>{r.goalDiff}</td>
                      <td className="pts">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-legend">
                <span><span className="leg cl"/> Champions League</span>
                <span><span className="leg el"/> Europa League</span>
                <span><span className="leg rd"/> Rebaixamento</span>
              </div>
            </div>
          </section>
        )}
      </main>
      <aside className="sidebar"><StandingsWidget standing={standing}/></aside>
    </div>
  );
}

function SelecaoPage() {
  const { articles, nations, scorers, convocation, fixtures, loading } = useSiteData();
  const navigate = useNavigate();
  if (loading) return <PageSkeleton/>;

  const news = articles.filter(a=>a.category.name==="Seleção Holandesa"&&a.published);
  const openArticle = (slug:string) => navigate(`/noticia/${slug}`);

  return (
    <div className="layout-grid">
      <main className="main">
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bx-flag"/> Seleção Holandesa</span></div>
          {news.map(n=><HeroCard key={n.id} article={n} size="large" onClick={()=>openArticle(n.slug)}/>)}
        </section>

        {convocation && convocation.groups.length > 0 && (
          <section className="page-section">
            <div className="sec-head"><span className="sec-label"><i className="bx bxs-group"/> {convocation.title}</span></div>
            <div className="conv-grid">
              {convocation.groups.map(g=>(
                <div key={g.id} className="conv-group">
                  <h4 className="conv-pos"><i className="bx bx-chevron-right"/> {g.position}</h4>
                  <ul>{g.players.map(j=><li key={j}><i className="bx bx-user"/> {j}</li>)}</ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {fixtures.length > 0 && (
          <section className="page-section">
            <div className="sec-head"><span className="sec-label"><i className="bx bx-calendar-event"/> Próximos Jogos</span></div>
            <div className="fixtures">
              {fixtures.map(f=>(
                <div key={f.id} className="fixture">
                  <div className="fx-date"><span className="fx-day">{f.day}</span><span className="fx-month">{f.month}</span></div>
                  <div className="fx-mid">
                    <span className="fx-comp"><i className="bx bx-trophy"/> {f.competition}</span>
                    <div className="fx-teams">
                      <span className={f.homeTeam==="Holanda"?"fx-team hl":"fx-team"}>{f.homeTeam}</span>
                      <span className="fx-vs">vs</span>
                      <span className={f.awayTeam==="Holanda"?"fx-team hl":"fx-team"}>{f.awayTeam}</span>
                    </div>
                  </div>
                  <div className="fx-time"><i className="bx bx-time"/> {f.time}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <aside className="sidebar">
        <NationsWidget nations={nations}/>
        <ScorersWidget scorers={scorers}/>
      </aside>
    </div>
  );
}

function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { articles, standing, nations, loading } = useSiteData();
  const navigate = useNavigate();
  const article = articles.find(a => a.slug === slug);

  useEffect(()=>{ window.scrollTo({top:0,behavior:"smooth"}); },[slug]);

  if (loading) return <PageSkeleton/>;

  if (!article) {
    return (
      <div className="layout-grid">
        <main className="main">
          <div className="empty-state">
            <i className="bx bx-error-circle"/>
            <p>Artigo não encontrado.</p>
            <button className="back-btn" onClick={()=>navigate("/")}><i className="bx bx-arrow-back"/> Voltar ao início</button>
          </div>
        </main>
      </div>
    );
  }

  const related = articles.filter(a=>a.id!==article.id&&a.category.id===article.category.id).slice(0,2);
  const readTime = Math.max(1, Math.ceil(article.body.join(" ").split(" ").length/200));

  return (
    <div className="article-layout">
      <main className="main">
        <nav className="breadcrumb">
          <button className="bread-link" onClick={()=>navigate("/")}><i className="bx bx-home-alt"/> Início</button>
          <i className="bx bx-chevron-right bread-sep"/>
          <span className="bread-current">{article.category.name}</span>
        </nav>
        <div className="art-hero-img">
          <img src={article.image} alt={article.title}/>
          <div className="art-hero-gradient"/>
        </div>
        <article className="art-card">
          <header className="art-header">
            <div className="art-badges">
              <span className={`badge ${article.category.badgeClass}`} style={{background: article.category.color}}>{article.category.name}</span>
              {article.club&&<span className="badge badge-grey">{article.club}</span>}
            </div>
            <h1 className="art-title">{article.title}</h1>
            <div className="art-meta-row">
              <span className="art-meta-item"><i className="bx bx-calendar"/> {article.date}</span>
              <span className="art-meta-item"><i className="bx bx-time-five"/> {readTime} min de leitura</span>
            </div>
          </header>
          <div className="art-body">{article.body.map((p,i)=><p key={i}>{p}</p>)}</div>
          <footer className="art-footer">
            <div className="art-tags">
              {article.tags.map(t=><span key={t} className="art-tag"><i className="bx bx-hash"/>{t}</span>)}
            </div>
            <button className="back-btn" onClick={()=>navigate(-1)}><i className="bx bx-arrow-back"/> Voltar</button>
          </footer>
        </article>
        {related.length>0&&(
          <section className="related-section">
            <div className="sec-head"><span className="sec-label"><i className="bx bx-news"/> Relacionadas</span></div>
            <div className={`news-grid cols-${related.length}`}>
              {related.map(n=><ArticleCard key={n.id} article={n} onClick={()=>navigate(`/noticia/${n.slug}`)}/>)}
            </div>
          </section>
        )}
      </main>
      <aside className="sidebar">
        <StandingsWidget standing={standing}/>
        <NationsWidget nations={nations}/>
      </aside>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  LAYOUT (topbar + navbar + footer compartilhados)
// ═════════════════════════════════════════════════════════════════════════════
function Layout() {
  const { config } = useSiteData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ereOpen,  setEreOpen]  = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const today = new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());

  useEffect(()=>{
    function handler(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) { setEreOpen(false); setMenuOpen(false); }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  },[]);

  const siteName   = config.site_name    || "Futebol Holandês";
  const siteSub    = config.site_sub     || "tudo sobre o futebol da Holanda";
  const footerTag  = config.site_tagline || "Tudo sobre o futebol da Holanda em português";
  const footerCopy = config.footer_copy  || "© 2026 Futebol Holandês · Todos os direitos reservados";

  function closeMenus(){ setMenuOpen(false); setEreOpen(false); }

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="logo-btn" onClick={closeMenus}>
            <img src="logo.png" alt={siteName} className="logo-img"/>
            <div className="logo-text">
              <span className="logo-title">{siteName}</span>
              <span className="logo-sub">{siteSub}</span>
            </div>
          </Link>
          <div className="topbar-right">
            <span className="topbar-date"><i className="bx bx-calendar"/> {today}</span>
            <button className="adm-trigger-btn" onClick={()=>navigate("/admin")} title="Painel Admin">
              <i className="bx bxs-dashboard"/>
            </button>
          </div>
        </div>
      </div>

      <nav className="navbar" ref={navRef}>
        <div className="nav-inner">
          <div className="nav-links">
            <NavLink to="/" end className={({isActive})=>`nav-btn${isActive?" nav-active":""}`} onClick={closeMenus}>
              <i className="bx bx-home-alt"/> Todas
            </NavLink>
            <div className="nav-dropdown">
              <button className="nav-btn" onClick={()=>setEreOpen(o=>!o)}>
                <i className="bx bxs-trophy"/> Eredivisie
                <i className={`bx ${ereOpen?"bx-chevron-up":"bx-chevron-down"} chevron-icon`}/>
              </button>
              {ereOpen&&(
                <div className="dropdown">
                  <Link to="/eredivisie" onClick={closeMenus}><i className="bx bx-bar-chart-alt-2"/> Classificação</Link>
                  <Link to="/eredivisie" onClick={closeMenus}><i className="bx bx-football"/> Resultados</Link>
                  <Link to="/eredivisie" onClick={closeMenus}><i className="bx bx-news"/> Notícias</Link>
                </div>
              )}
            </div>
            <NavLink to="/selecao-holandesa" className={({isActive})=>`nav-btn${isActive?" nav-active":""}`} onClick={closeMenus}>
              <i className="bx bx-flag"/> Seleção Holandesa
            </NavLink>
          </div>
          <button className="hamburger" onClick={()=>{setMenuOpen(o=>!o);setEreOpen(false);}} aria-label="Menu">
            <i className={`bx ${menuOpen?"bx-x":"bx-menu"}`}/>
          </button>
        </div>
        {menuOpen&&(
          <div className="mobile-drawer">
            <NavLink to="/" end className={({isActive})=>`mob-link${isActive?" mob-active":""}`} onClick={closeMenus}><i className="bx bx-home-alt"/> Todas</NavLink>
            <NavLink to="/eredivisie" className={({isActive})=>`mob-link${isActive?" mob-active":""}`} onClick={closeMenus}><i className="bx bxs-trophy"/> Eredivisie</NavLink>
            <NavLink to="/selecao-holandesa" className={({isActive})=>`mob-link${isActive?" mob-active":""}`} onClick={closeMenus}><i className="bx bx-flag"/> Seleção Holandesa</NavLink>
            <button className="mob-link" onClick={()=>{closeMenus();navigate("/admin");}}><i className="bx bxs-dashboard"/> Painel Admin</button>
          </div>
        )}
      </nav>

      <div className="container">
        <Outlet/>
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <img src="logo.png" alt={siteName} className="footer-logo-img"/>
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
    <DataProvider>
      <Routes>
        <Route path="/admin/*" element={<Admin/>}/>
        <Route element={<Layout/>}>
          <Route path="/" element={<HomePage/>}/>
          <Route path="/eredivisie" element={<EredivisieePage/>}/>
          <Route path="/selecao-holandesa" element={<SelecaoPage/>}/>
          <Route path="/noticia/:slug" element={<ArticlePage/>}/>
          <Route path="*" element={<HomePage/>}/>
        </Route>
      </Routes>
    </DataProvider>
  );
}