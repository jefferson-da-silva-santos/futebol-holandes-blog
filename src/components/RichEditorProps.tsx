// ─────────────────────────────────────────────────────────────────────────────
//  RichEditor.tsx — Editor de texto rico com TipTap
//
//  Instalação necessária:
//  npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
//    @tiptap/extension-link @tiptap/extension-placeholder \
//    @tiptap/extension-underline @tiptap/extension-text-align \
//    @tiptap/extension-color @tiptap/extension-text-style
// ─────────────────────────────────────────────────────────────────────────────

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback } from "react";

// ─── Botão da toolbar ─────────────────────────────────────────────────────────
function ToolBtn({
  active, disabled, onClick, title, children,
}: {
  active?: boolean; disabled?: boolean;
  onClick: () => void; title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rich-tool-btn ${active ? "rich-tool-active" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() { return <span className="rich-tool-divider"/>; }

// ─── Componente principal ─────────────────────────────────────────────────────
interface RichEditorProps {
  value: string;           // HTML inicial
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichEditor({ value, onChange, placeholder = "Escreva o conteúdo do artigo...", minHeight = 320 }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
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
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Sincroniza valor externo (ex: ao abrir edição)
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

  if (!editor) return null;

  const can = editor.can().chain().focus();

  return (
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

        {/* Citação e separador */}
        <ToolBtn title="Citação (blockquote)" onClick={()=>editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
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
      </div>

      {/* Área de edição */}
      <EditorContent editor={editor} className="rich-content" style={{minHeight}}/>
    </div>
  );
}