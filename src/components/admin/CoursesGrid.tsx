"use client";

import { Course } from "@/types/course";
import { CourseCard } from "./CourseCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus } from "lucide-react";

export function CoursesGrid({
  cursos,
  onEdit,
  onDelete,
  onCreate,
}: {
  cursos: Course[];
  onEdit: (curso: Course) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {

  if (cursos.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground text-lg mb-4">Nenhum curso criado ainda</p>
          <Button onClick={onCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Curso
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cursos && cursos.map((curso) => (
        <CourseCard key={curso.id} curso={curso} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
