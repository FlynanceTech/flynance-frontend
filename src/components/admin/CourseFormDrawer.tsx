// src/components/admin/CourseFormDrawer.tsx
"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save } from "lucide-react";
import {
  Course,
  CourseCategory,
  CourseLevel,
  CourseFormSchema,
  CourseFormValues,
  DEFAULT_IMAGE,
} from "@/types/course";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export function CourseFormDrawer({
  open,
  onOpenChange,
  editing,
  value,
  onSave,
  onAddLesson,
  onRemoveLesson,
  disabled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: boolean;
  value: Partial<Course>;
  onSave: (data: CourseFormValues) => void;
  onAddLesson: () => void;
  onRemoveLesson: (lessonId: string) => void;
  disabled?: boolean;
}) {
  const lessons = value.lessons || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
    watch,
  } = useForm<CourseFormValues>({
    resolver: zodResolver(CourseFormSchema),
    defaultValues: {
      title: value.title ?? "",
      description: value.description ?? "",
      category: (value.category as CourseCategory) ?? "FREE",
      level: (value.level as CourseLevel) ?? "BEGINNER",
      price: value.price ?? "",
      image: value.image ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: value.title || "",
        description: value.description || "",
        category: (value.category as CourseCategory) || "FREE",
        level: (value.level as CourseLevel) || "BEGINNER",
        price: value.price || "",
        image: value.image && value.image !== DEFAULT_IMAGE ? value.image : "",
      });
    }
  }, [open, value, reset]);

  const category = watch("category");

  const submit = handleSubmit((data) => {
    onSave(data); // AdminPage aplica DEFAULT_IMAGE se vier vazio
    onOpenChange(false);
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <form onSubmit={submit} className="mx-auto w-full max-w-2xl">
          <DrawerHeader>
            <DrawerTitle>{editing ? "Editar Curso" : "Criar Novo Curso"}</DrawerTitle>
            <DrawerDescription>
              {editing ? "Atualize as informações do curso" : "Preencha as informações do curso"}
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Curso *</Label>
              <Input id="title" placeholder="Ex: Introdução à Flynance" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Descreva o que será aprendido no curso"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">URL da Imagem</Label>
              <Input id="image" placeholder={DEFAULT_IMAGE} {...register("image")} />
              {errors.image && <p className="text-xs text-destructive">{errors.image.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={watch("category")}
                  onValueChange={(v) => setValue("category", v as CourseCategory, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Gratuito</SelectItem>
                    <SelectItem value="PAID">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nível</Label>
                <Select
                  value={watch("level")}
                  onValueChange={(v) => setValue("level", v as CourseLevel, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Iniciante</SelectItem>
                    <SelectItem value="INTERMEDIARY">Intermediário</SelectItem>
                    <SelectItem value="ADVANCED">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {category === "PAID" && (
              <div className="space-y-2">
                <Label htmlFor="price">Preço</Label>
                <Input id="price" placeholder="R$ 297,00" {...register("price")} />
                {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Aulas do Curso ({lessons.length})</h3>
                <Button type="button" onClick={onAddLesson} size="sm" variant="outline" disabled={disabled}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Aula
                </Button>
              </div>

              {lessons.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {lessons.map((l) => (
                    <div key={l.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {l.order}. {l.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{l.youtubeUrl}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveLesson(l.id)}
                        disabled={disabled}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DrawerFooter>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={disabled}>
                <Save className="w-4 h-4 mr-2" />
                {editing ? "Atualizar Curso" : "Salvar Curso"}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>
                Cancelar
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
