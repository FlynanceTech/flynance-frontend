"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  addLesson,
  removeLesson,
  ListCoursesParams,
  CourseCreateDTO,
  LessonCreateDTO,
} from "@/services/courses";
import type { Course, updateCourseDTO } from "@/types/course";
import { coursesKeys } from "./keys";

export function useCourses(params?: ListCoursesParams) {
  const normalized = params ?? {};
  return useQuery({
    queryKey: coursesKeys.list(normalized),
    queryFn: ({ signal }) => listCourses(normalized, signal),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: coursesKeys.detail(id),
    queryFn: ({ signal }) => getCourse(id as string, signal),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { data: CourseCreateDTO; signal?: AbortSignal }) =>
      createCourse(vars.data, vars.signal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: coursesKeys.all });
    },
  });
}

export function useUpdateCourse(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { data: updateCourseDTO; signal?: AbortSignal }) =>
      updateCourse(id, vars.data, vars.signal),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: coursesKeys.detail(id) });
      const prev = qc.getQueryData<Course>(coursesKeys.detail(id));
      if (prev) qc.setQueryData<Course>(coursesKeys.detail(id), { ...prev, ...vars.data });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData<Course>(coursesKeys.detail(id), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: coursesKeys.all });
      qc.invalidateQueries({ queryKey: coursesKeys.detail(id) });
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; signal?: AbortSignal }) => deleteCourse(vars.id, vars.signal),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: coursesKeys.all });
      const prev = qc.getQueryData<Course[]>(coursesKeys.all);
      if (prev) qc.setQueryData<Course[]>(coursesKeys.all, prev.filter((c) => c.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData<Course[]>(coursesKeys.all, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: coursesKeys.all });
    },
  });
}

export function useAddLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { data: LessonCreateDTO; signal?: AbortSignal }) =>
      addLesson(courseId, vars.data, vars.signal),
    onSuccess: (updated) => {
      qc.setQueryData(coursesKeys.detail(courseId), updated);
      qc.invalidateQueries({ queryKey: coursesKeys.list({}) });
    },
  });
}

export function useRemoveLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { lessonId: string; signal?: AbortSignal }) =>
      removeLesson(courseId, vars.lessonId, vars.signal),
    onSuccess: (updated) => {
      qc.setQueryData(coursesKeys.detail(courseId), updated);
      qc.invalidateQueries({ queryKey: coursesKeys.list({}) });
    },
  });
}
