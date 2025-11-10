'use client';

import { useEffect, useRef } from 'react';
import { useLessonWatch } from '@/hooks/useLastWatch';

type LessonPlayerProps = {
  courseId: string;
  lessonId: string;
  /** URL do vídeo (mp4, m3u8 etc.) */
  src: string;
};

export default function LessonPlayer({ courseId, lessonId, src }: LessonPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // API atual do hook: não existe "last" aqui.
  const { positionSec, savePosition } = useLessonWatch(courseId, lessonId);

  // Evita tentar fazer seek mais de uma vez.
  const didSeekRef = useRef(false);

  // Assim que o player tiver metadata (duration etc.), aplica o seek se houver posição salva.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const trySeek = () => {
      if (didSeekRef.current) return;
      const hasSaved =
        typeof positionSec === 'number' && !Number.isNaN(positionSec) && positionSec > 8;

      if (hasSaved) {
        // garante limites (ex.: se o vídeo mudou de tamanho)
        const dur = Number.isFinite(v.duration) ? v.duration : undefined;
        const safeTarget =
          dur && positionSec > dur * 0.98 ? Math.floor(dur * 0.98) : Math.floor(positionSec);
        v.currentTime = safeTarget;
      }
      didSeekRef.current = true;
    };

    if (v.readyState >= 1) {
      // já tem metadata
      trySeek();
    } else {
      // espera metadata
      const onLoaded = () => {
        trySeek();
        v.removeEventListener('loadedmetadata', onLoaded);
      };
      v.addEventListener('loadedmetadata', onLoaded);
      return () => v.removeEventListener('loadedmetadata', onLoaded);
    }
  }, [positionSec]);

  // Salva progresso periodicamente enquanto reproduz.
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const d = v.duration;

    if (!Number.isFinite(t) || !Number.isFinite(d) || d <= 0) return;

    // salva apenas após 5s e antes de 95% do vídeo
    if (t > 5 && t < d * 0.95) {
      savePosition(t);
    }
  };

  // Ao terminar, zera a posição (para recomeçar/follow-up).
  const onEnded = () => {
    savePosition(0);
  };

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      className="w-full rounded-lg"
      // Importante: alguns players só disparam consistentemente com 'timeupdate'
      onTimeUpdate={onTimeUpdate}
      onEnded={onEnded}
      // Opcionalmente pode adicionar `preload="metadata"` para obter metadata mais cedo
      preload="metadata"
    />
  );
}
