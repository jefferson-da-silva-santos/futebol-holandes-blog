import { Notyf } from "notyf";
import "notyf/notyf.min.css";

const notyf = new Notyf({
  duration:  3500,
  position:  { x: "right", y: "bottom" },
  ripple:    true,
  dismissible: true,
  types: [
    {
      type:       "success",
      background: "#FF6200",
      icon: {
        className: "bx bx-check-circle",
        tagName:   "i",
        color:     "#fff",
      },
    },
    {
      type:       "error",
      background: "#dc2626",
      icon: {
        className: "bx bx-x-circle",
        tagName:   "i",
        color:     "#fff",
      },
    },
    {
      type:       "warning",
      background: "#d97706",
      icon: {
        className: "bx bx-error",
        tagName:   "i",
        color:     "#fff",
      },
    },
    {
      type:       "info",
      background: "#2563eb",
      icon: {
        className: "bx bx-info-circle",
        tagName:   "i",
        color:     "#fff",
      },
    },
  ],
});

export function useNotyf() {
  return {
    success: (msg: string) => notyf.success(msg),
    error:   (msg: string) => notyf.error(msg),
    warning: (msg: string) => notyf.open({ type: "warning", message: msg }),
    info:    (msg: string) => notyf.open({ type: "info",    message: msg }),
  };
}