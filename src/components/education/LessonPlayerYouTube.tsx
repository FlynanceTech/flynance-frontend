'use client';
import YouTube, { YouTubeProps } from 'react-youtube';
import { useEffect, useRef } from 'react';
import { useLessonWatch } from '@/hooks/useLastWatch';

export function LessonPlayerYouTube({
  courseId,
  lessonId,
  youtubeId,
}: { courseId: string; lessonId: string; youtubeId: string; }) {
  type PlayerLike = {
    getCurrentTime?: () => number;
    getDuration?: () => number;
    seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
  } | null;

  const playerRef = useRef<PlayerLike>(null);
  const { positionSec, savePosition } = useLessonWatch(courseId, lessonId);

  const opts: YouTubeProps['opts'] = { playerVars: { autoplay: 0 } };

  const onReady: YouTubeProps['onReady'] = (e) => {
    playerRef.current = e.target;
    // Se houver posição > 8s, retoma dali
    if (positionSec && positionSec > 8) {
      e.target.seekTo(positionSec, true);
    }
  };

  // Tick simples (1.5s) para salvar progresso
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const t = p.getCurrentTime?.();
      const d = p.getDuration?.();
      if (!t || !d) return;
      if (t > 5 && t < d * 0.99) {
        savePosition(Math.floor(t));
      }
    }, 1500);
    return () => clearInterval(id);
  }, [savePosition]);

  const onEnd: YouTubeProps['onEnd'] = () => savePosition(0);

  return <YouTube videoId={youtubeId} opts={opts} onReady={onReady} onEnd={onEnd} />;
}
