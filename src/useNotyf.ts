import { Notyf } from "notyf";
import "notyf/notyf.min.css";

const notyf = new Notyf({
  duration: 3500,
  position: { x: "right", y: "bottom" },
  ripple: false,
  dismissible: false,
  types: [
    {
      type:       "success",
      background: "#FF6200",
      icon:       false,
    },
    {
      type:       "error",
      background: "#dc2626",
      icon:       false,
    },
    {
      type:       "warning",
      background: "#d97706",
      icon:       false,
    },
    {
      type:       "info",
      background: "#2563eb",
      icon:       false,
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