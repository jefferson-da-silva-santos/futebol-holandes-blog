import { useState, useEffect, useCallback } from "react";
import { useNotyf } from "./useNotyf";
import {
  authApi, articlesApi, categoriesApi, normalizeArticle, auth,
  type Article, type Category, type ArticleInput, type AdminUser,
} from "./api";

const ICONS: { cls: string; label: string }[] = [
  { cls: "bx bxs-trophy",        label: "Troféu"         },
  { cls: "bx bxs-medal",         label: "Medalha"        },
  { cls: "bx bx-football",       label: "Bola"           },
  { cls: "bx bx-flag",           label: "Bandeira"       },
  { cls: "bx bxs-user-badge",    label: "Treinador"      },
  { cls: "bx bx-building-house", label: "Estádio"        },
  { cls: "bx bx-news",           label: "Notícia"        },
  { cls: "bx bxs-star",          label: "Destaque"       },
  { cls: "bx bxs-group",         label: "Seleção"        },
  { cls: "bx bx-calendar-event", label: "Calendário"     },
  { cls: "bx bx-time",           label: "Relógio"        },
  { cls: "bx bx-transfer",       label: "Transferência"  },
  { cls: "bx bxs-bar-chart-alt-2",label: "Estatísticas" },
  { cls: "bx bx-money",          label: "Dinheiro"       },
  { cls: "bx bxs-heart",         label: "Favorito"       },
  { cls: "bx bx-camera",         label: "Foto"           },
];


// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ msg, onConfirm, onCancel, loading }: {
  msg: string; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
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

// ═════════════════════════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }: { onLogin: (user: AdminUser) => void }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);
  const notyf = useNotyf();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password.trim()) { setError("Preencha e-mail e senha."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login(email.trim(), password);
      notyf.success("Login realizado com sucesso!");
      onLogin(res.admin);
    } catch (err: any) {
      const msg = err.message ?? "Credenciais inválidas.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo">
          <img src="logo.png" alt="Futebol Holandês"/>
        </div>
        <h1 className="login-title">Painel Administrativo</h1>
        <p className="login-sub">Futebol Holandês — acesso restrito</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className={`adm-field ${error?"has-error":""}`}>
            <label>E-mail</label>
            <div className="login-input-wrap">
              <i className="bx bx-envelope login-input-icon"/>
              <input
                type="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                placeholder="admin@exemplo.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className={`adm-field ${error?"has-error":""}`}>
            <label>Senha</label>
            <div className="login-input-wrap">
              <i className="bx bx-lock-alt login-input-icon"/>
              <input
                type={showPass?"text":"password"}
                value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
              <button type="button" className="login-eye" onClick={()=>setShowPass(s=>!s)} tabIndex={-1}>
                <i className={`bx ${showPass?"bx-hide":"bx-show"}`}/>
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              <i className="bx bx-x-circle"/> {error}
            </div>
          )}

          <button type="submit" className="adm-btn adm-btn-primary login-submit" disabled={loading}>
            {loading
              ? <><i className="bx bx-loader-alt bx-spin"/> Entrando...</>
              : <><i className="bx bx-log-in"/> Entrar</>
            }
          </button>
        </form>

        <p className="login-hint">
          <i className="bx bx-info-circle"/> Primeiro acesso? Use <code>POST /setup</code> para criar o admin.
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  CHANGE PASSWORD MODAL
// ═════════════════════════════════════════════════════════════════════════════
function ChangePasswordModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !next || !confirm) { setError("Preencha todos os campos."); return; }
    if (next.length < 8)              { setError("Nova senha deve ter ao menos 8 caracteres."); return; }
    if (next !== confirm)             { setError("As senhas não coincidem."); return; }
    setLoading(true); setError("");
    try {
      await authApi.changePassword(current, next);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal adm-modal-wide" onClick={e=>e.stopPropagation()}>
        <h3 className="adm-modal-title"><i className="bx bx-lock-alt"/> Alterar Senha</h3>
        <form className="cp-form" onSubmit={handleSubmit} noValidate>
          {(["Senha atual","Nova senha","Confirmar nova senha"] as const).map((label, i) => {
            const vals   = [current, next, confirm];
            const setters= [setCurrent, setNext, setConfirm];
            return (
              <div key={label} className="adm-field">
                <label>{label}</label>
                <input type="password" value={vals[i]}
                  onChange={e=>setters[i](e.target.value)} disabled={loading}/>
              </div>
            );
          })}
          {error && <div className="login-error"><i className="bx bx-x-circle"/> {error}</div>}
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

// ═════════════════════════════════════════════════════════════════════════════
//  ARTICLE FORM
// ═════════════════════════════════════════════════════════════════════════════
function ArticleForm({ initial, categories, onSave, onCancel, saving }: {
  initial?: Article; categories: Category[];
  onSave: (d: ArticleInput) => Promise<void>;
  onCancel: () => void; saving: boolean;
}) {
  const [form, setForm] = useState<ArticleInput>(() =>
    initial
      ? { title:initial.title, meta:initial.meta, date:initial.date, image:initial.image,
          icon:initial.icon, club:initial.club??"", tags:initial.tags,
          body:initial.body.length?initial.body:[""],
          published:initial.published, categoryId:initial.category.id }
      : { title:"",meta:"",date:"",image:"",icon:"bx bxs-trophy",club:"",tags:[],body:[""],
          published:true, categoryId:categories[0]?.id??0 }
  );
  const [tagInput, setTagInput] = useState(initial?.tags.join(", ")??"");
  const [errors,   setErrors]   = useState<Record<string,string>>({});

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:""}));
  }

  function validate() {
    const e: Record<string,string> = {};
    if (!form.title.trim()) e.title = "Obrigatório";
    if (!form.date.trim())  e.date  = "Obrigatório";
    if (!form.meta.trim())  e.meta  = "Obrigatório";
    if (!form.image.trim()) e.image = "Obrigatório";
    if (!form.categoryId)   e.cat   = "Selecione uma categoria";
    if (form.body.every(p=>!p.trim())) e.body = "Adicione ao menos um parágrafo";
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length>0) { setErrors(e); return; }
    await onSave({
      ...form,
      tags: tagInput.split(",").map(t=>t.trim()).filter(Boolean),
      body: form.body.filter(p=>p.trim()),
    });
  }

  const addPara    = () => set("body",[...form.body,""]);
  const removePara = (i:number) => set("body",form.body.filter((_,idx)=>idx!==i));
  const editPara   = (i:number,v:string) => { const b=[...form.body]; b[i]=v; set("body",b); };

  return (
    <div className="adm-form-wrap">
      <div className="adm-form-header">
        <h2 className="adm-form-title">
          <i className={`bx ${initial?"bx-edit":"bx-plus-circle"}`}/>
          {initial?"Editar artigo":"Novo artigo"}
        </h2>
        <button className="adm-btn adm-btn-ghost adm-icon-btn" onClick={onCancel}><i className="bx bx-x"/></button>
      </div>

      <div className="adm-form-grid">
        <div className="adm-form-col">
          <div className={`adm-field ${errors.title?"has-error":""}`}>
            <label>Título <span className="req">*</span></label>
            <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Título do artigo..."/>
            {errors.title&&<span className="field-err">{errors.title}</span>}
          </div>

          <div className="adm-row-2">
            <div className={`adm-field ${errors.cat?"has-error":""}`}>
              <label>Categoria <span className="req">*</span></label>
              <select value={form.categoryId} onChange={e=>set("categoryId",parseInt(e.target.value))}>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.cat&&<span className="field-err">{errors.cat}</span>}
            </div>
            <div className="adm-field">
              <label>Clube</label>
              <input value={form.club??""} onChange={e=>set("club",e.target.value)} placeholder="Ex: PSV Eindhoven"/>
            </div>
          </div>

          <div className="adm-row-2">
            <div className={`adm-field ${errors.meta?"has-error":""}`}>
              <label>Meta do card <span className="req">*</span></label>
              <input value={form.meta} onChange={e=>set("meta",e.target.value)} placeholder="PSV · 5 de abril de 2026"/>
              {errors.meta&&<span className="field-err">{errors.meta}</span>}
            </div>
            <div className={`adm-field ${errors.date?"has-error":""}`}>
              <label>Data <span className="req">*</span></label>
              <input value={form.date} onChange={e=>set("date",e.target.value)} placeholder="5 abr 2026"/>
              {errors.date&&<span className="field-err">{errors.date}</span>}
            </div>
          </div>

          <div className={`adm-field ${errors.image?"has-error":""}`}>
            <label>URL da imagem <span className="req">*</span></label>
            <input value={form.image} onChange={e=>set("image",e.target.value)} placeholder="https://..."/>
            {errors.image&&<span className="field-err">{errors.image}</span>}
            {form.image&&(
              <div className="img-preview">
                <img src={form.image} alt="preview" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
              </div>
            )}
          </div>

          <div className="adm-row-2">
            <div className="adm-field">
              <label>Ícone</label>
              <div className="icon-picker">
                {ICONS.map(ic=>(
                  <button
                    key={ic.cls}
                    type="button"
                    className={`icon-pick-btn ${form.icon===ic.cls?"icon-pick-active":""}`}
                    onClick={()=>set("icon",ic.cls)}
                    title={ic.label}
                  >
                    <i className={ic.cls}/>
                    <span>{ic.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="adm-field">
              <label>Tags (vírgula)</label>
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)} placeholder="PSV, Eredivisie..."/>
            </div>
          </div>

          <div className="adm-field">
            <label>Status de publicação</label>
            <label className="adm-toggle">
              <input type="checkbox" checked={form.published} onChange={e=>set("published",e.target.checked)}/>
              <span className="adm-toggle-track"/>
              <span className="adm-toggle-label">{form.published?"Publicado":"Rascunho"}</span>
            </label>
          </div>
        </div>

        <div className="adm-form-col">
          <div className={`adm-field ${errors.body?"has-error":""}`}>
            <div className="adm-body-label">
              <label>Parágrafos <span className="req">*</span></label>
              <button type="button" className="adm-btn adm-btn-sm adm-btn-secondary" onClick={addPara}>
                <i className="bx bx-plus"/> Adicionar
              </button>
            </div>
            {errors.body&&<span className="field-err">{errors.body}</span>}
            <div className="paragraphs-list">
              {form.body.map((p,i)=>(
                <div key={i} className="paragraph-item">
                  <span className="para-num">{i+1}</span>
                  <textarea value={p} onChange={e=>editPara(i,e.target.value)}
                    placeholder={`Parágrafo ${i+1}...`} rows={4}/>
                  {form.body.length>1&&(
                    <button type="button" className="para-remove" onClick={()=>removePara(i)} title="Remover">
                      <i className="bx bx-trash"/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="adm-form-footer">
        <button className="adm-btn adm-btn-ghost" onClick={onCancel} disabled={saving}>
          <i className="bx bx-x"/> Cancelar
        </button>
        <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
          {saving
            ?<><i className="bx bx-loader-alt bx-spin"/> Salvando...</>
            :<><i className="bx bx-save"/> {initial?"Salvar alterações":"Publicar artigo"}</>
          }
        </button>
      </div>
    </div>
  );
}

// ─── Article Row ──────────────────────────────────────────────────────────────
function ArticleRow({ article, onEdit, onDelete, onToggle }: {
  article: Article; onEdit:()=>void; onDelete:()=>void; onToggle:()=>void;
}) {
  return (
    <div className={`adm-article-row ${!article.published?"adm-row-draft":""}`}>
      <div className="adm-row-thumb">
        <img src={article.image} alt={article.title}
          onError={e=>{(e.target as HTMLImageElement).src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23e8eaed'/%3E%3C/svg%3E";}}/>
      </div>
      <div className="adm-row-info">
        <div className="adm-row-meta">
          <span className={`badge ${article.category.badgeClass}`}>{article.category.name}</span>
          {article.club&&<span className="badge badge-grey">{article.club}</span>}
          {!article.published&&<span className="badge adm-badge-draft">Rascunho</span>}
          <span className="adm-row-date"><i className="bx bx-calendar"/> {article.date}</span>
        </div>
        <h3 className="adm-row-title">{article.title}</h3>
        <p className="adm-row-preview">{article.body[0]?.slice(0,120)}…</p>
      </div>
      <div className="adm-row-actions">
        <button className="adm-action-btn toggle" onClick={onToggle} title={article.published?"Despublicar":"Publicar"}>
          <i className={`bx ${article.published?"bx-hide":"bx-show"}`}/>
        </button>
        <button className="adm-action-btn edit" onClick={onEdit} title="Editar">
          <i className="bx bx-edit"/>
        </button>
        <button className="adm-action-btn del" onClick={onDelete} title="Excluir">
          <i className="bx bx-trash"/>
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  ADMIN PANEL
// ═════════════════════════════════════════════════════════════════════════════
function AdminPanel({ user, onLogout, onExit }: {
  user: AdminUser; onLogout: () => void; onExit: () => void;
}) {
  const [articles,   setArticles]   = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [view,       setView]       = useState<"list"|"create"|"edit"|"categories">("list");
  const [editing,    setEditing]    = useState<Article|null>(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [confirm,    setConfirm]    = useState<{msg:string;action:()=>Promise<void>}|null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("Todas");
  const [showCPModal,    setShowCPModal]    = useState(false);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const [newCatName,     setNewCatName]     = useState("");
  const [newCatBadge,    setNewCatBadge]    = useState("badge-orange");
  const [savingCat,      setSavingCat]      = useState(false);
  const [deletingCatId,  setDeletingCatId]  = useState<number|null>(null);

  const notyf = useNotyf();
  const showToast = useCallback((msg:string, type:"success"|"error"="success") => {
    type === "success" ? notyf.success(msg) : notyf.error(msg);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [catRes, artRes] = await Promise.all([
        categoriesApi.list(),
        articlesApi.list({ limit: 100 }),
      ]);
      setCategories(catRes);
      setArticles(artRes.articles.map(normalizeArticle));
    } catch (err: any) {
      showToast(err.message??"Erro ao carregar dados.","error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ loadAll(); },[]);

  async function handleCreate(data: ArticleInput) {
    setSaving(true);
    try {
      const created = await articlesApi.create(data);
      setArticles(p=>[normalizeArticle(created),...p]);
      setView("list"); showToast("Artigo publicado!");
    } catch(err:any) { showToast(err.message,"error"); }
    finally { setSaving(false); }
  }

  async function handleEdit(data: ArticleInput) {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await articlesApi.update(editing.id, data);
      setArticles(p=>p.map(a=>a.id===editing.id?normalizeArticle(updated):a));
      setEditing(null); setView("list"); showToast("Artigo atualizado!");
    } catch(err:any) { showToast(err.message,"error"); }
    finally { setSaving(false); }
  }

  async function handleToggle(article: Article) {
    try {
      const updated = await articlesApi.patch(article.id,{published:!article.published});
      setArticles(p=>p.map(a=>a.id===article.id?normalizeArticle(updated):a));
      showToast(updated.published?"Artigo publicado.":"Artigo despublicado.");
    } catch(err:any) { showToast(err.message,"error"); }
  }

  function handleDelete(id: number) {
    setConfirm({
      msg:"Tem certeza que deseja excluir este artigo? Esta ação não pode ser desfeita.",
      action: async () => {
        setConfirmLoading(true);
        try {
          await articlesApi.delete(id);
          setArticles(p=>p.filter(a=>a.id!==id));
          setConfirm(null); showToast("Artigo excluído.");
        } catch(err:any) { showToast(err.message,"error"); }
        finally { setConfirmLoading(false); }
      },
    });
  }

  async function handleCreateCategory() {
    if (!newCatName.trim()) { notyf.error("Nome da categoria obrigatório."); return; }
    setSavingCat(true);
    try {
      const created = await categoriesApi.create(newCatName.trim(), newCatBadge);
      setCategories(p => [...p, created]);
      setNewCatName("");
      notyf.success(`Categoria "${created.name}" criada!`);
    } catch (err: any) {
      notyf.error(err.message);
    } finally {
      setSavingCat(false);
    }
  }

  async function handleDeleteCategory(id: number, name: string) {
    const artCount = articles.filter(a => a.category.id === id).length;
    if (artCount > 0) {
      notyf.error(`Não é possível excluir: "${name}" possui ${artCount} artigo(s) vinculado(s).`);
      return;
    }
    setDeletingCatId(id);
    try {
      await categoriesApi.delete(id);
      setCategories(p => p.filter(c => c.id !== id));
      notyf.success(`Categoria "${name}" excluída.`);
    } catch (err: any) {
      notyf.error(err.message);
    } finally {
      setDeletingCatId(null);
    }
  }

  const filtered = articles.filter(a=>{
    const matchCat    = filterCat==="Todas"||a.category.name===filterCat;
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    return matchCat&&matchSearch;
  });

  const total     = articles.length;
  const published = articles.filter(a=>a.published).length;

  return (
    <div className="adm-root">
      {/* Header */}
      <div className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-left">
            <img src="logo.png" alt="Futebol Holandês" className="adm-logo"/>
            <div>
              <h1 className="adm-header-title">Painel Administrativo</h1>
              <p className="adm-header-sub">Futebol Holandês · {total} artigos</p>
            </div>
          </div>

          <div className="adm-header-right">
            {/* User menu */}
            <div className="adm-user-menu">
              <button className="adm-user-btn" onClick={()=>setUserMenuOpen(o=>!o)}>
                <div className="adm-user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <span className="adm-user-name">{user.name}</span>
                <i className={`bx ${userMenuOpen?"bx-chevron-up":"bx-chevron-down"}`}/>
              </button>
              {userMenuOpen&&(
                <div className="adm-user-dropdown">
                  <div className="adm-user-info">
                    <p className="adm-user-fullname">{user.name}</p>
                    <p className="adm-user-email">{user.email}</p>
                  </div>
                  <div className="adm-user-actions">
                    <button onClick={()=>{setShowCPModal(true);setUserMenuOpen(false);}}>
                      <i className="bx bx-lock-alt"/> Alterar senha
                    </button>
                    <button onClick={()=>{setUserMenuOpen(false); onLogout()}} className="danger">
                      <i className="bx bx-log-out"/> Sair
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button className="adm-btn adm-btn-ghost adm-exit-btn" onClick={onExit}>
              <i className="bx bx-arrow-back"/> Voltar ao site
            </button>
          </div>
        </div>
      </div>

      <div className="adm-body">
        {/* Sidebar */}
        <aside className="adm-sidebar">
          <div className="adm-stat-card">
            <i className="bx bx-news adm-stat-icon"/>
            <div><p className="adm-stat-val">{total}</p><p className="adm-stat-label">Total</p></div>
          </div>
          <div className="adm-stat-card">
            <i className="bx bx-check-circle adm-stat-icon" style={{color:"var(--green)"}}/>
            <div><p className="adm-stat-val">{published}</p><p className="adm-stat-label">Publicados</p></div>
          </div>
          <div className="adm-stat-card">
            <i className="bx bx-hide adm-stat-icon" style={{color:"var(--amber)"}}/>
            <div><p className="adm-stat-val">{total-published}</p><p className="adm-stat-label">Rascunhos</p></div>
          </div>
          <div className="adm-sidebar-section">
            <p className="adm-sidebar-label">Por categoria</p>
            {categories.map(c=>(
              <div key={c.id} className="adm-cat-stat">
                <span className={`badge ${c.badgeClass}`}>{c.name}</span>
                <span className="adm-cat-count">{articles.filter(a=>a.category.id===c.id).length}</span>
              </div>
            ))}
          </div>
          <div className="adm-sidebar-section">
            <p className="adm-sidebar-label">Ações</p>
            <button className="adm-tool-btn" onClick={loadAll} disabled={loading}>
              <i className="bx bx-refresh"/> Recarregar
            </button>
            <button className="adm-tool-btn" onClick={()=>setView("categories")}>
              <i className="bx bx-purchase-tag"/> Gerenciar categorias
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="adm-main">
          {loading?(
            <div className="adm-loading">
              <i className="bx bx-loader-alt bx-spin adm-loading-icon"/>
              <p>Carregando artigos...</p>
            </div>
          ):view==="categories"?(
            <div className="adm-form-wrap">
              <div className="adm-form-header">
                <h2 className="adm-form-title"><i className="bx bx-purchase-tag"/> Categorias</h2>
                <button className="adm-btn adm-btn-ghost adm-icon-btn" onClick={()=>setView("list")}><i className="bx bx-x"/></button>
              </div>

              {/* Nova categoria */}
              <div className="cat-manager-body">
                <p className="adm-sidebar-label" style={{marginBottom:"0.75rem"}}>Nova categoria</p>
                <div className="cat-new-form">
                  <div className="adm-field" style={{flex:1}}>
                    <label>Nome</label>
                    <input value={newCatName} onChange={e=>setNewCatName(e.target.value)}
                      placeholder="Ex: Champions League" onKeyDown={e=>e.key==="Enter"&&handleCreateCategory()}/>
                  </div>
                  <div className="adm-field">
                    <label>Cor do badge</label>
                    <select value={newCatBadge} onChange={e=>setNewCatBadge(e.target.value)}>
                      <option value="badge-orange">🟠 Laranja</option>
                      <option value="badge-blue">🔵 Azul</option>
                    </select>
                  </div>
                  <div className="adm-field cat-new-preview">
                    <label>Preview</label>
                    <span className={`badge ${newCatBadge}`}>{newCatName||"Categoria"}</span>
                  </div>
                  <button className="adm-btn adm-btn-primary cat-new-btn"
                    onClick={handleCreateCategory} disabled={savingCat}>
                    {savingCat?<i className="bx bx-loader-alt bx-spin"/>:<><i className="bx bx-plus"/> Criar</>}
                  </button>
                </div>

                {/* Lista de categorias */}
                <p className="adm-sidebar-label" style={{margin:"1.5rem 0 0.75rem"}}>
                  Categorias cadastradas ({categories.length})
                </p>
                <div className="cat-list">
                  {categories.length===0?(
                    <div className="adm-empty" style={{padding:"2rem"}}>
                      <i className="bx bx-purchase-tag adm-empty-icon"/>
                      <p>Nenhuma categoria cadastrada.</p>
                    </div>
                  ):categories.map(c=>(
                    <div key={c.id} className="cat-row">
                      <span className={`badge ${c.badgeClass}`}>{c.name}</span>
                      <span className="cat-row-count">
                        {articles.filter(a=>a.category.id===c.id).length} artigo(s)
                      </span>
                      <button
                        className="adm-action-btn del"
                        onClick={()=>handleDeleteCategory(c.id, c.name)}
                        disabled={deletingCatId===c.id}
                        title="Excluir categoria"
                      >
                        {deletingCatId===c.id
                          ?<i className="bx bx-loader-alt bx-spin"/>
                          :<i className="bx bx-trash"/>
                        }
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ):(view==="create"||view==="edit")?(
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
                <button className="adm-btn adm-btn-primary" onClick={()=>setView("create")}>
                  <i className="bx bx-plus"/> Novo artigo
                </button>
              </div>

              <p className="adm-results-info">
                {filtered.length===total?`${total} artigos`:`${filtered.length} de ${total} artigos`}
              </p>

              {filtered.length===0?(
                <div className="adm-empty">
                  <i className="bx bx-search-alt adm-empty-icon"/>
                  <p>Nenhum artigo encontrado.</p>
                  {search&&<button className="adm-btn adm-btn-ghost" onClick={()=>setSearch("")}>Limpar busca</button>}
                </div>
              ):(
                <div className="adm-list">
                  {filtered.map(a=>(
                    <ArticleRow key={a.id} article={a}
                      onEdit={()=>{setEditing(a);setView("edit");}}
                      onDelete={()=>handleDelete(a.id)}
                      onToggle={()=>handleToggle(a)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {confirm&&(
        <ConfirmModal msg={confirm.msg} loading={confirmLoading}
          onConfirm={()=>confirm.action()}
          onCancel={()=>{if(!confirmLoading)setConfirm(null);}}
        />
      )}
      {showCPModal&&(
        <ChangePasswordModal
          onClose={()=>setShowCPModal(false)}
          onSuccess={()=>{setShowCPModal(false);showToast("Senha alterada com sucesso!");}}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  ROOT ADMIN (controla login vs painel)
// ═════════════════════════════════════════════════════════════════════════════
export default function Admin({ onExit }: { onExit: () => void }) {
  const [user, setUser] = useState<AdminUser|null>(null);
  const [checking, setChecking] = useState(true);

  // Verifica se já tem token válido
  useEffect(()=>{
    if (!auth.isLogged()) { setChecking(false); return; }
    authApi.me()
      .then(u=>setUser(u))
      .catch(()=>auth.clear())
      .finally(()=>setChecking(false));
  },[]);

  function handleLogin(u: AdminUser) { setUser(u); }

  function handleLogout() {
    authApi.logout();
    setUser(null);
  }

  if (checking) {
    return (
      <div className="login-root">
        <div className="adm-loading">
          <i className="bx bx-loader-alt bx-spin adm-loading-icon"/>
          <p>Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin}/>;

  return <AdminPanel user={user} onLogout={handleLogout} onExit={onExit}/>;
}