// src/types/course.ts
import { z } from "zod";

/** Enums alinhados ao backend */
export type CourseCategory = "FREE" | "PAID";
export type CourseLevel = "BEGINNER" | "INTERMEDIARY" | "ADVANCED";

/** API DTOs (se o backend usar exatamente esses campos) */
export interface LessonDTO {
  id: string;
  courseId: string;
  title: string;
  description: string;
  youtubeUrl: string;
  order: number;
}

export interface CourseDTO {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  price?: string;
  image: string;
  isBonus: boolean;
  ownerId: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  lessons: LessonDTO[];
}
export interface updateCourseDTO {
  title?: string;
  description?: string;
  category?: CourseCategory;
  level?: CourseLevel;
  price?: string;
  image?: string;
  isBonus?: boolean;
  ownerId?: string | null;
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
  lessons?: LessonDTO[];
}

/** Domínio em INGLÊS */
export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  youtubeUrl: string;
  order: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  price?: string;      // e.g. "R$ 0,00"
  image: string;       // URL
  isBonus: boolean;
  ownerId: string | null;
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
  lessons: Lesson[];
}

/** Paginated response (opcional) */
export interface CoursesResponse {
  data: Course[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Imagem padrão */
export const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop";

/* ===========================
   Zod Schemas (forms)
   =========================== */

/** Lesson form schema (INGLÊS) */

export const LessonFormSchema = z.object({
  title: z.string().min(2, "Informe um título"),
  // obrigatória, pode ser vazia
  description: z.string().min(0),
  youtubeUrl: z
    .string()
    .url("Link do YouTube inválido")
    .regex(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//, "Deve ser um link do YouTube"),
});

export type LessonFormValues = z.infer<typeof LessonFormSchema>;


/** Course form schema (INGLÊS) */
export const CourseFormSchema = z
  .object({
    title: z.string().min(2, "Informe um título"),
    description: z.string().min(5, "Descrição muito curta"),
    category: z.enum(["FREE", "PAID"]),
    level: z.enum(["BEGINNER", "INTERMEDIARY", "ADVANCED"]),
    price: z.string().optional(),
    image: z
      .string()
      .url("URL inválida")
      .or(z.literal("")) // permite vazio no form
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (val.category === "PAID" && !val.price?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Preço é obrigatório para cursos pagos",
      });
    }
  });

export type CourseFormValues = z.infer<typeof CourseFormSchema>;

/** Normalizador para envio ao backend: aplica DEFAULT_IMAGE se necessário */
export function normalizeCourseForm(values: CourseFormValues) {
  return {
    ...values,
    image: values.image && values.image.trim().length > 0 ? values.image : DEFAULT_IMAGE,
  };
}

/* ===========================
   Helpers de exibição (PT-BR)
   =========================== */
export const categoryPtBr: Record<CourseCategory, string> = {
  FREE: "Gratuito",
  PAID: "Pago",
};

export const levelPtBr: Record<CourseLevel, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIARY: "Intermediário",
  ADVANCED: "Avançado",
};
