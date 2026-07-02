import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useNotyf } from "./useNotyf";
import { useLocalStorage } from "./hooks/useLocalStorage";
import ColorPicker from "./components/ColorPicker";
import RichEditor from "./components/RichEditorProps";
import {
  authApi, articlesApi, categoriesApi, standingsApi, convocationApi,
  fixturesApi, nationsApi, scorersApi, configApi, menuApi, normalizeArticle, auth,
  type Article, type Category, type ArticleInput, type AdminUser,
  type StandingEntry, type Fixture,
  type NationsEntry, type SiteConfig, type MenuItem, type MenuItemInput,
} from "./api";

const ICONS: { cls: string; label: string }[] = [
  { cls:"bx bxs-trophy",        label:"Troféu"        },
  { cls:"bx bxs-medal",         label:"Medalha"       },
  { cls:"bx bx-football",       label:"Bola"          },
  { cls:"bx bx-flag",           label:"Bandeira"      },
  { cls:"bx bxs-user-badge",    label:"Treinador"     },
  { cls:"bx bx-building-house", label:"Estádio"       },
  { cls:"bx bx-news",           label:"Notícia"       },
  { cls:"bx bxs-star",          label:"Destaque"      },
  { cls:"bx bxs-group",         label:"Seleção"       },
  { cls:"bx bx-calendar-event", label:"Calendário"    },
  { cls:"bx bx-time",           label:"Relógio"       },
  { cls:"bx bx-transfer",       label:"Transferência" },
  { cls:"bx bxs-bar-chart-alt-2",label:"Estatísticas"},
  { cls:"bx bx-money",          label:"Dinheiro"      },
  { cls:"bx bxs-heart",         label:"Favorito"      },
  { cls:"bx bx-camera",         label:"Foto"          },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ConfirmModal({ msg, onConfirm, onCancel, loading }: { msg:string; onConfirm:()=>void; onCancel:()=>void; loading?:boolean; }) {
  return (
    <div className="adm-modal-backdrop" onClick={onCancel}>
      <div className="adm-modal" onClick={e=>e.stopPropagation()}>
        <div className="adm-modal-icon"><i className="bx bx-error-circle"/></div>
        <p className="adm-modal-msg">{msg}</p>
        <div className="adm-modal-actions">
          <button className="adm-btn adm-btn-ghost" onClick={onCancel} disabled={loading}>Cancelar</button>
          <button className="adm-btn adm-btn-danger" onClick={onConfirm} disabled={loading}>
            {loading?<i className="bx bx-loader-alt bx-spin"/>:"Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin:(u:AdminUser)=>void }) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [showPass,setShowPass]=useState(false);
  const notyf=useNotyf();

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault(); if(loading) return;
    if(!email.trim()||!password.trim()){setError("Preencha e-mail e senha.");return;}
    setLoading(true); setError("");
    try { const res=await authApi.login(email.trim(),password); notyf.success("Login realizado!"); onLogin(res.admin); }
    catch(err:any){ setError(err.message??"Credenciais inválidas."); }
    finally{setLoading(false);}
  }
  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo"><img src="logo.png" alt="FH"/></div>
        <h1 className="login-title">Painel Administrativo</h1>
        <p className="login-sub">Futebol Holandês — acesso restrito</p>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className={`adm-field ${error?"has-error":""}`}>
            <label>E-mail</label>
            <div className="login-input-wrap">
              <i className="bx bx-envelope login-input-icon"/>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@exemplo.com" autoComplete="email" disabled={loading}/>
            </div>
          </div>
          <div className={`adm-field ${error?"has-error":""}`}>
            <label>Senha</label>
            <div className="login-input-wrap">
              <i className="bx bx-lock-alt login-input-icon"/>
              <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" disabled={loading}/>
              <button type="button" className="login-eye" onClick={()=>setShowPass(s=>!s)} tabIndex={-1}><i className={`bx ${showPass?"bx-hide":"bx-show"}`}/></button>
            </div>
          </div>
          {error&&<div className="login-error"><i className="bx bx-x-circle"/> {error}</div>}
          <button type="submit" className="adm-btn adm-btn-primary login-submit" disabled={loading}>
            {loading?<><i className="bx bx-loader-alt bx-spin"/> Entrando...</>:<><i className="bx bx-log-in"/> Entrar</>}
          </button>
        </form>
        <p className="login-hint"><i className="bx bx-info-circle"/> Primeiro acesso? Use <code>POST /setup</code> para criar o admin.</p>
      </div>
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ onClose, onSuccess }: { onClose:()=>void; onSuccess:()=>void }) {
  const [current,setCurrent]=useState(""); const [next,setNext]=useState(""); const [confirm,setConfirm]=useState("");
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault();
    if(!current||!next||!confirm){setError("Preencha todos os campos.");return;}
    if(next.length<8){setError("Mínimo 8 caracteres.");return;}
    if(next!==confirm){setError("As senhas não coincidem.");return;}
    setLoading(true); setError("");
    try{await authApi.changePassword(current,next); onSuccess();}
    catch(err:any){setError(err.message);}
    finally{setLoading(false);}
  }
  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal adm-modal-wide" onClick={e=>e.stopPropagation()}>
        <h3 className="adm-modal-title"><i className="bx bx-lock-alt"/> Alterar Senha</h3>
        <form className="cp-form" onSubmit={handleSubmit} noValidate>
          {(["Senha atual","Nova senha","Confirmar nova senha"] as const).map((label,i)=>{
            const vals=[current,next,confirm]; const setters=[setCurrent,setNext,setConfirm];
            return (<div key={label} className="adm-field"><label>{label}</label><input type="password" value={vals[i]} onChange={e=>setters[i](e.target.value)} disabled={loading}/></div>);
          })}
          {error&&<div className="login-error"><i className="bx bx-x-circle"/> {error}</div>}
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn adm-btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={loading}>
              {loading?<i className="bx bx-loader-alt bx-spin"/>:<><i className="bx bx-save"/> Salvar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Article Form ─────────────────────────────────────────────────────────────
function ArticleForm({ initial, categories, onSave, onCancel, saving }: {
  initial?:Article; categories:Category[];
  onSave:(d:ArticleInput)=>Promise<void>; onCancel:()=>void; saving:boolean;
}) {
  // Estado principal do formulário
  const [form, setForm] = useState<ArticleInput>(() =>
    initial
      ? {
          title: initial.title, meta: initial.meta, date: initial.date, image: initial.image,
          icon: initial.icon, club: initial.club ?? "", tags: initial.tags,
          body: initial.body, bodyHtml: initial.bodyHtml ?? "",
          imageSource: "url" as const,
          published: initial.published, featured: initial.featured ?? false,
          categoryId: initial.category.id,
        }
      : {
          title: "", meta: "", date: "", image: "", icon: "bx bxs-trophy", club: "",
          tags: [], body: [], bodyHtml: "",
          imageSource: "url" as const,
          published: true, featured: false, categoryId: categories[0]?.id ?? 0,
        }
  );
  const [tagInput, setTagInput] = useState(initial?.tags.join(", ") ?? "");
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [editorExpanded, setEditorExpanded] = useState(false);

  function set<K extends keyof ArticleInput>(k: K, v: ArticleInput[K]) {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title  = "Obrigatório";
    if (!form.date.trim())  e.date   = "Obrigatório";
    if (!form.meta.trim())  e.meta   = "Obrigatório";
    if (!form.image.trim()) e.image  = "Obrigatório";
    if (!form.categoryId)   e.cat    = "Selecione uma categoria";
    if (!form.bodyHtml || form.bodyHtml === "<p></p>" || form.bodyHtml.trim() === "")
                            e.body   = "Escreva o conteúdo do artigo";
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    await onSave({
      ...form,
      tags: tagInput.split(",").map(t => t.trim()).filter(Boolean),
    });
  }

  // Preview de imagem — usa URL direta ou monta URL do Drive para preview
  function previewUrl(img: string, src: ArticleInput["imageSource"]): string {
    if (!img) return "";
    if (src !== "drive") return img;
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
    ];
    for (const re of patterns) {
      const m = img.match(re);
      if (m?.[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    }
    return img;
  }

  const imgPreview = previewUrl(form.image, form.imageSource);

  return (
    <div className="adm-form-wrap">
      <div className="adm-form-header">
        <h2 className="adm-form-title">
          <i className={`bx ${initial ? "bx-edit" : "bx-plus-circle"}`}/>
          {initial ? "Editar artigo" : "Novo artigo"}
        </h2>
        <button className="adm-btn adm-btn-ghost adm-icon-btn" onClick={onCancel}><i className="bx bx-x"/></button>
      </div>

      {/* Formulário: layout 2 colunas → col esq: metadados | col dir: editor */}
      <div className={`adm-form-grid${editorExpanded ? " adm-form-grid-expanded" : ""}`}>

        {/* ── Coluna esquerda ── */}
        <div className={`adm-form-col${editorExpanded ? " adm-form-col-hidden" : ""}`}>
          <div className={`adm-field ${errors.title ? "has-error" : ""}`}>
            <label>Título <span className="req">*</span></label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Título do artigo..."/>
            {errors.title && <span className="field-err">{errors.title}</span>}
          </div>

          <div className="adm-row-2">
            <div className={`adm-field ${errors.cat ? "has-error" : ""}`}>
              <label>Categoria <span className="req">*</span></label>
              <select value={form.categoryId} onChange={e => set("categoryId", parseInt(e.target.value))}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.cat && <span className="field-err">{errors.cat}</span>}
            </div>
            <div className="adm-field">
              <label>Clube</label>
              <input value={form.club ?? ""} onChange={e => set("club", e.target.value)} placeholder="Ex: PSV Eindhoven"/>
            </div>
          </div>

          <div className="adm-row-2">
            <div className={`adm-field ${errors.meta ? "has-error" : ""}`}>
              <label>Meta do card <span className="req">*</span></label>
              <input value={form.meta} onChange={e => set("meta", e.target.value)} placeholder="PSV · 5 abr 2026"/>
              {errors.meta && <span className="field-err">{errors.meta}</span>}
            </div>
            <div className={`adm-field ${errors.date ? "has-error" : ""}`}>
              <label>Data <span className="req">*</span></label>
              <input value={form.date} onChange={e => set("date", e.target.value)} placeholder="5 abr 2026"/>
              {errors.date && <span className="field-err">{errors.date}</span>}
            </div>
          </div>

          {/* ── Imagem com seletor de origem ── */}
          <div className={`adm-field ${errors.image ? "has-error" : ""}`}>
            <label>Imagem <span className="req">*</span></label>

            {/* Seletor de origem */}
            <div className="img-source-tabs">
              <button
                type="button"
                className={`img-source-tab ${form.imageSource !== "drive" ? "img-source-active" : ""}`}
                onClick={() => set("imageSource", "url")}
              >
                <i className="bx bx-link"/> URL direta
              </button>
              <button
                type="button"
                className={`img-source-tab ${form.imageSource === "drive" ? "img-source-active" : ""}`}
                onClick={() => set("imageSource", "drive")}
              >
                <i className="bx bxl-google"/> Google Drive
              </button>
            </div>

            <input
              value={form.image}
              onChange={e => set("image", e.target.value)}
              placeholder={
                form.imageSource === "drive"
                  ? "Cole o link de compartilhamento do Drive..."
                  : "https://exemplo.com/imagem.jpg"
              }
            />
            {errors.image && <span className="field-err">{errors.image}</span>}

            {form.imageSource === "drive" && form.image && (
              <p className="adm-field-hint" style={{color:"var(--blue-mid)"}}>
                <i className="bx bx-info-circle"/> O link do Drive será convertido automaticamente. Certifique-se de que a imagem está compartilhada como "Qualquer pessoa com o link".
              </p>
            )}

            {imgPreview && (
              <div className="img-preview">
                <img
                  src={imgPreview}
                  alt="preview"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>

          <div className="adm-row-2">
            <div className="adm-field">
              <label>Ícone</label>
              <div className="icon-picker">
                {ICONS.map(ic => (
                  <button key={ic.cls} type="button"
                    className={`icon-pick-btn ${form.icon === ic.cls ? "icon-pick-active" : ""}`}
                    onClick={() => set("icon", ic.cls)} title={ic.label}>
                    <i className={ic.cls}/><span>{ic.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="adm-field">
              <label>Tags (vírgula)</label>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="PSV, Eredivisie..."/>
            </div>
          </div>

          <div className="adm-field">
            <label>Publicação</label>
            <label className="adm-toggle">
              <input type="checkbox" checked={form.published} onChange={e => set("published", e.target.checked)}/>
              <span className="adm-toggle-track"/>
              <span className="adm-toggle-label">{form.published ? "Publicado" : "Rascunho"}</span>
            </label>
          </div>
          <div className="adm-field">
            <label>Destaque</label>
            <label className="adm-toggle">
              <input type="checkbox" checked={form.featured ?? false} onChange={e => set("featured", e.target.checked)}/>
              <span className="adm-toggle-track"/>
              <span className="adm-toggle-label">{form.featured ? "⭐ Em destaque" : "Sem destaque"}</span>
            </label>
          </div>
        </div>

        {/* ── Coluna direita: editor rico ── */}
        <div className="adm-form-col">
          <div className={`adm-field ${errors.body ? "has-error" : ""}`} style={{flex:1}}>
            <div className="editor-label-row">
              <label>Conteúdo do artigo <span className="req">*</span></label>
              <button
                type="button"
                className="adm-btn adm-btn-ghost editor-expand-btn"
                onClick={() => setEditorExpanded(e => !e)}
                title={editorExpanded ? "Recolher editor" : "Expandir editor"}
              >
                <i className={`bx ${editorExpanded ? "bx-exit-fullscreen" : "bx-fullscreen"}`}/>
                {editorExpanded ? "Recolher" : "Expandir"}
              </button>
            </div>
            {errors.body && <span className="field-err">{errors.body}</span>}
            <RichEditor
              value={form.bodyHtml ?? ""}
              onChange={html => set("bodyHtml", html)}
              minHeight={editorExpanded ? 620 : 460}
            />
          </div>
        </div>
      </div>

      <div className="adm-form-footer">
        <button className="adm-btn adm-btn-ghost" onClick={onCancel} disabled={saving}>
          <i className="bx bx-x"/> Cancelar
        </button>
        <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
          {saving
            ? <><i className="bx bx-loader-alt bx-spin"/> Salvando...</>
            : <><i className="bx bx-save"/> {initial ? "Salvar alterações" : "Publicar artigo"}</>
          }
        </button>
      </div>
    </div>
  );
}

function ArticleRow({ article, onEdit, onDelete, onToggle, onFeature }: {
  article:Article; onEdit:()=>void; onDelete:()=>void; onToggle:()=>void; onFeature:()=>void;
}) {
  return (
    <div className={`adm-article-row ${!article.published?"adm-row-draft":""}`}>
      <div className="adm-row-thumb">
        <img src={article.image} alt={article.title} onError={e=>{(e.target as HTMLImageElement).src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23e8eaed'/%3E%3C/svg%3E";}}/>
      </div>
      <div className="adm-row-info">
        <div className="adm-row-meta">
          <span className={`badge ${article.category.badgeClass}`} style={{background: article.category.color}}>{article.category.name}</span>
          {article.club&&<span className="badge badge-grey">{article.club}</span>}
          {!article.published&&<span className="badge adm-badge-draft">Rascunho</span>}
          <span className="adm-row-date"><i className="bx bx-calendar"/> {article.date}</span>
        </div>
        <h3 className="adm-row-title">{article.title}</h3>
        <p className="adm-row-preview">{article.body[0]?.slice(0,120)}…</p>
      </div>
      <div className="adm-row-actions">
        <button className={`adm-action-btn star ${article.featured?"star-active":""}`} onClick={onFeature} title={article.featured?"Remover destaque":"Destacar"}>
          <i className={`bx ${article.featured?"bxs-star":"bx-star"}`}/>
        </button>
        <button className="adm-action-btn toggle" onClick={onToggle} title={article.published?"Despublicar":"Publicar"}>
          <i className={`bx ${article.published?"bx-hide":"bx-show"}`}/>
        </button>
        <button className="adm-action-btn edit" onClick={onEdit} title="Editar"><i className="bx bx-edit"/></button>
        <button className="adm-action-btn del" onClick={onDelete} title="Excluir"><i className="bx bx-trash"/></button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  SEÇÕES ESPECIAIS
// ═════════════════════════════════════════════════════════════════════════════

// ─── Classificação ────────────────────────────────────────────────────────────
function StandingsSection({ notyf }: { notyf: ReturnType<typeof useNotyf> }) {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [title,    setTitle]    = useState("");
  const [footer,   setFooter]   = useState("");
  const [entries,  setEntries]  = useState<Omit<StandingEntry,"id">[]>([]);

  useEffect(()=>{
    standingsApi.get().then(s=>{
      if(s){ setTitle(s.title); setFooter(s.footer); setEntries(s.entries.map(({id,...e})=>e)); }
    }).catch(()=>notyf.error("Erro ao carregar classificação.")).finally(()=>setLoading(false));
  },[]);

  function addEntry(){
    setEntries(p=>[...p,{position:p.length+1,team:"",played:0,wins:0,draws:0,losses:0,goalDiff:"0",points:0,champion:false,relegation:false,clSpot:false,elSpot:false}]);
  }
  function removeEntry(i:number){ setEntries(p=>p.filter((_,idx)=>idx!==i)); }
  function updateEntry(i:number,field:string,val:any){
    setEntries(p=>p.map((e,idx)=>idx===i?{...e,[field]:val}:e));
  }

  async function handleSave(){
    setSaving(true);
    try{
      await standingsApi.update({title,footer,entries:entries.map((e,i)=>({...e,position:i+1}))});
      notyf.success("Classificação salva!");
    }catch(err:any){ notyf.error(err.message); }
    finally{ setSaving(false); }
  }

  if(loading) return <div className="adm-loading"><i className="bx bx-loader-alt bx-spin adm-loading-icon"/><p>Carregando...</p></div>;

  return (
    <div className="adm-form-wrap">
      <div className="adm-form-header">
        <h2 className="adm-form-title"><i className="bx bxs-trophy"/> Classificação Eredivisie</h2>
      </div>
      <div style={{padding:"1.25rem 1.5rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
        <div className="adm-row-2">
          <div className="adm-field">
            <label>Título</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Eredivisie 2025-26"/>
          </div>
          <div className="adm-field">
            <label>Rodapé</label>
            <input value={footer} onChange={e=>setFooter(e.target.value)} placeholder="Temporada encerrada..."/>
          </div>
        </div>

        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.78rem"}}>
            <thead>
              <tr style={{background:"var(--bg2)",borderBottom:"1px solid var(--border)"}}>
                {["Time","J","V","E","D","SG","Pts","🏆","↓","CL","EL","🗑"].map(h=>(
                  <th key={h} style={{padding:"0.4rem 0.3rem",textAlign:"center",fontWeight:700,color:"var(--txt3)",fontSize:"0.65rem",letterSpacing:"0.05em"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e,i)=>(
                <tr key={i} style={{borderBottom:"1px solid var(--border)"}}>
                  <td style={{padding:"0.3rem"}}><input value={e.team} onChange={v=>updateEntry(i,"team",v.target.value)} style={{width:"130px",fontSize:"0.78rem",padding:"0.25rem 0.4rem",border:"1px solid var(--border)",borderRadius:"4px"}}/></td>
                  {(["played","wins","draws","losses"] as const).map(f=>(
                    <td key={f} style={{padding:"0.3rem"}}><input type="number" value={e[f]} onChange={v=>updateEntry(i,f,parseInt(v.target.value)||0)} style={{width:"40px",fontSize:"0.78rem",padding:"0.25rem 0.3rem",border:"1px solid var(--border)",borderRadius:"4px",textAlign:"center"}}/></td>
                  ))}
                  <td style={{padding:"0.3rem"}}><input value={e.goalDiff} onChange={v=>updateEntry(i,"goalDiff",v.target.value)} style={{width:"48px",fontSize:"0.78rem",padding:"0.25rem 0.3rem",border:"1px solid var(--border)",borderRadius:"4px",textAlign:"center"}}/></td>
                  <td style={{padding:"0.3rem"}}><input type="number" value={e.points} onChange={v=>updateEntry(i,"points",parseInt(v.target.value)||0)} style={{width:"40px",fontSize:"0.78rem",padding:"0.25rem 0.3rem",border:"1px solid var(--border)",borderRadius:"4px",textAlign:"center"}}/></td>
                  {(["champion","relegation","clSpot","elSpot"] as const).map(f=>(
                    <td key={f} style={{padding:"0.3rem",textAlign:"center"}}><input type="checkbox" checked={e[f]} onChange={v=>updateEntry(i,f,v.target.checked)}/></td>
                  ))}
                  <td style={{padding:"0.3rem",textAlign:"center"}}><button onClick={()=>removeEntry(i)} style={{color:"var(--red)",fontSize:"1rem",cursor:"pointer"}}><i className="bx bx-trash"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{display:"flex",gap:"0.75rem",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap"}}>
          <button className="adm-btn adm-btn-secondary" onClick={addEntry}><i className="bx bx-plus"/> Adicionar time</button>
          <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
            {saving?<><i className="bx bx-loader-alt bx-spin"/> Salvando...</>:<><i className="bx bx-save"/> Salvar classificação</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Convocação ───────────────────────────────────────────────────────────────
function ConvocationSection({ notyf }: { notyf: ReturnType<typeof useNotyf> }) {
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [title,setTitle]=useState("Última Convocação");
  const [groups,setGroups]=useState<{position:string;players:string[]}[]>([]);

  useEffect(()=>{
    convocationApi.get().then(c=>{
      if(c){ setTitle(c.title); setGroups(c.groups.map(g=>({position:g.position,players:g.players}))); }
    }).catch(()=>notyf.error("Erro ao carregar convocação.")).finally(()=>setLoading(false));
  },[]);

  function addGroup(){ setGroups(p=>[...p,{position:"Novo grupo",players:[""]}]); }
  function removeGroup(i:number){ setGroups(p=>p.filter((_,idx)=>idx!==i)); }
  function updateGroupPos(i:number,v:string){ setGroups(p=>p.map((g,idx)=>idx===i?{...g,position:v}:g)); }
  function updatePlayer(gi:number,pi:number,v:string){ setGroups(p=>p.map((g,idx)=>idx===gi?{...g,players:g.players.map((pl,pidx)=>pidx===pi?v:pl)}:g)); }
  function addPlayer(gi:number){ setGroups(p=>p.map((g,idx)=>idx===gi?{...g,players:[...g.players,""]}:g)); }
  function removePlayer(gi:number,pi:number){ setGroups(p=>p.map((g,idx)=>idx===gi?{...g,players:g.players.filter((_,pidx)=>pidx!==pi)}:g)); }

  async function handleSave(){
    setSaving(true);
    try{
      await convocationApi.update({title,groups:groups.map(g=>({position:g.position,players:g.players.filter(p=>p.trim())}))});
      notyf.success("Convocação salva!");
    }catch(err:any){ notyf.error(err.message); }
    finally{ setSaving(false); }
  }

  if(loading) return <div className="adm-loading"><i className="bx bx-loader-alt bx-spin adm-loading-icon"/><p>Carregando...</p></div>;

  return (
    <div className="adm-form-wrap">
      <div className="adm-form-header">
        <h2 className="adm-form-title"><i className="bx bxs-group"/> Convocação — Seleção Holandesa</h2>
      </div>
      <div style={{padding:"1.25rem 1.5rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
        <div className="adm-field">
          <label>Título da seção</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Última Convocação"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:"1rem"}}>
          {groups.map((g,gi)=>(
            <div key={gi} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r-lg)",overflow:"hidden"}}>
              <div style={{background:"var(--surface2)",borderBottom:"1px solid var(--border)",padding:"0.6rem 0.8rem",display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <input value={g.position} onChange={e=>updateGroupPos(gi,e.target.value)} style={{flex:1,fontSize:"0.78rem",fontWeight:700,border:"none",background:"transparent",outline:"none",color:"var(--orange)"}}/>
                <button onClick={()=>removeGroup(gi)} style={{color:"var(--red)",fontSize:"0.9rem",cursor:"pointer"}}><i className="bx bx-x"/></button>
              </div>
              <div style={{padding:"0.5rem"}}>
                {g.players.map((pl,pi)=>(
                  <div key={pi} style={{display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.3rem"}}>
                    <input value={pl} onChange={e=>updatePlayer(gi,pi,e.target.value)} placeholder="Nome (Clube)" style={{flex:1,fontSize:"0.78rem",padding:"0.3rem 0.5rem",border:"1px solid var(--border)",borderRadius:"4px"}}/>
                    <button onClick={()=>removePlayer(gi,pi)} style={{color:"var(--red)",fontSize:"0.85rem",cursor:"pointer",flexShrink:0}}><i className="bx bx-trash"/></button>
                  </div>
                ))}
                <button onClick={()=>addPlayer(gi)} style={{fontSize:"0.72rem",color:"var(--orange)",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:"0.25rem",marginTop:"0.25rem"}}><i className="bx bx-plus"/> Jogador</button>
              </div>
            </div>
          ))}
          <button onClick={addGroup} style={{border:"2px dashed var(--border)",borderRadius:"var(--r-lg)",padding:"1.5rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"0.5rem",color:"var(--txt3)",cursor:"pointer",fontSize:"0.82rem",fontWeight:600,transition:"border-color 0.15s,color 0.15s"}} onMouseEnter={e=>{(e.target as HTMLElement).style.borderColor="var(--orange)";(e.target as HTMLElement).style.color="var(--orange)";}} onMouseLeave={e=>{(e.target as HTMLElement).style.borderColor="var(--border)";(e.target as HTMLElement).style.color="var(--txt3)";}}>
            <i className="bx bx-plus" style={{fontSize:"1.5rem"}}/> Novo grupo
          </button>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
            {saving?<><i className="bx bx-loader-alt bx-spin"/> Salvando...</>:<><i className="bx bx-save"/> Salvar convocação</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────
function FixturesSection({ notyf }: { notyf: ReturnType<typeof useNotyf> }) {
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [fixtures,setFixtures]=useState<Omit<Fixture,"id"|"order">[]>([]);

  useEffect(()=>{
    fixturesApi.list().then(f=>setFixtures(f.map(({id,order,...rest})=>rest))).catch(()=>notyf.error("Erro.")).finally(()=>setLoading(false));
  },[]);

  const blank=():Omit<Fixture,"id"|"order">=>({day:"",month:"",competition:"Nations League",homeTeam:"",awayTeam:"",time:""});
  function add(){ setFixtures(p=>[...p,blank()]); }
  function remove(i:number){ setFixtures(p=>p.filter((_,idx)=>idx!==i)); }
  function update(i:number,field:string,val:string){ setFixtures(p=>p.map((f,idx)=>idx===i?{...f,[field]:val}:f)); }

  async function handleSave(){
    setSaving(true);
    try{ await fixturesApi.update(fixtures); notyf.success("Jogos salvos!"); }
    catch(err:any){ notyf.error(err.message); }
    finally{ setSaving(false); }
  }

  if(loading) return <div className="adm-loading"><i className="bx bx-loader-alt bx-spin adm-loading-icon"/><p>Carregando...</p></div>;

  return (
    <div className="adm-form-wrap">
      <div className="adm-form-header">
        <h2 className="adm-form-title"><i className="bx bx-calendar-event"/> Próximos Jogos</h2>
      </div>
      <div style={{padding:"1.25rem 1.5rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
        {fixtures.map((f,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"60px 110px 1fr 1fr 1fr 70px 36px",gap:"0.5rem",alignItems:"center",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"var(--r-md)",padding:"0.6rem 0.75rem"}}>
            {[["Dia","day",60],["Mês","month",100],["Competição","competition",null],["Casa","homeTeam",null],["Fora","awayTeam",null],["Hora","time",70]].map(([label,field,w])=>(
              <div key={String(field)} className="adm-field" style={{margin:0}}>
                <label style={{fontSize:"0.6rem"}}>{label}</label>
                <input value={(f as any)[field as string]} onChange={e=>update(i,String(field),e.target.value)} style={{width:w?`${w}px`:"100%",fontSize:"0.78rem",padding:"0.3rem 0.45rem"}}/>
              </div>
            ))}
            <button onClick={()=>remove(i)} style={{color:"var(--red)",fontSize:"1rem",cursor:"pointer",alignSelf:"flex-end",marginBottom:"2px"}}><i className="bx bx-trash"/></button>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem"}}>
          <button className="adm-btn adm-btn-secondary" onClick={add}><i className="bx bx-plus"/> Adicionar jogo</button>
          <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
            {saving?<><i className="bx bx-loader-alt bx-spin"/> Salvando...</>:<><i className="bx bx-save"/> Salvar jogos</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Nations League ───────────────────────────────────────────────────────────
function NationsSection({ notyf }: { notyf: ReturnType<typeof useNotyf> }) {
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [title,setTitle]=useState("Nations League — Grupo 3A");
  const [footer,setFooter]=useState("Grupo 3 · Liga A");
  const [entries,setEntries]=useState<Omit<NationsEntry,"id">[]>([]);

  useEffect(()=>{
    nationsApi.get().then(g=>{
      if(g){ setTitle(g.title); setFooter(g.footer); setEntries(g.entries.map(({id,...e})=>e)); }
    }).catch(()=>notyf.error("Erro.")).finally(()=>setLoading(false));
  },[]);

  function addEntry(){ setEntries(p=>[...p,{position:p.length+1,team:"",played:0,wins:0,draws:0,losses:0,points:0,highlight:false}]); }
  function removeEntry(i:number){ setEntries(p=>p.filter((_,idx)=>idx!==i)); }
  function update(i:number,f:string,v:any){ setEntries(p=>p.map((e,idx)=>idx===i?{...e,[f]:v}:e)); }

  async function handleSave(){
    setSaving(true);
    try{ await nationsApi.update({title,footer,entries:entries.map((e,i)=>({...e,position:i+1}))}); notyf.success("Nations League salva!"); }
    catch(err:any){ notyf.error(err.message); }
    finally{ setSaving(false); }
  }

  if(loading) return <div className="adm-loading"><i className="bx bx-loader-alt bx-spin adm-loading-icon"/><p>Carregando...</p></div>;

  return (
    <div className="adm-form-wrap">
      <div className="adm-form-header">
        <h2 className="adm-form-title"><i className="bx bx-flag"/> Nations League</h2>
      </div>
      <div style={{padding:"1.25rem 1.5rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
        <div className="adm-row-2">
          <div className="adm-field"><label>Título</label><input value={title} onChange={e=>setTitle(e.target.value)}/></div>
          <div className="adm-field"><label>Rodapé</label><input value={footer} onChange={e=>setFooter(e.target.value)}/></div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.78rem"}}>
          <thead><tr style={{background:"var(--bg2)",borderBottom:"1px solid var(--border)"}}>
            {["Time","J","V","E","D","Pts","🇳🇱","🗑"].map(h=><th key={h} style={{padding:"0.4rem 0.3rem",textAlign:"center",fontWeight:700,color:"var(--txt3)",fontSize:"0.65rem"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {entries.map((e,i)=>(
              <tr key={i} style={{borderBottom:"1px solid var(--border)"}}>
                <td style={{padding:"0.3rem"}}><input value={e.team} onChange={v=>update(i,"team",v.target.value)} style={{width:"120px",fontSize:"0.78rem",padding:"0.25rem 0.4rem",border:"1px solid var(--border)",borderRadius:"4px"}}/></td>
                {(["played","wins","draws","losses","points"] as const).map(f=>(
                  <td key={f} style={{padding:"0.3rem"}}><input type="number" value={e[f]} onChange={v=>update(i,f,parseInt(v.target.value)||0)} style={{width:"40px",fontSize:"0.78rem",padding:"0.25rem 0.3rem",border:"1px solid var(--border)",borderRadius:"4px",textAlign:"center"}}/></td>
                ))}
                <td style={{padding:"0.3rem",textAlign:"center"}}><input type="checkbox" checked={e.highlight} onChange={v=>update(i,"highlight",v.target.checked)}/></td>
                <td style={{padding:"0.3rem",textAlign:"center"}}><button onClick={()=>removeEntry(i)} style={{color:"var(--red)",fontSize:"1rem",cursor:"pointer"}}><i className="bx bx-trash"/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem"}}>
          <button className="adm-btn adm-btn-secondary" onClick={addEntry}><i className="bx bx-plus"/> Adicionar time</button>
          <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
            {saving?<><i className="bx bx-loader-alt bx-spin"/> Salvando...</>:<><i className="bx bx-save"/> Salvar tabela</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Top Scorers ─────────────────────────────────────────────────────────────
function ScorersSection({ notyf }: { notyf: ReturnType<typeof useNotyf> }) {
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [scorers,setScorers]=useState<{name:string;goals:number}[]>([]);

  useEffect(()=>{
    scorersApi.list().then(s=>setScorers(s.map(({name,goals})=>({name,goals})))).catch(()=>notyf.error("Erro.")).finally(()=>setLoading(false));
  },[]);

  function add(){ setScorers(p=>[...p,{name:"",goals:0}]); }
  function remove(i:number){ setScorers(p=>p.filter((_,idx)=>idx!==i)); }
  function update(i:number,f:string,v:any){ setScorers(p=>p.map((s,idx)=>idx===i?{...s,[f]:v}:s)); }

  async function handleSave(){
    setSaving(true);
    try{ await scorersApi.update(scorers.filter(s=>s.name.trim())); notyf.success("Artilheiros salvos!"); }
    catch(err:any){ notyf.error(err.message); }
    finally{ setSaving(false); }
  }

  if(loading) return <div className="adm-loading"><i className="bx bx-loader-alt bx-spin adm-loading-icon"/><p>Carregando...</p></div>;

  return (
    <div className="adm-form-wrap">
      <div className="adm-form-header">
        <h2 className="adm-form-title"><i className="bx bxs-star"/> Artilheiros Históricos</h2>
      </div>
      <div style={{padding:"1.25rem 1.5rem",display:"flex",flexDirection:"column",gap:"0.5rem"}}>
        {scorers.map((s,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"32px 1fr 80px 36px",gap:"0.5rem",alignItems:"center"}}>
            <span style={{fontWeight:800,color:"var(--orange)",textAlign:"center"}}>{i+1}</span>
            <input value={s.name} onChange={e=>update(i,"name",e.target.value)} placeholder="Nome do jogador" style={{fontSize:"0.85rem",padding:"0.4rem 0.6rem",border:"1px solid var(--border)",borderRadius:"var(--r-md)"}}/>
            <input type="number" value={s.goals} onChange={e=>update(i,"goals",parseInt(e.target.value)||0)} placeholder="Gols" style={{fontSize:"0.85rem",padding:"0.4rem 0.6rem",border:"1px solid var(--border)",borderRadius:"var(--r-md)",textAlign:"center"}}/>
            <button onClick={()=>remove(i)} style={{color:"var(--red)",fontSize:"1rem",cursor:"pointer",textAlign:"center"}}><i className="bx bx-trash"/></button>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem",marginTop:"0.5rem"}}>
          <button className="adm-btn adm-btn-secondary" onClick={add}><i className="bx bx-plus"/> Adicionar jogador</button>
          <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
            {saving?<><i className="bx bx-loader-alt bx-spin"/> Salvando...</>:<><i className="bx bx-save"/> Salvar artilheiros</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Site Config ─────────────────────────────────────────────────────────────
function ConfigSection({ notyf }: { notyf: ReturnType<typeof useNotyf> }) {
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [cfg,setCfg]=useState<SiteConfig>({});

  useEffect(()=>{
    configApi.get().then(c=>setCfg(c)).catch(()=>notyf.error("Erro.")).finally(()=>setLoading(false));
  },[]);

  function set(k:keyof SiteConfig,v:string){ setCfg(c=>({...c,[k]:v})); }

  async function handleSave(){
    setSaving(true);
    try{ await configApi.update(cfg); notyf.success("Configurações salvas!"); }
    catch(err:any){ notyf.error(err.message); }
    finally{ setSaving(false); }
  }

  if(loading) return <div className="adm-loading"><i className="bx bx-loader-alt bx-spin adm-loading-icon"/><p>Carregando...</p></div>;

  const fields:[keyof SiteConfig,string,string][]=[
    ["site_name","Nome do site","Futebol Holandês"],
    ["site_sub","Subtítulo (topbar)","tudo sobre o futebol da Holanda"],
    ["site_tagline","Tagline (footer)","Tudo sobre o futebol da Holanda em português"],
    ["footer_copy","Copyright (footer)","© 2026 Futebol Holandês · Todos os direitos reservados"],
    ["eredivisie_intro","Intro da página Eredivisie","A temporada 2025-26..."],
  ];

  return (
    <div className="adm-form-wrap">
      <div className="adm-form-header">
        <h2 className="adm-form-title"><i className="bx bx-cog"/> Configurações do Site</h2>
      </div>
      <div style={{padding:"1.25rem 1.5rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
        {fields.map(([key,label,placeholder])=>(
          <div key={key} className="adm-field">
            <label>{label}</label>
            {key==="eredivisie_intro"
              ?<textarea value={cfg[key]??""} onChange={e=>set(key,e.target.value)} placeholder={placeholder} rows={3}/>
              :<input value={cfg[key]??""} onChange={e=>set(key,e.target.value)} placeholder={placeholder}/>
            }
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
            {saving?<><i className="bx bx-loader-alt bx-spin"/> Salvando...</>:<><i className="bx bx-save"/> Salvar configurações</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Menu Section ──────────────────────────────────────────────────────────────
// Rotas reais existentes no site (App.tsx) — o usuário escolhe entre elas
const SITE_ROUTES: { path: string; label: string }[] = [
  { path: "/",                   label: "Início (/)" },
  { path: "/eredivisie",         label: "Eredivisie (/eredivisie)" },
  { path: "/selecao-holandesa",  label: "Seleção Holandesa (/selecao-holandesa)" },
];
const EXTERNAL_VALUE = "__external__";

type MenuItemDraft = { label: string; icon: string; path: string; active: boolean; children: MenuItemDraft[] };

function draftFromItem(it: MenuItem): MenuItemDraft {
  return {
    label: it.label, icon: it.icon, path: it.path, active: it.active,
    children: (it.children||[]).map(c=>({label:c.label,icon:c.icon,path:c.path,active:c.active,children:[]})),
  };
}

// Seletor de rota: dropdown com as páginas do site + opção "Link externo" que revela um campo de URL
function RoutePicker({ value, onChange, size = "normal" }: { value: string; onChange: (v: string) => void; size?: "normal"|"small" }) {
  const isKnown = SITE_ROUTES.some(r => r.path === value);
  const isExternal = !isKnown && value !== "";
  const selectValue = isExternal ? EXTERNAL_VALUE : (value || "");
  const fontSize = size === "small" ? "0.76rem" : "0.8rem";
  const padding  = size === "small" ? "0.32rem 0.55rem" : "0.4rem 0.6rem";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"0.3rem",flex:"1 1 180px"}}>
      <select
        value={selectValue}
        onChange={e=>{
          if (e.target.value === EXTERNAL_VALUE) onChange("https://");
          else onChange(e.target.value);
        }}
        style={{fontSize,padding,border:"1px solid var(--border)",borderRadius:"var(--r-sm)",background:"var(--surface)",width:"100%"}}
      >
        <option value="" disabled>Selecione a página...</option>
        {SITE_ROUTES.map(r => <option key={r.path} value={r.path}>{r.label}</option>)}
        <option value={EXTERNAL_VALUE}>🔗 Link externo (outro site)</option>
      </select>
      {isExternal && (
        <input
          value={value}
          onChange={e=>onChange(e.target.value)}
          placeholder="https://exemplo.com"
          style={{fontSize,fontFamily:"monospace",padding,border:"1px solid var(--border)",borderRadius:"var(--r-sm)",width:"100%"}}
        />
      )}
    </div>
  );
}

function MenuSection({ notyf }: { notyf: ReturnType<typeof useNotyf> }) {
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [items,setItems]=useState<MenuItemDraft[]>([]);
  const [iconPickerFor,setIconPickerFor]=useState<string|null>(null);

  useEffect(()=>{
    menuApi.getAll().then(data=>setItems(data.map(draftFromItem))).catch(()=>notyf.error("Erro ao carregar menu.")).finally(()=>setLoading(false));
  },[]);

  function blankItem(): MenuItemDraft { return {label:"",icon:"bx bx-link",path:"/",active:true,children:[]}; }

  function addItem(){ setItems(p=>[...p,blankItem()]); }
  function removeItem(i:number){ setItems(p=>p.filter((_,idx)=>idx!==i)); }
  function updateItem(i:number,field:keyof MenuItemDraft,val:any){ setItems(p=>p.map((it,idx)=>idx===i?{...it,[field]:val}:it)); }
  function moveItem(i:number,dir:-1|1){
    setItems(p=>{
      const j=i+dir; if(j<0||j>=p.length) return p;
      const copy=[...p]; const [moved]=copy.splice(i,1); copy.splice(j,0,moved); return copy;
    });
  }

  function addChild(parentIdx:number){
    setItems(p=>p.map((it,idx)=>idx===parentIdx?{...it,children:[...it.children,{label:"",icon:"bx bx-link",path:"/",active:true,children:[]}]}:it));
  }
  function removeChild(parentIdx:number,childIdx:number){
    setItems(p=>p.map((it,idx)=>idx===parentIdx?{...it,children:it.children.filter((_,ci)=>ci!==childIdx)}:it));
  }
  function updateChild(parentIdx:number,childIdx:number,field:keyof MenuItemDraft,val:any){
    setItems(p=>p.map((it,idx)=>idx===parentIdx?{...it,children:it.children.map((c,ci)=>ci===childIdx?{...c,[field]:val}:c)}:it));
  }

  async function handleSave(){
    if(items.some(it=>!it.label.trim()||!it.path.trim())){ notyf.error("Preencha label e link de todos os itens."); return; }
    setSaving(true);
    try{
      const payload: MenuItemInput[] = items.map(it=>({
        label: it.label.trim(), icon: it.icon, path: it.path.trim(), active: it.active,
        children: it.children.filter(c=>c.label.trim()&&c.path.trim()).map(c=>({label:c.label.trim(),icon:c.icon,path:c.path.trim(),active:c.active})),
      }));
      const saved = await menuApi.update(payload);
      setItems(saved.map(draftFromItem));
      notyf.success("Menu salvo!");
    }catch(err:any){ notyf.error(err.message); }
    finally{ setSaving(false); }
  }

  if(loading) return <div className="adm-loading"><i className="bx bx-loader-alt bx-spin adm-loading-icon"/><p>Carregando...</p></div>;

  return (
    <div className="adm-form-wrap">
      <div className="adm-form-header">
        <h2 className="adm-form-title"><i className="bx bx-menu"/> Menu de Navegação</h2>
      </div>
      <div style={{padding:"1.25rem 1.5rem",display:"flex",flexDirection:"column",gap:"0.85rem"}}>
        <p className="adm-field-hint" style={{marginTop:0}}>
          Defina os itens do menu principal do site. Arraste a ordem com as setas e adicione sub-itens (dropdown) quando necessário.
        </p>

        {items.map((item,i)=>{
          const pickerKey=`p-${i}`;
          return (
            <div key={i} style={{border:"1px solid var(--border)",borderRadius:"var(--r-lg)",background:"var(--surface)",overflow:"visible"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.75rem 0.9rem",background:"var(--surface2)",borderBottom:"1px solid var(--border)",flexWrap:"wrap"}}>
                <div style={{display:"flex",flexDirection:"column",gap:"2px"}}>
                  <button onClick={()=>moveItem(i,-1)} disabled={i===0} style={{color:"var(--txt3)",fontSize:"0.8rem",cursor:i===0?"default":"pointer",opacity:i===0?0.3:1}}><i className="bx bx-chevron-up"/></button>
                  <button onClick={()=>moveItem(i,1)} disabled={i===items.length-1} style={{color:"var(--txt3)",fontSize:"0.8rem",cursor:i===items.length-1?"default":"pointer",opacity:i===items.length-1?0.3:1}}><i className="bx bx-chevron-down"/></button>
                </div>

                <button type="button" onClick={()=>setIconPickerFor(iconPickerFor===pickerKey?null:pickerKey)} title="Escolher ícone"
                  style={{width:"36px",height:"36px",borderRadius:"var(--r-sm)",border:"1px solid var(--border)",background:"var(--surface)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}>
                  <i className={item.icon} style={{fontSize:"1.1rem",color:"var(--orange)"}}/>
                </button>

                <input value={item.label} onChange={e=>updateItem(i,"label",e.target.value)} placeholder="Nome no menu" style={{flex:"1 1 160px",fontSize:"0.85rem",fontWeight:700,padding:"0.4rem 0.6rem",border:"1px solid var(--border)",borderRadius:"var(--r-sm)"}}/>
                <RoutePicker value={item.path} onChange={v=>updateItem(i,"path",v)}/>

                <label className="adm-toggle" style={{flexShrink:0}}>
                  <input type="checkbox" checked={item.active} onChange={e=>updateItem(i,"active",e.target.checked)}/>
                  <span className="adm-toggle-track"/>
                  <span className="adm-toggle-label">{item.active?"Visível":"Oculto"}</span>
                </label>

                <button onClick={()=>removeItem(i)} title="Remover item" style={{color:"var(--red)",fontSize:"1.05rem",cursor:"pointer",flexShrink:0}}><i className="bx bx-trash"/></button>
              </div>

              {iconPickerFor===pickerKey&&(
                <div style={{padding:"0.75rem 0.9rem",borderBottom:"1px solid var(--border)"}}>
                  <div className="icon-picker">
                    {ICONS.map(ic=>(
                      <button key={ic.cls} type="button" className={`icon-pick-btn ${item.icon===ic.cls?"icon-pick-active":""}`} onClick={()=>{updateItem(i,"icon",ic.cls);setIconPickerFor(null);}} title={ic.label}>
                        <i className={ic.cls}/><span>{ic.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-itens */}
              <div style={{padding:"0.65rem 0.9rem 0.9rem",display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                {item.children.map((child,ci)=>(
                  <div key={ci} style={{display:"flex",alignItems:"center",gap:"0.5rem",marginLeft:"1.5rem",flexWrap:"wrap"}}>
                    <i className="bx bx-subdirectory-right" style={{color:"var(--txt3)",fontSize:"0.9rem",flexShrink:0}}/>
                    <input value={child.label} onChange={e=>updateChild(i,ci,"label",e.target.value)} placeholder="Sub-item" style={{flex:"1 1 140px",fontSize:"0.78rem",padding:"0.32rem 0.55rem",border:"1px solid var(--border)",borderRadius:"4px"}}/>
                    <RoutePicker value={child.path} onChange={v=>updateChild(i,ci,"path",v)} size="small"/>
                    <button onClick={()=>removeChild(i,ci)} style={{color:"var(--red)",fontSize:"0.9rem",cursor:"pointer",flexShrink:0}}><i className="bx bx-trash"/></button>
                  </div>
                ))}
                <button onClick={()=>addChild(i)} style={{marginLeft:"1.5rem",fontSize:"0.74rem",color:"var(--orange)",fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:"0.3rem",width:"fit-content"}}>
                  <i className="bx bx-plus"/> Adicionar sub-item
                </button>
              </div>
            </div>
          );
        })}

        <button onClick={addItem} style={{border:"2px dashed var(--border)",borderRadius:"var(--r-lg)",padding:"1.1rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",color:"var(--txt3)",cursor:"pointer",fontSize:"0.85rem",fontWeight:600}}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="var(--orange)";(e.currentTarget as HTMLElement).style.color="var(--orange)";}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="var(--border)";(e.currentTarget as HTMLElement).style.color="var(--txt3)";}}>
          <i className="bx bx-plus" style={{fontSize:"1.2rem"}}/> Novo item de menu
        </button>

        <div style={{display:"flex",justifyContent:"flex-end",marginTop:"0.25rem"}}>
          <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
            {saving?<><i className="bx bx-loader-alt bx-spin"/> Salvando...</>:<><i className="bx bx-save"/> Salvar menu</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Categories Section ───────────────────────────────────────────────────────
function CategoriesSection({ articles, categories, setCategories, notyf }: {
  articles: Article[]; categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  notyf: ReturnType<typeof useNotyf>;
}) {
  const [newName,setNewName]=useState("");
  const [newColor,setNewColor]=useState("#FF6200");
  const [saving,setSaving]=useState(false);
  const [deletingId,setDeletingId]=useState<number|null>(null);
  const [editingColorId,setEditingColorId]=useState<number|null>(null);

  async function handleCreate(){
    if(!newName.trim()){notyf.error("Nome obrigatório.");return;}
    setSaving(true);
    try{ const c=await categoriesApi.create(newName.trim(),"badge-orange",newColor); setCategories(p=>[...p,c]); setNewName(""); setNewColor("#FF6200"); notyf.success(`Categoria "${c.name}" criada!`); }
    catch(err:any){notyf.error(err.message);}
    finally{setSaving(false);}
  }
  async function handleDelete(id:number,name:string){
    if(articles.filter(a=>a.category.id===id).length>0){notyf.error(`"${name}" possui artigos vinculados.`);return;}
    setDeletingId(id);
    try{ await categoriesApi.delete(id); setCategories(p=>p.filter(c=>c.id!==id)); notyf.success(`"${name}" excluída.`); }
    catch(err:any){notyf.error(err.message);}
    finally{setDeletingId(null);}
  }
  async function handleColorChange(id:number, color:string){
    setCategories(p=>p.map(c=>c.id===id?{...c,color}:c)); // otimista
    try{ await categoriesApi.update(id,{color}); notyf.success("Cor atualizada!"); }
    catch(err:any){ notyf.error(err.message); }
  }

  return (
    <div className="adm-form-wrap">
      <div className="adm-form-header">
        <h2 className="adm-form-title"><i className="bx bx-purchase-tag"/> Categorias</h2>
      </div>
      <div className="cat-manager-body">
        <p className="adm-sidebar-label" style={{marginBottom:"0.75rem"}}>Nova categoria</p>
        <div className="cat-new-form">
          <div className="adm-field" style={{flex:1}}><label>Nome</label><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Ex: Champions League" onKeyDown={e=>e.key==="Enter"&&handleCreate()}/></div>
          <ColorPicker label="Cor" value={newColor} onChange={setNewColor}/>
          <div className="adm-field cat-new-preview"><label>Preview</label><span className="badge" style={{background:newColor}}>{newName||"Categoria"}</span></div>
          <button className="adm-btn adm-btn-primary cat-new-btn" onClick={handleCreate} disabled={saving}>
            {saving?<i className="bx bx-loader-alt bx-spin"/>:<><i className="bx bx-plus"/> Criar</>}
          </button>
        </div>
        <p className="adm-sidebar-label" style={{margin:"1.5rem 0 0.75rem"}}>Cadastradas ({categories.length})</p>
        <div className="cat-list">
          {categories.map(c=>(
            <div key={c.id} className="cat-row">
              <span className="badge" style={{background:c.color||"#FF6200"}}>{c.name}</span>
              <span className="cat-row-count">{articles.filter(a=>a.category.id===c.id).length} artigo(s)</span>
              <button className="adm-action-btn" onClick={()=>setEditingColorId(editingColorId===c.id?null:c.id)} title="Editar cor">
                <i className="bx bx-palette"/>
              </button>
              {editingColorId===c.id && (
                <ColorPicker value={c.color||"#FF6200"} onChange={(color)=>handleColorChange(c.id,color)}/>
              )}
              <button className="adm-action-btn del" onClick={()=>handleDelete(c.id,c.name)} disabled={deletingId===c.id}>
                {deletingId===c.id?<i className="bx bx-loader-alt bx-spin"/>:<i className="bx bx-trash"/>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  ADMIN PANEL
// ═════════════════════════════════════════════════════════════════════════════
type AdminView = "list"|"create"|"edit"|"categories"|"standings"|"convocation"|"fixtures"|"nations"|"scorers"|"config"|"menu";

function AdminPanel({ user, onLogout, onExit }: { user:AdminUser; onLogout:()=>void; onExit:()=>void }) {
  const [articles,   setArticles]   = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [view,       setView]       = useLocalStorage<AdminView>("fh_admin_last_view","list");
  const [editing,    setEditing]    = useState<Article|null>(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [confirm,    setConfirm]    = useState<{msg:string;action:()=>Promise<void>}|null>(null);
  const [confirmLoading,setConfirmLoading]=useState(false);
  const [search,     setSearch]     = useLocalStorage("fh_admin_last_search","");
  const [filterCat,  setFilterCat]  = useLocalStorage("fh_admin_last_filter","Todas");
  const [showCP,     setShowCP]     = useState(false);
  const [userMenu,   setUserMenu]   = useState(false);

  const notyf=useNotyf();
  const showToast=useCallback((msg:string,type:"success"|"error"="success")=>{ type==="success"?notyf.success(msg):notyf.error(msg); },[]);

  async function loadAll(){
    setLoading(true);
    try{
      const [catRes,artRes]=await Promise.all([categoriesApi.list(),articlesApi.list({limit:100})]);
      setCategories(catRes); setArticles(artRes.articles.map(normalizeArticle));
    }catch(err:any){showToast(err.message??"Erro ao carregar.","error");}
    finally{setLoading(false);}
  }
  useEffect(()=>{loadAll();},[]);

  async function handleCreate(data:ArticleInput){
    setSaving(true);
    try{const c=await articlesApi.create(data);setArticles(p=>[normalizeArticle(c),...p]);setView("list");showToast("Artigo publicado!");}
    catch(err:any){showToast(err.message,"error");}finally{setSaving(false);}
  }
  async function handleEdit(data:ArticleInput){
    if(!editing) return; setSaving(true);
    try{const u=await articlesApi.update(editing.id,data);setArticles(p=>p.map(a=>a.id===editing.id?normalizeArticle(u):a));setEditing(null);setView("list");showToast("Artigo atualizado!");}
    catch(err:any){showToast(err.message,"error");}finally{setSaving(false);}
  }
  async function handleToggle(article:Article){
    try{const u=await articlesApi.patch(article.id,{published:!article.published});setArticles(p=>p.map(a=>a.id===article.id?normalizeArticle(u):a));showToast(u.published?"Publicado.":"Despublicado.");}
    catch(err:any){showToast(err.message,"error");}
  }
  async function handleFeature(article:Article){
    try{const u=await articlesApi.patch(article.id,{featured:!article.featured});setArticles(p=>p.map(a=>a.id===article.id?normalizeArticle(u):a));showToast(u.featured?"⭐ Em destaque!":"Removido dos destaques.");}
    catch(err:any){showToast(err.message,"error");}
  }
  function handleDelete(id:number){
    setConfirm({msg:"Excluir este artigo? Esta ação não pode ser desfeita.",action:async()=>{
      setConfirmLoading(true);
      try{await articlesApi.delete(id);setArticles(p=>p.filter(a=>a.id!==id));setConfirm(null);showToast("Artigo excluído.");}
      catch(err:any){showToast(err.message,"error");}finally{setConfirmLoading(false);}
    }});
  }

  const filtered=articles.filter(a=>{
    const mc=filterCat==="Todas"||a.category.name===filterCat;
    const ms=a.title.toLowerCase().includes(search.toLowerCase());
    return mc&&ms;
  });

  const total=articles.length;
  const published=articles.filter(a=>a.published).length;

  const navItems: {key:AdminView; icon:string; label:string}[] = [
    {key:"list",        icon:"bx-news",           label:"Artigos"},
    {key:"categories",  icon:"bx-purchase-tag",   label:"Categorias"},
    {key:"menu",        icon:"bx-menu",            label:"Menu do Site"},
    {key:"standings",   icon:"bxs-trophy",         label:"Classificação"},
    {key:"convocation", icon:"bxs-group",          label:"Convocação"},
    {key:"fixtures",    icon:"bx-calendar-event", label:"Próximos Jogos"},
    {key:"nations",     icon:"bx-flag",            label:"Nations League"},
    {key:"scorers",     icon:"bxs-star",           label:"Artilheiros"},
    {key:"config",      icon:"bx-cog",             label:"Config. do Site"},
  ];



  return (
    <div className="adm-root">
      <div className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-left">
            <img src="logo.png" alt="FH" className="adm-logo"/>
            <div>
              <h1 className="adm-header-title">Painel Administrativo</h1>
              <p className="adm-header-sub">Futebol Holandês · {total} artigos</p>
            </div>
          </div>
          <div className="adm-header-right">
            <div className="adm-user-menu">
              <button className="adm-user-btn" onClick={()=>setUserMenu(o=>!o)}>
                <div className="adm-user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <span className="adm-user-name">{user.name}</span>
                <i className={`bx ${userMenu?"bx-chevron-up":"bx-chevron-down"}`}/>
              </button>
              {userMenu&&(
                <div className="adm-user-dropdown">
                  <div className="adm-user-info"><p className="adm-user-fullname">{user.name}</p><p className="adm-user-email">{user.email}</p></div>
                  <div className="adm-user-actions">
                    <button onClick={()=>{setShowCP(true);setUserMenu(false);}}><i className="bx bx-lock-alt"/> Alterar senha</button>
                    <button className="danger" onClick={()=>{setUserMenu(false);onLogout();}}><i className="bx bx-log-out"/> Sair</button>
                  </div>
                </div>
              )}
            </div>
            <button className="adm-btn adm-btn-ghost adm-exit-btn" onClick={onExit}><i className="bx bx-arrow-back"/> Voltar ao site</button>
          </div>
        </div>
      </div>

      <div className="adm-body">
        <aside className="adm-sidebar">
          <div className="adm-stat-card"><i className="bx bx-news adm-stat-icon"/><div><p className="adm-stat-val">{total}</p><p className="adm-stat-label">Total</p></div></div>
          <div className="adm-stat-card"><i className="bx bx-check-circle adm-stat-icon" style={{color:"var(--green)"}}/><div><p className="adm-stat-val">{published}</p><p className="adm-stat-label">Publicados</p></div></div>
          <div className="adm-stat-card"><i className="bx bx-hide adm-stat-icon" style={{color:"var(--amber)"}}/><div><p className="adm-stat-val">{total-published}</p><p className="adm-stat-label">Rascunhos</p></div></div>
          <div className="adm-sidebar-section">
            <p className="adm-sidebar-label">Navegação</p>
            {navItems.map(item=>(
              <button key={item.key} className={`adm-tool-btn ${view===item.key?"adm-tool-btn-active":""}`} onClick={()=>setView(item.key)}>
                <i className={`bx ${item.icon}`}/> {item.label}
              </button>
            ))}
          </div>
          <div className="adm-sidebar-section">
            <p className="adm-sidebar-label">Ações</p>
            <button className="adm-tool-btn" onClick={loadAll} disabled={loading}><i className="bx bx-refresh"/> Recarregar</button>
          </div>
        </aside>

        <main className="adm-main">
          {loading?(
            <div className="adm-loading"><i className="bx bx-loader-alt bx-spin adm-loading-icon"/><p>Carregando...</p></div>
          ):view==="standings"  ? <StandingsSection notyf={notyf}/>
          : view==="convocation"? <ConvocationSection notyf={notyf}/>
          : view==="fixtures"   ? <FixturesSection notyf={notyf}/>
          : view==="nations"    ? <NationsSection notyf={notyf}/>
          : view==="scorers"    ? <ScorersSection notyf={notyf}/>
          : view==="config"     ? <ConfigSection notyf={notyf}/>
          : view==="menu"       ? <MenuSection notyf={notyf}/>
          : view==="categories" ? <CategoriesSection articles={articles} categories={categories} setCategories={setCategories} notyf={notyf}/>
          : (view==="create"||view==="edit")?(
            <ArticleForm
              initial={view==="edit"&&editing?editing:undefined}
              categories={categories}
              onSave={view==="edit"?handleEdit:handleCreate}
              onCancel={()=>{setView("list");setEditing(null);}}
              saving={saving}
            />
          ):(
            <>
              <div className="adm-toolbar">
                <div className="adm-toolbar-left">
                  <div className="adm-search">
                    <i className="bx bx-search"/>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar artigos..."/>
                    {search&&<button onClick={()=>setSearch("")}><i className="bx bx-x"/></button>}
                  </div>
                  <select className="adm-filter-select" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
                    <option value="Todas">Todas as categorias</option>
                    {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <button className="adm-btn adm-btn-primary" onClick={()=>setView("create")}><i className="bx bx-plus"/> Novo artigo</button>
              </div>
              <p className="adm-results-info">{filtered.length===total?`${total} artigos`:`${filtered.length} de ${total} artigos`}</p>
              {filtered.length===0?(
                <div className="adm-empty"><i className="bx bx-search-alt adm-empty-icon"/><p>Nenhum artigo encontrado.</p>{search&&<button className="adm-btn adm-btn-ghost" onClick={()=>setSearch("")}>Limpar busca</button>}</div>
              ):(
                <div className="adm-list">
                  {filtered.map(a=>(
                    <ArticleRow key={a.id} article={a}
                      onEdit={()=>{setEditing(a);setView("edit");}}
                      onDelete={()=>handleDelete(a.id)}
                      onToggle={()=>handleToggle(a)}
                      onFeature={()=>handleFeature(a)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {confirm&&<ConfirmModal msg={confirm.msg} loading={confirmLoading} onConfirm={()=>confirm.action()} onCancel={()=>{if(!confirmLoading)setConfirm(null);}}/>}
      {showCP&&<ChangePasswordModal onClose={()=>setShowCP(false)} onSuccess={()=>{setShowCP(false);showToast("Senha alterada!");}}/>}
    </div>
  );
}

// ─── Root Admin ───────────────────────────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate();
  const [user,setUser]=useState<AdminUser|null>(null);
  const [checking,setChecking]=useState(true);

  useEffect(()=>{
    if(!auth.isLogged()){setChecking(false);return;}
    authApi.me().then(u=>setUser(u)).catch(()=>auth.clear()).finally(()=>setChecking(false));
  },[]);

  if(checking) return <div className="login-root"><div className="adm-loading"><i className="bx bx-loader-alt bx-spin adm-loading-icon"/><p>Verificando sessão...</p></div></div>;
  if(!user) return <LoginScreen onLogin={u=>setUser(u)}/>;
  return <AdminPanel user={user} onLogout={()=>{authApi.logout();setUser(null);}} onExit={()=>navigate("/")}/>;
}