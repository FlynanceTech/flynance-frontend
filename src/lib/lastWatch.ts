// src/lib/lastWatch.ts
export type LastWatch = {
  courseId: string;
  lessonId: string;
  positionSec?: number;
  updatedAt: number;
};

const KEY_SUMMARY = 'flynance:lastWatch';                   // resumo: último curso/aula
const KEY_PREFIX   = 'flynance:lastWatch:course:';          // posição por curso/aula

function safeGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function safeSet<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/** Resumo global (usado na listagem para "Continuar assistindo") */
export function getLastWatchSummary(): LastWatch | null {
  return safeGet<LastWatch>(KEY_SUMMARY);
}
export function setLastWatchSummary(payload: LastWatch) {
  safeSet(KEY_SUMMARY, payload);
}

/** Posição por curso/aula (usado no player) */
function keyForLesson(courseId: string, lessonId: string) {
  return `${KEY_PREFIX}${courseId}:lesson:${lessonId}`;
}
export function getLessonPosition(courseId: string, lessonId: string): number | undefined {
  const data = safeGet<{ positionSec?: number }>(keyForLesson(courseId, lessonId));
  return data?.positionSec;
}
export function setLessonPosition(courseId: string, lessonId: string, positionSec: number) {
  safeSet(keyForLesson(courseId, lessonId), { positionSec });
  // atualiza o resumo global
  setLastWatchSummary({ courseId, lessonId, positionSec, updatedAt: Date.now() });
}
