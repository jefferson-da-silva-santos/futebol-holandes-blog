import { useState, useEffect, useRef, useCallback } from "react";
import { articlesApi, normalizeArticle, type Article } from "./api";
import { useNotyf } from "./useNotyf";
import Admin from "./Admin";

// ─── Static data ──────────────────────────────────────────────────────────────
const STANDINGS = [
  { pos: 1, team:"PSV Eindhoven",  champion:true,  j:34,v:22,e:5,d:7, sg:"+46",pts:71 },
  { pos: 2, team:"Feyenoord",                      j:34,v:19,e:4,d:11,sg:"+22",pts:61 },
  { pos: 3, team:"NEC Nijmegen",                   j:34,v:17,e:5,d:12,sg:"+10",pts:56 },
  { pos: 4, team:"Ajax",                           j:34,v:16,e:7,d:11,sg:"+16",pts:55 },
  { pos: 5, team:"FC Twente",                      j:34,v:16,e:7,d:11,sg:"+9", pts:55 },
  { pos: 6, team:"AZ Alkmaar",                     j:34,v:14,e:8,d:12,sg:"+8", pts:50 },
  { pos: 7, team:"Heerenveen",                     j:34,v:14,e:8,d:12,sg:"+3", pts:50 },
  { pos: 8, team:"Go Ahead Eagles",                j:34,v:13,e:6,d:15,sg:"-8", pts:45 },
  { pos: 9, team:"Sparta Rotterdam",               j:34,v:12,e:8,d:14,sg:"-5", pts:44 },
  { pos:10, team:"FC Utrecht",                     j:34,v:11,e:9,d:14,sg:"-4", pts:42 },
  { pos:11, team:"Fortuna Sittard",                j:34,v:11,e:7,d:16,sg:"-14",pts:40 },
  { pos:12, team:"NAC Breda",                      j:34,v:10,e:9,d:15,sg:"-12",pts:39 },
  { pos:13, team:"Heracles",                       j:34,v:10,e:8,d:16,sg:"-16",pts:38 },
  { pos:14, team:"Groningen",                      j:34,v:9, e:9,d:16,sg:"-18",pts:36 },
  { pos:15, team:"Telstar",                        j:34,v:9, e:7,d:18,sg:"-26",pts:34 },
  { pos:16, team:"Zwolle",       relegation:true,  j:34,v:8, e:8,d:18,sg:"-25",pts:32 },
  { pos:17, team:"Excelsior",    relegation:true,  j:34,v:6, e:8,d:20,sg:"-35",pts:26 },
  { pos:18, team:"Volendam",     relegation:true,  j:34,v:4, e:6,d:24,sg:"-50",pts:18 },
];
const NL_GROUP = [
  {pos:1,team:"Holanda", j:6,v:4,e:1,d:1,pts:13,highlight:true},
  {pos:2,team:"Alemanha",j:6,v:3,e:3,d:0,pts:12},
  {pos:3,team:"Hungria", j:6,v:1,e:2,d:3,pts:5 },
  {pos:4,team:"Bósnia",  j:6,v:0,e:1,d:5,pts:1 },
];
const CONVOCADOS = [
  {pos:"Goleiros",      jogadores:["Bart Verbruggen (Brighton)","Mark Flekken (Brentford)","Justin Bijlow (Feyenoord)"]},
  {pos:"Defensores",    jogadores:["Virgil van Dijk (Liverpool)","Nathan Aké (Man. City)","Jurriën Timber (Arsenal)","Denzel Dumfries (Inter)","Daley Blind (Girona)"]},
  {pos:"Meio-campistas",jogadores:["Frenkie de Jong (Barcelona)","Teun Koopmeiners (Juventus)","Tijjani Reijnders (AC Milan)","Ryan Gravenberch (Liverpool)"]},
  {pos:"Atacantes",     jogadores:["Cody Gakpo (Liverpool)","Memphis Depay (Corinthians)","Donyell Malen (B. Dortmund)","Xavi Simons (PSG)"]},
];
const FIXTURES = [
  {date:"5",  month:"set 2026",comp:"Nations League",home:"Holanda",away:"Alemanha",time:"20h45"},
  {date:"8",  month:"set 2026",comp:"Nations League",home:"Bélgica", away:"Holanda", time:"18h00"},
  {date:"11", month:"out 2026",comp:"Nations League",home:"Holanda",away:"França",  time:"20h45"},
  {date:"14", month:"out 2026",comp:"Nations League",home:"Holanda",away:"Portugal",time:"20h45"},
];

// ─── Widgets ──────────────────────────────────────────────────────────────────
function StandingsWidget() {
  return (
    <div className="widget">
      <div className="widget-head"><i className="bx bxs-trophy widget-head-icon"/><span>Eredivisie 2025-26</span></div>
      <div className="widget-table-wrap">
        <table className="wtable">
          <thead><tr><th>#</th><th className="tl">Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Pts</th></tr></thead>
          <tbody>
            {STANDINGS.map(r=>(
              <tr key={r.pos} className={r.champion?"row-champ":r.relegation?"row-rel":""}>
                <td className={`pos ${r.pos<=2?"cl":r.pos<=5?"el":r.relegation?"rd":""}`}>{r.pos}</td>
                <td className="tname tl">{r.team}{r.champion&&" 🏆"}</td>
                <td>{r.j}</td><td>{r.v}</td><td>{r.e}</td><td>{r.d}</td>
                <td className={r.sg.startsWith("+")?"pos-sg":"neg-sg"}>{r.sg}</td>
                <td className="pts">{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="widget-foot">Temporada encerrada · Campeão: PSV 🏆</p>
    </div>
  );
}

function NationsWidget() {
  return (
    <div className="widget">
      <div className="widget-head"><i className="bx bx-flag widget-head-icon"/><span>Nations League — Grupo 3A</span></div>
      <div className="widget-table-wrap">
        <table className="wtable">
          <thead><tr><th>#</th><th className="tl">Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>Pts</th></tr></thead>
          <tbody>
            {NL_GROUP.map(r=>(
              <tr key={r.pos} className={r.highlight?"row-champ":""}>
                <td className={`pos ${r.pos===1?"cl":""}`}>{r.pos}</td>
                <td className="tname tl">{r.team}{r.highlight&&" 🇳🇱"}</td>
                <td>{r.j}</td><td>{r.v}</td><td>{r.e}</td><td>{r.d}</td>
                <td className="pts">{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="widget-foot">Grupo 3 · Liga A</p>
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────
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

// ─── Hero Card ────────────────────────────────────────────────────────────────
function HeroCard({article,size,onClick}:{article:Article;size:"large"|"small";onClick:()=>void}) {
  return (
    <article className={`hero-${size}`} onClick={onClick} role="button" tabIndex={0} onKeyDown={e=>e.key==="Enter"&&onClick()}>
      <img src={article.image} alt={article.title} className="hero-img"/>
      <div className="hero-overlay"/>
      <div className="hero-body">
        <span className={`badge ${article.category.badgeClass}`}>{article.category.name}</span>
        {size==="large"
          ?<h2 className="hero-title">{article.title}</h2>
          :<h3 className="hero-sub-title">{article.title}</h3>}
        <p className="hero-meta"><i className="bx bx-time-five"/> {article.meta}</p>
      </div>
    </article>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
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

// ─── Article Page ─────────────────────────────────────────────────────────────
function ArticlePage({article,articles,onBack,onOpen}:{article:Article;articles:Article[];onBack:()=>void;onOpen:(a:Article)=>void}) {
  useEffect(()=>{window.scrollTo({top:0,behavior:"smooth"});},[]);
  const related = articles.filter(a=>a.id!==article.id&&a.category.id===article.category.id).slice(0,2);
  const readTime = Math.max(1, Math.ceil(article.body.join(" ").split(" ").length/200));
  return (
    <div className="article-layout">
      <main className="main">
        <nav className="breadcrumb">
          <button className="bread-link" onClick={onBack}><i className="bx bx-home-alt"/> Início</button>
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
              <span className={`badge ${article.category.badgeClass}`}>{article.category.name}</span>
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
            <button className="back-btn" onClick={onBack}><i className="bx bx-arrow-back"/> Voltar</button>
          </footer>
        </article>
        {related.length>0&&(
          <section className="related-section">
            <div className="sec-head"><span className="sec-label"><i className="bx bx-news"/> Relacionadas</span></div>
            <div className={`news-grid cols-${related.length}`}>
              {related.map(n=><ArticleCard key={n.id} article={n} onClick={()=>onOpen(n)}/>)}
            </div>
          </section>
        )}
      </main>
      <aside className="sidebar"><StandingsWidget/><NationsWidget/></aside>
    </div>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────
function HomePage({articles,onOpen}:{articles:Article[];onOpen:(a:Article)=>void}) {
  const highlights = articles.filter(a=>a.published).slice(0,3);
  const moreNews   = articles.filter(a=>a.published).slice(3,6);
  return (
    <div className="layout-grid">
      <main className="main">
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bxs-star"/> Destaques</span></div>
          {highlights.length>0?(
            <div className="hero-grid">
              <HeroCard article={highlights[0]} size="large" onClick={()=>onOpen(highlights[0])}/>
              {highlights.length>1&&(
                <div className="hero-sub">
                  {highlights.slice(1).map(h=><HeroCard key={h.id} article={h} size="small" onClick={()=>onOpen(h)}/>)}
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
            <div className="news-grid">{moreNews.map(n=><ArticleCard key={n.id} article={n} onClick={()=>onOpen(n)}/>)}</div>
          </section>
        )}
      </main>
      <aside className="sidebar"><StandingsWidget/><NationsWidget/></aside>
    </div>
  );
}

function EredivisieePage({articles,onOpen}:{articles:Article[];onOpen:(a:Article)=>void}) {
  const news = articles.filter(a=>a.category.name==="Eredivisie"&&a.published);
  return (
    <div className="layout-grid">
      <main className="main">
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bxs-trophy"/> Eredivisie 2025-26</span></div>
          <p className="page-intro">A temporada 2025-26 foi encerrada com o <strong>PSV Eindhoven</strong> conquistando seu 27º título nacional com 71 pontos, liderando a competição de ponta a ponta.</p>
        </section>
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bx-news"/> Notícias</span></div>
          {news.length>0
            ?<div className="news-grid">{news.map(n=><ArticleCard key={n.id} article={n} onClick={()=>onOpen(n)}/>)}</div>
            :<div className="empty-state"><i className="bx bx-news"/><p>Nenhuma notícia da Eredivisie.</p></div>}
        </section>
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bx-bar-chart-alt-2"/> Classificação Final</span></div>
          <div className="table-wrap">
            <table className="full-table">
              <thead><tr><th>#</th><th className="tl">Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Pts</th></tr></thead>
              <tbody>
                {STANDINGS.map(r=>(
                  <tr key={r.pos} className={r.champion?"row-champ":r.relegation?"row-rel":""}>
                    <td className={`pos ${r.pos<=2?"cl":r.pos<=5?"el":r.relegation?"rd":""}`}>{r.pos}</td>
                    <td className="tname tl">{r.team}{r.champion&&" 🏆"}</td>
                    <td>{r.j}</td><td>{r.v}</td><td>{r.e}</td><td>{r.d}</td>
                    <td className={r.sg.startsWith("+")?"pos-sg":"neg-sg"}>{r.sg}</td>
                    <td className="pts">{r.pts}</td>
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
      </main>
      <aside className="sidebar"><StandingsWidget/></aside>
    </div>
  );
}

function SelecaoPage({articles,onOpen}:{articles:Article[];onOpen:(a:Article)=>void}) {
  const news = articles.filter(a=>a.category.name==="Seleção Holandesa"&&a.published);
  return (
    <div className="layout-grid">
      <main className="main">
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bx-flag"/> Seleção Holandesa</span></div>
          {news.map(n=><HeroCard key={n.id} article={n} size="large" onClick={()=>onOpen(n)}/>)}
        </section>
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bxs-group"/> Última Convocação</span></div>
          <div className="conv-grid">
            {CONVOCADOS.map(g=>(
              <div key={g.pos} className="conv-group">
                <h4 className="conv-pos"><i className="bx bx-chevron-right"/> {g.pos}</h4>
                <ul>{g.jogadores.map(j=><li key={j}><i className="bx bx-user"/> {j}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>
        <section className="page-section">
          <div className="sec-head"><span className="sec-label"><i className="bx bx-calendar-event"/> Próximos Jogos</span></div>
          <div className="fixtures">
            {FIXTURES.map((f,i)=>(
              <div key={i} className="fixture">
                <div className="fx-date"><span className="fx-day">{f.date}</span><span className="fx-month">{f.month}</span></div>
                <div className="fx-mid">
                  <span className="fx-comp"><i className="bx bx-trophy"/> {f.comp}</span>
                  <div className="fx-teams">
                    <span className={f.home==="Holanda"?"fx-team hl":"fx-team"}>{f.home}</span>
                    <span className="fx-vs">vs</span>
                    <span className={f.away==="Holanda"?"fx-team hl":"fx-team"}>{f.away}</span>
                  </div>
                </div>
                <div className="fx-time"><i className="bx bx-time"/> {f.time}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <aside className="sidebar">
        <NationsWidget/>
        <div className="widget">
          <div className="widget-head"><i className="bx bxs-star widget-head-icon"/><span>Artilheiros Históricos</span></div>
          <div className="scorers">
            {[{rank:1,name:"Robin van Persie",goals:50},{rank:2,name:"Memphis Depay",goals:44},{rank:3,name:"Patrick Kluivert",goals:40},{rank:4,name:"Cody Gakpo",goals:22},{rank:5,name:"Wout Weghorst",goals:9}].map(s=>(
              <div key={s.rank} className="scorer-row">
                <span className={`sc-rank${s.rank===1?" sc-gold":s.rank===2?" sc-silver":s.rank===3?" sc-bronze":""}`}>{s.rank}</span>
                <span className="sc-name">{s.name}</span>
                <span className="sc-goals">{s.goals} <i className="bx bx-football"/></span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
type Page = "home"|"eredivisie"|"selecao";

export default function App() {
  const [articles,   setArticles]   = useState<Article[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState<Page>("home");
  const [article,    setArticle]    = useState<Article|null>(null);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [ereOpen,    setEreOpen]    = useState(false);
  const [adminMode,  setAdminMode]  = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const today = new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})
    .format(new Date(2026,5,27));

  const notyf = useNotyf();

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await articlesApi.list({ published: true, limit: 50 });
      setArticles(res.articles.map(normalizeArticle));
    } catch (err: any) {
      notyf.error("Erro ao carregar artigos. Verifique a conexão com a API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setEreOpen(false); setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function nav(p: Page) {
    setPage(p); setArticle(null);
    setMenuOpen(false); setEreOpen(false);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function openArticle(a: Article) { setArticle(a); window.scrollTo({top:0,behavior:"smooth"}); }
  function closeArticle() { setArticle(null); window.scrollTo({top:0,behavior:"smooth"}); }

  function exitAdmin() { loadArticles(); setAdminMode(false); }

  if (adminMode) return <Admin onExit={exitAdmin}/>;

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-inner">
          <button className="logo-btn" onClick={()=>nav("home")}>
            <img src="logo.png" alt="Futebol Holandês" className="logo-img"/>
            <div className="logo-text">
              <span className="logo-title">Futebol Holandês</span>
              <span className="logo-sub">tudo sobre o futebol da Holanda</span>
            </div>
          </button>
          <div className="topbar-right">
            <span className="topbar-date"><i className="bx bx-calendar"/> {today}</span>
            <button className="adm-trigger-btn" onClick={()=>setAdminMode(true)} title="Painel Admin">
              <i className="bx bxs-dashboard"/>
            </button>
          </div>
        </div>
      </div>

      <nav className="navbar" ref={navRef}>
        <div className="nav-inner">
          <div className="nav-links">
            <button className={`nav-btn${page==="home"&&!article?" nav-active":""}`} onClick={()=>nav("home")}>
              <i className="bx bx-home-alt"/> Todas
            </button>
            <div className="nav-dropdown">
              <button className={`nav-btn${page==="eredivisie"&&!article?" nav-active":""}`} onClick={()=>setEreOpen(o=>!o)}>
                <i className="bx bxs-trophy"/> Eredivisie
                <i className={`bx ${ereOpen?"bx-chevron-up":"bx-chevron-down"} chevron-icon`}/>
              </button>
              {ereOpen&&(
                <div className="dropdown">
                  <button onClick={()=>nav("eredivisie")}><i className="bx bx-bar-chart-alt-2"/> Classificação</button>
                  <button onClick={()=>nav("eredivisie")}><i className="bx bx-football"/> Resultados</button>
                  <button onClick={()=>nav("eredivisie")}><i className="bx bx-news"/> Notícias</button>
                </div>
              )}
            </div>
            <button className={`nav-btn${page==="selecao"&&!article?" nav-active":""}`} onClick={()=>nav("selecao")}>
              <i className="bx bx-flag"/> Seleção Holandesa
            </button>
          </div>
          <button className="hamburger" onClick={()=>{setMenuOpen(o=>!o);setEreOpen(false);}} aria-label="Menu">
            <i className={`bx ${menuOpen?"bx-x":"bx-menu"}`}/>
          </button>
        </div>
        {menuOpen&&(
          <div className="mobile-drawer">
            <button className={`mob-link${page==="home"?" mob-active":""}`} onClick={()=>nav("home")}><i className="bx bx-home-alt"/> Todas</button>
            <button className={`mob-link${page==="eredivisie"?" mob-active":""}`} onClick={()=>nav("eredivisie")}><i className="bx bxs-trophy"/> Eredivisie</button>
            <button className={`mob-link${page==="selecao"?" mob-active":""}`} onClick={()=>nav("selecao")}><i className="bx bx-flag"/> Seleção Holandesa</button>
            <button className="mob-link" onClick={()=>setAdminMode(true)}><i className="bx bxs-dashboard"/> Painel Admin</button>
          </div>
        )}
      </nav>

      <div className="container">
        {loading ? <PageSkeleton/> : article
          ? <ArticlePage article={article} articles={articles} onBack={closeArticle} onOpen={openArticle}/>
          : page==="home"       ? <HomePage articles={articles} onOpen={openArticle}/>
          : page==="eredivisie" ? <EredivisieePage articles={articles} onOpen={openArticle}/>
          : <SelecaoPage articles={articles} onOpen={openArticle}/>
        }
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <img src="logo.png" alt="Futebol Holandês" className="footer-logo-img"/>
          <p className="footer-title">Futebol Holandês</p>
          <p className="footer-tagline">Tudo sobre o futebol da Holanda em português</p>
          <p className="footer-copy">© 2026 Futebol Holandês · Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}