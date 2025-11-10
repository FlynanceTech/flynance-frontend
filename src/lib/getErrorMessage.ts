// src/lib/getErrorMessage.ts
import { toHttpError } from "./httpError";

export function getErrorMessage(err: unknown): string {
  const { status, message, code } = toHttpError(err);

  // Mensagens amigáveis por status/código (ajuste como quiser)
  if (status === 404 && (code === "NOT_FOUND" || true)) {
    return "E-mail não cadastrado.";
  }
  if (status === 400) return message || "Requisição inválida.";
  if (status === 401) return "Não autorizado.";
  if (status >= 500) return "Erro no servidor. Tente novamente.";

  return message || "Erro inesperado.";
}
