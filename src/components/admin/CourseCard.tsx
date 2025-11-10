"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Youtube, Edit, Trash2 } from "lucide-react";
import { Course } from "@/types/course";
import { categoryPt, levelPt } from "@/helpers/course-i18n";

export function CourseCard({
  curso,
  onEdit,
  onDelete,
}: {
  curso: Course;
  onEdit: (curso: Course) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="aspect-video w-full rounded-md overflow-hidden mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={curso.image} alt={curso.title} className="w-full h-full object-cover" />
        </div>
        <CardTitle className="line-clamp-1">{curso.title}</CardTitle>
        <CardDescription className="line-clamp-2">{curso.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex gap-2 flex-wrap mb-4">
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            {categoryPt[curso.category]}
          </span>
          <span className="text-xs bg-secondary px-2 py-1 rounded">
            {levelPt[curso.level]}
          </span>
          {curso.price && (
            <span className="text-xs bg-accent px-2 py-1 rounded">{curso.price}</span>
          )}
        </div>

        {curso.lessons.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-muted-foreground">
              {curso.lessons.length} {curso.lessons.length === 1 ? "aula" : "aulas"}
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {curso.lessons.map((aula) => (
                <div key={aula.id} className="flex items-center gap-2 text-xs p-2 bg-muted rounded">
                  <Youtube className="w-3 h-3 text-destructive flex-shrink-0" />
                  <span className="font-medium">{aula.order}.</span>
                  <span className="flex-1 truncate">{aula.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-4">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(curso)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(curso.id)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
