'use client';

import { useCallback, useEffect, useState } from 'react';

type LastWatch = {
  courseId: string;
  lessonId: string;
  positionSec: number; // em segundos
  updatedAt: number;   // epoch ms
};

const LS_KEY = 'flyacademy:lastWatch';

// util seguro para acessar localStorage no client
function readLS(): LastWatch | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastWatch;
    if (
      parsed &&
      typeof parsed.courseId === 'string' &&
      typeof parsed.lessonId === 'string'
    ) {
      return {
        courseId: parsed.courseId,
        lessonId: parsed.lessonId,
        positionSec: Number(parsed.positionSec || 0),
        updatedAt: Number(parsed.updatedAt || Date.now()),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function writeLS(v: LastWatch) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(v));
  } catch {}
}

/**
 * Hook global para LER o último ponto assistido (para a LISTAGEM).
 * Não precisa de argumentos.
 */
export function useLastWatch() {
  const [last, setLast] = useState<LastWatch | null>(null);

  useEffect(() => {
    setLast(readLS());
  }, []);

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(LS_KEY);
    setLast(null);
  }, []);

  // setter manual (se precisar em algum lugar)
  const set = useCallback((v: LastWatch) => {
    writeLS(v);
    setLast(v);
  }, []);

  return { last, set, clear };
}

/**
 * Hook por aula para SALVAR progresso continuamente (para a PÁGINA DO PLAYER).
 * Passe courseId e lessonId atuais.
 */
export function useLessonWatch(courseId: string, lessonId: string) {
  const [positionSec, setPositionSec] = useState<number | undefined>(undefined);

  // carrega posição previamente salva
  useEffect(() => {
    const v = readLS();
    if (v && v.courseId === courseId && v.lessonId === lessonId) {
      setPositionSec(v.positionSec);
    } else {
      setPositionSec(undefined);
    }
  }, [courseId, lessonId]);

  const savePosition = useCallback(
    (sec: number) => {
      const safe = Math.max(0, Math.floor(sec || 0));
      const payload: LastWatch = {
        courseId,
        lessonId,
        positionSec: safe,
        updatedAt: Date.now(),
      };
      writeLS(payload);
      setPositionSec(safe);
    },
    [courseId, lessonId]
  );

  // resumo pronto pra UI/telemetria
  const getSummary = useCallback(() => {
    const v = readLS();
    return v && v.courseId === courseId && v.lessonId === lessonId ? v : null;
  }, [courseId, lessonId]);

  return { positionSec, savePosition, getSummary };
}
