// src/app/admin/page.tsx
"use client";

import { JSX, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { CoursesGrid } from "@/components/admin/CoursesGrid";
import { CourseFormDrawer } from "@/components/admin/CourseFormDrawer";
import { LessonFormDrawer } from "@/components/admin/LessonFormDrawer";

import {
  Course,
  CourseFormValues,
  Lesson,
  LessonFormValues,
  normalizeCourseForm,
} from "@/types/course";

import {
  useAddLesson,
  useCourses,
  useCreateCourse,
  useDeleteCourse,
  useRemoveLesson,
  useUpdateCourse,
} from "@/hooks/query/useCourses";

export default function AdminPage(): JSX.Element {
  const { toast } = useToast();

  const { data: courses, isLoading: isListLoading } = useCourses();

  const [current, setCurrent] = useState<Partial<Course>>({
    title: "",
    description: "",
    category: "FREE",
    level: "BEGINNER",
    price: "",
    image: "",
    lessons: [],
  });

  const [editing, setEditing] = useState(false);
  const [drawerCourseOpen, setDrawerCourseOpen] = useState(false);
  const [drawerLessonOpen, setDrawerLessonOpen] = useState(false);

  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse(current.id ?? "");
  const deleteCourse = useDeleteCourse();
  const addLesson = useAddLesson(current.id ?? "");
  const removeLesson = useRemoveLesson(current.id ?? "");

  const isMutating =
    createCourse.isPending ||
    updateCourse.isPending ||
    deleteCourse.isPending ||
    addLesson.isPending ||
    removeLesson.isPending;

  /* Actions */
  const newCourse = () => {
    setCurrent({
      title: "",
      description: "",
      category: "FREE",
      level: "BEGINNER",
      price: "",
      image: "",
      lessons: [],
    });
    setEditing(false);
    setDrawerCourseOpen(true);
  };

  const editCourse = (course: Course) => {
    setCurrent(course);
    setEditing(true);
    setDrawerCourseOpen(true);
    toast({ title: "Modo de edição", description: "Você está editando um curso existente" });
  };

  const saveCourse = (data: CourseFormValues) => {
    const payload = normalizeCourseForm(data);

    if (editing && current.id) {
      updateCourse.mutate(
        { data: payload },
        {
          onSuccess: (updated) => {
            setCurrent(updated);
            toast({ title: "Sucesso", description: "Curso atualizado com sucesso!" });
            setDrawerCourseOpen(false);
            setEditing(false);
          },
          onError: (err) => {
            const message = err instanceof Error ? err.message : String(err);
            toast({ title: "Erro ao atualizar curso", description: message, variant: "destructive" });
          },
        }
      );
    } else {
      createCourse.mutate(
        { data: {
          ...payload, lessons: current.lessons ?? [],
          isBonus: false,
          ownerId: null,
          createdAt: "",
          updatedAt: ""
        } },
        {
          onSuccess: (created) => {
            setCurrent(created);
            setDrawerCourseOpen(false);
            setEditing(false);
            toast({ title: "Sucesso", description: "Curso criado com sucesso!" });
          },
          onError: (err) => {
            const message = err instanceof Error ? err.message : String(err);
            toast({ title: "Erro ao criar curso", description: message, variant: "destructive" });
          },
        }
      );
    }
  };

  const removeCourse = (id: string) => {
    deleteCourse.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Sucesso", description: "Curso removido!" });
          if (current.id === id) {
            setCurrent({
              title: "",
              description: "",
              category: "FREE",
              level: "BEGINNER",
              price: "",
              image: "",
              lessons: [],
            });
            setEditing(false);
            setDrawerCourseOpen(false);
          }
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          toast({ title: "Erro ao remover curso", description: message, variant: "destructive" });
        },
      }
    );
  };

  const openLessonDrawer = () => {
    if (!current.title) {
      toast({
        title: "Atenção",
        description: "Primeiro preencha os dados do curso",
        variant: "destructive",
      });
      return;
    }
    setDrawerLessonOpen(true);
  };

  const addLessonAction = (data: LessonFormValues) => {
    if (!current.id) {
      // local only
      const lesson: Lesson = {
        id: Date.now().toString(),
        courseId: "",
        title: data.title,
        description: data.description ?? "",
        youtubeUrl: data.youtubeUrl,
        order: (current.lessons?.length || 0) + 1,
      };
      setCurrent((prev) => ({ ...prev, lessons: [...(prev.lessons || []), lesson] }));
      setDrawerLessonOpen(false);
      toast({ title: "Sucesso", description: "Aula adicionada localmente!" });
      return;
    }

    addLesson.mutate(
      {
        data: {
          ...data,
          courseId: current.id ?? "",
          order: (current.lessons?.length || 0) + 1,
        },
      },
      {
        onSuccess: (updated) => {
          setCurrent(updated);
          setDrawerLessonOpen(false);
          toast({ title: "Sucesso", description: "Aula adicionada ao curso!" });
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          toast({ title: "Erro ao adicionar aula", description: message, variant: "destructive" });
        },
      }
    );
  };

  const removeLessonAction = (lessonId: string) => {
    if (!current.id) {
      setCurrent((prev) => ({
        ...prev,
        lessons: prev.lessons?.filter((l) => l.id !== lessonId),
      }));
      return;
    }

    removeLesson.mutate(
      { lessonId },
      {
        onSuccess: (updated) => setCurrent(updated),
        onError: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          toast({ title: "Erro ao remover aula", description: message, variant: "destructive" });
        },
      }
    );
  };

  const disableNewButton = useMemo(() => isListLoading || isMutating, [isListLoading, isMutating]);

  return (
    <div className="w-full px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Painel de Administrador</h1>
          <p className="text-muted-foreground">Gerencie seus cursos e aulas</p>
        </div>
        <Button onClick={newCourse} size="lg" disabled={disableNewButton}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Curso
        </Button>
      </div>

      <CoursesGrid
        cursos={courses?.data ?? []}
        onEdit={editCourse}
        onDelete={removeCourse}
        onCreate={newCourse}
      />

      <CourseFormDrawer
        open={drawerCourseOpen}
        onOpenChange={setDrawerCourseOpen}
        editing={editing}
        value={current}
        onSave={saveCourse}
        onAddLesson={openLessonDrawer}
        onRemoveLesson={removeLessonAction}
        disabled={isMutating}
      />

      <LessonFormDrawer
        open={drawerLessonOpen}
        onOpenChange={setDrawerLessonOpen}
        value={{}}
        onSubmit={addLessonAction}
        disabled={isMutating}
      />
    </div>
  );
}
