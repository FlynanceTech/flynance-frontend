'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { BookOpen, CheckCircle, Clock, CreditCard, Filter, Play } from 'lucide-react'
import Header from '../components/Header'
import { useCourses } from '@/hooks/query/useCourses'
import type { Course, CourseCategory, CourseLevel } from '@/types/course'
import { useLastWatch } from '@/hooks/useLastWatch'
import PageOnboardingTour, { type PageOnboardingStep } from '@/components/onboarding/PageOnboardingTour'

type TranslatorFn = (key: string, values?: Record<string, string | number | Date>) => string

function buildEducationOnboardingSteps(t: TranslatorFn): ReadonlyArray<PageOnboardingStep> {
  return [
    {
      id: 'header',
      selector: '[data-onboarding-target="educacao-header"]',
      align: 'bottom',
      title: t('onboarding.headerTitle'),
      description: t('onboarding.headerDescription'),
    },
    {
      id: 'filters',
      selector: '[data-onboarding-target="educacao-filtros"]',
      title: t('onboarding.filtersTitle'),
      description: t('onboarding.filtersDescription'),
    },
    {
      id: 'list',
      selector: '[data-onboarding-target="educacao-lista"]',
      title: t('onboarding.listTitle'),
      description: t('onboarding.listDescription'),
    },
  ]
}

function levelLabel(level: CourseLevel, t: TranslatorFn) {
  const map: Record<CourseLevel, string> = {
    BEGINNER: t('levels.beginner'),
    INTERMEDIARY: t('levels.intermediary'),
    ADVANCED: t('levels.advanced'),
  }
  return map[level] ?? level
}

export default function Page() {
  const t = useTranslations('educationPage')
  const locale = useLocale()
  const { last } = useLastWatch()
  const { data, isLoading } = useCourses()
  const onboardingSteps = useMemo(() => buildEducationOnboardingSteps(t), [t])

  const courses: Course[] = data?.data ?? []
  const ultimoCurso = courses[0]

  const [categoryFilter, setCategoryFilter] = useState<'all' | CourseCategory>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | CourseLevel>('all')

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const categoryMatch = categoryFilter === 'all' || c.category === categoryFilter
      const levelMatch = levelFilter === 'all' || c.level === levelFilter
      return categoryMatch && levelMatch
    })
  }, [courses, categoryFilter, levelFilter])

  const continueHref =
    last
      ? `/dashboard/educacao/${last.courseId}?lesson=${last.lessonId}${
          last.positionSec ? `&t=${Math.floor(last.positionSec)}` : ''
        }`
      : ultimoCurso
      ? `/dashboard/educacao/${ultimoCurso.id}`
      : '/dashboard/educacao'

  const listTitle =
    categoryFilter === 'FREE'
      ? t('list.titleFree')
      : categoryFilter === 'PAID'
      ? t('list.titlePaid')
      : t('list.titleAll')

  return (
    <div className="w-full">
      <div className="px-4 lg:pb-0 pt-8 pb-24 flex gap-4 flex-col">
        <div data-onboarding-target="educacao-header">
          <Header
            title={t('header.title')}
            subtitle={t('header.subtitle')}
            rightContent={
              <PageOnboardingTour
                steps={onboardingSteps}
                storageKeyBase="flynance:dashboard:onboarding:educacao:v1"
                triggerLabel={t('header.guideButton')}
              />
            }
          />
        </div>

        {last && (
          <Card className="overflow-hidden border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-col lg:flex-row w-full">
                <div className="flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden hidden lg:block">
                  {ultimoCurso ? (
                    <Image
                      src={ultimoCurso.image}
                      alt={ultimoCurso.title}
                      className="w-full h-full object-cover"
                      width={200}
                      height={200}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                </div>

                <div className="w-full">
                  <h3 className="font-semibold text-lg text-foreground mb-1">
                    {ultimoCurso ? ultimoCurso.title : t('states.loadingTitle')}
                  </h3>

                  {ultimoCurso && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{t('card.lessonsCount', { count: ultimoCurso.lessons.length })}</span>
                      </div>
                    </div>
                  )}
                </div>

                {ultimoCurso && (
                  <Link href={continueHref} className="w-full lg:max-w-52">
                    <Button className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      {t('lastCourse.continue')}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <section className="flex flex-col gap-4 overflow-auto lg:max-h-[68vh] pr-4">
          <div data-onboarding-target="educacao-filtros">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">{t('filters.title')}</h2>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground">{t('filters.categoryLabel')}</label>
                <div className="flex gap-2">
                  <Button
                    variant={categoryFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter('all')}
                  >
                    {t('filters.all')}
                  </Button>
                  <Button
                    variant={categoryFilter === 'FREE' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter('FREE')}
                  >
                    {t('filters.free')}
                  </Button>
                  <Button
                    variant={categoryFilter === 'PAID' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter('PAID')}
                  >
                    {t('filters.paid')}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground">{t('filters.levelLabel')}</label>
                <div className="flex gap-2">
                  <Button
                    variant={levelFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLevelFilter('all')}
                  >
                    {t('filters.all')}
                  </Button>
                  <Button
                    variant={levelFilter === 'BEGINNER' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLevelFilter('BEGINNER')}
                  >
                    {t('levels.beginner')}
                  </Button>
                  <Button
                    variant={levelFilter === 'INTERMEDIARY' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLevelFilter('INTERMEDIARY')}
                  >
                    {t('levels.intermediary')}
                  </Button>
                  <Button
                    variant={levelFilter === 'ADVANCED' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLevelFilter('ADVANCED')}
                  >
                    {t('levels.advanced')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div data-onboarding-target="educacao-lista">
            <h2 className="text-2xl font-bold text-foreground">
              {listTitle}
              <span className="text-muted-foreground text-lg ml-2">
                ({isLoading ? t('common.loadingCounter') : filteredCourses.length})
              </span>
            </h2>
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">{t('states.loadingCourses')}</p>
          )}

          {!isLoading && courses.length === 0 && (
            <div className="flex items-center justify-center">
              <div className="w-full max-w-xl rounded-2xl border border-dashed bg-muted/30 px-6 py-10 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{t('states.emptyTitle')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t('states.emptyDescription')}</p>
              </div>
            </div>
          )}

          {!isLoading && courses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => {
                const levelText = levelLabel(course.level, t)
                const isBonus = course.category === 'FREE'

                return (
                  <Card
                    key={course.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        width={300}
                        height={300}
                      />
                      {isBonus && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                          {t('card.bonusBadge')}
                        </div>
                      )}
                    </div>

                    <CardHeader>
                      <CardTitle className="text-xl">{course.title}</CardTitle>
                      <CardDescription>{course.description}</CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center gap-4 text-sm mb-4 justify-between h-4">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            <span>{t('card.lessonsCount', { count: course.lessons.length })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span className="capitalize">{levelText}</span>
                          </div>
                        </div>

                        {course.category === 'PAID' && course.price && (
                          <div className="text-xl font-bold text-primary">
                            {course.price}
                          </div>
                        )}
                      </div>

                      {isBonus ? (
                        <Link href={`/dashboard/educacao/${course.id}`}>
                          <Button className="w-full">
                            <Play className="w-4 h-4 mr-2" />
                            {t('card.watchFree')}
                          </Button>
                        </Link>
                      ) : (
                        <Drawer>
                          <DrawerTrigger asChild>
                            <Button className="w-full">
                              <CreditCard className="w-4 h-4 mr-2" />
                              {t('card.buyCourse')}
                            </Button>
                          </DrawerTrigger>

                          <DrawerContent>
                            <DrawerHeader>
                              <DrawerTitle>{t('purchase.title')}</DrawerTitle>
                              <DrawerDescription>{t('purchase.description')}</DrawerDescription>
                            </DrawerHeader>

                            <div className="px-4 py-6">
                              <div className="bg-muted p-6 rounded-lg mb-6">
                                <h3 className="font-bold text-xl mb-2">
                                  {course.title}
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                  {course.description}
                                </p>

                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="w-4 h-4" />
                                    <span>{t('card.lessonsCount', { count: course.lessons.length })}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="capitalize">{levelText}</span>
                                  </div>
                                </div>

                                {course.price && (
                                  <div className="text-3xl font-bold text-primary">
                                    {course.price}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4 mb-6">
                                <h4 className="font-semibold">{t('purchase.includedTitle')}</h4>
                                <ul className="space-y-2">
                                  <li className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                    <span>{t('purchase.items.lifetimeAccess')}</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                    <span>{t('purchase.items.certificate')}</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                    <span>{t('purchase.items.materials')}</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                    <span>{t('purchase.items.support')}</span>
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <DrawerFooter>
                              <Button className="w-full" size="lg">
                                <CreditCard className="w-5 h-5 mr-2" />
                                {course.price
                                  ? t('purchase.payWithValue', { price: course.price })
                                  : t('purchase.pay')}
                              </Button>
                              <DrawerClose asChild>
                                <Button variant="outline" className="w-full">
                                  {t('purchase.cancel')}
                                </Button>
                              </DrawerClose>
                            </DrawerFooter>
                          </DrawerContent>
                        </Drawer>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
