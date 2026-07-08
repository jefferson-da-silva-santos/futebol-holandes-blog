// ─────────────────────────────────────────────────────────────────────────────
//  RichEditor.tsx — Editor rico com TipTap
//
//  npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
//    @tiptap/extension-link @tiptap/extension-placeholder \
//    @tiptap/extension-underline @tiptap/extension-text-align \
//    @tiptap/extension-text-style @tiptap/extension-image
// ─────────────────────────────────────────────────────────────────────────────

import { useEditor, EditorContent, Node, mergeAttributes } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {TextStyle} from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useEffect, useCallback, useRef, useState } from "react";
import { uploadApi } from "../api";

// ═════════════════════════════════════════════════════════════════════════════
//  EXTENSÃO: YouTube iframe nativo
//  Não depende de @tiptap/extension-youtube — usa iframe direto, sem restrições
// ═════════════════════════════════════════════════════════════════════════════
function getYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

const YouTubeNode = Node.create({
  name: "youtubeEmbed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { videoId: { default: null } };
  },
  parseHTML() {
    return [{ tag: "div[data-youtube-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const id = HTMLAttributes.videoId;
    return [
      "div",
      mergeAttributes({ "data-youtube-id": id, class: "yt-embed-wrap" }),
      [
        "iframe",
        {
          src: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
          frameborder: "0",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowfullscreen: "true",
          class: "yt-embed-iframe",
        },
      ],
    ];
  },
  addNodeView() {
    return ({ node }) => {
      const wrap = document.createElement("div");
      wrap.className = "yt-embed-wrap";
      wrap.setAttribute("data-youtube-id", node.attrs.videoId);
      wrap.setAttribute("contenteditable", "false");

      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${node.attrs.videoId}?rel=0&modestbranding=1`;
      iframe.frameBorder = "0";
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
      iframe.setAttribute("allowfullscreen", "true");
      iframe.className = "yt-embed-iframe";

      wrap.appendChild(iframe);

      // Badge de seleção no editor
      const badge = document.createElement("div");
      badge.className = "yt-embed-badge";
      badge.textContent = "▶ YouTube";
      wrap.appendChild(badge);

      return { dom: wrap };
    };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
//  EXTENSÃO: Twitter/X embed
//  Salva a URL do tweet; no site, renderiza via Twitter Widget JS
// ═════════════════════════════════════════════════════════════════════════════
function getTweetUrl(input: string): string | null {
  const m = input.match(/https?:\/\/(twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/);
  return m ? m[0].replace("twitter.com", "x.com") : null;
}

const TwitterNode = Node.create({
  name: "twitterEmbed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { tweetUrl: { default: null } };
  },
  parseHTML() {
    return [{ tag: "div[data-tweet-url]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-tweet-url": HTMLAttributes.tweetUrl, class: "tweet-embed-wrap" }),
    ];
  },
  addNodeView() {
    return ({ node }) => {
      const wrap = document.createElement("div");
      wrap.className = "tweet-embed-wrap";
      wrap.setAttribute("data-tweet-url", node.attrs.tweetUrl ?? "");
      wrap.setAttribute("contenteditable", "false");

      // Preview no editor
      wrap.innerHTML = `
        <div class="tweet-editor-preview">
          <div class="tweet-preview-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <strong>Post do X</strong>
          </div>
          <a class="tweet-preview-url" href="${node.attrs.tweetUrl}" target="_blank">${node.attrs.tweetUrl}</a>
          <p class="tweet-preview-note">O post será carregado no site após publicar</p>
        </div>
      `;
      return { dom: wrap };
    };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
//  MODAL DE EMBED
// ═════════════════════════════════════════════════════════════════════════════
type EmbedType = "youtube" | "twitter";

function EmbedModal({
  type, onInsert, onClose,
}: { type: EmbedType; onInsert: (url: string) => void; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  function handleInsert() {
    const v = value.trim();
    if (!v) { setError("Cole uma URL."); return; }
    if (type === "youtube") {
      if (!getYouTubeId(v)) { setError("URL do YouTube inválida. Cole o link completo do vídeo."); return; }
    } else {
      if (!getTweetUrl(v)) {
        setError("URL inválida. Copie o link do post no X/Twitter.\nEx: https://x.com/nomeuser/status/123456789");
        return;
      }
    }
    onInsert(v);
  }

  return (
    <div className="embed-modal-backdrop" onClick={onClose}>
      <div className="embed-modal" onClick={e => e.stopPropagation()}>
        <div className="embed-modal-head">
          {type === "youtube" ? (
            <><i className="bx bxl-youtube" style={{ color: "#ff0000", fontSize: "1.3rem" }} /> Inserir vídeo do YouTube</>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Inserir post do X / Twitter
            </>
          )}
          <button className="embed-modal-close" onClick={onClose}><i className="bx bx-x" /></button>
        </div>

        <div className="embed-modal-body">
          <label className="embed-modal-label">
            {type === "youtube" ? "Link do vídeo" : "Link do post"}
          </label>
          <input
            ref={ref}
            className="embed-modal-input"
            value={value}
            onChange={e => { setValue(e.target.value); setError(""); }}
            placeholder={type === "youtube"
              ? "https://www.youtube.com/watch?v=... ou https://youtu.be/..."
              : "https://x.com/usuario/status/123456789"
            }
            onKeyDown={e => { if (e.key === "Enter") handleInsert(); if (e.key === "Escape") onClose(); }}
          />
          {error && (
            <div className="embed-modal-error">
              <i className="bx bx-error-circle" />
              <span style={{ whiteSpace: "pre-line" }}>{error}</span>
            </div>
          )}

          {/* Exemplo visual */}
          <div className="embed-modal-hint">
            {type === "youtube" ? (
              <p>📋 Vá ao vídeo → clique em <strong>Compartilhar</strong> → <strong>Copiar link</strong></p>
            ) : (
              <p>📋 Vá ao post → clique nos <strong>•••</strong> → <strong>Copiar link do post</strong></p>
            )}
          </div>
        </div>

        <div className="embed-modal-foot">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="adm-btn adm-btn-primary" onClick={handleInsert}>
            <i className="bx bx-check" /> Inserir
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  TOOLBAR BUTTON
// ═════════════════════════════════════════════════════════════════════════════
function Btn({
  active, disabled, onClick, title, children,
}: {
  active?: boolean; disabled?: boolean;
  onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick}
      className={`rich-tool-btn ${active ? "rich-tool-active" : ""}`}>
      {children}
    </button>
  );
}
function Sep() { return <span className="rich-tool-divider" />; }

// ═════════════════════════════════════════════════════════════════════════════
//  RICH EDITOR
// ═════════════════════════════════════════════════════════════════════════════
interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichEditor({
  value, onChange,
  placeholder = "Escreva o conteúdo do artigo...",
  minHeight = 320,
}: RichEditorProps) {
  const [modal, setModal] = useState<EmbedType | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { HTMLAttributes: { class: "re-ul" } },
        orderedList: { HTMLAttributes: { class: "re-ol" } },
        blockquote: { HTMLAttributes: { class: "re-bq" } },
        code: { HTMLAttributes: { class: "re-code" } },
        codeBlock: { HTMLAttributes: { class: "re-codeblock" } },
      }),
      Underline,
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({ HTMLAttributes: { class: "re-img" }, allowBase64: false }),
      YouTubeNode,
      TwitterNode,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL do link:", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  // Upload de imagem inline → Cloudinary
  async function handleFileUpload(file: File) {
    if (!editor) return;
    setUploading(true);
    try {
      const { url } = await uploadApi.image(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err: any) {
      alert("Erro no upload da imagem: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  // Inserir YouTube
  function insertYouTube(url: string) {
    if (!editor) return;
    const id = getYouTubeId(url);
    if (!id) return;
    editor.chain().focus().insertContent({
      type: "youtubeEmbed",
      attrs: { videoId: id },
    }).run();
    setModal(null);
  }

  // Inserir tweet
  function insertTwitter(url: string) {
    if (!editor) return;
    const clean = getTweetUrl(url) ?? url;
    editor.chain().focus().insertContent({
      type: "twitterEmbed",
      attrs: { tweetUrl: clean },
    }).run();
    setModal(null);
  }

  if (!editor) return null;
  const can = editor.can().chain().focus();

  return (
    <>
      <div className="rich-editor-wrap">
        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="rich-toolbar">
          <Btn title="Desfazer" onClick={() => editor.chain().focus().undo().run()} disabled={!can.undo().run()}>
            <i className="bx bx-undo" />
          </Btn>
          <Btn title="Refazer" onClick={() => editor.chain().focus().redo().run()} disabled={!can.redo().run()}>
            <i className="bx bx-redo" />
          </Btn>
          <Sep />
          <Btn title="Parágrafo" onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")}>
            <i className="bx bx-paragraph" />
          </Btn>
          <Btn title="Título H2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
            <span className="rich-btn-text">H2</span>
          </Btn>
          <Btn title="Subtítulo H3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
            <span className="rich-btn-text">H3</span>
          </Btn>
          <Sep />
          <Btn title="Negrito (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
            <i className="bx bx-bold" />
          </Btn>
          <Btn title="Itálico (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
            <i className="bx bx-italic" />
          </Btn>
          <Btn title="Sublinhado (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>
            <i className="bx bx-underline" />
          </Btn>
          <Btn title="Tachado" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>
            <i className="bx bx-strikethrough" />
          </Btn>
          <Btn title="Código inline" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")}>
            <i className="bx bx-code" />
          </Btn>
          <Sep />
          <Btn title="Alinhar esquerda" onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })}><i className="bx bx-align-left" /></Btn>
          <Btn title="Centralizar" onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })}><i className="bx bx-align-middle" /></Btn>
          <Btn title="Alinhar direita" onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })}><i className="bx bx-align-right" /></Btn>
          <Btn title="Justificar" onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })}><i className="bx bx-align-justify" /></Btn>
          <Sep />
          <Btn title="Lista com marcadores" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>  <i className="bx bx-list-ul" /></Btn>
          <Btn title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}><i className="bx bx-list-ol" /></Btn>
          <Sep />
          <Btn title="Citação" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}><i className="bx bxs-quote-alt-left" /></Btn>
          <Btn title="Código em bloco" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}><i className="bx bx-code-block" /></Btn>
          <Btn title="Linha divisória" onClick={() => editor.chain().focus().setHorizontalRule().run()}><i className="bx bx-minus" /></Btn>
          <Sep />
          <Btn title="Inserir link" onClick={setLink} active={editor.isActive("link")}><i className="bx bx-link" /></Btn>
          <Btn title="Remover link" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive("link")}><i className="bx bx-unlink" /></Btn>
          <Sep />
          {/* Mídia */}
          <Btn
            title={uploading ? "Enviando..." : "Inserir imagem (upload)"}
            onClick={() => { if (!uploading) fileRef.current?.click(); }}
            disabled={uploading}
          >
            {uploading ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-image-add" />}
          </Btn>
          <Btn title="Inserir vídeo do YouTube" onClick={() => setModal("youtube")}>
            <i className="bx bxl-youtube" style={{ color: editor.isActive("youtubeEmbed") ? "#ff0000" : undefined }} />
          </Btn>
          <Btn title="Inserir post do X / Twitter" onClick={() => setModal("twitter")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Btn>
        </div>

        {/* Input de arquivo oculto */}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
        />

        {/* Área editável */}
        <EditorContent editor={editor} className="rich-content" style={{ minHeight }} />
      </div>

      {/* Modais */}
      {modal === "youtube" && <EmbedModal type="youtube" onInsert={insertYouTube} onClose={() => setModal(null)} />}
      {modal === "twitter" && <EmbedModal type="twitter" onInsert={insertTwitter} onClose={() => setModal(null)} />}
    </>
  );
}