export const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format

export function getLocalISOString(date = new Date()) {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
  }
  
  // utils/date.ts

// ✅ Normaliza qualquer entrada para "YYYY-MM-DDTHH:mm:ss.sssZ"
export function toUTCISOString(input: string | Date) {
  // Se vier do input datetime-local: "2025-12-23T10:12"
  // new Date("2025-12-23T10:12") é interpretado como horário LOCAL
  // e toISOString() converte para UTC com Z (formato esperado do backend)
  const date = typeof input === "string" ? new Date(input) : input;

  if (Number.isNaN(date.getTime())) {
    throw new Error("Data inválida");
  }

  return date.toISOString(); // ex: "2025-12-26T19:17:00.000Z"
}

// ✅ Para preencher <input type="datetime-local" /> a partir de um ISO Z
export function isoZToDatetimeLocal(isoZ: string) {
  const date = new Date(isoZ);
  if (Number.isNaN(date.getTime())) return "";

  // datetime-local espera "YYYY-MM-DDTHH:mm" (SEM timezone)
  const pad = (n: number) => String(n).padStart(2, "0");

  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}
