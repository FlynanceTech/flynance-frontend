/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/httpError.ts
import axios, { AxiosError } from "axios";

export type ApiErrorBody =
  | { error: string; code?: string; issues?: unknown }
  | string
  | undefined;

export type HttpError = {
  status: number;
  message: string;
  code?: string;
  raw?: unknown;
};

export function toHttpError(err: unknown): HttpError {
  if (axios.isAxiosError(err)) {
    const ae = err as AxiosError<ApiErrorBody>;
    const status = ae.response?.status ?? 0;

    let message = "Erro inesperado";
    let code: string | undefined;

    const data = ae.response?.data;

    if (typeof data === "string") message = data;
    else if (data && typeof data === "object" && "error" in data) {
      message = (data as any).error ?? message;
      code = (data as any).code;
    } else if (ae.message) {
      message = ae.message;
    }

    return { status, message, code, raw: err };
  }

  if (err instanceof Error) {
    return { status: 0, message: err.message, raw: err };
  }

  return { status: 0, message: "Erro desconhecido", raw: err };
}
