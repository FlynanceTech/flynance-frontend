import api from "@/lib/axios";
import { Course, CoursesResponse, LessonDTO, updateCourseDTO } from "@/types/course";

export type ListCoursesParams = { q?: string };
export type CourseCreateDTO = Omit<Course, "id">;
export type CourseUpdateDTO = Partial<Omit<Course, "id">>;
export type LessonCreateDTO = Omit<LessonDTO, "id" | "ordem">;

// Helpers para ler apenas .data e aceitar signal de cancelamento:
const get = async <T>(url: string, signal?: AbortSignal, params?: Record<string, unknown>): Promise<T> => {
  const { data } = await api.get<T>(url, { signal, params });
  return data;
};

const post = async <T, B = unknown>(url: string, body: B, signal?: AbortSignal): Promise<T> => {
  const { data } = await api.post<T>(url, body, { signal });
  return data;
};

const put = async <T, B = unknown>(url: string, body: B, signal?: AbortSignal): Promise<T> => {
  const { data } = await api.put<T>(url, body, { signal });
  return data;
};

const del = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const { data } = await api.delete<T>(url, { signal });
  return data;
};


// Endpoints
export async function listCourses(params?: ListCoursesParams, signal?: AbortSignal): Promise<CoursesResponse> {
  return get<CoursesResponse>("/courses", signal, params);
}

export async function getCourse(id: string, signal?: AbortSignal): Promise<Course> {
  return get<Course>(`/course/${id}`, signal);
}

export async function createCourse(payload: CourseCreateDTO, signal?: AbortSignal): Promise<Course> {
  return post<Course>("/course", payload, signal);
}

export async function updateCourse(id: string, payload: CourseUpdateDTO, signal?: AbortSignal): Promise<updateCourseDTO> {
  return put<updateCourseDTO>(`/course/${id}`, payload, signal);
}

export async function deleteCourse(id: string, signal?: AbortSignal): Promise<void> {
  await del<unknown>(`/course/${id}`, signal);
}

export async function addLesson(courseId: string, aula: LessonCreateDTO, signal?: AbortSignal): Promise<Course> {
  return post<Course>(`/course/${courseId}/lessons`, aula, signal);
}

export async function removeLesson(courseId: string, lessonId: string, signal?: AbortSignal): Promise<Course> {
  return del<Course>(`/course/${courseId}/lessons/${lessonId}`, signal);
}
