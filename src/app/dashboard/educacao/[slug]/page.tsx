'use client';

import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Play, CheckCircle2, Circle, ArrowLeft, BookOpen, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useCourse } from '@/hooks/query/useCourses';            // ✅ apenas o hook
import type { Course, Lesson } from '@/types/course';            // ✅ tipos daqui
import {LessonPlayerYouTube} from '@/components/education/LessonPlayerYouTube'; // ✅ default export

/* --------- Rating --------- */
function StarRating({
  value,
  count,
  onChange,
  size = 18,
  className,
}: {
  value: number;
  count: number;
  onChange?: (v: number) => void;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= value;
          return (
            <button key={i} type="button" onClick={() => onChange?.(i)} className="p-0.5" aria-label={`Avaliar ${i}`}>
              <Star
                className={cn('transition', filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')}
                width={size}
                height={size}
              />
            </button>
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground">({count} avaliações)</span>
    </div>
  );
}

/* --------- Helpers YouTube --------- */
function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`;
    }
    const v = u.searchParams.get('v');
    if (v) return `https://www.youtube.com/embed/${v}`;
    return url;
  } catch {
    return url;
  }
}
function getYouTubeId(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '');
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v') || undefined;
    return undefined;
  } catch {
    return undefined;
  }
}

/* --------- Page --------- */
export default function Page() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();

  const courseId = params.slug;
  const lessonIdFromUrl = search.get('lesson');

  const { data, isLoading, isError, error } = useCourse(courseId);
  console.log('data', data)
  const course = data as Course | undefined;

  // rating / comentários (mock)
  const [rating, setRating] = useState(4);
  const [ratingCount, setRatingCount] = useState(37);
  const [comments, setComments] = useState([
    { id: 1, author: 'Maria Silva', initials: 'MS', text: 'Excelente aula! Muito clara e objetiva.', date: 'Há 2 dias' },
    { id: 2, author: 'João Santos', initials: 'JS', text: 'Consegui entender perfeitamente. Obrigado!', date: 'Há 3 dias' },
  ]);
  const [newComment, setNewComment] = useState('');

  const lessons: Lesson[] = course?.lessons ?? [];

  const currentLesson: Lesson | undefined = useMemo(() => {
    if (!lessons.length) return undefined;
    if (lessonIdFromUrl) return lessons.find((l) => l.id === lessonIdFromUrl) ?? lessons[0];
    return lessons[0];
  }, [lessons, lessonIdFromUrl]);

  const progress = useMemo(() => {
    const total = lessons.length;
    const done = 0; // quando tiver status real de conclusão, atualize aqui
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  }, [lessons.length]);

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    setComments((prev) => [{ id: prev.length + 1, author: 'Você', initials: 'VC', text: newComment, date: 'Agora' }, ...prev]);
    setNewComment('');
  };
  const onChangeRating = (v: number) => {
    setRating(v);
    setRatingCount((c) => c + 1);
  };

  const youtubeId = currentLesson?.youtubeUrl ? getYouTubeId(currentLesson.youtubeUrl) : undefined;

  /* --------- states --------- */
  if (isLoading) {
    return (
      <div className="h-[95vh] w-full grid place-items-center">
        <p className="text-sm text-muted-foreground">Carregando curso…</p>
      </div>
    );
  }

  if (isError || !course) {
    console.error('[useCourse error]', error);
    return (
      <div className="h-[95vh] w-full grid place-items-center">
        <p className="text-sm text-destructive">Não foi possível carregar este curso.</p>
        <Link href="/dashboard/educacao" className="mt-4">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    );
  }

  if (!lessons.length) {
    return (
      <div className="h-[95vh] w-full grid place-items-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Este curso ainda não possui aulas.</p>
          <Link href="/dashboard/educacao" className="mt-4 block">
            <Button variant="outline">Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }

  /* --------- UI --------- */
  return (
    <div className="h-[95vh] w-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border bg-card rounded-none lg:rounded-xl">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/educacao">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div className="h-8 w-px bg-border" />
              <div>
                <h1 className="text-xl font-bold text-foreground">{course.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{lessons.length} aulas no total</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="lg:max-h-[85vh] w-full overflow-auto px-4 lg:px-0 py-6 lg:pr-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">
          {/* Coluna principal */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-black">
                  {youtubeId ? (
                    <LessonPlayerYouTube courseId={course.id} lessonId={currentLesson!.id} youtubeId={youtubeId} />
                  ) : (
                    <iframe
                      width="100%"
                      height="100%"
                      src={toYouTubeEmbed(currentLesson!.youtubeUrl)}
                      title={currentLesson!.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{currentLesson!.title}</h2>
                <p className="text-muted-foreground">Aula atual</p>
              </div>
              <StarRating value={rating} count={ratingCount} onChange={onChangeRating} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Comentários</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Deixe seu comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button onClick={handleSendComment}>Enviar Comentário</Button>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">{c.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{c.author}</span>
                          <span className="text-xs text-muted-foreground">{c.date}</span>
                        </div>
                        <p className="text-sm text-foreground">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lateral */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Próximas Aulas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>
                      Progresso: <span className="text-foreground font-medium">{progress.done}</span> / {progress.total}
                    </span>
                    <span>{progress.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-[width]" style={{ width: `${progress.pct}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  {lessons.map((l) => {
                    const active = l.id === currentLesson!.id;
                    return (
                      <Link key={l.id} href={`/dashboard/educacao/${course.id}?lesson=${l.id}`} className="block">
                        <div
                          className={cn(
                            'w-full p-3 rounded-lg transition-colors text-left flex items-start gap-3 border',
                            active ? 'bg-accent border-primary' : 'hover:bg-accent'
                          )}
                        >
                          {active ? (
                            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-medium text-sm text-foreground truncate">{l.title}</h3>
                              <Play className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Materiais de Apoio</CardTitle>
                <p className="text-sm text-muted-foreground">Faça o download dos recursos desta aula.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { id: 1, name: 'Guia de Introdução à Flynance.pdf', size: '2.3 MB', type: 'PDF', link: '/downloads/guia-introducao.pdf' },
                  { id: 2, name: 'Planilha de Controle Financeiro.xlsx', size: '580 KB', type: 'Excel', link: '/downloads/planilha-controle.xlsx' },
                ].map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{f.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {f.type} • {f.size}
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="flex items-center gap-2">
                      <Link href={f.link} download>
                        <Clock className="h-4 w-4" />
                        Baixar
                      </Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
