// ─────────────────────────────────────────────────────────────────────────────
//  RichEditor.tsx — Editor de texto rico com TipTap
//
//  Instalação:
//  npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
//    @tiptap/extension-link @tiptap/extension-placeholder \
//    @tiptap/extension-underline @tiptap/extension-text-align \
//    @tiptap/extension-text-style @tiptap/extension-image \
//    @tiptap/extension-youtube
// ─────────────────────────────────────────────────────────────────────────────

import { useEditor, EditorContent, Node, mergeAttributes } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { useEffect, useCallback, useRef, useState } from "react";
import { uploadApi } from "../api";

// ─── Extensão customizada: Twitter/X Embed ────────────────────────────────────
// Armazena o HTML do embed como nó block; renderiza no editor e no site
const TwitterEmbed = Node.create({
  name: "twitterEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      tweetUrl: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-tweet-url]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-tweet-url": HTMLAttributes.tweetUrl, class: "twitter-embed-block" })];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = "twitter-embed-block";
      dom.setAttribute("data-tweet-url", node.attrs.tweetUrl);
      dom.contentEditable = "false";

      // Preview visual no editor (não carrega o script real — só no site)
      const url = node.attrs.tweetUrl ?? "";
      const tweetId = url.match(/status\/(\d+)/)?.[1];
      dom.innerHTML = `
        <div class="twitter-embed-preview">
          <div class="twitter-embed-preview-header">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span>Post do X</span>
          </div>
          <a class="twitter-embed-preview-url" href="${url}" target="_blank">${url}</a>
          ${tweetId ? `<p class="twitter-embed-preview-hint">Tweet ID: ${tweetId}</p>` : ""}
        </div>
      `;
      return { dom };
    };
  },
});

// ─── Helper: extrai ID do YouTube ─────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

// ─── Helper: extrai URL canônica do tweet ─────────────────────────────────────
function extractTweetUrl(input: string): string | null {
  const m = input.match(/https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/);
  return m ? m[0] : null;
}

// ─── Botão da toolbar ─────────────────────────────────────────────────────────
function ToolBtn({ active, disabled, onClick, title, children }: {
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

function Divider() { return <span className="rich-tool-divider"/>; }

// ─── Modal de embed (YouTube / Twitter) ───────────────────────────────────────
function EmbedModal({ type, onInsert, onClose }: {
  type: "youtube" | "twitter";
  onInsert: (url: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleInsert() {
    const url = value.trim();
    if (!url) { setError("Cole uma URL."); return; }
    if (type === "youtube") {
      if (!extractYouTubeId(url)) { setError("URL do YouTube inválida."); return; }
    } else {
      if (!extractTweetUrl(url)) { setError("URL do X/Twitter inválida.\nExemplo: https://x.com/usuario/status/123"); return; }
    }
    onInsert(url);
  }

  return (
    <div className="rich-modal-backdrop" onClick={onClose}>
      <div className="rich-modal" onClick={e => e.stopPropagation()}>
        <div className="rich-modal-header">
          {type === "youtube"
            ? <><i className="bx bxl-youtube"/> Inserir vídeo do YouTube</>
            : <><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{flexShrink:0}}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Inserir post do X/Twitter</>
          }
          <button className="rich-modal-close" onClick={onClose}><i className="bx bx-x"/></button>
        </div>
        <div className="rich-modal-body">
          <label className="rich-modal-label">
            {type === "youtube" ? "URL do vídeo" : "URL do post"}
          </label>
          <input
            ref={inputRef}
            className="rich-modal-input"
            value={value}
            onChange={e => { setValue(e.target.value); setError(""); }}
            placeholder={type === "youtube"
              ? "https://youtube.com/watch?v=..."
              : "https://x.com/usuario/status/123456789"
            }
            onKeyDown={e => { if (e.key === "Enter") handleInsert(); if (e.key === "Escape") onClose(); }}
          />
          {error && <p className="rich-modal-error"><i className="bx bx-error-circle"/> {error}</p>}
        </div>
        <div className="rich-modal-footer">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="adm-btn adm-btn-primary" onClick={handleInsert}>
            <i className="bx bx-check"/> Inserir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
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
  const [modal, setModal]       = useState<"youtube" | "twitter" | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:     { levels: [2, 3] },
        bulletList:  { HTMLAttributes: { class: "re-ul" } },
        orderedList: { HTMLAttributes: { class: "re-ol" } },
        blockquote:  { HTMLAttributes: { class: "re-bq" } },
        code:        { HTMLAttributes: { class: "re-code" } },
        codeBlock:   { HTMLAttributes: { class: "re-codeblock" } },
      }),
      Underline,
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({
        HTMLAttributes: { class: "re-img" },
        allowBase64: false,
      }),
      Youtube.configure({
        width: 560,
        height: 340,
        HTMLAttributes: { class: "re-youtube" },
        nocookie: true,
      }),
      TwitterEmbed,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
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

  // Upload de imagem inline para Cloudinary
  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;
    setUploading(true);
    try {
      const { url } = await uploadApi.image(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err: any) {
      alert("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
    }
  }, [editor]);

  // Inserir YouTube — passa a URL original, o TipTap faz o parse internamente
  function insertYoutube(url: string) {
    if (!editor) return;
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
    setModal(null);
  }

  // Inserir tweet
  function insertTwitter(url: string) {
    if (!editor) return;
    const clean = extractTweetUrl(url) ?? url;
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
        {/* Toolbar */}
        <div className="rich-toolbar">
          {/* Histórico */}
          <ToolBtn title="Desfazer (Ctrl+Z)" onClick={()=>editor.chain().focus().undo().run()} disabled={!can.undo().run()}>
            <i className="bx bx-undo"/>
          </ToolBtn>
          <ToolBtn title="Refazer (Ctrl+Y)" onClick={()=>editor.chain().focus().redo().run()} disabled={!can.redo().run()}>
            <i className="bx bx-redo"/>
          </ToolBtn>

          <Divider/>

          {/* Estilos de parágrafo */}
          <ToolBtn title="Parágrafo" onClick={()=>editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")}>
            <i className="bx bx-paragraph"/>
          </ToolBtn>
          <ToolBtn title="Título H2" onClick={()=>editor.chain().focus().toggleHeading({level:2}).run()} active={editor.isActive("heading",{level:2})}>
            <span className="rich-btn-text">H2</span>
          </ToolBtn>
          <ToolBtn title="Subtítulo H3" onClick={()=>editor.chain().focus().toggleHeading({level:3}).run()} active={editor.isActive("heading",{level:3})}>
            <span className="rich-btn-text">H3</span>
          </ToolBtn>

          <Divider/>

          {/* Formatação inline */}
          <ToolBtn title="Negrito (Ctrl+B)" onClick={()=>editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
            <i className="bx bx-bold"/>
          </ToolBtn>
          <ToolBtn title="Itálico (Ctrl+I)" onClick={()=>editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
            <i className="bx bx-italic"/>
          </ToolBtn>
          <ToolBtn title="Sublinhado (Ctrl+U)" onClick={()=>editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>
            <i className="bx bx-underline"/>
          </ToolBtn>
          <ToolBtn title="Tachado" onClick={()=>editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>
            <i className="bx bx-strikethrough"/>
          </ToolBtn>
          <ToolBtn title="Código inline" onClick={()=>editor.chain().focus().toggleCode().run()} active={editor.isActive("code")}>
            <i className="bx bx-code"/>
          </ToolBtn>

          <Divider/>

          {/* Alinhamento */}
          <ToolBtn title="Alinhar à esquerda" onClick={()=>editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({textAlign:"left"})}>
            <i className="bx bx-align-left"/>
          </ToolBtn>
          <ToolBtn title="Centralizar" onClick={()=>editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({textAlign:"center"})}>
            <i className="bx bx-align-middle"/>
          </ToolBtn>
          <ToolBtn title="Alinhar à direita" onClick={()=>editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({textAlign:"right"})}>
            <i className="bx bx-align-right"/>
          </ToolBtn>
          <ToolBtn title="Justificar" onClick={()=>editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({textAlign:"justify"})}>
            <i className="bx bx-align-justify"/>
          </ToolBtn>

          <Divider/>

          {/* Listas */}
          <ToolBtn title="Lista com marcadores" onClick={()=>editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
            <i className="bx bx-list-ul"/>
          </ToolBtn>
          <ToolBtn title="Lista numerada" onClick={()=>editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
            <i className="bx bx-list-ol"/>
          </ToolBtn>

          <Divider/>

          {/* Citação, código, hr */}
          <ToolBtn title="Citação" onClick={()=>editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
            <i className="bx bxs-quote-alt-left"/>
          </ToolBtn>
          <ToolBtn title="Bloco de código" onClick={()=>editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}>
            <i className="bx bx-code-block"/>
          </ToolBtn>
          <ToolBtn title="Linha horizontal" onClick={()=>editor.chain().focus().setHorizontalRule().run()}>
            <i className="bx bx-minus"/>
          </ToolBtn>

          <Divider/>

          {/* Link */}
          <ToolBtn title="Inserir / editar link" onClick={setLink} active={editor.isActive("link")}>
            <i className="bx bx-link"/>
          </ToolBtn>
          <ToolBtn title="Remover link" onClick={()=>editor.chain().focus().unsetLink().run()} disabled={!editor.isActive("link")}>
            <i className="bx bx-unlink"/>
          </ToolBtn>

          <Divider/>

          {/* Mídia — imagem, YouTube, Twitter */}
          <ToolBtn
            title={uploading ? "Enviando imagem..." : "Inserir imagem (upload Cloudinary)"}
            onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
            disabled={uploading}
          >
            {uploading
              ? <i className="bx bx-loader-alt bx-spin"/>
              : <i className="bx bx-image-add"/>
            }
          </ToolBtn>
          <ToolBtn title="Inserir vídeo do YouTube" onClick={() => setModal("youtube")} active={editor.isActive("youtube")}>
            <i className="bx bxl-youtube"/>
          </ToolBtn>
          <ToolBtn title="Inserir post do X/Twitter" onClick={() => setModal("twitter")} active={editor.isActive("twitterEmbed")}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </ToolBtn>
        </div>

        {/* Input de arquivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />

        {/* Área de edição */}
        <EditorContent editor={editor} className="rich-content" style={{ minHeight }}/>
      </div>

      {/* Modais de embed */}
      {modal === "youtube"  && <EmbedModal type="youtube"  onInsert={insertYoutube} onClose={() => setModal(null)}/>}
      {modal === "twitter"  && <EmbedModal type="twitter"  onInsert={insertTwitter} onClose={() => setModal(null)}/>}
    </>
  );
}