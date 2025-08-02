/**
 * Modelo principal de una tarea en la aplicación TODO
 * Incluye campos para sincronización offline/online
 */
export interface Task {
  /** Identificador único de la tarea (UUID o ID del servidor) */
  id: string;
  
  /** Título descriptivo de la tarea */
  title: string;
  
  /** Descripción detallada opcional */
  description?: string;
  
  /** Estado de completado de la tarea */
  isCompleted: boolean;
  
  /** Fecha de creación en formato ISO */
  createdAt: string;
  
  /** Fecha de última actualización para sincronización */
  updatedAt: string;
  
  /** Indica si la tarea está sincronizada con el servidor */
  isSynced: boolean;
}

/**
 * DTO para crear una nueva tarea
 */
export interface CreateTaskDTO {
  title: string;
  description?: string;
}

/**
 * DTO para actualizar una tarea existente
 */
export interface UpdateTaskDTO {
  id: string;
  title?: string;
  description?: string;
  isCompleted?: boolean;
}

/**
 * Respuesta del servidor para operaciones de tareas
 */
export interface TaskResponse {
  success: boolean;
  task?: Task;
  error?: string;
}

/**
 * Respuesta del servidor para lista de tareas
 */
export interface TaskListResponse {
  success: boolean;
  tasks: Task[];
  lastSync?: string;
  error?: string;
}
