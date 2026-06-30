import { useState, useRef, useEffect } from "react";

// ─── Paleta de cores predefinidas + suporte a cor customizada (hex) ───────────
const PRESET_COLORS = [
  "#FF6200", "#2563eb", "#16a34a", "#dc2626", "#d97706",
  "#9333ea", "#0891b2", "#db2777", "#4b5563", "#0e0e12",
  "#65a30d", "#0284c7", "#c2410c", "#7c3aed", "#be123c",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [customHex, setCustomHex] = useState(value || "#FF6200");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setCustomHex(value || "#FF6200"); }, [value]);

  function applyCustom(hex: string) {
    setCustomHex(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) onChange(hex);
  }

  return (
    <div className="color-picker-wrap" ref={wrapRef}>
      {label && <label className="color-picker-label">{label}</label>}
      <button type="button" className="color-picker-trigger" onClick={() => setOpen(o => !o)}>
        <span className="color-picker-swatch" style={{ background: value }} />
        <span className="color-picker-value">{value}</span>
        <i className={`bx ${open ? "bx-chevron-up" : "bx-chevron-down"}`} />
      </button>

      {open && (
        <div className="color-picker-popover">
          <div className="color-picker-presets">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`color-preset-btn ${value === c ? "color-preset-active" : ""}`}
                style={{ background: c }}
                onClick={() => { onChange(c); setOpen(false); }}
                title={c}
              />
            ))}
          </div>
          <div className="color-picker-custom">
            <input
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : "#FF6200"}
              onChange={e => applyCustom(e.target.value)}
              className="color-picker-native"
            />
            <input
              type="text"
              value={customHex}
              onChange={e => applyCustom(e.target.value)}
              placeholder="#FF6200"
              className="color-picker-hex-input"
              maxLength={7}
            />
          </div>
        </div>
      )}
    </div>
  );
}