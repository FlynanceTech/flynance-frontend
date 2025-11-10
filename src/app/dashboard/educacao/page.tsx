'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  BookOpen,
  CheckCircle,
  Clock,
  CreditCard,
  Filter,
  Play,
} from 'lucide-react';

import Header from '../components/Header';

import { useCourses } from '@/hooks/query/useCourses';
import type { Course, CourseCategory, CourseLevel } from '@/types/course';
import { useLastWatch } from '@/hooks/useLastWatch';

// Helpers para exibição em PT-BR
const catPt: Record<CourseCategory, 'gratuito' | 'pago'> = {
  FREE: 'gratuito',
  PAID: 'pago',
};
const lvlPt: Record<CourseLevel, 'iniciante' | 'intermediario' | 'avancado'> = {
  BEGINNER: 'iniciante',
  INTERMEDIARY: 'intermediario',
  ADVANCED: 'avancado',
};

export default function Page() {
  // Se o seu hook exporta useLastWatch, troque aqui:
  // const { last } = useLastWatch();
  const { last } = useLastWatch();

  const { data, isLoading } = useCourses(); 

  const courses: Course[] = data?.data ?? [];

  // Último curso (fallback: primeiro da lista, se houver)
  const ultimoCurso = courses[0];

  // Filtros (em PT na UI; mapeamos para enums para comparação)
  const [filtroCategoria, setFiltroCategoria] = useState<
    'todos' | 'gratuito' | 'pago'
  >('todos');
  const [filtroNivel, setFiltroNivel] = useState<
    'todos' | 'iniciante' | 'intermediario' | 'avancado'
  >('todos');

  const cursosFiltrados = useMemo(() => {
    return courses.filter((c) => {
      const categoriaPt = catPt[c.category]; // FREE|PAID -> gratuito|pago
      const nivelPt = lvlPt[c.level]; // BEGINNER|... -> iniciante|...
      const matchCategoria =
        filtroCategoria === 'todos' || categoriaPt === filtroCategoria;
      const matchNivel = filtroNivel === 'todos' || nivelPt === filtroNivel;
      return matchCategoria && matchNivel;
    });
  }, [courses, filtroCategoria, filtroNivel]);

  const continuarHref =
    last
      ? `/dashboard/educacao/${last.courseId}?lesson=${last.lessonId}${
          last.positionSec ? `&t=${Math.floor(last.positionSec)}` : ''
        }`
      : ultimoCurso
      ? `/dashboard/educacao/${ultimoCurso.id}`
      : '/dashboard/educacao';

  return (
    <div className="w-full">
      <div className="px-4 py-8 flex gap-4 flex-col">
        <Header
          title="FlyAcademy — Seu espaço de aprendizado financeiro"
          subtitle="Cursos e treinamentos exclusivos para crescer com conhecimento."
        />

        {/* Destaque do último curso */}
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
                  {ultimoCurso ? ultimoCurso.title : 'Carregando...'}
                </h3>

                {ultimoCurso && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{ultimoCurso.lessons.length} aulas</span>
                    </div>
                  </div>
                )}
              </div>

              {ultimoCurso && (
                <Link href={continuarHref} className="w-full lg:max-w-52">
                  <Button className="w-full">
                    <Play className="w-4 h-4 mr-2" />
                    Continuar Assistindo
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Área listagem + filtros */}
        <section className="flex flex-col gap-4 overflow-auto lg:max-h-[68vh] pr-4">
          {/* Filtros */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Filtros</h2>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground">Categoria</label>
                <div className="flex gap-2">
                  <Button
                    variant={filtroCategoria === 'todos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria('todos')}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={
                      filtroCategoria === 'gratuito' ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => setFiltroCategoria('gratuito')}
                  >
                    Gratuitos (Bônus)
                  </Button>
                  <Button
                    variant={filtroCategoria === 'pago' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria('pago')}
                  >
                    Pagos
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground">Nível</label>
                <div className="flex gap-2">
                  <Button
                    variant={filtroNivel === 'todos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroNivel('todos')}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={filtroNivel === 'iniciante' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroNivel('iniciante')}
                  >
                    Iniciante
                  </Button>
                  <Button
                    variant={
                      filtroNivel === 'intermediario' ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => setFiltroNivel('intermediario')}
                  >
                    Intermediário
                  </Button>
                  <Button
                    variant={filtroNivel === 'avancado' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroNivel('avancado')}
                  >
                    Avançado
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Título + contador */}
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {filtroCategoria === 'gratuito'
                ? 'Cursos Gratuitos (Bônus)'
                : filtroCategoria === 'pago'
                ? 'Cursos Pagos'
                : 'Todos os Cursos'}
              <span className="text-muted-foreground text-lg ml-2">
                ({isLoading ? '—' : cursosFiltrados.length})
              </span>
            </h2>
          </div>

          {/* Estados */}
          {isLoading && (
            <p className="text-sm text-muted-foreground">Carregando cursos…</p>
          )}
          {!isLoading && courses.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum curso disponível ainda.
            </p>
          )}

          {/* Grid */}
          {!isLoading && courses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursosFiltrados.map((curso) => {
                const nivelPt = lvlPt[curso.level];
                const isBonus = curso.category === 'FREE';

                return (
                  <Card
                    key={curso.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={curso.image}
                        alt={curso.title}
                        className="w-full h-full object-cover"
                        width={300}
                        height={300}
                      />
                      {isBonus && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                          Bônus
                        </div>
                      )}
                    </div>

                    <CardHeader>
                      <CardTitle className="text-xl">{curso.title}</CardTitle>
                      <CardDescription>{curso.description}</CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center gap-4 text-sm mb-4 justify-between h-4">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            <span>{curso.lessons.length} aulas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span className="capitalize">{nivelPt}</span>
                          </div>
                        </div>

                        {curso.category === 'PAID' && curso.price && (
                          <div className="text-xl font-bold text-primary">
                            {curso.price}
                          </div>
                        )}
                      </div>

                      {isBonus ? (
                        <Link href={`/dashboard/educacao/${curso.id}`}>
                          <Button className="w-full">
                            <Play className="w-4 h-4 mr-2" />
                            Assistir Grátis
                          </Button>
                        </Link>
                      ) : (
                        <Drawer>
                          <DrawerTrigger asChild>
                            <Button className="w-full">
                              <CreditCard className="w-4 h-4 mr-2" />
                              Comprar Curso
                            </Button>
                          </DrawerTrigger>

                          <DrawerContent>
                            <DrawerHeader>
                              <DrawerTitle>Finalizar Compra</DrawerTitle>
                              <DrawerDescription>
                                Complete sua compra e tenha acesso imediato ao
                                curso
                              </DrawerDescription>
                            </DrawerHeader>

                            <div className="px-4 py-6">
                              <div className="bg-muted p-6 rounded-lg mb-6">
                                <h3 className="font-bold text-xl mb-2">
                                  {curso.title}
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                  {curso.description}
                                </p>

                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="w-4 h-4" />
                                    <span>{curso.lessons.length} aulas</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="capitalize">{nivelPt}</span>
                                  </div>
                                </div>

                                {curso.price && (
                                  <div className="text-3xl font-bold text-primary">
                                    {curso.price}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4 mb-6">
                                <h4 className="font-semibold">
                                  O que está incluído:
                                </h4>
                                <ul className="space-y-2">
                                  <li className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                    <span>Acesso vitalício ao curso</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                    <span>Certificado de conclusão</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                    <span>
                                      Material de apoio para download
                                    </span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                    <span>Suporte direto com instrutor</span>
                                  </li>
                                </ul>
                              </div>
                            </div>

                            <DrawerFooter>
                              <Button className="w-full" size="lg">
                                <CreditCard className="w-5 h-5 mr-2" />
                                {curso.price
                                  ? `Pagar ${curso.price}`
                                  : 'Pagar'}
                              </Button>
                              <DrawerClose asChild>
                                <Button variant="outline" className="w-full">
                                  Cancelar
                                </Button>
                              </DrawerClose>
                            </DrawerFooter>
                          </DrawerContent>
                        </Drawer>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
