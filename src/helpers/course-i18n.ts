// helpers/course-i18n.ts
import type { CourseCategory, CourseLevel } from "@/types/course";

export const categoryPt: Record<CourseCategory, string> = {
  FREE: "Gratuito",
  PAID: "Pago",
};

export const levelPt: Record<CourseLevel, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIARY: "Intermediário",
  ADVANCED: "Avançado",
};
