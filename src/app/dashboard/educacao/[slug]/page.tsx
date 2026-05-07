'use client'

import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Play, CheckCircle2, Circle, ArrowLeft, BookOpen, Star, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCourse } from '@/hooks/query/useCourses'
import type { Course, Lesson } from '@/types/course'
import { LessonPlayerYouTube } from '@/components/education/LessonPlayerYouTube'
import { FEATURES } from '@/config/features'
import FeatureUnavailable from '../../components/FeatureUnavailable'

function StarRating({
  value,
  count,
  onChange,
  size = 18,
  className,
  ariaLabelFor,
  evaluationsLabel,
}: {
  value: number
  count: number
  onChange?: (v: number) => void
  size?: number
  className?: string
  ariaLabelFor: (v: number) => string
  evaluationsLabel: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= value
          return (
            <button key={i} type="button" onClick={() => onChange?.(i)} className="p-0.5" aria-label={ariaLabelFor(i)}>
              <Star
                className={cn('transition', filled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')}
                width={size}
                height={size}
              />
            </button>
          )
        })}
      </div>
      <span className="text-xs text-muted-foreground">{evaluationsLabel.replace('{count}', String(count))}</span>
    </div>
  )
}

function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`
    }
    const v = u.searchParams.get('v')
    if (v) return `https://www.youtube.com/embed/${v}`
    return url
  } catch {
    return url
  }
}

function getYouTubeId(url: string): string | undefined {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '')
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v') || undefined
    return undefined
  } catch {
    return undefined
  }
}

export default function Page() {
  if (!FEATURES.EDUCATION) {
    return <FeatureUnavailable />
  }

  return <EducationLessonPageContent />
}

function EducationLessonPageContent() {
  const t = useTranslations('educationLessonPage')
  const params = useParams<{ slug: string }>()
  const search = useSearchParams()

  const courseId = params.slug
  const lessonIdFromUrl = search.get('lesson')

  const { data, isLoading, isError, error } = useCourse(courseId)
  const course = data as Course | undefined

  const [rating, setRating] = useState(4)
  const [ratingCount, setRatingCount] = useState(37)
  const [comments, setComments] = useState(() => [
    {
      id: 1,
      author: t('comments.mock.firstAuthor'),
      initials: 'MS',
      text: t('comments.mock.firstText'),
      date: t('comments.mock.firstDate'),
    },
    {
      id: 2,
      author: t('comments.mock.secondAuthor'),
      initials: 'JS',
      text: t('comments.mock.secondText'),
      date: t('comments.mock.secondDate'),
    },
  ])
  const [newComment, setNewComment] = useState('')

  const lessons: Lesson[] = course?.lessons ?? []

  const currentLesson: Lesson | undefined = useMemo(() => {
    if (!lessons.length) return undefined
    if (lessonIdFromUrl) return lessons.find((l) => l.id === lessonIdFromUrl) ?? lessons[0]
    return lessons[0]
  }, [lessons, lessonIdFromUrl])

  const progress = useMemo(() => {
    const total = lessons.length
    const done = 0
    const pct = total ? Math.round((done / total) * 100) : 0
    return { done, total, pct }
  }, [lessons.length])

  const handleSendComment = () => {
    if (!newComment.trim()) return
    setComments((prev) => [
      {
        id: prev.length + 1,
        author: t('comments.you'),
        initials: t('comments.youInitials'),
        text: newComment,
        date: t('comments.now'),
      },
      ...prev,
    ])
    setNewComment('')
  }

  const onChangeRating = (v: number) => {
    setRating(v)
    setRatingCount((c) => c + 1)
  }

  const youtubeId = currentLesson?.youtubeUrl ? getYouTubeId(currentLesson.youtubeUrl) : undefined

  if (isLoading) {
    return (
      <div className="h-[95vh] w-full grid place-items-center">
        <p className="text-sm text-muted-foreground">{t('states.loadingCourse')}</p>
      </div>
    )
  }

  if (isError || !course) {
    console.error('[useCourse error]', error)
    return (
      <div className="h-[95vh] w-full grid place-items-center">
        <p className="text-sm text-destructive">{t('states.loadError')}</p>
        <Link href="/dashboard/educacao" className="mt-4">
          <Button variant="outline">{t('common.back')}</Button>
        </Link>
      </div>
    )
  }

  if (!lessons.length) {
    return (
      <div className="h-[95vh] w-full grid place-items-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{t('states.noLessons')}</p>
          <Link href="/dashboard/educacao" className="mt-4 block">
            <Button variant="outline">{t('common.back')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  const materials = [
    {
      id: 1,
      name: t('materials.files.guide.name'),
      size: t('materials.files.guide.size'),
      type: 'PDF',
      link: '/downloads/guia-introducao.pdf',
    },
    {
      id: 2,
      name: t('materials.files.spreadsheet.name'),
      size: t('materials.files.spreadsheet.size'),
      type: 'Excel',
      link: '/downloads/planilha-controle.xlsx',
    },
  ]

  return (
    <div className="h-[95vh] w-full flex flex-col overflow-hidden">
      <div className="border bg-card rounded-none lg:rounded-xl">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/educacao">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
              </Link>
              <div className="h-8 w-px bg-border" />
              <div>
                <h1 className="text-xl font-bold text-foreground">{course.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{t('header.totalLessons', { count: lessons.length })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:max-h-[85vh] w-full overflow-auto px-4 lg:px-0 py-6 lg:pr-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">
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
                <p className="text-muted-foreground">{t('lesson.current')}</p>
              </div>
              <StarRating
                value={rating}
                count={ratingCount}
                onChange={onChangeRating}
                ariaLabelFor={(v) => t('rating.rateAria', { value: v })}
                evaluationsLabel={t('rating.evaluations', { count: ratingCount })}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('comments.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder={t('comments.placeholder')}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button onClick={handleSendComment}>{t('comments.send')}</Button>
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

          <div className="lg:col-span-1 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('sidebar.nextLessonsTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{t('sidebar.progressLabel', { done: progress.done, total: progress.total })}</span>
                    <span>{progress.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-[width]" style={{ width: `${progress.pct}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  {lessons.map((l) => {
                    const active = l.id === currentLesson!.id
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
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('materials.title')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('materials.subtitle')}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {materials.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{f.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {f.type} - {f.size}
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="flex items-center gap-2">
                      <Link href={f.link} download>
                        <Clock className="h-4 w-4" />
                        {t('materials.download')}
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
  )
}
