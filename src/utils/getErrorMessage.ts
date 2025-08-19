// utils/error.ts
import axios, { AxiosError } from "axios";

type ApiErrorShape = { message?: string };

export function getErrorMessage(e: unknown, fallback = "Ocorreu um erro"): string {
  if (axios.isAxiosError(e)) {
    const ae = e as AxiosError<ApiErrorShape>;
    return ae.response?.data?.message ?? ae.message ?? fallback;
  }
  return e instanceof Error ? e.message : fallback;
}
