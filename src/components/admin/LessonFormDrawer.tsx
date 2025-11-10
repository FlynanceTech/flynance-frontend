// LessonFormDrawer.tsx
"use client";

import {
  Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LessonFormSchema, LessonFormValues } from "@/types/course";

type LessonValue = Partial<{
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
}>;

export function LessonFormDrawer({
  open,
  onOpenChange,
  value,
  onSubmit,
  disabled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: LessonValue;
  onSubmit: (data: LessonFormValues) => void;
  disabled?: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LessonFormValues>({
    resolver: zodResolver(LessonFormSchema),
    defaultValues: {
      title: value.title ?? "",
      description: value.description ?? "",
      youtubeUrl: value.youtubeUrl ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: value.title ?? "",
        description: value.description ?? "",
        youtubeUrl: value.youtubeUrl ?? "",
      });
    }
  }, [open, value, reset]);

  const submit = handleSubmit((data) => onSubmit(data));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <form onSubmit={submit} className="mx-auto w-full max-w-xl">
          <DrawerHeader>
            <DrawerTitle>Adicionar Aula</DrawerTitle>
            <DrawerDescription>Preencha os dados da aula</DrawerDescription>
          </DrawerHeader>

          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo-aula">Título da Aula *</Label>
              <Input id="titulo-aula" {...register("title")} placeholder="Ex: Primeiros passos" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao-aula">Descrição</Label>
              <Textarea id="descricao-aula" rows={3} {...register("description")} placeholder="Opcional" />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube-url">Link do YouTube *</Label>
              <Input id="youtube-url" {...register("youtubeUrl")} placeholder="https://www.youtube.com/watch?v=..." />
              {errors.youtubeUrl && <p className="text-xs text-destructive">{errors.youtubeUrl.message}</p>}
            </div>
          </div>

          <DrawerFooter>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={disabled}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Aula
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
