import { useState, useEffect, useRef } from "react";
import { tagsApi, type Tag } from "../api";

// ─── Input de tags: autocomplete das já cadastradas + cria nova ao apertar Enter ──
interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export default function TagsInput({ value, onChange }: TagsInputProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Busca sugestões com debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await tagsApi.search(input.trim());
        setSuggestions(results.filter(t => !value.includes(t.name)));
        setHighlighted(0);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, value]);

  function addTag(name: string) {
    const clean = name.trim();
    if (!clean) return;
    if (value.some(t => t.toLowerCase() === clean.toLowerCase())) { setInput(""); setOpen(false); return; }
    onChange([...value, clean]);
    setInput("");
    setSuggestions([]);
    setOpen(false);
  }

  function removeTag(name: string) {
    onChange(value.filter(t => t !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions.length > 0) addTag(suggestions[highlighted].name);
      else addTag(input);
    } else if (e.key === "ArrowDown" && open && suggestions.length > 0) {
      e.preventDefault();
      setHighlighted(h => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && open && suggestions.length > 0) {
      e.preventDefault();
      setHighlighted(h => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="tags-input-wrap" ref={wrapRef}>
      <div className="tags-input-chips">
        {value.map(t => (
          <span key={t} className="tag-chip">
            {t}
            <button type="button" onClick={() => removeTag(t)} aria-label={`Remover ${t}`}>
              <i className="bx bx-x" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length ? "" : "Digite e pressione Enter..."}
          className="tags-input-field"
        />
      </div>

      {open && input.trim() && (
        <div className="tags-suggestions">
          {suggestions.length > 0 ? (
            suggestions.map((s, i) => (
              <button
                type="button"
                key={s.id}
                className={`tag-suggestion ${i === highlighted ? "tag-suggestion-active" : ""}`}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => addTag(s.name)}
              >
                <i className="bx bx-purchase-tag-alt" /> {s.name}
                {s._count && <span className="tag-suggestion-count">{s._count.articles}</span>}
              </button>
            ))
          ) : (
            <button type="button" className="tag-suggestion tag-suggestion-create" onClick={() => addTag(input)}>
              <i className="bx bx-plus-circle" /> Criar tag "{input.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}