// utils/notifier.ts
// Substitui o Notyf por notificações nativas — sem dependências externas
// A interface é idêntica: showNotyf("success"|"error"|"warning", "mensagem")

import { toast } from "./toast";

type NotificationType = "success" | "error" | "warning";

export const showNotyf = (type: NotificationType, message: string): void => {
  toast[type]?.(message);
};